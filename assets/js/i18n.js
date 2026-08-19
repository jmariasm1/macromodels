// i18n.js — bilingual string table + tiny translation machinery.
// Model modules add their own strings with registerStrings().

const LS_KEY = 'macromodels:lang';

const DICT = {
  en: {
    'site.name': 'Macro Models',
    'site.course': 'General Macroeconomics · EC0113 / MS1002',
    'site.prof': 'Professor: José Miguel Arias Mejía',
    'site.univ': 'Universidad EAFIT',
    'site.book': 'Based on C. I. Jones, Macroeconomics, 6th ed.',

    'nav.home': 'Home',
    'nav.shortrun': 'Short run',
    'nav.longrun': 'Long run',
    'nav.language': 'Language',

    'landing.title': 'Macro Models',
    'landing.tagline': 'Interactive models for General Macroeconomics',
    'landing.pick': 'Choose a language, then a set of models.',
    'landing.shortrun.title': 'Short run',
    'landing.shortrun.chapters': 'Chapters 9 · 11 · 12',
    'landing.shortrun.i1': 'IS-MP and IS-LM diagrams',
    'landing.shortrun.i2': 'Phillips curve and Okun’s law',
    'landing.shortrun.i3': 'Investment-savings and money markets',
    'landing.longrun.title': 'Long run',
    'landing.longrun.chapters': 'Chapters 5 · 7 · 8',
    'landing.longrun.i1': 'Solow growth model and transition dynamics',
    'landing.longrun.i2': 'Labor market, minimum wage and the bathtub model',
    'landing.longrun.i3': 'Money, prices and inflation',
    'landing.open': 'Open →',
    'landing.howto': 'How to use it',
    'landing.h1': 'Set the parameters of Economy 1 and Economy 2 in the top panel.',
    'landing.h2': 'Compare the two economies in the table and the charts — each economy keeps its colour throughout.',
    'landing.h3': 'Use “Copy 1 → 2” to start from identical economies and change one parameter at a time.',
    'landing.h4': 'During the exam, enter your ID in the left-hand panel to open your version.',

    'ui.parameters': 'Parameters',
    'ui.endogenous': 'Endogenous variables',
    'ui.charts': 'Tables and charts',
    'ui.equations': 'Equations',
    'ui.copy12': 'Copy 1 → 2',
    'ui.reset': 'Reset',
    'ui.save': 'Save',
    'ui.load': 'Load',
    'ui.delete': 'Delete',
    'ui.png': 'PNG',
    'ui.scenarioName': 'Scenario',
    'ui.noScenarios': 'No saved scenarios',
    'ui.parameter': 'Parameter',
    'ui.variable': 'Variable',
    'ui.economy1': 'Economy 1',
    'ui.economy2': 'Economy 2',
    'ui.e1': 'Ec. 1',
    'ui.e2': 'Ec. 2',
    'ui.change': 'Change',
    'ui.model': 'Model',
    'ui.hideExam': 'Hide exam',
    'ui.showExam': 'Show exam',
    'ui.na': '—',

    'exam.title': 'Midterm exam',
    'exam.gate.title': 'Enter your access key',
    'exam.gate.help': 'Type the access key exactly as your professor gave it to you in class. Your exam version is assigned automatically.',
    'exam.gate.placeholder': 'Access key',
    'exam.back': 'Back',
    'exam.gate.open': 'Open',
    'exam.gate.checking': 'Checking…',
    'exam.gate.loading': 'Loading your exam…',
    'exam.version': 'Version',
    'exam.close': 'Close',
    'exam.lang': 'Exam language',
    'exam.unavailable.title': 'Exam not available',
    'exam.unavailable.stamp': 'EXAM PENDING',
    'exam.pending': 'This exam has not been written yet.',
    'exam.notWritten': 'The short-run exam has not been written yet. It will appear here when it is ready.',
    'exam.badid': 'This ID is not on the class list, or the exam is not open right now.',
    'exam.window': 'The exam can only be opened during the scheduled sessions.',
    'exam.schedule': 'Scheduled sessions (Colombia time): Friday 21 August, 9:00–12:00 · Tuesday 25 August, 15:00–18:00.',
    'exam.watermark': 'ID {id} · Version {v}',
    'exam.noCopy': 'Copying, printing and downloading are disabled.',
    'exam.page': 'Page',
    'exam.of': 'of',

    'table.delta': 'Δ (2 − 1)',
    'axis.time': 'Period (t)',
  },

  es: {
    'site.name': 'Modelos Macro',
    'site.course': 'Macroeconomía General · EC0113 / MS1002',
    'site.prof': 'Profesor: José Miguel Arias Mejía',
    'site.univ': 'Universidad EAFIT',
    'site.book': 'Basado en C. I. Jones, Macroeconomics, 6.ª ed.',

    'nav.home': 'Inicio',
    'nav.shortrun': 'Corto plazo',
    'nav.longrun': 'Largo plazo',
    'nav.language': 'Idioma',

    'landing.title': 'Modelos Macro',
    'landing.tagline': 'Modelos interactivos para Macroeconomía General',
    'landing.pick': 'Elija un idioma y luego un conjunto de modelos.',
    'landing.shortrun.title': 'Corto plazo',
    'landing.shortrun.chapters': 'Capítulos 9 · 11 · 12',
    'landing.shortrun.i1': 'Diagramas IS-MP e IS-LM',
    'landing.shortrun.i2': 'Curva de Phillips y ley de Okun',
    'landing.shortrun.i3': 'Mercados de inversión-ahorro y de dinero',
    'landing.longrun.title': 'Largo plazo',
    'landing.longrun.chapters': 'Capítulos 5 · 7 · 8',
    'landing.longrun.i1': 'Modelo de crecimiento de Solow y dinámica de transición',
    'landing.longrun.i2': 'Mercado laboral, salario mínimo y modelo de la bañera',
    'landing.longrun.i3': 'Dinero, precios e inflación',
    'landing.open': 'Abrir →',
    'landing.howto': 'Cómo usarlo',
    'landing.h1': 'Fije los parámetros de la Economía 1 y de la Economía 2 en el panel superior.',
    'landing.h2': 'Compare las dos economías en la tabla y en las gráficas: cada economía conserva su color en todo el sitio.',
    'landing.h3': 'Use «Copiar 1 → 2» para partir de dos economías idénticas y cambiar un parámetro a la vez.',
    'landing.h4': 'Durante el examen, escriba su cédula en el panel de la izquierda para abrir su versión.',

    'ui.parameters': 'Parámetros',
    'ui.endogenous': 'Variables endógenas',
    'ui.charts': 'Tablas y gráficas',
    'ui.equations': 'Ecuaciones',
    'ui.copy12': 'Copiar 1 → 2',
    'ui.reset': 'Reiniciar',
    'ui.save': 'Guardar',
    'ui.load': 'Cargar',
    'ui.delete': 'Borrar',
    'ui.png': 'PNG',
    'ui.scenarioName': 'Escenario',
    'ui.noScenarios': 'Sin escenarios guardados',
    'ui.parameter': 'Parámetro',
    'ui.variable': 'Variable',
    'ui.economy1': 'Economía 1',
    'ui.economy2': 'Economía 2',
    'ui.e1': 'Ec. 1',
    'ui.e2': 'Ec. 2',
    'ui.change': 'Cambio',
    'ui.model': 'Modelo',
    'ui.hideExam': 'Ocultar parcial',
    'ui.showExam': 'Mostrar parcial',
    'ui.na': '—',

    'exam.title': 'Examen parcial',
    'exam.gate.title': 'Escriba su clave de acceso',
    'exam.gate.help': 'Escriba la clave de acceso exactamente como se la indicó su profesor en clase. La versión del parcial se asigna automáticamente.',
    'exam.gate.placeholder': 'Clave de acceso',
    'exam.back': 'Volver',
    'exam.gate.open': 'Abrir',
    'exam.gate.checking': 'Verificando…',
    'exam.gate.loading': 'Cargando su parcial…',
    'exam.version': 'Versión',
    'exam.close': 'Cerrar',
    'exam.lang': 'Idioma del parcial',
    'exam.unavailable.title': 'Parcial no disponible',
    'exam.unavailable.stamp': 'PARCIAL PENDIENTE',
    'exam.pending': 'Parcial pendiente de elaboración.',
    'exam.notWritten': 'El parcial de corto plazo todavía no ha sido elaborado. Aparecerá aquí cuando esté listo.',
    'exam.badid': 'Esta cédula no está en la lista del curso, o el parcial no está abierto en este momento.',
    'exam.window': 'El parcial solo puede abrirse durante las sesiones programadas.',
    'exam.schedule': 'Sesiones programadas (hora de Colombia): viernes 21 de agosto, 9:00–12:00 · martes 25 de agosto, 15:00–18:00.',
    'exam.watermark': 'C.C. {id} · Versión {v}',
    'exam.noCopy': 'La copia, la impresión y la descarga están deshabilitadas.',
    'exam.page': 'Página',
    'exam.of': 'de',

    'table.delta': 'Δ (2 − 1)',
    'axis.time': 'Periodo (t)',
  },
};

