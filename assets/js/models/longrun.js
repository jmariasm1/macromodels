// longrun.js — one integrated long-run economy (Jones, Macroeconomics 6e):
// Solow growth (ch. 5) + labor market with a minimum wage and the bathtub model
// (ch. 7) + money and inflation (ch. 8), all sharing one set of primitives.
//
// Notation follows the course convention:
//   Abar  A-bar   total factor productivity        L0     labor force at t = 0
//   alpha alpha   capital share                    s      saving / investment rate
//   delta delta   depreciation rate                eta    population growth rate
//   K0    K_0     initial aggregate capital        wmin   w_min, the minimum wage
//   lsA   a^s     intercept of the linear labor supply  L^s(w) = a^s + b^s w
//   lsB   b^s     slope of the linear labor supply
//   sbar  s-bar   job separation rate              fbar   f-bar, job finding rate
//   U0f   U_0^fric  frictional unemployment at t = 0
//
// Cross-block linkages
//   * Labor demand is the Cobb-Douglas MPL evaluated at the Solow steady-state
//     aggregate capital K*, so ch. 7 sits on top of ch. 5 rather than beside it.
//   * Total initial unemployment is U_0 = U_0^fric + U^struct, where U^struct is
//     the structural unemployment created by a binding minimum wage. The bathtub
//     model starts from that U_0.
//   * Money uses Y-bar = Y* (classical dichotomy) and g_Y = eta; the Fisher real
//     rate is the Solow steady-state MPK, R* = alpha (eta + delta) / s.
//
// compute() is pure: no DOM, no i18n, no Plotly. It runs unchanged in Node.

const T_SOLOW = 100;   // transition / bathtub horizon
const T_MONEY = 50;    // money and price-level horizon
const GRID_N = 140;    // resolution of the schedule curves
const GM_MAX = 0.30;   // right edge of the pi-vs-g_M line

/** Labor demand: invert the MPL condition w = (1-alpha) A (K/L)^alpha. */
function laborDemand(w, alpha, Abar, Kcap) {
  if (!(w > 0)) return Infinity;
  return Kcap * Math.pow(((1 - alpha) * Abar) / w, 1 / alpha);
}

/** Linear labor supply chosen by the user. */
function laborSupply(w, lsA, lsB) {
  return lsA + lsB * w;
}

/**
 * Market-clearing wage: labor demand falls in w and labor supply rises in w, so
 * excess demand is monotone and a bisection is safe.
 */
function clearingWage(alpha, Abar, Kcap, lsA, lsB) {
  const excess = (w) => laborDemand(w, alpha, Abar, Kcap) - laborSupply(w, lsA, lsB);
  let lo = 1e-9;
  let hi = 1;
  let guard = 0;
  while (excess(hi) > 0 && guard < 500) { hi *= 2; guard += 1; }
  for (let i = 0; i < 200; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (excess(mid) > 0) lo = mid; else hi = mid;
  }
  const wStar = 0.5 * (lo + hi);
  return { wStar, Lstar: laborSupply(wStar, lsA, lsB) };
}

