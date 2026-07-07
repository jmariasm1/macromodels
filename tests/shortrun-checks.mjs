// shortrun-checks.mjs [VERIFY]
// Node assertions on the pure compute() functions of the short-run models,
// checked against the verified numeric examples in SPEC_SHORTRUN.md §10.
// Run:  node tests/shortrun-checks.mjs
// The model modules are pure ES modules with no DOM/Plotly/i18n dependency,
// so they import and run unchanged in Node.

import assert from 'node:assert/strict';
import okun from '../assets/js/models/okun.js';
import iscurve from '../assets/js/models/iscurve.js';
import mppc from '../assets/js/models/mppc.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// Build a full parameter object from a model's def1 defaults, overriding some.
function defaults(model, overrides = {}) {
  const p = Object.fromEntries(model.params.map((x) => [x.key, x.def1]));
  return Object.assign(p, overrides);
}

console.log('okun.js (Ch. 9)');

// Okun's law: Ytilde = −6 ⇒ u − ū = +3  (SPEC §1.4, §10.3)
check('Okun: Ytilde0=-6, okun=1/2 ⇒ u−ū=+3', () => {
  const out = okun.compute(defaults(okun, { Ytilde0: -6, okun: 0.5, ubar: 5 }));
  assert.ok(near(out.scalars.ugap_impact, 3), `ugap=${out.scalars.ugap_impact}`);
  assert.ok(near(out.scalars.u_impact, 8), `u=${out.scalars.u_impact}`);
});

// Phillips slope 1/3: Ytilde = 3 ⇒ Δπ = 1  (Fig. 9.7, SPEC §10.3)
check('Phillips: Ytilde0=3, vbar=1/3 ⇒ Δπ0=1', () => {
  const out = okun.compute(defaults(okun, { Ytilde0: 3, vbar: 1 / 3, obar: 0 }));
  assert.ok(near(out.scalars.dpi_impact, 1), `dpi=${out.scalars.dpi_impact}`);
});

// Ch. 9 oil-menu: Ytilde = −6, vbar = 1/2 ⇒ Δπ = −3 (6%→3%)  (SPEC §1.3, §10.3)
check('Ch9 menu: Ytilde0=-6, vbar=1/2 ⇒ Δπ0=-3', () => {
  const out = okun.compute(defaults(okun, { Ytilde0: -6, vbar: 0.5, obar: 0, pi0: 6, rho: 0 }));
  assert.ok(near(out.scalars.dpi_impact, -3), `dpi=${out.scalars.dpi_impact}`);
  // with rho=0 the gap closes after t=0, so π stays at 3 thereafter.
  assert.ok(near(out.series.pi[0], 3), `pi0=${out.series.pi[0]}`);
  assert.ok(near(out.series.pi[1], 3), `pi1=${out.series.pi[1]}`);
});

// AR(1) recursion: Ytilde_t = rho·Ytilde_{t−1}
check('AR(1): rho=0.6 path from Ytilde0=-6', () => {
  const out = okun.compute(defaults(okun, { Ytilde0: -6, rho: 0.6 }));
  assert.ok(near(out.series.Ytilde[0], -6));
  assert.ok(near(out.series.Ytilde[1], -3.6, 1e-9));
  assert.ok(near(out.series.Ytilde[2], -2.16, 1e-9));
});

// Inflation telescopes: π_T = π_0 + Σ (vbar·Ytilde_t + obar), obar=0
check('Inflation closed form matches recursion', () => {
  const p = defaults(okun, { Ytilde0: -6, rho: 0.6, vbar: 0.5, obar: 0, pi0: 6, T: 15 });
  const out = okun.compute(p);
  let piCheck = p.pi0;
  for (let i = 0; i <= Math.round(p.T); i++) {
    const yt = i === 0 ? p.Ytilde0 : p.Ytilde0 * Math.pow(p.rho, i);
    piCheck += p.vbar * yt + p.obar;
  }
  assert.ok(near(out.scalars.pi_final, piCheck, 1e-9), `piT=${out.scalars.pi_final} vs ${piCheck}`);
});

console.log('iscurve.js (Ch. 11)');

