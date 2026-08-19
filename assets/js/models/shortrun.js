// shortrun.js — the short-run business-cycle economy (Jones, Macroeconomics 6e,
// ch. 9-12): IS curve + monetary policy (MP) or money market (LM), the Phillips
// curve, Okun's law, the investment-savings market and the money market.
//
// This is a faithful port of the professor's Short-Run Macro site
// (https://jmariasm1.github.io/shortrunmacro/): identical parameter names,
// identical equations, identical endogenous variables and identical diagrams.
// What is new here is that it is bilingual, the two parameter sets are called
// economies and are distinguished by colour, and each equation is named.
//
// compute() is pure: no DOM, no i18n, no Plotly. It runs unchanged in Node.

const N = 140;                          // samples per curve
const BASE = [-0.2, 0.2];               // default axis window for gaps and rates
const SAMPLE = [-0.4, 0.4];             // wider window used to sample the curves

// ---------------------------------------------------------------- primitives
function isBase(p) {
  return p.aC + p.aI + p.aG + p.aX - p.aM - 1 - p.aC * p.tau;
}

function isIntercept(p) {
  return isBase(p) + p.bI * p.rBar;
}

/** IS curve: the short-run output gap implied by a real interest rate R. */
function isCurveY(p, R) {
  return isBase(p) - p.bI * (R - p.rBar);
}

/** LM curve: the output gap that clears the money market at a real rate R. */
function lmCurveY(p, R) {
  if (Math.abs(p.mY) < 1e-9) return NaN;
  return (p.MBar - p.MDmax + p.mi * (R + p.pi)) / p.mY;
}

function savingsValue(p) {
  return (1 - (1 + p.tau) * p.aC - p.aG - p.aX + p.aM) * p.yBar;
}

function investmentValue(p, R) {
  return (p.aI - p.bI * (R - p.rBar)) * p.yBar;
}

/** Real interest rate where IS meets LM. */
function lmRate(p) {
  if (Math.abs(p.mY) < 1e-9) return NaN;
  const lmInt = (p.MBar - p.MDmax + p.mi * p.pi) / p.mY;
  const lmSlope = p.mi / p.mY;
  const den = p.bI + lmSlope;
  if (Math.abs(den) < 1e-9) return NaN;
  return (isIntercept(p) - lmInt) / den;
}

function linspace(a, b, n) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Array.from({ length: n }, (_, i) => i);
  if (n <= 1) return [a];
  const step = (b - a) / (n - 1);
  return Array.from({ length: n }, (_, i) => a + step * i);
}

/** Widen `base` just enough to contain `values`, with a little padding. */
function expand(base, values, ratio = 0.1, minPad = 0.02) {
  const f = values.filter(Number.isFinite);
  if (!f.length) return [...base];
  const lo = Math.min(...f);
  const hi = Math.max(...f);
  let [min, max] = base;
  if (lo >= min && hi <= max) return [min, max];
  const span = Math.max(max - min, hi - lo, minPad * 2);
  const pad = Math.max(span * ratio, minPad);
  return [Math.min(min, lo - pad), Math.max(max, hi + pad)];
}

/** Symmetric-ish window around a set of values (used for free axes). */
function around(values, ratio = 0.22, fallback = 1) {
  const f = values.filter(Number.isFinite);
  if (!f.length) return [-fallback, fallback];
  const lo = Math.min(...f);
  const hi = Math.max(...f);
  if (Math.abs(hi - lo) < 1e-9) {
    const pad = Math.max(Math.abs(hi) * ratio, fallback);
    return [lo - pad, hi + pad];
  }
  const pad = Math.max((hi - lo) * ratio, fallback * 0.2);
  return [lo - pad, hi + pad];
}

function nearly(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-6 * scale;
}

