// Node checks for the pure compute() functions.
//   node tests/models.test.mjs
// The last block is the important one: it re-derives every answer of the printed
// midterm from the site's own long-run model, so the exam and the tool can never
// drift apart.

import longrun from '../assets/js/models/longrun.js';
import shortrun from '../assets/js/models/shortrun.js';

let passed = 0;
let failed = 0;

function ok(name, cond, extra = '') {
  if (cond) { passed += 1; } else { failed += 1; console.error(`  FAIL  ${name} ${extra}`); }
}

function close(name, a, b, tol = 1e-8) {
  const good = Number.isFinite(a) && Number.isFinite(b)
    && Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
  ok(name, good, good ? '' : `got ${a}, expected ${b}`);
}

function defaults(model, which) {
  const p = {};
  model.params.forEach((q) => { p[q.key] = which === 1 ? q.def1 : q.def2; });
  return p;
}

/* =========================================================== long run ==== */
console.log('long-run model');
{
  const p = defaults(longrun, 1);
  const o = longrun.compute(p);
  const { alpha, s, delta, eta, Abar, L0 } = p;

  close('k* solves the steady-state condition',
    s * Abar * o.scalars.kStar ** alpha, (delta + eta) * o.scalars.kStar);
  close('k* closed form', o.scalars.kStar, ((s * Abar) / (delta + eta)) ** (1 / (1 - alpha)));
  close('y* = A k*^alpha', o.scalars.yStar, Abar * o.scalars.kStar ** alpha);
  close('c* = (1-s) y*', o.scalars.cStar, (1 - s) * o.scalars.yStar);
  close('K*/Y* = s/(delta+eta)', o.scalars.kyRatio, s / (delta + eta));
  close('R* = alpha (delta+eta)/s', o.scalars.Rstar, (alpha * (delta + eta)) / s);
  close('K* = k* L0', o.scalars.Kstar, o.scalars.kStar * L0);

  // transition converges upward from k0 < k*
  const k = o.series.k;
  ok('k0 taken from K0/L0', Math.abs(o.scalars.k0 - p.K0 / p.L0) < 1e-12);
  ok('capital rises toward k*', k[1] > k[0] && k.at(-1) < o.scalars.kStar + 1e-6);
  close('k converges to k*', k.at(-1), o.scalars.kStar, 1e-3);
  ok('growth of k falls to zero', Math.abs(o.series.gk.at(-1)) < 1e-4);
  ok('growth of y falls to zero', Math.abs(o.series.gy.at(-1)) < 1e-4);

  // aggregates carry population growth
  close('L_t = L0 (1+eta)^t', o.series.Ltot[10], L0 * (1 + eta) ** 10);
  close('K_t = k_t L_t', o.series.Ktot[10], o.series.k[10] * o.series.Ltot[10]);

  // Solow diagram: the schedules cross exactly at k*
  const iAt = s * Abar * o.scalars.kStar ** alpha;
  const dAt = (delta + eta) * o.scalars.kStar;
  close('investment = break-even at k*', iAt, dAt);

  // labor market
  const Ld = o.scalars.Kstar * (((1 - alpha) * Abar) / o.scalars.wStar) ** (1 / alpha);
  const Ls = p.lsA + p.lsB * o.scalars.wStar;
  close('labor market clears at w*', Ld, Ls, 1e-6);
  ok('default minimum wage is not binding', o.scalars.Ustruct < 1e-6);
  ok('labour supply is never drawn at a negative wage',
    o.series.LsCurve.every((v, i) => v === null || v >= 0) && o.series.wGrid.every((w) => w > 0));
  ok('labour demand stays finite over the plotted wage grid',
    o.series.LdCurve.every(Number.isFinite));
  ok('the two schedules bracket the equilibrium',
    Math.min(...o.series.LdCurve) < o.scalars.Ldemand
    && Math.max(...o.series.LdCurve) > o.scalars.Ldemand);
  close('wage paid = w* when w_min does not bind', o.scalars.wActual, o.scalars.wStar, 1e-9);

  // a binding minimum wage creates structural unemployment
  const pb = { ...p, wmin: o.scalars.wStar * 1.25 };
  const ob = longrun.compute(pb);
  ok('binding minimum wage raises the wage paid', ob.scalars.wActual > o.scalars.wActual);
  ok('binding minimum wage creates structural unemployment', ob.scalars.Ustruct > 0);
  close('U_struct = L^s - L^d at the minimum wage',
    ob.scalars.Ustruct, ob.scalars.Lsupply - ob.scalars.Ldemand, 1e-9);
  close('U_0 = frictional + structural', ob.scalars.U0,
    Math.min(pb.U0f + ob.scalars.Ustruct, pb.L0), 1e-9);
  ok('employment falls when the minimum wage binds', ob.scalars.Ldemand < o.scalars.Ldemand);

  // bathtub
  close('u* = sbar/(sbar+fbar)', o.scalars.uBath, p.sbar / (p.sbar + p.fbar));
  close('U* + E* = L0', o.scalars.Ubath + o.scalars.Ebath, p.L0);
  close('bathtub starts at U_0', o.series.U[0], o.scalars.U0);
  close('bathtub converges to u*', o.series.u.at(-1), o.scalars.uBath, 1e-6);
  ok('employment and unemployment always add to L0',
    o.series.E.every((e, i) => Math.abs(e + o.series.U[i] - p.L0) < 1e-9));

  // money
  close('P* = M V / Y*', o.scalars.Pstar, (p.Mbar * p.Vbar) / o.scalars.Ystar);
  close('pi = gM + gV - eta', o.scalars.pi, p.gM + p.gV - p.eta);
  close('i = R + pi', o.scalars.iNom, o.scalars.Rstar + o.scalars.pi);
  close('M/P = Y/V', o.scalars.realBalances, o.scalars.Ystar / p.Vbar);
  close('price path follows M V / Y', o.series.P[5],
    (p.Mbar * (1 + p.gM) ** 5 * p.Vbar * (1 + p.gV) ** 5) / (o.scalars.Ystar * (1 + p.eta) ** 5));

  // every plot must build without throwing and produce finite data
  const o2 = longrun.compute(defaults(longrun, 2));
  longrun.plots.forEach((pl) => {
    const spec = pl.build(o, o2, p, defaults(longrun, 2), (k2) => k2);
    ok(`plot ${pl.id} builds`, Array.isArray(spec.traces) && spec.traces.length > 0);
    const bad = spec.traces.some((tr) => (tr.y || []).some((v) => v != null && Number.isNaN(v)));
    ok(`plot ${pl.id} has no NaN`, !bad);
  });
}

