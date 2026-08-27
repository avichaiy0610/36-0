// Tags for the league's stars (peak 87+), taken from what actually happened.
//
// Two kinds of tag can exist. This script only produces the first, because only
// the first is verifiable:
//
//   EARNED — every one of these comes from our own tables: golden boots and
//   playmaker crowns from the real season top-scorer/assist lists, titles from
//   the real final standings, longevity and loyalty from the squads themselves.
//   No judgement, no memory, no argument.
//
//   REMEMBERED — free kicks, captaincy, pace, presence. Those are real too, but
//   they are not in any table we own, so they belong in a curated list with a
//   source next to each name rather than in a script that guesses.
//
//   node scripts/build_star_tags.js > star_tags.csv
const PP = require('./player_pages.js');
const fs = require('fs');
const path = require('path');

const PEAK_STAR = 85;
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const { SQUADS } = PP.load();
const TEAMS = new Function(R('js/data.js') + '\n;return TEAMS;')();
const LT = new Function(R('js/league_tables.js') +
  '\n;return {LEAGUE_TABLES,LEAGUE_SCORERS,LEAGUE_ASSISTS};')();

const clean = n => String(n).replace(/[‎‏]/g, '').trim();

// Where two men shared a name our squads carry a suffix (רפי כהן השוער /
// רפי כהן החלוץ, the way טל בן חיים was always split). The league tables know
// nothing of that, so a table row is matched on the bare name and then on the
// club and season, which is what tells the two of them apart.
const SPLIT_SUFFIX = /\s+(?:השוער|החלוץ|הבלם|הקשר)$/;
const bare = n => clean(n).replace(SPLIT_SUFFIX, '');

/* ── who the stars are ────────────────────────────────────────────────────── */
const P = new Map();
for (const sq of SQUADS) {
  for (const p of sq.players) {
    const n = clean(p.name);
    const e = P.get(n) || { name: n, peak: 0, rows: [], clubs: new Map(), pos: {} };
    e.peak = Math.max(e.peak, p.ovr);
    e.rows.push({ season: sq.season, team: sq.teamId, ovr: p.ovr, pos: p.position });
    e.clubs.set(sq.teamId, (e.clubs.get(sq.teamId) || 0) + 1);
    e.pos[p.position] = (e.pos[p.position] || 0) + 1;
    P.set(n, e);
  }
}

/* ── what the real tables say ─────────────────────────────────────────────── */
const champOf = {};
Object.keys(LT.LEAGUE_TABLES).forEach(s => {
  const first = (LT.LEAGUE_TABLES[s] || []).find(r => r.pos === 1);
  if (first) champOf[s] = first.teamId;
});
// The club travels with the row, and it has to: two men can share a name. Rafi
// Cohen the striker scored 18 for Maccabi Haifa in 1999/00 while Rafi Cohen the
// goalkeeper was at Hapoel Petah Tikva, and matching on the name alone handed a
// keeper 31 league goals and a "double-digit scorer" tag.
const crown = (table) => {
  const out = new Map();
  Object.keys(table || {}).forEach(s => {
    (table[s] || []).filter(r => r.r === 1).forEach(r => {
      const n = bare(r.name);
      out.set(n, (out.get(n) || []).concat([{ season: s, n: r.n, team: r.teamId }]));
    });
  });
  return out;
};
// was this the man who was actually there that year?
const wasAt = (e, row) => !row.team || e.rows.some(r => r.season === row.season && r.team === row.team);
const his = (map, e) => (map.get(bare(e.name)) || []).filter(row => wasAt(e, row));
const goldenBoots = crown(LT.LEAGUE_SCORERS);
const playmakers  = crown(LT.LEAGUE_ASSISTS);

// the tightest defence of a season, from the real tables
const bestDefence = {};
Object.keys(LT.LEAGUE_TABLES).forEach(s => {
  const rows = (LT.LEAGUE_TABLES[s] || []).filter(r => typeof r.ga === 'number');
  if (!rows.length) return;
  bestDefence[s] = rows.reduce((a, b) => (b.ga < a.ga ? b : a)).teamId;
});



