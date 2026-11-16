'use strict';
/* حزمة نصية واحدة: تصدير المشروع كنص + خريطة ملفات، واستيراد نص لتوليد الملفات.
   الصيغة:  === FILE: path (N lines) ===  ثم المحتوى. القراءة في parseBundle (12-patch-ui.js). */
const BUNDLE_HEAD = /^\s*# CodePatcher Bundle/;
/* بعد ui.close يلزم انتظار قصير قبل فتح نافذة أخرى (سباق history.back في ui) */
const bundleWait = ms => new Promise(r => setTimeout(r, ms));
const bundleOpt = { instr: true, limit: 0 };
const bLines = c => { const t = String(c).replace(/\s+$/, ''); return t === '' ? 0 : t.split('\n').length; };
function estTokens(s) { let a = 0, o = 0; for (let i = 0; i < s.length; i++) (s.charCodeAt(i) < 128 ? a++ : o++); return Math.ceil(a / 3.6 + o / 1.6); }

function bundleTree(names, bins) {
  const T = {};
  const add = (n, b) => { const p = n.split('/').filter(Boolean); let o = T; p.forEach((seg, i) => { if (i === p.length - 1) o[seg] = b ? 'b' : 'f'; else { if (typeof o[seg] !== 'object') o[seg] = {}; o = o[seg]; } }); };
  names.forEach(n => add(n, false)); bins.forEach(n => add(n, true));
  const isD = v => typeof v === 'object', lines = [];
  const walk = (o, pre) => {
    const ks = Object.keys(o).sort((a, b) => (isD(o[b]) - isD(o[a])) || (a < b ? -1 : a > b ? 1 : 0));
    ks.forEach((k, i) => {
      const last = i === ks.length - 1;
      lines.push(pre + (last ? '└── ' : '├── ') + k + (isD(o[k]) ? '/' : '') + (o[k] === 'b' ? '  [binary]' : ''));
      if (isD(o[k])) walk(o[k], pre + (last ? '    ' : '│   '));
    });
  };
  walk(T, ''); return lines.join('\n');
}

function bundleInstr(n) {
  return '# Instructions: this is a full project snapshot. Read it, then follow my request.\n' +
    '# When you change files, reply with each CHANGED file in full: a line like  === FILE: path/to/file ===  then its complete content\n' +
    '# (no placeholders, no omitted parts, nothing else between files). Do not repeat unchanged files.' +
    (n > 1 ? '\n# The project is sent in ' + n + ' parts: wait until all parts arrive before answering.' : '');
}

/* يبني الأجزاء: limit = حد التوكنات التقريبي للجزء (0 = كل شيء في جزء واحد). الملف الواحد لا يُقسَّم. */
function bundleBuild(sel, limit, instr) {
  const fl = files.filter(f => !sel || f.name.startsWith(sel + '/')).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const bins = [...BIN.keys()].map(n => n.replace(/^\/+/, '')).filter(n => !sel || n.startsWith(sel + '/')).sort();
  const blocks = fl.map(f => { const t = nl(f.content).replace(/\s+$/, ''); return '=== FILE: ' + f.name + ' (' + bLines(t) + ' lines) ===\n' + t + '\n\n'; });
  const root = sel || commonRoot(fl) || 'Project';
  const meta = '# المشروع: ' + root + ' — ' + fl.length + ' ملف' + (bins.length ? ' + ' + bins.length + ' ثنائي' : '') + ' — ' + new Date().toISOString().slice(0, 10);
  const head1 = N => '# CodePatcher Bundle v1\n' + meta + (N > 1 ? ' — جزء 1/' + N : '') + '\n' + (instr ? bundleInstr(N) + '\n' : '') +
    '\n## خريطة الملفات\n' + bundleTree(fl.map(f => f.name), bins) + '\n\n## محتوى الملفات\n\n';
  const groups = [[]]; let tok = estTokens(head1(2));
  blocks.forEach(b => {
    const bt = estTokens(b), g = groups[groups.length - 1];
    if (limit && g.length && tok + bt > limit) { groups.push([b]); tok = 40 + bt; } else { g.push(b); tok += bt; }
  });
  const N = groups.length;
  return groups.map((g, i) => {
    const head = i === 0 ? head1(N) : '# CodePatcher Bundle v1 (تكملة)\n# جزء ' + (i + 1) + '/' + N + ' — الخريطة في الجزء الأول\n\n';
    const tail = N > 1 ? '# — نهاية الجزء ' + (i + 1) + '/' + N + (i + 1 < N ? ' — سيصل الجزء التالي' : ' — انتهى') + ' —\n' : '';
    return head + g.join('') + tail;
  });
}

