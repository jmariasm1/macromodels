// app.js — the page engine: parameter panel, endogenous-variables table, plot
// grid, equations panel, scenarios and PNG exports. Model modules stay pure;
// everything that touches the DOM lives here.

import { t, fmt, getLang, setLang, onLangChange, applyI18n, registerStrings } from './i18n.js';
import { render, downloadPlotPng, downloadNodePng } from './charts.js';
import { initExam } from './exam.js';

// Recompute is debounced with a timer rather than requestAnimationFrame: rAF
// does not fire while the tab is hidden, which would leave the charts stale.
const DEBOUNCE_MS = 90;

/* ------------------------------------------------------------------ helpers */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function katex(tex, display = false) {
  if (window.katex) {
    try {
      return window.katex.renderToString(tex, { throwOnError: false, displayMode: display });
    } catch (_) { /* fall through */ }
  }
  return `<code>${tex.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</code>`;
}

function paramsForVariant(model, variant) {
  return model.params.filter((p) => !p.variants || p.variants.includes(variant));
}

function defaults(model, which) {
  const out = {};
  model.params.forEach((p) => { out[p.key] = which === 1 ? p.def1 : p.def2; });
  return out;
}

/* -------------------------------------------------------------- scenarios */

function storeKey(modelId) { return `macromodels:${modelId}:scenarios`; }

function loadScenarios(modelId) {
  try { return JSON.parse(localStorage.getItem(storeKey(modelId)) || '{}'); } catch (_) { return {}; }
}

function saveScenarios(modelId, obj) {
  try { localStorage.setItem(storeKey(modelId), JSON.stringify(obj)); } catch (_) { /* ignore */ }
}

/* ------------------------------------------------------------------- page */