/* ── כדורגלן העונה — the one researched list ──────────────────────────────── */
// Typed from he.wikipedia.org/wiki/כדורגלן_העונה_בישראל and then verified below
// against our own squads: a winner who was not in that club that season is
// dropped and reported, so a typo cannot become a tag.
const POTY = [
  ['1999/00', 'שביט אלימלך', 'hapoel-tlv'],
  ['2000/01', 'יוסי בניון', 'maccabi-haifa'],
  ['2001/02', "ג'ובאני רוסו", 'maccabi-haifa'],
  ['2002/03', 'ברוך דגו', 'maccabi-tlv'],
  ['2003/04', "ניר דוידוביץ'", 'maccabi-haifa'],
  ['2004/05', 'עידן טל', 'maccabi-haifa'],
  ['2005/06', 'גוסטבו בוקולי', 'maccabi-haifa'],
  ['2006/07', 'מיכאל זנדברג', 'beitar-jerusalem'],
  ['2007/08', 'גל אלברמן', 'beitar-jerusalem'],
  ['2008/09', 'וינסנט אניימה', 'hapoel-tlv'],
  ['2009/10', 'גילי ורמוט', 'hapoel-tlv'],
  ['2010/11', 'ליאור רפאלוב', 'maccabi-haifa'],
  ['2011/12', 'אחמד סבע', 'maccabi-netanya'],
  ['2012/13', 'אלירן עטר', 'maccabi-tlv'],
  ['2013/14', 'ערן זהבי', 'maccabi-tlv'],
  ['2014/15', 'ערן זהבי', 'maccabi-tlv'],
  ['2015/16', 'אליניב ברדה', 'hapoel-beersheba'],
  ['2016/17', 'מיגל ויטור', 'hapoel-beersheba'],
  ['2017/18', 'חנן ממן', 'hapoel-haifa'],
  ['2018/19', 'דור מיכה', 'maccabi-tlv'],
  ['2019/20', 'דן גלזר', 'maccabi-tlv'],
  ['2020/21', "ג'וש כהן", 'maccabi-haifa'],
  ['2021/22', 'עומר אצילי', 'maccabi-haifa'],
  ['2022/23', 'עומר אצילי', 'maccabi-haifa'],
  ['2023/24', 'ערן זהבי', 'maccabi-tlv'],
  ['2024/25', 'דור פרץ', 'maccabi-tlv'],
  ['2025/26', 'קינגס קנגאווה', 'hapoel-beersheba'],
];
const norm = n => String(n).replace(/[‎‏]/g, '').replace(/[׳’`´']/g, "'").replace(/\s+/g, ' ').trim();


// And WHICH keeper kept those clean sheets. We have no minutes, so the first
// choice is taken to be the best-rated keeper in that squad — which the data
// makes an easy call: in 26 of the 27 seasons he is clear of the next keeper by
// two rating points or more, and usually by twenty (a first choice is 87, a
// third is the filler 65). The man who never left the bench is simply not this
// tag.
//
// Two seasons the rating cannot call, and one it calls wrongly, so they are
// answered from the record instead. Hapoel Be'er Sheva's three title defences:
// Goresh played 36 league games in 2015/16 and 21 in 2016/17 before Barak Bachar
// moved him aside in February 2017, and in 2017/18 it was Haimov — 25 games and
// 14 clean sheets against Goresh's 9 games and one.
//   sources: sports.walla.co.il/item/3053050 · sport1.maariv.co.il/.../799651
const GK_FIRST_CHOICE = {
  '2015/16': 'דודו גורש',
  '2016/17': 'דודו גורש',
  '2017/18': 'גיא חיימוב',
};
// A keeper this close to his understudy cannot be told apart by rating alone, so
// unless the record answers it, nobody is credited. A tag on the wrong man is
// worse than no tag.
const GK_CLEAR_BY = 4;

const bestDefenceKeeper = {};
const gkUnclear = [];
Object.keys(bestDefence).forEach(season => {
  const sq = SQUADS.find(x => x.season === season && x.teamId === bestDefence[season]);
  if (!sq) return;
  const gks = sq.players.filter(p => p.position === 'GK').sort((a, b) => b.ovr - a.ovr);
  if (!gks.length) return;
  const told = GK_FIRST_CHOICE[season];
  if (told) {
    const on = sq.players.some(p => norm(p.name) === norm(told));
    if (on) { bestDefenceKeeper[season] = norm(told); return; }
    gkUnclear.push(`${season}: ${told} is not in that squad`);
    return;
  }
  const gap = gks.length > 1 ? gks[0].ovr - gks[1].ovr : 99;
  if (gap < GK_CLEAR_BY) {
    gkUnclear.push(`${season} ${sq.teamId}: ${gks[0].name} ${gks[0].ovr} vs ${gks[1].name} ${gks[1].ovr}`);
    return;
  }
  bestDefenceKeeper[season] = norm(gks[0].name);
});
const potyBy = new Map();
const potyBad = [];
for (const [season, name, team] of POTY) {
  const sq = SQUADS.find(x => x.season === season && x.teamId === team);
  const ok = sq && sq.players.some(p => norm(p.name) === norm(name));
  if (!ok) { potyBad.push(`${season} ${name} (${team})`); continue; }
  potyBy.set(norm(name), (potyBy.get(norm(name)) || []).concat([season]));
}

// how many goals / assists he was credited with in a season, from the real lists
const seasonGoals = new Map(), seasonAssists = new Map();
const tally = (table, into) => Object.keys(table || {}).forEach(s =>
  (table[s] || []).forEach(r => {
    const n = bare(r.name);
    into.set(n, (into.get(n) || []).concat([{ season: s, n: r.n, team: r.teamId }]));
  }));
tally(LT.LEAGUE_SCORERS, seasonGoals);
tally(LT.LEAGUE_ASSISTS, seasonAssists);

/* ── the earned tags ──────────────────────────────────────────────────────── */
const TAGS = [
  { key: 'golden_boot', name: 'מלך שערים',    icon: '👑',
    why: 'סיים עונה כמלך השערים של הליגה',
    test: e => his(goldenBoots, e).length,
    detail: e => his(goldenBoots, e).map(x => `${x.season} (${x.n})`).join(' · ') },

  { key: 'playmaker', name: 'מלך בישולים',    icon: '🎯',
    why: 'סיים עונה כמלך הבישולים של הליגה',
    test: e => his(playmakers, e).length,
    detail: e => his(playmakers, e).map(x => `${x.season} (${x.n})`).join(' · ') },

  { key: 'serial_winner', name: 'זוכה אליפויות', icon: '🏆',
    why: 'שלוש אליפויות ומעלה',
    test: e => { const t = e.rows.filter(r => champOf[r.season] === r.team).length; return t >= 3 ? t : 0; },
    detail: e => e.rows.filter(r => champOf[r.season] === r.team).map(r => r.season).join(' ') },

  { key: 'one_club', name: 'נאמן למועדון',   icon: '❤️',
    why: 'שמונה עונות ומעלה, מועדון אחד בלבד',
    test: e => (e.clubs.size === 1 && e.rows.length >= 8) ? e.rows.length : 0,
    detail: e => (TEAMS[[...e.clubs.keys()][0]] || {}).name || '' },

  { key: 'nomad', name: 'נדד בליגה',          icon: '🎒',
    why: 'חמישה מועדונים ומעלה בליגה',
    test: e => e.clubs.size >= 5 ? e.clubs.size : 0,
    detail: e => [...e.clubs.keys()].map(c => (TEAMS[c] || {}).name || c).join(' · ') },

  { key: 'ironman', name: 'ותיק הליגה',      icon: '🗿',
    why: 'שתים-עשרה עונות ומעלה בליגה',
    test: e => e.rows.length >= 12 ? e.rows.length : 0,
    detail: e => e.rows.length + ' עונות' },

  { key: 'wall', name: 'הגנה איתנה',          icon: '🧱',
    why: 'בלם בקבוצה שספגה הכי מעט בעונה',
    test: e => {
      const line = Object.keys(e.pos).sort((a, b) => e.pos[b] - e.pos[a])[0];
      if (line !== 'CB') return 0;                 // the keeper has his own below
      return e.rows.filter(r => bestDefence[r.season] === r.team).length;
    },
    detail: e => e.rows.filter(r => bestDefence[r.season] === r.team).map(r => r.season).join(' ') },

  { key: 'gk_wall', name: 'שער נעול',          icon: '🧤',
    why: 'השוער של ההגנה שספגה הכי מעט בליגה באותה עונה',
    test: e => e.rows.filter(r => bestDefenceKeeper[r.season] === norm(e.name)).length,
    detail: e => e.rows.filter(r => bestDefenceKeeper[r.season] === norm(e.name))
                       .map(r => r.season).join(' ') },


  { key: 'poty', name: 'כדורגלן העונה',   icon: '🏅',
    why: 'נבחר לכדורגלן העונה בישראל',
    test: e => (potyBy.get(norm(e.name)) || []).length,
    detail: e => (potyBy.get(norm(e.name)) || []).join(' ') },

  { key: 'ten_goals', name: 'מבקיע דו ספרתי', icon: '⚽',
    why: 'עשרה שערים ומעלה בעונה',
    test: e => his(seasonGoals, e).filter(x => x.n >= 10).length,
    detail: e => his(seasonGoals, e).filter(x => x.n >= 10)
      .map(x => `${x.season} (${x.n})`).join(' · ') },

  { key: 'ten_assists', name: 'מבשל דו ספרתי', icon: '🅰️',
    why: 'עשרה בישולים ומעלה בעונה',
    test: e => his(seasonAssists, e).filter(x => x.n >= 10).length,
    detail: e => his(seasonAssists, e).filter(x => x.n >= 10)
      .map(x => `${x.season} (${x.n})`).join(' · ') },

  { key: 'three_decades', name: 'שלושה עשורים', icon: '🕰',
    why: 'שיחק בליגה בשלושה עשורים שונים',
    test: e => {
      const d = new Set(e.rows.map(r => Math.floor(parseInt(r.season, 10) / 10) * 10));
      return d.size >= 3 ? d.size : 0;
    },
    detail: e => [...new Set(e.rows.map(r => Math.floor(parseInt(r.season, 10) / 10) * 10))]
      .sort().map(d => "שנות ה-" + d).join(' · ') },

  { key: 'prime90', name: 'דירוג 90+',        icon: '🌟',
    why: 'דירוג שיא 90 ומעלה',
    test: e => e.peak >= 90 ? e.peak : 0,
    detail: e => 'שיא ' + e.peak },
];

/* ── output ───────────────────────────────────────────────────────────────── */
// A rating is our opinion; an honour is a fact. Anyone who was voted Footballer
// of the Season, or finished a season as the league's top scorer or top
// assister, belongs on this list whatever number we happened to give him.
function hasHonour(e) {
  return (potyBy.get(norm(e.name)) || []).length
      || his(goldenBoots, e).length
      || his(playmakers, e).length
      // keeping the league's meanest defence is an honour too, and the men who
      // did it are not always rated 85: Goresh peaks at 84, Haimov at 82.
      || e.rows.some(r => bestDefenceKeeper[r.season] === norm(e.name));
}
const stars = [...P.values()].filter(e => e.peak >= PEAK_STAR || hasHonour(e))
  .sort((a, b) => b.peak - a.peak || a.name.localeCompare(b.name, 'he'));
const belowCut = stars.filter(e => e.peak < PEAK_STAR);

const esc = v => `"${String(v).replace(/"/g, '""')}"`;
const out = [['keep', 'player', 'peak', 'pos', 'tag', 'tag_name', 'count', 'evidence'].join(',')];
let rows = 0;
for (const e of stars) {
  const mainPos = Object.keys(e.pos).sort((a, b) => e.pos[b] - e.pos[a])[0];
  for (const t of TAGS) {
    const n = t.test(e);
    if (!n) continue;
    out.push(['y', esc(e.name), e.peak, esc(mainPos), t.key, esc(t.icon + ' ' + t.name), n, esc(t.detail(e))].join(','));
    rows++;
  }
}
process.stdout.write('﻿' + out.join('\n') + '\n');
console.error(`players on the list: ${stars.length} · tag rows: ${rows}`);
if (belowCut.length) {
  console.error(`  + ${belowCut.length} in on an honour rather than a rating:`);
  belowCut.forEach(e => console.error(`      ${e.name} (${e.peak}) — ` +
    [(potyBy.get(norm(e.name)) || []).length ? 'כדורגלן העונה' : '',
     his(goldenBoots, e).length ? 'מלך שערים' : '',
     his(playmakers, e).length ? 'מלך בישולים' : ''].filter(Boolean).join(' · ')));
}
if (gkUnclear.length) console.error('  ⚠ seasons with no keeper credited (too close to call): ' + gkUnclear.join(' | '));
if (potyBad.length) console.error('  ⚠ POTY rows that did NOT verify: ' + potyBad.join(' | '));
else console.error('  ✓ all 27 Footballer of the Season winners verified against our squads');
TAGS.forEach(t => {
  const c = stars.filter(e => t.test(e)).length;
  console.error(`  ${t.icon} ${t.name.padEnd(12)} ${String(c).padStart(3)} stars — ${t.why}`);
});