function bundleMapText(sel) {
  const fl = files.filter(f => !sel || f.name.startsWith(sel + '/')).map(f => f.name), bins = [...BIN.keys()].map(n => n.replace(/^\/+/, '')).filter(n => !sel || n.startsWith(sel + '/'));
  return '# CodePatcher Map\n# ' + (sel || commonRoot() || 'Project') + ' — ' + fl.length + ' ملف\n\n' + bundleTree(fl, bins) + '\n';
}
function downloadText(text, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function exportBundleDialog(sel) {
  const c = cur(); if (c) c.content = editor.value;
  sel = sel || '';
  if (!files.some(f => !sel || f.name.startsWith(sel + '/'))) return toast('لا ملفات للتصدير', 'err');
  const I = n => '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg> ';
  const row = (act, ic_, t, d) => '<div class="mi" data-act="' + act + '"' + (d != null ? ' data-i="' + d + '"' : '') + '>' + I(ic_) + '<span>' + t + '</span></div>';
  const draw = () => {
    const parts = bundleBuild(sel, bundleOpt.limit, bundleOpt.instr), all = parts.join('\n');
    const chip = (v, t) => '<button class="btn' + (bundleOpt.limit === v ? ' primary' : '') + '" data-act="lim" data-v="' + v + '">' + t + '</button>';
    ui.show('<h3>' + I('file-md') + 'نص واحد <small dir="ltr" style="opacity:.6">· ~' + estTokens(all) + ' tok · ' + all.length + ' ch</small></h3>' +
      '<div class="slabel">تقسيم لأجزاء (توكنات تقريبية لكل جزء)</div>' +
      '<div class="srow">' + chip(0, 'كامل') + chip(6000, '6k') + chip(12000, '12k') + chip(24000, '24k') + '</div>' +
      (parts.length > 1 ? parts.map((p, i) => row('cp', 'copy', 'نسخ الجزء ' + (i + 1) + '/' + parts.length + ' <small dir="ltr" style="opacity:.6">~' + estTokens(p) + ' tok</small>', i)).join('') : row('cp', 'copy', 'نسخ', 0)) +
      row('map', 'list', 'نسخ خريطة الملفات فقط (بدون محتوى)') +
      row('dl', 'arrow-down', 'تنزيل ملف .txt') +
      row('ins', bundleOpt.instr ? 'check-square' : 'square', 'تعليمات للنموذج في البداية') +
      '<div class="slabel" style="line-height:1.7">الصور والملفات الثنائية تظهر في الخريطة فقط. الملف الأكبر من الحد يبقى في جزء واحد.</div>' +
      '<button class="btn" data-ui="cancel">إغلاق</button>', (act, el) => {
        if (act === 'lim') { bundleOpt.limit = +el.dataset.v; return draw(); }
        if (act === 'ins') { bundleOpt.instr = !bundleOpt.instr; return draw(); }
        if (act === 'cp') { const t = parts[+el.dataset.i || 0]; return copyToClipboard(t).then(() => toast('نُسخ' + (parts.length > 1 ? ' الجزء ' + ((+el.dataset.i || 0) + 1) + '/' + parts.length : '') + ' (~' + estTokens(t) + ' توكن)', 'ok')); }
        if (act === 'map') { const t = bundleMapText(sel); return copyToClipboard(t).then(() => toast('نُسخت الخريطة (~' + estTokens(t) + ' توكن)', 'ok')); }
        if (act === 'dl') { downloadText(all, (cleanName(sel ? sel.split('/').pop() : commonRoot()) || 'project') + '-bundle.txt'); return toast('نُزّل الملف', 'ok'); }
      });
  };
  draw();
}

/* ===== الاستيراد ===== */
function bundleSafeName(n) {
  n = String(n || '').trim().replace(/\\+/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '');
  if (!n || n.split('/').some(s => s === '..' || s === '')) return '';
  return n;
}

/* خريطة شجرية (├── └── │ أو مسافات أو قائمة مسارات) ← { files, dirs(فارغة), bins } */
function parseTreeMap(text) {
  const nodes = [], bins = [], stack = [];
  nl(text).split('\n').forEach(raw => {
    if (!raw.trim() || /^\s*#/.test(raw)) return;
    const pre = /^[\s│├└─|`+\-\\¦]*/.exec(raw)[0];
    let name = raw.slice(pre.length).replace(/\s+#.*$/, '').replace(/\s+(?:←|<-+|—|\/\/).*$/, '').trim();
    const isBin = /\s*\[binary\]\s*$/i.test(name); name = name.replace(/\s*\[binary\]\s*$/i, '').trim();
    if (!name || name.length > 120 || /[<>:"|?*\u0000-\u001f]/.test(name)) return;
    const indent = pre.length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1]; if (parent) { parent.isDir = true; parent.kids = true; }
    const isDir = /\/$/.test(name), clean = name.replace(/\/+$/, '');
    if (!clean) return;
    const node = { indent, path: (parent ? parent.path + '/' : '') + clean, isDir, kids: false, bin: isBin };
    stack.push(node); nodes.push(node);
  });
  return {
    files: nodes.filter(n => !n.isDir && !n.bin).map(n => n.path),
    dirs: nodes.filter(n => n.isDir && !n.kids).map(n => n.path),
    bins: nodes.filter(n => n.bin).map(n => n.path),
    looksTree: nodes.length > 0 && nodes.some(n => n.path.includes('/') || /[.]/.test(n.path) || n.isDir)
  };
}

/* يحوّل النص إلى خطة: [{ rel, content, warn, empty }] (rel بلا جذر المشروع) + اسم جذر مقترح */
function bundlePlan(text) {
  const blocks = parseBundle(text), warns = [], bad = []; let raw = [], bins = [], fromMap = false;
  if (blocks && blocks.length) {
    blocks.forEach(p => { const n = bundleSafeName(p.name); if (!n) { bad.push(p.name); return; } if (p.warn) warns.push(n + ': ' + p.warn); raw.push({ path: n, content: p.content }); });
  } else {
    const m = parseTreeMap(text); if (!m.looksTree) return null;
    fromMap = true; bins = m.bins;
    m.files.forEach(f => { const n = bundleSafeName(f); if (n) raw.push({ path: n, content: '', empty: true }); else bad.push(f); });
    m.dirs.forEach(d => { const n = bundleSafeName(d); if (n) raw.push({ path: n + '/.gitkeep', content: '', empty: true }); else bad.push(d); });
  }
  const seen = new Map(); raw.forEach(r => { if (seen.has(r.path)) warns.push(r.path + ': مكرر — اعتُمدت الأخيرة'); seen.set(r.path, r); });
  raw = [...seen.values()];
  if (!raw.length) return null;
  const tops = new Set(raw.map(r => r.path.includes('/') ? r.path.split('/')[0] : null));
  const root = (tops.size === 1 && !tops.has(null)) ? [...tops][0] : '';
  const list = raw.map(r => ({ rel: root ? r.path.slice(root.length + 1) : r.path, content: r.content, empty: !!r.empty })).filter(r => r.rel);
  return { list, root, warns, bad, bins, fromMap };
}

async function importBundleText(text, fresh) {
  await bundleWait(150);
  const plan = bundlePlan(text);
  if (!plan) { toast('لم أجد كتل === FILE: === ولا خريطة ملفات في النص', 'err'); return 0; }
  if (plan.list.length > MAX_COUNT) { plan.warns.push('تجاوز حد ' + MAX_COUNT + ' ملف — تُركت الزيادة'); plan.list.length = MAX_COUNT; }
  const I = n => '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg> ';
  let name = cleanName(plan.root) || 'project', loc = '';
  const finalOf = (r, nm, lc) => bundleSafeName([lc, nm, r.rel].filter(Boolean).join('/'));
  const stats = (nm, lc) => {
    const its = plan.list.map(r => ({ r, path: finalOf(r, nm, lc) })).filter(x => x.path);
    const ex = x => files.find(f => f.name === x.path);
    return { its, nNew: its.filter(x => !ex(x)).length, nSame: its.filter(x => ex(x) && ex(x).content === x.r.content).length };
  };
  const prevHTML = (nm, lc) => {
    const st = stats(nm, lc), nRep = st.its.length - st.nNew - st.nSame;
    return '<b>جديد ' + st.nNew + '</b> · <b>يُستبدل ' + nRep + '</b> · <b>مطابق ' + st.nSame + '</b><div class="slabel" dir="ltr" style="text-align:left;line-height:1.7">' +
      st.its.slice(0, 4).map(x => esc(x.path)).join('<br>') + (st.its.length > 4 ? '<br>… +' + (st.its.length - 4) : '') + '</div>';
  };
  const note = (t, a) => a.length ? '<div class="slabel" style="line-height:1.7">' + t + ' <span dir="ltr">' + a.slice(0, 5).map(esc).join(' ، ') + (a.length > 5 ? ' … +' + (a.length - 5) : '') + '</span></div>' : '';
  return new Promise(res => {
    const draw = () => {
      const folders = [''].concat(allFolders());
      ui.resolve = null;
      ui.show('<h3>' + I('import') + (plan.fromMap ? 'خريطة ملفات: ' : 'حزمة نصية: ') + plan.list.length + ' ملف</h3>' +
        (plan.fromMap ? '<div class="slabel" style="line-height:1.7">خريطة بلا محتوى — ستُنشأ الملفات فارغة والمجلدات الفارغة بملف .gitkeep.</div>' : '') +
        '<div class="slabel">اسم المشروع (مجلد الجذر — اتركه فارغاً لعدم إنشاء مجلد)</div>' +
        '<input type="text" id="bnName" dir="ltr" value="' + esc(name) + '">' +
        '<div class="slabel">مكان التوليد (داخل المشروع الحالي)</div>' +
        '<div style="max-height:26vh;overflow:auto">' + folderRows(folders, loc) + '</div>' +
        '<div class="issue" id="bnPrev">' + prevHTML(name, loc) + '</div>' +
        note('تنبيه:', plan.warns) + note('مرفوض:', plan.bad) + (plan.bins.length ? note('ثنائية لا تُولَّد:', plan.bins) : '') +
        '<div class="srow"><button class="btn" data-ui="cancel">إلغاء</button><button class="btn primary" data-act="merge">توليد هنا</button><button class="btn" data-act="fresh">مشروع جديد</button></div>', async (act, el) => {
          const inp = $('bnName'); if (inp) name = cleanName(inp.value);
          if (act === 'fold') { loc = folders[+el.dataset.i]; return draw(); }
          if (act !== 'merge' && act !== 'fresh') return;
          const useLoc = act === 'fresh' ? '' : loc;
          const its = stats(name, useLoc).its.filter(x => act === 'fresh' || !files.some(f => f.name === x.path && f.content === x.r.content));
          const wipe = act === 'fresh' ? new Map(BIN) : null;
          ui.resolve = null; ui.close(null); await bundleWait(150);
          if (!its.length) { toast('لا شيء ليتغيّر — كل الملفات مطابقة', ''); return res(0); }
          const n = await addItems(its.map(x => { const old = files.find(f => f.name === x.path); return { name: x.path, content: x.r.content, eol: old ? old.eol : 'lf', enc: old ? old.enc : 'utf-8' }; }), wipe);
          if (n) toast('تم توليد ' + n + ' ملف' + (name ? ' في ' + [useLoc, name].filter(Boolean).join('/') : '') + ' — للتراجع: تبويب باتشات', 'ok');
          res(n || 0);
        });
      ui.resolve = () => res(0);
      const inp = $('bnName'); if (inp) inp.addEventListener('input', () => { const pv = $('bnPrev'); if (pv) pv.innerHTML = prevHTML(cleanName(inp.value), loc); });
    };
    draw();
  });
}
function importBundleDialog() {
  const T = 'width:100%;min-height:150px;direction:ltr;text-align:left;font-family:var(--mono);font-size:12px';
  ui.show('<h3>استيراد من نص</h3><div class="slabel">الصق حزمة (=== FILE: ===) أو خريطة ملفات (شجرة) أو اختر ملف .txt</div>' +
    '<textarea class="plain" id="bnIn" spellcheck="false" autocapitalize="off" style="' + T + '"></textarea>' +
    '<div class="srow"><button class="btn" data-act="paste">لصق</button><button class="btn" data-act="pick">ملف .txt…</button></div>' +
    '<div class="srow"><button class="btn" data-ui="cancel">✕</button><button class="btn primary" data-act="parse">تحليل</button></div>', async act => {
      const ta = $('bnIn');
      if (act === 'paste') { try { ta.value = await navigator.clipboard.readText(); } catch (e) { toast('لا إذن للحافظة — الصق يدوياً داخل الخانة', 'err'); } return; }
      if (act === 'pick') {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.txt,.md,text/plain';
        inp.onchange = async () => { const f = inp.files && inp.files[0]; if (f) ta.value = await f.text(); };
        return inp.click();
      }
      if (act === 'parse') { const t = ta.value; if (!t.trim()) return toast('الخانة فارغة', 'err'); ui.close(null); setTimeout(() => importBundleText(t, false), 120); }
    });
  setTimeout(() => { const t = $('bnIn'); if (t) t.focus(); }, 80);
}
function bundleMenu() {
  const I = n => '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg> ';
  ui.show('<h3>' + I('file-md') + 'المشروع كنص واحد</h3>' +
    '<div class="mi" data-act="out">' + I('export') + '<span>نسخ المشروع كنص (للذكاء الاصطناعي)</span></div>' +
    '<div class="mi" data-act="in">' + I('import') + '<span>توليد ملفات ومجلدات من نص (حزمة أو خريطة)</span></div>', act => {
      ui.close(null);
      if (act === 'out') setTimeout(() => exportBundleDialog(''), 120);
      else if (act === 'in') setTimeout(importBundleDialog, 120);
    });
}