// Book §11.4: abar=0, bbar=2, R−rbar=1 ⇒ Ytilde=−2  (SPEC §2.2, §10.3)
check('IS: abar=0, bbar=2, R−rbar=1 ⇒ Ytilde=-2', () => {
  // Force abar=0 via shares summing to 1; set R=6, rbar=5 (gap=1).
  const p = defaults(iscurve, {
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15,
    bbar: 2, rbar: 5, R: 6, xbar: 0,
  });
  const out = iscurve.compute(p);
  assert.ok(near(out.scalars.abar, 0), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Ytilde, -2), `Ytilde=${out.scalars.Ytilde}`);
});

// Multiplier: xbar=1/3 ⇒ m=1.5  (SPEC §2.3, §10.2)
check('Multiplier: xbar=1/3 ⇒ m=1.5', () => {
  const out = iscurve.compute(defaults(iscurve, { xbar: 1 / 3 }));
  assert.ok(near(out.scalars.m, 1.5, 1e-9), `m=${out.scalars.m}`);
});

// abar=+2 with multiplier 1.5 ⇒ Ytilde=+3 (R=rbar, no rate gap)  (SPEC §2.3)
check('Multiplier: abar=+2, m=1.5, R=rbar ⇒ Ytilde=+3', () => {
  // shares sum to 3 ⇒ abar = 3 − 1 = 2; R=rbar so rate gap = 0.
  const p = defaults(iscurve, {
    abar_c: 0.66, abar_i: 0.17, abar_g: 0.20, abar_ex: 0.12, abar_im: 0.15,
    bbar: 0.5, rbar: 2, R: 2, xbar: 1 / 3,
  });
  // recompute shares to hit abar exactly +2: current sum = 1.00 ⇒ abar=0. Bump abar_g by 2.
  p.abar_g = 0.20 + 2; // shares sum to 3.0 ⇒ abar = 2
  const out = iscurve.compute(p);
  assert.ok(near(out.scalars.abar, 2, 1e-9), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Ytilde, 3, 1e-9), `Ytilde=${out.scalars.Ytilde}`);
});

// Book §2.3 second example: bbar=1/2, ΔR=2, xbar=1/3 ⇒ −1.5%  (SPEC §10.3)
check('IS: bbar=1/2, R−rbar=2, xbar=1/3 ⇒ Ytilde=-1.5', () => {
  const p = defaults(iscurve, {
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15, // abar=0
    bbar: 0.5, rbar: 2, R: 4, xbar: 1 / 3,
  });
  const out = iscurve.compute(p);
  assert.ok(near(out.scalars.abar, 0, 1e-12), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Ytilde, -1.5, 1e-9), `Ytilde=${out.scalars.Ytilde}`);
});

// Default set2 (R=3, rbar=2, bbar=0.5, abar=0) ⇒ Ytilde = −0.5
check('IS defaults set2: R=3 ⇒ Ytilde=-0.5', () => {
  const p = Object.fromEntries(iscurve.params.map((x) => [x.key, x.def2]));
  const out = iscurve.compute(p);
  assert.ok(near(out.scalars.abar, 0, 1e-12), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Ytilde, -0.5, 1e-9), `Ytilde=${out.scalars.Ytilde}`);
});

console.log('mppc.js (Ch. 12)');

// Monetary tightening: defaults abar=0, bbar=0.5, rbar=2, R'=6 ⇒ Ytilde=-2 while tight.
// (SPEC §8.4 Volcker: R' chosen so Ytilde=-2; here R'−rbar=4, bbar=0.5 ⇒ −2.)
check('Tightening: R\'=6, rbar=2, bbar=0.5 ⇒ Ytilde_tight=-2', () => {
  const out = mppc.compute(defaults(mppc));
  assert.ok(near(out.scalars.Yeq_policy, -2, 1e-9), `Yeq_policy=${out.scalars.Yeq_policy}`);
  assert.ok(near(out.scalars.Yeq_bench, 0, 1e-12), `Yeq_bench=${out.scalars.Yeq_bench}`);
});

// Volcker arithmetic: vbar=1/2, Ytilde=-2 ⇒ Δπ=-1 per tight year  (SPEC §10.5)
check('Volcker: vbar=1/2, Ytilde=-2 ⇒ Δπ=-1/yr', () => {
  const out = mppc.compute(defaults(mppc, { vbar: 0.5 }));
  assert.ok(near(out.scalars.dpi_perPeriod, -1, 1e-9), `Δπ=${out.scalars.dpi_perPeriod}`);
});

