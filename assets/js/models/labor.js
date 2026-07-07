// labor.js [LONGRUN]
// Chapter 7 — The Labor Market, Wages, and Unemployment (Jones 6e).
// Two blocks: (1) labor supply/demand with the tax wedge (demand is the
// book-grounded Cobb-Douglas MPL condition; the iso-elastic supply curve is a
// PROPOSED parametrization — Jones's Ch. 7 treatment is graphical), and
// (2) the bathtub model of unemployment (book equations 7.2–7.4, exact).
// NOTE: the book reuses the letter s-bar for the job separation rate; it is a
// DIFFERENT parameter from the Solow saving rate, namespaced here as sbarSep.
// See SPEC_LONGRUN.md Part 2.

const T_DEFAULT = 60;
const GRID_N = 120;

/**
 * Solve for the equilibrium firm-paid wage w* where labor demand equals
 * labor supply, by bisection on excess demand (monotonically decreasing
 * in w). Ld(w) = Kbar*[(1-alpha)*Abar/w]^(1/alpha);
 * Ls(w) = LbarS*[(1-tau)*w]^eta   (reference wage normalized to 1).
 */
function solveWage(p) {
  const { alpha, Abar, Kbar, tau, eta, LbarS } = p;
  const Ld = (w) => Kbar * Math.pow(((1 - alpha) * Abar) / w, 1 / alpha);
  const Ls = (w) => LbarS * Math.pow((1 - tau) * w, eta);
  const excess = (w) => Ld(w) - Ls(w);
  let lo = 1e-9;
  let hi = 1;
  // Expand hi until excess demand is negative (supply exceeds demand).
  let guard = 0;
  while (excess(hi) > 0 && guard < 200) { hi *= 2; guard += 1; }
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (excess(mid) > 0) lo = mid; else hi = mid;
  }
  const wStar = 0.5 * (lo + hi);
  return { wStar, Lstar: Ld(wStar) };
}

