// okun.js [SHORTRUN]
// Chapter 9 — An Introduction to the Short Run (Jones, Macroeconomics 6e).
// Output gap Ytilde, the inflation equation Δπ = v̄·Ytilde (+ ō), and Okun's law
// u − ū = −(1/2)·Ytilde. Dynamics: an AR(1) output-gap path
//   Ytilde_t = ρ·Ytilde_{t−1}  (starting from Ytilde_0)
// and the resulting inflation and unemployment paths.
// Pure compute(), no DOM/i18n/Plotly. See ARCHITECTURE.md + SPEC_SHORTRUN.md §1.
//
// UNITS NOTE (resolution of a spec ambiguity): the book plugs percent/percentage-
// point variables in as plain numbers (e.g. Ytilde = −2 means −2%), so its
// worked examples (Okun: Ytilde=−6 ⇒ u−ū=+3) come out clean. We therefore store
// all rate/gap parameters here as plain percentage-point numbers with unit:'' —
// NOT as framework decimals — so compute() reproduces the book's arithmetic
// exactly. v̄ (Phillips slope), ρ and the Okun coefficient are dimensionless.

const GRID_N = 121; // resolution of the static schedule lines

export default {
  id: 'okun',
  titleKey: 'model.okun.title',
  chapterLabel: 'Ch. 9',
  T: 15,

  params: [
    { key: 'Ytilde0', latex: '\\tilde{Y}_0', labelKey: 'param.okun.Ytilde0',
      min: -10, max: 6, step: 0.25, def1: -6, def2: -6, unit: '' },
    { key: 'rho', latex: '\\rho', labelKey: 'param.okun.rho',
      min: 0, max: 0.95, step: 0.05, def1: 0.6, def2: 0.6, unit: '' },
    { key: 'vbar', latex: '\\bar{\\nu}', labelKey: 'param.okun.vbar',
      min: 0.05, max: 1.5, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'obar', latex: '\\bar{o}', labelKey: 'param.okun.obar',
      min: -5, max: 5, step: 0.25, def1: 0, def2: 0, unit: '' },
    { key: 'pi0', latex: '\\pi_0', labelKey: 'param.okun.pi0',
      min: 0, max: 15, step: 0.5, def1: 6, def2: 6, unit: '' },
    { key: 'ubar', latex: '\\bar{u}', labelKey: 'param.okun.ubar',
      min: 3, max: 8, step: 0.25, def1: 5, def2: 5, unit: '' },
    { key: 'okun', latex: '\\tfrac{1}{2}', labelKey: 'param.okun.okun',
      min: 0.3, max: 0.7, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'T', latex: 'T', labelKey: 'param.okun.T',
      min: 5, max: 30, step: 1, def1: 15, def2: 15, unit: '' },
  ],

  compute(p) {
    const { Ytilde0, rho, vbar, obar, pi0, ubar, okun } = p;
    const T = Math.max(1, Math.round(p.T));

    // --- AR(1) output-gap path and induced inflation / unemployment ---
    const t = [];
    const Ytilde = [];
    const pi = [];
    const dpi = [];   // Δπ_t = v̄·Ytilde_t + ō
    const u = [];
    const zero = [];

    let yt = Ytilde0;
    let piPrev = pi0; // π_{−1} = π_0 (long-run/initial inflation)
    for (let i = 0; i <= T; i++) {
      if (i > 0) yt = rho * yt; // AR(1): Ytilde_t = ρ·Ytilde_{t−1}
      const deltaPi = vbar * yt + obar;
      const piT = piPrev + deltaPi;
      const uT = ubar - okun * yt; // Okun's law
      t.push(i);
      Ytilde.push(yt);
      dpi.push(deltaPi);
      pi.push(piT);
      u.push(uT);
      zero.push(0);
      piPrev = piT;
    }

    // --- Static schedule lines over a Ytilde grid (for the relation plots) ---
    const gMin = -8, gMax = 6;
    const gGrid = [];
    const phillipsLine = []; // Δπ = v̄·Ytilde + ō
    const okunLine = [];     // u = ū − okun·Ytilde
    const okunGapLine = [];  // u − ū = −okun·Ytilde
    for (let i = 0; i < GRID_N; i++) {
      const g = gMin + ((gMax - gMin) * i) / (GRID_N - 1);
      gGrid.push(g);
      phillipsLine.push(vbar * g + obar);
      okunLine.push(ubar - okun * g);
      okunGapLine.push(-okun * g);
    }

    // --- Impact-period (t = 0) scalars for the comparison table ---
    const Ytilde_impact = Ytilde0;
    const dpi_impact = vbar * Ytilde0 + obar;
    const u_impact = ubar - okun * Ytilde0;
    const ugap_impact = -okun * Ytilde0;
    const Ytilde_final = Ytilde[Ytilde.length - 1];
    const pi_final = pi[pi.length - 1];
    const u_final = u[u.length - 1];

    return {
      scalars: {
        Ytilde_impact, dpi_impact, u_impact, ugap_impact,
        Ytilde_final, pi_final, u_final,
      },
      series: {
        t, Ytilde, pi, dpi, u, zero,
        gGrid, phillipsLine, okunLine, okunGapLine,
      },
    };
  },

  scalars: [
    { key: 'Ytilde_impact', latex: '\\tilde{Y}_0', labelKey: 'scalar.okun.Ytilde_impact', fmt: 'num' },
    { key: 'dpi_impact', latex: '\\Delta\\pi_0', labelKey: 'scalar.okun.dpi_impact', fmt: 'num' },
    { key: 'ugap_impact', latex: 'u_0-\\bar{u}', labelKey: 'scalar.okun.ugap_impact', fmt: 'num' },
    { key: 'u_impact', latex: 'u_0', labelKey: 'scalar.okun.u_impact', fmt: 'num' },
    { key: 'Ytilde_final', latex: '\\tilde{Y}_T', labelKey: 'scalar.okun.Ytilde_final', fmt: 'num' },
    { key: 'pi_final', latex: '\\pi_T', labelKey: 'scalar.okun.pi_final', fmt: 'num' },
    { key: 'u_final', latex: 'u_T', labelKey: 'scalar.okun.u_final', fmt: 'num' },
  ],

  plots: [
    {
      id: 'gap-path',
      titleKey: 'plot.okun.gapPath',
      xLabelKey: 'axis.time', yLabelKey: 'axis.okun.Ytilde',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.Ytilde, name: `${t('trace.okun.gap')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.Ytilde, name: `${t('trace.okun.gap')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [0, 0], name: t('trace.okun.potential'), scenario: 1, dash: 'dot', role: 'aux', showlegend: false },
          ],
        };
      },
    },
    {
      id: 'inflation-path',
      titleKey: 'plot.okun.inflationPath',
      xLabelKey: 'axis.time', yLabelKey: 'axis.okun.pi',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.pi, name: `${t('trace.okun.inflation')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.pi, name: `${t('trace.okun.inflation')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.pi0, p1.pi0], name: `${t('trace.okun.pi0')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.pi0, p2.pi0], name: `${t('trace.okun.pi0')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'unemployment-path',
      titleKey: 'plot.okun.unemploymentPath',
      xLabelKey: 'axis.time', yLabelKey: 'axis.okun.u',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.u, name: `${t('trace.okun.unemp')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.u, name: `${t('trace.okun.unemp')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.ubar, p1.ubar], name: `${t('trace.okun.ubar')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.ubar, p2.ubar], name: `${t('trace.okun.ubar')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'phillips',
      titleKey: 'plot.okun.phillips',
      xLabelKey: 'axis.okun.Ytilde', yLabelKey: 'axis.okun.dpi',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.phillipsLine, name: `${t('trace.okun.phillipsLine')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.phillipsLine, name: `${t('trace.okun.phillipsLine')} (2)`, scenario: 2 },
            { x: [out1.scalars.Ytilde_impact], y: [out1.scalars.dpi_impact], name: `${t('trace.okun.economy')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: [out2.scalars.Ytilde_impact], y: [out2.scalars.dpi_impact], name: `${t('trace.okun.economy')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
          ],
          layout: {
            shapes: [
              { type: 'line', x0: 0, x1: 0, yref: 'paper', y0: 0, y1: 1, line: { color: '#d1d5db', width: 1, dash: 'dot' } },
            ],
          },
        };
      },
    },
    {
      id: 'okun-line',
      titleKey: 'plot.okun.okunLaw',
      xLabelKey: 'axis.okun.Ytilde', yLabelKey: 'axis.okun.u',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.okunLine, name: `${t('trace.okun.okunLine')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.okunLine, name: `${t('trace.okun.okunLine')} (2)`, scenario: 2 },
            { x: [out1.scalars.Ytilde_impact], y: [out1.scalars.u_impact], name: `${t('trace.okun.economy')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: [out2.scalars.Ytilde_impact], y: [out2.scalars.u_impact], name: `${t('trace.okun.economy')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
          ],
        };
      },
    },
  ],

  equations: [
    '\\tilde{Y}_t \\equiv \\dfrac{Y_t - \\bar{Y}_t}{\\bar{Y}_t}',
    '\\Delta\\pi_t = \\bar{\\nu}\\,\\tilde{Y}_t + \\bar{o}',
    'u_t - \\bar{u} = -\\tfrac{1}{2}\\,\\tilde{Y}_t',
    '\\tilde{Y}_t = \\rho\\,\\tilde{Y}_{t-1}',
  ],

  noteKey: 'model.okun.note',

  strings: {
    en: {
      'model.okun.title': 'Output, Growth & Okun’s Law',
      'param.okun.Ytilde0': 'Initial output gap Ỹ₀ (percent of potential; negative = recession)',
      'param.okun.rho': 'Persistence ρ of the output-gap AR(1) path (0 = one period, →1 = long slump)',
      'param.okun.vbar': 'Phillips-curve slope v̄ (points of Δπ per point of output gap; book ≈ 1/3, exercise 1/2)',
      'param.okun.obar': 'Price (oil) shock ō added to Δπ each period (0 = none)',
      'param.okun.pi0': 'Initial / long-run inflation π₀ (percent)',
      'param.okun.ubar': 'Natural rate of unemployment ū (percent)',
      'param.okun.okun': 'Okun coefficient (book value ½; fixed in the text)',
      'param.okun.T': 'Simulation horizon T (years)',
      'scalar.okun.Ytilde_impact': 'Impact output gap (t = 0)',
      'scalar.okun.dpi_impact': 'Impact change in inflation Δπ₀',
      'scalar.okun.ugap_impact': 'Impact cyclical unemployment u₀ − ū',
      'scalar.okun.u_impact': 'Impact unemployment rate u₀',
      'scalar.okun.Ytilde_final': 'Final-period output gap Ỹ_T',
      'scalar.okun.pi_final': 'Final-period inflation π_T',
      'scalar.okun.u_final': 'Final-period unemployment u_T',
      'plot.okun.gapPath': 'Output-gap path Ỹ_t',
      'plot.okun.inflationPath': 'Inflation path π_t',
      'plot.okun.unemploymentPath': 'Unemployment path u_t',
      'plot.okun.phillips': 'Phillips relation: Δπ vs the output gap',
      'plot.okun.okunLaw': 'Okun’s law: unemployment vs the output gap',
      'axis.time': 'Time (years)',
      'axis.okun.Ytilde': 'Output gap Ỹ (%)',
      'axis.okun.pi': 'Inflation π (%)',
      'axis.okun.u': 'Unemployment u (%)',
      'axis.okun.dpi': 'Change in inflation Δπ (pp)',
      'trace.okun.gap': 'Output gap Ỹ_t',
      'trace.okun.potential': 'Potential (Ỹ = 0)',
      'trace.okun.inflation': 'Inflation π_t',
      'trace.okun.pi0': 'Initial inflation π₀',
      'trace.okun.unemp': 'Unemployment u_t',
      'trace.okun.ubar': 'Natural rate ū',
      'trace.okun.phillipsLine': 'Phillips curve Δπ = v̄·Ỹ + ō',
      'trace.okun.okunLine': 'Okun’s law u = ū − ½·Ỹ',
      'trace.okun.economy': 'Economy (t = 0)',
      'model.okun.note': 'Short-run output Ỹ measures how far actual output is above (boom) or below (recession) potential. A slump lowers inflation through the Phillips curve and raises unemployment through Okun’s law; here the gap closes gradually as an AR(1) process, so inflation drifts to a new level and unemployment returns to its natural rate. This is the intuition behind the full short-run model of Chapters 11–12.',
    },
    es: {
      'model.okun.title': 'Producto, crecimiento y ley de Okun',
      'param.okun.Ytilde0': 'Brecha del producto inicial Ỹ₀ (porcentaje del potencial; negativa = recesión)',
      'param.okun.rho': 'Persistencia ρ de la brecha (proceso AR(1); 0 = un período, →1 = recesión prolongada)',
      'param.okun.vbar': 'Pendiente de la curva de Phillips v̄ (puntos de Δπ por punto de brecha; libro ≈ 1/3, ejercicio 1/2)',
      'param.okun.obar': 'Choque de precios (petrolero) ō sumado a Δπ cada período (0 = ninguno)',
      'param.okun.pi0': 'Inflación inicial / de largo plazo π₀ (porcentaje)',
      'param.okun.ubar': 'Tasa natural de desempleo ū (porcentaje)',
      'param.okun.okun': 'Coeficiente de Okun (valor del libro ½; fijo en el texto)',
      'param.okun.T': 'Horizonte de simulación T (años)',
      'scalar.okun.Ytilde_impact': 'Brecha del producto de impacto (t = 0)',
      'scalar.okun.dpi_impact': 'Cambio de la inflación de impacto Δπ₀',
      'scalar.okun.ugap_impact': 'Desempleo cíclico de impacto u₀ − ū',
      'scalar.okun.u_impact': 'Tasa de desempleo de impacto u₀',
      'scalar.okun.Ytilde_final': 'Brecha del producto final Ỹ_T',
      'scalar.okun.pi_final': 'Inflación del período final π_T',
      'scalar.okun.u_final': 'Desempleo del período final u_T',
      'plot.okun.gapPath': 'Trayectoria de la brecha del producto Ỹ_t',
      'plot.okun.inflationPath': 'Trayectoria de la inflación π_t',
      'plot.okun.unemploymentPath': 'Trayectoria del desempleo u_t',
      'plot.okun.phillips': 'Relación de Phillips: Δπ vs la brecha del producto',
      'plot.okun.okunLaw': 'Ley de Okun: desempleo vs la brecha del producto',
      'axis.time': 'Tiempo (años)',
      'axis.okun.Ytilde': 'Brecha del producto Ỹ (%)',
      'axis.okun.pi': 'Inflación π (%)',
      'axis.okun.u': 'Desempleo u (%)',
      'axis.okun.dpi': 'Cambio de la inflación Δπ (pp)',
      'trace.okun.gap': 'Brecha del producto Ỹ_t',
      'trace.okun.potential': 'Potencial (Ỹ = 0)',
      'trace.okun.inflation': 'Inflación π_t',
      'trace.okun.pi0': 'Inflación inicial π₀',
      'trace.okun.unemp': 'Desempleo u_t',
      'trace.okun.ubar': 'Tasa natural ū',
      'trace.okun.phillipsLine': 'Curva de Phillips Δπ = v̄·Ỹ + ō',
      'trace.okun.okunLine': 'Ley de Okun u = ū − ½·Ỹ',
      'trace.okun.economy': 'Economía (t = 0)',
      'model.okun.note': 'La producción de corto plazo Ỹ mide cuánto está el producto efectivo por encima (auge) o por debajo (recesión) del potencial. Una recesión reduce la inflación a través de la curva de Phillips y eleva el desempleo mediante la ley de Okun; aquí la brecha se cierra gradualmente como un proceso AR(1), de modo que la inflación se desplaza a un nuevo nivel y el desempleo regresa a su tasa natural. Esta es la intuición del modelo completo de corto plazo de los capítulos 11–12.',
    },
  },
};
