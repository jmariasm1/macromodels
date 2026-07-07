// mppc.js [SHORTRUN]
// Chapter 12 — Monetary Policy and the Phillips Curve (Jones, Macroeconomics 6e).
// The full short-run model: MP curve (the central bank sets R), the IS curve, and
// the Phillips curve π_t = π_{t−1} + v̄·Ỹ_t + ō_t. Simulated over T periods with a
// policy change (R switches from r̄ to R′ during [t0, t1)) and a price shock ō that
// is either one-period or persistent. Pure compute(); no DOM/i18n/Plotly.
// See ARCHITECTURE.md + SPEC_SHORTRUN.md §3, §6, §7.
//
// Update order per period (SPEC §6, EXACT): shocks → policy/R → IS → Phillips → Okun.
//   R_t   = r̄  outside [t0,t1), else R′            (mode 1: real rate set directly)
//   Ỹ_t   = m·( ā − b̄·(R_t − r̄) ) ,  m = 1/(1 − x̄)
//   π_t   = π_{t−1} + v̄·Ỹ_t + ō_t ,  π_{−1} = π_0
//   u_t   = ū − ½·Ỹ_t
// All persistence lives in π_t via adaptive expectations; Ỹ_t responds instantly.
//
// UNITS NOTE (spec ambiguity resolved, consistent with okun.js/iscurve.js): all
// percent/percentage-point variables are stored as plain numbers (unit:'') so the
// book arithmetic reproduces exactly (e.g. R−r̄=1, b̄=... etc.).

const GRID_N = 121;