export default {
  id: 'labor',
  titleKey: 'model.labor.title',
  chapterLabel: 'Ch. 7',
  T: T_DEFAULT,

  params: [
    // --- Labor supply & demand block ---
    { key: 'Abar', latex: '\\bar{A}', labelKey: 'param.labor.Abar',
      min: 0.2, max: 3.0, step: 0.05, def1: 1.0, def2: 1.0, unit: '' },
    { key: 'Kbar', latex: '\\bar{K}', labelKey: 'param.labor.Kbar',
      min: 10, max: 1000, step: 5, def1: 100, def2: 100, unit: '' },
    { key: 'alpha', latex: '\\alpha', labelKey: 'param.labor.alpha',
      min: 0.2, max: 0.5, step: 0.01, def1: 0.3333, def2: 0.3333, unit: '' },
    { key: 'tau', latex: '\\tau', labelKey: 'param.labor.tau',
      min: 0, max: 0.6, step: 0.01, def1: 0.0, def2: 0.0, unit: '%' },
    { key: 'eta', latex: '\\eta', labelKey: 'param.labor.eta',
      min: 0.1, max: 3.0, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'LbarS', latex: '\\bar{\\ell}', labelKey: 'param.labor.LbarS',
      min: 10, max: 500, step: 5, def1: 150, def2: 150, unit: '' },
    // --- Bathtub block (book eq. 7.2–7.3) ---
    { key: 'sbarSep', latex: '\\bar{s}', labelKey: 'param.labor.sbarSep',
      min: 0.001, max: 0.05, step: 0.001, def1: 0.01, def2: 0.01, unit: '%' },
    { key: 'fbar', latex: '\\bar{f}', labelKey: 'param.labor.fbar',
      min: 0.02, max: 0.60, step: 0.01, def1: 0.20, def2: 0.20, unit: '%' },
    { key: 'LbarF', latex: '\\bar{L}', labelKey: 'param.labor.LbarF',
      min: 10, max: 300, step: 1, def1: 100, def2: 100, unit: '' },
    { key: 'U0', latex: 'U_0', labelKey: 'param.labor.U0',
      min: 0, max: 100, step: 0.5, def1: 10, def2: 10, unit: '' },
  ],

  compute(p) {
    const { alpha, Abar, Kbar, tau, eta, LbarS, sbarSep, fbar, LbarF, U0 } = p;

    // === (1) Labor market equilibrium (bisection on the wage) ===
    const { wStar, Lstar } = solveWage(p);
    const wNet = (1 - tau) * wStar; // take-home wage after the tax wedge

    // Schedules over a grid of L (wage on the y-axis, as in Figure 7.3).
    // Demand: w = (1-alpha)*Abar*(Kbar/L)^alpha  (inverse MPL condition)
    // Supply: w = (L/LbarS)^(1/eta) / (1-tau)    (inverse iso-elastic supply)
    const Lmax = 2 * Lstar;
    const Lmin = Math.max(0.05 * Lstar, 1e-6);
    const LGrid = [];
    const wDemand = [];
    const wSupply = [];
    for (let i = 0; i <= GRID_N; i++) {
      const L = Lmin + ((Lmax - Lmin) * i) / GRID_N;
      LGrid.push(L);
      wDemand.push((1 - alpha) * Abar * Math.pow(Kbar / L, alpha));
      wSupply.push(Math.pow(L / LbarS, 1 / eta) / (1 - tau));
    }

    // === (2) Bathtub model ===
    // u* = sbar/(sbar+fbar)  — book eq. (7.4)-style result
    const uStar = sbarSep / (sbarSep + fbar);
    const Ustar = uStar * LbarF;
    const Estar = LbarF - Ustar;

    // Transition dynamics: U_{t+1} = U_t + sbar*(L - U_t) - fbar*U_t
    const U0c = Math.min(Math.max(U0, 0), LbarF); // clamp to feasible range
    const t = [];
    const U = [];
    const E = [];
    const u = [];
    let Ut = U0c;
    for (let i = 0; i <= T_DEFAULT; i++) {
      t.push(i);
      U.push(Ut);
      E.push(LbarF - Ut);
      u.push(Ut / LbarF);
      Ut = Ut + sbarSep * (LbarF - Ut) - fbar * Ut;
    }

    // Bathtub flow schedules over a grid of U: inflow sbar*(L-U), outflow fbar*U.
    const UGrid = [];
    const inflow = [];
    const outflow = [];
    for (let i = 0; i <= GRID_N; i++) {
      const Ux = (LbarF * i) / GRID_N;
      UGrid.push(Ux);
      inflow.push(sbarSep * (LbarF - Ux));
      outflow.push(fbar * Ux);
    }

    return {
      scalars: { wStar, wNet, Lstar, uStar, Ustar, Estar },
      series: {
        LGrid, wDemand, wSupply,
        t, U, E, u,
        UGrid, inflow, outflow,
      },
    };
  },

  scalars: [
    { key: 'wStar', latex: 'w^*', labelKey: 'scalar.labor.wStar', fmt: 'num' },
    { key: 'wNet', latex: '(1-\\tau)w^*', labelKey: 'scalar.labor.wNet', fmt: 'num' },
    { key: 'Lstar', latex: 'L^*', labelKey: 'scalar.labor.Lstar', fmt: 'num' },
    { key: 'uStar', latex: 'u^*', labelKey: 'scalar.labor.uStar', fmt: 'pct' },
    { key: 'Ustar', latex: 'U^*', labelKey: 'scalar.labor.Ustar', fmt: 'num' },
    { key: 'Estar', latex: 'E^*', labelKey: 'scalar.labor.Estar', fmt: 'num' },
  ],

  plots: [
    {
      id: 'market',
      titleKey: 'plot.labor.market',
      xLabelKey: 'axis.labor.L', yLabelKey: 'axis.labor.w',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        const traces = [];
        const add = (out, scen) => {
          traces.push({ x: out.series.LGrid, y: out.series.wDemand,
            name: `${t('trace.labor.Ld')} (${scen})`, scenario: scen });
          traces.push({ x: out.series.LGrid, y: out.series.wSupply,
            name: `${t('trace.labor.Ls')} (${scen})`, scenario: scen, dash: 'dash', role: 'aux' });
          traces.push({ x: [out.scalars.Lstar], y: [out.scalars.wStar],
            name: `${t('trace.labor.eq')} (${scen})`, scenario: scen,
            mode: 'markers', marker: { size: 9 } });
        };
        add(out1, 1);
        add(out2, 2);
        return { traces };
      },
    },
    {
      id: 'bathtub-flows',
      titleKey: 'plot.labor.bathtubFlows',
      xLabelKey: 'axis.labor.U', yLabelKey: 'axis.labor.flows',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        const traces = [];
        const add = (out, p, scen) => {
          traces.push({ x: out.series.UGrid, y: out.series.inflow,
            name: `${t('trace.labor.inflow')} (${scen})`, scenario: scen });
          traces.push({ x: out.series.UGrid, y: out.series.outflow,
            name: `${t('trace.labor.outflow')} (${scen})`, scenario: scen, dash: 'dash', role: 'aux' });
          traces.push({ x: [out.scalars.Ustar], y: [p.fbar * out.scalars.Ustar],
            name: `${t('trace.labor.ssU')} (${scen})`, scenario: scen,
            mode: 'markers', marker: { size: 9 } });
        };
        add(out1, p1, 1);
        add(out2, p2, 2);
        return { traces };
      },
    },
    {
      id: 'urate-time',
      titleKey: 'plot.labor.urateTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.labor.urate',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const pc = (arr) => arr.map((v) => 100 * v);
        const last1 = out1.series.t[out1.series.t.length - 1];
        const last2 = out2.series.t[out2.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: pc(out1.series.u), name: `u_t (1)`, scenario: 1 },
            { x: out2.series.t, y: pc(out2.series.u), name: `u_t (2)`, scenario: 2 },
            { x: [0, last1], y: [100 * out1.scalars.uStar, 100 * out1.scalars.uStar],
              name: `u^* (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, last2], y: [100 * out2.scalars.uStar, 100 * out2.scalars.uStar],
              name: `u^* (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'stocks-time',
      titleKey: 'plot.labor.stocksTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.labor.people',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.t, y: out1.series.U, name: `${t('trace.labor.U')} (1)`, scenario: 1 },
            { x: out2.series.t, y: out2.series.U, name: `${t('trace.labor.U')} (2)`, scenario: 2 },
            { x: out1.series.t, y: out1.series.E, name: `${t('trace.labor.E')} (1)`, scenario: 1, dash: 'dash', role: 'aux' },
            { x: out2.series.t, y: out2.series.E, name: `${t('trace.labor.E')} (2)`, scenario: 2, dash: 'dash', role: 'aux' },
          ],
        };
      },
    },
  ],

  equations: [
    'w = MPL = (1-\\alpha)\\,\\bar{A}\\left(\\dfrac{\\bar{K}}{L}\\right)^{\\alpha}',
    'L^s = \\bar{\\ell}\\,\\big[(1-\\tau)\\,w\\big]^{\\eta}\\quad\\text{(proposed form)}',
    'E_t + U_t = \\bar{L}\\qquad \\Delta U_{t+1} = \\bar{s}\\,E_t - \\bar{f}\\,U_t',
    'u^* = \\dfrac{\\bar{s}}{\\bar{f}+\\bar{s}}',
  ],

  noteKey: 'model.labor.note',

  strings: {
    en: {
      'model.labor.title': 'Labor Market & Unemployment',
      'param.labor.Abar': 'Total factor productivity (labor-demand shifter)',
      'param.labor.Kbar': 'Capital stock available to firms (labor-demand shifter)',
      'param.labor.alpha': 'Capital share α (labor share is 1−α; book default 1/3)',
      'param.labor.tau': 'Labor income tax rate τ (workers keep (1−τ)·w)',
      'param.labor.eta': 'Wage elasticity of labor supply η (proposed parametrization)',
      'param.labor.LbarS': 'Labor-supply scale (workers supplied at a net wage of 1; proposed)',
      'param.labor.sbarSep': 'Job separation rate s̄ — fraction of the employed who lose their job each period',
      'param.labor.fbar': 'Job finding rate f̄ — fraction of the unemployed who find a job each period',
      'param.labor.LbarF': 'Labor force L̄ (constant, bathtub model)',
      'param.labor.U0': 'Initial number of unemployed U₀ (start of transition)',
      'scalar.labor.wStar': 'Equilibrium wage paid by firms',
      'scalar.labor.wNet': 'Net (take-home) wage after the tax',
      'scalar.labor.Lstar': 'Equilibrium employment',
      'scalar.labor.uStar': 'Natural rate of unemployment',
      'scalar.labor.Ustar': 'Steady-state unemployment (level)',
      'scalar.labor.Estar': 'Steady-state employment (level)',
      'plot.labor.market': 'Labor supply and demand',
      'plot.labor.bathtubFlows': 'Bathtub model: job separations vs. job finding',
      'plot.labor.urateTime': 'Unemployment rate over time',
      'plot.labor.stocksTime': 'Unemployed and employed over time',
      'axis.labor.L': 'Employment, L',
      'axis.labor.w': 'Wage, w',
      'axis.labor.U': 'Unemployed, U',
      'axis.labor.flows': 'Flows into / out of unemployment',
      'axis.labor.urate': 'Unemployment rate (%)',
      'axis.labor.people': 'People',
      'axis.time': 'Time (periods)',
      'trace.labor.Ld': 'Labor demand (MPL)',
      'trace.labor.Ls': 'Labor supply',
      'trace.labor.eq': 'Equilibrium (L*, w*)',
      'trace.labor.inflow': 'Separations s̄·E',
      'trace.labor.outflow': 'Job finding f̄·U',
      'trace.labor.ssU': 'Steady state U*',
      'trace.labor.U': 'Unemployed U_t',
      'trace.labor.E': 'Employed E_t',
      'model.labor.note': 'Labor demand comes from the marginal product of labor (Jones, Ch. 4); the iso-elastic supply curve is a standard parametrization consistent with the book’s graphical treatment (the textbook does not give an explicit functional form). A labor income tax drives a wedge between what firms pay and what workers keep, lowering employment. In the bathtub model, the natural rate of unemployment u* = s̄/(s̄+f̄) balances the flow into unemployment (separations) against the flow out (job finding).',
    },
    es: {
      'model.labor.title': 'Mercado laboral y desempleo',
      'param.labor.Abar': 'Productividad total de los factores (desplaza la demanda de trabajo)',
      'param.labor.Kbar': 'Acervo de capital disponible para las empresas (desplaza la demanda de trabajo)',
      'param.labor.alpha': 'Participación del capital α (la participación del trabajo es 1−α; valor del libro 1/3)',
      'param.labor.tau': 'Tasa de impuesto al ingreso laboral τ (los trabajadores reciben (1−τ)·w)',
      'param.labor.eta': 'Elasticidad de la oferta laboral al salario η (parametrización propuesta)',
      'param.labor.LbarS': 'Escala de la oferta laboral (trabajo ofrecido con salario neto igual a 1; propuesta)',
      'param.labor.sbarSep': 'Tasa de separación laboral s̄ — fracción de los empleados que pierde su empleo cada período',
      'param.labor.fbar': 'Tasa de consecución de empleo f̄ — fracción de los desempleados que encuentra empleo cada período',
      'param.labor.LbarF': 'Fuerza laboral L̄ (constante, modelo de la bañera)',
      'param.labor.U0': 'Número inicial de desempleados U₀ (inicio de la transición)',
      'scalar.labor.wStar': 'Salario de equilibrio pagado por las empresas',
      'scalar.labor.wNet': 'Salario neto (después del impuesto)',
      'scalar.labor.Lstar': 'Empleo de equilibrio',
      'scalar.labor.uStar': 'Tasa natural de desempleo',
      'scalar.labor.Ustar': 'Desempleo de estado estacionario (nivel)',
      'scalar.labor.Estar': 'Empleo de estado estacionario (nivel)',
      'plot.labor.market': 'Oferta y demanda de trabajo',
      'plot.labor.bathtubFlows': 'Modelo de la bañera: separaciones vs. consecución de empleo',
      'plot.labor.urateTime': 'Tasa de desempleo en el tiempo',
      'plot.labor.stocksTime': 'Desempleados y empleados en el tiempo',
      'axis.labor.L': 'Empleo, L',
      'axis.labor.w': 'Salario, w',
      'axis.labor.U': 'Desempleados, U',
      'axis.labor.flows': 'Flujos de entrada / salida del desempleo',
      'axis.labor.urate': 'Tasa de desempleo (%)',
      'axis.labor.people': 'Personas',
      'axis.time': 'Tiempo (períodos)',
      'trace.labor.Ld': 'Demanda de trabajo (PMgL)',
      'trace.labor.Ls': 'Oferta de trabajo',
      'trace.labor.eq': 'Equilibrio (L*, w*)',
      'trace.labor.inflow': 'Separaciones s̄·E',
      'trace.labor.outflow': 'Consecución f̄·U',
      'trace.labor.ssU': 'Estado estacionario U*',
      'trace.labor.U': 'Desempleados U_t',
      'trace.labor.E': 'Empleados E_t',
      'model.labor.note': 'La demanda de trabajo proviene del producto marginal del trabajo (Jones, cap. 4); la curva de oferta isoelástica es una parametrización estándar consistente con el tratamiento gráfico del libro (el texto no da una forma funcional explícita). Un impuesto al ingreso laboral abre una brecha entre lo que pagan las empresas y lo que reciben los trabajadores, reduciendo el empleo. En el modelo de la bañera, la tasa natural de desempleo u* = s̄/(s̄+f̄) equilibra el flujo hacia el desempleo (separaciones) con el flujo de salida (consecución de empleo).',
    },
  },
};
