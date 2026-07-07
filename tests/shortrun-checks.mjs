// shortrun-checks.mjs [VERIFY]
// Node assertions on the pure compute() of the INTEGRATED short-run model
// (Jones Ch. 9 + 11 + 12 merged into assets/js/models/shortrun.js), checked
// against the verified numeric examples in SPEC_SHORTRUN.md §10.
// Run:  node tests/shortrun-checks.mjs
// The module is a pure ES module with no DOM/Plotly/i18n dependency, so it imports
// and runs unchanged in Node.
//
// All 16 original assertions are preserved logically. The five that used the old
// stand-alone okun.js AR(1) gap experiment are superseded — they are re-expressed
// as equivalent checks through the integrated simulation (a demand-shock path).

import assert from 'node:assert/strict';
import shortrun from '../assets/js/models/shortrun.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// Build a full parameter object from def1 defaults, overriding some keys.
function defaults(overrides = {}) {
  const p = Object.fromEntries(shortrun.params.map((x) => [x.key, x.def1]));
  return Object.assign(p, overrides);
}

// ── Okun / Phillips block (Ch. 9) ───────────────────────────────────────────
console.log('shortrun.js — Okun & Phillips (Ch. 9)');

// Okun's law: a persistent demand shock that produces Ỹ=−6 ⇒ u−ū=+3.
// (SPEC §1.4, §10.3.) Δā=−3, b̄=0.5, R=r̄, x̄=0 ⇒ Ỹ = −3. Use Δā=−6 ⇒ Ỹ=−6.
check('Okun: Ỹ=-6, okun=1/2 ⇒ u−ū=+3', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15, // ā_base=0
    bbar: 0.5, rbar: 2, Rprime: 2, t0: 1, t1: 2, xbar: 0, // R never leaves r̄
    abarShock: -6, aStart: 1, aPersist: 1, okun: 0.5, ubar: 5,
  }));
  // At t≥1 the persistent shock gives Ỹ = −6.
  assert.ok(near(out.series.Ytilde[1], -6), `Ỹ=${out.series.Ytilde[1]}`);
  assert.ok(near(out.series.u[1], 8), `u=${out.series.u[1]}`); // ū − ½·(−6) = 8
  assert.ok(near(out.series.u[1] - 5, 3), `u−ū=${out.series.u[1] - 5}`);
});

// Phillips slope 1/3: Ỹ = 3 ⇒ Δπ = 1  (Fig. 9.7, SPEC §10.3).
check('Phillips: Ỹ=3, vbar=1/3 ⇒ Δπ=1', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15, // ā_base=0
    bbar: 0.5, rbar: 2, Rprime: 2, t0: 1, t1: 2, xbar: 0,
    abarShock: 3, aStart: 1, aPersist: 1, vbar: 1 / 3, obar: 0,
  }));
  assert.ok(near(out.series.Ytilde[1], 3), `Ỹ=${out.series.Ytilde[1]}`);
  assert.ok(near(out.series.dpi[1], 1), `Δπ=${out.series.dpi[1]}`);
});

// Ch. 9 oil-menu: Ỹ=−6, v̄=1/2 ⇒ Δπ=−3 (6%→3%). One-period demand shock so the
// gap closes after t and π stays.  (SPEC §1.3, §10.3.)
check('Ch9 menu: Ỹ=-6 (1 period), vbar=1/2 ⇒ Δπ=-3, π 6→3 then flat', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15, // ā_base=0
    bbar: 0.5, rbar: 2, Rprime: 2, t0: 1, t1: 2, xbar: 0,
    abarShock: -6, aStart: 1, aPersist: 0, vbar: 0.5, obar: 0, pi0: 6, T: 6,
  }));
  assert.ok(near(out.series.dpi[1], -3), `Δπ=${out.series.dpi[1]}`);
  assert.ok(near(out.series.pi[1], 3), `pi1=${out.series.pi[1]}`);   // 6−3
  assert.ok(near(out.series.pi[2], 3), `pi2=${out.series.pi[2]}`);   // gap closed, stays 3
  assert.ok(near(out.series.Ytilde[2], 0), `Ỹ2=${out.series.Ytilde[2]}`);
});

