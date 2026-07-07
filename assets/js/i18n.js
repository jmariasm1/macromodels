// i18n.js [FRAMEWORK]
// Minimal, dependency-free i18n engine. Spanish is the default language.
// Model modules call registerStrings({en:{...}, es:{...}}) to merge in their
// own keys (params, plots, scalars, notes). Pages call t(key) to translate.

const STORAGE_KEY = 'macromodels:lang';
const DEFAULT_LANG = 'es';

/** @type {{en: Record<string,string>, es: Record<string,string>}} */
const dict = {
  en: {
    // Site
    'site.name': 'MacroModels',
    'site.subtitle': 'Interactive macroeconomic models — long run and short run',

    // Nav
    'nav.home': 'Home',
    'nav.longrun': 'Long Run',
    'nav.shortrun': 'Short Run',

    // Course / footer
    'course.line': 'Macroeconomía General — EC0113 / MS1002 · Universidad EAFIT · Prof. José Miguel Arias Mejía',
    'course.book': 'Charles I. Jones, Macroeconomics, 6th edition, W.W. Norton',
    'footer.rights': 'For educational use in Macroeconomía General.',
    'footer.builtWith': 'Built with Plotly, KaTeX and SheetJS.',

    // Landing hero
    'landing.hero.title': 'Learn macroeconomics by changing the numbers',
    'landing.hero.body': 'Interactive models from Jones’ Macroeconomics: adjust parameters, compare two scenarios side by side, and see the equations, tables and plots update instantly.',

    // Landing cards
    'landing.card.longrun.title': 'Long Run',
    'landing.card.longrun.desc': 'Growth, the labor market and inflation over decades: how economies get rich and why prices rise.',
    'landing.card.shortrun.title': 'Short Run',
    'landing.card.shortrun.desc': 'Business cycles, output gaps, aggregate demand and monetary policy: why economies boom and bust.',
    'landing.card.chapters': 'Chapters',
    'landing.card.cta': 'Explore models',

    // Model names (index links) — chapter badges are NOT translated (kept as literal strings in HTML)
    'landing.model.solow': 'Solow Growth Model',
    'landing.model.labor': 'Labor Market',
    'landing.model.inflation': 'Money Growth & Inflation',
    'landing.model.okun': 'Output, Growth & Okun’s Law',
    'landing.model.iscurve': 'The IS Curve',
    'landing.model.mppc': 'Monetary Policy & Phillips Curve',

    // How-to-use strip
    'landing.howto.title': 'How to use this site',
    'landing.howto.step1.title': 'Choose a model',
    'landing.howto.step1.body': 'Pick Long Run or Short Run, then a model tab.',
    'landing.howto.step2.title': 'Set 1 = baseline',
    'landing.howto.step2.body': 'Adjust Set 1 sliders to the scenario you want as your baseline.',
    'landing.howto.step3.title': 'Copy & change one thing',
    'landing.howto.step3.body': 'Click "Copy 1→2" then change a single parameter in Set 2.',
    'landing.howto.step4.title': 'Compare & export',
    'landing.howto.step4.body': 'Read the tables and plots, then export as image, CSV or Excel.',

    // Section titles
    'section.parameters': 'Parameters',
    'section.endogenous': 'Endogenous variables',
    'section.plots': 'Plots',
    'section.equations': 'Equations',
    'section.scenarios': 'Scenarios',

    // Table headers
    'table.parameter': 'Parameter',
    'table.set1': 'Set 1',
    'table.set2': 'Set 2',
    'table.delta': 'Δ',
    'table.pctdelta': '%Δ',
    'table.variable': 'Variable',

    // Buttons / controls
    'ui.copy12': 'Copy 1 → 2',
    'ui.reset': 'Reset',
    'ui.save': 'Save',
    'ui.load': 'Load',
    'ui.delete': 'Delete',
    'ui.exportCsv': 'Export CSV',
    'ui.exportXlsx': 'Export XLSX',
    'ui.exportJson': 'Export JSON',
    'ui.importJson': 'Import JSON',
    'ui.png': 'PNG',
    'ui.scenarioNamePrompt': 'Scenario name:',
    'ui.scenarioSelectPlaceholder': 'Select a saved scenario…',
    'ui.noScenarios': 'No saved scenarios',
    'ui.confirmDelete': 'Delete scenario "{name}"?',
    'ui.importError': 'Could not import this file: it does not match the current model.',
    'ui.importSuccess': 'Scenario imported.',
    'ui.lang.en': 'EN',
    'ui.lang.es': 'ES',

    // Loading
    'ui.loading': 'Loading model…',

    // Misc
    'ui.notes': 'Notes',
  },
  es: {
    // Site
    'site.name': 'MacroModels',
    'site.subtitle': 'Modelos macroeconómicos interactivos — largo y corto plazo',

    // Nav
    'nav.home': 'Inicio',
    'nav.longrun': 'Largo Plazo',
    'nav.shortrun': 'Corto Plazo',

    // Course / footer
    'course.line': 'Macroeconomía General — EC0113 / MS1002 · Universidad EAFIT · Prof. José Miguel Arias Mejía',
    'course.book': 'Charles I. Jones, Macroeconomics, 6.ª edición, W.W. Norton',
    'footer.rights': 'Para uso educativo en Macroeconomía General.',
    'footer.builtWith': 'Construido con Plotly, KaTeX y SheetJS.',

    // Landing hero
    'landing.hero.title': 'Aprende macroeconomía cambiando los números',
    'landing.hero.body': 'Modelos interactivos del libro de Jones: ajusta los parámetros, compara dos escenarios lado a lado y observa cómo se actualizan al instante las ecuaciones, tablas y gráficos.',

    // Landing cards
    'landing.card.longrun.title': 'Largo Plazo',
    'landing.card.longrun.desc': 'Crecimiento, mercado laboral e inflación a lo largo de décadas: cómo se enriquecen las economías y por qué suben los precios.',
    'landing.card.shortrun.title': 'Corto Plazo',
    'landing.card.shortrun.desc': 'Ciclos económicos, brechas de producto, demanda agregada y política monetaria: por qué las economías tienen auges y recesiones.',
    'landing.card.chapters': 'Capítulos',
    'landing.card.cta': 'Explorar modelos',

    // Model names (index links)
    'landing.model.solow': 'Modelo de crecimiento de Solow',
    'landing.model.labor': 'Mercado laboral',
    'landing.model.inflation': 'Crecimiento monetario e inflación',
    'landing.model.okun': 'Producto, crecimiento y ley de Okun',
    'landing.model.iscurve': 'La curva IS',
    'landing.model.mppc': 'Política monetaria y curva de Phillips',

    // How-to-use strip
    'landing.howto.title': 'Cómo usar este sitio',
    'landing.howto.step1.title': 'Elige un modelo',
    'landing.howto.step1.body': 'Selecciona Largo Plazo o Corto Plazo y luego una pestaña de modelo.',
    'landing.howto.step2.title': 'Set 1 = escenario base',
    'landing.howto.step2.body': 'Ajusta los deslizadores del Set 1 al escenario que quieras como base.',
    'landing.howto.step3.title': 'Copia y cambia algo',
    'landing.howto.step3.body': 'Haz clic en "Copiar 1→2" y luego cambia un solo parámetro en el Set 2.',
    'landing.howto.step4.title': 'Compara y exporta',
    'landing.howto.step4.body': 'Lee las tablas y gráficos, luego exporta como imagen, CSV o Excel.',

    // Section titles
    'section.parameters': 'Parámetros',
    'section.endogenous': 'Variables endógenas',
    'section.plots': 'Gráficos',
    'section.equations': 'Ecuaciones',
    'section.scenarios': 'Escenarios',

    // Table headers
    'table.parameter': 'Parámetro',
    'table.set1': 'Set 1',
    'table.set2': 'Set 2',
    'table.delta': 'Δ',
    'table.pctdelta': '%Δ',
    'table.variable': 'Variable',

    // Buttons / controls
    'ui.copy12': 'Copiar 1 → 2',
    'ui.reset': 'Reiniciar',
    'ui.save': 'Guardar',
    'ui.load': 'Cargar',
    'ui.delete': 'Eliminar',
    'ui.exportCsv': 'Exportar CSV',
    'ui.exportXlsx': 'Exportar XLSX',
    'ui.exportJson': 'Exportar JSON',
    'ui.importJson': 'Importar JSON',
    'ui.png': 'PNG',
    'ui.scenarioNamePrompt': 'Nombre del escenario:',
    'ui.scenarioSelectPlaceholder': 'Selecciona un escenario guardado…',
    'ui.noScenarios': 'No hay escenarios guardados',
    'ui.confirmDelete': '¿Eliminar el escenario "{name}"?',
    'ui.importError': 'No se pudo importar este archivo: no corresponde al modelo actual.',
    'ui.importSuccess': 'Escenario importado.',
    'ui.lang.en': 'EN',
    'ui.lang.es': 'ES',

    // Loading
    'ui.loading': 'Cargando modelo…',

    // Misc
    'ui.notes': 'Notas',
  },
};

