// Candidate "dynamic duos" — pairs who genuinely played together, mined from
// our own squad data. Two players count as a duo when they appear in the same
// club's squad in the same season; the more seasons they shared, the stronger
// the pair. Output is a CSV for the owner to curate (keep / drop / rename).
//
//   node scripts/build_duos.js [minSeasons] > duos.csv
const PP = require('./player_pages.js');
const fs = require('fs');
const path = require('path');

const MIN_SEASONS = +(process.argv[2] || 2);   // famous partnerships are often short
// No per-club cap: capping by club buried the famous pairs behind a dynasty's
// long-serving squad players (Maccabi Haifa alone fills any cap). The bar is
// quality instead — both players must have been genuinely good together.
const MIN_OVR = 84;
const SQUAD_DEPTH  = 20;          // a squad's real contributors, not its 30th man

const { SQUADS } = PP.load();
const TEAMS = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
  '\n;return TEAMS;')();

const clean = n => String(n).replace(/[‎‏]/g, '').trim();

// pair key → { a, b, teamId, seasons:[], ovrA, ovrB }
const pairs = new Map();
for (const sq of SQUADS) {
  const players = sq.players.map(p => ({ ...p, name: clean(p.name) }))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, SQUAD_DEPTH);       // the squad's real contributors
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const [a, b] = [players[i], players[j]].sort((x, y) => x.name.localeCompare(y.name, 'he'));
      const key = sq.teamId + '|' + a.name + '|' + b.name;
      const rec = pairs.get(key) || { a: a.name, b: b.name, teamId: sq.teamId, seasons: [], peak: 0 };
      rec.seasons.push(sq.season);
      rec.peak = Math.max(rec.peak, Math.min(a.ovr, b.ovr));   // the weaker of the two
      pairs.set(key, rec);
    }
  }
}

const all = [...pairs.values()].filter(p => p.seasons.length >= MIN_SEASONS && p.peak >= MIN_OVR);

// Ranking by shared seasons alone buries the famous pairs: three seasons of two
// stars is a better duo than eight seasons of two squad players. Score blends
// the pair's weaker rating with how long they actually played together.
all.forEach(p => { p.score = p.peak + 4 * p.seasons.length; });

const rows = all.sort((x, y) => y.score - x.score);

const esc = v => `"${String(v).replace(/"/g, '""')}"`;
const out = [['keep', 'player_a', 'player_b', 'club', 'seasons_together', 'seasons', 'min_ovr', 'score', 'note'].join(',')];
rows.forEach(p => out.push([
  'y',                                        // flip to n to drop a pair
  esc(p.a), esc(p.b),
  esc((TEAMS[p.teamId] || {}).name || p.teamId),
  p.seasons.length,
  esc(p.seasons.sort().join(' ')),
  p.peak,
  p.score,
  '',                                         // free text for you
].join(',')));

process.stdout.write('﻿' + out.join('\n') + '\n');
console.error(`pairs with ${MIN_SEASONS}+ shared seasons: ${all.length} · written: ${rows.length}`);
