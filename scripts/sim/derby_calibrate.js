// scripts/sim/derby_calibrate.js — how hard is a derby series, measured.
//
//   node scripts/sim/derby_calibrate.js [runs=1000]
//
// The player is a bot that takes the best man who fits from each drawn season,
// with no rerolls — a sensible player, not a perfect one (real players also
// reroll and chase chemistry, so they do a little better than this). Both sides
// are auto-managed by the same rule (spec 9.5). A run = three best-of-5 series
// (rival 3, rival 2, the archrival), home/away per DERBY_GAME_HOME.
// Energy (spec §11.1) is carried through the whole run as in the game: each
// game starts from the side's energy map, both sides rest tired starters first
// (derbyRotate — the computer's rule, also the bot's), and full time writes the
// map back with +30 within a series, +60 into the next one.
// Targets (spec 9.5): normal ≈ 50% series wins averaged over all clubs (gate
// 50 ± 5); easy ≈ 65%; hard ≈ 35%. Title % (3 of 3) is reported, not gated.
// Clubs under 10% on normal are a NOTE, not a failure (rivalry choices make
// some clubs very hard). Levers: DERBY_AI weights and `look` in js/derby-data.js.
const { load } = require('./derby_test.js');
const G = load();
const N = parseInt(process.argv[2] || '1000', 10);
const F = '4-3-3';
Object.assign(G.state, { peakMode: false, classic: false, coach: null, story: null });

G.DERBY_AI.__bot = { weights: [1, 0, 0], look: 1 };   // the player bot is fixed; DERBY_AI tunes only the computer
const withE = map => e => Object.assign({}, e, { e0: map[e.player.name] ?? 100 });
const side = (d, map) => ({ picks: d.picks.map(withE(map)), bench: d.bench.map(withE(map)), slots: d.slots, tactic: 'bal' });
function run(club, diff, seed) {
  const rng = G.derbyRng(seed);
  const me = G.derbyAiDraft(club, F, '__bot', rng);
  const eMe = {};
  let won = 0;
  for (let s = 0; s < 3; s++) {
    const opp = G.derbyAiDraft(G.derbySeriesRival(club, s), F, diff, rng);
    const eOpp = {};
    const games = [];
    for (let i = 0; !G.derbySeriesStatus(games).over; i++) {
      const m = G.derbyMatchNew(side(me, eMe), side(opp, eOpp), G.DERBY_GAME_HOME[i], (seed * 31 + s * 1009 + i * 7919) | 0);
      G.derbyRotate(m.me); G.derbyRotate(m.opp);
      while (!m.over) G.derbyMatchStep(m, true);
      games.push(m);
      const rec = G.derbySeriesStatus(games).over ? G.DERBY_RECOVER_SERIES : G.DERBY_RECOVER_GAME;
      G.derbyEnergyAfter(m.me, eMe, rec); G.derbyEnergyAfter(m.opp, eOpp, rec);
    }
    if (G.derbySeriesStatus(games).won) won++;
  }
  return won;
}

const diffs = ['easy', 'normal', 'hard'];
const rows = [], avg = { easy: 0, normal: 0, hard: 0 }, t0 = Date.now();
let titleAvg = 0;
for (const club of G.derbyClubs()) {
  const row = { club };
  for (const d of diffs) {
    let sw = 0, ti = 0;
    for (let s = 1; s <= N; s++) { const w = run(club, d, s); sw += w; if (w === 3) ti++; }
    row[d] = Math.round(1000 * sw / (3 * N)) / 10;
    avg[d] += row[d];
    if (d === 'normal') { row.title = Math.round(1000 * ti / N) / 10; titleAvg += row.title; }
  }
  rows.push(row);
}
const k = rows.length;
console.table(rows);
console.log('average:', diffs.map(d => `${d} ${(avg[d] / k).toFixed(1)}%`).join(' · '), `· title on normal ${(titleAvg / k).toFixed(1)}%`);
rows.filter(r => r.normal < 10).forEach(r => console.log(`NOTE: ${r.club} wins only ${r.normal}% of series on normal`));
console.log('lowest 3 on normal:', rows.slice().sort((a, b) => a.normal - b.normal).slice(0, 3).map(r => `${r.club} ${r.normal}%`).join(', '));
console.log(`runs per cell: ${N} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const ok = Math.abs(avg.normal / k - 50) <= 5;
console.log(ok ? 'GATE: PASS' : 'GATE: FAIL — tune DERBY_AI');
process.exit(ok ? 0 : 1);
