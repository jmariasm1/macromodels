// core.js [FRAMEWORK]
// Page engine: builds the model tab bar, parameter table, endogenous variables
// table, plot grid and equations panel; wires recompute, scenarios and
// exports. Page entry scripts (assets/js/pages/*.js) call initPage() with a
// list of model modules that follow the contract in ARCHITECTURE.md.

import { t, getLang, setLang, onLangChange, registerStrings, applyI18n } from './i18n.js';
import { renderPlot, downloadPNG } from './charts.js';

const DEBOUNCE_MS = 120;

function debounce(fn, ms) {
  let handle = null;
  return (...args) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) node.setAttribute(k, v);
    }
  }
  (children || []).forEach((c) => {
    if (c === undefined || c === null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtNumber(value, fmt, lang) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const locale = lang === 'es' ? 'es-CO' : 'en-US';
  const nf = (opts) => new Intl.NumberFormat(locale, opts).format(value);
  if (fmt === 'pct') {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value * 100)}%`;
  }
  if (fmt === 'int') {
    return nf({ maximumFractionDigits: 0 });
  }
  // 'num' default: 3 significant decimals, adaptive
  const abs = Math.abs(value);
  let maxFrac = 3;
  if (abs >= 1000) maxFrac = 1;
  else if (abs >= 100) maxFrac = 2;
  else if (abs >= 1) maxFrac = 3;
  else maxFrac = 4;
  return nf({ maximumFractionDigits: maxFrac, minimumFractionDigits: 0 });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadText(text, filename, mime) {
  downloadBlob(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), filename);
}

function csvEscape(value) {
  const s = String(value === undefined || value === null ? '' : value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * initPage({ pageId: 'longrun'|'shortrun', models: [mod, ...] })
 */
export function initPage({ pageId, models }) {
  if (!models || !models.length) {
    throw new Error('initPage requires a non-empty models array');
  }
  models.forEach((m) => registerStrings(m.strings));

  const app = document.getElementById('app');
  if (!app) throw new Error('initPage: #app container not found');
  app.innerHTML = '';

  // --- persistent state per model: params1, params2 ---
  const state = new Map();
  models.forEach((m) => {
    state.set(m.id, {
      params1: Object.fromEntries(m.params.map((p) => [p.key, p.def1])),
      params2: Object.fromEntries(m.params.map((p) => [p.key, p.def2])),
    });
  });

  let activeId = pickInitialModel(models, pageId);

  // --- static shell ---
  const tabBar = el('div', { class: 'model-tabbar', role: 'tablist' });
  const body = el('div', { class: 'app-grid' });
  app.appendChild(tabBar);
  app.appendChild(body);

  function pickInitialModel(list, pgId) {
    const hash = (location.hash || '').replace('#', '');
    if (hash && list.some((m) => m.id === hash)) return hash;
    return list[0].id;
  }

  function renderTabBar() {
    tabBar.innerHTML = '';
    models.forEach((m) => {
      const active = m.id === activeId;
      const tab = el(
        'button',
        {
          class: 'model-tab' + (active ? ' is-active' : ''),
          role: 'tab',
          'aria-selected': active ? 'true' : 'false',
          type: 'button',
          onclick: () => {
            activeId = m.id;
            location.hash = m.id;
            renderTabBar();
            renderModel();
          },
        },
        [
          el('span', { class: 'model-tab-badge' }, [m.chapterLabel]),
          el('span', { class: 'model-tab-title', 'data-i18n': m.titleKey }, [t(m.titleKey)]),
        ]
      );
      tabBar.appendChild(tab);
    });
  }

  let currentCleanup = null;

  function renderModel() {
    if (currentCleanup) {
      try {
        currentCleanup();
      } catch (e) {
        console.error(e);
      }
      currentCleanup = null;
    }
    body.innerHTML = '';
    const model = models.find((m) => m.id === activeId);
    currentCleanup = mountModel(model, body, state.get(model.id));
  }

  window.addEventListener('hashchange', () => {
    const hash = (location.hash || '').replace('#', '');
    if (hash && models.some((m) => m.id === hash) && hash !== activeId) {
      activeId = hash;
      renderTabBar();
      renderModel();
    }
  });

  onLangChange(() => {
    applyI18n(document);
    renderTabBar();
    renderModel();
  });

  renderTabBar();
  renderModel();
}

// ---------------------------------------------------------------------------
// Per-model mounting
// ---------------------------------------------------------------------------

function mountModel(model, container, modelState) {
  const lang = getLang();

  // ---- sidebar: parameters ----
  const sidebar = el('aside', { class: 'params-sidebar card' });
  const sidebarHeader = el('div', { class: 'card-header' }, [
    el('h2', { 'data-i18n': 'section.parameters' }, [t('section.parameters')]),
  ]);
  const paramsTableWrap = el('div', { class: 'params-table-wrap' });
  const scenarioBar = buildScenarioBar(model, modelState, () => recompute());
  sidebar.appendChild(sidebarHeader);
  sidebar.appendChild(paramsTableWrap);
  sidebar.appendChild(scenarioBar);

  // ---- main results column ----
  const results = el('div', { class: 'results-col' });

  const endoCard = el('section', { class: 'card' }, [
    el('div', { class: 'card-header' }, [el('h2', { 'data-i18n': 'section.endogenous' }, [t('section.endogenous')])]),
  ]);
  const endoTableWrap = el('div', { class: 'endo-table-wrap' });
  endoCard.appendChild(endoTableWrap);

  const plotsCard = el('section', { class: 'card' }, [
    el('div', { class: 'card-header' }, [el('h2', { 'data-i18n': 'section.plots' }, [t('section.plots')])]),
  ]);
  const plotGrid = el('div', { class: 'plot-grid' });
  plotsCard.appendChild(plotGrid);

  const equationsCard = el('section', { class: 'card' }, [
    el('div', { class: 'card-header' }, [el('h2', { 'data-i18n': 'section.equations' }, [t('section.equations')])]),
  ]);
  const equationsBody = el('div', { class: 'equations-body' });
  const noteBody = model.noteKey ? el('p', { class: 'model-note' }, [t(model.noteKey)]) : null;
  equationsCard.appendChild(equationsBody);
  if (noteBody) equationsCard.appendChild(noteBody);

  const exportBar = buildExportBar(model, modelState);

  results.appendChild(endoCard);
  results.appendChild(plotsCard);
  results.appendChild(equationsCard);
  results.appendChild(exportBar);

  container.appendChild(sidebar);
  container.appendChild(results);

  // ---- plot containers (created once, updated via Plotly.react) ----
  const plotContainers = new Map();
  model.plots.forEach((pd) => {
    const card = el('div', { class: 'plot-card' });
    const head = el('div', { class: 'plot-card-head' }, [
      el('h3', { 'data-i18n': pd.titleKey }, [t(pd.titleKey)]),
      el('button', {
        class: 'btn btn-ghost btn-sm',
        type: 'button',
        'data-i18n': 'ui.png',
        onclick: () => downloadPNG(plotDiv, `${model.id}-${pd.id}.png`),
      }, [t('ui.png')]),
    ]);
    const plotDiv = el('div', { class: 'plot-canvas', id: `plot-${model.id}-${pd.id}` });
    card.appendChild(head);
    card.appendChild(plotDiv);
    plotGrid.appendChild(card);
    plotContainers.set(pd.id, plotDiv);
  });

  // ---- equations (KaTeX) ----
  renderEquations(model, equationsBody);

  // ---- parameter rows ----
  const paramRows = buildParamsTable(model, modelState, () => recompute());
  paramsTableWrap.appendChild(paramRows.table);

  let lastOut1 = null;
  let lastOut2 = null;

  function compute() {
    lastOut1 = model.compute(modelState.params1);
    lastOut2 = model.compute(modelState.params2);
  }

  function renderEndoTable() {
    endoTableWrap.innerHTML = '';
    endoTableWrap.appendChild(buildEndoTable(model, lastOut1, lastOut2));
  }

  function renderPlots() {
    model.plots.forEach((pd) => {
      const div = plotContainers.get(pd.id);
      renderPlot(div, pd, lastOut1, lastOut2, modelState.params1, modelState.params2);
    });
  }

  function recompute() {
    compute();
    renderEndoTable();
    renderPlots();
  }

  const debouncedRecompute = debounce(recompute, DEBOUNCE_MS);
  paramRows.onChange(debouncedRecompute);

  recompute();

  return function cleanup() {
    // Nothing persistent to tear down beyond DOM removal, which the caller does.
  };
}

// ---------------------------------------------------------------------------
// Parameters table
// ---------------------------------------------------------------------------

function buildParamsTable(model, modelState, notifyChange) {
  const table = el('table', { class: 'params-table' });
  const thead = el('thead', {}, [
    el('tr', {}, [
      el('th', { 'data-i18n': 'table.parameter' }, [t('table.parameter')]),
      el('th', { class: 'set-chip set-chip-1' }, [t('table.set1')]),
      el('th', { class: 'set-chip set-chip-2' }, [t('table.set2')]),
    ]),
  ]);
  const tbody = el('tbody');
  table.appendChild(thead);
  table.appendChild(tbody);

  const listeners = [];
  const notify = () => listeners.forEach((cb) => cb());

  model.params.forEach((param) => {
    const row = el('tr');
    const labelCell = el('td', { class: 'param-label-cell' }, [
      el('div', { class: 'param-latex', 'data-katex': param.latex }),
      el('div', { class: 'param-label', 'data-i18n': param.labelKey }, [t(param.labelKey)]),
    ]);
    const cell1 = buildParamCell(param, modelState.params1, 1, notify);
    const cell2 = buildParamCell(param, modelState.params2, 2, notify);
    row.appendChild(labelCell);
    row.appendChild(cell1);
    row.appendChild(cell2);
    tbody.appendChild(row);
  });

  // Render KaTeX for parameter labels after insertion
  queueMicrotask(() => renderKatexIn(table));

  return {
    table,
    onChange(cb) {
      listeners.push(cb);
    },
  };
}

function buildParamCell(param, paramsObj, setIdx, notify) {
  const cell = el('td', { class: `param-cell set-${setIdx}` });
  const isPct = param.unit === '%';
  const toDisplay = (decimalValue) => (isPct ? decimalValue * 100 : decimalValue);
  const toStored = (displayValue) => (isPct ? displayValue / 100 : displayValue);

  const displayMin = toDisplay(param.min);
  const displayMax = toDisplay(param.max);
  const displayStep = isPct ? param.step * 100 : param.step;

  const slider = el('input', {
    type: 'range',
    class: 'param-slider',
    min: String(Math.min(displayMin, displayMax)),
    max: String(Math.max(displayMin, displayMax)),
    step: String(displayStep),
    value: String(toDisplay(paramsObj[param.key])),
    'aria-label': `${param.key} set ${setIdx}`,
  });
  const number = el('input', {
    type: 'number',
    class: 'param-number',
    min: String(Math.min(displayMin, displayMax)),
    max: String(Math.max(displayMin, displayMax)),
    step: String(displayStep),
    value: String(round(toDisplay(paramsObj[param.key]))),
    'aria-label': `${param.key} set ${setIdx} numeric`,
  });
  const unitSpan = isPct ? el('span', { class: 'param-unit' }, ['%']) : null;

  function setFromDisplay(displayValue) {
    const clamped = Math.max(Math.min(displayMin, displayMax), Math.min(Math.max(displayMin, displayMax), displayValue));
    paramsObj[param.key] = toStored(clamped);
    slider.value = String(clamped);
    number.value = String(round(clamped));
    notify();
  }

  slider.addEventListener('input', () => setFromDisplay(parseFloat(slider.value)));
  number.addEventListener('input', () => {
    const v = parseFloat(number.value);
    if (!Number.isNaN(v)) setFromDisplay(v);
  });

  cell.appendChild(slider);
  const numWrap = el('div', { class: 'param-number-wrap' }, unitSpan ? [number, unitSpan] : [number]);
  cell.appendChild(numWrap);

  // expose a setter used by Copy 1->2 / Reset
  cell._setDisplay = setFromDisplay;
  cell._paramKey = param.key;
  cell._setIdx = setIdx;
  return cell;
}

function round(v) {
  return Math.round(v * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------
// Endogenous variables table
// ---------------------------------------------------------------------------

function buildEndoTable(model, out1, out2) {
  const lang = getLang();
  const table = el('table', { class: 'endo-table' });
  const thead = el('thead', {}, [
    el('tr', {}, [
      el('th', { 'data-i18n': 'table.variable' }, [t('table.variable')]),
      el('th', { class: 'set-chip set-chip-1' }, [t('table.set1')]),
      el('th', { class: 'set-chip set-chip-2' }, [t('table.set2')]),
      el('th', {}, [t('table.delta')]),
      el('th', {}, [t('table.pctdelta')]),
    ]),
  ]);
  const tbody = el('tbody');
  model.scalars.forEach((sc) => {
    const v1 = out1.scalars[sc.key];
    const v2 = out2.scalars[sc.key];
    const delta = v2 - v1;
    const pctDelta = v1 !== 0 ? (delta / Math.abs(v1)) * 100 : NaN;
    const row = el('tr', {}, [
      el('td', { class: 'endo-label-cell' }, [
        el('span', { class: 'endo-latex', 'data-katex': sc.latex }),
        el('span', { class: 'endo-label', 'data-i18n': sc.labelKey }, [' ' + t(sc.labelKey)]),
      ]),
      el('td', { class: 'num set-1' }, [fmtNumber(v1, sc.fmt, lang)]),
      el('td', { class: 'num set-2' }, [fmtNumber(v2, sc.fmt, lang)]),
      el('td', { class: 'num' }, [fmtNumber(delta, sc.fmt === 'pct' ? 'pct' : 'num', lang)]),
      el('td', { class: 'num' }, [Number.isFinite(pctDelta) ? `${pctDelta.toFixed(1)}%` : '—']),
    ]);
    tbody.appendChild(row);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  queueMicrotask(() => renderKatexIn(table));
  return table;
}

// ---------------------------------------------------------------------------
// Equations
// ---------------------------------------------------------------------------

function renderEquations(model, mount) {
  mount.innerHTML = '';
  model.equations.forEach((eqStr) => {
    const div = el('div', { class: 'equation-block' });
    mount.appendChild(div);
    if (window.katex) {
      try {
        window.katex.render(eqStr, div, { displayMode: true, throwOnError: false });
      } catch (e) {
        div.textContent = eqStr;
      }
    } else {
      div.textContent = eqStr;
    }
  });
}

function renderKatexIn(root) {
  if (!window.katex) return;
  root.querySelectorAll('[data-katex]').forEach((node) => {
    const src = node.getAttribute('data-katex');
    if (!src || node.dataset.katexRendered) return;
    try {
      window.katex.render(src, node, { displayMode: false, throwOnError: false });
      node.dataset.katexRendered = '1';
    } catch (e) {
      node.textContent = src;
    }
  });
}

// ---------------------------------------------------------------------------
// Scenario bar: Copy 1->2, Reset, Save/Load/Delete, Export/Import JSON
// ---------------------------------------------------------------------------

function scenarioStorageKey(modelId, name) {
  return `macromodels:${modelId}:${name}`;
}

function listScenarioNames(modelId) {
  const prefix = `macromodels:${modelId}:`;
  const names = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) names.push(k.slice(prefix.length));
  }
  return names.sort((a, b) => a.localeCompare(b));
}

function buildScenarioBar(model, modelState, onApplied) {
  const wrap = el('div', { class: 'scenario-bar' });

  const actionsRow = el('div', { class: 'scenario-actions' });
  const copyBtn = el('button', { class: 'btn btn-secondary', type: 'button', 'data-i18n': 'ui.copy12' }, [t('ui.copy12')]);
  const resetBtn = el('button', { class: 'btn btn-ghost', type: 'button', 'data-i18n': 'ui.reset' }, [t('ui.reset')]);
  actionsRow.appendChild(copyBtn);
  actionsRow.appendChild(resetBtn);

  const scenarioRow = el('div', { class: 'scenario-row' });
  const select = el('select', { class: 'scenario-select', 'data-i18n-aria-label': 'section.scenarios' });
  const saveBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button', 'data-i18n': 'ui.save' }, [t('ui.save')]);
  const loadBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-i18n': 'ui.load' }, [t('ui.load')]);
  const deleteBtn = el('button', { class: 'btn btn-ghost btn-sm btn-danger', type: 'button', 'data-i18n': 'ui.delete' }, [t('ui.delete')]);
  scenarioRow.appendChild(select);
  scenarioRow.appendChild(saveBtn);
  scenarioRow.appendChild(loadBtn);
  scenarioRow.appendChild(deleteBtn);

  const ioRow = el('div', { class: 'scenario-io-row' });
  const exportJsonBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'data-i18n': 'ui.exportJson' }, [t('ui.exportJson')]);
  const importLabel = el('label', { class: 'btn btn-ghost btn-sm file-btn' }, [t('ui.importJson')]);
  importLabel.setAttribute('data-i18n', 'ui.importJson');
  const importInput = el('input', { type: 'file', accept: 'application/json', class: 'sr-only' });
  importLabel.appendChild(importInput);
  ioRow.appendChild(exportJsonBtn);
  ioRow.appendChild(importLabel);

  const heading = el('h3', { class: 'scenario-heading', 'data-i18n': 'section.scenarios' }, [t('section.scenarios')]);

  wrap.appendChild(heading);
  wrap.appendChild(actionsRow);
  wrap.appendChild(scenarioRow);
  wrap.appendChild(ioRow);

  function refreshSelect() {
    select.innerHTML = '';
    const names = listScenarioNames(model.id);
    if (!names.length) {
      select.appendChild(el('option', { value: '', disabled: 'disabled', selected: 'selected' }, [t('ui.noScenarios')]));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.appendChild(el('option', { value: '', disabled: 'disabled', selected: 'selected' }, [t('ui.scenarioSelectPlaceholder')]));
    names.forEach((name) => select.appendChild(el('option', { value: name }, [name])));
  }
  refreshSelect();

  copyBtn.addEventListener('click', () => {
    model.params.forEach((p) => {
      modelState.params2[p.key] = modelState.params1[p.key];
    });
    syncParamInputs(model, modelState);
    onApplied();
  });

  resetBtn.addEventListener('click', () => {
    model.params.forEach((p) => {
      modelState.params1[p.key] = p.def1;
      modelState.params2[p.key] = p.def2;
    });
    syncParamInputs(model, modelState);
    onApplied();
  });

  saveBtn.addEventListener('click', () => {
    const name = prompt(t('ui.scenarioNamePrompt'));
    if (!name) return;
    const payload = {
      site: 'macromodels',
      model: model.id,
      lang: getLang(),
      params1: modelState.params1,
      params2: modelState.params2,
    };
    localStorage.setItem(scenarioStorageKey(model.id, name.trim()), JSON.stringify(payload));
    refreshSelect();
  });

  loadBtn.addEventListener('click', () => {
    const name = select.value;
    if (!name) return;
    const raw = localStorage.getItem(scenarioStorageKey(model.id, name));
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      applyScenarioPayload(model, modelState, payload);
      onApplied();
    } catch (e) {
      alert(t('ui.importError'));
    }
  });

  deleteBtn.addEventListener('click', () => {
    const name = select.value;
    if (!name) return;
    if (!confirm(t('ui.confirmDelete').replace('{name}', name))) return;
    localStorage.removeItem(scenarioStorageKey(model.id, name));
    refreshSelect();
  });

  exportJsonBtn.addEventListener('click', () => {
    const payload = {
      site: 'macromodels',
      model: model.id,
      lang: getLang(),
      params1: modelState.params1,
      params2: modelState.params2,
    };
    downloadText(JSON.stringify(payload, null, 2), `macromodels-${model.id}-${todayStr()}.json`, 'application/json');
  });

  importInput.addEventListener('change', () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        if (payload.model !== model.id) {
          alert(t('ui.importError'));
          return;
        }
        applyScenarioPayload(model, modelState, payload);
        onApplied();
      } catch (e) {
        alert(t('ui.importError'));
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });

  return wrap;
}

function applyScenarioPayload(model, modelState, payload) {
  model.params.forEach((p) => {
    if (payload.params1 && payload.params1[p.key] !== undefined) modelState.params1[p.key] = payload.params1[p.key];
    if (payload.params2 && payload.params2[p.key] !== undefined) modelState.params2[p.key] = payload.params2[p.key];
  });
  syncParamInputs(model, modelState);
}

/** Push modelState values back into the slider/number DOM controls. */
function syncParamInputs(model, modelState) {
  document.querySelectorAll('.params-table').forEach((table) => {
    table.querySelectorAll('td.param-cell').forEach((cell) => {
      const key = cell._paramKey;
      const setIdx = cell._setIdx;
      if (!key || !setIdx) return;
      const param = model.params.find((p) => p.key === key);
      if (!param) return;
      const stored = setIdx === 1 ? modelState.params1[key] : modelState.params2[key];
      const isPct = param.unit === '%';
      const display = isPct ? stored * 100 : stored;
      if (typeof cell._setDisplay === 'function') cell._setDisplay(display);
    });
  });
}

// ---------------------------------------------------------------------------
// Export bar: CSV / XLSX
// ---------------------------------------------------------------------------

function buildExportBar(model, modelState) {
  const wrap = el('div', { class: 'export-bar' });
  const csvBtn = el('button', { class: 'btn btn-secondary', type: 'button', 'data-i18n': 'ui.exportCsv' }, [t('ui.exportCsv')]);
  const xlsxBtn = el('button', { class: 'btn btn-primary', type: 'button', 'data-i18n': 'ui.exportXlsx' }, [t('ui.exportXlsx')]);
  wrap.appendChild(csvBtn);
  wrap.appendChild(xlsxBtn);

  csvBtn.addEventListener('click', () => {
    const out1 = model.compute(modelState.params1);
    const out2 = model.compute(modelState.params2);
    const csv = buildCsv(model, out1, out2, modelState);
    downloadText(csv, `macromodels-${model.id}-${todayStr()}.csv`, 'text/csv;charset=utf-8');
  });

  xlsxBtn.addEventListener('click', () => {
    if (!window.XLSX) {
      alert('XLSX library not loaded.');
      return;
    }
    const out1 = model.compute(modelState.params1);
    const out2 = model.compute(modelState.params2);
    const wb = buildWorkbook(model, out1, out2, modelState);
    window.XLSX.writeFile(wb, `macromodels-${model.id}-${todayStr()}.xlsx`);
  });

  return wrap;
}

function buildCsv(model, out1, out2, modelState) {
  const lines = [];
  lines.push('### Parameters');
  lines.push(['key', 'label', 'set1', 'set2'].map(csvEscape).join(','));
  model.params.forEach((p) => {
    lines.push([p.key, t(p.labelKey), modelState.params1[p.key], modelState.params2[p.key]].map(csvEscape).join(','));
  });
  lines.push('');
  lines.push('### Results');
  lines.push(['key', 'label', 'set1', 'set2', 'delta', 'pctDelta'].map(csvEscape).join(','));
  model.scalars.forEach((sc) => {
    const v1 = out1.scalars[sc.key];
    const v2 = out2.scalars[sc.key];
    const delta = v2 - v1;
    const pctDelta = v1 !== 0 ? (delta / Math.abs(v1)) * 100 : '';
    lines.push([sc.key, t(sc.labelKey), v1, v2, delta, pctDelta].map(csvEscape).join(','));
  });

  const groups = collectSeriesGroups(model, out1, out2);
  groups.forEach((group) => {
    lines.push('');
    lines.push(`### ${group.name}`);
    lines.push(group.header.map(csvEscape).join(','));
    group.rows.forEach((row) => lines.push(row.map(csvEscape).join(',')));
  });

  return lines.join('\n');
}