// (Superseded AR(1) check → integrated demand-shock path.) A persistent Δā=−2 with
// m=1, b̄=0.5 ⇒ Ỹ=−2 every period from the shock onward; Ỹ=0 before.
check('Demand-shock path: persistent Δā=-2 ⇒ Ỹ=-2 from t_a on, 0 before', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15, // ā_base=0
    bbar: 0.5, rbar: 2, Rprime: 2, t0: 1, t1: 2, xbar: 0,
    abarShock: -2, aStart: 3, aPersist: 1, vbar: 0.5, T: 8,
  }));
  assert.ok(near(out.series.Ytilde[2], 0), `Ỹ2=${out.series.Ytilde[2]}`);
  assert.ok(near(out.series.Ytilde[3], -2), `Ỹ3=${out.series.Ytilde[3]}`);
  assert.ok(near(out.series.Ytilde[8], -2), `Ỹ8=${out.series.Ytilde[8]}`);
});

// (Superseded telescoping check → integrated.) π_T = π_0 + Σ (v̄·Ỹ_t + ō_t).
check('Inflation closed form matches the integrated recursion', () => {
  const p = defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15,
    bbar: 0.5, rbar: 2, Rprime: 5, t0: 2, t1: 6, xbar: 0,
    abarShock: 1.5, aStart: 4, aPersist: 1, vbar: 0.4, obar: 2, oStart: 3, oPersist: 0,
    pi0: 6, T: 12,
  });
  const out = shortrun.compute(p);
  let piCheck = p.pi0;
  for (let i = 0; i <= Math.round(p.T); i++) piCheck += out.series.dpi[i];
  assert.ok(near(out.scalars.pi_final, piCheck, 1e-9), `piT=${out.scalars.pi_final} vs ${piCheck}`);
});

// ── Aggregate demand / IS block (Ch. 11) ────────────────────────────────────
console.log('shortrun.js — Aggregate demand (Ch. 11)');

// Book §11.4: ā=0, b̄=2, R−r̄=1 ⇒ Ỹ=−2  (SPEC §2.2, §10.3).
// Drive R−r̄=1 via the policy step (R′=6, r̄=5) and read the tightening equilibrium.
check('IS: ā=0, bbar=2, R−rbar=1 ⇒ Ỹ=-2', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15,
    bbar: 2, rbar: 5, Rprime: 6, xbar: 0,
  }));
  assert.ok(near(out.scalars.abar, 0), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Yeq_policy, -2), `Yeq_policy=${out.scalars.Yeq_policy}`);
});

// Multiplier: x̄=1/3 ⇒ m=1.5  (SPEC §2.3, §10.2).
check('Multiplier: xbar=1/3 ⇒ m=1.5', () => {
  const out = shortrun.compute(defaults({ xbar: 1 / 3 }));
  assert.ok(near(out.scalars.m, 1.5, 1e-9), `m=${out.scalars.m}`);
});

// ā=+2 with m=1.5 and R=r̄ ⇒ Ỹ=+3 (no rate gap)  (SPEC §2.3).
check('Multiplier: ā=+2, m=1.5, R=rbar ⇒ Ỹ=+3', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.66, abar_i: 0.17, abar_g: 0.20 + 2, abar_ex: 0.12, abar_im: 0.15, // shares sum 3 ⇒ ā=2
    bbar: 0.5, rbar: 2, Rprime: 2, xbar: 1 / 3, // R=r̄ ⇒ no rate gap at benchmark
  }));
  assert.ok(near(out.scalars.abar, 2, 1e-9), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Yeq_bench, 3, 1e-9), `Yeq_bench=${out.scalars.Yeq_bench}`);
});

