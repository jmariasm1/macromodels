// longrun-checks.mjs [LONGRUN]
// CI-style verification of the long-run model modules' compute() functions
// against the closed forms and book examples in SPEC_LONGRUN.md.
// Run: node tests/longrun-checks.mjs   (exits non-zero on failure)

import assert from 'node:assert/strict';
import solow from '../assets/js/models/solow.js';
import labor from '../assets/js/models/labor.js';
import inflation from '../assets/js/models/inflation.js';

const close = (a, b, tol = 1e-9, msg = '') =>
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)),
    `${msg}: got ${a}, expected ${b}`);

const defaults = (model) =>
  Object.fromEntries(model.params.map((p) => [p.key, p.def1]));

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
  const p = { sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 100, nbar: 0 };
  const out = solow.compute(p);
  const kStar = Math.pow((p.sbar * p.Abar) / p.dbar, 1.5);
  close(out.scalars.kStar, kStar, 1e-9, 'k*');
  close(out.scalars.Kstar, kStar * p.Lbar, 1e-9, 'K*');
});

test('solow: y* = (s/d)^{1/2}·A^{3/2} and c* = (1−s)y* (eq. 5.9)', () => {
  const p = { sbar: 0.25, dbar: 0.08, Abar: 1.2, alpha: 1 / 3, Lbar: 50, K0: 10, nbar: 0 };
  const out = solow.compute(p);
  const yStar = Math.sqrt(p.sbar / p.dbar) * Math.pow(p.Abar, 1.5);
  close(out.scalars.yStar, yStar, 1e-9, 'y*');
  close(out.scalars.cStar, (1 - p.sbar) * yStar, 1e-9, 'c*');
});

test('solow: K*/Y* = s/d (eq. 5.11) and R* = MPK = α·d/s', () => {
  const p = { sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 100, nbar: 0 };
  const out = solow.compute(p);
  close(out.scalars.kyRatio, p.sbar / p.dbar, 1e-9, 'K*/Y*');
  close(out.scalars.Rstar, p.dbar / (3 * p.sbar), 1e-9, 'R* = d/(3s)');
  // R* independent of Abar:
  const out2 = solow.compute({ ...p, Abar: 2.5 });
  close(out2.scalars.Rstar, out.scalars.Rstar, 1e-9, 'R* independent of A');
});

test('solow: population growth — k* = (sA/(n+d))^{3/2} (eq. 5.16)', () => {
  const p = { sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 100, nbar: 0.01 };
  const out = solow.compute(p);
  close(out.scalars.kStar, Math.pow((p.sbar * p.Abar) / (p.nbar + p.dbar), 1.5), 1e-9, 'k* with n');
  // Higher n lowers y*:
  const out0 = solow.compute({ ...p, nbar: 0 });
  assert.ok(out.scalars.yStar < out0.scalars.yStar, 'higher n should lower y*');
});

