// charts.js — thin Plotly layer. Economies are identified by COLOUR
// (Economy 1 blue, Economy 2 warm red); different curves inside one economy are
// told apart by line style (solid / dashed / dotted).

const FONT = 'Trebuchet MS, Gill Sans, Segoe UI, sans-serif';

export const ECONOMY_COLORS = {
  0: '#657780',                 // neutral (steady-state guides and other helpers)
  1: '#2b63d9',
  2: '#cc5a43',
};

const AUX = {
  0: '#8d9aa2',
  1: '#7fa1ec',
  2: '#e0a091',
};

export function baseLayout(xTitle, yTitle) {
  return {
    margin: { l: 62, r: 18, t: 16, b: 52 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#fffaf2',
    dragmode: 'pan',
    hovermode: 'closest',
    showlegend: true,
    legend: { orientation: 'h', x: 0, y: 1.14, font: { size: 10, family: FONT } },
    xaxis: {
      title: { text: xTitle, font: { size: 12 } },
      gridcolor: 'rgba(62,73,82,0.10)',
      zerolinecolor: 'rgba(62,73,82,0.20)',
      hoverformat: '.4g',
    },
    yaxis: {
      title: { text: yTitle, font: { size: 12 } },
      gridcolor: 'rgba(62,73,82,0.10)',
      zerolinecolor: 'rgba(62,73,82,0.20)',
      hoverformat: '.4g',
    },
    font: { family: FONT, color: '#213038', size: 12 },
  };
}

/** Turn a model trace descriptor into a styled Plotly trace. */
export function styleTrace(tr) {
  const e = tr.economy ?? 0;
  const aux = tr.role === 'aux';
  const color = aux ? AUX[e] : ECONOMY_COLORS[e];

  if (tr.type === 'bar') {
    return { ...tr, type: 'bar', marker: { color: ECONOMY_COLORS[e], ...(tr.marker || {}) } };
  }

  const out = {
    type: 'scatter',
    mode: tr.mode || 'lines',
    x: tr.x,
    y: tr.y,
    name: tr.name,
    hovertemplate: `${tr.name}<br>%{x}, %{y}<extra></extra>`,
  };
  if (out.mode.includes('lines')) {
    out.line = { color, width: aux ? 1.6 : 2.6, dash: tr.dash || 'solid' };
  }
  if (out.mode.includes('markers')) {
    out.marker = { size: 9, color: ECONOMY_COLORS[e], line: { width: 1.4, color: '#fffaf2' },
      ...(tr.marker || {}) };
  }
  if (tr.text) { out.text = tr.text; out.textposition = tr.textposition || 'top right';
    out.textfont = { family: FONT, size: 10, color: '#24343c' }; }
  if (tr.showlegend === false) out.showlegend = false;
  return out;
}

function deepMerge(target, extra) {
  if (!extra) return target;
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = deepMerge(target[k] ? { ...target[k] } : {}, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

export function render(nodeId, spec, xTitle, yTitle) {
  if (!window.Plotly) return;
  const layout = deepMerge(baseLayout(xTitle, yTitle), spec.layout);
  const traces = spec.traces.filter(Boolean).map(styleTrace);
  window.Plotly.react(nodeId, traces, layout, {
    displayModeBar: false,
    responsive: true,
    scrollZoom: true,
  });
}

/** Download one plot as a PNG. */
export async function downloadPlotPng(nodeId, fileName) {
  if (!window.Plotly) return;
  const el = document.getElementById(nodeId);
  if (!el) return;
  const url = await window.Plotly.toImage(el, {
    format: 'png',
    width: Math.max(Math.round(el.clientWidth || 760), 760),
    height: Math.max(Math.round(el.clientHeight || 430), 430),
    scale: 3,
  });
  triggerDownload(url, `${fileName}.png`);
}

/** Download an arbitrary DOM node (used for the endogenous-variables table). */
export async function downloadNodePng(node, fileName) {
  if (!window.html2canvas || !node) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-10000px;top:0;padding:18px;background:#ffffff';
  wrap.appendChild(node.cloneNode(true));
  document.body.appendChild(wrap);
  try {
    const canvas = await window.html2canvas(wrap, { backgroundColor: '#ffffff', scale: 2 });
    triggerDownload(canvas.toDataURL('image/png'), `${fileName}.png`);
  } finally {
    document.body.removeChild(wrap);
  }
}

function triggerDownload(url, fileName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
