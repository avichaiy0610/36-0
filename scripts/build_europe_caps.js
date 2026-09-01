// Who has actually played in the Champions League — the data behind the
// "ניסיון אירופאי" tag, which lifts a squad's chances in the European campaign.
//
//   node scripts/build_europe_caps.js
//     → europe_caps.csv      (the record, reviewable by hand)
//     → js/eu-caps-data.js   (what the game loads)
//
// Two sources, and they are not alike:
//
//   1. THE ISRAELI HALF is derived, not typed. Six Israeli campaigns have ever
//      reached the group stage, and we already hold every one of those squads —
//      so the players are read straight out of SQUADS. Nothing to collect and
//      nothing to get wrong.
//
//   2. THE FOREIGN HALF has to be typed, because we hold Israeli league squads
//      and nothing else. It is listed below with the club and season that earned
//      it, so any row can be checked. It is deliberately conservative: a player
//      goes in only where a source names the season, never because he was at a
//      big club around the right time.
//
// Any name here that does not match a player in the data is REPORTED AND
// DROPPED, never invented into existence.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8').replace(/^(const|let) /gm, 'var ');
(0, eval)(src);

/* ── 1. the Israeli group-stage campaigns ─────────────────────────────────── */
// Every Israeli club that has ever reached the Champions League group stage:
// Maccabi Haifa three times, Maccabi Tel Aviv twice, Hapoel Tel Aviv once.
// Nobody else, ever — six campaigns in the whole history of Israeli football.
const IL_CAMPAIGNS = [
  { teamId: 'maccabi-haifa', season: '2002/03', note: 'הראשונה אי פעם - ובניצחון על מנצ\'סטר יונייטד' },
  { teamId: 'maccabi-tlv',   season: '2004/05', note: 'בית עם באיירן, יובנטוס ואייאקס' },
  { teamId: 'maccabi-haifa', season: '2009/10', note: 'הפעם השנייה של הירוקים' },
  { teamId: 'hapoel-tlv',    season: '2010/11', note: 'בית עם ליון, בנפיקה ושאלקה - וניצחון 0:3 על בנפיקה בבלומפילד' },
  { teamId: 'maccabi-tlv',   season: '2015/16', note: 'בית עם צ\'לסי, פורטו ודינמו קייב' },
  { teamId: 'maccabi-haifa', season: '2022/23', note: 'אחרי 5-4 במצטבר על הכוכב האדום' },
];

/* ── 2. Israelis in the Champions League for a foreign club ───────────────── */
// Sourced from the Hebrew record of Israeli players in the competition. The
// season is the campaign the appearance belongs to.
const ABROAD = [
  { name: 'חיים רביבו',        club: 'פנרבחצ\'ה',          season: '2001/02', note: 'הישראלי הראשון בשלב הבתים, וכבש מול באייר לוורקוזן' },
  { name: 'קלמי סבן',          club: 'סטיאווה בוקרשט',     season: '2006/07' },
  { name: 'יוסי בניון',        club: 'ליברפול',            season: '2007/08', note: 'ואחר כך צ\'לסי - כולל ניצחון על ריאל מדריד בברנבאו' },
  { name: 'ביברס נאתכו',       club: 'רובין קאזאן',        season: '2010/11', note: 'ושוב עם צסק"א מוסקבה ב-2014/15 ו-2015/16' },
  { name: 'אליניב ברדה',       club: 'ראסינג גנק',         season: '2011/12' },
  { name: 'בירם כיאל',         club: 'סלטיק',              season: '2012/13' },
  { name: 'ניר ביטון',         club: 'סלטיק',              season: '2013/14' },
  { name: 'דודו ביטון',        club: 'מריבור',             season: '2014/15' },
  { name: 'סינטאיהו סלליך',    club: 'מריבור',             season: '2014/15' },
  { name: 'רמי גרשון',         club: 'גנט',                season: '2015/16' },
  { name: 'קני סייף',          club: 'גנט',                season: '2015/16' },
  { name: 'מרואן קבהא',        club: 'מריבור',             season: '2017/18' },
  { name: 'מנור סולומון',      club: 'שחטאר דונייצק',      season: '2020/21' },
  { name: 'עמרי גלזר',        club: 'הכוכב האדום בלגרד',  season: '2023/24', note: 'שיא הצלות למשחק - 13 מול מנצ\'סטר סיטי' },
  { name: 'אוסקר גלוך',        club: 'רד בול זלצבורג',     season: '2023/24', note: 'הישראלי הצעיר אי פעם שכבש בליגת האלופות' },
  { name: 'סתיו למקין',        club: 'שחטאר דונייצק',      season: '2023/24' },
  { name: 'דניאל פרץ',         club: 'באיירן מינכן',       season: '2023/24' },
  { name: 'ליאל עבדה',         club: 'סלטיק',              season: '2023/24' },
  // תאי אבד (פ.ס.וו 2023/24) is deliberately absent: he left Maccabi Haifa's
  // academy for Eindhoven without playing a Ligat ha'Al match, so he is in no
  // squad we hold and there is nobody here to tag.
];

