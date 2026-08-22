// Keeps the text catalog in step with js/whatsnew.js.
//
// Each version contributes three editable keys: its date, its title, and its
// bullets as ONE multi-line value. Bullets are deliberately not one key each —
// that way adding or reordering a line is typing in the admin textarea rather
// than a code change plus a catalog row.
//
//   node scripts/sync_whatsnew_texts.js
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const { WHATS_NEW } = new Function(R('js/whatsnew.js')
  .replace(/document\.addEventListener[\s\S]*$/, '') + ';return { WHATS_NEW };')();

const SCREEN = 'מה חדש';
const want = [{ key: 'wn-button', label: 'כיתוב הכפתור במסך הבית', def: 'מה חדש!' }];
for (const e of WHATS_NEW) {
  want.push({ key: `wn-${e.v}-date`,  label: `v${e.v} · תאריך`,  def: e.date });
  want.push({ key: `wn-${e.v}-title`, label: `v${e.v} · כותרת`,  def: e.title });
  want.push({ key: `wn-${e.v}-items`, label: `v${e.v} · השורות (שורה לכל פריט)`, def: e.items.join('\n') });
}

const file = path.join(__dirname, '..', 'js', 'text-catalog.js');
let src = fs.readFileSync(file, 'utf8');
const have = new Set([...src.matchAll(/"key":\s*"([^"]+)"/g)].map(m => m[1]));
const add = want.filter(w => !have.has(w.key));
if (!add.length) { console.log('הקטלוג מעודכן — אין מה להוסיף'); process.exit(0); }

const rows = add.map(w => ' ' + JSON.stringify(
  { key: w.key, screen: SCREEN, label: w.label, selector: 'virtual', def: w.def }));
const at = src.lastIndexOf('\n];');
src = src.slice(0, at) + ',\n' + rows.join(',\n') + src.slice(at);
fs.writeFileSync(file, src, 'utf8');
console.log(`נוספו ${add.length} מפתחות:`);
add.forEach(w => console.log('  ' + w.key));