export default {
  id: 'mppc',
  titleKey: 'model.mppc.title',
  chapterLabel: 'Ch. 12',
  T: 15,

  params: [
    { key: 'abar', latex: '\\bar{a}', labelKey: 'param.mppc.abar',
      min: -5, max: 5, step: 0.25, def1: 0, def2: 0, unit: '' },
    { key: 'bbar', latex: '\\bar{b}', labelKey: 'param.mppc.bbar',
      min: 0.1, max: 3.0, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'rbar', latex: '\\bar{r}', labelKey: 'param.mppc.rbar',
      min: 0, max: 8, step: 0.25, def1: 2, def2: 2, unit: '' },
    { key: 'xbar', latex: '\\bar{x}', labelKey: 'param.mppc.xbar',
      min: 0, max: 0.9, step: 0.05, def1: 0, def2: 0, unit: '' },
    { key: 'vbar', latex: '\\bar{\\nu}', labelKey: 'param.mppc.vbar',
      min: 0.05, max: 1.5, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'pi0', latex: '\\pi_0', labelKey: 'param.mppc.pi0',
      min: 0, max: 15, step: 0.5, def1: 10, def2: 10, unit: '' },
    { key: 'ubar', latex: '\\bar{u}', labelKey: 'param.mppc.ubar',
      min: 3, max: 8, step: 0.25, def1: 5, def2: 5, unit: '' },
    // --- policy: R = R' during [t0, t1), else rbar ---
    { key: 'Rprime', latex: "R'", labelKey: 'param.mppc.Rprime',
      min: 0, max: 12, step: 0.25, def1: 6, def2: 6, unit: '' },
    { key: 't0', latex: 't_0', labelKey: 'param.mppc.t0',
      min: 0, max: 20, step: 1, def1: 1, def2: 1, unit: '' },
    { key: 't1', latex: 't_1', labelKey: 'param.mppc.t1',
      min: 1, max: 30, step: 1, def1: 9, def2: 9, unit: '' },
    // --- price shock ō: value, start period, persistent flag (0/1) ---
    { key: 'obar', latex: '\\bar{o}', labelKey: 'param.mppc.obar',
      min: -5, max: 5, step: 0.25, def1: 0, def2: 0, unit: '' },
    { key: 'oStart', latex: 't_o', labelKey: 'param.mppc.oStart',
      min: 0, max: 30, step: 1, def1: 1, def2: 1, unit: '' },
    { key: 'oPersist', latex: '\\text{persist}', labelKey: 'param.mppc.oPersist',
      min: 0, max: 1, step: 1, def1: 0, def2: 0, unit: '' },
    { key: 'T', latex: 'T', labelKey: 'param.mppc.T',
      min: 5, max: 30, step: 1, def1: 15, def2: 15, unit: '' },
  ],

  compute(p) {
    const { abar, bbar, rbar, xbar, vbar, pi0, ubar, Rprime } = p;
    const T = Math.max(1, Math.round(p.T));
    const t0 = Math.round(p.t0);
    const t1 = Math.round(p.t1);
    const oStart = Math.round(p.oStart);
    const oPersist = Math.round(p.oPersist) === 1;
    const m = 1 / (1 - xbar);

    // policy real rate at period i
    const Rat = (i) => (i >= t0 && i < t1 ? Rprime : rbar);
    // price shock at period i
    const oAt = (i) => {
      if (p.obar === 0) return 0;
      if (oPersist) return i >= oStart ? p.obar : 0;
      return i === oStart ? p.obar : 0; // one period only
    };

    const t = [];
    const R = [];
    const Ytilde = [];
    const pi = [];
    const dpi = [];
    const u = [];
    const iNom = [];   // nominal rate i_t = R_t + π_t (Fisher)
    const zero = [];

    let piPrev = pi0; // π_{−1} = π_0
    for (let i = 0; i <= T; i++) {
      const Rt = Rat(i);
      const ot = oAt(i);
      const Yt = m * (abar - bbar * (Rt - rbar));       // IS
      const deltaPi = vbar * Yt + ot;                   // Phillips (in changes)
      const piT = piPrev + deltaPi;                     // Phillips (level)
      const uT = ubar - 0.5 * Yt;                       // Okun
      t.push(i);
      R.push(Rt);
      Ytilde.push(Yt);
      dpi.push(deltaPi);
      pi.push(piT);
      u.push(uT);
      iNom.push(Rt + piT);
      zero.push(0);
      piPrev = piT;
    }

    // --- IS/MP schedules in (Ytilde, R) space at the policy (tight) rate ---
    const gMin = -8, gMax = 6;
    const gGrid = [], isR = [], mpBench = [], mpPolicy = [];
    for (let k = 0; k < GRID_N; k++) {
      const g = gMin + ((gMax - gMin) * k) / (GRID_N - 1);
      gGrid.push(g);
      isR.push(rbar + (abar - g / m) / bbar); // inverse IS
      mpBench.push(rbar);                     // benchmark MP (R = r̄)
      mpPolicy.push(Rprime);                  // policy MP (R = R′)
    }
    // Equilibria: benchmark (R=r̄) and policy (R=R′)
    const Yeq_bench = m * (abar - bbar * (rbar - rbar)); // = m·abar
    const Yeq_policy = m * (abar - bbar * (Rprime - rbar));

    // --- Phillips schedule in (Ytilde, Δπ) space ---
    const phillipsLine = gGrid.map((g) => vbar * g);

    // --- Scalars: impact of the policy switch and final-period outcomes ---
    const idxTight = Math.min(Math.max(t0, 0), T);
    const Ytilde_tight = Ytilde[idxTight];
    const Ytilde_final = Ytilde[T];
    const pi_final = pi[T];
    const u_final = u[T];
    const dpi_perPeriod = vbar * Yeq_policy; // inflation change per tight period

    return {
      scalars: {
        m, Yeq_bench, Yeq_policy, Ytilde_tight, dpi_perPeriod,
        Ytilde_final, pi_final, u_final,
      },
      series: {
        t, R, Ytilde, pi, dpi, u, iNom, zero,
        gGrid, isR, mpBench, mpPolicy, phillipsLine,
        eqYbench: [Yeq_bench], eqRbench: [rbar],
        eqYpolicy: [Yeq_policy], eqRpolicy: [Rprime],
      },
    };
  },

  scalars: [
    { key: 'm', latex: '\\tfrac{1}{1-\\bar{x}}', labelKey: 'scalar.mppc.m', fmt: 'num' },
    { key: 'Yeq_bench', latex: '\\tilde{Y}\\,|_{R=\\bar{r}}', labelKey: 'scalar.mppc.Yeq_bench', fmt: 'num' },
    { key: 'Yeq_policy', latex: "\\tilde{Y}\\,|_{R=R'}", labelKey: 'scalar.mppc.Yeq_policy', fmt: 'num' },
    { key: 'dpi_perPeriod', latex: '\\Delta\\pi', labelKey: 'scalar.mppc.dpi_perPeriod', fmt: 'num' },
    { key: 'Ytilde_final', latex: '\\tilde{Y}_T', labelKey: 'scalar.mppc.Ytilde_final', fmt: 'num' },
    { key: 'pi_final', latex: '\\pi_T', labelKey: 'scalar.mppc.pi_final', fmt: 'num' },
    { key: 'u_final', latex: 'u_T', labelKey: 'scalar.mppc.u_final', fmt: 'num' },
  ],

  plots: [
    {
      id: 'is-mp',
      titleKey: 'plot.mppc.isMp',
      xLabelKey: 'axis.mppc.Ytilde', yLabelKey: 'axis.mppc.R',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.isR, name: `${t('trace.mppc.is')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.isR, name: `${t('trace.mppc.is')} (2)`, scenario: 2 },
            { x: out1.series.gGrid, y: out1.series.mpBench, name: `${t('trace.mppc.mpBench')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: out1.series.gGrid, y: out1.series.mpPolicy, name: `${t('trace.mppc.mpPolicy')} (1)`, scenario: 1, dash: 'dash', role: 'aux' },
            { x: out2.series.gGrid, y: out2.series.mpPolicy, name: `${t('trace.mppc.mpPolicy')} (2)`, scenario: 2, dash: 'dash', role: 'aux' },
            { x: out1.series.eqYpolicy, y: out1.series.eqRpolicy, name: `${t('trace.mppc.eq')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: out2.series.eqYpolicy, y: out2.series.eqRpolicy, name: `${t('trace.mppc.eq')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
          ],
          layout: {
            shapes: [
              { type: 'line', x0: 0, x1: 0, yref: 'paper', y0: 0, y1: 1, line: { color: '#e5e7eb', width: 1, dash: 'dot' } },
            ],
          },
        };
      },
    },
    {
      id: 'phillips',
      titleKey: 'plot.mppc.phillips',
      xLabelKey: 'axis.mppc.Ytilde', yLabelKey: 'axis.mppc.dpi',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        const tight1 = Math.min(Math.round(p1.t0), out1.series.t.length - 1);
        const tight2 = Math.min(Math.round(p2.t0), out2.series.t.length - 1);
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.phillipsLine, name: `${t('trace.mppc.phillips')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.phillipsLine, name: `${t('trace.mppc.phillips')} (2)`, scenario: 2 },
            { x: [out1.series.Ytilde[tight1]], y: [out1.series.dpi[tight1]], name: `${t('trace.mppc.economy')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: [out2.series.Ytilde[tight2]], y: [out2.series.dpi[tight2]], name: `${t('trace.mppc.economy')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
          ],
          layout: {
            shapes: [
              { type: 'line', x0: 0, x1: 0, yref: 'paper', y0: 0, y1: 1, line: { color: '#e5e7eb', width: 1, dash: 'dot' } },
            ],
          },
        };
      },
    },
    {
      id: 'gap-time',
      titleKey: 'plot.mppc.gapTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.mppc.Ytilde',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.Ytilde, name: `${t('trace.mppc.gap')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.Ytilde, name: `${t('trace.mppc.gap')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [0, 0], name: t('trace.mppc.potential'), scenario: 1, dash: 'dot', role: 'aux', showlegend: false },
          ],
        };
      },
    },
    {
      id: 'inflation-time',
      titleKey: 'plot.mppc.inflationTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.mppc.pi',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.pi, name: `${t('trace.mppc.inflation')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.pi, name: `${t('trace.mppc.inflation')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.pi0, p1.pi0], name: `${t('trace.mppc.pi0')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.pi0, p2.pi0], name: `${t('trace.mppc.pi0')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'rate-time',
      titleKey: 'plot.mppc.rateTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.mppc.R',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.R, name: `${t('trace.mppc.rate')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.R, name: `${t('trace.mppc.rate')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.rbar, p1.rbar], name: `${t('trace.mppc.rbar')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.rbar, p2.rbar], name: `${t('trace.mppc.rbar')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'unemployment-time',
      titleKey: 'plot.mppc.unemploymentTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.mppc.u',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.u, name: `${t('trace.mppc.unemp')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.u, name: `${t('trace.mppc.unemp')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.ubar, p1.ubar], name: `${t('trace.mppc.ubar')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.ubar, p2.ubar], name: `${t('trace.mppc.ubar')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
  ],

  equations: [
    'i_t = R_t + \\pi_t \\qquad\\Rightarrow\\qquad R_t = i_t - \\pi_t',
    '\\tilde{Y}_t = \\dfrac{1}{1-\\bar{x}}\\left[\\,\\bar{a} - \\bar{b}\\,(R_t - \\bar{r})\\,\\right]',
    '\\pi_t = \\pi_{t-1} + \\bar{\\nu}\\,\\tilde{Y}_t + \\bar{o}_t',
    '\\Delta\\pi_t = \\bar{\\nu}\\,\\tilde{Y}_t + \\bar{o}_t',
    'u_t = \\bar{u} - \\tfrac{1}{2}\\,\\tilde{Y}_t',
  ],

  noteKey: 'model.mppc.note',

  strings: {
    en: {
      'model.mppc.title': 'Monetary Policy & Phillips Curve',
      'param.mppc.abar': 'Aggregate demand shock ā (0 = benchmark)',
      'param.mppc.bbar': 'Sensitivity of demand to the rate gap b̄',
      'param.mppc.rbar': 'Long-run real rate r̄ = MPK (%)',
      'param.mppc.xbar': 'Marginal propensity to consume x̄ (multiplier; 0 = off)',
      'param.mppc.vbar': 'Phillips-curve slope v̄',
      'param.mppc.pi0': 'Initial inflation π₀ (%)',
      'param.mppc.ubar': 'Natural rate of unemployment ū (%)',
      'param.mppc.Rprime': 'Policy real rate R′ while the bank is tightening (%)',
      'param.mppc.t0': 'Policy start period t₀ (bank moves R to R′)',
      'param.mppc.t1': 'Policy end period t₁ (bank returns R to r̄)',
      'param.mppc.obar': 'Price (oil) shock ō (%)',
      'param.mppc.oStart': 'Price-shock period t_o',
      'param.mppc.oPersist': 'Price shock persistent? (0 = one period, 1 = persistent)',
      'param.mppc.T': 'Simulation horizon T (years)',
      'scalar.mppc.m': 'Multiplier 1/(1 − x̄)',
      'scalar.mppc.Yeq_bench': 'Output gap at R = r̄ (benchmark)',
      'scalar.mppc.Yeq_policy': 'Output gap while tight (R = R′)',
      'scalar.mppc.dpi_perPeriod': 'Inflation change per tight period Δπ',
      'scalar.mppc.Ytilde_final': 'Final-period output gap Ỹ_T',
      'scalar.mppc.pi_final': 'Final-period inflation π_T',
      'scalar.mppc.u_final': 'Final-period unemployment u_T',
      'plot.mppc.isMp': 'IS–MP diagram (Ỹ, R)',
      'plot.mppc.phillips': 'Phillips curve (Ỹ, Δπ)',
      'plot.mppc.gapTime': 'Output gap Ỹ_t over time',
      'plot.mppc.inflationTime': 'Inflation π_t over time',
      'plot.mppc.rateTime': 'Real interest rate R_t over time',
      'plot.mppc.unemploymentTime': 'Unemployment u_t over time',
      'axis.time': 'Time (years)',
      'axis.mppc.Ytilde': 'Output gap Ỹ (%)',
      'axis.mppc.R': 'Real interest rate R (%)',
      'axis.mppc.pi': 'Inflation π (%)',
      'axis.mppc.dpi': 'Change in inflation Δπ (pp)',
      'axis.mppc.u': 'Unemployment u (%)',
      'trace.mppc.is': 'IS curve',
      'trace.mppc.mpBench': 'MP: R = r̄',
      'trace.mppc.mpPolicy': 'MP: R = R′',
      'trace.mppc.eq': 'Equilibrium (tight)',
      'trace.mppc.phillips': 'Phillips curve Δπ = v̄·Ỹ',
      'trace.mppc.economy': 'Economy while tight',
      'trace.mppc.gap': 'Output gap Ỹ_t',
      'trace.mppc.potential': 'Potential (Ỹ = 0)',
      'trace.mppc.inflation': 'Inflation π_t',
      'trace.mppc.pi0': 'Initial inflation π₀',
      'trace.mppc.rate': 'Real rate R_t',
      'trace.mppc.rbar': 'Long-run rate r̄',
      'trace.mppc.unemp': 'Unemployment u_t',
      'trace.mppc.ubar': 'Natural rate ū',
      'model.mppc.note': 'The full short-run model chains three curves: the central bank sets the real rate R (MP curve, thanks to sticky inflation); the IS curve turns R into an output gap; and the Phillips curve turns the gap into a change in inflation, carried forward by adaptive expectations. A temporary tightening (R = R′ > r̄) opens a recession that pulls inflation down period by period — the Volcker disinflation. When the bank returns R to r̄, output snaps back to zero and inflation stabilises at its new, lower level. A steeper Phillips curve (higher v̄) makes disinflation faster and cheaper.',
    },
    es: {
      'model.mppc.title': 'Política monetaria y curva de Phillips',
      'param.mppc.abar': 'Choque de demanda agregada ā (0 = referencia)',
      'param.mppc.bbar': 'Sensibilidad de la demanda a la brecha de la tasa b̄',
      'param.mppc.rbar': 'Tasa real de largo plazo r̄ = PMgK (%)',
      'param.mppc.xbar': 'Propensión marginal a consumir x̄ (multiplicador; 0 = apagado)',
      'param.mppc.vbar': 'Pendiente de la curva de Phillips v̄',
      'param.mppc.pi0': 'Inflación inicial π₀ (%)',
      'param.mppc.ubar': 'Tasa natural de desempleo ū (%)',
      'param.mppc.Rprime': 'Tasa real de política R′ mientras el banco endurece (%)',
      'param.mppc.t0': 'Período de inicio de la política t₀ (el banco lleva R a R′)',
      'param.mppc.t1': 'Período de fin de la política t₁ (el banco regresa R a r̄)',
      'param.mppc.obar': 'Choque de precios (petrolero) ō (%)',
      'param.mppc.oStart': 'Período del choque de precios t_o',
      'param.mppc.oPersist': '¿Choque de precios persistente? (0 = un período, 1 = persistente)',
      'param.mppc.T': 'Horizonte de simulación T (años)',
      'scalar.mppc.m': 'Multiplicador 1/(1 − x̄)',
      'scalar.mppc.Yeq_bench': 'Brecha del producto en R = r̄ (referencia)',
      'scalar.mppc.Yeq_policy': 'Brecha del producto con política restrictiva (R = R′)',
      'scalar.mppc.dpi_perPeriod': 'Cambio de la inflación por período restrictivo Δπ',
      'scalar.mppc.Ytilde_final': 'Brecha del producto final Ỹ_T',
      'scalar.mppc.pi_final': 'Inflación del período final π_T',
      'scalar.mppc.u_final': 'Desempleo del período final u_T',
      'plot.mppc.isMp': 'Diagrama IS–MP (Ỹ, R)',
      'plot.mppc.phillips': 'Curva de Phillips (Ỹ, Δπ)',
      'plot.mppc.gapTime': 'Brecha del producto Ỹ_t en el tiempo',
      'plot.mppc.inflationTime': 'Inflación π_t en el tiempo',
      'plot.mppc.rateTime': 'Tasa de interés real R_t en el tiempo',
      'plot.mppc.unemploymentTime': 'Desempleo u_t en el tiempo',
      'axis.time': 'Tiempo (años)',
      'axis.mppc.Ytilde': 'Brecha del producto Ỹ (%)',
      'axis.mppc.R': 'Tasa de interés real R (%)',
      'axis.mppc.pi': 'Inflación π (%)',
      'axis.mppc.dpi': 'Cambio de la inflación Δπ (pp)',
      'axis.mppc.u': 'Desempleo u (%)',
      'trace.mppc.is': 'Curva IS',
      'trace.mppc.mpBench': 'MP: R = r̄',
      'trace.mppc.mpPolicy': 'MP: R = R′',
      'trace.mppc.eq': 'Equilibrio (restrictivo)',
      'trace.mppc.phillips': 'Curva de Phillips Δπ = v̄·Ỹ',
      'trace.mppc.economy': 'Economía con política restrictiva',
      'trace.mppc.gap': 'Brecha del producto Ỹ_t',
      'trace.mppc.potential': 'Potencial (Ỹ = 0)',
      'trace.mppc.inflation': 'Inflación π_t',
      'trace.mppc.pi0': 'Inflación inicial π₀',
      'trace.mppc.rate': 'Tasa real R_t',
      'trace.mppc.rbar': 'Tasa de largo plazo r̄',
      'trace.mppc.unemp': 'Desempleo u_t',
      'trace.mppc.ubar': 'Tasa natural ū',
      'model.mppc.note': 'El modelo completo de corto plazo encadena tres curvas: el banco central fija la tasa real R (curva MP, gracias a la inflación rígida); la curva IS convierte R en una brecha del producto; y la curva de Phillips convierte la brecha en un cambio de la inflación, propagado por las expectativas adaptativas. Un endurecimiento temporal (R = R′ > r̄) abre una recesión que reduce la inflación período a período —la desinflación de Volcker—. Cuando el banco regresa R a r̄, el producto vuelve a cero y la inflación se estabiliza en su nuevo nivel más bajo. Una curva de Phillips más empinada (mayor v̄) hace la desinflación más rápida y menos costosa.',
    },
  },
};