export function initPage({ pageId, model, examSubject }) {
  registerStrings(model.strings);

  const state = {
    variant: model.variants ? model.variants[0].id : null,
    p1: defaults(model, 1),
    p2: defaults(model, 2),
    scenarios: loadScenarios(model.id),
  };

  const paramsHost = document.getElementById('params-host');
  const tableHost = document.getElementById('table-host');
  const plotHost = document.getElementById('plot-host');
  const eqHost = document.getElementById('equations-host');
  const variantHost = document.getElementById('variant-host');

  let timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(recompute, DEBOUNCE_MS); };

  /* -------------------------------------------------------- parameter panel */

  function buildParams() {
    paramsHost.innerHTML = '';
    const list = paramsForVariant(model, state.variant);
    const groups = [];
    list.forEach((p) => {
      const key = p.groupKey || '';
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key, items: [] }; groups.push(g); }
      g.items.push(p);
    });

    const wrap = el('div', 'param-groups');
    groups.forEach((g) => {
      const box = el('div', 'param-group');
      if (g.key) box.appendChild(el('h3', null, t(g.key)));
      const head = el('div', 'param-head');
      head.appendChild(el('span', null, t('ui.parameter')));
      head.appendChild(el('span', 'e1', t('ui.e1')));
      head.appendChild(el('span', 'e2', t('ui.e2')));
      box.appendChild(head);

      g.items.forEach((p) => {
        const row = el('div', 'param-row');
        const sym = el('label', 'sym');
        const m = el('span');
        m.innerHTML = katex(p.latex);
        sym.appendChild(m);
        const desc = el('span', 'desc', t(p.labelKey));
        desc.title = t(p.labelKey);
        sym.appendChild(desc);
        if (p.unit === '%') sym.appendChild(el('span', 'unit', '%'));
        row.appendChild(sym);

        [1, 2].forEach((which) => {
          const input = el('input');
          input.type = 'number';
          input.className = which === 1 ? 'e1' : 'e2';
          input.step = p.unit === '%' ? Math.max(p.step * 100, 0.01) : p.step;
          if (p.min != null) input.min = p.unit === '%' ? p.min * 100 : p.min;
          if (p.max != null) input.max = p.unit === '%' ? p.max * 100 : p.max;
          input.setAttribute('aria-label',
            `${t(p.labelKey)} — ${t(which === 1 ? 'ui.economy1' : 'ui.economy2')}`);
          input.dataset.key = p.key;
          input.dataset.which = String(which);
          input.value = readable(p, which === 1 ? state.p1[p.key] : state.p2[p.key]);
          input.addEventListener('input', () => {
            const raw = Number.parseFloat(input.value);
            if (!Number.isFinite(raw)) return;
            const v = p.unit === '%' ? raw / 100 : raw;
            (which === 1 ? state.p1 : state.p2)[p.key] = v;
            schedule();
          });
          row.appendChild(input);
        });
        box.appendChild(row);
      });
      wrap.appendChild(box);
    });
    paramsHost.appendChild(wrap);
  }

  function readable(p, v) {
    const x = p.unit === '%' ? v * 100 : v;
    return Number.isFinite(x) ? String(Number(x.toFixed(6))) : '';
  }

  function refreshInputs() {
    paramsHost.querySelectorAll('input[data-key]').forEach((input) => {
      const p = model.params.find((q) => q.key === input.dataset.key);
      if (!p) return;
      const src = input.dataset.which === '1' ? state.p1 : state.p2;
      input.value = readable(p, src[p.key]);
    });
  }

  /* ----------------------------------------------------------- variant tabs */

  function buildVariants() {
    if (!variantHost || !model.variants) return;
    variantHost.innerHTML = '';
    const seg = el('div', 'segmented');
    model.variants.forEach((v) => {
      const b = el('button', null, t(v.labelKey));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.variant === v.id));
      b.addEventListener('click', () => {
        if (state.variant === v.id) return;
        state.variant = v.id;
        buildVariants();
        buildParams();
        buildPlots();
        buildEquations();   // IS-MP and IS-LM do not share the same equation list
        schedule();
      });
      seg.appendChild(b);
    });
    const lbl = el('span', 'unit', `${t('ui.model')}:`);
    variantHost.appendChild(lbl);
    variantHost.appendChild(seg);
  }

  /* ------------------------------------------------------- endogenous table */

  function buildTable(o1, o2) {
    const table = el('table', 'data');
    table.id = 'endogenous-table';
    const thead = el('thead');
    const hr = el('tr');
    hr.appendChild(el('th', null, t('ui.variable')));
    const h1 = el('th', 'e1', t('ui.economy1'));
    const h2 = el('th', 'e2', t('ui.economy2'));
    hr.appendChild(h1); hr.appendChild(h2);
    hr.appendChild(el('th', null, t('table.delta')));
    thead.appendChild(hr);
    table.appendChild(thead);

    const tb = el('tbody');
    let lastGroup = null;
    model.scalars.forEach((s) => {
      if (s.groupKey && s.groupKey !== lastGroup) {
        lastGroup = s.groupKey;
        const gr = el('tr', 'group');
        const gd = el('td', null, t(s.groupKey));
        gd.colSpan = 4;
        gr.appendChild(gd);
        tb.appendChild(gr);
      }
      const v1 = o1.scalars[s.key];
      const v2 = o2.scalars[s.key];
      const tr = el('tr');
      const name = el('td');
      name.innerHTML = `${katex(s.latex)} <span class="desc">${t(s.labelKey)}</span>`;
      tr.appendChild(name);
      tr.appendChild(el('td', null, fmt(v1, s.fmt)));
      tr.appendChild(el('td', null, fmt(v2, s.fmt)));
      const d = el('td');
      if (Number.isFinite(v1) && Number.isFinite(v2)) {
        const diff = v2 - v1;
        d.textContent = s.fmt === 'pct'
          ? `${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff) * 100, 'num')} pp`
          : `${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff), s.fmt)}`;
        if (Math.abs(diff) > 1e-12) d.className = diff > 0 ? 'pos' : 'neg';
      } else {
        d.textContent = t('ui.na');
      }
      tr.appendChild(d);
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    tableHost.innerHTML = '';
    tableHost.appendChild(table);
  }

  /* --------------------------------------------------------------- plots */

  function buildPlots() {
    plotHost.innerHTML = '';
    let lastGroup = null;
    model.plots.forEach((pl) => {
      if (pl.groupKey && pl.groupKey !== lastGroup) {
        lastGroup = pl.groupKey;
        plotHost.appendChild(el('h3', 'group-title', t(pl.groupKey)));
      }
      const card = el('article', 'card');
      const head = el('div', 'card-head');
      head.appendChild(el('h3', null, t(pl.titleKey)));
      head.appendChild(el('div', 'spacer'));
      const btn = el('button', 'btn tiny', t('ui.png'));
      btn.type = 'button';
      btn.addEventListener('click', () => downloadPlotPng(`plot-${pl.id}`, `${model.id}-${pl.id}`));
      head.appendChild(btn);
      card.appendChild(head);
      const body = el('div', 'card-body');
      const frameEl = el('div', 'plot-frame');
      frameEl.id = `plot-${pl.id}`;
      body.appendChild(frameEl);
      card.appendChild(body);
      plotHost.appendChild(card);
    });
  }

  function drawPlots(o1, o2) {
    model.plots.forEach((pl) => {
      const spec = pl.build(o1, o2, state.p1, state.p2, t);
      render(`plot-${pl.id}`, spec, t(pl.xLabelKey), t(pl.yLabelKey));
    });
  }

  /* ------------------------------------------------------------ equations */

  function buildEquations() {
    const list = typeof model.equations === 'function'
      ? model.equations(state.variant)
      : model.equations;
    eqHost.innerHTML = '';
    const box = el('div', 'equations');
    list.forEach((e) => {
      if (e.headingKey) {
        box.appendChild(el('h4', 'eqgroup', t(e.headingKey)));
        return;
      }
      const d = el('div', 'equation');
      d.innerHTML = `<span class="eqname">${t(e.nameKey)}</span>${katex(e.tex, true)}`;
      box.appendChild(d);
    });
    eqHost.appendChild(box);
  }

  /* ------------------------------------------------------------- recompute */

  function recompute() {
    const o1 = model.compute(state.p1, state.variant);
    const o2 = model.compute(state.p2, state.variant);
    buildTable(o1, o2);
    drawPlots(o1, o2);
  }

  /* --------------------------------------------------------------- actions */

  function buildActions() {
    const host = document.getElementById('actions-host');
    host.innerHTML = '';

    const copy = el('button', 'btn', t('ui.copy12'));
    copy.type = 'button';
    copy.addEventListener('click', () => {
      state.p2 = { ...state.p1 };
      refreshInputs();
      schedule();
    });

    const reset = el('button', 'btn', t('ui.reset'));
    reset.type = 'button';
    reset.addEventListener('click', () => {
      state.p1 = defaults(model, 1);
      state.p2 = defaults(model, 2);
      refreshInputs();
      schedule();
    });

    const nameInput = el('input');
    nameInput.type = 'text';
    nameInput.placeholder = t('ui.scenarioName');
    nameInput.value = `${t('ui.scenarioName')} 1`;

    const save = el('button', 'btn', t('ui.save'));
    save.type = 'button';
    save.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) return;
      state.scenarios[name] = { variant: state.variant, p1: { ...state.p1 }, p2: { ...state.p2 } };
      saveScenarios(model.id, state.scenarios);
      refreshSelect(name);
    });

    const select = el('select');
    select.id = 'scenario-select';
    select.setAttribute('aria-label', t('ui.scenarioName'));

    const load = el('button', 'btn', t('ui.load'));
    load.type = 'button';
    load.addEventListener('click', () => {
      const sc = state.scenarios[select.value];
      if (!sc) return;
      if (sc.variant && model.variants) { state.variant = sc.variant; buildVariants(); }
      state.p1 = { ...defaults(model, 1), ...sc.p1 };
      state.p2 = { ...defaults(model, 2), ...sc.p2 };
      buildParams();
      buildPlots();
      buildEquations();
      schedule();
    });

    const del = el('button', 'btn', t('ui.delete'));
    del.type = 'button';
    del.addEventListener('click', () => {
      if (!select.value || !state.scenarios[select.value]) return;
      delete state.scenarios[select.value];
      saveScenarios(model.id, state.scenarios);
      refreshSelect();
    });

    [copy, reset, nameInput, save, select, load, del].forEach((n) => host.appendChild(n));

    function refreshSelect(pick) {
      const names = Object.keys(state.scenarios).sort((a, b) => a.localeCompare(b));
      select.innerHTML = names.length
        ? names.map((n) => `<option>${n.replace(/[<>&]/g, '')}</option>`).join('')
        : `<option value="">${t('ui.noScenarios')}</option>`;
      select.disabled = names.length === 0;
      load.disabled = names.length === 0;
      del.disabled = names.length === 0;
      if (pick && names.includes(pick)) select.value = pick;
    }
    refreshSelect();
  }

  /* ------------------------------------------------------------ table PNG */

  document.getElementById('table-png')?.addEventListener('click', () => {
    downloadNodePng(document.getElementById('endogenous-table'), `${model.id}-endogenous`);
  });

  /* ------------------------------------------------------------- chrome */

  buildChrome(pageId);
  initExam({ subject: examSubject });

  function rebuildAll() {
    buildChrome(pageId);
    buildVariants();
    buildParams();
    buildActions();
    buildPlots();
    buildEquations();
    recompute();
  }

  onLangChange(() => { rebuildAll(); applyI18n(); });

  buildVariants();
  buildParams();
  buildActions();
  buildPlots();
  buildEquations();
  applyI18n();
  recompute();
  window.addEventListener('resize', () => schedule());
}