let lang = (() => {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'en' || v === 'es') return v;
  } catch (_) { /* storage may be unavailable */ }
  return 'es';
})();

const listeners = new Set();

export function registerStrings(dict) {
  for (const l of ['en', 'es']) {
    if (dict[l]) Object.assign(DICT[l], dict[l]);
  }
}

export function t(key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) ?? (DICT.en && DICT.en[key]) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  }
  return s;
}

export function getLang() { return lang; }

export function setLang(next) {
  if (next !== 'en' && next !== 'es') return;
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(LS_KEY, lang); } catch (_) { /* ignore */ }
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Translate every [data-i18n] / [data-i18n-attr] node under `root`. */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    // format: "placeholder:exam.gate.placeholder;title:ui.png"
    el.getAttribute('data-i18n-attr').split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
}

/** Locale-aware number formatting used by tables and axis ticks. */
export function fmt(value, kind = 'num') {
  if (!Number.isFinite(value)) return t('ui.na');
  const loc = lang === 'es' ? 'es-CO' : 'en-US';
  if (kind === 'pct') {
    return new Intl.NumberFormat(loc, { style: 'percent', minimumFractionDigits: 2,
      maximumFractionDigits: 2 }).format(value);
  }
  if (kind === 'int') {
    return new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(value);
  }
  if (kind === 'big') {
    return new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
  const abs = Math.abs(value);
  const d = abs === 0 ? 2 : abs >= 1000 ? 1 : abs >= 1 ? 3 : 4;
  return new Intl.NumberFormat(loc, { minimumFractionDigits: 0, maximumFractionDigits: d }).format(value);
}

document.documentElement.lang = lang;