function collectSeriesGroups(model, out1, out2) {
  // Group by the shared "t"/index key if present; otherwise one group per series key.
  const groups = [];
  const s1 = out1.series || {};
  const s2 = out2.series || {};
  const allKeys = new Set([...Object.keys(s1), ...Object.keys(s2)]);
  const xKey = allKeys.has('t') ? 't' : null;
  const dataKeys = [...allKeys].filter((k) => k !== 't');

  if (xKey) {
    const header = [xKey];
    dataKeys.forEach((k) => {
      if (s1[k]) header.push(`${k} (Set 1)`);
      if (s2[k]) header.push(`${k} (Set 2)`);
    });
    const length = Math.max(
      s1[xKey] ? s1[xKey].length : 0,
      s2[xKey] ? s2[xKey].length : 0
    );
    const rows = [];
    for (let i = 0; i < length; i++) {
      const row = [s1[xKey] ? s1[xKey][i] : s2[xKey][i]];
      dataKeys.forEach((k) => {
        if (s1[k]) row.push(s1[k][i]);
        if (s2[k]) row.push(s2[k][i]);
      });
      rows.push(row);
    }
    groups.push({ name: 'Series', header, rows });
  } else {
    dataKeys.forEach((k) => {
      const a1 = s1[k] || [];
      const a2 = s2[k] || [];
      const header = ['index', `${k} (Set 1)`, `${k} (Set 2)`];
      const length = Math.max(a1.length, a2.length);
      const rows = [];
      for (let i = 0; i < length; i++) rows.push([i, a1[i], a2[i]]);
      groups.push({ name: k, header, rows });
    });
  }
  return groups;
}

function buildWorkbook(model, out1, out2, modelState) {
  const XLSX = window.XLSX;
  const wb = XLSX.utils.book_new();

  const paramsAoa = [['key', 'label', 'set1', 'set2']];
  model.params.forEach((p) => {
    paramsAoa.push([p.key, t(p.labelKey), modelState.params1[p.key], modelState.params2[p.key]]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paramsAoa), 'Parameters');

  const resultsAoa = [['key', 'label', 'set1', 'set2', 'delta', 'pctDelta']];
  model.scalars.forEach((sc) => {
    const v1 = out1.scalars[sc.key];
    const v2 = out2.scalars[sc.key];
    const delta = v2 - v1;
    const pctDelta = v1 !== 0 ? (delta / Math.abs(v1)) * 100 : '';
    resultsAoa.push([sc.key, t(sc.labelKey), v1, v2, delta, pctDelta]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resultsAoa), 'Results');

  const groups = collectSeriesGroups(model, out1, out2);
  groups.forEach((group, idx) => {
    const aoa = [group.header, ...group.rows];
    const sheetName = (group.name || `Series${idx + 1}`).slice(0, 31).replace(/[\\/*?:[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName);
  });

  return wb;
}
