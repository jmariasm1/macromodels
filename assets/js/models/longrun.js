// longrun.js [LONGRUN]
// ONE integrated long-run model (Jones, Macroeconomics 6e) merging chapters
// 5 (Solow growth), 7 (labor market & the bathtub model) and 8 (money &
// inflation) into a SINGLE CONSISTENT ECONOMY. Per professor feedback, the
// three chapters share one set of primitives and are cross-linked so that
// growth, labor markets and prices are analysed on the same page.
//
// Cross-chapter linkages (the point of the integration):
//   • Shared primitives (one instance each): Ā (TFP), L̄ (labor force), α,
//     s̄ (saving), d̄ (depreciation), n̄ (population growth), K₀.
//   • Labor demand (Ch. 7) is the Cobb–Douglas MPL evaluated at the SHARED Ā,
//     α and the Solow steady-state aggregate capital K* — not an independent
//     K̄ parameter. The bathtub labor force is the shared L̄.
//   • Money & inflation (Ch. 8) uses Ȳ = Y* from Solow (classical dichotomy)
//     and real-output growth g_Y = n̄ (aggregate steady-state growth of the
//     Solow model with population growth). The Fisher real rate R is the Solow
//     steady-state real interest rate R* = MPK = α·(n̄+d̄)/s̄ — Ch. 8 §8.3 says
//     explicitly "Recall from Chapter 5 that in the long run, the real
//     interest rate is equal to the marginal product of capital." Because MPK
//     is large in the Solow calibration, the implied nominal rate i is large;
//     that is model-consistent (see the note).
//
// Pure compute(): no DOM, no i18n, no Plotly. Node-testable.
// See ARCHITECTURE.md (integrated single-model pages v2) and SPEC_LONGRUN.md.

const T_SOLOW = 100; // Solow / bathtub transition horizon
const T_MONEY = 50; // money & price-level horizon
const GRID_N = 120; // resolution of the schedule curves
const GM_GRID_MAX = 0.30; // range of the π-vs-g_M theoretical line

/**
 * Solve for the equilibrium firm-paid wage w* where labor demand equals labor
 * supply, by bisection on excess demand (monotonically decreasing in w).
 *   Ld(w) = Kstar·[(1-α)·Ā/w]^(1/α)       (Cobb–Douglas MPL, capital = K*)
 *   Ls(w) = LbarS·[(1-τ)·w]^η              (iso-elastic, reference wage = 1)
 * Kstar is the Solow steady-state aggregate capital (the linkage).
 */
function solveWage(alpha, Abar, Kstar, tau, eta, LbarS) {
  const Ld = (w) => Kstar * Math.pow(((1 - alpha) * Abar) / w, 1 / alpha);
  const Ls = (w) => LbarS * Math.pow((1 - tau) * w, eta);
  const excess = (w) => Ld(w) - Ls(w);
  let lo = 1e-9;
  let hi = 1;
  let guard = 0;
  while (excess(hi) > 0 && guard < 400) { hi *= 2; guard += 1; }
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (excess(mid) > 0) lo = mid; else hi = mid;
  }
  const wStar = 0.5 * (lo + hi);
  return { wStar, Lstar: Ld(wStar) };
}