/* ── build ────────────────────────────────────────────────────────────────── */
const allNames = new Set();
SQUADS.forEach(sq => sq.players.forEach(p => allNames.add(p.name)));

// One row per player, however many campaigns he played. `kinds` keeps both
// sources when a player has both — Biram Kayal was at Maccabi Haifa in 2009/10
// AND at Celtic later, and counting him as only one of those undersells the
// record and misreports the totals.
const rows = new Map();
function add(name, kind, club, season, note) {
  const cur = rows.get(name);
  if (cur) {
    cur.caps++;
    cur.kinds.add(kind);
    // The foreign appearance is the rarer fact, so it wins the club/season shown
    // — and the note has to travel with it, or a row reads "Genk 2011/12" beside
    // a note about beating Manchester United with Maccabi Haifa.
    if (kind === 'abroad') { cur.club = club; cur.season = season; cur.note = note || ''; }
    return;
  }
  rows.set(name, { name, kinds: new Set([kind]), club, season, note: note || '', caps: 1 });
}
const isKind = (r, k) => r.kinds.has(k);

for (const c of IL_CAMPAIGNS) {
  const sq = SQUADS.find(s => s.teamId === c.teamId && s.season === c.season);
  if (!sq) { console.error(`MISSING SQUAD: ${c.teamId} ${c.season}`); continue; }
  const club = (TEAMS[c.teamId] || {}).name || c.teamId;
  sq.players.forEach(p => add(p.name, 'il', club, c.season, c.note));
}

const unmatched = [];
for (const a of ABROAD) {
  if (!allNames.has(a.name)) { unmatched.push(a); continue; }
  add(a.name, 'abroad', a.club, a.season, a.note);
}

/* ── report before writing ────────────────────────────────────────────────── */
console.log(`Israeli group-stage campaigns: ${IL_CAMPAIGNS.length}`);
console.log(`players from those squads:     ${[...rows.values()].filter(r => isKind(r, 'il')).length}`);
console.log(`abroad, matched:               ${[...rows.values()].filter(r => isKind(r, 'abroad')).length} of ${ABROAD.length}`);
console.log(`both (Israeli campaign AND abroad): ${[...rows.values()].filter(r => r.kinds.size > 1).length}`);
console.log(`TOTAL tagged:                  ${rows.size}`);

if (unmatched.length) {
  console.log('\nNOT IN THE DATA — dropped, not invented:');
  for (const u of unmatched) {
    // offer the closest names we do have, so a spelling difference is obvious
    const near = [...allNames]
      .map(n => ({ n, d: overlap(n, u.name) }))
      .sort((a, b) => b.d - a.d).slice(0, 3)
      .filter(x => x.d > 0.4).map(x => x.n);
    console.log(`  ${u.name} (${u.club} ${u.season})${near.length ? '  — did you mean: ' + near.join(' / ') : ''}`);
  }
}

// crude bigram overlap, only ever used to suggest a spelling
function overlap(a, b) {
  const g = s => new Set([...s].slice(0, -1).map((_, i) => s.slice(i, i + 2)));
  const A = g(a), B = g(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  A.forEach(x => { if (B.has(x)) hit++; });
  return hit / Math.max(A.size, B.size);
}

/* ── write ────────────────────────────────────────────────────────────────── */
const kindOf = r => (isKind(r, 'abroad') ? (isKind(r, 'il') ? 'both' : 'abroad') : 'il');
const list = [...rows.values()].sort((a, b) =>
  kindOf(a).localeCompare(kindOf(b)) || a.name.localeCompare(b.name, 'he'));
const q = s => `"${String(s).replace(/"/g, '""')}"`;

fs.writeFileSync(path.join(ROOT, 'europe_caps.csv'),
  '﻿name,kind,club,season,campaigns,note\n' +
  list.map(r => [q(r.name), kindOf(r), q(r.club), q(r.season), r.caps, q(r.note)].join(',')).join('\n') + '\n',
  'utf8');

fs.writeFileSync(path.join(ROOT, 'js/eu-caps-data.js'),
  `// GENERATED by scripts/build_europe_caps.js — do not edit by hand.\n` +
  `//\n` +
  `// Players who have actually appeared in the Champions League: every squad from\n` +
  `// the six Israeli group-stage campaigns, plus the Israelis who played it for a\n` +
  `// foreign club. Used by the European night in js/europe.js — see docs/EUROPE.md.\n` +
  `//\n` +
  `// ${list.filter(r => isKind(r, 'il')).length} from Israeli campaigns · ` +
  `${list.filter(r => isKind(r, 'abroad')).length} from abroad · ` +
  `${list.filter(r => r.kinds.size > 1).length} both · ${list.length} players in total.\n` +
  `const EU_CAPS = {\n` +
  list.map(r => `  ${JSON.stringify(r.name)}: ${JSON.stringify({ k: kindOf(r), c: r.club, s: r.season })},`).join('\n') +
  `\n};\n`,
  'utf8');

console.log('\nwrote europe_caps.csv and js/eu-caps-data.js');
