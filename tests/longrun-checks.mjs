// longrun-checks.mjs [LONGRUN]
// CI-style verification of the INTEGRATED long-run model's compute() against the
// closed forms and book examples in SPEC_LONGRUN.md, plus the cross-chapter
// linkages that define the merged single-model economy (labor demand at K*,
// g_Y = n̄ in π, Fisher R = Solow steady-state MPK, exact-vs-approx Fisher).
// Run: node tests/longrun-checks.mjs   (exits non-zero on failure)

import assert from 'node:assert/strict';
import longrun from '../assets/js/models/longrun.js';

const close = (a, b, tol = 1e-9, msg = '') =>
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)),
    `${msg}: got ${a}, expected ${b}`);

const defaults = (model) =>
  Object.fromEntries(model.params.map((p) => [p.key, p.def1]));

// A book-example base: α = 1/3, n = 0 (no population growth) so the classic
// no-growth Solow closed forms apply directly.
const base = (over = {}) => ({ ...defaults(longrun), nbar: 0, ...over });

let failures = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`FAIL ${name}\n     ${e.message}`);
  }
};

// ---------------------------------------------------------------- Solow (Ch. 5)
test('solow: k* = (sA/d)^{3/2} and K* = k*·L for α=1/3, n=0 (eq. 5.8)', () => {
  const p = base({ sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 100 });
  const out = longrun.compute(p);
  const kStar = Math.pow((p.sbar * p.Abar) / p.dbar, 1.5);
  close(out.scalars.kStar, kStar, 1e-9, 'k*');
  close(out.scalars.Kstar, kStar * p.Lbar, 1e-9, 'K*');
});

test('solow: y* = (s/d)^{1/2}·A^{3/2} and c* = (1−s)y* (eq. 5.9)', () => {
  const p = base({ sbar: 0.25, dbar: 0.08, Abar: 1.2, alpha: 1 / 3, Lbar: 50, K0: 10 });
  const out = longrun.compute(p);
  const yStar = Math.sqrt(p.sbar / p.dbar) * Math.pow(p.Abar, 1.5);
  close(out.scalars.yStar, yStar, 1e-9, 'y*');
  close(out.scalars.cStar, (1 - p.sbar) * yStar, 1e-9, 'c*');
});

test('solow: K*/Y* = s/d (eq. 5.11) and R* = MPK = α·d/s', () => {
  const p = base({ sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 100 });
  const out = longrun.compute(p);
  close(out.scalars.kyRatio, p.sbar / p.dbar, 1e-9, 'K*/Y*');
  close(out.scalars.Rstar, p.dbar / (3 * p.sbar), 1e-9, 'R* = d/(3s)');
  // R* independent of Abar:
  const out2 = longrun.compute({ ...p, Abar: 2.5 });
  close(out2.scalars.Rstar, out.scalars.Rstar, 1e-9, 'R* independent of A');
});

test('solow: population growth — k* = (sA/(n+d))^{3/2} (eq. 5.16)', () => {
  const p = base({ sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 100, nbar: 0.01 });
  const out = longrun.compute(p);
  close(out.scalars.kStar, Math.pow((p.sbar * p.Abar) / (p.nbar + p.dbar), 1.5), 1e-9, 'k* with n');
  // Higher n lowers y*:
  const out0 = longrun.compute({ ...p, nbar: 0 });
  assert.ok(out.scalars.yStar < out0.scalars.yStar, 'higher n should lower y*');
});

test('solow: transition dynamics converge to k* from above and below', () => {
  const p = base({ sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 50 });
  const lo = longrun.compute(p);
  const hi = longrun.compute({ ...p, K0: 1000 });
  const lastLo = lo.series.k[lo.series.k.length - 1];
  const lastHi = hi.series.k[hi.series.k.length - 1];
  close(lastLo, lo.scalars.kStar, 5e-3, 'k_T from below');
  close(lastHi, hi.scalars.kStar, 5e-3, 'k_T from above');
  // Growth-rate form: Δk/k = s·(y*/k*)·[(k*/k)^{2/3} − 1] at t=0
  const g0 = lo.series.gk[0];
  const expected = p.sbar * (lo.scalars.yStar / lo.scalars.kStar)
    * (Math.pow(lo.scalars.kStar / lo.series.k[0], 2 / 3) - 1);
  close(g0, expected, 1e-9, 'principle of transition dynamics');
});

