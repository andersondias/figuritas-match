import { parseMessage, countStickers } from './parser.js';
import { compareCollections, parseTeamKey, formatWhatsAppMessage } from './compare.js';
import { sortTeamEntries } from './teams.js';
import { loadData, saveCollection } from './storage.js';

let collectionEditing = false;
let compareFormVisible = true;

const $ = (sel) => document.querySelector(sel);

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

function showStatus(el, message, type = 'success') {
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getAppUrl() {
  let path = window.location.pathname.replace(/\/index\.html$/, '');
  if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
  return window.location.origin + path;
}

function formatTeamLine(key, numbers, teams) {
  const { code, emoji } = parseTeamKey(key);
  const displayEmoji = teams[key] || emoji;
  return `<li><span class="team-code">${code} ${displayEmoji}</span>: ${numbers.join(', ')}</li>`;
}

function renderCollectionList(title, collection, teams) {
  const entries = Object.entries(collection);
  if (!entries.length) return `<p class="empty-trade">Nenhuma</p>`;
  const items = sortTeamEntries(entries)
    .map(([key, nums]) => formatTeamLine(key, nums, teams))
    .join('');
  return `<h3>${title}</h3><ul class="team-list">${items}</ul>`;
}

function switchTab(tabName) {
  const tab = $(`#tab-${tabName}`);
  const panel = $(`#panel-${tabName}`);
  if (!tab || !panel) return;

  document.querySelectorAll('.tab').forEach((t) => {
    const isActive = t.dataset.tab === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('.panel').forEach((p) => {
    const isActive = p.id === `panel-${tabName}`;
    p.classList.toggle('active', isActive);
    p.hidden = !isActive;
  });
}

function updateNavigation(data) {
  const nav = $('#main-nav');
  const tabCollection = $('#tab-collection');
  const tabCompare = $('#tab-compare');
  const hasCollection = !!data.myCollection;

  if (!hasCollection) {
    nav.classList.remove('hidden');
    tabCollection.classList.remove('hidden');
    tabCompare.classList.add('hidden');
    switchTab('collection');
    return;
  }

  if (collectionEditing) {
    nav.classList.remove('hidden');
    tabCollection.classList.remove('hidden');
    tabCompare.classList.add('hidden');
    switchTab('collection');
  } else {
    nav.classList.add('hidden');
    switchTab('compare');
  }
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('hidden')) return;
      switchTab(tab.dataset.tab);
    });
  });
}

function renderCollectionSummary(data) {
  const summaryEl = $('#collection-summary');
  const previewEl = $('#collection-preview');

  updateCollectionFormVisibility(data);
  updateNavigation(data);
  updateCompareFooter(data);

  if (!data.myCollection) {
    summaryEl.classList.add('hidden');
    previewEl.classList.add('hidden');
    return;
  }

  const { need, swaps } = data.myCollection;
  const needCount = countStickers(need);
  const swapCount = countStickers(swaps);
  const updated = formatDate(data.myCollection.updatedAt);

  summaryEl.innerHTML = `
    <div class="stat-card">
      <div class="value">${needCount}</div>
      <div class="label">Faltantes</div>
    </div>
    <div class="stat-card">
      <div class="value">${swapCount}</div>
      <div class="label">Repetidas</div>
    </div>
  `;
  summaryEl.classList.remove('hidden');

  previewEl.innerHTML =
    renderCollectionList('Faltantes', need, data.teams) +
    renderCollectionList('Repetidas', swaps, data.teams) +
    `<p class="meta" style="color:var(--muted);font-size:0.8rem;margin-top:0.75rem">Último salvamento: ${updated}</p>`;
  previewEl.classList.remove('hidden');
}

function renderCompareResults(result, teams) {
  const { youGet, youGive, totals } = result;
  const whatsappMessage = formatWhatsAppMessage(youGive, youGet, teams, getAppUrl());

  return `
    <div class="totals-bar">
      <div>Você recebe <strong>${totals.youGet}</strong> · Você oferece <strong>${totals.youGive}</strong></div>
    </div>
    <div class="whatsapp-message card">
      <div class="whatsapp-header">
        <h3>Mensagem para WhatsApp</h3>
        <button id="btn-copy-whatsapp" class="btn primary">Copiar</button>
      </div>
      <pre id="whatsapp-text" class="whatsapp-text">${escapeHtml(whatsappMessage)}</pre>
    </div>
  `;
}

function bindCopyButton() {
  const btn = $('#btn-copy-whatsapp');
  const textEl = $('#whatsapp-text');
  if (!btn || !textEl) return;

  btn.addEventListener('click', async () => {
    const text = textEl.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
    } catch {
      textEl.select?.();
      document.execCommand('copy');
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
    }
  });
}

