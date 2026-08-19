# Macro Models

Interactive macroeconomic models for **General Macroeconomics (EC0113 / MS1002)**,
Universidad EAFIT — Prof. José Miguel Arias Mejía. Based on C. I. Jones,
*Macroeconomics*, 6th ed.

Live: <https://jmariasm1.github.io/macromodels/>

## What is here

| Page | What it holds |
|---|---|
| `index.html` | Landing page: pick a language (ES/EN) and a set of models |
| `short-run.html` | Exam viewer + short-run models (IS-MP / IS-LM, Phillips, Okun, I-S market, money market) |
| `long-run.html` | Exam viewer + long-run models (Solow, labor market with a minimum wage, bathtub, money and inflation) |

Both model pages are split vertically: the **exam viewer** on the left (it can be
hidden so the models take the whole screen, and the divider can be dragged), and
the **models** on the right — a parameter panel for two economies on top, then the
endogenous-variables table and the charts, then the equations.

Everything compares **Economy 1** (blue) against **Economy 2** (warm red).
`Copy 1 → 2`, `Reset`, and named `Save` / `Load` / `Delete` scenarios are in the
parameter panel; every chart and the table have a `PNG` button.

## The exam viewer

A student types their ID; the **version of the exam is the digital root of that
number** (add the digits, repeat until one digit is left: `123456789 → 45 → 9`).

- The ID is also the **decryption key**. A key-encryption key is derived from it
  with PBKDF2-SHA256 (200 000 iterations) and used to unwrap the content key of
  that version. Only IDs on the class list have an entry that authenticates, so
  **no plaintext list of student IDs is published** and the pages cannot be
  decrypted without a valid ID.
- Outside the scheduled exam windows nothing is decrypted. The clock comes from
  the server's own `Date` response header, not from the student's machine.
- Pages are shipped as AES-GCM encrypted raster images and painted onto a
  `<canvas>`: no PDF to save, no text to copy, no image URL to right-click, and
  printing is blanked by CSS. Every page carries a watermark with the student's ID.
- Any failure — unknown ID, wrong time, exam not written yet — shows the same
  *"Parcial pendiente de elaboración"* notice.

This is **deterrence, not DRM**: a student who legitimately opens the exam can
still extract the pixels with developer tools. It stops casual downloading,
printing, copying and sharing.

**Master switch:** `assets/exam/manifest.json` → `subjects.longrun.available`.
Set it to `false` to show the pending notice to everyone; `true` to open it
(the schedule still applies to non-test IDs).

## Building the exam assets

The exam is generated from `../Examen Parcial 1 v2/` in the course folder:

```bash
python make_exam.py          # 9 versions x ES/EN -> tex/ and pdf/
python make_key.py           # the Excel answer key
python build_site_exam.py    # rasterise, encrypt and publish into this repo
```

Add `--hold` to `build_site_exam.py` to publish the assets with the exam marked
as not yet available.

## Tests

```bash
node tests/models.test.mjs
```

Checks the pure `compute()` functions of both models and re-derives every answer
of the printed midterm from the site's own long-run model, so the exam and the
tool cannot drift apart.

## Stack

Static site, no build step. ES modules, vanilla JS and CSS. CDN libraries pinned
in the HTML: Plotly 2.35.2, KaTeX 0.16.11, html2canvas 1.4.1.
