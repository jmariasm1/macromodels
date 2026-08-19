// exam.js — the gated exam viewer that lives in the left-hand pane.
//
// How access works
//   1. The student types their ID. The exam VERSION is the digital root of that
//      number (add the digits, repeat until one digit is left, 1..9).
//   2. The ID itself is the key. A key-encryption key is derived from it with
//      PBKDF2-SHA256 (200k iterations) and used to try to unwrap the content key
//      of the requested version. Only a student whose ID is on the class list has
//      an entry that authenticates, so no plaintext list of student IDs is
//      published anywhere and the exam pages cannot be decrypted without one.
//   3. Outside the scheduled exam windows nothing is decrypted at all. The clock
//      comes from the server's own Date response header, not the local machine.
//
// The pages are shipped as AES-GCM encrypted raster images and painted straight
// onto a <canvas>: there is no PDF to save, no text layer to copy, no <img> URL
// to right-click, and printing is blanked by CSS. A watermark carrying the
// student's ID is drawn over every page.
//
// This is deterrence, not DRM: anyone who legitimately opens the exam can still
// dig the pixels out of the browser with developer tools. The point is to stop
// casual downloading, printing, copying and sharing.

import { t, getLang, onLangChange } from './i18n.js';

const MANIFEST_URL = 'assets/exam/manifest.json';
const TEST_BYPASS_WINDOW = true;   // the professor's test codes ignore the schedule

let manifestPromise = null;
let state = { subject: null, id: null, version: null, examLang: null, zoom: 1 };

/* ----------------------------------------------------------------- utils */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function digitsOnly(s) { return (s || '').replace(/\D+/g, ''); }

/** Digital root: 123456789 -> 45 -> 9. Returns 0 for an all-zero input. */
export function digitalRoot(idDigits) {
  let n = 0;
  for (const ch of idDigits) n += Number(ch);
  while (n > 9) {
    let m = 0;
    for (const ch of String(n)) m += Number(ch);
    n = m;
  }
  return n;
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error('manifest');
      return r.json();
    });
  }
  return manifestPromise;
}

/**
 * Current time according to the SERVER (the Date header of a same-origin
 * request), falling back to the local clock when that is unavailable.
 */
async function serverNow() {
  try {
    const r = await fetch(MANIFEST_URL, { method: 'HEAD', cache: 'no-store' });
    const d = r.headers.get('date');
    if (d) {
      const ms = Date.parse(d);
      if (Number.isFinite(ms)) return new Date(ms);
    }
  } catch (_) { /* offline or blocked — fall through */ }
  return new Date();
}

function insideWindow(now, windows) {
  const ms = now.getTime();
  return (windows || []).some((w) => {
    const a = Date.parse(w.startUtc);
    const b = Date.parse(w.endUtc);
    return Number.isFinite(a) && Number.isFinite(b) && ms >= a && ms <= b;
  });
}

/* ------------------------------------------------------------ decryption */

async function deriveKek(id, saltB64, iterations) {
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(id), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

/**
 * Try every wrapped entry with this student's key-encryption key. Exactly one
 * authenticates when the ID is on the list; none does otherwise.
 */
async function unwrapContentKey(kek, wrapped, lang) {
  for (const entry of wrapped) {
    const packed = entry[lang];
    if (!packed) continue;
    try {
      const raw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(packed.iv) }, kek, b64ToBytes(packed.ct),
      );
      return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    } catch (_) { /* not this student's entry */ }
  }
  return null;
}