// Book §2.3 second example: b̄=1/2, ΔR=2, x̄=1/3 ⇒ −1.5%  (SPEC §10.3).
check('IS: bbar=1/2, R−rbar=2, xbar=1/3 ⇒ Ỹ=-1.5', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15, // ā=0
    bbar: 0.5, rbar: 2, Rprime: 4, xbar: 1 / 3, // R′−r̄ = 2
  }));
  assert.ok(near(out.scalars.abar, 0, 1e-12), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Yeq_policy, -1.5, 1e-9), `Yeq_policy=${out.scalars.Yeq_policy}`);
});

// Default set2 (R′=6, r̄=2, b̄=0.5, ā=0). Benchmark Ỹ=0; the R−r̄=1 book case is
// covered above, so here confirm the R=r̄ resting state gives Ỹ=0.
check('IS defaults: benchmark R=rbar ⇒ Ỹ=0', () => {
  const p = Object.fromEntries(shortrun.params.map((x) => [x.key, x.def2]));
  const out = shortrun.compute(p);
  assert.ok(near(out.scalars.abar, 0, 1e-12), `abar=${out.scalars.abar}`);
  assert.ok(near(out.scalars.Yeq_bench, 0, 1e-9), `Yeq_bench=${out.scalars.Yeq_bench}`);
});

// Default parameter sets must describe an economy at potential with small,
// stable inflation: R′ = r̄ ⇒ Ỹ_t = 0, π_t = π₀ = 2 constant, u_t = ū.
check('Defaults: economy at potential, stable 2% inflation, u = ubar', () => {
  const p = Object.fromEntries(shortrun.params.map((x) => [x.key, x.def1]));
  const out = shortrun.compute(p);
  const s = out.series;
  assert.ok(s.Ytilde.every((v) => near(v, 0, 1e-9)), `Ytilde=${s.Ytilde.slice(0, 4)}`);
  assert.ok(s.pi.every((v) => near(v, 2, 1e-9)), `pi=${s.pi.slice(0, 4)}`);
  assert.ok(s.u.every((v) => near(v, p.ubar, 1e-9)), `u=${s.u.slice(0, 4)}`);
  assert.ok(s.R.every((v) => near(v, p.rbar, 1e-9)), `R=${s.R.slice(0, 4)}`);
});

// ── Monetary policy block (Ch. 12) ──────────────────────────────────────────
console.log('shortrun.js — Monetary policy (Ch. 12)');

// Monetary tightening: defaults ā=0, b̄=0.5, r̄=2, R′=6 ⇒ Ỹ=-2 while tight.
// (SPEC §8.4 Volcker: R′−r̄=4, b̄=0.5 ⇒ −2.)
check('Tightening: R\'=6, rbar=2, bbar=0.5 ⇒ Yeq_policy=-2', () => {
  const out = shortrun.compute(defaults({ Rprime: 6, pi0: 10 }));
  assert.ok(near(out.scalars.Yeq_policy, -2, 1e-9), `Yeq_policy=${out.scalars.Yeq_policy}`);
  assert.ok(near(out.scalars.Yeq_bench, 0, 1e-12), `Yeq_bench=${out.scalars.Yeq_bench}`);
});

// Volcker arithmetic: v̄=1/2, Ỹ=-2 ⇒ Δπ=-1 per tight year  (SPEC §10.5).
check('Volcker: vbar=1/2, Ỹ=-2 ⇒ Δπ=-1/yr', () => {
  const out = shortrun.compute(defaults({ vbar: 0.5, Rprime: 6, pi0: 10 }));
  assert.ok(near(out.scalars.dpi_perPeriod, -1, 1e-9), `Δπ=${out.scalars.dpi_perPeriod}`);
});

