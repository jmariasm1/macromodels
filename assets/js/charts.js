// charts.js [FRAMEWORK]
// Plotly styling helpers shared by every model page. Relies on the global
// `Plotly` object loaded via CDN script tag in long-run.html / short-run.html.

import { t } from './i18n.js';

const COLORS = {
  s1: '#2563eb',
  s1Aux: '#93c5fd',
  s2: '#ea580c',
  s2Aux: '#fdba74',
  grid: '#eef0f4',
  ink: '#111827',
  muted: '#6b7280',
};

const FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Base Plotly config shared by all plots. */
const BASE_CONFIG = {
  responsive: true,
  displayModeBar: 'hover',
  displaylogo: false,
  scrollZoom: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
};

/**
 * Style a single trace object according to its scenario (1|2) and role.
 * Mutates and returns the trace.
 */
function styleTrace(trace) {
  const scenario = trace.scenario === 2 ? 2 : 1;
  const isAux = trace.role === 'aux';
  const baseColor = scenario === 2 ? COLORS.s2 : COLORS.s1;
  const auxColor = scenario === 2 ? COLORS.s2Aux : COLORS.s1Aux;
  const color = isAux ? auxColor : baseColor;

  const styled = Object.assign({}, trace);
  styled.type = styled.type || 'scatter';

  // Bar traces are colored via marker.color, not line; don't inject a line/mode
  // (Plotly ignores `mode`/`line` on bars, but keep the object clean).
  if (styled.type === 'bar') {
    delete styled.mode;
    delete styled.line;
    styled.marker = Object.assign({ color }, trace.marker || {});
    return styled;
  }

  styled.mode = styled.mode || 'lines';

  const existingLine = trace.line || {};
  styled.line = Object.assign(
    {
      color,
      width: isAux ? 1.75 : 2.5,
      dash: trace.dash || existingLine.dash || undefined,
    },
    existingLine,
    { color, dash: trace.dash || existingLine.dash || undefined }
  );

  if (styled.mode.includes('markers')) {
    styled.marker = Object.assign({ color, size: 6 }, trace.marker || {});
  }

  return styled;
}

/** Build the shared clean-white Plotly layout, merged with per-plot overrides. */
function buildLayout(descriptor, overrides) {
  const layout = {
    autosize: true,
    dragmode: 'pan',
    font: { family: FONT_FAMILY, size: 12, color: COLORS.ink },
    margin: { l: 56, r: 20, t: overrides.title ? 36 : 12, b: 48 },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0,
      y: 1.12,
      font: { size: 11, color: COLORS.muted },
    },
    xaxis: {
      title: descriptor.xLabelKey ? { text: t(descriptor.xLabelKey), font: { size: 12 } } : undefined,
      gridcolor: COLORS.grid,
      zerolinecolor: COLORS.grid,
      linecolor: '#d1d5db',
      ticks: 'outside',
      tickcolor: '#d1d5db',
      tickfont: { size: 11, color: COLORS.muted },
    },
    yaxis: {
      title: descriptor.yLabelKey ? { text: t(descriptor.yLabelKey), font: { size: 12 } } : undefined,
      gridcolor: COLORS.grid,
      zerolinecolor: COLORS.grid,
      linecolor: '#d1d5db',
      ticks: 'outside',
      tickcolor: '#d1d5db',
      tickfont: { size: 11, color: COLORS.muted },
    },
  };

  return Object.assign(layout, overrides, {
    xaxis: Object.assign({}, layout.xaxis, overrides.xaxis || {}),
    yaxis: Object.assign({}, layout.yaxis, overrides.yaxis || {}),
    margin: Object.assign({}, layout.margin, overrides.margin || {}),
    legend: Object.assign({}, layout.legend, overrides.legend || {}),
  });
}

/**
 * Render (or update in place) a plot descriptor into `container` using
 * Plotly.react. `p1`/`p2` are the current parameter objects (decimals),
 * `out1`/`out2` are compute() results for each scenario.
 */
export function renderPlot(container, descriptor, out1, out2, p1, p2) {
  if (!container || !window.Plotly) return;
  const built = descriptor.build(out1, out2, p1, p2, t) || { traces: [], layout: {} };
  const traces = (built.traces || []).map(styleTrace);
  const layout = buildLayout(descriptor, built.layout || {});
  window.Plotly.react(container, traces, layout, BASE_CONFIG);
}

/** Download the current plot in `container` as a PNG at 2x scale. */
export function downloadPNG(container, filename) {
  if (!container || !window.Plotly) return Promise.resolve();
  return window.Plotly.downloadImage(container, {
    format: 'png',
    filename: filename.replace(/\.png$/i, ''),
    scale: 2,
  });
}

export const chartColors = COLORS;
