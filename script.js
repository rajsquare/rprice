let products = [];

const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");
const clearBtn = document.getElementById("clearSearch");

/* ---------- LOAD DATA ---------- */
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    products = data;
  });

/* ---------- NORMALIZE ---------- */
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

/* ---------- SYNONYMS ---------- */
const synonyms = {
  bucket: ["balti", "baldi"],
  balti: ["bucket"],
  baldi: ["bucket"],

  thal: ["thaal", "thali", "thaali"],
  thaal: ["thal", "thali", "thaali"],
  thali: ["thal", "thaal", "thaali"],
  thaali: ["thal", "thaal", "thali"],

  hammer: ["mathar"],
  hammered: ["mathar"],
  mathar: ["hammer"],

  rice: ["biryani"],
  biryani: ["rice"],

  kansa: ["bronze"],
  bronze: ["kansa"],

  katora: ["waati", "wati", "vaati", "vati"],
  waati: ["katora", "wati", "vaati", "vati"],
  wati: ["katora", "waati", "vaati", "vati"],
  vaati: ["katora", "waati", "wati", "vati"],
  vati: ["katora", "waati", "wati", "vaati"],

  box: ["dabba"],
  dabba: ["box"],

  masala: ["spice"],
  spice: ["masala"],

  kalchul: ["ladle"],
  ladle: ["kalchul"]
};

function expandQuery(query) {
  const words = query.split(" ");
  let expanded = [...words];

  words.forEach(w => {
    if (synonyms[w]) expanded.push(...synonyms[w]);
  });

  return [...new Set(expanded)];
}

/* ---------- FUZZY ---------- */
function fuzzyMatch(a, b) {
  if (a.includes(b)) return true;
  if (b.length < 4) return false;

  let diff = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) diff++;
  }

  return diff <= 1;
}

/* ---------- SCORE ---------- */
function scoreProduct(product, words, raw) {
  const name = normalize(product.productName);
  let score = 0;

  if (name === raw) score += 100;
  if (name.includes(raw)) score += 50;

  words.forEach(w => {
    if (name.includes(w)) score += 10;
    if (fuzzyMatch(name, w)) score += 5;
  });

  return score;
}

/* ---------- SEARCH ---------- */
function searchProducts(query) {
  const clean = normalize(query);
  if (!clean) return [];

  const words = expandQuery(clean);

  return products
    .map(p => ({ product: p, score: scoreProduct(p, words, clean) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.product);
}

/* ---------- TOAST ---------- */
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

/* ---------- RESTOCK TOGGLE ---------- */
function toggleRestock(id) {
  const el = document.getElementById("note-" + id);
  if (!el) return;

  el.style.display = el.style.display === "block" ? "none" : "block";
}

/* ---------- SUBMIT RESTOCK ---------- */
function submitRestock(id) {
  const product = products.find(p => p.sr === id);
  if (!product) return;

  const noteInput = document.querySelector(`#note-${id} input`);
  const note = noteInput ? noteInput.value.trim() : "";

  const formURL =
    "https://docs.google.com/forms/d/e/1FAIpQLSchgrkyM1HV8N4WCi7IEfNKuhBcZpYxg2RevxKLTDhsZCphAg/formResponse";

  const formData = new FormData();

  formData.append("entry.1915686954", product.sr);
  formData.append("entry.1591837856", product.productName);
  formData.append("entry.1545878342", note);

  fetch(formURL, {
    method: "POST",
    mode: "no-cors",
    body: formData
  });

  document.getElementById("note-" + id).style.display = "none";
  if (noteInput) noteInput.value = "";

  showToast("✓ Restock request sent");
}

/* ---------- RENDER (RETAIL ONLY) ---------- */
function renderResults(results) {
  resultsDiv.innerHTML = "";

  if (results.length === 0) {
    resultsDiv.innerHTML = "";
    return;
  }

  results.forEach(item => {
    resultsDiv.innerHTML += `
      <div class="product-card">

        <div class="product-title">
          ${item.sr}. ${item.productName}
        </div>

        <div class="price-row">
          <div class="price-r-full">
            ${item.rPrice || "-"}
          </div>
        </div>

        <div class="bottom-row">
          <div class="unit ${item.priceType === "PP" ? "unit-pp" : ""}">
            ${item.priceType || ""}
          </div>

          <button class="restock-btn" onclick="toggleRestock(${item.sr})">
            Request Restock
          </button>
        </div>

        <div id="note-${item.sr}" class="restock-note">
          <input placeholder="Optional note (size, qty etc)">
          <button onclick="submitRestock(${item.sr})">Submit</button>
        </div>

      </div>
    `;
  });
}

/* ---------- SEARCH EVENT ---------- */
searchInput.addEventListener("input", e => {
  const val = e.target.value;
  clearBtn.style.display = val ? "block" : "none";
  renderResults(searchProducts(val));
});

/* ---------- CLEAR ---------- */
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.style.display = "none";
  renderResults([]);
  searchInput.focus();
});