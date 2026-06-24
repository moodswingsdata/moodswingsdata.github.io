/**
 * Feelings App — UI Controller
 *
 * Handles hash routing, result rendering, pagination, and popovers.
 */

import { parseQuery, summarizeQuery } from "./parser.js";
import {
  initSearch,
  executeSearch,
  getPrintingsForCard,
  getByPrintingId,
  getEditionForPrinting,
} from "./search.js";

const PAGE_SIZE = 50;

let currentResults = [];
let currentDirectives = {};
let currentPage = 1;
let currentQuery = "";
let currentQuerySummary = "";

// --- Initialization ---

async function init() {
  const loadingStatus = document.getElementById("loading-status");
  const searchForm = document.getElementById("search-form");

  function markDone(id) {
    const el = document.getElementById(id);
    el.classList.add("load-done");
    el.innerHTML = `✅ ${el.textContent.replace(/Loading/, "Loaded").replace("…", "")}`;
  }

  function markFailed(id, label) {
    const el = document.getElementById(id);
    el.classList.add("load-failed");
    el.innerHTML = `Failed to load ${label} data`;
  }

  // Load data individually to track each
  let cardsData, printingsData, editionsData;
  let anyFailed = false;

  const cardsPromise = fetch("data/cards.json")
    .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then((data) => { cardsData = data; markDone("load-cards"); })
    .catch(() => { anyFailed = true; markFailed("load-cards", "cards"); });

  const printingsPromise = fetch("data/printings.json")
    .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then((data) => { printingsData = data; markDone("load-printings"); })
    .catch(() => { anyFailed = true; markFailed("load-printings", "printings"); });

  const editionsPromise = fetch("data/editions.json")
    .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then((data) => { editionsData = data; markDone("load-editions"); })
    .catch(() => { anyFailed = true; markFailed("load-editions", "editions"); });

  await Promise.all([cardsPromise, printingsPromise, editionsPromise]);

  if (anyFailed) {
    return;
  }

  initSearch(cardsData, printingsData, editionsData);

  // Replace loading indicator with search form
  loadingStatus.classList.add("hidden");
  searchForm.classList.remove("hidden");
  const suggestions = document.querySelector(".suggestions");
  if (suggestions) suggestions.classList.remove("hidden");

  // Set up event listeners
  document.getElementById("search-form").addEventListener("submit", onSubmit);
  document.getElementById("prev-btn").addEventListener("click", () => goToPage(currentPage - 1));
  document.getElementById("next-btn").addEventListener("click", () => goToPage(currentPage + 1));

  // Popover listeners
  document.querySelector(".popover-backdrop").addEventListener("click", closePopover);
  document.querySelector(".popover-close").addEventListener("click", closePopover);
  document.querySelector(".popover-prev").addEventListener("click", () => navigatePopover(-1));
  document.querySelector(".popover-next").addEventListener("click", () => navigatePopover(1));

  // Keyboard
  document.addEventListener("keydown", onKeydown);

  // Hash routing
  window.addEventListener("hashchange", onHashChange);
  onHashChange();
}

function onSubmit(e) {
  e.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (query) {
    window.location.hash = `q=${encodeURIComponent(query)}`;
  } else {
    window.location.hash = "";
  }
}

// --- Hash routing ---

function onHashChange() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);

  const query = params.get("q") || "";
  const page = parseInt(params.get("p"), 10) || 1;
  const cardId = params.get("card") || "";

  if (query) {
    document.getElementById("search-input").value = query;
    if (query !== currentQuery) {
      runSearch(query);
    }
    currentPage = page;
    renderResults();

    if (cardId) {
      openPopoverById(cardId);
    } else {
      closePopover();
    }
  } else {
    showWelcome();
  }
}

function updateHash(query, page, cardId) {
  const parts = [];
  if (query) parts.push(`q=${encodeURIComponent(query)}`);
  if (page && page > 1) parts.push(`p=${encodeURIComponent(String(page))}`);
  if (cardId) parts.push(`card=${encodeURIComponent(cardId)}`);

  const newHash = parts.join("&");
  if (window.location.hash.slice(1) !== newHash) {
    window.location.hash = newHash;
  }
}

