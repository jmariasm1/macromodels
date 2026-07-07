# Macro Models — Architecture & Contracts (source of truth)

Interactive learning website implementing the long-run and short-run models of
Charles Jones, *Macroeconomics* (6th ed.) for the General Macroeconomics course
(EC0113/MS1002, Universidad EAFIT, Prof. José Miguel Arias Mejía).
Deployed on GitHub Pages: `https://jmariasm1.github.io/macromodels/`.

## Stack
- Pure static site. **No build step.** ES modules (`<script type="module">`).
- CDN libraries (pin these exact URLs in HTML):
  - Plotly `https://cdn.plot.ly/plotly-2.35.2.min.js` (charts + PNG export)
  - SheetJS `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` (XLSX export)
  - KaTeX 0.16.11 css+js+auto-render from jsdelivr (equations)
  - Google Fonts: Inter (400/500/600/700) + JetBrains Mono (numbers, optional)
- Everything else is hand-written vanilla JS/CSS.

## File layout (ownership — do not touch files owned by another agent)
```
macromodels/
  index.html            [FRAMEWORK] landing page
  long-run.html         [FRAMEWORK] thin shell, loads assets/js/pages/longrun.js
  short-run.html        [FRAMEWORK] thin shell, loads assets/js/pages/shortrun.js
  assets/css/style.css  [FRAMEWORK]
  assets/js/i18n.js     [FRAMEWORK] common strings + t()/setLang machinery
  assets/js/charts.js   [FRAMEWORK] Plotly helpers
  assets/js/core.js     [FRAMEWORK] page engine (params UI, scenarios, exports)
  assets/js/pages/longrun.js   [LONGRUN]  imports its 3 models, calls initPage
  assets/js/pages/shortrun.js  [SHORTRUN] imports its 3 models, calls initPage
  assets/js/models/solow.js      [LONGRUN]
  assets/js/models/labor.js      [LONGRUN]
  assets/js/models/inflation.js  [LONGRUN]
  assets/js/models/okun.js       [SHORTRUN]  (ch. 9 short-run intro + Okun)
  assets/js/models/iscurve.js    [SHORTRUN]  (ch. 11)
  assets/js/models/mppc.js       [SHORTRUN]  (ch. 12 MP + Phillips + full short-run model)
  tests/test-models.mjs [VERIFY] Node tests of compute() functions
  README.md             [FRAMEWORK]
```

## Model module contract (exact)
Each file in `assets/js/models/` has a **default export**:

```js
export default {
  id: 'solow',                 // unique, used for storage keys & DOM ids
  titleKey: 'model.solow.title',
  chapterLabel: 'Ch. 5',       // shown on the tab badge (string, not translated)
  strings: { en: { 'model.solow.title': 'Solow Growth Model', ... },
             es: { 'model.solow.title': 'Modelo de crecimiento de Solow', ... } },
  // Every i18n key this model needs lives HERE (params, plots, scalars, notes).
  params: [
    { key: 'Abar',            // JS identifier, used in compute()
      latex: '\\bar{A}',      // rendered with KaTeX in the table
      labelKey: 'param.solow.Abar',   // description string key
      min: 0.1, max: 5, step: 0.05,
      def1: 1.0, def2: 1.0,   // defaults for parameter set 1 and 2
      unit: '' | '%',         // '%' => displayed/entered as percent, stored as decimal
    }, ...
  ],
  T: 100,                     // simulation horizon (periods) if the model has dynamics
  compute(p) { ... },         // PURE function: {paramKey: number} -> outputs (see below)
  scalars: [                  // rows of the "Endogenous variables" table, in order
    { key: 'Kstar', latex: 'K^*', labelKey: 'scalar.solow.Kstar', fmt: 'num'|'pct'|'int' }, ...
  ],
  plots: [ /* plot descriptors, see below */ ],
  equations: [                // KaTeX display-mode strings (language-independent math)
    'Y_t = \\bar{A} K_t^{\\alpha} L_t^{1-\\alpha}', ...
  ],
  noteKey: 'model.solow.note', // 1–3 sentence pedagogical note shown under equations
}
```

### compute(p) — pure & Node-testable
Input: plain object `{Abar: 1, sbar: 0.2, ...}` (all decimals, never percents).
Output:
```js
{ scalars: { Kstar: 12.3, ... },          // one entry per `scalars` row
  series:  { t: [...], K: [...], Y: [...],      // named arrays, equal length per group
             kGrid: [...], sY: [...], dK: [...] } }
```
No DOM, no i18n, no Plotly inside `compute`. It must run in Node as-is.