test('solow: output-growth transition g_y = α·g_k (mirror plot data)', () => {
  const p = base({ K0: 50 });
  const out = longrun.compute(p);
  for (let i = 0; i < out.series.gy.length; i++) {
    close(out.series.gy[i], p.alpha * out.series.gk[i], 1e-12, `g_y=α·g_k at t=${i}`);
  }
});

// ---------------------------------------------------------------- Labor (Ch. 7)
test('labor: bathtub u* = s/(s+f), book example 0.01/0.21 ≈ 0.048 (eq. 7.4)', () => {
  const p = base({ sbarSep: 0.01, fbar: 0.20, Lbar: 100 });
  const out = longrun.compute(p);
  close(out.scalars.uStar, 0.01 / 0.21, 1e-12, 'u*');
  close(out.scalars.Ustar, (0.01 / 0.21) * 100, 1e-9, 'U*');
  close(out.scalars.Estar, 100 - (0.01 / 0.21) * 100, 1e-9, 'E*');
});

test('labor: bathtub dynamics converge to u* from any U0', () => {
  const p = base({ U0: 40 });
  const out = longrun.compute(p);
  close(out.series.u[out.series.u.length - 1], out.scalars.uStar, 1e-6, 'u_T');
});

test('labor: LINKAGE — labor demand is MPL evaluated at Solow K*', () => {
  // Ld(w*) must equal Kstar·[(1-α)A/w*]^(1/α) with Kstar = k*·L (not a
  // free K̄ param). Verify the log-linear closed form using K* and that the
  // demand-curve grid is anchored on K* too.
  const p = base();
  const out = longrun.compute(p);
  const a = p.alpha;
  const Kstar = out.scalars.Kstar;
  const lnw = (Math.log(Kstar) + (1 / a) * Math.log((1 - a) * p.Abar)
    - Math.log(p.LbarS) - p.eta * Math.log(1 - p.tau)) / (1 / a + p.eta);
  close(out.scalars.wStar, Math.exp(lnw), 1e-9, 'w* (demand at K*)');
  const Ld = Kstar * Math.pow(((1 - a) * p.Abar) / out.scalars.wStar, 1 / a);
  close(out.scalars.Lstar, Ld, 1e-6, 'L* = Ld(w*) with K*');
  // First demand-grid point uses K* as the capital stock.
  const L0 = out.series.LGrid[0];
  close(out.series.wDemand[0], (1 - a) * p.Abar * Math.pow(Kstar / L0, a), 1e-9, 'demand grid uses K*');
});

test('labor: higher saving raises K*, shifting labor demand out (w* and L* up)', () => {
  const lo = longrun.compute(base({ sbar: 0.15 }));
  const hi = longrun.compute(base({ sbar: 0.35 }));
  assert.ok(hi.scalars.Kstar > lo.scalars.Kstar, 'K* rises with s̄');
  assert.ok(hi.scalars.wStar > lo.scalars.wStar, 'w* rises as demand shifts out');
  assert.ok(hi.scalars.Lstar > lo.scalars.Lstar, 'L* rises as demand shifts out');
});

test('labor: tax wedge raises firm wage, lowers employment and net wage (Fig 7.4)', () => {
  const o0 = longrun.compute(base({ tau: 0 }));
  const o1 = longrun.compute(base({ tau: 0.25 }));
  assert.ok(o1.scalars.wStar > o0.scalars.wStar, 'firm-paid wage should rise');
  assert.ok(o1.scalars.Lstar < o0.scalars.Lstar, 'employment should fall');
  assert.ok(o1.scalars.wNet < o0.scalars.wNet, 'take-home wage should fall');
});

