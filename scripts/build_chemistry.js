// Chemistry pairs — the duos the game will actually reward.
//
// A pair counts when two players were in the same club's squad in the same
// season, and the bar is their CAREER PEAK rather than the rating they happened
// to hold that year: one of the two must have peaked at 87+, the other at 82+.
//
// Three rules shape the list, all of them football rather than arithmetic:
//
//   LINES — chemistry is between men who played near each other. A keeper links
//   with his back line and nobody else; defenders with defenders or the midfield
//   in front of them; midfielders with each other or the attack ahead. A keeper
//   and a striker never shared a moment on the pitch, and two keepers never
//   played at the same time at all.
//
//   FAME IS WHAT THEY WON — not what they were rated. A pair that lifted the
//   title together is remembered; two nines who overlapped for a quiet season
//   are not. Titles come from the real final tables in js/league_tables.js.
//
//   TIME — everything else being equal, years side by side are the measure.
//
// Aggregated per PAIR, not per pair-and-club: two men who were teammates at two
// clubs have more history together, not less.
//
//   node scripts/build_chemistry.js [minSeasons] > chemistry_duos.csv
const PP = require('./player_pages.js');
const fs = require('fs');
const path = require('path');

const MIN_SEASONS = +(process.argv[2] || 2);
const PEAK_STAR   = 87;
const PEAK_MATE   = 82;
const SQUAD_DEPTH = 20;

const { SQUADS } = PP.load();
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const TEAMS = new Function(R('js/data.js') + '\n;return TEAMS;')();
const LEAGUE_TABLES = new Function(R('js/league_tables.js') + '\n;return LEAGUE_TABLES;')();

// champion per season, from the real post-playoff tables
const champOf = {};
for (const season of Object.keys(LEAGUE_TABLES)) {
  const first = (LEAGUE_TABLES[season] || []).find(r => r.pos === 1);
  if (first) champOf[season] = first.teamId;
}

const clean = n => String(n).replace(/[‎‏]/g, '').trim();

/* ── lines ────────────────────────────────────────────────────────────────── */
const LINE = {
  GK: 'GK',
  CB: 'DEF', RB: 'DEF', LB: 'DEF', RWB: 'DEF', LWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID',
  RW: 'ATT', LW: 'ATT', ST: 'ATT', CF: 'ATT', SS: 'ATT',
};
// who can be a pair with whom: same line, or the line next door
const LINK_OK = {
  GK:  { DEF: true },                          // never GK+GK — they never play together
  DEF: { GK: true, DEF: true, MID: true },
  MID: { DEF: true, MID: true, ATT: true },
  ATT: { MID: true, ATT: true },
};

const peak = new Map(), posCount = new Map();
for (const sq of SQUADS) {
  for (const p of sq.players) {
    const n = clean(p.name);
    peak.set(n, Math.max(peak.get(n) || 0, p.ovr));
    const byPos = posCount.get(n) || {};
    byPos[p.position] = (byPos[p.position] || 0) + 1;
    posCount.set(n, byPos);
  }
}
const mainPos = n => {
  const byPos = posCount.get(n) || {};
  return Object.keys(byPos).sort((a, b) => byPos[b] - byPos[a])[0] || '';
};
const lineOf = n => LINE[mainPos(n)] || 'MID';

/* ── pairs ────────────────────────────────────────────────────────────────── */
const pairs = new Map();
for (const sq of SQUADS) {
  const players = sq.players.map(p => ({ ...p, name: clean(p.name) }))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, SQUAD_DEPTH);
  const wonThisYear = champOf[sq.season] === sq.teamId;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const [a, b] = [players[i].name, players[j].name].sort((x, y) => x.localeCompare(y, 'he'));
      const pa = peak.get(a) || 0, pb = peak.get(b) || 0;
      if (Math.max(pa, pb) < PEAK_STAR || Math.min(pa, pb) < PEAK_MATE) continue;
      if (!(LINK_OK[lineOf(a)] || {})[lineOf(b)]) continue;      // too far apart on the pitch
      const key = a + '|' + b;
      const rec = pairs.get(key) || { a, b, seasons: new Set(), clubs: new Set(), titles: 0 };
      rec.seasons.add(sq.season);
      rec.clubs.add(sq.teamId);
      if (wonThisYear) rec.titles++;
      pairs.set(key, rec);
    }
  }
}

/* ── how strong a link is ─────────────────────────────────────────────────── */
// Years give the base; what they WON overrides it. One title together is a pair
// people remember; two or more is the pair they name in the same breath.
// Glory only counts alongside time. Every champion squad has twenty men in it,
// so a single shared title mints two hundred "famous" pairs — which is how a
// definition of fame stops meaning anything. A pair is remembered when they won
// together AND stayed together.
function tierOf(seasons, titles) {
  if (seasons >= 7 || (seasons >= 4 && titles >= 2)) return 3;
  if (seasons >= 4 || (seasons >= 3 && titles >= 1)) return 2;
  return 1;
}

const rows = [...pairs.values()]
  .map(p => {
    const n = p.seasons.size;
    const pa = peak.get(p.a), pb = peak.get(p.b);
    const tier = tierOf(n, p.titles);
    return { ...p, n, pa, pb, tier, score: tier * 100 + p.titles * 12 + n * 4 + Math.min(pa, pb) };
  })
  // a record of a duo: four seasons together, or a title together, or a short
  // spell in which BOTH were stars
  .filter(p => p.n >= MIN_SEASONS &&
    (p.n >= 4                                        // years side by side
     || (p.n >= 3 && p.titles >= 1)                  // or a title, with time
     || Math.min(p.pa, p.pb) >= PEAK_STAR))          // or two stars, however brief
  .sort((x, y) => y.score - x.score);

const esc = v => `"${String(v).replace(/"/g, '""')}"`;
const out = [['keep', 'player_a', 'peak_a', 'pos_a', 'player_b', 'peak_b', 'pos_b',
              'line', 'seasons_together', 'titles_together', 'tier', 'bonus',
              'clubs', 'seasons', 'note'].join(',')];
rows.forEach(p => out.push([
  'y',
  esc(p.a), p.pa, esc(mainPos(p.a)),
  esc(p.b), p.pb, esc(mainPos(p.b)),
  esc(lineOf(p.a) + '-' + lineOf(p.b)),
  p.n,
  p.titles,
  p.tier,
  '+' + p.tier,
  esc([...p.clubs].map(c => (TEAMS[c] || {}).name || c).join(' · ')),
  esc([...p.seasons].sort().join(' ')),
  '',
].join(',')));

process.stdout.write('﻿' + out.join('\n') + '\n');
const t = n => rows.filter(r => r.tier === n).length;
console.error(`pairs: ${rows.length} · tier3: ${t(3)} · tier2: ${t(2)} · tier1: ${t(1)}` +
              ` · with a title together: ${rows.filter(r => r.titles > 0).length}`);