// --- Search execution ---

function runSearch(query) {
  currentQuery = query;
  try {
    const { ast, errors: parseErrors } = parseQuery(query);
    const { results, directives, errors: searchErrors } = executeSearch(ast);

    currentResults = results;
    currentDirectives = directives;
    currentPage = 1;
    currentQuerySummary = summarizeQuery(ast);

    const allErrors = [...parseErrors, ...searchErrors];
    showQuerySummary(currentQuerySummary);
    showErrors(allErrors);
  } catch (err) {
    currentResults = [];
    currentDirectives = {};
    currentQuerySummary = "";
    showQuerySummary(currentQuerySummary);
    showErrors([{ message: "Search error: " + err.message }]);
    console.error("Search failed:", err);
  }
  transitionToResults();
}

function showQuerySummary(summary) {
  const el = document.getElementById("query-info");
  if (summary) {
    el.classList.remove("hidden");
    el.textContent = summary;
  } else {
    el.classList.add("hidden");
    el.textContent = "";
  }
}

function showErrors(errors) {
  const el = document.getElementById("error-info");
  if (errors.length > 0) {
    el.classList.remove("hidden");
    el.textContent = errors.map((e) => e.message).join("; ");
  } else {
    el.classList.add("hidden");
    el.textContent = "";
  }
}

// --- UI transitions ---

function showWelcome() {
  const header = document.getElementById("header");
  header.classList.add("centered");
  header.classList.remove("top");
  document.getElementById("welcome").classList.remove("hidden");
  document.getElementById("results").classList.add("hidden");
  document.getElementById("search-input").value = "";
  currentQuery = "";
  currentResults = [];
  currentQuerySummary = "";
  showQuerySummary(currentQuerySummary);
  showErrors([]);
}

function transitionToResults() {
  const header = document.getElementById("header");
  header.classList.remove("centered");
  header.classList.add("top");
  document.getElementById("welcome").classList.add("hidden");
  document.getElementById("results").classList.remove("hidden");
}

// --- Result rendering ---

function renderResults() {
  const totalResults = currentResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalResults);
  const pageResults = currentResults.slice(start, end);

  // Info
  const infoEl = document.getElementById("results-info");
  infoEl.textContent = `${totalResults} result${totalResults !== 1 ? "s" : ""}`;

  // Grid
  const gridEl = document.getElementById("results-grid");
  gridEl.innerHTML = "";

  const asMode = currentDirectives.as || "cards";
  const isTextMode = asMode === "text" || asMode === "textprintings";

  if (isTextMode) {
    gridEl.style.display = "block";
  } else {
    gridEl.style.display = "";
  }

  for (let i = 0; i < pageResults.length; i++) {
    const { card, printing } = pageResults[i];
    const globalIndex = start + i;

    if (isTextMode) {
      const div = document.createElement("div");
      div.className = "result-text";
      div.innerHTML = `
        <span class="card-name">${escapeHtml(card.name)}</span>
        <span class="card-details">${escapeHtml(card.color)} · ${card.dice}${card.secondary_dice ? " / " + card.secondary_dice : ""}</span>
      `;
      div.addEventListener("click", () => openPopover(globalIndex));
      gridEl.appendChild(div);
    } else {
      const div = document.createElement("div");
      div.className = "result-card";
      const imgSrc = (printing && printing.card_image_url)
        ? escapeHtml(printing.card_image_url)
        : "missing.png";
      div.innerHTML = `
        <img src="${imgSrc}" alt="${escapeHtml(card.name)}" loading="lazy">
        <div class="card-name">${escapeHtml(card.name)}</div>
      `;
      div.addEventListener("click", () => openPopover(globalIndex));
      gridEl.appendChild(div);
    }
  }

  // Pagination
  const paginationEl = document.getElementById("pagination");
  if (totalPages > 1) {
    paginationEl.classList.remove("hidden");
    document.getElementById("page-info").textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prev-btn").disabled = currentPage <= 1;
    document.getElementById("next-btn").disabled = currentPage >= totalPages;
  } else {
    paginationEl.classList.add("hidden");
  }
}