// ------------------------------------------------------------ Inflation (Ch. 8)
test('inflation: P* = MV/Ȳ with Ȳ = Y* (linkage) and M/P = Ȳ/V', () => {
  const p = base({ Mbar: 200, Vbar: 5 });
  const out = longrun.compute(p);
  const Ybar = out.scalars.Ystar; // Ȳ = Y* from Solow
  close(out.scalars.Pstar, (200 * 5) / Ybar, 1e-12, 'P* = MV/Y*');
  close(out.scalars.realBalances, Ybar / 5, 1e-12, 'M/P = Y*/V');
});

test('inflation: LINKAGE — g_Y = n̄, so π ≈ gM + gV − n̄ (eq. 8.4)', () => {
  const p = base({ gM: 0.07, gV: 0, nbar: 0.03 });
  const out = longrun.compute(p);
  close(out.scalars.pi, 0.07 + 0 - 0.03, 1e-12, 'π uses g_Y = n̄');
  // Raising money growth to 10% raises π one-for-one:
  const out2 = longrun.compute({ ...p, gM: 0.10 });
  close(out2.scalars.pi, 0.10 - 0.03, 1e-12, 'π at gM=10%');
});

test('inflation: LINKAGE — Fisher real rate R = Solow steady-state MPK (R*)', () => {
  const p = base({ sbar: 0.2, dbar: 0.1, alpha: 1 / 3, nbar: 0.02, gM: 0.07, gV: 0 });
  const out = longrun.compute(p);
  close(out.scalars.Rfisher, out.scalars.Rstar, 1e-12, 'Fisher R = R*');
  close(out.scalars.Rfisher, (p.alpha * (p.nbar + p.dbar)) / p.sbar, 1e-12, 'R = α(n+d)/s');
  // Additive Fisher: i ≈ R + π
  close(out.scalars.iNom, out.scalars.Rfisher + out.scalars.pi, 1e-12, 'i ≈ R + π');
});

test('inflation: exact-vs-approx Fisher & quantity theory identities', () => {
  const p = base({ gM: 0.07, gV: 0.0, nbar: 0.02 });
  const out = longrun.compute(p);
  const gY = p.nbar;
  const piApprox = p.gM + p.gV - gY;
  const piExact = ((1 + p.gM) * (1 + p.gV)) / (1 + gY) - 1;
  // displayed π is the book's additive approximation
  close(out.scalars.pi, piApprox, 1e-12, 'π is additive approx');
  // the exact identity differs from the approx (both computed inside compute)
  assert.ok(Math.abs(piExact - piApprox) > 1e-6, 'exact π should differ from approx');
  // the seeded period-0 realized inflation uses the EXACT identity
  close(out.series.piPath[0], piExact, 1e-12, 'seeded π_0 uses exact identity');
  // Fisher exact vs approx
  const iApprox = out.scalars.Rfisher + piApprox;
  const iExact = (1 + out.scalars.Rfisher) * (1 + piApprox) - 1;
  close(out.scalars.iNom, iApprox, 1e-12, 'i displayed is additive approx');
  assert.ok(iExact > iApprox, 'exact i exceeds additive approx for positive rates');
});

test('inflation: Fisher & inflation tax = gM/V (book example)', () => {
  const p = base({ gM: 0.07, gV: 0, nbar: 0.04, Vbar: 5 });
  const out = longrun.compute(p);
  close(out.scalars.pi, 0.03, 1e-12, 'π = 7% − 4%');
  close(out.scalars.inflTax, 0.07 / 5, 1e-12, 'seignorage share');
});

test('inflation: price path grows at (1+gM)(1+gV)/(1+gY) − 1 every period', () => {
  const p = base();
  const out = longrun.compute(p);
  const g = ((1 + p.gM) * (1 + p.gV)) / (1 + p.nbar) - 1;
  for (let i = 1; i < out.series.P.length; i++) {
    close(out.series.P[i] / out.series.P[i - 1] - 1, g, 1e-9, `π at t=${i}`);
  }
  close(out.series.piPath[0], g, 1e-12, 'seeded π_0');
});

