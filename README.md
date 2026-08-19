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

- A **passphrase** built as `prefix + [session word] + ID` (by default
  `macro` + ID, e.g. `macro1000382896`) is stretched with PBKDF2-SHA256
  (200 000 iterations) into the key that unwraps the content key of that version.
  Only IDs on the class list have an entry that authenticates, so **no plaintext
  list of student IDs is published** and the pages cannot be decrypted without a
  valid ID.
- `build_site_exam.py --secret WORD` puts a **session word** into the passphrase.
  The gate then asks for it too and refuses a wrong or missing one. Without a
  word the passphrase is computable from the ID, so it rotates the keys but does
  not stop a student who knows their own ID from decrypting their own version
  ahead of time — see the warning below.
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

### Warning: this repository is public and its history is permanent

The encrypted pages are committed here, so they can be downloaded from GitHub
Pages, `raw.githubusercontent.com` and `github.com` alike. That is fine on its
own — they are ciphertext. The problem is that **a student who knows their own
ID can decrypt their own version at any time with a short script**, without ever
loading the site, because the exam window is enforced only by the page's
JavaScript.

Deleting the files does not fix it: **every previous build stays in the git
history and is still downloadable at an older commit.** This was verified — a
page fetched from a superseded commit decrypted with a real student ID and
matched the current exam byte for byte. Changing the passphrase does not fix it
either, because the older build still opens under the older rule.

Two things actually protect an exam that has not been sat yet:

1. `--secret WORD` — say the word out loud when the session starts.
2. **Regenerate the versions with fresh numbers** before the real session, so
   whatever sits in the history is not the exam anyone takes.

Use both together.

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