let currentLang = DEFAULT_LANG;
try {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved === 'en' || saved === 'es') currentLang = saved;
} catch (e) {
  // localStorage unavailable (e.g. file:// in some browsers) — fall back silently
}

const listeners = new Set();

/** Current-language lookup. Falls back to English, then to the raw key. */
export function t(key) {
  const fromCurrent = dict[currentLang] && dict[currentLang][key];
  if (fromCurrent !== undefined) return fromCurrent;
  const fromEn = dict.en && dict.en[key];
  if (fromEn !== undefined) return fromEn;
  return key;
}

/** Returns the active language code: 'en' | 'es'. */
export function getLang() {
  return currentLang;
}

/** Sets the active language, persists it, updates <html lang>, and notifies subscribers. */
export function setLang(lang) {
  if (lang !== 'en' && lang !== 'es') return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
  for (const cb of listeners) {
    try {
      cb(lang);
    } catch (e) {
      console.error('[i18n] onLangChange callback failed', e);
    }
  }
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Merge model-provided strings {en:{...}, es:{...}} into the dictionary. */
export function registerStrings(strings) {
  if (!strings) return;
  if (strings.en) Object.assign(dict.en, strings.en);
  if (strings.es) Object.assign(dict.es, strings.es);
}

/**
 * Translate all [data-i18n] (textContent) and [data-i18n-title] (title attr)
 * nodes under `root`. Also handles [data-i18n-placeholder] and
 * [data-i18n-aria-label] for form controls.
 */
export function applyI18n(root = document) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  });
  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLang;
  }
}
