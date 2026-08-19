# Macro Models — architecture

Static site, **no build step**. ES modules loaded straight from the HTML.
CDN libraries (pin these exact URLs): Plotly `2.35.2`, KaTeX `0.16.11`,
html2canvas `1.4.1`.

```
macromodels/
  index.html                landing: language + choice of model set
  short-run.html            exam viewer | short-run models
  long-run.html             exam viewer | long-run models
  assets/css/app.css        design system (warm paper, serif headings, cards)
  assets/js/i18n.js         string table + t() / setLang() / applyI18n() / fmt()
  assets/js/charts.js       Plotly styling, rendering and PNG export
  assets/js/app.js          page engine: params, table, plots, equations, scenarios
  assets/js/exam.js         the gated exam viewer
  assets/js/models/*.js     pure model modules (Node-testable)
  assets/js/pages/*.js      three-line bootstraps
  assets/exam/manifest.json KDF params, exam windows, page counts, wrapped keys
  assets/exam/lr/*.bin      AES-GCM encrypted WebP exam pages
  tests/models.test.mjs     Node checks
```

## Colour convention

Economies are told apart by **colour**: Economy 1 `#2b63d9` (blue), Economy 2
`#cc5a43` (warm red). Different curves *within* one economy are told apart by
**line style** — solid, dashed, dotted. `charts.js` applies both from the
`economy`, `dash` and `role` fields of a trace descriptor.

## Model module contract

Each file in `assets/js/models/` default-exports:

```js
export default {
  id: 'longrun',
  titleKey: 'model.lr.title',
  variants: [{ id, labelKey }],        // optional (short run: IS-MP / IS-LM)

  params: [{
    key, latex, labelKey, groupKey,    // groupKey starts a new subheading
    min, max, step, def1, def2,
    unit: '' | '%',                    // '%' is shown/typed as a percent, stored as a decimal
    variants: ['ismp'],                // optional: only shown for these variants
  }],

  compute(p, variant) -> {             // PURE: no DOM, no i18n, no Plotly
    scalars: { key: number },          // one entry per `scalars` row
    series:  { name: number[] },       // named arrays used by the plots
    meta:    { variant },              // optional
  },

  scalars: [{ key, latex, labelKey, groupKey, fmt: 'num'|'pct'|'int'|'big' }],

  plots: [{
    id, titleKey, groupKey, xLabelKey, yLabelKey,
    build(out1, out2, p1, p2, t) -> {
      traces: [{ x, y, name, economy: 0|1|2, dash?, role?: 'aux', mode?, marker?, type? }],
      layout: { /* optional Plotly overrides */ },
    },
  }],

  equations: [...] | (variant) => [...],   // { headingKey } | { nameKey, tex }
  strings: { en: {...}, es: {...} },        // every i18n key the model needs
}
```

`compute()` must run unchanged in Node — `tests/models.test.mjs` imports the
modules directly.

## app.js responsibilities

`initPage({ pageId, model, examSubject })` builds the parameter panel (grouped,
two number inputs per row), the endogenous-variables table (Economy 1, Economy 2,
Δ), the plot grid (one card per plot, group headings, PNG button), and the
equations panel (KaTeX, one named block per equation). It also wires
`Copy 1 → 2`, `Reset` and the `Save` / `Load` / `Delete` scenarios stored under
`localStorage['macromodels:<modelId>:scenarios']`.

Recompute is debounced with `setTimeout`, **not** `requestAnimationFrame`: rAF
does not fire while the tab is hidden, which would leave the charts stale.

Switching the variant rebuilds the parameters, the plots **and the equations** —
IS-MP and IS-LM do not share the same equation list.

`initSplit()` handles the collapsible, draggable divider. The collapsed state
persists in `localStorage['macromodels:examPane']`.

## i18n

`registerStrings({en, es})` merges a model's strings into the table. `t(key, vars)`
looks up the current language, falls back to English, then to the key itself.
`applyI18n(root)` translates `[data-i18n]` and `[data-i18n-attr]` nodes.
Language persists in `localStorage['macromodels:lang']`; the default is Spanish.
`fmt(value, kind)` formats numbers with `Intl.NumberFormat` in the active locale.

## Exam access model

```
passphrase(id)        kdf.prefix + [session word] + id      e.g. "macro1000382896"
content_key[V][lang]  32 random bytes; encrypts every page of that edition
KEK(id)               PBKDF2-HMAC-SHA256(passphrase(id), salt, 200000, dklen=32)
wrapped[i][lang]      AES-GCM(KEK(id_i), content_key[version(id_i)][lang])
version(id)           digital root of the ID (1..9)
```

`kdf.prefix` and `kdf.requiresWord` come from the manifest. When `requiresWord`
is set, the gate shows a second field for the session word and refuses a wrong or
empty one. With no word the passphrase is derivable from the ID alone.

The browser derives `KEK` from the ID that was typed, then tries every wrapped
entry; exactly one authenticates when the ID is on the class list. The wrapped
list is shuffled so its order says nothing about who is who.

Time is read from the `Date` header of a same-origin `HEAD` request rather than
the local clock. The two test codes in `manifest.json` (`testHashes`, stored as
SHA-256) bypass the schedule.

Pages are decrypted to WebP bytes, turned into an `ImageBitmap` and drawn onto a
`<canvas>` — no object URL is ever created. `contextmenu`, `copy`, `cut`,
`dragstart` and `selectstart` are cancelled inside the pane, `Ctrl/Cmd+P` and
`Ctrl/Cmd+S` are swallowed while an exam is open, and `@media print` blanks the
page. A watermark carrying the student's ID sits over every page.

**Known limits.** A student who legitimately opens the exam can still recover the
pixels through developer tools. No client-side scheme prevents that.

More importantly, the repository is public and the encrypted pages are committed
to it, so anyone can fetch them from Pages, `raw.githubusercontent.com` or
`github.com`, and the window is enforced only here in the browser. A student who
knows their own ID can therefore decrypt their own version early with a short
script. Removing the files does not help: every previous build remains in the git
history at an older commit and still decrypts under the rule that was in force
then. Only a session word (`--secret`) plus regenerating the versions with fresh
numbers actually protects an exam that has not been sat.