// Volcker glide: pi0=10, target ~5, vbar=1/2, tight t0=1..t1=6 (5 tight yrs at −1/yr)
// ⇒ inflation falls exactly 5 points to 5%, then stays.  (SPEC §10.5: vbar=1/2 ⇒ 5 yrs.)
check('Volcker glide: 5 tight years at -1/yr ⇒ pi 10→5 then flat', () => {
  const out = mppc.compute(defaults(mppc, {
    vbar: 0.5, pi0: 10, Rprime: 6, rbar: 2, bbar: 0.5, t0: 1, t1: 6, T: 12, abar: 0,
  }));
  // Tight periods are t=1..5 (t1 exclusive) ⇒ 5 years of Δπ=-1.
  assert.ok(near(out.series.pi[0], 10, 1e-9), `pi0=${out.series.pi[0]}`); // t=0 R=rbar, Ytilde=0
  assert.ok(near(out.series.pi[5], 5, 1e-9), `pi5=${out.series.pi[5]}`);
  assert.ok(near(out.series.pi[12], 5, 1e-9), `piT=${out.series.pi[12]}`);
  // Output snaps back to 0 after t1, unemployment back to ubar.
  assert.ok(near(out.series.Ytilde[6], 0, 1e-12), `Y6=${out.series.Ytilde[6]}`);
  assert.ok(near(out.series.u[6], 5, 1e-12), `u6=${out.series.u[6]}`);
});

// Volcker with steeper Phillips vbar=1/3 ⇒ Δπ=-2/3 per year (slower)  (SPEC §10.5)
check('Volcker: vbar=1/3, Ytilde=-2 ⇒ Δπ=-2/3/yr', () => {
  const out = mppc.compute(defaults(mppc, { vbar: 1 / 3 }));
  assert.ok(near(out.scalars.dpi_perPeriod, -2 / 3, 1e-9), `Δπ=${out.scalars.dpi_perPeriod}`);
});

// One-period oil shock, no policy response: Ytilde stays 0, pi jumps by obar and STAYS.
// (SPEC §8.5a: adaptive expectations lock it in.)
check('Oil shock: obar=+2 one period, R=rbar ⇒ pi permanently +2', () => {
  const out = mppc.compute(defaults(mppc, {
    abar: 0, Rprime: 2, rbar: 2, t0: 1, t1: 2, // R never leaves rbar
    obar: 2, oStart: 3, oPersist: 0, pi0: 2, vbar: 0.5, T: 10,
  }));
  // Ytilde=0 throughout (R=rbar always, abar=0).
  assert.ok(out.series.Ytilde.every((y) => near(y, 0, 1e-12)), 'Ytilde not all 0');
  assert.ok(near(out.series.pi[2], 2, 1e-9), `pi before shock=${out.series.pi[2]}`);
  assert.ok(near(out.series.pi[3], 4, 1e-9), `pi at shock=${out.series.pi[3]}`); // jumps +2
  assert.ok(near(out.series.pi[10], 4, 1e-9), `pi after=${out.series.pi[10]}`);  // stays
});

// Persistent negative demand shock: abar=-2, R=rbar, m=1 ⇒ Ytilde=-2 every period,
// inflation drifts down linearly.  (SPEC §8.2)
check('Persistent demand shock: abar=-2 ⇒ Ytilde=-2/period, linear disinflation', () => {
  const out = mppc.compute(defaults(mppc, {
    abar: -2, Rprime: 2, rbar: 2, t0: 1, t1: 2, // R stays at rbar
    bbar: 0.5, xbar: 0, vbar: 0.5, pi0: 6, T: 5, obar: 0,
  }));
  assert.ok(out.series.Ytilde.every((y) => near(y, -2, 1e-12)), 'Ytilde not all -2');
  // Δπ = 0.5·(-2) = -1 per period ⇒ pi: 5,4,3,2,1,0
  assert.ok(near(out.series.pi[0], 5, 1e-9), `pi0=${out.series.pi[0]}`);
  assert.ok(near(out.series.pi[5], 0, 1e-9), `pi5=${out.series.pi[5]}`);
});

console.log(`\nAll ${passed} short-run checks passed.`);