export default {
  id: 'shortrun',
  titleKey: 'model.sr.title',

  variants: [
    { id: 'ismp', labelKey: 'sr.variant.ismp' },
    { id: 'islm', labelKey: 'sr.variant.islm' },
  ],

  params: [
    { key: 'aC', latex: '\\bar{a}_C', labelKey: 'p.sr.aC', groupKey: 'g.sr.demand',
      step: 0.05, def1: 0.3, def2: 0.3, variants: ['ismp', 'islm'] },
    { key: 'aI', latex: '\\bar{a}_I', labelKey: 'p.sr.aI', groupKey: 'g.sr.demand',
      step: 0.05, def1: 0.3, def2: 0.3, variants: ['ismp', 'islm'] },
    { key: 'aG', latex: '\\bar{a}_G', labelKey: 'p.sr.aG', groupKey: 'g.sr.demand',
      step: 0.05, def1: 0.3, def2: 0.3, variants: ['ismp', 'islm'] },
    { key: 'aX', latex: '\\bar{a}_X', labelKey: 'p.sr.aX', groupKey: 'g.sr.demand',
      step: 0.05, def1: 0.3, def2: 0.3, variants: ['ismp', 'islm'] },
    { key: 'aM', latex: '\\bar{a}_M', labelKey: 'p.sr.aM', groupKey: 'g.sr.demand',
      step: 0.05, def1: 0.2, def2: 0.2, variants: ['ismp', 'islm'] },
    { key: 'bI', latex: '\\bar{b}_I', labelKey: 'p.sr.bI', groupKey: 'g.sr.demand',
      step: 0.01, def1: 0.75, def2: 0.75, variants: ['ismp', 'islm'] },
    { key: 'rBar', latex: '\\bar{r}_t', labelKey: 'p.sr.rBar', groupKey: 'g.sr.demand',
      step: 0.01, def1: 0.05, def2: 0.05, variants: ['ismp', 'islm'] },
    { key: 'tau', latex: '\\tau', labelKey: 'p.sr.tau', groupKey: 'g.sr.demand',
      step: 0.01, def1: 0, def2: 0, variants: ['ismp', 'islm'] },

    { key: 'RBar', latex: '\\bar{R}', labelKey: 'p.sr.RBar', groupKey: 'g.sr.policy',
      step: 0.01, def1: 0.05, def2: 0.05, variants: ['ismp'] },
    { key: 'MBar', latex: '\\bar{M}_t', labelKey: 'p.sr.MBar', groupKey: 'g.sr.policy',
      step: 0.1, def1: 9.6, def2: 9.6, variants: ['islm'] },
    { key: 'pi', latex: '\\pi_t', labelKey: 'p.sr.pi', groupKey: 'g.sr.policy',
      step: 0.01, def1: 0.03, def2: 0.03, variants: ['ismp', 'islm'] },

    { key: 'MDmax', latex: 'M^{D}_{i=0}', labelKey: 'p.sr.MDmax', groupKey: 'g.sr.money',
      step: 0.1, def1: 10, def2: 10, variants: ['ismp', 'islm'] },
    { key: 'mi', latex: 'm_i', labelKey: 'p.sr.mi', groupKey: 'g.sr.money',
      step: 0.1, def1: 5, def2: 5, variants: ['ismp', 'islm'] },
    { key: 'mY', latex: 'm_Y', labelKey: 'p.sr.mY', groupKey: 'g.sr.money',
      step: 0.1, def1: 1, def2: 1, variants: ['ismp', 'islm'] },

    { key: 'vBar', latex: '\\bar{v}', labelKey: 'p.sr.vBar', groupKey: 'g.sr.phillips',
      step: 0.05, def1: 1.25, def2: 1.25, variants: ['ismp', 'islm'] },
    { key: 'oBar', latex: '\\bar{o}', labelKey: 'p.sr.oBar', groupKey: 'g.sr.phillips',
      step: 0.01, def1: 0, def2: 0, variants: ['ismp', 'islm'] },
    { key: 'muBar', latex: '\\bar{\\mu}', labelKey: 'p.sr.muBar', groupKey: 'g.sr.phillips',
      step: 0.01, def1: 0.05, def2: 0.05, variants: ['ismp', 'islm'] },
    { key: 'wBar', latex: '\\bar{w}', labelKey: 'p.sr.wBar', groupKey: 'g.sr.phillips',
      step: 0.001, def1: 0.75, def2: 0.75, variants: ['ismp', 'islm'] },
    { key: 'yBar', latex: '\\bar{Y}_t', labelKey: 'p.sr.yBar', groupKey: 'g.sr.phillips',
      step: 1, def1: 100, def2: 100, variants: ['ismp', 'islm'] },
  ],

  compute(p, variant = 'ismp') {
    const R = variant === 'ismp' ? p.RBar : lmRate(p);
    const y = Number.isFinite(R) ? isCurveY(p, R) : NaN;
    const i = R + p.pi;
    const moneyDemand = p.MDmax - p.mi * i + p.mY * y;
    const moneySupply = variant === 'ismp' ? moneyDemand : p.MBar;
    const savings = savingsValue(p);
    const investment = investmentValue(p, R);
    const deltaPi = p.vBar * y + p.oBar;
    const piExpected = p.pi + deltaPi;
    const muGap = -p.wBar * y;
    const mu = p.muBar + muGap;

    // ------------------------------------------------------------- curves
    const yDom = expand(SAMPLE, [y]);
    const rDom = expand(SAMPLE, [R]);
    const iDom = expand(SAMPLE, [i]);
    const Rs = linspace(rDom[0], rDom[1], N);
    const Ys = linspace(yDom[0], yDom[1], N);
    const Is = linspace(iDom[0], iDom[1], N);

    const isX = Rs.map((r) => isCurveY(p, r));
    const policyX = variant === 'ismp' ? Ys : Rs.map((r) => lmCurveY(p, r));
    const policyY = variant === 'ismp' ? Ys.map(() => p.RBar) : Rs;

    const invX = Rs.map((r) => investmentValue(p, r));
    const savX = Rs.map(() => savingsValue(p));
    const mdX = Is.map((ii) => p.MDmax - p.mi * ii + p.mY * y);
    const msX = Is.map(() => moneySupply);

    return {
      scalars: {
        y, R, i, moneyDemand, moneySupply, savings, investment,
        deltaPi, piExpected, mu, muGap,
      },
      series: {
        Rs, Ys, Is,
        isX, policyX, policyY,
        invX, savX, mdX, msX,
      },
      meta: { variant },
    };
  },

  scalars: [
    { key: 'y', latex: '\\tilde{Y}_t', labelKey: 's.sr.y', fmt: 'pct', groupKey: 'g.sr.out' },
    { key: 'R', latex: 'R_t', labelKey: 's.sr.R', fmt: 'pct', groupKey: 'g.sr.out' },
    { key: 'i', latex: 'i_t', labelKey: 's.sr.i', fmt: 'pct', groupKey: 'g.sr.out' },
    { key: 'moneyDemand', latex: 'M^{D}_t', labelKey: 's.sr.md', fmt: 'num', groupKey: 'g.sr.out' },
    { key: 'moneySupply', latex: 'M^{S}_t', labelKey: 's.sr.ms', fmt: 'num', groupKey: 'g.sr.out' },
    { key: 'savings', latex: 'S_t', labelKey: 's.sr.S', fmt: 'num', groupKey: 'g.sr.out' },
    { key: 'investment', latex: 'I_t', labelKey: 's.sr.I', fmt: 'num', groupKey: 'g.sr.out' },
    { key: 'deltaPi', latex: '\\Delta\\pi_{t+1}', labelKey: 's.sr.dpi', fmt: 'num', groupKey: 'g.sr.out' },
    { key: 'piExpected', latex: '\\pi^{e}_{t+1}', labelKey: 's.sr.pie', fmt: 'pct', groupKey: 'g.sr.out' },
    { key: 'mu', latex: '\\mu_t', labelKey: 's.sr.mu', fmt: 'pct', groupKey: 'g.sr.out' },
  ],

  plots: [
    {
      id: 'main-diagram',
      titleKey: 'pl.sr.main',
      xLabelKey: 'ax.sr.y',
      yLabelKey: 'ax.sr.R',
      build(o1, o2, p1, p2, t) {
        const variant = o1.meta.variant;
        const pol = variant === 'ismp' ? 'MP' : 'LM';
        const yR = expand(BASE, [o1.scalars.y, o2.scalars.y], 0.08);
        const rR = expand(BASE, [o1.scalars.R, o2.scalars.R], 0.08);
        const traces = [];
        const add = (o, e) => {
          traces.push({ x: o.series.isX, y: o.series.Rs, name: `IS (${e})`, economy: e });
          traces.push({ x: o.series.policyX, y: o.series.policyY, name: `${pol} (${e})`,
            economy: e, dash: 'dash' });
        };
        add(o1, 1);
        add(o2, 2);
        [[p1, 1], [p2, 2]].forEach(([p, e]) => {
          traces.push({ x: yR, y: [p.rBar, p.rBar], name: `r̄ (${e})`,
            economy: e, dash: 'dot', role: 'aux' });
        });
        traces.push(eqPoint(o1.scalars.y, o1.scalars.R, 'E1', 1));
        traces.push(eqPoint(o2.scalars.y, o2.scalars.R, 'E2', 2));
        return {
          traces,
          layout: {
            xaxis: { range: yR, tickformat: '.0%', hoverformat: '.2%' },
            yaxis: { range: rR, tickformat: '.0%', hoverformat: '.2%' },
          },
        };
      },
    },
    {
      id: 'phillips',
      titleKey: 'pl.sr.phillips',
      xLabelKey: 'ax.sr.y',
      yLabelKey: 'ax.sr.dpi',
      build(o1, o2, p1, p2, t) {
        const yR = expand(BASE, [o1.scalars.y, o2.scalars.y], 0.08);
        const line = (p, o) => o.series.Ys.map((yy) => p.vBar * yy + p.oBar);
        const yy = [...line(p1, o1), ...line(p2, o2), o1.scalars.deltaPi, o2.scalars.deltaPi];
        return {
          traces: [
            { x: o1.series.Ys, y: line(p1, o1), name: `PC (1)`, economy: 1 },
            { x: o2.series.Ys, y: line(p2, o2), name: `PC (2)`, economy: 2, dash: 'dash' },
            eqPoint(o1.scalars.y, o1.scalars.deltaPi, 'E1', 1),
            eqPoint(o2.scalars.y, o2.scalars.deltaPi, 'E2', 2),
          ],
          layout: {
            xaxis: { range: yR, tickformat: '.0%', hoverformat: '.2%' },
            yaxis: { range: around(yy, 0.22, 1), hoverformat: '.3f' },
          },
        };
      },
    },
    {
      id: 'okun',
      titleKey: 'pl.sr.okun',
      xLabelKey: 'ax.sr.y',
      yLabelKey: 'ax.sr.mugap',
      build(o1, o2, p1, p2, t) {
        const yR = expand(BASE, [o1.scalars.y, o2.scalars.y], 0.08);
        const line = (p, o) => o.series.Ys.map((yy) => -p.wBar * yy);
        const yy = [...line(p1, o1), ...line(p2, o2), o1.scalars.muGap, o2.scalars.muGap];
        return {
          traces: [
            { x: o1.series.Ys, y: line(p1, o1), name: `Okun (1)`, economy: 1 },
            { x: o2.series.Ys, y: line(p2, o2), name: `Okun (2)`, economy: 2, dash: 'dash' },
            eqPoint(o1.scalars.y, o1.scalars.muGap, 'E1', 1),
            eqPoint(o2.scalars.y, o2.scalars.muGap, 'E2', 2),
          ],
          layout: {
            xaxis: { range: yR, tickformat: '.0%', hoverformat: '.2%' },
            yaxis: { range: around(yy, 0.22, 1), hoverformat: '.3f' },
          },
        };
      },
    },
    {
      id: 'investment-savings',
      titleKey: 'pl.sr.invsav',
      xLabelKey: 'ax.sr.IS',
      yLabelKey: 'ax.sr.R',
      build(o1, o2, p1, p2, t) {
        const rR = expand(BASE, [o1.scalars.R, o2.scalars.R], 0.08);
        const xs = [...o1.series.invX, ...o1.series.savX, ...o2.series.invX, ...o2.series.savX];
        const xR = around(xs, 0.18, 1);
        const traces = [];
        const add = (o, e) => {
          traces.push({ x: o.series.invX, y: o.series.Rs, name: `I (${e})`, economy: e });
          traces.push({ x: o.series.savX, y: o.series.Rs, name: `S (${e})`, economy: e, dash: 'dash' });
          traces.push({ x: xR, y: [o.scalars.R, o.scalars.R], name: `R (${e})`,
            economy: e, dash: 'dot', role: 'aux' });
        };
        add(o1, 1);
        add(o2, 2);
        [[o1, 1], [o2, 2]].forEach(([o, e]) => {
          if (nearly(o.scalars.savings, o.scalars.investment)) {
            traces.push(eqPoint(o.scalars.savings, o.scalars.R, `E${e}`, e));
          } else {
            traces.push(eqPoint(o.scalars.savings, o.scalars.R, `S(${e})`, e));
            traces.push(eqPoint(o.scalars.investment, o.scalars.R, `I(${e})`, e));
          }
        });
        return {
          traces,
          layout: {
            xaxis: { range: xR },
            yaxis: { range: rR, tickformat: '.0%', hoverformat: '.2%' },
          },
        };
      },
    },
    {
      id: 'money-market',
      titleKey: 'pl.sr.money',
      xLabelKey: 'ax.sr.M',
      yLabelKey: 'ax.sr.i',
      build(o1, o2, p1, p2, t) {
        const iR = expand(BASE, [o1.scalars.i, o2.scalars.i], 0.08);
        const xs = [...o1.series.mdX, ...o1.series.msX, ...o2.series.mdX, ...o2.series.msX];
        const traces = [];
        const add = (o, e) => {
          traces.push({ x: o.series.mdX, y: o.series.Is, name: `Mᴰ (${e})`, economy: e });
          traces.push({ x: o.series.msX, y: o.series.Is, name: `Mˢ (${e})`, economy: e, dash: 'dash' });
          traces.push(eqPoint(o.scalars.moneySupply, o.scalars.i, `E${e}`, e));
        };
        add(o1, 1);
        add(o2, 2);
        return {
          traces,
          layout: {
            xaxis: { range: around(xs, 0.16, 1) },
            yaxis: { range: iR, tickformat: '.0%', hoverformat: '.2%' },
          },
        };
      },
    },
  ],

  equations(variant = 'ismp') {
    const eqs = [
      { nameKey: 'eq.sr.is', tex: '\\tilde{Y}_t = \\bar{a}_C + \\bar{a}_I + \\bar{a}_G + \\bar{a}_X - \\bar{a}_M - 1 - \\bar{b}_I\\left(R_t - \\bar{r}_t\\right) - \\bar{a}_C\\,\\tau' },
    ];
    if (variant === 'ismp') {
      eqs.push({ nameKey: 'eq.sr.mp', tex: 'R_t = \\bar{R}' });
    } else {
      eqs.push({ nameKey: 'eq.sr.lm', tex: '\\tilde{Y}_t = \\dfrac{\\bar{M}_t}{m_Y} - \\dfrac{M^{D}_{i=0}}{m_Y} + \\dfrac{m_i}{m_Y}\\left(R_t + \\pi_t\\right)' });
    }
    eqs.push(
      { nameKey: 'eq.sr.fisher', tex: 'i_t = R_t + \\pi_t' },
      { nameKey: 'eq.sr.md', tex: 'M^{D}_t = M^{D}_{i=0} - m_i\\,i_t + m_Y\\,\\tilde{Y}_t' },
      { nameKey: 'eq.sr.ms',
        tex: variant === 'ismp' ? 'M^{S}_t = M^{D}_t' : 'M^{S}_t = \\bar{M}_t = M^{D}_t' },
      { nameKey: 'eq.sr.S', tex: 'S_t = \\left[\\,1 - (1+\\tau)\\bar{a}_C - \\bar{a}_G - \\bar{a}_X + \\bar{a}_M\\,\\right]\\bar{Y}_t' },
      { nameKey: 'eq.sr.I', tex: 'I_t = \\left[\\,\\bar{a}_I - \\bar{b}_I\\left(R_t - \\bar{r}_t\\right)\\,\\right]\\bar{Y}_t' },
      { nameKey: 'eq.sr.exp', tex: '\\Delta\\pi_{t+1} = \\pi^{e}_{t+1} - \\pi_t' },
      { nameKey: 'eq.sr.pc', tex: '\\Delta\\pi_{t+1} = \\bar{v}\\,\\tilde{Y}_t + \\bar{o}' },
      { nameKey: 'eq.sr.okun', tex: '\\mu_t - \\bar{\\mu} = -\\bar{w}\\,\\tilde{Y}_t' },
    );
    return eqs;
  },

  strings: {
    en: {
      'model.sr.title': 'Short-run models',
      'sr.variant.ismp': 'IS-MP',
      'sr.variant.islm': 'IS-LM',

      'g.sr.demand': 'Aggregate demand (IS)',
      'g.sr.policy': 'Monetary policy',
      'g.sr.money': 'Money demand',
      'g.sr.phillips': 'Phillips curve and Okun’s law',
      'g.sr.out': 'Short-run equilibrium',

      'p.sr.aC': 'Autonomous component of consumption',
      'p.sr.aI': 'Autonomous component of investment',
      'p.sr.aG': 'Autonomous component of government purchases',
      'p.sr.aX': 'Autonomous component of exports',
      'p.sr.aM': 'Autonomous component of imports',
      'p.sr.bI': 'Sensitivity of investment to the real interest rate',
      'p.sr.rBar': 'Marginal product of physical capital',
      'p.sr.tau': 'Personal income tax rate',
      'p.sr.RBar': 'Exogenous real interest rate',
      'p.sr.MBar': 'Exogenous money supply',
      'p.sr.pi': 'Inflation rate for the current period',
      'p.sr.MDmax': 'Money demand at a zero interest rate',
      'p.sr.mi': 'Sensitivity of money demand to the nominal interest rate',
      'p.sr.mY': 'Sensitivity of money demand to the business cycle',
      'p.sr.vBar': 'Sensitivity of the change in inflation to the business cycle',
      'p.sr.oBar': 'Exogenous shifts to the Phillips curve',
      'p.sr.muBar': 'Long-run unemployment rate',
      'p.sr.wBar': 'Sensitivity of unemployment to the business cycle',
      'p.sr.yBar': 'Potential GDP',

      's.sr.y': 'Short-run output (business cycle)',
      's.sr.R': 'Real interest rate',
      's.sr.i': 'Nominal interest rate',
      's.sr.md': 'Money demand',
      's.sr.ms': 'Money supply',
      's.sr.S': 'Savings',
      's.sr.I': 'Investment',
      's.sr.dpi': 'Change in inflation',
      's.sr.pie': 'Expected inflation',
      's.sr.mu': 'Unemployment rate',

      'pl.sr.main': 'IS-MP / IS-LM diagram',
      'pl.sr.phillips': 'Phillips curve',
      'pl.sr.okun': 'Okun’s law',
      'pl.sr.invsav': 'Investment-savings market',
      'pl.sr.money': 'Money market',

      'ax.sr.y': 'Short-run output Ỹ_t',
      'ax.sr.R': 'Real interest rate R_t',
      'ax.sr.i': 'Nominal interest rate i_t',
      'ax.sr.dpi': 'Change in inflation Δπ_{t+1}',
      'ax.sr.mugap': 'Unemployment gap μ_t − μ̄',
      'ax.sr.IS': 'Investment I_t, savings S_t',
      'ax.sr.M': 'Money Mᴰ_t, Mˢ_t',

      'eq.sr.is': 'IS curve',
      'eq.sr.mp': 'Monetary policy rule (MP)',
      'eq.sr.lm': 'LM curve (money market equilibrium)',
      'eq.sr.fisher': 'Fisher equation',
      'eq.sr.md': 'Money demand',
      'eq.sr.ms': 'Money market equilibrium',
      'eq.sr.S': 'Savings',
      'eq.sr.I': 'Investment',
      'eq.sr.exp': 'Expected inflation',
      'eq.sr.pc': 'Phillips curve',
      'eq.sr.okun': 'Okun’s law',
    },

    es: {
      'model.sr.title': 'Modelos de corto plazo',
      'sr.variant.ismp': 'IS-MP',
      'sr.variant.islm': 'IS-LM',

      'g.sr.demand': 'Demanda agregada (IS)',
      'g.sr.policy': 'Política monetaria',
      'g.sr.money': 'Demanda de dinero',
      'g.sr.phillips': 'Curva de Phillips y ley de Okun',
      'g.sr.out': 'Equilibrio de corto plazo',

      'p.sr.aC': 'Componente autónomo del consumo',
      'p.sr.aI': 'Componente autónomo de la inversión',
      'p.sr.aG': 'Componente autónomo del gasto público',
      'p.sr.aX': 'Componente autónomo de las exportaciones',
      'p.sr.aM': 'Componente autónomo de las importaciones',
      'p.sr.bI': 'Sensibilidad de la inversión a la tasa de interés real',
      'p.sr.rBar': 'Producto marginal del capital físico',
      'p.sr.tau': 'Tasa de impuesto a la renta personal',
      'p.sr.RBar': 'Tasa de interés real exógena',
      'p.sr.MBar': 'Oferta monetaria exógena',
      'p.sr.pi': 'Tasa de inflación del periodo actual',
      'p.sr.MDmax': 'Demanda de dinero a tasa de interés cero',
      'p.sr.mi': 'Sensibilidad de la demanda de dinero a la tasa nominal',
      'p.sr.mY': 'Sensibilidad de la demanda de dinero al ciclo económico',
      'p.sr.vBar': 'Sensibilidad del cambio en la inflación al ciclo económico',
      'p.sr.oBar': 'Desplazamientos exógenos de la curva de Phillips',
      'p.sr.muBar': 'Tasa de desempleo de largo plazo',
      'p.sr.wBar': 'Sensibilidad del desempleo al ciclo económico',
      'p.sr.yBar': 'PIB potencial',

      's.sr.y': 'Producto de corto plazo (ciclo económico)',
      's.sr.R': 'Tasa de interés real',
      's.sr.i': 'Tasa de interés nominal',
      's.sr.md': 'Demanda de dinero',
      's.sr.ms': 'Oferta de dinero',
      's.sr.S': 'Ahorro',
      's.sr.I': 'Inversión',
      's.sr.dpi': 'Cambio en la inflación',
      's.sr.pie': 'Inflación esperada',
      's.sr.mu': 'Tasa de desempleo',

      'pl.sr.main': 'Diagrama IS-MP / IS-LM',
      'pl.sr.phillips': 'Curva de Phillips',
      'pl.sr.okun': 'Ley de Okun',
      'pl.sr.invsav': 'Mercado de inversión y ahorro',
      'pl.sr.money': 'Mercado de dinero',

      'ax.sr.y': 'Producto de corto plazo Ỹ_t',
      'ax.sr.R': 'Tasa de interés real R_t',
      'ax.sr.i': 'Tasa de interés nominal i_t',
      'ax.sr.dpi': 'Cambio en la inflación Δπ_{t+1}',
      'ax.sr.mugap': 'Brecha de desempleo μ_t − μ̄',
      'ax.sr.IS': 'Inversión I_t, ahorro S_t',
      'ax.sr.M': 'Dinero Mᴰ_t, Mˢ_t',

      'eq.sr.is': 'Curva IS',
      'eq.sr.mp': 'Regla de política monetaria (MP)',
      'eq.sr.lm': 'Curva LM (equilibrio del mercado de dinero)',
      'eq.sr.fisher': 'Ecuación de Fisher',
      'eq.sr.md': 'Demanda de dinero',
      'eq.sr.ms': 'Equilibrio del mercado de dinero',
      'eq.sr.S': 'Ahorro',
      'eq.sr.I': 'Inversión',
      'eq.sr.exp': 'Inflación esperada',
      'eq.sr.pc': 'Curva de Phillips',
      'eq.sr.okun': 'Ley de Okun',
    },
  },
};

/** A labelled equilibrium marker. */
function eqPoint(x, y, label, economy) {
  return {
    x: [x], y: [y], name: label, economy,
    mode: 'markers+text', text: [label], textposition: 'top right',
    marker: { size: 11 }, showlegend: false, role: 'point',
  };
}