### Plot descriptor
```js
{ id: 'solow-diagram',
  titleKey: 'plot.solow.diagram',
  xLabelKey: 'axis.solow.K', yLabelKey: 'axis.solow.invdep',
  kind: 'curves',
  build(out1, out2, p1, p2, t) {
    // out1/out2 are compute() results for set 1/2; t is the translate function
    return { traces: [ {x, y, name, scenario: 1|2, dash?: 'dash', role?: 'aux'} ... ],
             layout: { /* optional Plotly layout overrides, e.g. annotations, shapes */ } };
  } }
```
`charts.js` styles traces by `scenario` (1 = blue family, 2 = orange family) and
renders into a `.plot-card`. Every plot card gets a PNG download button (uses
`Plotly.downloadImage`, filename `<modelId>-<plotId>.png`, scale: 2).

## core.js responsibilities (framework)
- `initPage({ pageId: 'longrun'|'shortrun', models: [mod, ...] })`:
  builds the model tab bar, parameter table (3 columns: parameter | Set 1 | Set 2;
  each cell = slider + synced number input), endogenous-variables comparison table
  (Set 1, Set 2, Δ and %Δ columns), plot grid, equations panel (KaTeX render).
- Recompute (debounced ~120ms) on any input; update scalars + all plots in place
  (`Plotly.react`).
- **Copy 1→2** button: copies all Set-1 values into Set 2.
- **Reset** button: restores the model's `def1`/`def2` defaults.
- **Scenarios**: Save (prompt for a name → localStorage key `macromodels:<modelId>:<name>`),
  Load (dropdown of saved names + Delete), plus **Export JSON** (downloads
  `{site:'macromodels', model, lang, params1, params2}` as a .json file) and
  **Import JSON** (file input). Validate model id on import.
- **Export data**: CSV and XLSX buttons.
  - XLSX: workbook with sheets: `Parameters`, `Results` (endogenous scalars),
    and one sheet per series group (columns like `t, Y (Set 1), Y (Set 2), ...`).
  - CSV: same content concatenated into one file with `### section` header lines.
  - Filenames: `macromodels-<modelId>-<yyyy-mm-dd>.csv/.xlsx`.
- **Language**: EN/ES toggle in header; persists in `localStorage['macromodels:lang']`;
  default `es`. On switch: re-translate all `data-i18n` nodes, re-render dynamic
  UI (tables, plots — axis titles/trace names come from `t()`).
- URL hash selects the active model tab (`long-run.html#labor`).

## i18n.js contract
```js
export function t(key)            // current-language lookup, falls back to en, then key
export function getLang()         // 'en' | 'es'
export function setLang(lang)     // persists + document.documentElement.lang
export function onLangChange(cb)  // subscribe (core re-renders)
export function registerStrings(dict) // merge {en:{...}, es:{...}} from model modules
export function applyI18n(root=document) // translate [data-i18n], [data-i18n-title]
```
Common keys (`ui.*`) live in i18n.js: buttons (copy12, reset, save, load, delete,
exportCsv, exportXlsx, exportJson, importJson, png), table headers (parameter,
set1, set2, delta, variable), section titles (parameters, endogenous, plots,
equations, scenarios), nav (home, longrun, shortrun), landing copy, footer.

## Design system (style.css)
- CSS custom properties:
  `--bg:#f6f7fb; --surface:#ffffff; --ink:#111827; --muted:#6b7280;
   --brand:#1e3a8a; --brand-2:#3730a3; --s1:#2563eb; --s2:#ea580c;
   --border:#e5e7eb; --radius:14px; --shadow:0 1px 3px rgb(16 24 40 / .08), 0 4px 16px rgb(16 24 40 / .06);`
- Inter for UI; tabular numbers (`font-variant-numeric: tabular-nums`) in tables.
- Sticky app header: site name, page nav pills, language segmented control (EN|ES).
- Model tab bar under the header (pill tabs with chapter badge).
- Layout: 12-col grid; parameters panel (~380px, sticky, own scroll) left; results
  right: "Endogenous variables" card, then responsive 2-col plot grid, then
  Equations card. Single column under 960px.
- Scenario color chips: Set 1 = `--s1`, Set 2 = `--s2` used consistently in the
  param table headers, endogenous table, and plot traces.
- Landing page: hero (title, course line, ES/EN toggle), two large cards
  (Long Run — Ch. 5, 7, 8 / Short Run — Ch. 9, 11, 12) with model lists,
  a "how to use" strip (4 steps), footer (course, professor, book reference).
- Polished details: focus rings, hover states, subtle transitions (<150ms),
  print-friendly plots, favicon (inline SVG chart glyph).

## Conventions
- Percent-type params (`unit:'%'`): UI shows e.g. `20` with % suffix; stored/computed as `0.20`.
- Number display: `fmt:'num'` → 3 significant decimals adaptive; `'pct'` → `x.xx%`;
  `'int'` → thousands separators. Use `Intl.NumberFormat(lang)`.
- All files UTF-8, LF. No frameworks, no minification.
- Accessibility: label every input, aria-pressed on toggles, keyboard-usable tabs.
