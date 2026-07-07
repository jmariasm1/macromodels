# MacroModels

Interactive teaching website implementing the long-run and short-run macroeconomic
models from Charles I. Jones, *Macroeconomics* (6th edition, W.W. Norton), for the
course **Macroeconomía General — EC0113 / MS1002 · Universidad EAFIT ·
Prof. José Miguel Arias Mejía**.

Each model lets students set two parameter sets (Set 1 = baseline, Set 2 =
counterfactual), compare endogenous variables side by side, explore interactive
plots, read the equations, and export results (PNG, CSV, XLSX, JSON scenarios).
Fully bilingual: Spanish (default) and English.

## Structure

```
macromodels/
  index.html            Landing page
  long-run.html         Long-run models shell (Solow, labor market, inflation)
  short-run.html        Short-run models shell (Okun, IS curve, MP & Phillips)
  assets/css/style.css  Design system
  assets/js/i18n.js     Bilingual string dictionaries + t()/setLang machinery
  assets/js/charts.js   Plotly styling helpers (renderPlot, downloadPNG)
  assets/js/core.js     Page engine (tabs, parameter UI, scenarios, exports)
  assets/js/pages/      Page entry scripts (import models, call initPage)
  assets/js/models/     Model modules (pure compute() + UI descriptors)
  tests/                Node tests of model compute() functions
  ARCHITECTURE.md       Source-of-truth contract for all modules
```

Pure static site — **no build step**. ES modules plus pinned CDN libraries:
[Plotly](https://plotly.com/javascript/) (charts),
[KaTeX](https://katex.org/) (equations),
[SheetJS](https://sheetjs.com/) (XLSX export).

## Run locally

Because the site uses ES modules, serve it over HTTP (opening `index.html`
directly from disk will not work). Any static server does:

```bash
# from the macromodels/ folder
python -m http.server 8000
# then open http://localhost:8000/
```

or `npx serve`, VS Code Live Server, etc.

## Deployment

Deployed as a plain static site on **GitHub Pages** (all asset URLs are
relative, so it works from a subdirectory such as
`https://<user>.github.io/macromodels/`). Push the repository and enable Pages
on the default branch — no build configuration needed.

## Credits

- Models and pedagogy: Charles I. Jones, *Macroeconomics*, 6th edition, W.W. Norton.
- Course: Macroeconomía General (EC0113 / MS1002), Universidad EAFIT.
- Instructor: Prof. José Miguel Arias Mejía.
- Built with Plotly, KaTeX, SheetJS and vanilla JavaScript.