export default {
  id: 'longrun',
  titleKey: 'model.longrun.title',
  chapterLabel: 'Ch. 5 · 7 · 8',
  T: T_SOLOW,

  params: [
    // ===================== Growth (Solow) — shared primitives =====================
    { key: 'Abar', latex: '\\bar{A}', labelKey: 'param.lr.Abar', groupKey: 'group.lr.growth',
      min: 0.2, max: 3.0, step: 0.05, def1: 1.0, def2: 1.0, unit: '' },
    { key: 'Lbar', latex: '\\bar{L}', labelKey: 'param.lr.Lbar', groupKey: 'group.lr.growth',
      min: 1, max: 1000, step: 1, def1: 100, def2: 100, unit: '' },
    { key: 'alpha', latex: '\\alpha', labelKey: 'param.lr.alpha', groupKey: 'group.lr.growth',
      min: 0.2, max: 0.5, step: 0.01, def1: 0.3333, def2: 0.3333, unit: '' },
    { key: 'sbar', latex: '\\bar{s}', labelKey: 'param.lr.sbar', groupKey: 'group.lr.growth',
      min: 0.01, max: 0.60, step: 0.01, def1: 0.20, def2: 0.20, unit: '%' },
    { key: 'dbar', latex: '\\bar{d}', labelKey: 'param.lr.dbar', groupKey: 'group.lr.growth',
      min: 0.01, max: 0.20, step: 0.01, def1: 0.10, def2: 0.10, unit: '%' },
    { key: 'nbar', latex: '\\bar{n}', labelKey: 'param.lr.nbar', groupKey: 'group.lr.growth',
      min: -0.02, max: 0.05, step: 0.001, def1: 0.02, def2: 0.02, unit: '%' },
    { key: 'K0', latex: '\\bar{K}_0', labelKey: 'param.lr.K0', groupKey: 'group.lr.growth',
      min: 1, max: 5000, step: 1, def1: 100, def2: 100, unit: '' },

    // ============================ Labor market (Ch. 7) ============================
    { key: 'tau', latex: '\\tau', labelKey: 'param.lr.tau', groupKey: 'group.lr.labor',
      min: 0, max: 0.6, step: 0.01, def1: 0.0, def2: 0.0, unit: '%' },
    { key: 'eta', latex: '\\eta', labelKey: 'param.lr.eta', groupKey: 'group.lr.labor',
      min: 0.1, max: 3.0, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'LbarS', latex: '\\bar{\\ell}', labelKey: 'param.lr.LbarS', groupKey: 'group.lr.labor',
      min: 10, max: 500, step: 5, def1: 150, def2: 150, unit: '' },
    { key: 'sbarSep', latex: '\\bar{s}_{\\text{sep}}', labelKey: 'param.lr.sbarSep', groupKey: 'group.lr.labor',
      min: 0.001, max: 0.05, step: 0.001, def1: 0.01, def2: 0.01, unit: '%' },
    { key: 'fbar', latex: '\\bar{f}', labelKey: 'param.lr.fbar', groupKey: 'group.lr.labor',
      min: 0.02, max: 0.60, step: 0.01, def1: 0.20, def2: 0.20, unit: '%' },
    { key: 'U0', latex: 'U_0', labelKey: 'param.lr.U0', groupKey: 'group.lr.labor',
      min: 0, max: 100, step: 0.5, def1: 10, def2: 10, unit: '' },

    // ========================== Money & inflation (Ch. 8) ==========================
    { key: 'Mbar', latex: '\\bar{M}', labelKey: 'param.lr.Mbar', groupKey: 'group.lr.money',
      min: 10, max: 2000, step: 10, def1: 200, def2: 200, unit: '' },
    { key: 'Vbar', latex: '\\bar{V}', labelKey: 'param.lr.Vbar', groupKey: 'group.lr.money',
      min: 0.5, max: 20, step: 0.5, def1: 5, def2: 5, unit: '' },
    { key: 'gM', latex: '\\bar{g}_M', labelKey: 'param.lr.gM', groupKey: 'group.lr.money',
      min: -0.05, max: 0.30, step: 0.005, def1: 0.07, def2: 0.07, unit: '%' },
    { key: 'gV', latex: '\\bar{g}_V', labelKey: 'param.lr.gV', groupKey: 'group.lr.money',
      min: -0.05, max: 0.10, step: 0.005, def1: 0.0, def2: 0.0, unit: '%' },
  ],

  compute(p) {
    const {
      Abar, Lbar, alpha, sbar, dbar, nbar, K0,
      tau, eta, LbarS, sbarSep, fbar, U0,
      Mbar, Vbar, gM, gV,
    } = p;

    // ================= Growth (Solow), general α, with population growth =========
    const eff = nbar + dbar; // effective capital-widening rate (dep + pop growth)
    const kStar = Math.pow((sbar * Abar) / eff, 1 / (1 - alpha));
    const yStar = Abar * Math.pow(kStar, alpha);
    const cStar = (1 - sbar) * yStar;
    // Steady-state real interest rate / MPK = α·(n̄+d̄)/s̄ (independent of Ā).
    const Rstar = (alpha * eff) / sbar;
    const wStarMPL = (1 - alpha) * Abar * Math.pow(kStar, alpha); // MPL at k*
    const kyRatio = sbar / eff; // K*/Y* = k*/y* = s̄/(n̄+d̄)

    // Aggregate steady-state levels (per-person constant; aggregates grow at n̄).
    const Kstar = kStar * Lbar; // <-- feeds Ch. 7 labor demand
    const Ystar = yStar * Lbar; // <-- feeds Ch. 8 quantity theory (Ȳ = Y*)
    const Cstar = cStar * Lbar;

    // --- Solow transition dynamics from k0 = K0/L (per-person form) ---
    const k0 = K0 / Lbar;
    const tSolow = [];
    const kSeries = [];
    const ySeries = [];
    const cSeries = [];
    const iSeries = [];
    const netInv = []; // Δk_{t+1} = s̄·y_t − (n̄+d̄)·k_t
    const gk = []; // growth rate of k
    const gy = []; // growth rate of y = α·g_k
    let kt = k0;
    for (let i = 0; i <= T_SOLOW; i++) {
      const yt = Abar * Math.pow(kt, alpha);
      const invPP = sbar * yt;
      const net = invPP - eff * kt;
      const gkt = kt > 0 ? net / kt : 0;
      tSolow.push(i);
      kSeries.push(kt);
      ySeries.push(yt);
      cSeries.push((1 - sbar) * yt);
      iSeries.push(invPP);
      netInv.push(net);
      gk.push(gkt);
      gy.push(alpha * gkt);
      kt = kt + net;
    }

    // --- Solow-diagram schedules over a grid of k (ONE combined diagram) ---
    const kMax = 1.6 * Math.max(kStar, k0, 1e-6);
    const kGrid = [];
    const yCurve = []; // output per person       y(k)  = Ā·k^α
    const sYcurve = []; // investment per person   i(k)  = s̄·Ā·k^α
    const dKcurve = []; // break-even line         (n̄+d̄)·k
    for (let i = 0; i <= GRID_N; i++) {
      const k = (kMax * i) / GRID_N;
      const yk = Abar * Math.pow(k, alpha);
      kGrid.push(k);
      yCurve.push(yk);
      sYcurve.push(sbar * yk);
      dKcurve.push(eff * k);
    }

    // ============================ Labor market (Ch. 7) ============================
    // Labor demand uses the Solow steady-state aggregate capital K* (linkage).
    const { wStar, Lstar } = solveWage(alpha, Abar, Kstar, tau, eta, LbarS);
    const wNet = (1 - tau) * wStar;

    const Lmax = 2 * Lstar;
    const Lmin = Math.max(0.05 * Lstar, 1e-6);
    const LGrid = [];
    const wDemand = [];
    const wSupply = [];
    for (let i = 0; i <= GRID_N; i++) {
      const L = Lmin + ((Lmax - Lmin) * i) / GRID_N;
      LGrid.push(L);
      wDemand.push((1 - alpha) * Abar * Math.pow(Kstar / L, alpha));
      wSupply.push(Math.pow(L / LbarS, 1 / eta) / (1 - tau));
    }

    // --- Bathtub model (book eq. 7.2–7.4); labor force = shared L̄ ---
    const uStar = sbarSep / (sbarSep + fbar);
    const Ustar = uStar * Lbar;
    const Estar = Lbar - Ustar;

    const U0c = Math.min(Math.max(U0, 0), Lbar);
    const tBath = [];
    const U = [];
    const E = [];
    const u = [];
    let Ut = U0c;
    for (let i = 0; i <= T_SOLOW; i++) {
      tBath.push(i);
      U.push(Ut);
      E.push(Lbar - Ut);
      u.push(Ut / Lbar);
      Ut = Ut + sbarSep * (Lbar - Ut) - fbar * Ut;
    }

    const UGrid = [];
    const inflow = [];
    const outflow = [];
    for (let i = 0; i <= GRID_N; i++) {
      const Ux = (Lbar * i) / GRID_N;
      UGrid.push(Ux);
      inflow.push(sbarSep * (Lbar - Ux));
      outflow.push(fbar * Ux);
    }

    // ========================== Money & inflation (Ch. 8) ==========================
    // Classical dichotomy: Ȳ = Y* (Solow), real-output growth g_Y = n̄.
    const Ybar = Ystar;
    const gY = nbar;
    const Rfisher = Rstar; // Fisher real rate = Solow steady-state MPK (§8.3 link)

    const Pstar = (Mbar * Vbar) / Ybar; // eq. (8.2)
    // Book's additive approximations (displayed scalars, book-consistent):
    const pi = gM + gV - gY; // π ≈ g_M + g_V − g_Y
    const iNom = Rfisher + pi; // i ≈ R + π (Fisher)
    // Exact identities (for comparison / the note):
    const piExact = ((1 + gM) * (1 + gV)) / (1 + gY) - 1;
    const iExact = (1 + Rfisher) * (1 + pi) - 1;
    const realBalances = Ybar / Vbar; // M/P = Y/V
    const inflTax = gM / Vbar; // seignorage / GDP = g_M/V

    // --- Time paths: M, V, Y grow at constant rates; P from quantity eq. ---
    const tMoney = [];
    const M = [];
    const Yp = [];
    const P = [];
    const piPath = [];
    let Mt = Mbar;
    let Vt = Vbar;
    let Yt = Ybar;
    let Pprev = null;
    for (let i = 0; i <= T_MONEY; i++) {
      const Pt = (Mt * Vt) / Yt;
      tMoney.push(i);
      M.push(Mt);
      Yp.push(Yt);
      P.push(Pt);
      piPath.push(Pprev === null ? piExact : Pt / Pprev - 1);
      Pprev = Pt;
      Mt *= 1 + gM;
      Vt *= 1 + gV;
      Yt *= 1 + gY;
    }

    // --- π-vs-g_M theoretical line: π = g_M + g_V − g_Y over a grid of g_M ---
    const gMGrid = [];
    const piLine = [];
    const NL = 60;
    for (let i = 0; i <= NL; i++) {
      const g = -0.05 + ((GM_GRID_MAX + 0.05) * i) / NL;
      gMGrid.push(100 * g);
      piLine.push(100 * (g + gV - gY));
    }

    return {
      scalars: {
        // Growth
        kStar, yStar, cStar, Kstar, Ystar, Cstar, kyRatio, Rstar, wStarMPL,
        // Labor market
        wStar, wNet, Lstar, uStar, Ustar, Estar,
        // Money & inflation
        Pstar, pi, Rfisher, iNom, realBalances, inflTax,
      },
      series: {
        // Solow schedules + transition
        tSolow, k: kSeries, y: ySeries, c: cSeries, iInv: iSeries, netInv, gk, gy,
        kGrid, yCurve, sYcurve, dKcurve,
        // Labor market
        LGrid, wDemand, wSupply,
        tBath, U, E, u, UGrid, inflow, outflow,
        // Money & inflation
        tMoney, M, Yp, P, piPath, gMGrid, piLine,
      },
    };
  },

  scalars: [
    // ----- Growth (Solow) -----
    { key: 'kStar', latex: 'k^*', labelKey: 'scalar.lr.kStar', fmt: 'num', groupKey: 'group.lr.growth' },
    { key: 'yStar', latex: 'y^*', labelKey: 'scalar.lr.yStar', fmt: 'num', groupKey: 'group.lr.growth' },
    { key: 'cStar', latex: 'c^*', labelKey: 'scalar.lr.cStar', fmt: 'num', groupKey: 'group.lr.growth' },
    { key: 'Kstar', latex: 'K^*', labelKey: 'scalar.lr.Kstar', fmt: 'num', groupKey: 'group.lr.growth' },
    { key: 'Ystar', latex: 'Y^*', labelKey: 'scalar.lr.Ystar', fmt: 'num', groupKey: 'group.lr.growth' },
    { key: 'Cstar', latex: 'C^*', labelKey: 'scalar.lr.Cstar', fmt: 'num', groupKey: 'group.lr.growth' },
    { key: 'kyRatio', latex: 'K^*/Y^*', labelKey: 'scalar.lr.kyRatio', fmt: 'num', groupKey: 'group.lr.growth' },
    { key: 'Rstar', latex: 'R^* = MPK', labelKey: 'scalar.lr.Rstar', fmt: 'pct', groupKey: 'group.lr.growth' },
    { key: 'wStarMPL', latex: 'w^*_{\\text{Solow}}', labelKey: 'scalar.lr.wStarMPL', fmt: 'num', groupKey: 'group.lr.growth' },
    // ----- Labor market -----
    { key: 'wStar', latex: 'w^*', labelKey: 'scalar.lr.wStar', fmt: 'num', groupKey: 'group.lr.labor' },
    { key: 'wNet', latex: '(1-\\tau)w^*', labelKey: 'scalar.lr.wNet', fmt: 'num', groupKey: 'group.lr.labor' },
    { key: 'Lstar', latex: 'L^*', labelKey: 'scalar.lr.Lstar', fmt: 'num', groupKey: 'group.lr.labor' },
    { key: 'uStar', latex: 'u^*', labelKey: 'scalar.lr.uStar', fmt: 'pct', groupKey: 'group.lr.labor' },
    { key: 'Ustar', latex: 'U^*', labelKey: 'scalar.lr.Ustar', fmt: 'num', groupKey: 'group.lr.labor' },
    { key: 'Estar', latex: 'E^*', labelKey: 'scalar.lr.Estar', fmt: 'num', groupKey: 'group.lr.labor' },
    // ----- Money & inflation -----
    { key: 'Pstar', latex: 'P^*', labelKey: 'scalar.lr.Pstar', fmt: 'num', groupKey: 'group.lr.money' },
    { key: 'pi', latex: '\\pi^*', labelKey: 'scalar.lr.pi', fmt: 'pct', groupKey: 'group.lr.money' },
    { key: 'Rfisher', latex: 'R', labelKey: 'scalar.lr.Rfisher', fmt: 'pct', groupKey: 'group.lr.money' },
    { key: 'iNom', latex: 'i', labelKey: 'scalar.lr.iNom', fmt: 'pct', groupKey: 'group.lr.money' },
    { key: 'realBalances', latex: 'M/P', labelKey: 'scalar.lr.realBalances', fmt: 'num', groupKey: 'group.lr.money' },
    { key: 'inflTax', latex: '\\bar{g}_M/\\bar{V}', labelKey: 'scalar.lr.inflTax', fmt: 'pct', groupKey: 'group.lr.money' },
  ],

  plots: [
    // ============================ Growth (Solow) ============================
    {
      id: 'solow-diagram',
      titleKey: 'plot.lr.solowDiagram',
      xLabelKey: 'axis.lr.k', yLabelKey: 'axis.lr.solowY',
      kind: 'curves',
      groupKey: 'group.lr.growth',
      build(out1, out2, p1, p2, t) {
        // ONE Solow diagram: output y(k), investment s̄·y(k), break-even (n̄+d̄)·k,
        // plus the steady-state point (k*, i(k*)) — three curves per scenario.
        const traces = [];
        const add = (out, p, scen) => {
          traces.push({ x: out.series.kGrid, y: out.series.yCurve,
            name: `${t('trace.lr.prod')} (${scen})`, scenario: scen });
          traces.push({ x: out.series.kGrid, y: out.series.sYcurve,
            name: `${t('trace.lr.inv')} (${scen})`, scenario: scen, dash: 'dash', role: 'aux' });
          traces.push({ x: out.series.kGrid, y: out.series.dKcurve,
            name: `${t('trace.lr.dep')} (${scen})`, scenario: scen, dash: 'dot', role: 'aux' });
          traces.push({ x: [out.scalars.kStar], y: [p.sbar * out.scalars.yStar],
            name: `${t('trace.lr.ss')} (${scen})`, scenario: scen,
            mode: 'markers', marker: { size: 9 } });
        };
        add(out1, p1, 1);
        add(out2, p2, 2);
        return { traces };
      },
    },
    {
      id: 'capital-time',
      titleKey: 'plot.lr.capitalTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.lr.kPerPerson',
      kind: 'series',
      groupKey: 'group.lr.growth',
      build(out1, out2) {
        const last1 = out1.series.tSolow[out1.series.tSolow.length - 1];
        const last2 = out2.series.tSolow[out2.series.tSolow.length - 1];
        return {
          traces: [
            { x: out1.series.tSolow, y: out1.series.k, name: `k_t (1)`, scenario: 1 },
            { x: out2.series.tSolow, y: out2.series.k, name: `k_t (2)`, scenario: 2 },
            { x: [0, last1], y: [out1.scalars.kStar, out1.scalars.kStar],
              name: `k^* (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, last2], y: [out2.scalars.kStar, out2.scalars.kStar],
              name: `k^* (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'output-time',
      titleKey: 'plot.lr.outputTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.lr.yPerPerson',
      kind: 'series',
      groupKey: 'group.lr.growth',
      build(out1, out2) {
        // Output per person over time WITH the steady-state y* reference line
        // (same style as the capital-per-person plot's k* line).
        const last1 = out1.series.tSolow[out1.series.tSolow.length - 1];
        const last2 = out2.series.tSolow[out2.series.tSolow.length - 1];
        return {
          traces: [
            { x: out1.series.tSolow, y: out1.series.y, name: `y_t (1)`, scenario: 1 },
            { x: out2.series.tSolow, y: out2.series.y, name: `y_t (2)`, scenario: 2 },
            { x: [0, last1], y: [out1.scalars.yStar, out1.scalars.yStar],
              name: `y^* (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, last2], y: [out2.scalars.yStar, out2.scalars.yStar],
              name: `y^* (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
          layout: { yaxis: { type: 'log' } },
        };
      },
    },
    {
      id: 'k-growth-distance',
      titleKey: 'plot.lr.kGrowthDistance',
      xLabelKey: 'axis.lr.kPerPerson', yLabelKey: 'axis.lr.growthk',
      kind: 'series',
      groupKey: 'group.lr.growth',
      build(out1, out2) {
        // Principle of transition dynamics: growth rate of k vs. its level.
        return {
          traces: [
            { x: out1.series.k, y: out1.series.gk, name: `g_k (1)`, scenario: 1 },
            { x: out2.series.k, y: out2.series.gk, name: `g_k (2)`, scenario: 2 },
            { x: [out1.scalars.kStar], y: [0], name: `k^* (1)`, scenario: 1,
              mode: 'markers', marker: { size: 9 } },
            { x: [out2.scalars.kStar], y: [0], name: `k^* (2)`, scenario: 2,
              mode: 'markers', marker: { size: 9 } },
          ],
        };
      },
    },
    {
      id: 'y-growth-distance',
      titleKey: 'plot.lr.yGrowthDistance',
      xLabelKey: 'axis.lr.yPerPerson', yLabelKey: 'axis.lr.growthy',
      kind: 'series',
      groupKey: 'group.lr.growth',
      build(out1, out2) {
        // Transition dynamics for OUTPUT per person: growth rate of y vs. level
        // of y (mirrors the k version; g_y = α·g_k).
        return {
          traces: [
            { x: out1.series.y, y: out1.series.gy, name: `g_y (1)`, scenario: 1 },
            { x: out2.series.y, y: out2.series.gy, name: `g_y (2)`, scenario: 2 },
            { x: [out1.scalars.yStar], y: [0], name: `y^* (1)`, scenario: 1,
              mode: 'markers', marker: { size: 9 } },
            { x: [out2.scalars.yStar], y: [0], name: `y^* (2)`, scenario: 2,
              mode: 'markers', marker: { size: 9 } },
          ],
        };
      },
    },

    // ============================ Labor market (Ch. 7) ============================
    {
      id: 'labor-market',
      titleKey: 'plot.lr.laborMarket',
      xLabelKey: 'axis.lr.L', yLabelKey: 'axis.lr.w',
      kind: 'curves',
      groupKey: 'group.lr.labor',
      build(out1, out2, p1, p2, t) {
        const traces = [];
        const add = (out, scen) => {
          traces.push({ x: out.series.LGrid, y: out.series.wDemand,
            name: `${t('trace.lr.Ld')} (${scen})`, scenario: scen });
          traces.push({ x: out.series.LGrid, y: out.series.wSupply,
            name: `${t('trace.lr.Ls')} (${scen})`, scenario: scen, dash: 'dash', role: 'aux' });
          traces.push({ x: [out.scalars.Lstar], y: [out.scalars.wStar],
            name: `${t('trace.lr.eq')} (${scen})`, scenario: scen,
            mode: 'markers', marker: { size: 9 } });
        };
        add(out1, 1);
        add(out2, 2);
        return { traces };
      },
    },
    {
      id: 'bathtub-flows',
      titleKey: 'plot.lr.bathtubFlows',
      xLabelKey: 'axis.lr.U', yLabelKey: 'axis.lr.flows',
      kind: 'curves',
      groupKey: 'group.lr.labor',
      build(out1, out2, p1, p2, t) {
        const traces = [];
        const add = (out, p, scen) => {
          traces.push({ x: out.series.UGrid, y: out.series.inflow,
            name: `${t('trace.lr.inflow')} (${scen})`, scenario: scen });
          traces.push({ x: out.series.UGrid, y: out.series.outflow,
            name: `${t('trace.lr.outflow')} (${scen})`, scenario: scen, dash: 'dash', role: 'aux' });
          traces.push({ x: [out.scalars.Ustar], y: [p.fbar * out.scalars.Ustar],
            name: `${t('trace.lr.ssU')} (${scen})`, scenario: scen,
            mode: 'markers', marker: { size: 9 } });
        };
        add(out1, p1, 1);
        add(out2, p2, 2);
        return { traces };
      },
    },
    {
      id: 'urate-time',
      titleKey: 'plot.lr.urateTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.lr.urate',
      kind: 'series',
      groupKey: 'group.lr.labor',
      build(out1, out2) {
        const pc = (arr) => arr.map((v) => 100 * v);
        const last1 = out1.series.tBath[out1.series.tBath.length - 1];
        const last2 = out2.series.tBath[out2.series.tBath.length - 1];
        return {
          traces: [
            { x: out1.series.tBath, y: pc(out1.series.u), name: `u_t (1)`, scenario: 1 },
            { x: out2.series.tBath, y: pc(out2.series.u), name: `u_t (2)`, scenario: 2 },
            { x: [0, last1], y: [100 * out1.scalars.uStar, 100 * out1.scalars.uStar],
              name: `u^* (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, last2], y: [100 * out2.scalars.uStar, 100 * out2.scalars.uStar],
              name: `u^* (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },

    // ========================== Money & inflation (Ch. 8) ==========================
    {
      id: 'price-time',
      titleKey: 'plot.lr.priceTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.lr.P',
      kind: 'series',
      groupKey: 'group.lr.money',
      build(out1, out2) {
        return {
          traces: [
            { x: out1.series.tMoney, y: out1.series.P, name: `P_t (1)`, scenario: 1 },
            { x: out2.series.tMoney, y: out2.series.P, name: `P_t (2)`, scenario: 2 },
          ],
          layout: { yaxis: { type: 'log' } },
        };
      },
    },
    {
      id: 'pi-vs-gm',
      titleKey: 'plot.lr.piVsGm',
      xLabelKey: 'axis.lr.gM', yLabelKey: 'axis.lr.piPct',
      kind: 'curves',
      groupKey: 'group.lr.money',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gMGrid, y: out1.series.piLine,
              name: `${t('trace.lr.qtLine')} (1)`, scenario: 1 },
            { x: out2.series.gMGrid, y: out2.series.piLine,
              name: `${t('trace.lr.qtLine')} (2)`, scenario: 2, dash: 'dash' },
            { x: [100 * p1.gM], y: [100 * out1.scalars.pi],
              name: `${t('trace.lr.point')} (1)`, scenario: 1,
              mode: 'markers', marker: { size: 9 } },
            { x: [100 * p2.gM], y: [100 * out2.scalars.pi],
              name: `${t('trace.lr.point')} (2)`, scenario: 2,
              mode: 'markers', marker: { size: 9 } },
          ],
        };
      },
    },
    {
      id: 'fisher-bars',
      titleKey: 'plot.lr.fisherBars',
      xLabelKey: 'axis.lr.fisherComp', yLabelKey: 'axis.lr.ratePct',
      kind: 'bars',
      groupKey: 'group.lr.money',
      build(out1, out2, p1, p2, t) {
        // NON-time grouped bar chart: real rate R, inflation π and nominal rate
        // i for Set 1 and Set 2. Explicit type:'bar' so styleTrace does not turn
        // it into a scatter; marker color carried via the scenario convention.
        const cats = [t('trace.lr.rReal'), t('trace.lr.piBar'), t('trace.lr.iNom')];
        const vals1 = [100 * out1.scalars.Rfisher, 100 * out1.scalars.pi, 100 * out1.scalars.iNom];
        const vals2 = [100 * out2.scalars.Rfisher, 100 * out2.scalars.pi, 100 * out2.scalars.iNom];
        return {
          traces: [
            { type: 'bar', x: cats, y: vals1, name: t('table.set1'), scenario: 1 },
            { type: 'bar', x: cats, y: vals2, name: t('table.set2'), scenario: 2 },
          ],
          layout: { barmode: 'group' },
        };
      },
    },
  ],

  equations: [
    { headingKey: 'eqgroup.lr.growth' },
    'Y_t = \\bar{A}\\, K_t^{\\alpha} L_t^{1-\\alpha}',
    '\\Delta k_{t+1} = \\bar{s}\\,\\bar{A}\\,k_t^{\\alpha} - (\\bar{n}+\\bar{d})\\,k_t',
    'k^* = \\left(\\dfrac{\\bar{s}\\bar{A}}{\\bar{n}+\\bar{d}}\\right)^{\\frac{1}{1-\\alpha}}\\qquad y^* = \\bar{A}^{\\frac{1}{1-\\alpha}}\\left(\\dfrac{\\bar{s}}{\\bar{n}+\\bar{d}}\\right)^{\\frac{\\alpha}{1-\\alpha}}',
    'R^* = \\text{MPK} = \\alpha\\,\\dfrac{\\bar{n}+\\bar{d}}{\\bar{s}}\\qquad \\dfrac{K^*}{Y^*}=\\dfrac{\\bar{s}}{\\bar{n}+\\bar{d}}',

    { headingKey: 'eqgroup.lr.labor' },
    'w = \\text{MPL} = (1-\\alpha)\\,\\bar{A}\\left(\\dfrac{K^*}{L}\\right)^{\\alpha}',
    'L^s = \\bar{\\ell}\\,\\big[(1-\\tau)\\,w\\big]^{\\eta}\\quad\\text{(proposed form)}',
    'E_t + U_t = \\bar{L}\\qquad \\Delta U_{t+1} = \\bar{s}_{\\text{sep}}\\,E_t - \\bar{f}\\,U_t\\qquad u^* = \\dfrac{\\bar{s}_{\\text{sep}}}{\\bar{f}+\\bar{s}_{\\text{sep}}}',

    { headingKey: 'eqgroup.lr.money' },
    'M_t \\bar{V} = P_t \\bar{Y}_t\\qquad P_t^* = \\dfrac{\\bar{M}_t\\,\\bar{V}}{\\bar{Y}_t}\\qquad \\bar{Y}=Y^*',
    '\\pi^* \\approx \\bar{g}_M + \\bar{g}_V - \\bar{g}_Y\\quad(\\bar{g}_Y=\\bar{n})\\qquad\\text{exact: } (1+\\pi)=\\dfrac{(1+\\bar{g}_M)(1+\\bar{g}_V)}{1+\\bar{g}_Y}',
    'i \\approx R + \\pi\\qquad\\text{exact: } (1+i)=(1+R)(1+\\pi)\\qquad R = R^*=\\text{MPK}',
    '\\dfrac{\\Delta M}{P\\,Y} = \\dfrac{\\bar{g}_M}{\\bar{V}}\\qquad\\text{(inflation tax)}',
  ],


  strings: {
    en: {
      'model.longrun.title': 'The Long-Run Model — Growth, Labor & Inflation (integrated)',

      // group headers
      'group.lr.growth': 'Growth (Solow)',
      'group.lr.labor': 'Labor market',
      'group.lr.money': 'Money & inflation',
      'eqgroup.lr.growth': 'Growth (Solow)',
      'eqgroup.lr.labor': 'Labor market',
      'eqgroup.lr.money': 'Money & inflation',

      // parameters
      'param.lr.Abar': 'Total factor productivity Ā (shared across growth & labor demand)',
      'param.lr.Lbar': 'Labor force / population L̄ (shared: Solow aggregates & bathtub)',
      'param.lr.alpha': 'Capital share α (labor share 1−α; shared; book default 1/3)',
      'param.lr.sbar': 'Investment (saving) rate s̄ — fraction of output invested each period',
      'param.lr.dbar': 'Depreciation rate d̄ — fraction of capital that wears out each period',
      'param.lr.nbar': 'Population growth rate n̄ (also sets aggregate output growth g_Y)',
      'param.lr.K0': 'Initial capital stock K₀ (start of the Solow transition)',
      'param.lr.tau': 'Labor income tax rate τ (workers keep (1−τ)·w)',
      'param.lr.eta': 'Wage elasticity of labor supply η (proposed parametrization)',
      'param.lr.LbarS': 'Labor-supply scale (workers supplied at a net wage of 1; proposed)',
      'param.lr.sbarSep': 'Job separation rate s̄_sep — share of the employed who lose their job each period',
      'param.lr.fbar': 'Job finding rate f̄ — share of the unemployed who find a job each period',
      'param.lr.U0': 'Initial number of unemployed U₀ (start of the bathtub transition)',
      'param.lr.Mbar': 'Money supply M̄ (initial level)',
      'param.lr.Vbar': 'Velocity of money V̄ (constant)',
      'param.lr.gM': 'Money growth rate ḡ_M (central-bank policy)',
      'param.lr.gV': 'Velocity growth rate ḡ_V (0 in the book’s baseline)',

      // scalars
      'scalar.lr.kStar': 'Steady-state capital per person',
      'scalar.lr.yStar': 'Steady-state output per person',
      'scalar.lr.cStar': 'Steady-state consumption per person',
      'scalar.lr.Kstar': 'Steady-state capital (aggregate) — feeds labor demand',
      'scalar.lr.Ystar': 'Steady-state output (aggregate) — feeds the quantity theory (Ȳ)',
      'scalar.lr.Cstar': 'Steady-state consumption (aggregate)',
      'scalar.lr.kyRatio': 'Capital–output ratio K*/Y*',
      'scalar.lr.Rstar': 'Real interest rate = MPK (feeds the Fisher equation)',
      'scalar.lr.wStarMPL': 'Wage (MPL) at the Solow steady state',
      'scalar.lr.wStar': 'Equilibrium wage paid by firms',
      'scalar.lr.wNet': 'Net (take-home) wage after the tax',
      'scalar.lr.Lstar': 'Equilibrium employment',
      'scalar.lr.uStar': 'Natural rate of unemployment',
      'scalar.lr.Ustar': 'Steady-state unemployment (level)',
      'scalar.lr.Estar': 'Steady-state employment (level)',
      'scalar.lr.Pstar': 'Price level',
      'scalar.lr.pi': 'Inflation rate (≈ ḡ_M + ḡ_V − ḡ_Y)',
      'scalar.lr.Rfisher': 'Real interest rate R (= Solow MPK)',
      'scalar.lr.iNom': 'Nominal interest rate (Fisher, i ≈ R + π)',
      'scalar.lr.realBalances': 'Real money balances M/P',
      'scalar.lr.inflTax': 'Inflation tax (share of GDP)',

      // plot titles
      'plot.lr.solowDiagram': 'The Solow diagram (output, investment, break-even)',
      'plot.lr.capitalTime': 'Capital per person over time',
      'plot.lr.outputTime': 'Output per person over time (log scale)',
      'plot.lr.kGrowthDistance': 'Transition dynamics: growth of k vs. its level',
      'plot.lr.yGrowthDistance': 'Transition dynamics: growth of y vs. its level',
      'plot.lr.laborMarket': 'Labor supply and demand (demand at K*)',
      'plot.lr.bathtubFlows': 'Bathtub model: job separations vs. job finding',
      'plot.lr.urateTime': 'Unemployment rate over time',
      'plot.lr.priceTime': 'Price level over time (log scale)',
      'plot.lr.piVsGm': 'Inflation vs. money growth (quantity theory line)',
      'plot.lr.fisherBars': 'Fisher decomposition: real rate, inflation, nominal rate',

      // axes
      'axis.time': 'Time (periods)',
      'axis.lr.k': 'Capital per person, k',
      'axis.lr.kPerPerson': 'Capital per person, k',
      'axis.lr.yPerPerson': 'Output per person, y',
      'axis.lr.solowY': 'Output, investment, break-even (per person)',
      'axis.lr.growthk': 'Growth rate of k',
      'axis.lr.growthy': 'Growth rate of y',
      'axis.lr.L': 'Employment, L',
      'axis.lr.w': 'Wage, w',
      'axis.lr.U': 'Unemployed, U',
      'axis.lr.flows': 'Flows into / out of unemployment',
      'axis.lr.urate': 'Unemployment rate (%)',
      'axis.lr.P': 'Price level, P',
      'axis.lr.gM': 'Money growth rate (%)',
      'axis.lr.piPct': 'Inflation rate (%)',
      'axis.lr.ratePct': 'Rate (%)',
      'axis.lr.fisherComp': 'Component',

      // traces
      'trace.lr.prod': 'Output y(k)',
      'trace.lr.inv': 'Investment s̄·y(k)',
      'trace.lr.dep': 'Break-even (n̄+d̄)·k',
      'trace.lr.ss': 'Steady state',
      'trace.lr.Ld': 'Labor demand (MPL at K*)',
      'trace.lr.Ls': 'Labor supply',
      'trace.lr.eq': 'Equilibrium (L*, w*)',
      'trace.lr.inflow': 'Separations s̄_sep·E',
      'trace.lr.outflow': 'Job finding f̄·U',
      'trace.lr.ssU': 'Steady state U*',
      'trace.lr.qtLine': 'π = g_M + g_V − g_Y',
      'trace.lr.point': 'Current (g_M, π)',
      'trace.lr.rReal': 'Real rate R',
      'trace.lr.piBar': 'Inflation π',
      'trace.lr.iNom': 'Nominal rate i',

    },
    es: {
      'model.longrun.title': 'El modelo de largo plazo — Crecimiento, trabajo e inflación (integrado)',

      'group.lr.growth': 'Crecimiento (Solow)',
      'group.lr.labor': 'Mercado laboral',
      'group.lr.money': 'Dinero e inflación',
      'eqgroup.lr.growth': 'Crecimiento (Solow)',
      'eqgroup.lr.labor': 'Mercado laboral',
      'eqgroup.lr.money': 'Dinero e inflación',

      'param.lr.Abar': 'Productividad total de los factores Ā (compartida: crecimiento y demanda de trabajo)',
      'param.lr.Lbar': 'Fuerza laboral / población L̄ (compartida: agregados de Solow y bañera)',
      'param.lr.alpha': 'Participación del capital α (participación del trabajo 1−α; compartida; valor del libro 1/3)',
      'param.lr.sbar': 'Tasa de ahorro (inversión) s̄ — fracción del producto que se invierte cada período',
      'param.lr.dbar': 'Tasa de depreciación d̄ — fracción del capital que se desgasta cada período',
      'param.lr.nbar': 'Tasa de crecimiento poblacional n̄ (también fija el crecimiento agregado g_Y)',
      'param.lr.K0': 'Acervo inicial de capital K₀ (inicio de la transición de Solow)',
      'param.lr.tau': 'Tasa de impuesto al ingreso laboral τ (los trabajadores reciben (1−τ)·w)',
      'param.lr.eta': 'Elasticidad de la oferta laboral al salario η (parametrización propuesta)',
      'param.lr.LbarS': 'Escala de la oferta laboral (trabajo ofrecido con salario neto igual a 1; propuesta)',
      'param.lr.sbarSep': 'Tasa de separación laboral s̄_sep — fracción de los empleados que pierde su empleo cada período',
      'param.lr.fbar': 'Tasa de consecución de empleo f̄ — fracción de los desempleados que encuentra empleo cada período',
      'param.lr.U0': 'Número inicial de desempleados U₀ (inicio de la transición de la bañera)',
      'param.lr.Mbar': 'Oferta monetaria M̄ (nivel inicial)',
      'param.lr.Vbar': 'Velocidad del dinero V̄ (constante)',
      'param.lr.gM': 'Tasa de crecimiento del dinero ḡ_M (política del banco central)',
      'param.lr.gV': 'Tasa de crecimiento de la velocidad ḡ_V (0 en el caso base del libro)',

      'scalar.lr.kStar': 'Capital por persona de estado estacionario',
      'scalar.lr.yStar': 'Producto por persona de estado estacionario',
      'scalar.lr.cStar': 'Consumo por persona de estado estacionario',
      'scalar.lr.Kstar': 'Capital de estado estacionario (agregado) — alimenta la demanda de trabajo',
      'scalar.lr.Ystar': 'Producto de estado estacionario (agregado) — alimenta la teoría cuantitativa (Ȳ)',
      'scalar.lr.Cstar': 'Consumo de estado estacionario (agregado)',
      'scalar.lr.kyRatio': 'Relación capital–producto K*/Y*',
      'scalar.lr.Rstar': 'Tasa de interés real = PMgK (alimenta la ecuación de Fisher)',
      'scalar.lr.wStarMPL': 'Salario (PMgL) en el estado estacionario de Solow',
      'scalar.lr.wStar': 'Salario de equilibrio pagado por las empresas',
      'scalar.lr.wNet': 'Salario neto (después del impuesto)',
      'scalar.lr.Lstar': 'Empleo de equilibrio',
      'scalar.lr.uStar': 'Tasa natural de desempleo',
      'scalar.lr.Ustar': 'Desempleo de estado estacionario (nivel)',
      'scalar.lr.Estar': 'Empleo de estado estacionario (nivel)',
      'scalar.lr.Pstar': 'Nivel de precios',
      'scalar.lr.pi': 'Tasa de inflación (≈ ḡ_M + ḡ_V − ḡ_Y)',
      'scalar.lr.Rfisher': 'Tasa de interés real R (= PMgK de Solow)',
      'scalar.lr.iNom': 'Tasa de interés nominal (Fisher, i ≈ R + π)',
      'scalar.lr.realBalances': 'Saldos monetarios reales M/P',
      'scalar.lr.inflTax': 'Impuesto inflacionario (proporción del PIB)',

      'plot.lr.solowDiagram': 'El diagrama de Solow (producto, inversión, reposición)',
      'plot.lr.capitalTime': 'Capital por persona en el tiempo',
      'plot.lr.outputTime': 'Producto por persona en el tiempo (escala logarítmica)',
      'plot.lr.kGrowthDistance': 'Dinámica de transición: crecimiento de k vs. su nivel',
      'plot.lr.yGrowthDistance': 'Dinámica de transición: crecimiento de y vs. su nivel',
      'plot.lr.laborMarket': 'Oferta y demanda de trabajo (demanda en K*)',
      'plot.lr.bathtubFlows': 'Modelo de la bañera: separaciones vs. consecución de empleo',
      'plot.lr.urateTime': 'Tasa de desempleo en el tiempo',
      'plot.lr.priceTime': 'Nivel de precios en el tiempo (escala logarítmica)',
      'plot.lr.piVsGm': 'Inflación vs. crecimiento del dinero (línea de la teoría cuantitativa)',
      'plot.lr.fisherBars': 'Descomposición de Fisher: tasa real, inflación, tasa nominal',

      'axis.time': 'Tiempo (períodos)',
      'axis.lr.k': 'Capital por persona, k',
      'axis.lr.kPerPerson': 'Capital por persona, k',
      'axis.lr.yPerPerson': 'Producto por persona, y',
      'axis.lr.solowY': 'Producto, inversión, reposición (por persona)',
      'axis.lr.growthk': 'Tasa de crecimiento de k',
      'axis.lr.growthy': 'Tasa de crecimiento de y',
      'axis.lr.L': 'Empleo, L',
      'axis.lr.w': 'Salario, w',
      'axis.lr.U': 'Desempleados, U',
      'axis.lr.flows': 'Flujos de entrada / salida del desempleo',
      'axis.lr.urate': 'Tasa de desempleo (%)',
      'axis.lr.P': 'Nivel de precios, P',
      'axis.lr.gM': 'Crecimiento del dinero (%)',
      'axis.lr.piPct': 'Tasa de inflación (%)',
      'axis.lr.ratePct': 'Tasa (%)',
      'axis.lr.fisherComp': 'Componente',

      'trace.lr.prod': 'Producto y(k)',
      'trace.lr.inv': 'Inversión s̄·y(k)',
      'trace.lr.dep': 'Reposición (n̄+d̄)·k',
      'trace.lr.ss': 'Estado estacionario',
      'trace.lr.Ld': 'Demanda de trabajo (PMgL en K*)',
      'trace.lr.Ls': 'Oferta de trabajo',
      'trace.lr.eq': 'Equilibrio (L*, w*)',
      'trace.lr.inflow': 'Separaciones s̄_sep·E',
      'trace.lr.outflow': 'Consecución f̄·U',
      'trace.lr.ssU': 'Estado estacionario U*',
      'trace.lr.qtLine': 'π = g_M + g_V − g_Y',
      'trace.lr.point': 'Punto actual (g_M, π)',
      'trace.lr.rReal': 'Tasa real R',
      'trace.lr.piBar': 'Inflación π',
      'trace.lr.iNom': 'Tasa nominal i',

    },
  },
};