export default {
  id: 'longrun',
  titleKey: 'model.lr.title',
  T: T_SOLOW,

  params: [
    // ------------------------------------------------ growth (Solow, ch. 5)
    { key: 'Abar', latex: '\\bar{A}', labelKey: 'p.lr.Abar', groupKey: 'g.lr.growth',
      min: 0.1, max: 12, step: 0.05, def1: 1.0, def2: 1.0, unit: '' },
    { key: 'L0', latex: 'L_0', labelKey: 'p.lr.L0', groupKey: 'g.lr.growth',
      min: 1, max: 2000, step: 1, def1: 100, def2: 100, unit: '' },
    { key: 'alpha', latex: '\\alpha', labelKey: 'p.lr.alpha', groupKey: 'g.lr.growth',
      min: 0.05, max: 0.9, step: 0.0001, def1: 0.3333, def2: 0.3333, unit: '' },
    { key: 's', latex: 's', labelKey: 'p.lr.s', groupKey: 'g.lr.growth',
      min: 0.01, max: 0.9, step: 0.01, def1: 0.20, def2: 0.20, unit: '%' },
    { key: 'delta', latex: '\\delta', labelKey: 'p.lr.delta', groupKey: 'g.lr.growth',
      min: 0.005, max: 0.5, step: 0.005, def1: 0.10, def2: 0.10, unit: '%' },
    { key: 'eta', latex: '\\eta', labelKey: 'p.lr.eta', groupKey: 'g.lr.growth',
      min: -0.03, max: 0.10, step: 0.001, def1: 0.02, def2: 0.02, unit: '%' },
    { key: 'K0', latex: 'K_0', labelKey: 'p.lr.K0', groupKey: 'g.lr.growth',
      min: 1, max: 200000, step: 10, def1: 100, def2: 100, unit: '' },

    // ------------------------------------------- labor market (ch. 7)
    { key: 'wmin', latex: 'w_{\\min}', labelKey: 'p.lr.wmin', groupKey: 'g.lr.labor',
      min: 0, max: 10, step: 0.01, def1: 0.80, def2: 0.80, unit: '' },
    { key: 'lsA', latex: 'a^{s}', labelKey: 'p.lr.lsA', groupKey: 'g.lr.labor',
      min: -200, max: 400, step: 1, def1: 50, def2: 50, unit: '' },
    // slope must stay strictly positive: a zero slope is a degenerate vertical
    // supply curve that the market-clearing bisection cannot bracket
    { key: 'lsB', latex: 'b^{s}', labelKey: 'p.lr.lsB', groupKey: 'g.lr.labor',
      min: 1, max: 500, step: 1, def1: 60, def2: 60, unit: '' },
    { key: 'sbar', latex: '\\bar{s}', labelKey: 'p.lr.sbar', groupKey: 'g.lr.labor',
      min: 0.001, max: 0.10, step: 0.001, def1: 0.02, def2: 0.02, unit: '%' },
    { key: 'fbar', latex: '\\bar{f}', labelKey: 'p.lr.fbar', groupKey: 'g.lr.labor',
      min: 0.01, max: 0.90, step: 0.01, def1: 0.25, def2: 0.25, unit: '%' },
    { key: 'U0f', latex: 'U_0^{\\text{fric}}', labelKey: 'p.lr.U0f', groupKey: 'g.lr.labor',
      min: 0, max: 500, step: 0.5, def1: 5, def2: 5, unit: '' },

    // ------------------------------------------- money and inflation (ch. 8)
    { key: 'Mbar', latex: '\\bar{M}', labelKey: 'p.lr.Mbar', groupKey: 'g.lr.money',
      min: 1, max: 5000, step: 10, def1: 200, def2: 200, unit: '' },
    { key: 'Vbar', latex: '\\bar{V}', labelKey: 'p.lr.Vbar', groupKey: 'g.lr.money',
      min: 0.5, max: 30, step: 0.5, def1: 5, def2: 5, unit: '' },
    { key: 'gM', latex: '\\bar{g}_M', labelKey: 'p.lr.gM', groupKey: 'g.lr.money',
      min: -0.10, max: 0.50, step: 0.005, def1: 0.07, def2: 0.07, unit: '%' },
    { key: 'gV', latex: '\\bar{g}_V', labelKey: 'p.lr.gV', groupKey: 'g.lr.money',
      min: -0.10, max: 0.20, step: 0.005, def1: 0.0, def2: 0.0, unit: '%' },
  ],

  compute(p) {
    const { Abar, L0, alpha, s, delta, eta, K0,
            wmin, lsA, lsB, sbar, fbar, U0f,
            Mbar, Vbar, gM, gV } = p;

    // ================= Solow growth ==========================================
    const widen = eta + delta;                       // break-even investment rate
    const kStar = Math.pow((s * Abar) / widen, 1 / (1 - alpha));
    const yStar = Abar * Math.pow(kStar, alpha);
    const cStar = (1 - s) * yStar;
    const Rstar = (alpha * widen) / s;               // MPK in the steady state
    const kyRatio = s / widen;                       // K*/Y* = k*/y*

    const Kstar = kStar * L0;                        // feeds the labor-demand curve
    const Ystar = yStar * L0;                        // feeds the quantity theory
    const Cstar = cStar * L0;

    const k0 = K0 / L0;
    const y0 = Abar * Math.pow(k0, alpha);
    const c0 = (1 - s) * y0;

    // Transition path. One extra step is simulated so that the growth rate of
    // output per person is exact (g_y = y_{t+1}/y_t - 1) at every plotted t.
    const tS = [];
    const kSeries = [];
    const ySeries = [];
    const cSeries = [];
    const iSeries = [];
    const dSeries = [];
    const Ktot = [];
    const Ytot = [];
    const Ltot = [];
    const gkSeries = [];
    const gySeries = [];

    const kPath = new Array(T_SOLOW + 2);
    const yPath = new Array(T_SOLOW + 2);
    let kt = k0;
    for (let i = 0; i <= T_SOLOW + 1; i += 1) {
      kPath[i] = kt;
      yPath[i] = Abar * Math.pow(kt, alpha);
      kt += s * yPath[i] - widen * kt;
    }
    for (let i = 0; i <= T_SOLOW; i += 1) {
      const Lt = L0 * Math.pow(1 + eta, i);
      tS.push(i);
      kSeries.push(kPath[i]);
      ySeries.push(yPath[i]);
      cSeries.push((1 - s) * yPath[i]);
      iSeries.push(s * yPath[i]);
      dSeries.push(widen * kPath[i]);
      Ltot.push(Lt);
      Ktot.push(kPath[i] * Lt);
      Ytot.push(yPath[i] * Lt);
      gkSeries.push(kPath[i] > 0 ? kPath[i + 1] / kPath[i] - 1 : 0);
      gySeries.push(yPath[i] > 0 ? yPath[i + 1] / yPath[i] - 1 : 0);
    }

    // Solow diagram schedules over a grid of k.
    const kMax = 1.7 * Math.max(kStar, k0, 1e-9);
    const kGrid = [];
    const yCurve = [];
    const iCurve = [];
    const dCurve = [];
    for (let i = 0; i <= GRID_N; i += 1) {
      const k = (kMax * i) / GRID_N;
      const yk = Abar * Math.pow(k, alpha);
      kGrid.push(k);
      yCurve.push(yk);
      iCurve.push(s * yk);
      dCurve.push(widen * k);
    }

    // ================= Labor market ==========================================
    const { wStar } = clearingWage(alpha, Abar, Kstar, lsA, lsB);
    const binding = wmin > wStar;
    const wActual = binding ? wmin : wStar;
    const Ldemand = laborDemand(wActual, alpha, Abar, Kstar);   // employment
    const Lsupply = Math.max(laborSupply(wActual, lsA, lsB), 0); // workers willing
    const Ustruct = Math.max(Lsupply - Ldemand, 0);
    const uStruct = Lsupply > 0 ? Ustruct / Lsupply : 0;

    // Both schedules are traced over a grid of WAGES, so labour demand never runs
    // off to infinity and labour supply is never drawn at a negative wage.
    const Lref = Math.max(Ldemand, Lsupply, 1e-9);
    const Lcap = 2.2 * Lref;
    const wLo = (1 - alpha) * Abar * Math.pow(Kstar / Lcap, alpha);
    const wHi = Math.max(2.0 * wActual, 1.4 * wmin, wLo * 1.25);
    const wGrid = [];
    const LdCurve = [];
    const LsCurve = [];
    for (let i = 0; i <= GRID_N; i += 1) {
      const w = wLo + ((wHi - wLo) * i) / GRID_N;
      const ls = laborSupply(w, lsA, lsB);
      wGrid.push(w);
      LdCurve.push(laborDemand(w, alpha, Abar, Kstar));   // MPL condition
      LsCurve.push(ls >= 0 ? ls : null);                  // no negative labour supply
    }

    // ================= Bathtub model =========================================
    // Labor force held at L_0 (Jones ch. 7 works with a fixed labor force).
    const uBath = sbar / (sbar + fbar);
    const Ubath = uBath * L0;
    const Ebath = L0 - Ubath;

    const U0 = Math.min(Math.max(U0f + Ustruct, 0), L0);
    const tB = [];
    const Upath = [];
    const Epath = [];
    const upath = [];
    let Ut = U0;
    for (let i = 0; i <= T_SOLOW; i += 1) {
      tB.push(i);
      Upath.push(Ut);
      Epath.push(L0 - Ut);
      upath.push(L0 > 0 ? Ut / L0 : 0);
      Ut = Ut + sbar * (L0 - Ut) - fbar * Ut;
    }

    // ================= Money and inflation ===================================
    const Ybar = Ystar;
    const gY = eta;
    const Pstar = Ybar > 0 ? (Mbar * Vbar) / Ybar : NaN;
    const pi = gM + gV - gY;                       // book's additive approximation
    const piExact = ((1 + gM) * (1 + gV)) / (1 + gY) - 1;
    const iNom = Rstar + pi;                       // Fisher, additive form
    const realBalances = Vbar > 0 ? Ybar / Vbar : NaN;
    const inflTax = Vbar > 0 ? gM / Vbar : NaN;

    const tM = [];
    const Mpath = [];
    const Ypath = [];
    const Ppath = [];
    let Mt = Mbar;
    let Vt = Vbar;
    let Yt = Ybar;
    for (let i = 0; i <= T_MONEY; i += 1) {
      tM.push(i);
      Mpath.push(Mt);
      Ypath.push(Yt);
      Ppath.push(Yt > 0 ? (Mt * Vt) / Yt : NaN);
      Mt *= 1 + gM;
      Vt *= 1 + gV;
      Yt *= 1 + gY;
    }

    const gMGrid = [];
    const piLine = [];
    for (let i = 0; i <= 60; i += 1) {
      const g = -0.10 + ((GM_MAX + 0.10) * i) / 60;
      gMGrid.push(100 * g);
      piLine.push(100 * (g + gV - gY));
    }

    return {
      scalars: {
        k0, y0, c0,
        kStar, yStar, cStar, Kstar, Ystar, Cstar, kyRatio, Rstar,
        wStar, wActual, Ldemand, Lsupply, Ustruct, uStruct,
        U0, uBath, Ubath, Ebath,
        Pstar, pi, piExact, Rfisher: Rstar, iNom, realBalances, inflTax,
      },
      series: {
        tS, k: kSeries, y: ySeries, c: cSeries, iInv: iSeries, dDep: dSeries,
        Ktot, Ytot, Ltot, gk: gkSeries, gy: gySeries,
        kGrid, yCurve, iCurve, dCurve,
        wGrid, LdCurve, LsCurve,
        tB, U: Upath, E: Epath, u: upath,
        tM, M: Mpath, Yq: Ypath, P: Ppath, gMGrid, piLine,
      },
    };
  },

  scalars: [
    // ------------------------------------------------------------- growth
    { key: 'k0', latex: 'k_0', labelKey: 's.lr.k0', fmt: 'num', groupKey: 'g.lr.growth' },
    { key: 'y0', latex: 'y_0', labelKey: 's.lr.y0', fmt: 'num', groupKey: 'g.lr.growth' },
    { key: 'c0', latex: 'c_0', labelKey: 's.lr.c0', fmt: 'num', groupKey: 'g.lr.growth' },
    { key: 'kStar', latex: 'k^*', labelKey: 's.lr.kStar', fmt: 'num', groupKey: 'g.lr.growth' },
    { key: 'yStar', latex: 'y^*', labelKey: 's.lr.yStar', fmt: 'num', groupKey: 'g.lr.growth' },
    { key: 'cStar', latex: 'c^*', labelKey: 's.lr.cStar', fmt: 'num', groupKey: 'g.lr.growth' },
    { key: 'Kstar', latex: 'K^*', labelKey: 's.lr.Kstar', fmt: 'big', groupKey: 'g.lr.growth' },
    { key: 'Ystar', latex: 'Y^*', labelKey: 's.lr.Ystar', fmt: 'big', groupKey: 'g.lr.growth' },
    { key: 'Cstar', latex: 'C^*', labelKey: 's.lr.Cstar', fmt: 'big', groupKey: 'g.lr.growth' },
    { key: 'kyRatio', latex: 'K^*/Y^*', labelKey: 's.lr.kyRatio', fmt: 'num', groupKey: 'g.lr.growth' },
    { key: 'Rstar', latex: 'R^*=\\text{PMgK}', labelKey: 's.lr.Rstar', fmt: 'pct', groupKey: 'g.lr.growth' },
    // -------------------------------------------------------- labor market
    { key: 'wStar', latex: 'w^*', labelKey: 's.lr.wStar', fmt: 'num', groupKey: 'g.lr.labor' },
    { key: 'wActual', latex: 'w', labelKey: 's.lr.wActual', fmt: 'num', groupKey: 'g.lr.labor' },
    { key: 'Ldemand', latex: 'L^{d}', labelKey: 's.lr.Ldemand', fmt: 'num', groupKey: 'g.lr.labor' },
    { key: 'Lsupply', latex: 'L^{s}', labelKey: 's.lr.Lsupply', fmt: 'num', groupKey: 'g.lr.labor' },
    { key: 'Ustruct', latex: 'U^{\\text{estr}}', labelKey: 's.lr.Ustruct', fmt: 'num', groupKey: 'g.lr.labor' },
    { key: 'uStruct', latex: 'u^{\\text{estr}}', labelKey: 's.lr.uStruct', fmt: 'pct', groupKey: 'g.lr.labor' },
    { key: 'U0', latex: 'U_0', labelKey: 's.lr.U0', fmt: 'num', groupKey: 'g.lr.labor' },
    { key: 'uBath', latex: 'u^*', labelKey: 's.lr.uBath', fmt: 'pct', groupKey: 'g.lr.labor' },
    { key: 'Ubath', latex: 'U^*', labelKey: 's.lr.Ubath', fmt: 'num', groupKey: 'g.lr.labor' },
    { key: 'Ebath', latex: 'E^*', labelKey: 's.lr.Ebath', fmt: 'num', groupKey: 'g.lr.labor' },
    // -------------------------------------------------- money and inflation
    { key: 'Pstar', latex: 'P^*', labelKey: 's.lr.Pstar', fmt: 'num', groupKey: 'g.lr.money' },
    { key: 'pi', latex: '\\pi^*', labelKey: 's.lr.pi', fmt: 'pct', groupKey: 'g.lr.money' },
    { key: 'Rfisher', latex: 'R', labelKey: 's.lr.Rfisher', fmt: 'pct', groupKey: 'g.lr.money' },
    { key: 'iNom', latex: 'i', labelKey: 's.lr.iNom', fmt: 'pct', groupKey: 'g.lr.money' },
    { key: 'realBalances', latex: 'M/P', labelKey: 's.lr.realBalances', fmt: 'num', groupKey: 'g.lr.money' },
    { key: 'inflTax', latex: '\\bar{g}_M/\\bar{V}', labelKey: 's.lr.inflTax', fmt: 'pct', groupKey: 'g.lr.money' },
  ],

  plots: [
    // ====================== growth (Solow) ==================================
    {
      id: 'solow-diagram',
      titleKey: 'pl.lr.solow',
      groupKey: 'g.lr.growth',
      xLabelKey: 'ax.lr.k',
      yLabelKey: 'ax.lr.solowY',
      build(o1, o2, p1, p2, t) {
        const traces = [];
        const add = (o, p, e) => {
          traces.push({ x: o.series.kGrid, y: o.series.yCurve,
            name: `${t('tr.lr.prod')} (${e})`, economy: e });
          traces.push({ x: o.series.kGrid, y: o.series.iCurve,
            name: `${t('tr.lr.inv')} (${e})`, economy: e, dash: 'dash', role: 'aux' });
          traces.push({ x: o.series.kGrid, y: o.series.dCurve,
            name: `${t('tr.lr.dep')} (${e})`, economy: e, dash: 'dot', role: 'aux' });
          traces.push({ x: [o.scalars.kStar], y: [p.s * o.scalars.yStar],
            name: `k* (${e})`, economy: e, mode: 'markers', marker: { size: 10 } });
        };
        add(o1, p1, 1);
        add(o2, p2, 2);
        return { traces };
      },
    },
    {
      id: 'growth-rates',
      titleKey: 'pl.lr.growthRates',
      groupKey: 'g.lr.growth',
      xLabelKey: 'axis.time',
      yLabelKey: 'ax.lr.growthPct',
      build(o1, o2, p1, p2, t) {
        const pc = (a) => a.map((v) => 100 * v);
        const last = Math.max(o1.series.tS.at(-1), o2.series.tS.at(-1));
        return {
          traces: [
            // solid = output per person, dashed = capital per person
            { x: o1.series.tS, y: pc(o1.series.gy), name: `g_y (1)`, economy: 1 },
            { x: o1.series.tS, y: pc(o1.series.gk), name: `g_k (1)`, economy: 1, dash: 'dash' },
            { x: o2.series.tS, y: pc(o2.series.gy), name: `g_y (2)`, economy: 2 },
            { x: o2.series.tS, y: pc(o2.series.gk), name: `g_k (2)`, economy: 2, dash: 'dash' },
            // dotted = the steady state, where both growth rates are zero
            { x: [0, last], y: [0, 0], name: t('tr.lr.ss'), economy: 0,
              dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'totals-time',
      titleKey: 'pl.lr.totalsTime',
      groupKey: 'g.lr.growth',
      xLabelKey: 'axis.time',
      yLabelKey: 'ax.lr.levels',
      build(o1, o2, p1, p2, t) {
        return {
          traces: [
            { x: o1.series.tS, y: o1.series.Ktot, name: `K_t (1)`, economy: 1 },
            { x: o1.series.tS, y: o1.series.Ytot, name: `Y_t (1)`, economy: 1, dash: 'dash' },
            { x: o2.series.tS, y: o2.series.Ktot, name: `K_t (2)`, economy: 2 },
            { x: o2.series.tS, y: o2.series.Ytot, name: `Y_t (2)`, economy: 2, dash: 'dash' },
          ],
        };
      },
    },

    // ====================== labor market ====================================
    {
      id: 'labor-market',
      titleKey: 'pl.lr.laborMarket',
      groupKey: 'g.lr.labor',
      xLabelKey: 'ax.lr.L',
      yLabelKey: 'ax.lr.w',
      build(o1, o2, p1, p2, t) {
        const traces = [];
        const xs = [...o1.series.LdCurve, ...o2.series.LdCurve,
          ...o1.series.LsCurve, ...o2.series.LsCurve].filter((v) => Number.isFinite(v));
        const xr = [0, Math.max(...xs)];
        const add = (o, p, e) => {
          traces.push({ x: o.series.LdCurve, y: o.series.wGrid,
            name: `${t('tr.lr.Ld')} (${e})`, economy: e });                    // solid
          traces.push({ x: o.series.LsCurve, y: o.series.wGrid,
            name: `${t('tr.lr.Ls')} (${e})`, economy: e, dash: 'dash' });      // dashed
          if (p.wmin > 0) {
            traces.push({ x: xr, y: [p.wmin, p.wmin],
              name: `w_min (${e})`, economy: e, dash: 'dot', role: 'aux' });
          }
          traces.push({ x: [o.scalars.Ldemand], y: [o.scalars.wActual],
            name: `${t('tr.lr.emp')} (${e})`, economy: e,
            mode: 'markers', marker: { size: 10 } });
        };
        add(o1, p1, 1);
        add(o2, p2, 2);
        return { traces, layout: { xaxis: { range: xr } } };
      },
    },
    {
      id: 'urate-time',
      titleKey: 'pl.lr.urate',
      groupKey: 'g.lr.labor',
      xLabelKey: 'axis.time',
      yLabelKey: 'ax.lr.uPct',
      build(o1, o2, p1, p2, t) {
        const pc = (a) => a.map((v) => 100 * v);
        const last = Math.max(o1.series.tB.at(-1), o2.series.tB.at(-1));
        return {
          traces: [
            { x: o1.series.tB, y: pc(o1.series.u), name: `u_t (1)`, economy: 1 },
            { x: o2.series.tB, y: pc(o2.series.u), name: `u_t (2)`, economy: 2 },
            { x: [0, last], y: [100 * o1.scalars.uBath, 100 * o1.scalars.uBath],
              name: `u* (1)`, economy: 1, dash: 'dot', role: 'aux' },
            { x: [0, last], y: [100 * o2.scalars.uBath, 100 * o2.scalars.uBath],
              name: `u* (2)`, economy: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'bathtub-levels',
      titleKey: 'pl.lr.bathtub',
      groupKey: 'g.lr.labor',
      xLabelKey: 'axis.time',
      yLabelKey: 'ax.lr.people',
      build(o1, o2, p1, p2, t) {
        return {
          traces: [
            { x: o1.series.tB, y: o1.series.E, name: `${t('tr.lr.E')} (1)`, economy: 1 },
            { x: o1.series.tB, y: o1.series.U, name: `${t('tr.lr.U')} (1)`, economy: 1, dash: 'dash' },
            { x: o2.series.tB, y: o2.series.E, name: `${t('tr.lr.E')} (2)`, economy: 2 },
            { x: o2.series.tB, y: o2.series.U, name: `${t('tr.lr.U')} (2)`, economy: 2, dash: 'dash' },
          ],
        };
      },
    },

    // ====================== money and inflation =============================
    {
      id: 'price-time',
      titleKey: 'pl.lr.priceTime',
      groupKey: 'g.lr.money',
      xLabelKey: 'axis.time',
      yLabelKey: 'ax.lr.P',
      build(o1, o2) {
        return {
          traces: [
            { x: o1.series.tM, y: o1.series.P, name: `P_t (1)`, economy: 1 },
            { x: o2.series.tM, y: o2.series.P, name: `P_t (2)`, economy: 2 },
          ],
          layout: { yaxis: { type: 'log' } },
        };
      },
    },
    {
      id: 'pi-vs-gm',
      titleKey: 'pl.lr.piVsGm',
      groupKey: 'g.lr.money',
      xLabelKey: 'ax.lr.gM',
      yLabelKey: 'ax.lr.piPct',
      build(o1, o2, p1, p2, t) {
        return {
          traces: [
            { x: o1.series.gMGrid, y: o1.series.piLine, name: `${t('tr.lr.qt')} (1)`, economy: 1 },
            { x: o2.series.gMGrid, y: o2.series.piLine, name: `${t('tr.lr.qt')} (2)`, economy: 2, dash: 'dash' },
            { x: [100 * p1.gM], y: [100 * o1.scalars.pi], name: `${t('tr.lr.point')} (1)`,
              economy: 1, mode: 'markers', marker: { size: 10 } },
            { x: [100 * p2.gM], y: [100 * o2.scalars.pi], name: `${t('tr.lr.point')} (2)`,
              economy: 2, mode: 'markers', marker: { size: 10 } },
          ],
        };
      },
    },
    {
      id: 'fisher-bars',
      titleKey: 'pl.lr.fisher',
      groupKey: 'g.lr.money',
      xLabelKey: 'ax.lr.component',
      yLabelKey: 'ax.lr.ratePct',
      build(o1, o2, p1, p2, t) {
        const cats = [t('tr.lr.R'), t('tr.lr.pi'), t('tr.lr.i')];
        return {
          traces: [
            { type: 'bar', x: cats, economy: 1, name: t('ui.economy1'),
              y: [100 * o1.scalars.Rfisher, 100 * o1.scalars.pi, 100 * o1.scalars.iNom] },
            { type: 'bar', x: cats, economy: 2, name: t('ui.economy2'),
              y: [100 * o2.scalars.Rfisher, 100 * o2.scalars.pi, 100 * o2.scalars.iNom] },
          ],
          layout: { barmode: 'group' },
        };
      },
    },
  ],

  equations: [
    { headingKey: 'eq.lr.growth' },
    { nameKey: 'eq.lr.production', tex: 'Y_t = \\bar{A}\\,K_t^{\\alpha}\\,L_t^{1-\\alpha}, \\qquad L_t = L_0\\,(1+\\eta)^{t}' },
    { nameKey: 'eq.lr.percap', tex: 'k_t=\\dfrac{K_t}{L_t},\\qquad y_t=\\dfrac{Y_t}{L_t}=\\bar{A}\\,k_t^{\\alpha},\\qquad c_t=(1-s)\\,y_t' },
    { nameKey: 'eq.lr.accum', tex: '\\Delta k_{t+1} = \\underbrace{s\\,\\bar{A}\\,k_t^{\\alpha}}_{i_t} - \\underbrace{(\\delta+\\eta)\\,k_t}_{d_t}' },
    { nameKey: 'eq.lr.ss', tex: 'k^* = \\left(\\dfrac{s\\,\\bar{A}}{\\delta+\\eta}\\right)^{\\frac{1}{1-\\alpha}},\\qquad y^*=\\bar{A}\\,(k^*)^{\\alpha},\\qquad c^*=(1-s)\\,y^*' },
    { nameKey: 'eq.lr.mpk', tex: 'R^* = \\text{PMgK} = \\alpha\\,\\dfrac{\\delta+\\eta}{s},\\qquad \\dfrac{K^*}{Y^*}=\\dfrac{s}{\\delta+\\eta}' },

    { headingKey: 'eq.lr.labor' },
    { nameKey: 'eq.lr.ldemand', tex: 'w = \\text{PMgL} = (1-\\alpha)\\,\\bar{A}\\left(\\dfrac{K^*}{L}\\right)^{\\alpha} \\;\\Longrightarrow\\; L^{d}(w) = K^*\\left[\\dfrac{(1-\\alpha)\\bar{A}}{w}\\right]^{1/\\alpha}' },
    { nameKey: 'eq.lr.lsupply', tex: 'L^{s}(w) = a^{s} + b^{s}\\,w' },
    { nameKey: 'eq.lr.wage', tex: 'w = \\max\\{w^*,\\; w_{\\min}\\}\\quad\\text{con } L^{d}(w^*) = L^{s}(w^*)' },
    { nameKey: 'eq.lr.struct', tex: 'U^{\\text{estr}} = \\max\\{\\,L^{s}(w) - L^{d}(w),\\; 0\\,\\}, \\qquad U_0 = U_0^{\\text{fric}} + U^{\\text{estr}}' },
    { nameKey: 'eq.lr.bathtub', tex: 'E_t + U_t = L_0,\\qquad \\Delta U_{t+1} = \\bar{s}\\,E_t - \\bar{f}\\,U_t,\\qquad u^* = \\dfrac{\\bar{s}}{\\bar{s}+\\bar{f}}' },

    { headingKey: 'eq.lr.money' },
    { nameKey: 'eq.lr.quantity', tex: 'M_t\\,\\bar{V} = P_t\\,\\bar{Y}_t \\;\\Longrightarrow\\; P_t^* = \\dfrac{\\bar{M}_t\\,\\bar{V}}{\\bar{Y}_t},\\qquad \\bar{Y}=Y^*' },
    { nameKey: 'eq.lr.inflation', tex: '\\pi^* \\approx \\bar{g}_M + \\bar{g}_V - \\bar{g}_Y, \\qquad \\bar{g}_Y = \\eta' },
    { nameKey: 'eq.lr.fisher', tex: 'i \\approx R + \\pi, \\qquad R = R^* = \\text{PMgK}' },
    { nameKey: 'eq.lr.seigniorage', tex: '\\dfrac{\\Delta M}{P\\,Y} = \\dfrac{\\bar{g}_M}{\\bar{V}}' },
  ],

  strings: {
    en: {
      'model.lr.title': 'Long-run models',
      'g.lr.growth': 'Growth (Solow)',
      'g.lr.labor': 'Labor market',
      'g.lr.money': 'Money and inflation',

      'p.lr.Abar': 'Total factor productivity',
      'p.lr.L0': 'Labor force at t = 0',
      'p.lr.alpha': 'Capital share of output',
      'p.lr.s': 'Saving / investment rate',
      'p.lr.delta': 'Depreciation rate',
      'p.lr.eta': 'Population growth rate',
      'p.lr.K0': 'Initial aggregate capital',
      'p.lr.wmin': 'Minimum wage',
      'p.lr.lsA': 'Labor supply: intercept',
      'p.lr.lsB': 'Labor supply: slope',
      'p.lr.sbar': 'Job separation rate',
      'p.lr.fbar': 'Job finding rate',
      'p.lr.U0f': 'Frictional unemployment at t = 0',
      'p.lr.Mbar': 'Money supply',
      'p.lr.Vbar': 'Velocity of money',
      'p.lr.gM': 'Growth rate of the money supply',
      'p.lr.gV': 'Growth rate of velocity',

      's.lr.k0': 'Initial capital per person',
      's.lr.y0': 'Initial output per person',
      's.lr.c0': 'Initial consumption per person',
      's.lr.kStar': 'Steady-state capital per person',
      's.lr.yStar': 'Steady-state output per person',
      's.lr.cStar': 'Steady-state consumption per person',
      's.lr.Kstar': 'Steady-state aggregate capital (at t = 0 scale)',
      's.lr.Ystar': 'Steady-state aggregate output (at t = 0 scale)',
      's.lr.Cstar': 'Steady-state aggregate consumption (at t = 0 scale)',
      's.lr.kyRatio': 'Capital-output ratio',
      's.lr.Rstar': 'Steady-state real interest rate (MPK)',
      's.lr.wStar': 'Market-clearing real wage',
      's.lr.wActual': 'Real wage actually paid',
      's.lr.Ldemand': 'Employment (labor demanded)',
      's.lr.Lsupply': 'Workers willing to work at that wage',
      's.lr.Ustruct': 'Structural unemployment (minimum wage)',
      's.lr.uStruct': 'Structural unemployment rate',
      's.lr.U0': 'Initial unemployment (frictional + structural)',
      's.lr.uBath': 'Steady-state unemployment rate (bathtub)',
      's.lr.Ubath': 'Steady-state unemployed',
      's.lr.Ebath': 'Steady-state employed',
      's.lr.Pstar': 'Price level',
      's.lr.pi': 'Inflation rate',
      's.lr.Rfisher': 'Real interest rate',
      's.lr.iNom': 'Nominal interest rate',
      's.lr.realBalances': 'Real money balances',
      's.lr.inflTax': 'Seigniorage as a share of GDP',

      'pl.lr.solow': 'Solow diagram',
      'pl.lr.growthRates': 'Growth rates of capital and output per person',
      'pl.lr.totalsTime': 'Aggregate capital and output over time',
      'pl.lr.laborMarket': 'Labor supply and demand',
      'pl.lr.urate': 'Unemployment rate (bathtub model)',
      'pl.lr.bathtub': 'Employment and unemployment (bathtub model)',
      'pl.lr.priceTime': 'Price level over time',
      'pl.lr.piVsGm': 'Inflation and money growth',
      'pl.lr.fisher': 'Fisher equation',

      'ax.lr.k': 'Capital per person (k)',
      'ax.lr.solowY': 'Output, investment, depreciation',
      'ax.lr.growthPct': 'Growth rate (%)',
      'ax.lr.levels': 'Level',
      'ax.lr.L': 'Labor (L)',
      'ax.lr.w': 'Real wage (w)',
      'ax.lr.uPct': 'Unemployment rate (%)',
      'ax.lr.people': 'Workers',
      'ax.lr.P': 'Price level (P)',
      'ax.lr.gM': 'Money growth ḡ_M (%)',
      'ax.lr.piPct': 'Inflation π (%)',
      'ax.lr.component': 'Component',
      'ax.lr.ratePct': 'Rate (%)',

      'tr.lr.prod': 'Output y(k)',
      'tr.lr.inv': 'Investment i(k)',
      'tr.lr.dep': 'Depreciation d(k)',
      'tr.lr.ss': 'Steady state',
      'tr.lr.Ld': 'Labor demand (MPL)',
      'tr.lr.Ls': 'Labor supply',
      'tr.lr.emp': 'Employment',
      'tr.lr.E': 'Employed E',
      'tr.lr.U': 'Unemployed U',
      'tr.lr.qt': 'Quantity theory',
      'tr.lr.point': 'This economy',
      'tr.lr.R': 'Real rate R',
      'tr.lr.pi': 'Inflation π',
      'tr.lr.i': 'Nominal rate i',

      'eq.lr.growth': 'Growth: the Solow model',
      'eq.lr.labor': 'The labor market',
      'eq.lr.money': 'Money and inflation',
      'eq.lr.production': 'Production function',
      'eq.lr.percap': 'Per-person variables',
      'eq.lr.accum': 'Capital accumulation',
      'eq.lr.ss': 'Steady state',
      'eq.lr.mpk': 'Marginal product of capital and the capital-output ratio',
      'eq.lr.ldemand': 'Labor demand (marginal product of labor)',
      'eq.lr.lsupply': 'Labor supply (linear)',
      'eq.lr.wage': 'Wage with a minimum wage',
      'eq.lr.struct': 'Structural unemployment and initial unemployment',
      'eq.lr.bathtub': 'Bathtub model of unemployment',
      'eq.lr.quantity': 'Quantity theory of money',
      'eq.lr.inflation': 'Inflation rate',
      'eq.lr.fisher': 'Fisher equation',
      'eq.lr.seigniorage': 'Inflation tax (seigniorage)',
    },

    es: {
      'model.lr.title': 'Modelos de largo plazo',
      'g.lr.growth': 'Crecimiento (Solow)',
      'g.lr.labor': 'Mercado laboral',
      'g.lr.money': 'Dinero e inflación',

      'p.lr.Abar': 'Productividad total de los factores',
      'p.lr.L0': 'Fuerza laboral en t = 0',
      'p.lr.alpha': 'Participación del capital en el producto',
      'p.lr.s': 'Tasa de ahorro / inversión',
      'p.lr.delta': 'Tasa de depreciación',
      'p.lr.eta': 'Tasa de crecimiento de la población',
      'p.lr.K0': 'Capital total inicial',
      'p.lr.wmin': 'Salario mínimo',
      'p.lr.lsA': 'Oferta laboral: intercepto',
      'p.lr.lsB': 'Oferta laboral: pendiente',
      'p.lr.sbar': 'Tasa de separación de empleos',
      'p.lr.fbar': 'Tasa de consecución de empleos',
      'p.lr.U0f': 'Desempleo friccional en t = 0',
      'p.lr.Mbar': 'Oferta de dinero',
      'p.lr.Vbar': 'Velocidad del dinero',
      'p.lr.gM': 'Crecimiento de la oferta de dinero',
      'p.lr.gV': 'Crecimiento de la velocidad',

      's.lr.k0': 'Capital por persona inicial',
      's.lr.y0': 'Producto por persona inicial',
      's.lr.c0': 'Consumo por persona inicial',
      's.lr.kStar': 'Capital por persona de estado estacionario',
      's.lr.yStar': 'Producto por persona de estado estacionario',
      's.lr.cStar': 'Consumo por persona de estado estacionario',
      's.lr.Kstar': 'Capital total de estado estacionario (escala de t = 0)',
      's.lr.Ystar': 'Producto total de estado estacionario (escala de t = 0)',
      's.lr.Cstar': 'Consumo total de estado estacionario (escala de t = 0)',
      's.lr.kyRatio': 'Relación capital-producto',
      's.lr.Rstar': 'Tasa de interés real de estado estacionario (PMgK)',
      's.lr.wStar': 'Salario real de equilibrio de mercado',
      's.lr.wActual': 'Salario real efectivamente pagado',
      's.lr.Ldemand': 'Empleo (trabajo demandado)',
      's.lr.Lsupply': 'Personas dispuestas a trabajar a ese salario',
      's.lr.Ustruct': 'Desempleo estructural (salario mínimo)',
      's.lr.uStruct': 'Tasa de desempleo estructural',
      's.lr.U0': 'Desempleo inicial (friccional + estructural)',
      's.lr.uBath': 'Tasa de desempleo de estado estacionario (bañera)',
      's.lr.Ubath': 'Desempleados de estado estacionario',
      's.lr.Ebath': 'Empleados de estado estacionario',
      's.lr.Pstar': 'Nivel de precios',
      's.lr.pi': 'Tasa de inflación',
      's.lr.Rfisher': 'Tasa de interés real',
      's.lr.iNom': 'Tasa de interés nominal',
      's.lr.realBalances': 'Saldos monetarios reales',
      's.lr.inflTax': 'Señoreaje como proporción del PIB',

      'pl.lr.solow': 'Diagrama de Solow',
      'pl.lr.growthRates': 'Tasas de crecimiento del capital y el producto por persona',
      'pl.lr.totalsTime': 'Capital y producto totales en el tiempo',
      'pl.lr.laborMarket': 'Oferta y demanda de trabajo',
      'pl.lr.urate': 'Tasa de desempleo (modelo de la bañera)',
      'pl.lr.bathtub': 'Empleo y desempleo (modelo de la bañera)',
      'pl.lr.priceTime': 'Nivel de precios en el tiempo',
      'pl.lr.piVsGm': 'Inflación y crecimiento del dinero',
      'pl.lr.fisher': 'Ecuación de Fisher',

      'ax.lr.k': 'Capital por persona (k)',
      'ax.lr.solowY': 'Producción, inversión, depreciación',
      'ax.lr.growthPct': 'Tasa de crecimiento (%)',
      'ax.lr.levels': 'Nivel',
      'ax.lr.L': 'Trabajo (L)',
      'ax.lr.w': 'Salario real (w)',
      'ax.lr.uPct': 'Tasa de desempleo (%)',
      'ax.lr.people': 'Trabajadores',
      'ax.lr.P': 'Nivel de precios (P)',
      'ax.lr.gM': 'Crecimiento del dinero ḡ_M (%)',
      'ax.lr.piPct': 'Inflación π (%)',
      'ax.lr.component': 'Componente',
      'ax.lr.ratePct': 'Tasa (%)',

      'tr.lr.prod': 'Producción y(k)',
      'tr.lr.inv': 'Inversión i(k)',
      'tr.lr.dep': 'Depreciación d(k)',
      'tr.lr.ss': 'Estado estacionario',
      'tr.lr.Ld': 'Demanda de trabajo (PMgL)',
      'tr.lr.Ls': 'Oferta de trabajo',
      'tr.lr.emp': 'Empleo',
      'tr.lr.E': 'Empleados E',
      'tr.lr.U': 'Desempleados U',
      'tr.lr.qt': 'Teoría cuantitativa',
      'tr.lr.point': 'Esta economía',
      'tr.lr.R': 'Tasa real R',
      'tr.lr.pi': 'Inflación π',
      'tr.lr.i': 'Tasa nominal i',

      'eq.lr.growth': 'Crecimiento: el modelo de Solow',
      'eq.lr.labor': 'El mercado laboral',
      'eq.lr.money': 'Dinero e inflación',
      'eq.lr.production': 'Función de producción',
      'eq.lr.percap': 'Variables por persona',
      'eq.lr.accum': 'Acumulación de capital',
      'eq.lr.ss': 'Estado estacionario',
      'eq.lr.mpk': 'Producto marginal del capital y relación capital-producto',
      'eq.lr.ldemand': 'Demanda de trabajo (producto marginal del trabajo)',
      'eq.lr.lsupply': 'Oferta de trabajo (lineal)',
      'eq.lr.wage': 'Salario con salario mínimo',
      'eq.lr.struct': 'Desempleo estructural y desempleo inicial',
      'eq.lr.bathtub': 'Modelo de la bañera del desempleo',
      'eq.lr.quantity': 'Teoría cuantitativa del dinero',
      'eq.lr.inflation': 'Tasa de inflación',
      'eq.lr.fisher': 'Ecuación de Fisher',
      'eq.lr.seigniorage': 'Impuesto inflacionario (señoreaje)',
    },
  },
};
