'use strict';
/* الإعدادات والمظهر */
/* ===== الإعدادات والمظهر ===== */
function applyTheme() {
  document.body.classList.toggle('light', S.theme === 'light');
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', S.theme === 'light' ? '#f5f7fa' : '#0a0c10');
}
function applyFont() {
  LH = Math.round(S.fs * 1.7); _cw = 0;
  const r = document.documentElement.style; r.setProperty('--fs', S.fs + 'px'); r.setProperty('--lh', LH + 'px');
  applyTheme();
}
function openSettings() {
  const seg = (cur, key, opts) => opts.map(([v, l]) => `<button class="btn ${cur === v ? 'sel' : ''}" data-act="${key}" data-v="${v}">${l}</button>`).join('');
  const build = () => `<h3>الإعدادات</h3>
    <div class="slabel">حجم الخط</div>
    <div class="srow"><button class="btn" data-act="fs-" >A−</button><div style="text-align:center;font-weight:700">${S.fs}px</div><button class="btn" data-act="fs+">A+</button></div>
    <div class="slabel">المظهر</div>
    <div class="srow">${seg(S.theme || 'dark', 'theme', [['dark', 'داكن'], ['light', 'فاتح']])}</div>
    <div class="slabel">شريط الرموز</div>
    <div class="srow">${seg(S.sym, 'sym', [['auto', 'تلقائي مع الكيبورد'], ['always', 'دائم'], ['off', 'مخفي']])}</div>
    <div class="slabel">إغلاق الأقواس والعلامات تلقائياً</div>
    <div class="srow">${seg(S.autoClose ? 'on' : 'off', 'ac', [['on', 'تشغيل'], ['off', 'إيقاف']])}</div>
    <div class="slabel">منع الشبكة في المعاينة (CSP)</div>
    <div class="srow">${seg(S.noNet ? 'on' : 'off', 'nn', [['off', 'إيقاف'], ['on', 'تشغيل']])}</div>
    <div class="slabel">حارس الباتش الكسول</div>
    <div class="srow">${seg(S.strictLazy !== false ? 'on' : 'off', 'sl', [['on', 'يحجب (موصى به)'], ['off', 'تحذير فقط']])}</div>
    <div class="slabel">الفحص التلقائي عند «معاينة» (اختبار الدخان، نحو 5 ثوانٍ)</div>
    <div class="srow">${seg(S.autoSmoke !== false ? 'on' : 'off', 'as', [['on', 'تشغيل'], ['off', 'إيقاف']])}</div>
    <div class="slabel">التطبيق</div>
    <div class="srow"><button class="btn" data-act="inst">${STANDALONE ? 'يعمل كتطبيق ✓' : 'تثبيت كتطبيق'}</button></div>
    <div class="slabel">الملف الحالي</div>
    <div class="srow"><button class="btn" data-act="eol">نهاية السطر: ${cur() && cur().eol === 'crlf' ? 'CRLF' : 'LF'} ⇄</button><button class="btn" data-act="inv">احذف الأحرف الخفية</button></div>
    <div class="slabel">الأمان والاختبار</div>
    <div class="srow"><button class="btn" data-act="pal">لوحة الأوامر</button><button class="btn" data-act="snaps">نقاط الحفظ</button><button class="btn" data-act="selftest">اختبار ذاتي</button></div>
    <div class="srow"><button class="btn" data-act="vers">الإصدارات والتصحيحات</button></div>
    <button class="btn" data-ui="cancel">إغلاق</button>`;
  const handler = (act, el) => {
    if (act === 'vers') { ui.close(null); setTimeout(showV1, 120); return; }
    if (act === 'inst') { installApp(); return; } if (act === 'pal') { ui.close(null); setTimeout(openPalette, 120); return; } if (act === 'snaps') { ui.close(null); showSnaps(); return; } if (act === 'selftest') { ui.close(null); runSelfTest(); return; }
    if (act === 'fs-') S.fs = Math.max(11, S.fs - 1);
    else if (act === 'fs+') S.fs = Math.min(22, S.fs + 1);
    else if (act === 'sym') S.sym = el.dataset.v;
    else if (act === 'ac') S.autoClose = el.dataset.v === 'on';
    else if (act === 'nn') S.noNet = el.dataset.v === 'on';
    else if (act === 'sl') S.strictLazy = el.dataset.v === 'on';
    else if (act === 'as') S.autoSmoke = el.dataset.v === 'on';
    else if (act === 'eol') { const f = cur(); if (f) { f.eol = f.eol === 'crlf' ? 'lf' : 'crlf'; f.dirtySave = true; toast('نهاية السطر عند التصدير: ' + (f.eol === 'crlf' ? 'CRLF' : 'LF'), 'ok'); } }
    else if (act === 'inv') { const r = stripInvisible(editor.value); if (!r.count) toast('لا أحرف خفية'); else { snapNow('قبل حذف الأحرف الخفية'); setAll(r.text); toast('حُذف/استُبدل ' + r.count + ' حرف خفي', 'ok'); } }
    else if (act === 'theme') S.theme = el.dataset.v;
    applyFont(); updateSymBar(); paintWindow(); scheduleSave();
    ui.sheet.innerHTML = build();
  };
  ui.show(build(), handler);
}

