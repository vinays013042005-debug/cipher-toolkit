/* =========================================================
   PLAYFAIR CIPHER - VANILLA JAVASCRIPT
   No libraries, no backend, GitHub Pages compatible.
   ========================================================= */

const ALPHABET = "ABCDEFGHIKLMNOPQRSTUVWXYZ"; // J is combined with I

function cleanLetters(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/J/g, "I")
    .replace(/[^A-Z]/g, "");
}

function buildMatrix(keyword) {
  const key = cleanLetters(keyword);
  if (!key) throw new Error("Please enter a keyword.");

  let sequence = "";
  for (const ch of key + ALPHABET) {
    if (!sequence.includes(ch)) sequence += ch;
  }

  const matrix = [];
  for (let r = 0; r < 5; r++) {
    matrix.push(sequence.slice(r * 5, r * 5 + 5).split(""));
  }
  return matrix;
}

function positionOf(matrix, letter) {
  const target = letter === "J" ? "I" : letter;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (matrix[r][c] === target) return { row: r, col: c };
    }
  }
  return null;
}

function matrixHTML(matrix) {
  return `<div class="matrix">${
    matrix.flat().map(ch => `<div>${ch}</div>`).join("")
  }</div>`;
}

/*
  Plaintext preparation:
  - J becomes I.
  - Non-letters are removed.
  - Repeated letters in one pair are separated with X.
  - An unmatched final letter gets X.
*/
function preparePlaintext(text) {
  const cleaned = cleanLetters(text);
  const pairs = [];
  let i = 0;

  while (i < cleaned.length) {
    const a = cleaned[i];
    const b = cleaned[i + 1];

    if (!b) {
      pairs.push(a + "X");
      i++;
    } else if (a === b) {
      pairs.push(a + "X");
      i++;
    } else {
      pairs.push(a + b);
      i += 2;
    }
  }
  return pairs;
}

function transformPair(pair, matrix, mode) {
  const a = pair[0];
  const b = pair[1];
  const p1 = positionOf(matrix, a);
  const p2 = positionOf(matrix, b);

  if (!p1 || !p2) throw new Error(`Invalid pair: ${pair}`);

  // Encryption: right/down. Decryption: left/up.
  const direction = mode === "encrypt" ? 1 : -1;

  if (p1.row === p2.row) {
    const a2 = matrix[p1.row][(p1.col + direction + 5) % 5];
    const b2 = matrix[p2.row][(p2.col + direction + 5) % 5];

    return {
      result: a2 + b2,
      rule: "Same row",
      explanation: mode === "encrypt"
        ? "Both letters are in the same row, so each moves one position to the right."
        : "Both letters are in the same row, so each moves one position to the left."
    };
  }

  if (p1.col === p2.col) {
    const a2 = matrix[(p1.row + direction + 5) % 5][p1.col];
    const b2 = matrix[(p2.row + direction + 5) % 5][p2.col];

    return {
      result: a2 + b2,
      rule: "Same column",
      explanation: mode === "encrypt"
        ? "Both letters are in the same column, so each moves one position downward."
        : "Both letters are in the same column, so each moves one position upward."
    };
  }

  const a2 = matrix[p1.row][p2.col];
  const b2 = matrix[p2.row][p1.col];

  return {
    result: a2 + b2,
    rule: "Rectangle rule",
    explanation: "The letters form a rectangle; each letter keeps its row and takes the other letter's column."
  };
}

function setMatrix(containerId, matrix) {
  const el = document.getElementById(containerId);
  el.classList.remove("empty");
  el.innerHTML = matrixHTML(matrix);
}

function showStatus(id, message, type = "") {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `status ${type}`;
}

function showSteps(containerId, steps) {
  const el = document.getElementById(containerId);

  if (!steps.length) {
    el.className = "empty";
    el.textContent = "No steps available.";
    return;
  }

  el.className = "";
  el.innerHTML = steps.map((s, i) => `
    <div class="step">
      <div class="step-no">${i + 1}</div>
      <div>
        <h4>${s.input} → ${s.output}</h4>
        <p><strong>${s.rule}</strong> — ${s.explanation}</p>
      </div>
    </div>
  `).join("");
}

/*
  This removes likely filler X characters for display only.
  The exact original plaintext cannot always be recovered
  automatically because X can be a genuine plaintext character.
*/
function removeLikelyFillers(text) {
  let result = text;

  // X inserted between two equal letters, e.g. AXA -> AA
  result = result.replace(/([A-Z])X\1/g, "$1$1");

  // X added as a final padding character
  if (result.endsWith("X")) result = result.slice(0, -1);

  return result;
}