test('solow: transition dynamics converge to k* from above and below', () => {
  const p = { sbar: 0.2, dbar: 0.1, Abar: 1, alpha: 1 / 3, Lbar: 100, K0: 50, nbar: 0 };
  const lo = solow.compute(p);
  const hi = solow.compute({ ...p, K0: 1000 });
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

// ---------------------------------------------------------------- Labor (Ch. 7)
test('labor: bathtub u* = s/(s+f), book example 0.01/0.21 ≈ 0.048 (eq. 7.4)', () => {
  const p = { ...defaults(labor), sbarSep: 0.01, fbar: 0.20, LbarF: 100 };
  const out = labor.compute(p);
  close(out.scalars.uStar, 0.01 / 0.21, 1e-12, 'u*');
  close(out.scalars.Ustar, (0.01 / 0.21) * 100, 1e-9, 'U*');
  close(out.scalars.Estar, 100 - (0.01 / 0.21) * 100, 1e-9, 'E*');
});

test('labor: bathtub dynamics converge to u* from any U0', () => {
  const p = { ...defaults(labor), U0: 40 };
  const out = labor.compute(p);
  close(out.series.u[out.series.u.length - 1], out.scalars.uStar, 1e-6, 'u_T');
});

test('labor: bisection equilibrium matches the log-linear closed form', () => {
  const p = { ...defaults(labor) };
  const out = labor.compute(p);
  const a = p.alpha;
  const lnw = (Math.log(p.Kbar) + (1 / a) * Math.log((1 - a) * p.Abar)
    - Math.log(p.LbarS) - p.eta * Math.log(1 - p.tau)) / (1 / a + p.eta);
  close(out.scalars.wStar, Math.exp(lnw), 1e-9, 'w*');
  // Market clearing: Ld(w*) = Ls(w*) = L*
  const Ld = p.Kbar * Math.pow(((1 - a) * p.Abar) / out.scalars.wStar, 1 / a);
  close(out.scalars.Lstar, Ld, 1e-6, 'L* = Ld(w*)');
});

test('labor: tax wedge raises firm wage, lowers employment and net wage (Fig 7.4)', () => {
  const p0 = { ...defaults(labor), tau: 0 };
  const p1 = { ...defaults(labor), tau: 0.25 };
  const o0 = labor.compute(p0);
  const o1 = labor.compute(p1);
  assert.ok(o1.scalars.wStar > o0.scalars.wStar, 'firm-paid wage should rise');
  assert.ok(o1.scalars.Lstar < o0.scalars.Lstar, 'employment should fall');
  assert.ok(o1.scalars.wNet < o0.scalars.wNet, 'take-home wage should fall');
});

// ------------------------------------------------------------ Inflation (Ch. 8)
test('inflation: P* = MV/Y (eq. 8.2), book-style 200·5/1000 = 1', () => {
  const p = { ...defaults(inflation), Mbar: 200, Vbar: 5, Ybar: 1000 };
  const out = inflation.compute(p);
  close(out.scalars.Pstar, 1, 1e-12, 'P*');
  close(out.scalars.realBalances, 200, 1e-12, 'M/P = Y/V');
});

test('inflation: pi = gM + gV − gY (eq. 8.4); 7% − 4% = 3%, 10% − 4% = 6%', () => {
  const p = { ...defaults(inflation), gM: 0.07, gV: 0, gY: 0.04 };
  close(inflation.compute(p).scalars.pi, 0.03, 1e-12, 'pi at gM=7%');
  close(inflation.compute({ ...p, gM: 0.10 }).scalars.pi, 0.06, 1e-12, 'pi at gM=10%');
});

test('inflation: Fisher i = R + pi (eq. 8.5) and inflation tax = gM/V', () => {
  const p = { ...defaults(inflation), gM: 0.07, gV: 0, gY: 0.04, R: 0.02, Vbar: 5 };
  const out = inflation.compute(p);
  close(out.scalars.iNom, 0.05, 1e-12, 'i = R + pi');
  close(out.scalars.inflTax, 0.07 / 5, 1e-12, 'seignorage share');
});

test('inflation: price path grows at (1+gM)(1+gV)/(1+gY) − 1 every period', () => {
  const p = { ...defaults(inflation) };
  const out = inflation.compute(p);
  const g = ((1 + p.gM) * (1 + p.gV)) / (1 + p.gY) - 1;
  for (let i = 1; i < out.series.P.length; i++) {
    close(out.series.P[i] / out.series.P[i - 1] - 1, g, 1e-9, `pi at t=${i}`);
  }
  close(out.series.piPath[0], g, 1e-12, 'seeded pi_0');
});

// ---------------------------------------------------- Module-contract sanity
for (const model of [solow, labor, inflation]) {
  test(`${model.id}: module contract (strings, scalars, plots) is complete`, () => {
    const out = model.compute(defaults(model));
    for (const row of model.scalars) {
      assert.ok(Number.isFinite(out.scalars[row.key]), `scalar ${row.key} finite`);
      for (const lang of ['en', 'es']) {
        assert.ok(model.strings[lang][row.labelKey], `${lang}:${row.labelKey}`);
      }
    }
    for (const par of model.params) {
      assert.ok(par.def1 >= par.min && par.def1 <= par.max, `${par.key} def1 in range`);
      assert.ok(par.def2 >= par.min && par.def2 <= par.max, `${par.key} def2 in range`);
      for (const lang of ['en', 'es']) {
        assert.ok(model.strings[lang][par.labelKey], `${lang}:${par.labelKey}`);
      }
    }
    for (const lang of ['en', 'es']) {
      assert.ok(model.strings[lang][model.titleKey], `${lang}:${model.titleKey}`);
      assert.ok(model.strings[lang][model.noteKey], `${lang}:${model.noteKey}`);
    }
    const t = (k) => {
      // every key requested by a plot builder must exist in both dictionaries
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
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll long-run model checks passed.');
