// inflation.js [LONGRUN]
// Chapter 8 — Inflation (Jones 6e): the quantity theory of money,
// the inflation rate, the Fisher equation and the inflation tax.
// P* = Mbar·Vbar/Ybar (eq. 8.2); pi = gM + gV − gY (eq. 8.3–8.4, gV = 0 in the
// book's baseline); i = R + pi (Fisher, eq. 8.5); inflation-tax share = gM/Vbar.
// See SPEC_LONGRUN.md Part 3.

const T_DEFAULT = 50;
const GM_GRID_MAX = 0.30; // range of the pi-vs-gM theoretical line

export default {
  id: 'inflation',
  titleKey: 'model.inflation.title',
  chapterLabel: 'Ch. 8',
  T: T_DEFAULT,

  params: [
    { key: 'Mbar', latex: '\\bar{M}', labelKey: 'param.inflation.Mbar',
      min: 10, max: 2000, step: 10, def1: 200, def2: 200, unit: '' },
    { key: 'Vbar', latex: '\\bar{V}', labelKey: 'param.inflation.Vbar',
      min: 0.5, max: 20, step: 0.5, def1: 5, def2: 5, unit: '' },
    { key: 'Ybar', latex: '\\bar{Y}', labelKey: 'param.inflation.Ybar',
      min: 100, max: 5000, step: 50, def1: 1000, def2: 1000, unit: '' },
    { key: 'gM', latex: '\\bar{g}_M', labelKey: 'param.inflation.gM',
      min: -0.05, max: 0.30, step: 0.005, def1: 0.07, def2: 0.07, unit: '%' },
    { key: 'gV', latex: '\\bar{g}_V', labelKey: 'param.inflation.gV',
      min: -0.05, max: 0.10, step: 0.005, def1: 0.0, def2: 0.0, unit: '%' },
    { key: 'gY', latex: '\\bar{g}_Y', labelKey: 'param.inflation.gY',
      min: -0.02, max: 0.08, step: 0.005, def1: 0.04, def2: 0.04, unit: '%' },
    { key: 'R', latex: 'R', labelKey: 'param.inflation.R',
      min: -0.05, max: 0.10, step: 0.005, def1: 0.02, def2: 0.02, unit: '%' },
  ],

  compute(p) {
    const { Mbar, Vbar, Ybar, gM, gV, gY, R } = p;

    // --- Closed forms ---
    const Pstar = (Mbar * Vbar) / Ybar; // eq. (8.2)
    const pi = gM + gV - gY; // eq. (8.3)-(8.4), general form before gV = 0
    const iNom = R + pi; // Fisher equation (8.5)
    const realBalances = Ybar / Vbar; // M/P = Y/V (real money demand implied)
    const inflTax = gM / Vbar; // seignorage/GDP = gM·(M/PY) = gM/V

    // --- Time paths: M, V, Y grow at constant rates; P from quantity eq. ---
    const t = [];
    const M = [];
    const Y = [];
    const P = [];
    const piPath = []; // realized inflation between t-1 and t
    let Mt = Mbar;
    let Vt = Vbar;
    let Yt = Ybar;
    let Pprev = null;
    for (let i = 0; i <= T_DEFAULT; i++) {
      const Pt = (Mt * Vt) / Yt;
      t.push(i);
      M.push(Mt);
      Y.push(Yt);
      P.push(Pt);
      // Realized discrete-time inflation; at t=0 use the constant-growth value
      // (1+gM)(1+gV)/(1+gY) − 1, which π = gM+gV−gY approximates.
      piPath.push(Pprev === null
        ? ((1 + gM) * (1 + gV)) / (1 + gY) - 1
        : Pt / Pprev - 1);
      Pprev = Pt;
      Mt *= 1 + gM;
      Vt *= 1 + gV;
      Yt *= 1 + gY;
    }
    const iPath = piPath.map((x) => R + x);

    // --- pi vs gM theoretical line: pi = gM + gV − gY over a grid of gM ---
    const gMGrid = [];
    const piLine = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const g = -0.05 + ((GM_GRID_MAX + 0.05) * i) / N;
      gMGrid.push(100 * g);
      piLine.push(100 * (g + gV - gY));
    }

    return {
      scalars: { Pstar, pi, iNom, R, realBalances, inflTax },
      series: { t, M, Y, P, piPath, iPath, gMGrid, piLine },
    };
  },

  scalars: [
    { key: 'Pstar', latex: 'P^*', labelKey: 'scalar.inflation.Pstar', fmt: 'num' },
    { key: 'pi', latex: '\\pi^*', labelKey: 'scalar.inflation.pi', fmt: 'pct' },
    { key: 'iNom', latex: 'i', labelKey: 'scalar.inflation.iNom', fmt: 'pct' },
    { key: 'R', latex: 'R', labelKey: 'scalar.inflation.R', fmt: 'pct' },
    { key: 'realBalances', latex: 'M/P', labelKey: 'scalar.inflation.realBalances', fmt: 'num' },
    { key: 'inflTax', latex: '\\bar{g}_M/\\bar{V}', labelKey: 'scalar.inflation.inflTax', fmt: 'pct' },
  ],

  plots: [
    {
      id: 'price-time',
      titleKey: 'plot.inflation.priceTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.inflation.P',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.t, y: out1.series.P, name: `P_t (1)`, scenario: 1 },
            { x: out2.series.t, y: out2.series.P, name: `P_t (2)`, scenario: 2 },
          ],
          layout: { yaxis: { type: 'log' } },
        };
      },
    },
    {
      id: 'money-output-time',
      titleKey: 'plot.inflation.moneyOutputTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.inflation.MY',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.t, y: out1.series.M, name: `${t('trace.inflation.M')} (1)`, scenario: 1 },
            { x: out2.series.t, y: out2.series.M, name: `${t('trace.inflation.M')} (2)`, scenario: 2 },
            { x: out1.series.t, y: out1.series.Y, name: `${t('trace.inflation.Y')} (1)`, scenario: 1, dash: 'dash', role: 'aux' },
            { x: out2.series.t, y: out2.series.Y, name: `${t('trace.inflation.Y')} (2)`, scenario: 2, dash: 'dash', role: 'aux' },
          ],
          layout: { yaxis: { type: 'log' } },
        };
      },
    },
    {
      id: 'pi-vs-gm',
      titleKey: 'plot.inflation.piVsGm',
      xLabelKey: 'axis.inflation.gM', yLabelKey: 'axis.inflation.piPct',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gMGrid, y: out1.series.piLine,
              name: `${t('trace.inflation.qtLine')} (1)`, scenario: 1 },
            { x: out2.series.gMGrid, y: out2.series.piLine,
              name: `${t('trace.inflation.qtLine')} (2)`, scenario: 2, dash: 'dash' },
            { x: [100 * p1.gM], y: [100 * out1.scalars.pi],
              name: `${t('trace.inflation.point')} (1)`, scenario: 1,
              mode: 'markers', marker: { size: 9 } },
            { x: [100 * p2.gM], y: [100 * out2.scalars.pi],
              name: `${t('trace.inflation.point')} (2)`, scenario: 2,
              mode: 'markers', marker: { size: 9 } },
          ],
        };
      },
    },
    {
      id: 'fisher-time',
      titleKey: 'plot.inflation.fisherTime',
      xLabelKey: 'axis.time', yLabelKey: 'axis.inflation.ratePct',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const pc = (arr) => arr.map((v) => 100 * v);
        return {
          traces: [
            { x: out1.series.t, y: pc(out1.series.iPath),
              name: `${t('trace.inflation.iNom')} (1)`, scenario: 1 },
            { x: out2.series.t, y: pc(out2.series.iPath),
              name: `${t('trace.inflation.iNom')} (2)`, scenario: 2 },
            { x: out1.series.t, y: out1.series.t.map(() => 100 * p1.R),
              name: `${t('trace.inflation.rReal')} (1)`, scenario: 1, dash: 'dash', role: 'aux' },
            { x: out2.series.t, y: out2.series.t.map(() => 100 * p2.R),
              name: `${t('trace.inflation.rReal')} (2)`, scenario: 2, dash: 'dash', role: 'aux' },
            { x: out1.series.t, y: pc(out1.series.piPath),
              name: `${t('trace.inflation.piT')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: out2.series.t, y: pc(out2.series.piPath),
              name: `${t('trace.inflation.piT')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
  ],

  equations: [
    'M_t \\bar{V} = P_t \\bar{Y}_t\\qquad P_t^* = \\dfrac{\\bar{M}_t\\,\\bar{V}}{\\bar{Y}_t}',
    '\\pi^* = \\bar{g}_M + \\bar{g}_V - \\bar{g}_Y',
    'i = R + \\pi \\qquad\\text{(Fisher)}',
    '\\dfrac{\\Delta M}{P\\,Y} = \\dfrac{\\bar{g}_M}{\\bar{V}}\\qquad\\text{(inflation tax)}',
  ],

  noteKey: 'model.inflation.note',

  strings: {
    en: {
      'model.inflation.title': 'Inflation & the Quantity Theory of Money',
      'param.inflation.Mbar': 'Money supply M̄ (initial level)',
      'param.inflation.Vbar': 'Velocity of money V̄ (constant)',
      'param.inflation.Ybar': 'Real GDP Ȳ (initial level, exogenous from the growth model)',
      'param.inflation.gM': 'Money growth rate ḡ_M (central-bank policy)',
      'param.inflation.gV': 'Velocity growth rate ḡ_V (0 in the book’s baseline)',
      'param.inflation.gY': 'Real GDP growth rate ḡ_Y',
      'param.inflation.R': 'Real interest rate R (in the long run, the MPK from the Solow model)',
      'scalar.inflation.Pstar': 'Price level',
      'scalar.inflation.pi': 'Inflation rate',
      'scalar.inflation.iNom': 'Nominal interest rate (Fisher)',
      'scalar.inflation.R': 'Real interest rate',
      'scalar.inflation.realBalances': 'Real money balances M/P',
      'scalar.inflation.inflTax': 'Inflation tax (share of GDP)',
      'plot.inflation.priceTime': 'Price level over time (log scale)',
      'plot.inflation.moneyOutputTime': 'Money and real GDP over time (log scale)',
      'plot.inflation.piVsGm': 'Inflation vs. money growth (quantity theory line)',
      'plot.inflation.fisherTime': 'Nominal and real interest rates (Fisher equation)',
      'axis.time': 'Time (periods)',
      'axis.inflation.P': 'Price level, P',
      'axis.inflation.MY': 'Money M, real GDP Y',
      'axis.inflation.gM': 'Money growth rate (%)',
      'axis.inflation.piPct': 'Inflation rate (%)',
      'axis.inflation.ratePct': 'Interest / inflation rate (%)',
      'trace.inflation.M': 'Money M_t',
      'trace.inflation.Y': 'Real GDP Y_t',
      'trace.inflation.qtLine': 'π = g_M + g_V − g_Y',
      'trace.inflation.point': 'Current (g_M, π)',
      'trace.inflation.iNom': 'Nominal rate i_t',
      'trace.inflation.rReal': 'Real rate R',
      'trace.inflation.piT': 'Inflation π_t',
      'model.inflation.note': 'The quantity theory pins down the price level: P* = M̄V̄/Ȳ. Taking growth rates, inflation equals money growth (plus velocity growth) minus real GDP growth — in the long run, inflation is a monetary phenomenon (classical dichotomy: money is neutral for real variables). The Fisher equation then splits the nominal interest rate into the real rate plus inflation.',
    },
    es: {
      'model.inflation.title': 'Inflación y teoría cuantitativa del dinero',
      'param.inflation.Mbar': 'Oferta monetaria M̄ (nivel inicial)',
      'param.inflation.Vbar': 'Velocidad del dinero V̄ (constante)',
      'param.inflation.Ybar': 'PIB real Ȳ (nivel inicial, exógeno desde el modelo de crecimiento)',
      'param.inflation.gM': 'Tasa de crecimiento del dinero ḡ_M (política del banco central)',
      'param.inflation.gV': 'Tasa de crecimiento de la velocidad ḡ_V (0 en el caso base del libro)',
      'param.inflation.gY': 'Tasa de crecimiento del PIB real ḡ_Y',
      'param.inflation.R': 'Tasa de interés real R (en el largo plazo, el PMgK del modelo de Solow)',
      'scalar.inflation.Pstar': 'Nivel de precios',
      'scalar.inflation.pi': 'Tasa de inflación',
      'scalar.inflation.iNom': 'Tasa de interés nominal (Fisher)',
      'scalar.inflation.R': 'Tasa de interés real',
      'scalar.inflation.realBalances': 'Saldos monetarios reales M/P',
      'scalar.inflation.inflTax': 'Impuesto inflacionario (proporción del PIB)',
      'plot.inflation.priceTime': 'Nivel de precios en el tiempo (escala logarítmica)',
      'plot.inflation.moneyOutputTime': 'Dinero y PIB real en el tiempo (escala logarítmica)',
      'plot.inflation.piVsGm': 'Inflación vs. crecimiento del dinero (línea de la teoría cuantitativa)',
      'plot.inflation.fisherTime': 'Tasas de interés nominal y real (ecuación de Fisher)',
      'axis.time': 'Tiempo (períodos)',
      'axis.inflation.P': 'Nivel de precios, P',
      'axis.inflation.MY': 'Dinero M, PIB real Y',
      'axis.inflation.gM': 'Crecimiento del dinero (%)',
      'axis.inflation.piPct': 'Tasa de inflación (%)',
      'axis.inflation.ratePct': 'Tasa de interés / inflación (%)',
      'trace.inflation.M': 'Dinero M_t',
      'trace.inflation.Y': 'PIB real Y_t',
      'trace.inflation.qtLine': 'π = g_M + g_V − g_Y',
      'trace.inflation.point': 'Punto actual (g_M, π)',
      'trace.inflation.iNom': 'Tasa nominal i_t',
      'trace.inflation.rReal': 'Tasa real R',
      'trace.inflation.piT': 'Inflación π_t',
      'model.inflation.note': 'La teoría cuantitativa determina el nivel de precios: P* = M̄V̄/Ȳ. Tomando tasas de crecimiento, la inflación es igual al crecimiento del dinero (más el de la velocidad) menos el crecimiento del PIB real: en el largo plazo, la inflación es un fenómeno monetario (dicotomía clásica: el dinero es neutral respecto de las variables reales). La ecuación de Fisher descompone la tasa de interés nominal en la tasa real más la inflación.',
    },
  },
};