/* ========================================================== short run ==== */
console.log('short-run model');
{
  const p = defaults(shortrun, 1);

  const ismp = shortrun.compute(p, 'ismp');
  close('IS-MP: R = R-bar', ismp.scalars.R, p.RBar);
  close('IS-MP: output gap from the IS curve', ismp.scalars.y,
    p.aC + p.aI + p.aG + p.aX - p.aM - 1 - p.aC * p.tau - p.bI * (p.RBar - p.rBar));
  close('Fisher', ismp.scalars.i, ismp.scalars.R + p.pi);
  close('money market clears under IS-MP', ismp.scalars.moneySupply, ismp.scalars.moneyDemand);
  close('money demand', ismp.scalars.moneyDemand,
    p.MDmax - p.mi * ismp.scalars.i + p.mY * ismp.scalars.y);
  close('Phillips curve', ismp.scalars.deltaPi, p.vBar * ismp.scalars.y + p.oBar);
  close('expected inflation', ismp.scalars.piExpected, p.pi + ismp.scalars.deltaPi);
  close("Okun's law", ismp.scalars.mu - p.muBar, -p.wBar * ismp.scalars.y);
  close('savings', ismp.scalars.savings,
    (1 - (1 + p.tau) * p.aC - p.aG - p.aX + p.aM) * p.yBar);
  close('investment', ismp.scalars.investment,
    (p.aI - p.bI * (ismp.scalars.R - p.rBar)) * p.yBar);

  const islm = shortrun.compute(p, 'islm');
  close('IS-LM: money supply is exogenous', islm.scalars.moneySupply, p.MBar);
  close('IS-LM: money market clears', islm.scalars.moneyDemand, p.MBar, 1e-9);
  close('IS-LM: the equilibrium is on the IS curve', islm.scalars.y,
    p.aC + p.aI + p.aG + p.aX - p.aM - 1 - p.aC * p.tau - p.bI * (islm.scalars.R - p.rBar));

  // an expansionary money supply must lower R and raise output under IS-LM
  const loose = shortrun.compute({ ...p, MBar: p.MBar + 1 }, 'islm');
  ok('IS-LM: more money lowers the real rate', loose.scalars.R < islm.scalars.R);
  ok('IS-LM: more money raises output', loose.scalars.y > islm.scalars.y);

  const p2 = defaults(shortrun, 2);
  ['ismp', 'islm'].forEach((variant) => {
    const a = shortrun.compute(p, variant);
    const b = shortrun.compute(p2, variant);
    shortrun.plots.forEach((pl) => {
      const spec = pl.build(a, b, p, p2, (k) => k);
      ok(`plot ${pl.id} (${variant}) builds`, Array.isArray(spec.traces) && spec.traces.length > 0);
      const bad = spec.traces.some((tr) => (tr.y || []).some((v) => v != null && Number.isNaN(v)));
      ok(`plot ${pl.id} (${variant}) has no NaN`, !bad);
    });
    ok(`equations (${variant})`, shortrun.equations(variant).length >= 9);
  });
}

