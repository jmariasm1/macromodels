// iscurve.js [SHORTRUN]
// Chapter 11 — The IS Curve (Jones, Macroeconomics 6e).
// Composite demand shock abar = a_c + a_i + a_g + a_ex − a_im − 1, the IS curve
//   Ytilde = m·[ abar − bbar·(R − rbar) ],   m = 1/(1 − xbar)
// with the multiplier extension (11.15–11.16). Pure compute(), no DOM/i18n/Plotly.
// See ARCHITECTURE.md + SPEC_SHORTRUN.md §2.
//
// UNITS NOTE (spec ambiguity resolved): Ytilde, R, rbar are percentage-point
// numbers plugged in as-is (book: bbar=2, R−rbar=1 ⇒ Ytilde=−2). So R and rbar
// use unit:'' storing plain percent numbers. bbar and xbar are dimensionless.
// The demand shares a_c…a_im are true fractions of potential output (0–1) with
// unit:'' storing the fraction directly; abar itself is derived, not a slider —
// the user drives the shock through the shares (per the SPEC §4 UI rule).

const GRID_N = 121;

export default {
  id: 'iscurve',
  titleKey: 'model.iscurve.title',
  chapterLabel: 'Ch. 11',

  params: [
    { key: 'abar_c', latex: '\\bar{a}_c', labelKey: 'param.iscurve.abar_c',
      min: 0.4, max: 0.8, step: 0.01, def1: 0.66, def2: 0.66, unit: '' },
    { key: 'abar_i', latex: '\\bar{a}_i', labelKey: 'param.iscurve.abar_i',
      min: 0.05, max: 0.35, step: 0.01, def1: 0.17, def2: 0.17, unit: '' },
    { key: 'abar_g', latex: '\\bar{a}_g', labelKey: 'param.iscurve.abar_g',
      min: 0.05, max: 0.45, step: 0.01, def1: 0.20, def2: 0.20, unit: '' },
    { key: 'abar_ex', latex: '\\bar{a}_{ex}', labelKey: 'param.iscurve.abar_ex',
      min: 0, max: 0.4, step: 0.01, def1: 0.12, def2: 0.12, unit: '' },
    { key: 'abar_im', latex: '\\bar{a}_{im}', labelKey: 'param.iscurve.abar_im',
      min: 0, max: 0.4, step: 0.01, def1: 0.15, def2: 0.15, unit: '' },
    { key: 'bbar', latex: '\\bar{b}', labelKey: 'param.iscurve.bbar',
      min: 0.1, max: 3.0, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'rbar', latex: '\\bar{r}', labelKey: 'param.iscurve.rbar',
      min: 0, max: 8, step: 0.25, def1: 2, def2: 2, unit: '' },
    { key: 'R', latex: 'R', labelKey: 'param.iscurve.R',
      min: 0, max: 10, step: 0.25, def1: 2, def2: 3, unit: '' },
    { key: 'xbar', latex: '\\bar{x}', labelKey: 'param.iscurve.xbar',
      min: 0, max: 0.9, step: 0.05, def1: 0, def2: 0, unit: '' },
  ],

  compute(p) {
    const { abar_c, abar_i, abar_g, abar_ex, abar_im, bbar, rbar, R, xbar } = p;

    // Composite aggregate-demand shock (eq. 11.12 intercept): shares minus 1.
    const abar = abar_c + abar_i + abar_g + abar_ex - abar_im - 1;
    const m = 1 / (1 - xbar); // multiplier 1/(1−x̄)

    // IS curve solved at the current real rate R.
    const Ytilde = m * (abar - bbar * (R - rbar));
    const rateGap = R - rbar;

    // Investment share at R (eq. 11.7): a_i − bbar·(R − rbar); consumption share
    // with the multiplier on (eq. 11.15): a_c + xbar·Ytilde.
    const invShare = abar_i - bbar * rateGap;
    const consShare = abar_c + xbar * Ytilde;

    // --- IS schedule in (Ytilde, R) space: R = rbar + (abar − Ytilde/m)/bbar ---
    // (inverse IS; straight line, passes through (m·abar, rbar).)
    const gMin = -8, gMax = 6;
    const gGrid = [];   // Ytilde grid
    const isR = [];     // R along the IS curve for each Ytilde
    for (let i = 0; i < GRID_N; i++) {
      const g = gMin + ((gMax - gMin) * i) / (GRID_N - 1);
      gGrid.push(g);
      isR.push(rbar + (abar - g / m) / bbar);
    }
    // MP line: horizontal at the current R over the same x-range.
    const mpLine = gGrid.map(() => R);

    // Demand-component shares (schedule/bar view), evaluated at the equilibrium.
    const compNames = ['C', 'I', 'G', 'EX', 'IM'];
    const compShares = [consShare, invShare, abar_g, abar_ex, abar_im];

    return {
      scalars: {
        abar, m, Ytilde, rateGap, invShare, consShare,
      },
      series: {
        gGrid, isR, mpLine,
        // singleton "equilibrium" marker coords kept as length-1 arrays
        eqY: [Ytilde], eqR: [R],
        compNames, compShares,
      },
    };
  },

  scalars: [
    { key: 'abar', latex: '\\bar{a}', labelKey: 'scalar.iscurve.abar', fmt: 'num' },
    { key: 'm', latex: '\\tfrac{1}{1-\\bar{x}}', labelKey: 'scalar.iscurve.m', fmt: 'num' },
    { key: 'Ytilde', latex: '\\tilde{Y}', labelKey: 'scalar.iscurve.Ytilde', fmt: 'num' },
    { key: 'rateGap', latex: 'R-\\bar{r}', labelKey: 'scalar.iscurve.rateGap', fmt: 'num' },
    { key: 'invShare', latex: 'I/\\bar{Y}', labelKey: 'scalar.iscurve.invShare', fmt: 'num' },
    { key: 'consShare', latex: 'C/\\bar{Y}', labelKey: 'scalar.iscurve.consShare', fmt: 'num' },
  ],

  plots: [
    {
      id: 'is-mp',
      titleKey: 'plot.iscurve.isCurve',
      xLabelKey: 'axis.iscurve.Ytilde', yLabelKey: 'axis.iscurve.R',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.isR, name: `${t('trace.iscurve.is')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.isR, name: `${t('trace.iscurve.is')} (2)`, scenario: 2 },
            { x: out1.series.gGrid, y: out1.series.mpLine, name: `${t('trace.iscurve.mp')} (1)`, scenario: 1, dash: 'dash', role: 'aux' },
            { x: out2.series.gGrid, y: out2.series.mpLine, name: `${t('trace.iscurve.mp')} (2)`, scenario: 2, dash: 'dash', role: 'aux' },
            { x: out1.series.eqY, y: out1.series.eqR, name: `${t('trace.iscurve.eq')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: out2.series.eqY, y: out2.series.eqR, name: `${t('trace.iscurve.eq')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
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
      id: 'components',
      titleKey: 'plot.iscurve.components',
      xLabelKey: 'axis.iscurve.component', yLabelKey: 'axis.iscurve.share',
      kind: 'bars',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.compNames, y: out1.series.compShares, name: `${t('trace.iscurve.share')} (1)`, scenario: 1, type: 'bar' },
            { x: out2.series.compNames, y: out2.series.compShares, name: `${t('trace.iscurve.share')} (2)`, scenario: 2, type: 'bar' },
          ],
          layout: { barmode: 'group' },
        };
      },
    },
    {
      id: 'sensitivity',
      titleKey: 'plot.iscurve.sensitivity',
      xLabelKey: 'axis.iscurve.R', yLabelKey: 'axis.iscurve.Ytilde',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        // Output response as the real rate varies (Ytilde as a function of R),
        // with the current policy rate marked. This is the "movement along IS".
        const rMin = 0, rMax = 10, N = 81;
        const line = (p) => {
          const m = 1 / (1 - p.xbar);
          const abar = p.abar_c + p.abar_i + p.abar_g + p.abar_ex - p.abar_im - 1;
          const xs = [], ys = [];
          for (let i = 0; i < N; i++) {
            const R = rMin + ((rMax - rMin) * i) / (N - 1);
            xs.push(R);
            ys.push(m * (abar - p.bbar * (R - p.rbar)));
          }
          return { xs, ys };
        };
        const l1 = line(p1), l2 = line(p2);
        return {
          traces: [
            { x: l1.xs, y: l1.ys, name: `${t('trace.iscurve.response')} (1)`, scenario: 1 },
            { x: l2.xs, y: l2.ys, name: `${t('trace.iscurve.response')} (2)`, scenario: 2 },
            { x: [p1.R], y: [out1.scalars.Ytilde], name: `${t('trace.iscurve.eq')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: [p2.R], y: [out2.scalars.Ytilde], name: `${t('trace.iscurve.eq')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
          ],
        };
      },
    },
  ],

  equations: [
    'Y_t = C_t + I_t + G_t + EX_t - IM_t',
    '\\dfrac{I_t}{\\bar{Y}_t} = \\bar{a}_i - \\bar{b}\\,(R_t - \\bar{r})',
    '\\bar{a} \\equiv \\bar{a}_c + \\bar{a}_i + \\bar{a}_g + \\bar{a}_{ex} - \\bar{a}_{im} - 1',
    '\\tilde{Y}_t = \\bar{a} - \\bar{b}\\,(R_t - \\bar{r})',
    '\\tilde{Y}_t = \\underbrace{\\dfrac{1}{1-\\bar{x}}}_{\\text{multiplier}}\\left[\\,\\bar{a} - \\bar{b}\\,(R_t - \\bar{r})\\,\\right]',
  ],

  noteKey: 'model.iscurve.note',

  strings: {
    en: {
      'model.iscurve.title': 'The IS Curve',
      'param.iscurve.abar_c': 'Consumption share of potential output ā_c',
      'param.iscurve.abar_i': 'Investment share parameter ā_i',
      'param.iscurve.abar_g': 'Government-purchases share ā_g',
      'param.iscurve.abar_ex': 'Export share ā_ex',
      'param.iscurve.abar_im': 'Import share ā_im (enters ā with a minus sign)',
      'param.iscurve.bbar': 'Sensitivity of demand (investment) to the rate gap b̄',
      'param.iscurve.rbar': 'Marginal product of capital = long-run real rate r̄ (%)',
      'param.iscurve.R': 'Real interest rate R (exogenous in Ch. 11) (%)',
      'param.iscurve.xbar': 'Marginal propensity to consume x̄ (multiplier; 0 = off)',
      'scalar.iscurve.abar': 'Aggregate demand shock ā (shares − 1)',
      'scalar.iscurve.m': 'Multiplier 1/(1 − x̄)',
      'scalar.iscurve.Ytilde': 'Short-run output gap Ỹ',
      'scalar.iscurve.rateGap': 'Interest-rate gap R − r̄',
      'scalar.iscurve.invShare': 'Investment share at R',
      'scalar.iscurve.consShare': 'Consumption share at Ỹ',
      'plot.iscurve.isCurve': 'IS–MP diagram (Ỹ, R)',
      'plot.iscurve.components': 'Demand components (shares of potential output)',
      'plot.iscurve.sensitivity': 'Output response to the real interest rate',
      'axis.iscurve.Ytilde': 'Output gap Ỹ (%)',
      'axis.iscurve.R': 'Real interest rate R (%)',
      'axis.iscurve.component': 'Demand component',
      'axis.iscurve.share': 'Share of potential output',
      'trace.iscurve.is': 'IS curve',
      'trace.iscurve.mp': 'MP line (R)',
      'trace.iscurve.eq': 'Equilibrium',
      'trace.iscurve.share': 'Share',
      'trace.iscurve.response': 'Ỹ(R)',
      'model.iscurve.note': 'The IS curve links the real interest rate to short-run output: a higher rate raises the gap R − r̄, cuts investment, and lowers output (movement along the curve). Aggregate-demand shocks — changes in any spending share that move ā away from 0 — shift the curve. The multiplier 1/(1 − x̄) amplifies both, because higher output feeds back into consumption. In the long run R = r̄ and ā = 0, so Ỹ = 0.',
    },
    es: {
      'model.iscurve.title': 'La curva IS',
      'param.iscurve.abar_c': 'Participación del consumo en el producto potencial ā_c',
      'param.iscurve.abar_i': 'Parámetro de participación de la inversión ā_i',
      'param.iscurve.abar_g': 'Participación de las compras del gobierno ā_g',
      'param.iscurve.abar_ex': 'Participación de las exportaciones ā_ex',
      'param.iscurve.abar_im': 'Participación de las importaciones ā_im (entra en ā con signo negativo)',
      'param.iscurve.bbar': 'Sensibilidad de la demanda (inversión) a la brecha de la tasa b̄',
      'param.iscurve.rbar': 'Producto marginal del capital = tasa real de largo plazo r̄ (%)',
      'param.iscurve.R': 'Tasa de interés real R (exógena en el cap. 11) (%)',
      'param.iscurve.xbar': 'Propensión marginal a consumir x̄ (multiplicador; 0 = apagado)',
      'scalar.iscurve.abar': 'Choque de demanda agregada ā (participaciones − 1)',
      'scalar.iscurve.m': 'Multiplicador 1/(1 − x̄)',
      'scalar.iscurve.Ytilde': 'Brecha del producto de corto plazo Ỹ',
      'scalar.iscurve.rateGap': 'Brecha de la tasa de interés R − r̄',
      'scalar.iscurve.invShare': 'Participación de la inversión en R',
      'scalar.iscurve.consShare': 'Participación del consumo en Ỹ',
      'plot.iscurve.isCurve': 'Diagrama IS–MP (Ỹ, R)',
      'plot.iscurve.components': 'Componentes de la demanda (participaciones del producto potencial)',
      'plot.iscurve.sensitivity': 'Respuesta del producto a la tasa de interés real',
      'axis.iscurve.Ytilde': 'Brecha del producto Ỹ (%)',
      'axis.iscurve.R': 'Tasa de interés real R (%)',
      'axis.iscurve.component': 'Componente de la demanda',
      'axis.iscurve.share': 'Participación del producto potencial',
      'trace.iscurve.is': 'Curva IS',
      'trace.iscurve.mp': 'Línea MP (R)',
      'trace.iscurve.eq': 'Equilibrio',
      'trace.iscurve.share': 'Participación',
      'trace.iscurve.response': 'Ỹ(R)',
      'model.iscurve.note': 'La curva IS relaciona la tasa de interés real con la producción de corto plazo: una tasa más alta amplía la brecha R − r̄, reduce la inversión y disminuye el producto (movimiento a lo largo de la curva). Los choques de demanda agregada —cambios en cualquier participación del gasto que alejan ā de 0— desplazan la curva. El multiplicador 1/(1 − x̄) amplifica ambos efectos, porque un mayor producto retroalimenta el consumo. En el largo plazo R = r̄ y ā = 0, de modo que Ỹ = 0.',
    },
  },
};