/* ------------------------------------------------------------- app chrome */

export function buildChrome(pageId) {
  applyI18n();
  // Every [data-lang-host] gets a language switch: the small one in the header
  // and, on the landing page, a big one in the middle of the hero.
  document.querySelectorAll('[data-lang-host]').forEach((host) => {
    host.innerHTML = '';
    const seg = el('div', `segmented${host.dataset.langHost === 'big' ? ' big' : ''}`);
    [['es', 'Español'], ['en', 'English']].forEach(([code, full]) => {
      const label = host.dataset.langHost === 'big' ? full : code.toUpperCase();
      const b = el('button', null, label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(getLang() === code));
      b.setAttribute('aria-label', full);
      b.addEventListener('click', () => setLang(code));
      seg.appendChild(b);
    });
    host.appendChild(seg);
  });
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === pageId) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ------------------------------------------------- collapsible split pane */

export function initSplit() {
  const split = document.getElementById('split');
  const toggle = document.getElementById('exam-toggle');
  const gutter = document.getElementById('gutter');
  if (!split) return;

  const LSK = 'macromodels:examPane';
  const applyState = (collapsed) => {
    split.classList.toggle('collapsed', collapsed);
    if (toggle) {
      toggle.textContent = t(collapsed ? 'ui.showExam' : 'ui.hideExam');
      toggle.setAttribute('aria-pressed', String(!collapsed));
    }
    window.dispatchEvent(new Event('resize'));
  };

  let collapsed = false;
  try { collapsed = localStorage.getItem(LSK) === 'hidden'; } catch (_) { /* ignore */ }
  applyState(collapsed);

  toggle?.addEventListener('click', () => {
    collapsed = !collapsed;
    try { localStorage.setItem(LSK, collapsed ? 'hidden' : 'shown'); } catch (_) { /* ignore */ }
    applyState(collapsed);
  });

  onLangChange(() => applyState(split.classList.contains('collapsed')));

  // drag to resize
  let dragging = false;
  const onMove = (ev) => {
    if (!dragging) return;
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - split.getBoundingClientRect().left;
    const pct = Math.min(Math.max((x / split.clientWidth) * 100, 18), 72);
    split.style.setProperty('--exam-w', `${pct}%`);
  };
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    window.dispatchEvent(new Event('resize'));
  };
  gutter?.addEventListener('mousedown', (e) => {
    dragging = true; document.body.style.cursor = 'col-resize'; e.preventDefault();
  });
  gutter?.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', stop);
  window.addEventListener('touchend', stop);
}
