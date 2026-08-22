// Which players actually earn the tags marked "ready" in tags_catalog.csv.
//
// "ready" means the rule needs nothing we do not already have — no age, no
// appearances, no hand-tagging. This script is the proof: it runs all ten rules
// over the real data and writes tags_players.csv, one row per (tag, player).
//
// Run: node scripts/build_tags.js  [--print]
const fs = require('fs');
const path = require('path');

const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const env = new Function(
  R('js/data.js') + '\n' + R('js/league_tables.js') + '\n' + R('js/player_nats.js') +
  ';return { SQUADS, TEAMS, LEAGUE_TABLES, LEAGUE_SCORERS, LEAGUE_ASSISTS, PLAYER_NATS };')();
const { SQUADS, TEAMS, LEAGUE_TABLES, LEAGUE_SCORERS, LEAGUE_ASSISTS, PLAYER_NATS } = env;

const heb = id => (TEAMS[id] || {}).name || id;

// ── one pass over every squad, indexed by player name ────────────────────────
// A player is a NAME here, the same key the rest of the game uses. Two men who
// share a name would merge; nothing in the data suggests that happens, and the
// draft already treats the name as the identity.
const players = new Map();          // name → { seasons:Set, byTeam:Map<teamId,Set<season>>, best, peakGap }
for (const sq of SQUADS) {
  for (const p of sq.players) {
    let e = players.get(p.name);
    if (!e) players.set(p.name, e = { name: p.name, seasons: new Set(), byTeam: new Map(), best: 0, peakGap: 0 });
    e.seasons.add(sq.season);
    if (!e.byTeam.has(sq.teamId)) e.byTeam.set(sq.teamId, new Set());
    e.byTeam.get(sq.teamId).add(sq.season);
    e.best = Math.max(e.best, p.ovr);
    e.peakGap = Math.max(e.peakGap, (p.peak_ovr ?? p.ovr) - p.ovr);
  }
}

const yr = s => parseInt(s, 10);
const sorted = set => [...set].sort((a, b) => yr(a) - yr(b));

// ── the ten rules ────────────────────────────────────────────────────────────
const tags = {};
const add = (key, name, detail) => (tags[key] = tags[key] || []).push({ name, detail });

// A league scoring/assist title, but only counted when the man is in our data at
// all — the tables list every scorer in the division, most of whom we never
// carried as a player.
for (const [table, key] of [[LEAGUE_SCORERS, 'goal_king'], [LEAGUE_ASSISTS, 'assist_king']]) {
  for (const season of Object.keys(table)) {
    for (const row of table[season]) {
      if (row.r !== 1 || !players.has(row.name)) continue;
      add(key, row.name, `${season} · ${row.n} · ${heb(row.teamId)}`);
    }
  }
}

for (const e of players.values()) {
  if (e.byTeam.size === 1 && e.seasons.size >= 3) {
    const [id] = [...e.byTeam.keys()];
    add('one_club', e.name, `${heb(id)} · ${e.seasons.size} עונות`);
  }
  for (const [id, seasons] of e.byTeam) {
    if (seasons.size >= 7) add('club_legend', e.name, `${heb(id)} · ${seasons.size} עונות`);
  }
  if (e.byTeam.size >= 5) {
    add('journeyman', e.name, `${e.byTeam.size} מועדונים · ${[...e.byTeam.keys()].map(heb).join(', ')}`);
  }
  if (e.seasons.size >= 12) add('veteran', e.name, `${e.seasons.size} עונות`);
  if (e.peakGap >= 8) add('peak_gap', e.name, `פער שיא ${e.peakGap}`);

  // Two spells at one club with a gap in between. Our seasons are sparse — a
  // club-season only exists if we carried it — so "non-consecutive" is measured
  // against the seasons that club actually has, not against the calendar.
  for (const [id, seasons] of e.byTeam) {
    const mine = sorted(seasons).map(yr);
    const clubYears = sorted(new Set(SQUADS.filter(s => s.teamId === id).map(s => s.season))).map(yr);
    const gapped = mine.some((y, i) => {
      if (i === 0) return false;
      const prev = mine[i - 1];
      // a club-season we hold for this club, between two of his, that he is not in
      return clubYears.some(c => c > prev && c < y);
    });
    if (gapped) add('comeback', e.name, `${heb(id)} · ${sorted(seasons).join(', ')}`);
  }
}

// Foreign-born and genuinely good. The nationality list is ordered, so [0] is
// the primary one; a player who also holds Israeli nationality still counts as
// an import if he was not Israeli first.
for (const e of players.values()) {
  const nats = PLAYER_NATS[e.name];
  if (!nats || !nats.length || nats[0] === 'ישראל') continue;
  if (e.best >= 85) add('import_star', e.name, `${nats[0]} · שיא ${e.best}`);
}

// In the title-winning squad three times or more.
const champions = new Map();        // season → teamId
for (const season of Object.keys(LEAGUE_TABLES)) {
  const first = LEAGUE_TABLES[season].find(r => r.pos === 1);
  if (first) champions.set(season, first.teamId);
}
const titles = new Map();
for (const sq of SQUADS) {
  if (champions.get(sq.season) !== sq.teamId) continue;
  for (const p of sq.players) {
    if (!titles.has(p.name)) titles.set(p.name, []);
    titles.get(p.name).push(`${heb(sq.teamId)} ${sq.season}`);
  }
}
for (const [name, list] of titles) if (list.length >= 3) add('dynasty', name, list.join(' · '));

// ── output ───────────────────────────────────────────────────────────────────
const ORDER = ['goal_king', 'assist_king', 'one_club', 'club_legend', 'journeyman',
               'veteran', 'peak_gap', 'import_star', 'comeback', 'dynasty'];
const rows = [['tag_key', 'player', 'detail']];
for (const key of ORDER) {
  const list = tags[key] || [];
  // one line per player per tag; a man can win the boot twice, so merge details
  const byName = new Map();
  for (const r of list) {
    if (!byName.has(r.name)) byName.set(r.name, []);
    byName.get(r.name).push(r.detail);
  }
  for (const [name, details] of byName) rows.push([key, name, details.join(' | ')]);
}
const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'tags_players.csv'), '﻿' + csv, 'utf8');

console.log(`שחקנים ייחודיים בדאטה: ${players.size}`);
for (const key of ORDER) {
  const n = new Set((tags[key] || []).map(r => r.name)).size;
  console.log(`  ${key.padEnd(13)} ${String(n).padStart(4)} שחקנים`);
}
const tagged = new Set(rows.slice(1).map(r => r[1]));
console.log(`סה"כ שחקנים שקיבלו לפחות תגית אחת: ${tagged.size} (${(100 * tagged.size / players.size).toFixed(0)}%)`);
console.log('נכתב: tags_players.csv');

if (process.argv.includes('--print')) {
  for (const key of ORDER) {
    const byName = new Map();
    for (const r of (tags[key] || [])) byName.set(r.name, r.detail);
    console.log(`\n── ${key} (${byName.size}) ──`);
    [...byName].slice(0, 12).forEach(([n, d]) => console.log(`   ${n} — ${d}`));
    if (byName.size > 12) console.log(`   ... ועוד ${byName.size - 12}`);
  }
}
