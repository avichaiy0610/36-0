// Keeps the admin text catalog (js/text-catalog.js) in step with מצב סיפור.
//
// Every chapter contributes its editable words — title, intro, the three star
// labels, and for a European chapter the line about what really happened — as
// 'virtual' keys the screens read through siteText (js/story-screens.js,
// storyT). The owner asked to be able to edit these without touching code.
//
// Unlike scripts/sync_whatsnew_texts.js this REPLACES the story rows rather than
// only adding missing ones: the defaults live in js/story-data.js and change as
// chapters are tuned, and a stale default in the admin panel would show an old
// sentence as if it were the live one. An override saved in the admin panel is
// in the site_texts table, not here, so it is untouched.
//
//   node scripts/sync_story_texts.js
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const C = new Function(R('js/story-data.js') + ';return STORY_CHAPTERS;')();
const TEAMS = new Function(R('js/data.js') + ';return TEAMS;')();

const SCREEN = 'מצב סיפור';
const want = [{ key: 'sm-hub-blurb', label: 'מסך הפרקים · הפסקה העליונה',
  def: 'רגעים אמיתיים מתולדות ליגת העל. אתה המועדון, עם הסגל והקופה של אותה עונה. תגיע למטרה, ואז תנסה לעקוף את המציאות.' }];
for (const ch of C) {
  const name = `${(TEAMS[ch.teamId] || {}).name || ch.teamId} ${ch.season}`;
  const k = f => `sm-${ch.id}-${f}`;
  want.push({ key: k('title'), label: `${name} · כותרת`, def: ch.title });
  want.push({ key: k('intro'), label: `${name} · טקסט הפתיחה`, def: ch.intro });
  ch.stars.forEach((s, i) => want.push({ key: k('star' + (i + 1)), label: `${name} · ${'★'.repeat(i + 1)}`, def: s.label }));
  if (ch.europe) want.push({ key: k('real'), label: `${name} · מה היה במציאות`, def: ch.europe.realText });
}

const file = path.join(__dirname, '..', 'js', 'text-catalog.js');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
if (crlf) src = src.replace(/\r\n/g, '\n');
// drop every existing story row (prefix sm- — "story-" is the season-summary screen's), then append the current set
const before = src;
src = src.replace(/,\n \{"key":"sm-[^\n]*\}(?=,?\n)/g, '');
const removed = (before.match(/"key":"sm-/g) || []).length;
const rows = want.map(w => ' ' + JSON.stringify({ key: w.key, screen: SCREEN, label: w.label, selector: 'virtual', def: w.def }));
const at = src.lastIndexOf('\n];');
src = src.slice(0, at) + ',\n' + rows.join(',\n') + src.slice(at);
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src, 'utf8');
console.log(`מצב סיפור: ${want.length} מפתחות בקטלוג (${removed} ישנים הוחלפו)`);