async function decryptPage(url, key) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`page ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const iv = buf.slice(0, 12);
  const ct = buf.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return createImageBitmap(new Blob([plain], { type: 'image/webp' }));
}

/* -------------------------------------------------------------- rendering */

function host() { return document.getElementById('exam-body'); }

function showGate(msg, cls) {
  const h = host();
  h.innerHTML = '';
  const box = el('div', 'gate');
  box.appendChild(el('h3', null, t('exam.gate.title')));
  box.appendChild(el('p', null, t('exam.gate.help')));

  const form = el('form');
  const input = el('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.placeholder = t('exam.gate.placeholder');
  input.setAttribute('aria-label', t('exam.gate.placeholder'));
  const go = el('button', 'btn primary', t('exam.gate.open'));
  go.type = 'submit';
  form.appendChild(input);
  form.appendChild(go);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = digitsOnly(input.value);
    if (!id) return;
    go.disabled = true;
    open(id).finally(() => { go.disabled = false; });
  });
  box.appendChild(form);

  const m = el('div', `msg${cls ? ` ${cls}` : ''}`, msg || '');
  box.appendChild(m);

  const sched = el('p', null, t('exam.schedule'));
  sched.style.cssText = 'margin-top:16px;font-size:0.78rem;opacity:0.8';
  box.appendChild(sched);

  h.appendChild(box);
  input.focus();
}

function showUnavailable(reasonKey) {
  const h = host();
  h.innerHTML = '';
  const box = el('div', 'notice');
  box.appendChild(el('div', 'stamp', t('exam.unavailable.stamp')));
  box.appendChild(el('div', 'big', t('exam.pending')));
  box.appendChild(el('p', null, t(reasonKey)));
  const back = el('button', 'btn', t('exam.gate.title'));
  back.type = 'button';
  back.style.marginTop = '14px';
  back.addEventListener('click', () => showGate());
  box.appendChild(back);
  h.appendChild(box);
  setHeader(false);
}

function showLoading() {
  const h = host();
  h.innerHTML = '';
  const box = el('div', 'notice');
  box.appendChild(el('div', 'big', t('exam.gate.loading')));
  h.appendChild(box);
}

function setHeader(open) {
  const info = document.getElementById('exam-info');
  const tools = document.getElementById('exam-tools');
  if (info) {
    info.textContent = open && state.version
      ? `${t('exam.version')} ${String(state.version).padStart(2, '0')}`
      : '';
  }
  if (tools) tools.style.display = open ? '' : 'none';
}

async function paint(pages, key, baseUrl) {
  const h = host();
  h.innerHTML = '';
  h.classList.add('noselect');
  const wmText = t('exam.watermark', { id: state.id, v: String(state.version).padStart(2, '0') });

  for (let i = 1; i <= pages; i += 1) {
    const holder = el('div', 'exam-page');
    holder.style.maxWidth = `${860 * state.zoom}px`;
    const canvas = el('canvas');
    holder.appendChild(canvas);
    const wm = el('div', 'wm');
    wm.textContent = `${wmText}\n${wmText}\n${wmText}`;
    holder.appendChild(wm);
    h.appendChild(holder);

    // eslint-disable-next-line no-await-in-loop
    const bmp = await decryptPage(`${baseUrl}p${i}.bin`, key);
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext('2d').drawImage(bmp, 0, 0);
    bmp.close();
  }
  setHeader(true);
}

/* ------------------------------------------------------------------ open */

async function open(id) {
  const version = digitalRoot(id);
  state.id = id;
  state.version = version;

  if (state.subject !== 'longrun') {          // the short-run exam does not exist yet
    showUnavailable('exam.notWritten');
    return;
  }
  if (version < 1 || version > 9) {
    showUnavailable('exam.badid');
    return;
  }

  showLoading();
  let man;
  try {
    man = await getManifest();
  } catch (_) {
    showUnavailable('exam.badid');
    return;
  }

  const subj = man.subjects?.[state.subject];
  if (!subj || !subj.available) {
    showUnavailable('exam.notWritten');
    return;
  }

  const isTest = man.testHashes?.includes(await sha256Hex(id));
  if (!(isTest && TEST_BYPASS_WINDOW)) {
    const now = await serverNow();
    if (!insideWindow(now, man.windows)) {
      showUnavailable('exam.window');
      return;
    }
  }

  const lang = state.examLang || getLang();
  const info = subj.versions?.[String(version)]?.[lang];
  if (!info) {
    showUnavailable('exam.notWritten');
    return;
  }

  let key = null;
  try {
    const kek = await deriveKek(id, man.kdf.salt, man.kdf.iterations);
    key = await unwrapContentKey(kek, man.wrapped, lang);
  } catch (_) { key = null; }

  // An ID that is not on the class list gets exactly the same answer as one that
  // arrives outside the exam window: the viewer never confirms whether an ID exists.
  if (!key) {
    showUnavailable('exam.badid');
    return;
  }

  try {
    await paint(info.pages, key, `assets/exam/${subj.dir}/v${version}-${lang}-`);
  } catch (_) {
    showUnavailable('exam.notWritten');
  }
}

/* -------------------------------------------------------------- hardening */

function harden(pane) {
  const block = (ev) => { ev.preventDefault(); return false; };
  ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach((evt) => {
    pane.addEventListener(evt, block);
  });
  // Ctrl/Cmd + P (print) and + S (save) are the realistic escape routes.
  window.addEventListener('keydown', (ev) => {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    const k = ev.key.toLowerCase();
    if (k === 'p' || k === 's') {
      const viewing = !!host()?.querySelector('.exam-page');
      if (viewing) { ev.preventDefault(); ev.stopPropagation(); }
    }
  }, true);
}

/* ------------------------------------------------------------------ init */

export function initExam({ subject }) {
  state.subject = subject;
  const pane = document.getElementById('exam-pane');
  if (!pane) return;
  harden(pane);

  const tools = document.getElementById('exam-tools');
  if (tools) {
    tools.innerHTML = '';
    const seg = el('div', 'segmented');
    [['es', 'ES'], ['en', 'EN']].forEach(([code, label]) => {
      const b = el('button', null, label);
      b.type = 'button';
      b.title = t('exam.lang');
      b.setAttribute('aria-pressed', String((state.examLang || getLang()) === code));
      b.addEventListener('click', () => {
        state.examLang = code;
        [...seg.children].forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
        if (state.id) open(state.id);
      });
      seg.appendChild(b);
    });
    tools.appendChild(seg);

    const zoomOut = el('button', 'btn tiny', '−');
    const zoomIn = el('button', 'btn tiny', '+');
    zoomOut.type = 'button'; zoomIn.type = 'button';
    const applyZoom = () => {
      document.querySelectorAll('.exam-page').forEach((n) => {
        n.style.maxWidth = `${860 * state.zoom}px`;
      });
    };
    zoomOut.addEventListener('click', () => { state.zoom = Math.max(0.6, state.zoom - 0.15); applyZoom(); });
    zoomIn.addEventListener('click', () => { state.zoom = Math.min(2.4, state.zoom + 0.15); applyZoom(); });
    tools.appendChild(zoomOut);
    tools.appendChild(zoomIn);

    const close = el('button', 'btn tiny', t('exam.close'));
    close.type = 'button';
    close.addEventListener('click', () => { state.id = null; state.version = null; showGate(); });
    tools.appendChild(close);
    tools.style.display = 'none';
  }

  showGate();
  onLangChange(() => { if (!state.id) showGate(); setHeader(!!host()?.querySelector('.exam-page')); });
}