function goToPage(page) {
  currentPage = page;
  updateHash(currentQuery, currentPage, null);
  renderResults();
  window.scrollTo(0, 0);
}

// --- Popover ---

let currentPopoverIndex = -1;

function openPopover(index) {
  currentPopoverIndex = index;
  const { card, printing } = currentResults[index];

  const popover = document.getElementById("popover");
  popover.classList.remove("hidden");

  // Image
  const imageEl = popover.querySelector(".popover-image");
  if (printing && printing.card_image_url) {
    imageEl.innerHTML = `<img src="${escapeHtml(printing.card_image_url)}" alt="${escapeHtml(card.name)}">`;
  } else {
    imageEl.innerHTML = `<img src="missing.png" alt="${escapeHtml(card.name)}">`;
  }

  // Details
  const detailsEl = popover.querySelector(".popover-details");
  let html = `<h2>${escapeHtml(card.name)}</h2><dl>`;
  html += `<dt>Color</dt><dd>${escapeHtml(card.color)}</dd>`;
  html += `<dt>Dice</dt><dd>${escapeHtml(card.dice)}</dd>`;
  if (card.secondary_dice) {
    html += `<dt>Secondary</dt><dd>${escapeHtml(card.secondary_dice)}</dd>`;
  }
  if (printing) {
    html += `<dt>Rarity</dt><dd>${escapeHtml(printing.rarity)}</dd>`;
    const edition = getEditionForPrinting(printing);
    if (edition) {
      html += `<dt>Set</dt><dd>${escapeHtml(edition.edition_name)} (${escapeHtml(edition.set_code)})</dd>`;
    }
    if (printing.collector_number != null) {
      html += `<dt>#</dt><dd>${printing.collector_number}</dd>`;
    }
    if (printing._artist_str) {
      html += `<dt>Artist</dt><dd>${escapeHtml(printing._artist_str)}</dd>`;
    }
    if (printing.treatment && printing.treatment !== "Standard") {
      html += `<dt>Treatment</dt><dd>${escapeHtml(printing.treatment)}</dd>`;
    }
  }
  html += `</dl>`;

  if (card.rules_text) {
    html += `<div class="rules-text">${card.rules_text}</div>`;
  }

  if (card.rulings_text && card.rulings_text.length > 0) {
    html += `<details class="rulings"><summary>Rulings</summary><ul>`;
    for (const ruling of card.rulings_text) {
      html += `<li>${escapeHtml(ruling)}</li>`;
    }
    html += `</ul></details>`;
  }

  // Other printings
  const allPrintings = getPrintingsForCard(card.id);
  if (allPrintings.length > 1) {
    html += `<div class="other-printings"><strong>Other printings:</strong> `;
    for (const p of allPrintings) {
      if (p.id === (printing && printing.id)) continue;
      const pEdition = getEditionForPrinting(p);
      const setLabel = pEdition ? pEdition.set_code : "?";
      html += `<a href="#" data-printing-id="${p.id}">${escapeHtml(setLabel)} #${p.collector_number || "?"}</a> `;
    }
    html += `</div>`;
  }

  detailsEl.innerHTML = html;

  // Handle printing links
  detailsEl.querySelectorAll("[data-printing-id]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const pid = a.dataset.printingId;
      openPopoverByPrintingId(pid);
    });
  });

  // Nav buttons visibility
  popover.querySelector(".popover-prev").style.display = index > 0 ? "" : "none";
  popover.querySelector(".popover-next").style.display = index < currentResults.length - 1 ? "" : "none";

  // Update hash
  const cardIdForHash = printing ? printing.id : card.id;
  updateHash(currentQuery, currentPage, cardIdForHash);
}

function openPopoverById(id) {
  const index = currentResults.findIndex(
    (r) => r.printing?.id === id || r.card.id === id
  );
  if (index >= 0) {
    openPopover(index);
  } else {
    const result = getByPrintingId(id);
    if (result) {
      showPopoverForResult(result);
    }
  }
}

function openPopoverByPrintingId(printingId) {
  const result = getByPrintingId(printingId);
  if (result) {
    const idx = currentResults.findIndex((r) => r.printing?.id === printingId);
    if (idx >= 0) {
      openPopover(idx);
    } else {
      showPopoverForResult(result);
    }
  }
}