function encryptMessage() {
  try {
    const key = document.getElementById("encryptKey").value;
    const plaintext = document.getElementById("plaintext").value;

    if (!key.trim()) throw new Error("Enter a keyword.");
    if (!plaintext.trim()) throw new Error("Enter plaintext.");

    const matrix = buildMatrix(key);
    const pairs = preparePlaintext(plaintext);

    if (!pairs.length) throw new Error("Plaintext must contain letters.");

    setMatrix("encryptMatrix", matrix);

    let ciphertext = "";
    const steps = [];

    for (const pair of pairs) {
      const r = transformPair(pair, matrix, "encrypt");
      ciphertext += r.result;
      steps.push({
        input: pair,
        output: r.result,
        rule: r.rule,
        explanation: r.explanation
      });
    }

    document.getElementById("preparedText").textContent = pairs.join(" ");
    document.getElementById("encryptPairs").textContent = pairs.join(" | ");
    document.getElementById("ciphertext").textContent = ciphertext;

    showSteps("encryptionSteps", steps);
    showStatus("encryptStatus", "Encryption completed successfully.", "ok");
  } catch (error) {
    showStatus("encryptStatus", error.message, "error");
  }
}

function decryptMessage() {
  try {
    const key = document.getElementById("decryptKey").value;
    const input = document.getElementById("cipherInput").value;

    if (!key.trim()) throw new Error("Enter a keyword.");
    if (!input.trim()) throw new Error("Enter ciphertext.");

    const matrix = buildMatrix(key);
    const ciphertext = cleanLetters(input);

    if (!ciphertext.length) throw new Error("Ciphertext must contain letters.");
    if (ciphertext.length % 2 !== 0) {
      throw new Error("Ciphertext must contain an even number of letters.");
    }

    const pairs = [];
    for (let i = 0; i < ciphertext.length; i += 2) {
      pairs.push(ciphertext.slice(i, i + 2));
    }

    setMatrix("decryptMatrix", matrix);

    let plaintext = "";
    const steps = [];

    for (const pair of pairs) {
      const r = transformPair(pair, matrix, "decrypt");
      plaintext += r.result;
      steps.push({
        input: pair,
        output: r.result,
        rule: r.rule,
        explanation: r.explanation
      });
    }

    document.getElementById("decryptPairs").textContent = pairs.join(" | ");
    document.getElementById("decryptedText").textContent = plaintext;
    document.getElementById("cleanedDecryptedText").textContent = removeLikelyFillers(plaintext);

    showSteps("decryptionSteps", steps);
    showStatus("decryptStatus", "Decryption completed successfully.", "ok");
  } catch (error) {
    showStatus("decryptStatus", error.message, "error");
  }
}

function generateMatrix() {
  try {
    const key = document.getElementById("matrixKey").value;
    if (!key.trim()) throw new Error("Enter a keyword.");

    const matrix = buildMatrix(key);
    const container = document.getElementById("displayMatrix");
    container.classList.remove("empty");
    container.innerHTML = matrixHTML(matrix);
  } catch (error) {
    const container = document.getElementById("displayMatrix");
    container.className = "matrix-large-box empty";
    container.textContent = error.message;
  }
}

function clearEncryption() {
  document.getElementById("encryptKey").value = "";
  document.getElementById("plaintext").value = "";
  document.getElementById("encryptMatrix").className = "matrix-box empty";
  document.getElementById("encryptMatrix").textContent = "Enter a keyword to generate the matrix.";
  document.getElementById("preparedText").textContent = "—";
  document.getElementById("encryptPairs").textContent = "—";
  document.getElementById("ciphertext").textContent = "—";
  document.getElementById("encryptionSteps").className = "empty";
  document.getElementById("encryptionSteps").textContent = "Encrypt a message to see the steps.";
  showStatus("encryptStatus", "");
}

function clearDecryption() {
  document.getElementById("decryptKey").value = "";
  document.getElementById("cipherInput").value = "";
  document.getElementById("decryptMatrix").className = "matrix-box empty";
  document.getElementById("decryptMatrix").textContent = "Enter a keyword to generate the matrix.";
  document.getElementById("decryptPairs").textContent = "—";
  document.getElementById("decryptedText").textContent = "—";
  document.getElementById("cleanedDecryptedText").textContent = "—";
  document.getElementById("decryptionSteps").className = "empty";
  document.getElementById("decryptionSteps").textContent = "Decrypt a message to see the steps.";
  showStatus("decryptStatus", "");
}

function initHeroMatrix() {
  const matrix = buildMatrix("MONARCHY");
  document.getElementById("heroMatrix").innerHTML = matrixHTML(matrix);
}

document.addEventListener("DOMContentLoaded", () => {
  initHeroMatrix();

  document.getElementById("encryptBtn").addEventListener("click", encryptMessage);
  document.getElementById("decryptBtn").addEventListener("click", decryptMessage);
  document.getElementById("generateMatrixBtn").addEventListener("click", generateMatrix);
  document.getElementById("clearEncryptBtn").addEventListener("click", clearEncryption);
  document.getElementById("clearDecryptBtn").addEventListener("click", clearDecryption);

  document.getElementById("matrixKey").addEventListener("input", generateMatrix);
});