function updateCollectionFormVisibility(data) {
  const form = $('#collection-form');
  const hasCollection = !!data.myCollection;

  if (hasCollection && !collectionEditing) {
    form.classList.add('hidden');
  } else {
    form.classList.remove('hidden');
  }
}

function updateCompareFormVisibility() {
  const form = $('#compare-form');
  const toolbar = $('#compare-toolbar');
  const resultsEl = $('#compare-results');

  if (compareFormVisible) {
    form.classList.remove('hidden');
    toolbar.classList.add('hidden');
  } else {
    form.classList.add('hidden');
    toolbar.classList.toggle('hidden', resultsEl.classList.contains('hidden'));
  }
}

function updateCompareFooter(data) {
  const footer = $('#compare-footer');
  const hasCollection = !!data.myCollection;
  footer.classList.toggle('hidden', !hasCollection || collectionEditing);
}

function updateComparePanel(data) {
  const notice = $('#compare-no-collection');
  if (!data.myCollection) {
    notice.classList.remove('hidden');
    $('#btn-compare').disabled = true;
  } else {
    notice.classList.add('hidden');
    $('#btn-compare').disabled = false;
  }
}

function initCollection() {
  const statusEl = $('#collection-status');
  const inputEl = $('#collection-input');

  $('#btn-edit-collection').addEventListener('click', () => {
    collectionEditing = true;
    const data = loadData();
    updateCollectionFormVisibility(data);
    updateNavigation(data);
    updateCompareFooter(data);
    inputEl.focus();
  });

  $('#btn-parse-collection').addEventListener('click', () => {
    const text = inputEl.value.trim();
    if (!text) {
      showStatus(statusEl, 'Cole sua lista de figurinhas primeiro.', 'error');
      return;
    }

    const parsed = parseMessage(text);
    if (!Object.keys(parsed.need).length && !Object.keys(parsed.swaps).length) {
      showStatus(statusEl, 'Nenhuma figurinha encontrada. Verifique o formato da mensagem.', 'error');
      return;
    }

    const data = saveCollection(parsed, text);
    collectionEditing = false;
    renderCollectionSummary(data);
    updateComparePanel(data);

    let msg = `Salvo! ${countStickers(parsed.need)} faltantes, ${countStickers(parsed.swaps)} repetidas.`;
    if (parsed.warnings.length) {
      msg += ` (${parsed.warnings.length} linha(s) não puderam ser analisadas)`;
      showStatus($('#compare-status'), msg, 'warning');
    } else {
      showStatus($('#compare-status'), msg, 'success');
    }

    $('#compare-input').focus();
  });
}

function initCompare() {
  const statusEl = $('#compare-status');
  const resultsEl = $('#compare-results');

  $('#btn-new-comparison').addEventListener('click', () => {
    compareFormVisible = true;
    resultsEl.classList.add('hidden');
    statusEl.classList.add('hidden');
    updateCompareFormVisibility();
    $('#compare-input').focus();
  });

  $('#btn-compare').addEventListener('click', () => {
    const data = loadData();
    if (!data.myCollection) return;

    const text = $('#compare-input').value.trim();
    if (!text) {
      showStatus(statusEl, 'Cole a lista do outro usuário primeiro.', 'error');
      return;
    }

    const theirs = parseMessage(text);
    if (!Object.keys(theirs.need).length && !Object.keys(theirs.swaps).length) {
      showStatus(statusEl, 'Não foi possível analisar a lista. Verifique o formato da mensagem.', 'error');
      return;
    }

    const mergedTeams = { ...data.teams, ...theirs.teams };
    const comparison = compareCollections(data.myCollection, theirs);

    resultsEl.innerHTML = renderCompareResults(comparison, mergedTeams);
    resultsEl.classList.remove('hidden');
    bindCopyButton();

    compareFormVisible = false;
    updateCompareFormVisibility();

    if (theirs.warnings.length) {
      showStatus(statusEl, `${theirs.warnings.length} linha(s) não puderam ser analisadas.`, 'warning');
    } else {
      statusEl.classList.add('hidden');
    }
  });
}

function init() {
  initTabs();
  initCollection();
  initCompare();

  const data = loadData();
  if (data.myCollection?.rawText) {
    $('#collection-input').value = data.myCollection.rawText;
  }
  renderCollectionSummary(data);
  updateComparePanel(data);
  updateCompareFormVisibility();
  updateCompareFooter(data);
}

init();