// Volcker glide: π0=10, target ~5, v̄=1/2, tight t0=1..t1=6 (5 tight yrs at −1/yr)
// ⇒ inflation falls exactly 5 points to 5%, then stays.  (SPEC §10.5.)
check('Volcker glide: 5 tight years at -1/yr ⇒ pi 10→5 then flat', () => {
  const out = shortrun.compute(defaults({
    vbar: 0.5, pi0: 10, Rprime: 6, rbar: 2, bbar: 0.5, t0: 1, t1: 6, T: 12, abarShock: 0,
  }));
  assert.ok(near(out.series.pi[0], 10, 1e-9), `pi0=${out.series.pi[0]}`); // t=0 R=r̄, Ỹ=0
  assert.ok(near(out.series.pi[5], 5, 1e-9), `pi5=${out.series.pi[5]}`);
  assert.ok(near(out.series.pi[12], 5, 1e-9), `piT=${out.series.pi[12]}`);
  assert.ok(near(out.series.Ytilde[6], 0, 1e-12), `Y6=${out.series.Ytilde[6]}`);
  assert.ok(near(out.series.u[6], 5, 1e-12), `u6=${out.series.u[6]}`);
});

// Volcker with a flatter Phillips v̄=1/3 ⇒ Δπ=-2/3 per year (slower)  (SPEC §10.5).
check('Volcker: vbar=1/3, Ỹ=-2 ⇒ Δπ=-2/3/yr', () => {
  const out = shortrun.compute(defaults({ vbar: 1 / 3, Rprime: 6, pi0: 10 }));
  assert.ok(near(out.scalars.dpi_perPeriod, -2 / 3, 1e-9), `Δπ=${out.scalars.dpi_perPeriod}`);
});

// One-period oil shock, no policy response: Ỹ stays 0, π jumps by ō and STAYS.
// (SPEC §8.5a: adaptive expectations lock it in.)
check('Oil shock: obar=+2 one period, R=rbar ⇒ pi permanently +2', () => {
  const out = shortrun.compute(defaults({
    abarShock: 0, Rprime: 2, rbar: 2, t0: 1, t1: 2, // R never leaves r̄
    obar: 2, oStart: 3, oPersist: 0, pi0: 2, vbar: 0.5, T: 10,
  }));
  assert.ok(out.series.Ytilde.every((y) => near(y, 0, 1e-12)), 'Ỹ not all 0');
  assert.ok(near(out.series.pi[2], 2, 1e-9), `pi before=${out.series.pi[2]}`);
  assert.ok(near(out.series.pi[3], 4, 1e-9), `pi at shock=${out.series.pi[3]}`); // jumps +2
  assert.ok(near(out.series.pi[10], 4, 1e-9), `pi after=${out.series.pi[10]}`);  // stays
});

// Persistent negative demand shock: Δā=-2, R=r̄, m=1 ⇒ Ỹ=-2 every period from the
// shock, inflation drifts down linearly.  (SPEC §8.2.)
check('Persistent demand shock: Δā=-2 ⇒ Ỹ=-2/period, linear disinflation', () => {
  const out = shortrun.compute(defaults({
    abar_c: 0.6, abar_i: 0.2, abar_g: 0.2, abar_ex: 0.15, abar_im: 0.15, // ā_base=0
    abarShock: -2, aStart: 0, aPersist: 1, Rprime: 2, rbar: 2, t0: 1, t1: 2, // R at r̄
    bbar: 0.5, xbar: 0, vbar: 0.5, pi0: 6, T: 5, obar: 0,
  }));
  assert.ok(out.series.Ytilde.every((y) => near(y, -2, 1e-12)), 'Ỹ not all -2');
  // Δπ = 0.5·(-2) = -1 per period ⇒ pi: 5,4,3,2,1,0
  assert.ok(near(out.series.pi[0], 5, 1e-9), `pi0=${out.series.pi[0]}`);
  assert.ok(near(out.series.pi[5], 0, 1e-9), `pi5=${out.series.pi[5]}`);
});

console.log(`\nAll ${passed} short-run checks passed.`);
