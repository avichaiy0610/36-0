// scripts/sim/calibrate.js
// Measures the acceptance table in the design spec against the REAL engine.
// Re-run after any squad-data update: the 36-0 rate is steep in OVR and will
// drift. Usage: node scripts/sim/calibrate.js [seasonsPerRow]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const STUB = `
const document = { addEventListener(){}, getElementById(){ return null; },
  querySelectorAll(){ return []; },
  createElement(){ return { style:{}, classList:{ add(){}, remove(){} } }; } };
const window = {}; const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const getCurrentUser = () => null; const _supabase = { rpc(){ return Promise.resolve(); } };
`;
const G = new Function(STUB
  + fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + '\n'
  + fs.readFileSync(path.join(ROOT, 'js/sim-engine.js'), 'utf8') + '\n'
  + fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8')
  + ';return { generateMatches, simTeamsForSeason, MODERN_FORMAT, SIM_ENGINE_CURRENT };')();

const N = parseInt(process.argv[2] || '50000', 10);
const OPP = G.simTeamsForSeason(2025, 13);
const bal = o => ({ ovr: o, atk: o, mid: o, def: o, gk: o });

function measure(me, n) {
  let wins = 0, pts = 0, gf = 0, ga = 0, perfect = 0;
  for (let s = 0; s < n; s++) {
    const g = G.generateMatches(me, OPP, G.MODERN_FORMAT, 2);
    let w = 0, d = 0;
    g.matches.forEach(m => { gf += m.gf; ga += m.ga;
      if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    wins += w; pts += w * 3 + d;
    if (g.matches.length === 36 && w === 36) perfect++;
  }
  return { w: wins / n, pts: pts / n, gf: gf / n, ga: ga / n, per300: perfect / n * 300 };
}

console.log(`engine ${G.SIM_ENGINE_CURRENT} · ${N.toLocaleString()} seasons per row\n`);
console.log('OVR | wins | pts | goals |  36-0 per 300 | spec');
// Measured baseline from the REAL engine (40,000 seasons per row), not from a
// prototype. Two things shifted it since the design spec was written:
//   * The spec's original table came from a standalone harness that ran all 36
//     games against a uniform slice of the league. The real engine sends a
//     top-six side into a playoff against the five STRONGEST clubs twice each,
//     where its win rate is 0.77 rather than 0.91 — that alone moved the curve
//     right by about one rating point.
//   * The 2026-08-19 goal rebalance (BASE 1.25 to 1.45, CHANCES 3 to 5, KD 0.220
//     to 0.125). The first calibration was too stingy: a season read 74:9, which
//     both broke the server's absolute achievement thresholds and left 28% of
//     seasons at OVR 87 unbeaten. Richer scorelines and a real chance of
//     conceding cost roughly 4x on the 36-0 rate, and that was the trade taken.
//   * The 2026-08-19 variance pass. Rival clubs now have a season's form
//     (SIM2_TABLE_FORM_SD) and the player has one of his own
//     (SIM2_SEASON_FORM_SD). Before it, the closed-form table gave every rival
//     the same total every season, so the title race was settled before kickoff
//     and an OVR 88 squad could not finish below third. Fattening the tails
//     raised the 36-0 rate as a side effect, which is the direction wanted.
// Treat any DRIFT here as a real regression, not a number to edit.
const SPEC = { 84: 0.00, 85: 0.00, 86: 0.01, 87: 0.13, 88: 0.58, 89: 2.41, 90: 7.87 };
let fail = false;
for (const o of [84, 85, 86, 87, 88, 89, 90]) {
  const r = measure(bal(o), N);
  const want = SPEC[o];
  const ok = Math.abs(r.per300 - want) <= Math.max(0.6, want * 0.35);
  if (!ok) fail = true;
  console.log(`${o} | ${r.w.toFixed(1).padStart(4)} | ${r.pts.toFixed(0).padStart(3)} | `
    + `${(r.gf.toFixed(0) + ':' + r.ga.toFixed(0)).padStart(6)} | `
    + `${r.per300.toFixed(2).padStart(13)} | ${want.toFixed(2)} ${ok ? 'OK' : 'DRIFT'}`);
}

console.log('\nbuilds at OVR 88:');
const BUILDS = { attacking: [97,88,82,81], balanced: [88,88,88,88],
                 midfield: [85,96,86,86], defensive: [80,87,94,95] };
for (const [name, [atk, mid, def, gk]] of Object.entries(BUILDS)) {
  const r = measure({ ovr: 88, atk, mid, def, gk }, N);
  console.log(`  ${name.padEnd(10)} ${(r.gf.toFixed(0)+':'+r.ga.toFixed(0)).padStart(6)} `
    + `${r.pts.toFixed(0).padStart(4)} pts   36-0 ${r.per300.toFixed(2)} per 300`);
}
process.exit(fail ? 1 : 0);
