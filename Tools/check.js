// تشغيل: node tools/check.js
// يفحص: صياغة كل ملف JS، تسجيله في index.html وsw.js، وتكرار أسماء الدوال بين الملفات.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), sw = read('sw.js');
let bad = 0; const fail = m => { bad++; console.log('✗ ' + m); };
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).sort();
const cssFiles = fs.readdirSync(path.join(root, 'css')).filter(f => f.endsWith('.css'));
const seen = {};
for (const f of jsFiles) {
  const r = cp.spawnSync(process.execPath, ['--check', path.join(root, 'js', f)], { encoding: 'utf8' });
  if (r.status) fail(f + ': خطأ صياغة\n' + r.stderr.split('\n').slice(0, 4).join('\n'));
  if (!html.includes(`src="js/${f}"`)) fail(f + ': غير مضاف في index.html');
  if (!sw.includes(`./js/${f}`)) fail(f + ': غير مضاف في قائمة sw.js');
  for (const m of read('js/' + f).matchAll(/^(?:async function|function|class|const|let|var) +([A-Za-z_$][\w$]*)/gm)) {
    if (seen[m[1]]) fail(`الاسم ${m[1]} مكرر: ${seen[m[1]]} و ${f}`); else seen[m[1]] = f;
  }
}
const order = [...html.matchAll(/src="js\/([^"]+)"/g)].map(m => m[1]);
if (order.join() !== jsFiles.join()) fail('ترتيب <script> في index.html لا يطابق ترتيب الأسماء');
for (const f of cssFiles) { if (!html.includes(`css/${f}`)) fail(f + ': غير مضاف في index.html'); if (!sw.includes(`./css/${f}`)) fail(f + ': غير مضاف في sw.js'); }
console.log(bad ? `\n${bad} مشكلة` : `✓ سليم: ${jsFiles.length} ملف JS و ${cssFiles.length} ملف CSS`);
process.exit(bad ? 1 : 0);