function showPopoverForResult(result) {
  const { card, printing } = result;
  currentPopoverIndex = -1;

  const popover = document.getElementById("popover");
  popover.classList.remove("hidden");

  const imageEl = popover.querySelector(".popover-image");
  if (printing && printing.card_image_url) {
    imageEl.innerHTML = `<img src="${escapeHtml(printing.card_image_url)}" alt="${escapeHtml(card.name)}">`;
  } else {
    imageEl.innerHTML = `<img src="missing.png" alt="${escapeHtml(card.name)}">`;
  }

  const detailsEl = popover.querySelector(".popover-details");
  let html = `<h2>${escapeHtml(card.name)}</h2><dl>`;
  html += `<dt>Color</dt><dd>${escapeHtml(card.color)}</dd>`;
  html += `<dt>Dice</dt><dd>${escapeHtml(card.dice)}</dd>`;
  if (card.secondary_dice) {
    html += `<dt>Secondary</dt><dd>${escapeHtml(card.secondary_dice)}</dd>`;
  }
  if (printing) {
    html += `<dt>Rarity</dt><dd>${escapeHtml(printing.rarity)}</dd>`;
    const edition = getEditionForPrinting(printing);
    if (edition) {
      html += `<dt>Set</dt><dd>${escapeHtml(edition.edition_name)} (${escapeHtml(edition.set_code)})</dd>`;
    }
    if (printing.collector_number != null) {
      html += `<dt>#</dt><dd>${printing.collector_number}</dd>`;
    }
    if (printing._artist_str) {
      html += `<dt>Artist</dt><dd>${escapeHtml(printing._artist_str)}</dd>`;
    }
    if (printing.treatment && printing.treatment !== "Standard") {
      html += `<dt>Treatment</dt><dd>${escapeHtml(printing.treatment)}</dd>`;
    }
  }
  html += `</dl>`;

  if (card.rules_text) {
    html += `<div class="rules-text">${card.rules_text}</div>`;
  }

  if (card.rulings_text && card.rulings_text.length > 0) {
    html += `<details class="rulings"><summary>Rulings</summary><ul>`;
    for (const ruling of card.rulings_text) {
      html += `<li>${escapeHtml(ruling)}</li>`;
    }
    html += `</ul></details>`;
  }

  const allPrintings = getPrintingsForCard(card.id);
  if (allPrintings.length > 1) {
    html += `<div class="other-printings"><strong>Other printings:</strong> `;
    for (const p of allPrintings) {
      if (p.id === (printing && printing.id)) continue;
      const pEdition = getEditionForPrinting(p);
      const setLabel = pEdition ? pEdition.set_code : "?";
      html += `<a href="#" data-printing-id="${p.id}">${escapeHtml(setLabel)} #${p.collector_number || "?"}</a> `;
    }
    html += `</div>`;
  }

  detailsEl.innerHTML = html;

  detailsEl.querySelectorAll("[data-printing-id]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openPopoverByPrintingId(a.dataset.printingId);
    });
  });

  popover.querySelector(".popover-prev").style.display = "none";
  popover.querySelector(".popover-next").style.display = "none";

  const cardIdForHash = printing ? printing.id : card.id;
  updateHash(currentQuery, currentPage, cardIdForHash);
}

function closePopover() {
  document.getElementById("popover").classList.add("hidden");
  currentPopoverIndex = -1;
  updateHash(currentQuery, currentPage, null);
}

function navigatePopover(direction) {
  const newIndex = currentPopoverIndex + direction;
  if (newIndex >= 0 && newIndex < currentResults.length) {
    openPopover(newIndex);
  }
}

function onKeydown(e) {
  const popover = document.getElementById("popover");
  if (!popover.classList.contains("hidden")) {
    if (e.key === "Escape") closePopover();
    if (e.key === "ArrowLeft") navigatePopover(-1);
    if (e.key === "ArrowRight") navigatePopover(1);
  }
}

// --- Utility ---

function escapeHtml(str) {
  if (!str) return "";
  if (Array.isArray(str)) str = str.join(", ");
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Boot ---
init();
