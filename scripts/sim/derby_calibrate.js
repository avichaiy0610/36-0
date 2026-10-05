// scripts/sim/derby_calibrate.js — how hard is a derby series, measured.
//
//   node scripts/sim/derby_calibrate.js [runs=1500]
//
// The player is a bot that takes the best man who fits from each drawn season,
// with no rerolls — a sensible player, not a perfect one (real players also
// reroll and chase chemistry, so they do a little better than this).
// Targets (spec §4, owner-approved): normal ≈ 40% series wins averaged over all
// clubs and no club under 10%; easy ≈ 65%; hard ≈ 20%.
// Levers: DERBY_AI weights and `look` in js/derby-data.js. Never the engine.
const { load } = require('./derby_test.js');
const G = load();
const N = parseInt(process.argv[2] || '1500', 10);
const F = '4-3-3';
const slots = G.formationSlots(F, 'bal');
Object.assign(G.state, { peakMode: false, classic: false, coach: null, story: null });

G.DERBY_AI.__bot = { weights: [1, 0, 0], look: 1 };   // the player bot is fixed; DERBY_AI tunes only the computer
function seriesWin(club, diff, seed) {
  const rng = G.derbyRng(seed);
  const me = G.derbyAiDraft(club, F, '__bot', rng);         // the bot = greedy, no rerolls; pinned, so tuning DERBY_AI.hard never changes the player
  const myLines = G.derbyLinesFor(me.picks, slots);
  const rivals = {};
  for (const id of G.DERBY_RIVALS[club]) {
    const d = G.derbyAiDraft(id, F, diff, rng);
    rivals[id] = G.derbyLinesFor(d.picks, d.slots);
  }
  const games = [];
  for (let i = 0; i < 5 && !G.derbySeriesStatus(games).over; i++) {
    const opp = rivals[G.derbyGameRival(club, i)];
    games.push(G.derbyPlayMatch(myLines, opp, G.DERBY_HOME[i], (seed * 31 + i * 7919) | 0));
  }
  return G.derbySeriesStatus(games).won;
}

const diffs = ['easy', 'normal', 'hard'];
const rows = [], avg = { easy: 0, normal: 0, hard: 0 };
for (const club of G.derbyClubs()) {
  const row = { club };
  for (const d of diffs) {
    let w = 0;
    for (let s = 1; s <= N; s++) if (seriesWin(club, d, s)) w++;
    row[d] = Math.round(1000 * w / N) / 10;
    avg[d] += row[d];
  }
  rows.push(row);
}
const k = rows.length;
console.table(rows);
console.log('average:', diffs.map(d => `${d} ${(avg[d] / k).toFixed(1)}%`).join(' · '));
const minNormal = Math.min(...rows.map(r => r.normal));
console.log(`lowest club on normal: ${minNormal}%`);
const ok = Math.abs(avg.normal / k - 40) <= 5 && minNormal >= 10;
console.log(ok ? 'GATE: PASS' : 'GATE: FAIL — tune DERBY_AI');
process.exit(ok ? 0 : 1);
