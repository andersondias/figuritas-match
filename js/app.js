import { parseMessage, countStickers } from './parser.js?v=3';
import { compareCollections, parseTeamKey, formatWhatsAppMessage } from './compare.js?v=3';
import { sortTeamEntries } from './teams.js?v=3';
import { loadData, saveCollection } from './storage.js?v=2';

let collectionEditing = false;
let compareFormVisible = true;

const SAMPLE_COLLECTION = `Figurinhas App - Lista
Eua Méx Can 26
Faltantes
MEX 🇲🇽: 1, 17, 18
BRA 🇧🇷: 5, 8, 14
ARG 🇦🇷: 3, 9, 11
Repetidas
RSA 🇿🇦: 3, 6, 19
ESP 🇪🇸: 7, 15
Baixe o app
https://www.figuritas.app/pt/baixar`;

const $ = (sel) => document.querySelector(sel);

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

function showStatus(el, message, type = 'success') {
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove('hidden');
}

async function pasteFromClipboard(textarea, statusEl) {
  if (!navigator.clipboard?.readText) {
    showStatus(statusEl, 'Use o toque longo no campo para colar.', 'warning');
    textarea.focus();
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      showStatus(statusEl, 'Nada para colar. Copie a lista no WhatsApp primeiro.', 'warning');
      return;
    }
    textarea.value = text;
    textarea.focus();
    statusEl.classList.add('hidden');
  } catch {
    showStatus(statusEl, 'Não foi possível colar. Use o toque longo no campo.', 'warning');
    textarea.focus();
  }
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

function showPanel(panelName) {
  const collectionPanel = $('#panel-collection');
  const comparePanel = $('#panel-compare');
  const showCollection = panelName === 'collection';

  collectionPanel.classList.toggle('active', showCollection);
  collectionPanel.hidden = !showCollection;
  comparePanel.classList.toggle('active', !showCollection);
  comparePanel.hidden = showCollection;
}

function updateNavigation(data) {
  const hasCollection = !!data.myCollection;

  if (!hasCollection || collectionEditing) {
    showPanel('collection');
  } else {
    showPanel('compare');
  }
}

function renderCollectionSummary(data) {
  const summaryEl = $('#collection-summary');
  const previewEl = $('#collection-preview');

  updateCollectionFormVisibility(data);
  updateOnboardingVisibility(data);
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
    `<p class="meta">Último salvamento: ${updated}</p>`;
  previewEl.classList.remove('hidden');
}

function renderCompareResults(result, teams) {
  const { youGet, youGive, totals } = result;
  const hasTrades = totals.youGet > 0 || totals.youGive > 0;

  const tradeSection = hasTrades
    ? `
    <div class="whatsapp-message card">
      <h3>Mensagem para WhatsApp</h3>
      <pre id="whatsapp-text" class="whatsapp-text">${escapeHtml(formatWhatsAppMessage(youGive, youGet, teams, getAppUrl()))}</pre>
      <button id="btn-copy-whatsapp" class="btn">Copiar mensagem</button>
    </div>`
    : `
    <div class="card no-trade-message">
      <p>Não há trocas disponíveis entre vocês.</p>
    </div>`;

  return `
    <div class="totals-bar">
      <div class="total-chip receive">
        <span class="num">${totals.youGet}</span>
        <span class="lbl">Você recebe</span>
      </div>
      <div class="total-chip offer">
        <span class="num">${totals.youGive}</span>
        <span class="lbl">Você oferece</span>
      </div>
    </div>
    ${tradeSection}
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
      setTimeout(() => { btn.textContent = 'Copiar mensagem'; }, 2000);
    } catch {
      textEl.select?.();
      document.execCommand('copy');
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = 'Copiar mensagem'; }, 2000);
    }
  });
}

function updateOnboardingVisibility(data) {
  const onboarding = $('#onboarding');
  onboarding.classList.toggle('hidden', !!data.myCollection);
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
    updateOnboardingVisibility(data);
    updateNavigation(data);
    updateCompareFooter(data);
    inputEl.focus();
  });

  $('#btn-show-example').addEventListener('click', () => {
    inputEl.value = SAMPLE_COLLECTION;
    inputEl.focus();
    statusEl.classList.add('hidden');
  });

  $('#btn-paste-collection').addEventListener('click', () => {
    pasteFromClipboard(inputEl, statusEl);
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
    resultsEl.innerHTML = '';
    statusEl.classList.add('hidden');
    $('#compare-input').value = '';
    updateCompareFormVisibility();
    $('#compare-input').focus();
  });

  $('#btn-paste-compare').addEventListener('click', () => {
    pasteFromClipboard($('#compare-input'), statusEl);
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
    if (comparison.totals.youGet > 0 || comparison.totals.youGive > 0) {
      bindCopyButton();
    }

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
  updateOnboardingVisibility(data);
}

init();
