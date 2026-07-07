// solow.js [LONGRUN]
// Chapter 5 — The Solow Growth Model (Jones, Macroeconomics 6e).
// General-α Cobb-Douglas with default α = 1/3 (the book's baseline), including
// the Section 5.10 population-growth extension. Pure compute(), no DOM/i18n.
// See ARCHITECTURE.md (model module contract) and SPEC_LONGRUN.md Part 1.

const T_DEFAULT = 100;
const GRID_N = 120; // resolution of the Solow-diagram schedules

export default {
  id: 'solow',
  titleKey: 'model.solow.title',
  chapterLabel: 'Ch. 5',
  T: T_DEFAULT,

  params: [
    { key: 'sbar', latex: '\\bar{s}', labelKey: 'param.solow.sbar',
      min: 0.01, max: 0.60, step: 0.01, def1: 0.20, def2: 0.20, unit: '%' },
    { key: 'dbar', latex: '\\bar{d}', labelKey: 'param.solow.dbar',
      min: 0.01, max: 0.20, step: 0.01, def1: 0.10, def2: 0.10, unit: '%' },
    { key: 'Abar', latex: '\\bar{A}', labelKey: 'param.solow.Abar',
      min: 0.2, max: 3.0, step: 0.05, def1: 1.0, def2: 1.0, unit: '' },
    { key: 'alpha', latex: '\\alpha', labelKey: 'param.solow.alpha',
      min: 0.2, max: 0.5, step: 0.01, def1: 0.3333, def2: 0.3333, unit: '' },
    { key: 'Lbar', latex: '\\bar{L}', labelKey: 'param.solow.Lbar',
      min: 1, max: 1000, step: 1, def1: 100, def2: 100, unit: '' },
    { key: 'K0', latex: '\\bar{K}_0', labelKey: 'param.solow.K0',
      min: 1, max: 5000, step: 1, def1: 100, def2: 100, unit: '' },
    { key: 'nbar', latex: '\\bar{n}', labelKey: 'param.solow.nbar',
      min: -0.02, max: 0.05, step: 0.001, def1: 0.0, def2: 0.0, unit: '%' },
  ],

  compute(p) {
    const { sbar, dbar, Abar, alpha, Lbar, K0, nbar } = p;
    const eff = nbar + dbar; // effective "capital-widening" rate (dep + pop growth)

    // --- Steady state (per person), general α, with population growth ---
    // k* = (sbar*Abar/(nbar+dbar))^(1/(1-alpha))
    const kStar = Math.pow((sbar * Abar) / eff, 1 / (1 - alpha));
    const yStar = Abar * Math.pow(kStar, alpha);
    const cStar = (1 - sbar) * yStar;
    // Steady-state real interest rate / MPK = alpha*dbar/sbar (independent of Abar,
    // extended: alpha*(nbar+dbar)/sbar).  Book α=1/3, no-growth: dbar/(3*sbar).
    const Rstar = (alpha * eff) / sbar;
    const wStar = (1 - alpha) * Abar * Math.pow(kStar, alpha); // MPL at k*
    const kyRatio = sbar / eff; // K*/Y* = k*/y* = sbar/(nbar+dbar)

    // Aggregate steady-state levels (constant per-person; aggregates grow at nbar).
    const Kstar = kStar * Lbar;
    const Ystar = yStar * Lbar;
    const Cstar = cStar * Lbar;

    // --- Transition dynamics from k0 = K0/L0 (per person form) ---
    const T = T_DEFAULT;
    const k0 = K0 / Lbar;
    const t = [];
    const kSeries = [];
    const ySeries = [];
    const cSeries = [];
    const iSeries = [];
    const netInv = []; // Δk_{t+1} = sbar*y_t - (nbar+dbar)*k_t
    const gk = []; // growth rate of k
    let kt = k0;
    for (let i = 0; i <= T; i++) {
      const yt = Abar * Math.pow(kt, alpha);
      const invPP = sbar * yt;
      const net = invPP - eff * kt;
      t.push(i);
      kSeries.push(kt);
      ySeries.push(yt);
      cSeries.push((1 - sbar) * yt);
      iSeries.push(invPP);
      netInv.push(net);
      gk.push(kt > 0 ? net / kt : 0);
      kt = kt + net;
    }

    // --- Solow-diagram schedules over a grid of k ---
    // x-range up to ~1.6× the larger of k* and k0 so both fit comfortably.
    const kMax = 1.6 * Math.max(kStar, k0, 1e-6);
    const kGrid = [];
    const yCurve = []; // production per person   y(k)  = Abar*k^alpha
    const sYcurve = []; // investment per person   i(k)  = sbar*Abar*k^alpha
    const dKcurve = []; // break-even line         (n+d)*k
    for (let i = 0; i <= GRID_N; i++) {
      const k = (kMax * i) / GRID_N;
      kGrid.push(k);
      const yk = Abar * Math.pow(k, alpha);
      yCurve.push(yk);
      sYcurve.push(sbar * yk);
      dKcurve.push(eff * k);
    }

    return {
      scalars: {
        kStar, yStar, cStar, Kstar, Ystar, Cstar, Rstar, wStar, kyRatio,
      },
      series: {
        t, k: kSeries, y: ySeries, c: cSeries, i: iSeries, netInv, gk,
        kGrid, yCurve, sYcurve, dKcurve,
      },
    };
  },

  scalars: [
    { key: 'kStar', latex: 'k^*', labelKey: 'scalar.solow.kStar', fmt: 'num' },
    { key: 'yStar', latex: 'y^*', labelKey: 'scalar.solow.yStar', fmt: 'num' },
    { key: 'cStar', latex: 'c^*', labelKey: 'scalar.solow.cStar', fmt: 'num' },
    { key: 'Kstar', latex: 'K^*', labelKey: 'scalar.solow.Kstar', fmt: 'num' },
    { key: 'Ystar', latex: 'Y^*', labelKey: 'scalar.solow.Ystar', fmt: 'num' },
    { key: 'Cstar', latex: 'C^*', labelKey: 'scalar.solow.Cstar', fmt: 'num' },
    { key: 'kyRatio', latex: 'K^*/Y^*', labelKey: 'scalar.solow.kyRatio', fmt: 'num' },
    { key: 'Rstar', latex: 'R^*', labelKey: 'scalar.solow.Rstar', fmt: 'pct' },
    { key: 'wStar', latex: 'w^*', labelKey: 'scalar.solow.wStar', fmt: 'num' },
  ],

  plots: [
    {
      id: 'diagram',
      titleKey: 'plot.solow.diagram',
      xLabelKey: 'axis.solow.k', yLabelKey: 'axis.solow.invdep',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        const traces = [];
        const add = (out, p, scen) => {
          traces.push({ x: out.series.kGrid, y: out.series.sYcurve,
            name: `${t('trace.solow.inv')} (${scen})`, scenario: scen });
          traces.push({ x: out.series.kGrid, y: out.series.dKcurve,
            name: `${t('trace.solow.dep')} (${scen})`, scenario: scen, dash: 'dash', role: 'aux' });
          // Steady-state marker at (k*, i(k*)) where i(k*) = sbar*y* = (n+d)*k*.
          traces.push({ x: [out.scalars.kStar], y: [p.sbar * out.scalars.yStar],
            name: `${t('trace.solow.ss')} (${scen})`, scenario: scen,
            mode: 'markers', marker: { size: 9 } });
        };
        add(out1, p1, 1);
        add(out2, p2, 2);
        return { traces };
      },
    },
    {
      id: 'diagram-output',
      titleKey: 'plot.solow.diagramOutput',
      xLabelKey: 'axis.solow.k', yLabelKey: 'axis.solow.output',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        const traces = [];
        const add = (out, p, scen) => {
          traces.push({ x: out.series.kGrid, y: out.series.yCurve,
            name: `${t('trace.solow.prod')} (${scen})`, scenario: scen });
          traces.push({ x: out.series.kGrid, y: out.series.sYcurve,
            name: `${t('trace.solow.inv')} (${scen})`, scenario: scen, dash: 'dash', role: 'aux' });
          traces.push({ x: [out.scalars.kStar], y: [out.scalars.yStar],
            name: `${t('trace.solow.ssOut')} (${scen})`, scenario: scen,
            mode: 'markers', marker: { size: 9 } });
        };
        add(out1, p1, 1);
        add(out2, p2, 2);
        return { traces };
      },
    },
    {
      id: 'output-time',
      titleKey: 'plot.solow.outputTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.solow.yPerPerson',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.t, y: out1.series.y, name: `y_t (1)`, scenario: 1 },
            { x: out2.series.t, y: out2.series.y, name: `y_t (2)`, scenario: 2 },
          ],
          layout: { yaxis: { type: 'log' } },
        };
      },
    },
    {
      id: 'capital-time',
      titleKey: 'plot.solow.capitalTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.solow.kPerPerson',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.t, y: out1.series.k, name: `k_t (1)`, scenario: 1 },
            { x: out2.series.t, y: out2.series.k, name: `k_t (2)`, scenario: 2 },
            { x: [0, out1.series.t[out1.series.t.length - 1]],
              y: [out1.scalars.kStar, out1.scalars.kStar],
              name: `k^* (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, out2.series.t[out2.series.t.length - 1]],
              y: [out2.scalars.kStar, out2.scalars.kStar],
              name: `k^* (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'growth-distance',
      titleKey: 'plot.solow.growthDistance',
      xLabelKey: 'axis.solow.kPerPerson', yLabelKey: 'axis.solow.growthk',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
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
  ],

  equations: [
    'Y_t = \\bar{A}\\, K_t^{\\alpha} L_t^{1-\\alpha}',
    '\\Delta k_{t+1} = \\bar{s}\\,\\bar{A}\\,k_t^{\\alpha} - (\\bar{n}+\\bar{d})\\,k_t',
    'k^* = \\left(\\dfrac{\\bar{s}\\bar{A}}{\\bar{n}+\\bar{d}}\\right)^{\\frac{1}{1-\\alpha}}',
    'y^* = \\bar{A}^{\\frac{1}{1-\\alpha}}\\left(\\dfrac{\\bar{s}}{\\bar{n}+\\bar{d}}\\right)^{\\frac{\\alpha}{1-\\alpha}}',
    'R^* = \\alpha\\,\\dfrac{\\bar{n}+\\bar{d}}{\\bar{s}}\\qquad \\dfrac{K^*}{Y^*}=\\dfrac{\\bar{s}}{\\bar{n}+\\bar{d}}',
  ],

  noteKey: 'model.solow.note',

  strings: {
    en: {
      'model.solow.title': 'Solow Growth Model',
      'param.solow.sbar': 'Investment (saving) rate — fraction of output invested each period',
      'param.solow.dbar': 'Depreciation rate — fraction of capital that wears out each period',
      'param.solow.Abar': 'Total factor productivity (TFP)',
      'param.solow.alpha': 'Capital share α (output elasticity of capital; book default 1/3)',
      'param.solow.Lbar': 'Labor force / population (constant)',
      'param.solow.K0': 'Initial capital stock K₀ (start of transition)',
      'param.solow.nbar': 'Population growth rate (Section 5.10 extension; 0 = no growth)',
      'scalar.solow.kStar': 'Steady-state capital per person',
      'scalar.solow.yStar': 'Steady-state output per person',
      'scalar.solow.cStar': 'Steady-state consumption per person',
      'scalar.solow.Kstar': 'Steady-state capital stock (aggregate)',
      'scalar.solow.Ystar': 'Steady-state output (aggregate)',
      'scalar.solow.Cstar': 'Steady-state consumption (aggregate)',
      'scalar.solow.kyRatio': 'Capital–output ratio K*/Y*',
      'scalar.solow.Rstar': 'Real interest rate = MPK',
      'scalar.solow.wStar': 'Wage (MPL) at the steady state',
      'plot.solow.diagram': 'The Solow diagram',
      'plot.solow.diagramOutput': 'Solow diagram with output',
      'plot.solow.outputTime': 'Output per person over time (log scale)',
      'plot.solow.capitalTime': 'Capital per person over time',
      'plot.solow.growthDistance': 'Transition dynamics: growth of k vs. its level',
      'axis.solow.k': 'Capital per person, k',
      'axis.solow.kPerPerson': 'Capital per person, k',
      'axis.solow.yPerPerson': 'Output per person, y',
      'axis.solow.invdep': 'Investment and break-even investment',
      'axis.solow.output': 'Output, investment (per person)',
      'axis.solow.growthk': 'Growth rate of k',
      'axis.time': 'Time (periods)',
      'trace.solow.inv': 'Investment s̄·y(k)',
      'trace.solow.dep': 'Break-even (n̄+d̄)·k',
      'trace.solow.prod': 'Output y(k)',
      'trace.solow.ss': 'Steady state',
      'trace.solow.ssOut': 'Steady state (k*, y*)',
      'model.solow.note': 'In the Solow model, diminishing returns to capital drive net investment to zero, so the economy converges to a steady state with no long-run growth in per-person output. A higher saving rate or productivity raises the steady state; a higher depreciation or population-growth rate lowers it. Growth is fastest when capital is far below its steady-state level (the principle of transition dynamics).',
    },
    es: {
      'model.solow.title': 'Modelo de crecimiento de Solow',
      'param.solow.sbar': 'Tasa de ahorro (inversión) — fracción del producto que se invierte cada período',
      'param.solow.dbar': 'Tasa de depreciación — fracción del capital que se desgasta cada período',
      'param.solow.Abar': 'Productividad total de los factores (PTF)',
      'param.solow.alpha': 'Participación del capital α (elasticidad producto-capital; valor del libro 1/3)',
      'param.solow.Lbar': 'Fuerza laboral / población (constante)',
      'param.solow.K0': 'Acervo inicial de capital K₀ (inicio de la transición)',
      'param.solow.nbar': 'Tasa de crecimiento poblacional (extensión Sección 5.10; 0 = sin crecimiento)',
      'scalar.solow.kStar': 'Capital por persona de estado estacionario',
      'scalar.solow.yStar': 'Producto por persona de estado estacionario',
      'scalar.solow.cStar': 'Consumo por persona de estado estacionario',
      'scalar.solow.Kstar': 'Acervo de capital de estado estacionario (agregado)',
      'scalar.solow.Ystar': 'Producto de estado estacionario (agregado)',
      'scalar.solow.Cstar': 'Consumo de estado estacionario (agregado)',
      'scalar.solow.kyRatio': 'Relación capital–producto K*/Y*',
      'scalar.solow.Rstar': 'Tasa de interés real = PMgK',
      'scalar.solow.wStar': 'Salario (PMgL) en el estado estacionario',
      'plot.solow.diagram': 'El diagrama de Solow',
      'plot.solow.diagramOutput': 'Diagrama de Solow con producto',
      'plot.solow.outputTime': 'Producto por persona en el tiempo (escala logarítmica)',
      'plot.solow.capitalTime': 'Capital por persona en el tiempo',
      'plot.solow.growthDistance': 'Dinámica de transición: crecimiento de k vs. su nivel',
      'axis.solow.k': 'Capital por persona, k',
      'axis.solow.kPerPerson': 'Capital por persona, k',
      'axis.solow.yPerPerson': 'Producto por persona, y',
      'axis.solow.invdep': 'Inversión e inversión de reposición',
      'axis.solow.output': 'Producto, inversión (por persona)',
      'axis.solow.growthk': 'Tasa de crecimiento de k',
      'axis.time': 'Tiempo (períodos)',
      'trace.solow.inv': 'Inversión s̄·y(k)',
      'trace.solow.dep': 'Reposición (n̄+d̄)·k',
      'trace.solow.prod': 'Producto y(k)',
      'trace.solow.ss': 'Estado estacionario',
      'trace.solow.ssOut': 'Estado estacionario (k*, y*)',
      'model.solow.note': 'En el modelo de Solow, los rendimientos decrecientes del capital llevan la inversión neta a cero, de modo que la economía converge a un estado estacionario sin crecimiento de largo plazo en el producto por persona. Una mayor tasa de ahorro o productividad eleva el estado estacionario; una mayor depreciación o crecimiento poblacional lo reduce. El crecimiento es más rápido cuando el capital está muy por debajo de su nivel estacionario (principio de la dinámica de transición).',
    },
  },
};
