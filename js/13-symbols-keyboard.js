'use strict';
/* شريط الرموز والكيبورد */
/* ===== شريط الرموز ===== */
const SYMS = [
  { i: 'undo', k: 'undo', a: 'تراجع' }, { i: 'redo', k: 'redo', a: 'إعادة' }, { i: 'save', k: 'save', a: 'حفظ' }, { i: 'tab', k: 'tab', a: 'مسافة بادئة' }, { i: 'arrow-left', k: 'left', a: 'يسار' }, { i: 'arrow-right', k: 'right', a: 'يمين' }, { i: 'arrow-up', k: 'up', a: 'أعلى' }, { i: 'arrow-down', k: 'down', a: 'أسفل' }, { i: 'slashes', k: 'comment', a: 'تعليق' },
  { i: 'copy', k: 'dup', a: 'تكرار السطر' }, { i: 'trash', k: 'dell', a: 'حذف السطر' }, { i: 'move-up', k: 'mvup', a: 'نقل السطر لأعلى' }, { i: 'move-down', k: 'mvdn', a: 'نقل السطر لأسفل' }, { i: 'search', k: 'pfind', a: 'بحث في المشروع' },
  { l: 'مدّ', k: 'sel+', a: 'توسيع التحديد' }, { l: 'ضمّ', k: 'sel-', a: 'تقليص التحديد' }, { l: '{', t: '{' }, { l: '}', t: '}' }, { l: '(', t: '(' }, { l: ')', t: ')' }, { l: '[', t: '[' }, { l: ']', t: ']' },
  { l: '{ }', t: '{}', pair: 1 }, { l: '( )', t: '()', pair: 1 }, { l: '[ ]', t: '[]', pair: 1 }, { l: '" "', t: '""', pair: 1 }, { l: "' '", t: "''", pair: 1 }, { l: '` `', t: '``', pair: 1 },
  { l: ';', t: ';' }, { l: ':', t: ':' }, { l: '=', t: '=' }, { l: '=>', t: '=>' }, { l: '<', t: '<' }, { l: '>', t: '>' },
  { l: '/', t: '/' }, { l: '\\', t: '\\' }, { l: '|', t: '|' }, { l: '&', t: '&' }, { l: '!', t: '!' }, { l: '?', t: '?' },
  { l: '+', t: '+' }, { l: '-', t: '-' }, { l: '*', t: '*' }, { l: '_', t: '_' }, { l: '$', t: '$' }, { l: '#', t: '#' }, { l: '%', t: '%' },
  { l: '${}', t: '${}', back: 1 }
];
const symBar = $('symBar');
symBar.innerHTML = SYMS.map((x, i) => `<button type="button" class="sym-btn" tabindex="-1" data-i="${i}" aria-label="${esc(x.a || x.l)}">${x.i ? ic(x.i) : esc(x.l)}</button>`).join('');symBar.addEventListener('mousedown', e => e.preventDefault());
symBar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) handleSym(SYMS[+b.dataset.i]); });
function isTextTarget(el) { return !!el && (el === editor || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')); }
function symTarget() { const a = document.activeElement; return isTextTarget(a) ? a : editor; }
function put(el, text, back) {
  back = back || 0; const s = el.selectionStart, e = el.selectionEnd;
  if (el === editor) { replaceText(s, e - s, text, s + text.length - back, null, false); return; }
  el.setRangeText(text, s, e, 'end');
  if (back) { const p = el.selectionStart - back; el.setSelectionRange(p, p); }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function moveCaret(el, dir) {
  const v = el.value, len = v.length;
  const base = (dir === 'left' || dir === 'up') ? el.selectionStart : el.selectionEnd;
  let np = base;
  if (dir === 'left') np = Math.max(0, base - 1);
  else if (dir === 'right') np = Math.min(len, base + 1);
  else if (el.tagName === 'INPUT') np = dir === 'up' ? 0 : len;
  else {
    const ls = base === 0 ? 0 : v.lastIndexOf('\n', base - 1) + 1, col = base - ls;
    if (dir === 'up') {
      if (ls === 0) np = 0;
      else { const pls = ls <= 1 ? 0 : v.lastIndexOf('\n', ls - 2) + 1; np = Math.min(pls + col, ls - 1); }
    } else {
      const le = v.indexOf('\n', base);
      if (le === -1) np = len;
      else { const nle = v.indexOf('\n', le + 1); np = Math.min(le + 1 + col, nle === -1 ? len : nle); }
    }
  }
  el.setSelectionRange(np, np);
  if (el === editor) { onSel(); revealCaret(); }
}
function handleSym(x) {
  const el = symTarget(); if (el.disabled) return;
  if (el !== document.activeElement) el.focus({ preventScroll: true });
  const s = el.selectionStart, e = el.selectionEnd;
  if (x.k === 'dup' || x.k === 'dell' || x.k === 'mvup' || x.k === 'mvdn') { if (el === editor) lineOp(x.k); return; }
  if (x.k === 'save') { saveMenu(); return; }
  if (x.k === 'undo') { undo(); return; } if (x.k === 'redo') { redo(); return; } if (x.k === 'pfind') { openDrawer('search'); return; }
  if (x.k === 'comment') { if (el === editor) toggleComment(); return; }
  if (x.k === 'tab') { if (el === editor && editor.value.slice(s, e).includes('\n')) indentLines(1); else put(el, '    '); return; }
  if (x.k === 'sel+' || x.k === 'sel-') { if (el === editor) selExpand(x.k === 'sel+' ? 1 : -1); return; }
  if (x.k) { moveCaret(el, x.k); return; }
  if (x.pair && e > s) { put(el, x.t[0] + el.value.slice(s, e) + x.t[1]); return; }
  put(el, x.t, x.pair ? 1 : (x.back || 0));
}

/* ===== الكيبورد: إشارات متعددة + احتياط بالتركيز ===== */
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
function measuredOpen() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  return (baseH - h) > 120 && (!vv || vv.scale <= 1.05);
}
function syncViewport() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight, w = vv ? vv.width : window.innerWidth;
  if (Math.abs(w - lastW) > 80) { baseH = 0; lastW = w; }
  baseH = Math.max(baseH, window.innerHeight, h);
  document.body.style.height = h + 'px';
  document.body.style.top = (vv ? vv.offsetTop : 0) + 'px';
  if (window.scrollY) window.scrollTo(0, 0);
  updateSymBar();
  requestAnimationFrame(paintWindow);
}
function updateSymBar() {
  const focused = isTextTarget(document.activeElement);
  let show = false;
  if (S.sym === 'always') show = true;
  else if (S.sym === 'auto') {
    const m = measuredOpen();
    if (m && focused) { if (!S.kbReports) { S.kbReports = true; scheduleSave(); } show = true; }
    else if (S.kbReports) show = false;                 // الجهاز يُبلّغ عن الكيبورد بدقة
    else show = focused && isTouch();                   // بيئة لا تُبلّغ: نعتمد على التركيز في اللمس
  }
  if (show !== symOn) {
    symOn = show; document.body.classList.toggle('sym', show);
    if (show) setTimeout(() => { if (document.activeElement === editor) revealCaret(); }, 80);
  }
}
if (window.visualViewport) { visualViewport.addEventListener('resize', syncViewport); visualViewport.addEventListener('scroll', syncViewport); }
window.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', () => setTimeout(() => { baseH = 0; syncViewport(); }, 300));
document.addEventListener('focusin', () => { updateSymBar(); setTimeout(syncViewport, 120); setTimeout(syncViewport, 400); });
document.addEventListener('focusout', () => setTimeout(syncViewport, 80));

