// shortrun.js [SHORTRUN]
// The integrated short-run / business-cycle model (Jones, Macroeconomics 6e,
// Chapters 9 + 11 + 12) as ONE model. It chains four blocks:
//
//   IS (Ch. 11):       Ỹ_t = m·( ā − b̄·(R_t − r̄) ) ,  m = 1/(1 − x̄)
//                      composite demand shock ā = ā_c+ā_i+ā_g+ā_ex−ā_im − 1
//   MP (Ch. 12):       the central bank sets the real rate R; policy experiment
//                      R = R′ during [t0, t1), else r̄ (sticky inflation ⇒ the bank
//                      effectively sets R).
//   Phillips (Ch. 12): π_t = π_{t−1} + v̄·Ỹ_t + ō_t  (adaptive expectations),
//                      with a one-period or persistent price shock ō.
//   Okun (Ch. 9):      u_t = ū − okun·Ỹ_t  (okun = ½, book value).
//
// Simulated over T periods with the EXACT update order of the book (SPEC §6):
//   shocks → policy/R → IS → Phillips → Okun.
// All persistence lives in π_t via adaptive expectations; Ỹ_t responds instantly.
//
// Pure compute(); no DOM/i18n/Plotly — imports & runs unchanged in Node.
// See ARCHITECTURE.md ("Integrated single-model pages (v2)") + SPEC_SHORTRUN.md.
//
// UNITS NOTE (spec ambiguity resolved): every percent/percentage-point variable
// (Ỹ, R, r̄, R′, π, ō, u, ū) is stored as a plain number with unit:'' so the book's
// worked arithmetic reproduces exactly (e.g. b̄=2, R−r̄=1 ⇒ Ỹ=−2; Okun Ỹ=−6 ⇒
// u−ū=+3). b̄, x̄, v̄ and the Okun coefficient are dimensionless. The demand shares
// ā_c…ā_im are true fractions of potential output (0–1); the composite ā is derived
// live from them (a scalar), not a slider (SPEC §4 UI rule).

const GRID_N = 121;      // resolution of the static schedule lines
const RESP_N = 81;       // resolution of the Ỹ(R) sensitivity line
const GAP_MIN = -8, GAP_MAX = 6; // Ỹ range for the diagrams (%)