// ---------------------------------------------------- Module-contract sanity
test('longrun: module contract (strings, scalars, plots, groups) is complete', () => {
  const model = longrun;
  const out = model.compute(defaults(model));
  for (const row of model.scalars) {
    assert.ok(Number.isFinite(out.scalars[row.key]), `scalar ${row.key} finite`);
    for (const lang of ['en', 'es']) {
      assert.ok(model.strings[lang][row.labelKey], `${lang}:${row.labelKey}`);
      if (row.groupKey) assert.ok(model.strings[lang][row.groupKey], `${lang}:${row.groupKey}`);
    }
  }
  for (const par of model.params) {
    assert.ok(par.def1 >= par.min && par.def1 <= par.max, `${par.key} def1 in range`);
    assert.ok(par.def2 >= par.min && par.def2 <= par.max, `${par.key} def2 in range`);
    for (const lang of ['en', 'es']) {
      assert.ok(model.strings[lang][par.labelKey], `${lang}:${par.labelKey}`);
      if (par.groupKey) assert.ok(model.strings[lang][par.groupKey], `${lang}:${par.groupKey}`);
    }
  }
  for (const lang of ['en', 'es']) {
    assert.ok(model.strings[lang][model.titleKey], `${lang}:${model.titleKey}`);
    if (model.noteKey) assert.ok(model.strings[lang][model.noteKey], `${lang}:${model.noteKey}`);
  }
  // equation heading markers must resolve in both dictionaries
  for (const eq of model.equations) {
    if (eq && typeof eq === 'object' && eq.headingKey) {
      for (const lang of ['en', 'es']) {
        assert.ok(model.strings[lang][eq.headingKey], `${lang}:${eq.headingKey}`);
      }
    }
  }
  const t = (k) => {
    // table.* are framework common keys (i18n.js), resolved at runtime; the
    // model dict only owns trace./axis./plot. keys.
    if (!k.startsWith('trace.') && !k.startsWith('axis.') && !k.startsWith('plot.')) return k;
    assert.ok(model.strings.en[k], `en trace/axis key ${k}`);
    assert.ok(model.strings.es[k], `es trace/axis key ${k}`);
    return model.strings.en[k];
  };
  for (const plot of model.plots) {
    for (const lang of ['en', 'es']) {
      assert.ok(model.strings[lang][plot.titleKey], `${lang}:${plot.titleKey}`);
      assert.ok(model.strings[lang][plot.xLabelKey], `${lang}:${plot.xLabelKey}`);
      assert.ok(model.strings[lang][plot.yLabelKey], `${lang}:${plot.yLabelKey}`);
      if (plot.groupKey) assert.ok(model.strings[lang][plot.groupKey], `${lang}:${plot.groupKey}`);
    }
    const built = plot.build(out, out, defaults(model), defaults(model), t);
    assert.ok(built.traces.length > 0, `plot ${plot.id} builds traces`);
    for (const tr of built.traces) {
      assert.ok(Array.isArray(tr.x) && Array.isArray(tr.y), `plot ${plot.id}: x/y arrays`);
      assert.equal(tr.x.length, tr.y.length, `plot ${plot.id}: x/y equal length`);
      assert.ok(tr.scenario === 1 || tr.scenario === 2, `plot ${plot.id}: scenario tag`);
    }
  }
});

test('longrun: Fisher-bars plot is a grouped bar chart (type:bar, non-time)', () => {
  const model = longrun;
  const out = model.compute(defaults(model));
  const plot = model.plots.find((pl) => pl.id === 'fisher-bars');
  assert.ok(plot, 'fisher-bars plot exists');
  const built = plot.build(out, out, defaults(model), defaults(model), (k) => model.strings.en[k] || k);
  assert.equal(built.layout.barmode, 'group', 'barmode group');
  for (const tr of built.traces) {
    assert.equal(tr.type, 'bar', 'trace type is bar');
    assert.equal(tr.x.length, 3, 'three categories R, π, i');
  }
  // Middle bar (π) and last bar (i) must match the scalars, in percent.
  const s1 = built.traces[0].y;
  close(s1[0], 100 * out.scalars.Rfisher, 1e-9, 'bar R');
  close(s1[1], 100 * out.scalars.pi, 1e-9, 'bar π');
  close(s1[2], 100 * out.scalars.iNom, 1e-9, 'bar i');
});

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll long-run model checks passed.');