/* ============================ the printed midterm matches the site ======= */
console.log('midterm versions reproduce in the long-run model');
{
  // Same numbers as "Examen Parcial 1 v2/versions_data.py".
  const EXAM = [
    [1, { A: 4.0, s: 0.12, d: 0.10, L0: 200, K0: 1600 }, { A: 3.5, s: 0.18, d: 0.05, L0: 180, K0: 1440 }],
    [2, { A: 2.2, s: 0.25, d: 0.05, L0: 120, K0: 3240 }, { A: 3.2, s: 0.35, d: 0.08, L0: 100, K0: 800 }],
    [3, { A: 2.5, s: 0.30, d: 0.04, L0: 150, K0: 9600 }, { A: 4.0, s: 0.30, d: 0.10, L0: 160, K0: 1280 }],
    [4, { A: 3.5, s: 0.32, d: 0.06, L0: 100, K0: 6400 }, { A: 3.5, s: 0.40, d: 0.04, L0: 120, K0: 3240 }],
    [5, { A: 4.0, s: 0.40, d: 0.08, L0: 160, K0: 10240 }, { A: 4.0, s: 0.32, d: 0.05, L0: 150, K0: 4050 }],
    [6, { A: 2.4, s: 0.20, d: 0.04, L0: 160, K0: 4320 }, { A: 3.0, s: 0.25, d: 0.05, L0: 150, K0: 1200 }],
    [7, { A: 2.4, s: 0.18, d: 0.08, L0: 180, K0: 1440 }, { A: 2.2, s: 0.30, d: 0.04, L0: 160, K0: 1280 }],
    [8, { A: 3.2, s: 0.22, d: 0.06, L0: 180, K0: 4860 }, { A: 4.0, s: 0.20, d: 0.06, L0: 160, K0: 1280 }],
    [9, { A: 2.7, s: 0.35, d: 0.05, L0: 100, K0: 6400 }, { A: 3.0, s: 0.20, d: 0.04, L0: 100, K0: 800 }],
  ];

  const examParams = (e) => ({
    ...defaults(longrun, 1),
    Abar: e.A, s: e.s, delta: e.d, eta: 0, L0: e.L0, K0: e.K0, alpha: 1 / 3,
  });

  EXAM.forEach(([v, A, B]) => {
    const oA = longrun.compute(examParams(A));
    const oB = longrun.compute(examParams(B));

    // with eta = 0 the exam's break-even line is exactly delta * k
    close(`V${v}: break-even uses delta only`,
      oA.series.dCurve[50], A.d * oA.series.kGrid[50]);

    // the printed story: A leads today, B leads in the steady state
    ok(`V${v}: A leads consumption per person today`, oA.scalars.c0 > oB.scalars.c0);
    ok(`V${v}: A leads aggregate consumption today`,
      oA.scalars.c0 * A.L0 > oB.scalars.c0 * B.L0);
    ok(`V${v}: B leads consumption per person in the steady state`,
      oB.scalars.cStar > oA.scalars.cStar);
    ok(`V${v}: B leads aggregate consumption in the steady state`,
      oB.scalars.Cstar > oA.scalars.Cstar);
    ok(`V${v}: both economies start below their steady state`,
      oA.scalars.k0 < oA.scalars.kStar && oB.scalars.k0 < oB.scalars.kStar);
    ok(`V${v}: B grows faster`, oB.series.gk[0] > oA.series.gk[0]);

    // per-person and aggregate growth coincide when eta = 0
    close(`V${v}: aggregate growth equals per-person growth`,
      oA.series.Ktot[1] / oA.series.Ktot[0] - 1, oA.series.gk[0], 1e-9);
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