export default {
  id: 'shortrun',
  titleKey: 'model.shortrun.title',
  chapterLabel: 'Ch. 9 · 11 · 12',
  T: 15,

  // ─────────────────────────────────────────────────────────────────────────
  // Parameters, grouped by block (groupKey inserts a subheader when it changes)
  // ─────────────────────────────────────────────────────────────────────────
  params: [
    // ---- Aggregate demand (IS) ----
    { key: 'abar_c', latex: '\\bar{a}_c', labelKey: 'param.shortrun.abar_c',
      groupKey: 'group.shortrun.is',
      min: 0.4, max: 0.8, step: 0.01, def1: 0.66, def2: 0.66, unit: '' },
    { key: 'abar_i', latex: '\\bar{a}_i', labelKey: 'param.shortrun.abar_i',
      min: 0.05, max: 0.35, step: 0.01, def1: 0.17, def2: 0.17, unit: '' },
    { key: 'abar_g', latex: '\\bar{a}_g', labelKey: 'param.shortrun.abar_g',
      min: 0.05, max: 0.45, step: 0.01, def1: 0.20, def2: 0.20, unit: '' },
    { key: 'abar_ex', latex: '\\bar{a}_{ex}', labelKey: 'param.shortrun.abar_ex',
      min: 0, max: 0.4, step: 0.01, def1: 0.12, def2: 0.12, unit: '' },
    { key: 'abar_im', latex: '\\bar{a}_{im}', labelKey: 'param.shortrun.abar_im',
      min: 0, max: 0.4, step: 0.01, def1: 0.15, def2: 0.15, unit: '' },
    { key: 'bbar', latex: '\\bar{b}', labelKey: 'param.shortrun.bbar',
      min: 0.1, max: 3.0, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'rbar', latex: '\\bar{r}', labelKey: 'param.shortrun.rbar',
      min: 0, max: 8, step: 0.25, def1: 2, def2: 2, unit: '' },
    { key: 'xbar', latex: '\\bar{x}', labelKey: 'param.shortrun.xbar',
      min: 0, max: 0.9, step: 0.05, def1: 0, def2: 0, unit: '' },
    { key: 'abarShock', latex: '\\Delta\\bar{a}', labelKey: 'param.shortrun.abarShock',
      min: -5, max: 5, step: 0.25, def1: 0, def2: 0, unit: '' },
    { key: 'aStart', latex: 't_a', labelKey: 'param.shortrun.aStart',
      min: 0, max: 30, step: 1, def1: 1, def2: 1, unit: '' },
    { key: 'aPersist', latex: '\\text{persist}', labelKey: 'param.shortrun.aPersist',
      min: 0, max: 1, step: 1, def1: 0, def2: 0, unit: '' },

    // ---- Monetary policy (MP) ----
    { key: 'Rprime', latex: "R'", labelKey: 'param.shortrun.Rprime',
      groupKey: 'group.shortrun.mp',
      min: 0, max: 12, step: 0.25, def1: 6, def2: 6, unit: '' },
    { key: 't0', latex: 't_0', labelKey: 'param.shortrun.t0',
      min: 0, max: 20, step: 1, def1: 1, def2: 1, unit: '' },
    { key: 't1', latex: 't_1', labelKey: 'param.shortrun.t1',
      min: 1, max: 30, step: 1, def1: 9, def2: 9, unit: '' },

    // ---- Inflation (Phillips curve) ----
    { key: 'vbar', latex: '\\bar{\\nu}', labelKey: 'param.shortrun.vbar',
      groupKey: 'group.shortrun.phillips',
      min: 0.05, max: 1.5, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },
    { key: 'pi0', latex: '\\pi_0', labelKey: 'param.shortrun.pi0',
      min: 0, max: 15, step: 0.5, def1: 10, def2: 10, unit: '' },
    { key: 'obar', latex: '\\bar{o}', labelKey: 'param.shortrun.obar',
      min: -5, max: 5, step: 0.25, def1: 0, def2: 0, unit: '' },
    { key: 'oStart', latex: 't_o', labelKey: 'param.shortrun.oStart',
      min: 0, max: 30, step: 1, def1: 1, def2: 1, unit: '' },
    { key: 'oPersist', latex: '\\text{persist}', labelKey: 'param.shortrun.oPersist',
      min: 0, max: 1, step: 1, def1: 0, def2: 0, unit: '' },

    // ---- Labor market (Okun) ----
    { key: 'ubar', latex: '\\bar{u}', labelKey: 'param.shortrun.ubar',
      groupKey: 'group.shortrun.okun',
      min: 3, max: 8, step: 0.25, def1: 5, def2: 5, unit: '' },
    { key: 'okun', latex: '\\tfrac{1}{2}', labelKey: 'param.shortrun.okun',
      min: 0.3, max: 0.7, step: 0.05, def1: 0.5, def2: 0.5, unit: '' },

    // ---- Simulation ----
    { key: 'T', latex: 'T', labelKey: 'param.shortrun.T',
      groupKey: 'group.shortrun.sim',
      min: 5, max: 30, step: 1, def1: 15, def2: 15, unit: '' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // compute(): pure, Node-testable
  // ─────────────────────────────────────────────────────────────────────────
  compute(p) {
    const {
      abar_c, abar_i, abar_g, abar_ex, abar_im,
      bbar, rbar, xbar, vbar, pi0, ubar,
    } = p;
    const okun = p.okun == null ? 0.5 : p.okun;
    const T = Math.max(1, Math.round(p.T));
    const t0 = Math.round(p.t0);
    const t1 = Math.round(p.t1);
    const Rprime = p.Rprime;
    const abarShock = p.abarShock || 0;
    const aStart = Math.round(p.aStart);
    const aPersist = Math.round(p.aPersist) === 1;
    const oStart = Math.round(p.oStart);
    const oPersist = Math.round(p.oPersist) === 1;

    // Composite (benchmark) aggregate-demand shock: shares − 1 (eq. 11.12 intercept).
    const abarBase = abar_c + abar_i + abar_g + abar_ex - abar_im - 1;
    const m = 1 / (1 - xbar); // multiplier 1/(1−x̄)

    // Per-period exogenous paths.
    // Real rate: R = R′ during [t0,t1), else r̄ (MP curve; sticky inflation).
    const Rat = (i) => (i >= t0 && i < t1 ? Rprime : rbar);
    // Aggregate-demand shock path (added on top of the benchmark ā).
    const aAt = (i) => {
      if (abarShock === 0) return 0;
      if (aPersist) return i >= aStart ? abarShock : 0;
      return i === aStart ? abarShock : 0;
    };
    // Price (oil) shock path.
    const oAt = (i) => {
      if (p.obar === 0) return 0;
      if (oPersist) return i >= oStart ? p.obar : 0;
      return i === oStart ? p.obar : 0;
    };

    // --- Simulation over t = 0…T (update order: shocks → R → IS → Phillips → Okun) ---
    const t = [];
    const R = [];
    const abarPath = [];   // ā_t = ā_base + Δā_t
    const Ytilde = [];
    const dpi = [];
    const pi = [];
    const u = [];
    const iNom = [];       // nominal rate i_t = R_t + π_t (Fisher)
    const zero = [];

    let piPrev = pi0; // π_{−1} = π_0 (initial / long-run inflation)
    for (let i = 0; i <= T; i++) {
      const at = abarBase + aAt(i);                 // 1. shocks
      const Rt = Rat(i);                            // 2. policy → real rate
      const ot = oAt(i);
      const Yt = m * (at - bbar * (Rt - rbar));     // 3. IS
      const deltaPi = vbar * Yt + ot;               // 4. Phillips (in changes)
      const piT = piPrev + deltaPi;                 //    Phillips (level)
      const uT = ubar - okun * Yt;                  // 5. Okun

      t.push(i);
      R.push(Rt);
      abarPath.push(at);
      Ytilde.push(Yt);
      dpi.push(deltaPi);
      pi.push(piT);
      u.push(uT);
      iNom.push(Rt + piT);
      zero.push(0);
      piPrev = piT;
    }

    // --- Static schedules over a Ỹ grid (for the diagram plots) ---
    const gGrid = [];
    const isR = [];        // inverse IS at the benchmark ā: R = r̄ + (ā − Ỹ/m)/b̄
    const mpBench = [];    // MP at R = r̄
    const mpPolicy = [];   // MP at R = R′
    const phillipsLine = []; // Δπ = v̄·Ỹ + ō (benchmark shock level)
    const okunLine = [];   // u = ū − okun·Ỹ
    const okunGapLine = []; // u − ū = −okun·Ỹ
    for (let k = 0; k < GRID_N; k++) {
      const g = GAP_MIN + ((GAP_MAX - GAP_MIN) * k) / (GRID_N - 1);
      gGrid.push(g);
      isR.push(rbar + (abarBase - g / m) / bbar);
      mpBench.push(rbar);
      mpPolicy.push(Rprime);
      phillipsLine.push(vbar * g);
      okunLine.push(ubar - okun * g);
      okunGapLine.push(-okun * g);
    }

    // --- Static equilibria (comparative statics, from iscurve.js/mppc.js) ---
    const Yeq_bench = m * (abarBase - bbar * (rbar - rbar));   // = m·ā (benchmark, R=r̄)
    const Yeq_policy = m * (abarBase - bbar * (Rprime - rbar)); // while tight (R=R′)

    // Diagram marker points for each economy (points on the Phillips / Okun lines,
    // evaluated at the tightening equilibrium so the diagrams and the sim agree).
    const dpi_policy = vbar * Yeq_policy;               // Δπ while tight (per period)
    const u_policy = ubar - okun * Yeq_policy;          // u while tight
    const ugap_policy = -okun * Yeq_policy;             // cyclical unemployment while tight

    // --- Demand-component shares at the tightening equilibrium (grouped bars) ---
    const rateGapPolicy = Rprime - rbar;
    const invShare = abar_i - bbar * rateGapPolicy;    // eq. 11.7 at R = R′
    const consShare = abar_c + xbar * Yeq_policy;      // eq. 11.15 (multiplier on)
    const compNames = ['C', 'I', 'G', 'EX', 'IM'];
    const compShares = [consShare, invShare, abar_g, abar_ex, abar_im];

    // --- Scalars for the comparison table (per groupKey section) ---
    const Ytilde_final = Ytilde[T];
    const pi_final = pi[T];
    const u_final = u[T];

    return {
      scalars: {
        // Aggregate demand (IS)
        abar: abarBase, m, Yeq_bench, Yeq_policy,
        // Inflation (Phillips)
        dpi_perPeriod: dpi_policy,
        // Labor market (Okun)
        ugap_policy, u_policy,
        // Simulation
        Ytilde_final, pi_final, u_final,
      },
      series: {
        t, R, abarPath, Ytilde, dpi, pi, u, iNom, zero,
        gGrid, isR, mpBench, mpPolicy, phillipsLine, okunLine, okunGapLine,
        eqYbench: [Yeq_bench], eqRbench: [rbar],
        eqYpolicy: [Yeq_policy], eqRpolicy: [Rprime],
        // Phillips / Okun diagram marker points (economy while tight)
        phY: [Yeq_policy], phDpi: [dpi_policy],
        okY: [Yeq_policy], okU: [u_policy],
        compNames, compShares,
      },
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Endogenous-variable table, grouped by block
  // ─────────────────────────────────────────────────────────────────────────
  scalars: [
    { key: 'abar', latex: '\\bar{a}', labelKey: 'scalar.shortrun.abar', fmt: 'num',
      groupKey: 'group.shortrun.is' },
    { key: 'm', latex: '\\tfrac{1}{1-\\bar{x}}', labelKey: 'scalar.shortrun.m', fmt: 'num' },
    { key: 'Yeq_bench', latex: '\\tilde{Y}\\,|_{R=\\bar{r}}', labelKey: 'scalar.shortrun.Yeq_bench', fmt: 'num' },
    { key: 'Yeq_policy', latex: "\\tilde{Y}\\,|_{R=R'}", labelKey: 'scalar.shortrun.Yeq_policy', fmt: 'num' },

    { key: 'dpi_perPeriod', latex: '\\Delta\\pi', labelKey: 'scalar.shortrun.dpi_perPeriod', fmt: 'num',
      groupKey: 'group.shortrun.phillips' },

    { key: 'ugap_policy', latex: 'u-\\bar{u}', labelKey: 'scalar.shortrun.ugap_policy', fmt: 'num',
      groupKey: 'group.shortrun.okun' },
    { key: 'u_policy', latex: 'u\\,|_{R=R\'}', labelKey: 'scalar.shortrun.u_policy', fmt: 'num' },

    { key: 'Ytilde_final', latex: '\\tilde{Y}_T', labelKey: 'scalar.shortrun.Ytilde_final', fmt: 'num',
      groupKey: 'group.shortrun.sim' },
    { key: 'pi_final', latex: '\\pi_T', labelKey: 'scalar.shortrun.pi_final', fmt: 'num' },
    { key: 'u_final', latex: 'u_T', labelKey: 'scalar.shortrun.u_final', fmt: 'num' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Plots — grouped: (i) Diagrams, (ii) Dynamics
  // ─────────────────────────────────────────────────────────────────────────
  plots: [
    // ---- Diagrams ----
    {
      id: 'is-mp',
      titleKey: 'plot.shortrun.isMp',
      groupKey: 'plotgroup.shortrun.diagrams',
      xLabelKey: 'axis.shortrun.Ytilde', yLabelKey: 'axis.shortrun.R',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.isR, name: `${t('trace.shortrun.is')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.isR, name: `${t('trace.shortrun.is')} (2)`, scenario: 2 },
            { x: out1.series.gGrid, y: out1.series.mpBench, name: `${t('trace.shortrun.mpBench')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: out1.series.gGrid, y: out1.series.mpPolicy, name: `${t('trace.shortrun.mpPolicy')} (1)`, scenario: 1, dash: 'dash', role: 'aux' },
            { x: out2.series.gGrid, y: out2.series.mpPolicy, name: `${t('trace.shortrun.mpPolicy')} (2)`, scenario: 2, dash: 'dash', role: 'aux' },
            { x: out1.series.eqYpolicy, y: out1.series.eqRpolicy, name: `${t('trace.shortrun.eq')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: out2.series.eqYpolicy, y: out2.series.eqRpolicy, name: `${t('trace.shortrun.eq')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
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
      titleKey: 'plot.shortrun.phillips',
      groupKey: 'plotgroup.shortrun.diagrams',
      xLabelKey: 'axis.shortrun.Ytilde', yLabelKey: 'axis.shortrun.dpi',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.phillipsLine, name: `${t('trace.shortrun.phillips')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.phillipsLine, name: `${t('trace.shortrun.phillips')} (2)`, scenario: 2 },
            { x: out1.series.phY, y: out1.series.phDpi, name: `${t('trace.shortrun.economy')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: out2.series.phY, y: out2.series.phDpi, name: `${t('trace.shortrun.economy')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
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
      id: 'okun-line',
      titleKey: 'plot.shortrun.okunLaw',
      groupKey: 'plotgroup.shortrun.diagrams',
      xLabelKey: 'axis.shortrun.Ytilde', yLabelKey: 'axis.shortrun.u',
      kind: 'curves',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.gGrid, y: out1.series.okunLine, name: `${t('trace.shortrun.okunLine')} (1)`, scenario: 1 },
            { x: out2.series.gGrid, y: out2.series.okunLine, name: `${t('trace.shortrun.okunLine')} (2)`, scenario: 2 },
            { x: out1.series.okY, y: out1.series.okU, name: `${t('trace.shortrun.economy')} (1)`, scenario: 1, mode: 'markers', marker: { size: 10 } },
            { x: out2.series.okY, y: out2.series.okU, name: `${t('trace.shortrun.economy')} (2)`, scenario: 2, mode: 'markers', marker: { size: 10 } },
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
      titleKey: 'plot.shortrun.components',
      groupKey: 'plotgroup.shortrun.diagrams',
      xLabelKey: 'axis.shortrun.component', yLabelKey: 'axis.shortrun.share',
      kind: 'bars',
      build(out1, out2, p1, p2, t) {
        return {
          traces: [
            { x: out1.series.compNames, y: out1.series.compShares, name: `${t('trace.shortrun.share')} (1)`, scenario: 1, type: 'bar' },
            { x: out2.series.compNames, y: out2.series.compShares, name: `${t('trace.shortrun.share')} (2)`, scenario: 2, type: 'bar' },
          ],
          layout: { barmode: 'group' },
        };
      },
    },

    // ---- Dynamics (the four Volcker-style panels) ----
    {
      id: 'gap-time',
      titleKey: 'plot.shortrun.gapTime',
      groupKey: 'plotgroup.shortrun.dynamics',
      xLabelKey: 'axis.time', yLabelKey: 'axis.shortrun.Ytilde',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.Ytilde, name: `${t('trace.shortrun.gap')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.Ytilde, name: `${t('trace.shortrun.gap')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [0, 0], name: t('trace.shortrun.potential'), scenario: 1, dash: 'dot', role: 'aux', showlegend: false },
          ],
        };
      },
    },
    {
      id: 'inflation-time',
      titleKey: 'plot.shortrun.inflationTime',
      groupKey: 'plotgroup.shortrun.dynamics',
      xLabelKey: 'axis.time', yLabelKey: 'axis.shortrun.pi',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.pi, name: `${t('trace.shortrun.inflation')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.pi, name: `${t('trace.shortrun.inflation')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.pi0, p1.pi0], name: `${t('trace.shortrun.pi0')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.pi0, p2.pi0], name: `${t('trace.shortrun.pi0')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'rate-time',
      titleKey: 'plot.shortrun.rateTime',
      groupKey: 'plotgroup.shortrun.dynamics',
      xLabelKey: 'axis.time', yLabelKey: 'axis.shortrun.R',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.R, name: `${t('trace.shortrun.rate')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.R, name: `${t('trace.shortrun.rate')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.rbar, p1.rbar], name: `${t('trace.shortrun.rbar')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.rbar, p2.rbar], name: `${t('trace.shortrun.rbar')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
    {
      id: 'unemployment-time',
      titleKey: 'plot.shortrun.unemploymentTime',
      groupKey: 'plotgroup.shortrun.dynamics',
      xLabelKey: 'axis.time', yLabelKey: 'axis.shortrun.u',
      kind: 'series',
      build(out1, out2, p1, p2, t) {
        const T = out1.series.t[out1.series.t.length - 1];
        return {
          traces: [
            { x: out1.series.t, y: out1.series.u, name: `${t('trace.shortrun.unemp')} (1)`, scenario: 1, mode: 'lines+markers' },
            { x: out2.series.t, y: out2.series.u, name: `${t('trace.shortrun.unemp')} (2)`, scenario: 2, mode: 'lines+markers' },
            { x: [0, T], y: [p1.ubar, p1.ubar], name: `${t('trace.shortrun.ubar')} (1)`, scenario: 1, dash: 'dot', role: 'aux' },
            { x: [0, T], y: [p2.ubar, p2.ubar], name: `${t('trace.shortrun.ubar')} (2)`, scenario: 2, dash: 'dot', role: 'aux' },
          ],
        };
      },
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Equations — all four blocks with {headingKey} markers.
  // Okun's law is flagged as an empirical approximation (≈) per the professor's
  // site-wide rule that approximations be labeled as such.
  // ─────────────────────────────────────────────────────────────────────────
  equations: [
    { headingKey: 'eqgroup.shortrun.is' },
    'Y_t = C_t + I_t + G_t + EX_t - IM_t',
    '\\dfrac{I_t}{\\bar{Y}_t} = \\bar{a}_i - \\bar{b}\\,(R_t - \\bar{r})',
    '\\bar{a} \\equiv \\bar{a}_c + \\bar{a}_i + \\bar{a}_g + \\bar{a}_{ex} - \\bar{a}_{im} - 1',
    '\\tilde{Y}_t = \\underbrace{\\dfrac{1}{1-\\bar{x}}}_{\\text{multiplier}}\\left[\\,\\bar{a} - \\bar{b}\\,(R_t - \\bar{r})\\,\\right]',

    { headingKey: 'eqgroup.shortrun.mp' },
    'i_t = R_t + \\pi_t \\qquad\\Rightarrow\\qquad R_t = i_t - \\pi_t',
    'R_t = \\begin{cases} R\' & t_0 \\le t < t_1 \\\\ \\bar{r} & \\text{otherwise} \\end{cases}',

    { headingKey: 'eqgroup.shortrun.phillips' },
    '\\pi_t = \\pi_{t-1} + \\bar{\\nu}\\,\\tilde{Y}_t + \\bar{o}_t',
    '\\Delta\\pi_t = \\bar{\\nu}\\,\\tilde{Y}_t + \\bar{o}_t',

    { headingKey: 'eqgroup.shortrun.okun' },
    // Okun's law is an EMPIRICAL regularity, not an accounting identity ⇒ use ≈.
    'u_t - \\bar{u} \\approx -\\tfrac{1}{2}\\,\\tilde{Y}_t',
  ],

  noteKey: 'model.shortrun.note',

  // ─────────────────────────────────────────────────────────────────────────
  // i18n — complete en / es for every key
  // ─────────────────────────────────────────────────────────────────────────
  strings: {
    en: {
      'model.shortrun.title': 'The Short-Run Model of the Business Cycle',

      // group headers
      'group.shortrun.is': 'Aggregate demand (IS)',
      'group.shortrun.mp': 'Monetary policy (MP)',
      'group.shortrun.phillips': 'Inflation (Phillips curve)',
      'group.shortrun.okun': 'Labor market (Okun)',
      'group.shortrun.sim': 'Simulation',
      'plotgroup.shortrun.diagrams': 'Diagrams (comparative statics)',
      'plotgroup.shortrun.dynamics': 'Dynamics (time paths)',
      'eqgroup.shortrun.is': 'Aggregate demand (IS)',
      'eqgroup.shortrun.mp': 'Monetary policy (MP)',
      'eqgroup.shortrun.phillips': 'Inflation (Phillips curve)',
      'eqgroup.shortrun.okun': 'Labor market (Okun)',

      // parameters
      'param.shortrun.abar_c': 'Consumption share of potential output ā_c',
      'param.shortrun.abar_i': 'Investment share parameter ā_i',
      'param.shortrun.abar_g': 'Government-purchases share ā_g',
      'param.shortrun.abar_ex': 'Export share ā_ex',
      'param.shortrun.abar_im': 'Import share ā_im (enters ā with a minus sign)',
      'param.shortrun.bbar': 'Sensitivity of demand (investment) to the rate gap b̄',
      'param.shortrun.rbar': 'Marginal product of capital = long-run real rate r̄ (%)',
      'param.shortrun.xbar': 'Marginal propensity to consume x̄ (multiplier; 0 = off)',
      'param.shortrun.abarShock': 'Aggregate-demand shock Δā added to ā (0 = none)',
      'param.shortrun.aStart': 'Demand-shock start period t_a',
      'param.shortrun.aPersist': 'Demand shock persistent? (0 = one period, 1 = persistent)',
      'param.shortrun.Rprime': 'Policy real rate R′ while the bank is tightening (%)',
      'param.shortrun.t0': 'Policy start period t₀ (bank moves R to R′)',
      'param.shortrun.t1': 'Policy end period t₁ (bank returns R to r̄)',
      'param.shortrun.vbar': 'Phillips-curve slope v̄ (book ≈ 1/3, exercise 1/2)',
      'param.shortrun.pi0': 'Initial / long-run inflation π₀ (%)',
      'param.shortrun.obar': 'Price (oil) shock ō (%)',
      'param.shortrun.oStart': 'Price-shock start period t_o',
      'param.shortrun.oPersist': 'Price shock persistent? (0 = one period, 1 = persistent)',
      'param.shortrun.ubar': 'Natural rate of unemployment ū (%)',
      'param.shortrun.okun': 'Okun coefficient (book value ½; fixed in the text)',
      'param.shortrun.T': 'Simulation horizon T (years)',

      // scalars
      'scalar.shortrun.abar': 'Aggregate demand shock ā (shares − 1)',
      'scalar.shortrun.m': 'Multiplier 1/(1 − x̄)',
      'scalar.shortrun.Yeq_bench': 'Output gap at R = r̄ (benchmark)',
      'scalar.shortrun.Yeq_policy': 'Output gap while tight (R = R′)',
      'scalar.shortrun.dpi_perPeriod': 'Inflation change per tight period Δπ',
      'scalar.shortrun.ugap_policy': 'Cyclical unemployment while tight u − ū',
      'scalar.shortrun.u_policy': 'Unemployment rate while tight u',
      'scalar.shortrun.Ytilde_final': 'Final-period output gap Ỹ_T',
      'scalar.shortrun.pi_final': 'Final-period inflation π_T',
      'scalar.shortrun.u_final': 'Final-period unemployment u_T',

      // plots
      'plot.shortrun.isMp': 'IS–MP diagram (Ỹ, R)',
      'plot.shortrun.phillips': 'Phillips curve (Ỹ, Δπ)',
      'plot.shortrun.okunLaw': 'Okun’s law (Ỹ, u)',
      'plot.shortrun.components': 'Demand components (shares of potential output)',
      'plot.shortrun.gapTime': 'Output gap Ỹ_t over time',
      'plot.shortrun.inflationTime': 'Inflation π_t over time',
      'plot.shortrun.rateTime': 'Real interest rate R_t over time',
      'plot.shortrun.unemploymentTime': 'Unemployment u_t over time',

      // axes
      'axis.time': 'Time (years)',
      'axis.shortrun.Ytilde': 'Output gap Ỹ (%)',
      'axis.shortrun.R': 'Real interest rate R (%)',
      'axis.shortrun.pi': 'Inflation π (%)',
      'axis.shortrun.dpi': 'Change in inflation Δπ (pp)',
      'axis.shortrun.u': 'Unemployment u (%)',
      'axis.shortrun.component': 'Demand component',
      'axis.shortrun.share': 'Share of potential output',

      // traces
      'trace.shortrun.is': 'IS curve',
      'trace.shortrun.mpBench': 'MP: R = r̄',
      'trace.shortrun.mpPolicy': 'MP: R = R′',
      'trace.shortrun.eq': 'Equilibrium (tight)',
      'trace.shortrun.phillips': 'Phillips curve Δπ = v̄·Ỹ',
      'trace.shortrun.okunLine': 'Okun’s law u = ū − ½·Ỹ',
      'trace.shortrun.economy': 'Economy while tight',
      'trace.shortrun.share': 'Share',
      'trace.shortrun.gap': 'Output gap Ỹ_t',
      'trace.shortrun.potential': 'Potential (Ỹ = 0)',
      'trace.shortrun.inflation': 'Inflation π_t',
      'trace.shortrun.pi0': 'Initial inflation π₀',
      'trace.shortrun.rate': 'Real rate R_t',
      'trace.shortrun.rbar': 'Long-run rate r̄',
      'trace.shortrun.unemp': 'Unemployment u_t',
      'trace.shortrun.ubar': 'Natural rate ū',

      'model.shortrun.note': 'This is the complete short-run model of the business cycle, chaining four blocks. Firms’ spending gives the IS curve, which turns the real interest rate into an output gap Ỹ. The central bank sets that real rate through the MP curve (sticky inflation lets it move R one-for-one). The Phillips curve turns the gap into a change in inflation, carried forward by adaptive expectations, and Okun’s law maps the gap into unemployment. A temporary tightening (R = R′ > r̄) opens a recession that pulls inflation down period by period — the Volcker disinflation — and when the bank returns R to r̄, output snaps back to zero and inflation stabilises at its new, lower level. Okun’s law is an empirical regularity (hence the ≈), not an accounting identity.',
    },
    es: {
      'model.shortrun.title': 'El modelo de corto plazo del ciclo económico',

      // group headers
      'group.shortrun.is': 'Demanda agregada (IS)',
      'group.shortrun.mp': 'Política monetaria (MP)',
      'group.shortrun.phillips': 'Inflación (curva de Phillips)',
      'group.shortrun.okun': 'Mercado laboral (Okun)',
      'group.shortrun.sim': 'Simulación',
      'plotgroup.shortrun.diagrams': 'Diagramas (estática comparativa)',
      'plotgroup.shortrun.dynamics': 'Dinámica (trayectorias temporales)',
      'eqgroup.shortrun.is': 'Demanda agregada (IS)',
      'eqgroup.shortrun.mp': 'Política monetaria (MP)',
      'eqgroup.shortrun.phillips': 'Inflación (curva de Phillips)',
      'eqgroup.shortrun.okun': 'Mercado laboral (Okun)',

      // parameters
      'param.shortrun.abar_c': 'Participación del consumo en el producto potencial ā_c',
      'param.shortrun.abar_i': 'Parámetro de participación de la inversión ā_i',
      'param.shortrun.abar_g': 'Participación de las compras del gobierno ā_g',
      'param.shortrun.abar_ex': 'Participación de las exportaciones ā_ex',
      'param.shortrun.abar_im': 'Participación de las importaciones ā_im (entra en ā con signo negativo)',
      'param.shortrun.bbar': 'Sensibilidad de la demanda (inversión) a la brecha de la tasa b̄',
      'param.shortrun.rbar': 'Producto marginal del capital = tasa real de largo plazo r̄ (%)',
      'param.shortrun.xbar': 'Propensión marginal a consumir x̄ (multiplicador; 0 = apagado)',
      'param.shortrun.abarShock': 'Choque de demanda agregada Δā sumado a ā (0 = ninguno)',
      'param.shortrun.aStart': 'Período de inicio del choque de demanda t_a',
      'param.shortrun.aPersist': '¿Choque de demanda persistente? (0 = un período, 1 = persistente)',
      'param.shortrun.Rprime': 'Tasa real de política R′ mientras el banco endurece (%)',
      'param.shortrun.t0': 'Período de inicio de la política t₀ (el banco lleva R a R′)',
      'param.shortrun.t1': 'Período de fin de la política t₁ (el banco regresa R a r̄)',
      'param.shortrun.vbar': 'Pendiente de la curva de Phillips v̄ (libro ≈ 1/3, ejercicio 1/2)',
      'param.shortrun.pi0': 'Inflación inicial / de largo plazo π₀ (%)',
      'param.shortrun.obar': 'Choque de precios (petrolero) ō (%)',
      'param.shortrun.oStart': 'Período de inicio del choque de precios t_o',
      'param.shortrun.oPersist': '¿Choque de precios persistente? (0 = un período, 1 = persistente)',
      'param.shortrun.ubar': 'Tasa natural de desempleo ū (%)',
      'param.shortrun.okun': 'Coeficiente de Okun (valor del libro ½; fijo en el texto)',
      'param.shortrun.T': 'Horizonte de simulación T (años)',

      // scalars
      'scalar.shortrun.abar': 'Choque de demanda agregada ā (participaciones − 1)',
      'scalar.shortrun.m': 'Multiplicador 1/(1 − x̄)',
      'scalar.shortrun.Yeq_bench': 'Brecha del producto en R = r̄ (referencia)',
      'scalar.shortrun.Yeq_policy': 'Brecha del producto con política restrictiva (R = R′)',
      'scalar.shortrun.dpi_perPeriod': 'Cambio de la inflación por período restrictivo Δπ',
      'scalar.shortrun.ugap_policy': 'Desempleo cíclico con política restrictiva u − ū',
      'scalar.shortrun.u_policy': 'Tasa de desempleo con política restrictiva u',
      'scalar.shortrun.Ytilde_final': 'Brecha del producto final Ỹ_T',
      'scalar.shortrun.pi_final': 'Inflación del período final π_T',
      'scalar.shortrun.u_final': 'Desempleo del período final u_T',

      // plots
      'plot.shortrun.isMp': 'Diagrama IS–MP (Ỹ, R)',
      'plot.shortrun.phillips': 'Curva de Phillips (Ỹ, Δπ)',
      'plot.shortrun.okunLaw': 'Ley de Okun (Ỹ, u)',
      'plot.shortrun.components': 'Componentes de la demanda (participaciones del producto potencial)',
      'plot.shortrun.gapTime': 'Brecha del producto Ỹ_t en el tiempo',
      'plot.shortrun.inflationTime': 'Inflación π_t en el tiempo',
      'plot.shortrun.rateTime': 'Tasa de interés real R_t en el tiempo',
      'plot.shortrun.unemploymentTime': 'Desempleo u_t en el tiempo',

      // axes
      'axis.time': 'Tiempo (años)',
      'axis.shortrun.Ytilde': 'Brecha del producto Ỹ (%)',
      'axis.shortrun.R': 'Tasa de interés real R (%)',
      'axis.shortrun.pi': 'Inflación π (%)',
      'axis.shortrun.dpi': 'Cambio de la inflación Δπ (pp)',
      'axis.shortrun.u': 'Desempleo u (%)',
      'axis.shortrun.component': 'Componente de la demanda',
      'axis.shortrun.share': 'Participación del producto potencial',

      // traces
      'trace.shortrun.is': 'Curva IS',
      'trace.shortrun.mpBench': 'MP: R = r̄',
      'trace.shortrun.mpPolicy': 'MP: R = R′',
      'trace.shortrun.eq': 'Equilibrio (restrictivo)',
      'trace.shortrun.phillips': 'Curva de Phillips Δπ = v̄·Ỹ',
      'trace.shortrun.okunLine': 'Ley de Okun u = ū − ½·Ỹ',
      'trace.shortrun.economy': 'Economía con política restrictiva',
      'trace.shortrun.share': 'Participación',
      'trace.shortrun.gap': 'Brecha del producto Ỹ_t',
      'trace.shortrun.potential': 'Potencial (Ỹ = 0)',
      'trace.shortrun.inflation': 'Inflación π_t',
      'trace.shortrun.pi0': 'Inflación inicial π₀',
      'trace.shortrun.rate': 'Tasa real R_t',
      'trace.shortrun.rbar': 'Tasa de largo plazo r̄',
      'trace.shortrun.unemp': 'Desempleo u_t',
      'trace.shortrun.ubar': 'Tasa natural ū',

      'model.shortrun.note': 'Este es el modelo completo de corto plazo del ciclo económico, que encadena cuatro bloques. El gasto de los agentes da la curva IS, que convierte la tasa de interés real en una brecha del producto Ỹ. El banco central fija esa tasa real mediante la curva MP (la inflación rígida le permite mover R uno a uno). La curva de Phillips convierte la brecha en un cambio de la inflación, propagado por las expectativas adaptativas, y la ley de Okun traduce la brecha en desempleo. Un endurecimiento temporal (R = R′ > r̄) abre una recesión que reduce la inflación período a período —la desinflación de Volcker— y, cuando el banco regresa R a r̄, el producto vuelve a cero y la inflación se estabiliza en su nuevo nivel más bajo. La ley de Okun es una regularidad empírica (de ahí el ≈), no una identidad contable.',
    },
  },
};
