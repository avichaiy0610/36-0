// scripts/sim/golden-v1.js
// Captures deterministic V1 engine outputs. Re-run after any engine change and
// diff the JSON: any difference means an existing league/challenge/duel result
// would change for a real user. See docs/superpowers/specs/2026-08-19-line-matchup-sim-design.md
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const STUB = `
const document = { addEventListener(){}, getElementById(){ return null; },
  querySelectorAll(){ return []; },
  createElement(){ return { style:{}, classList:{ add(){}, remove(){} } }; } };
const window = {};
const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const getCurrentUser = () => null;
const _supabase = { rpc(){ return Promise.resolve(); } };
`;

// mulberry32 lives in duel.js; league-sim.js needs it. Inline the same impl so
// the harness does not have to load the whole duel UI file.
const MULBERRY = `
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
`;

function loadWithRng() {
  const src = STUB + MULBERRY
    + fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + '\n'
    + fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8') + '\n'
    + fs.readFileSync(path.join(ROOT, 'js/league-sim.js'), 'utf8') + '\n'
    + ';return { generateMatches, generateLeagueTable, simTeamsForSeason,'
    + ' IL_TEAMS_SIM, MODERN_FORMAT, SEASON_FORMATS, withSeededRandom, lgSimSeed };';
  return new Function(src)();
}

const G = loadWithRng();
const out = { seededSeasons: [], aiRatings: {}, formats: [] };

// 1. Seeded seasons — exactly how a league reveal and a challenge run recompute.
// A tiny formula drift (e.g. WINP_SLOPE off by 0.0001) only flips a match's
// outcome when that match's Math.random() draw happened to land in the thin
// band the drift moved a win/draw boundary across — empirically ~2-3% of
// (seed, ovr) pairs at this range. 8 league codes × 5 usernames + 4
// challenge/duel-style seeds = 44 seeds, × 13 OVRs spanning the real drafted
// range (70-94) = 572 independent seasons, ~20,000 matches. Verified against
// a live WINP_SLOPE 0.031→0.0311 perturbation to reliably flip >10 seasons
// (see task report) — comfortable margin above the "at least one" needed to
// catch drift from a restructured simulateMatch/generateMatches dispatcher.
const LEAGUE_CODES = ['ABCD', 'WXYZ', 'EFGH', 'QRST', 'LMNO', 'PQXY', 'KLMN', 'TUVW'];
const USERNAMES = ['avi', 'dana', 'noa', 'omer', 'shira'];
const SEEDS = [];
for (const c of LEAGUE_CODES) for (const u of USERNAMES) SEEDS.push(c + '|' + u);
SEEDS.push(
  'chal|daily|2026-08-01|sim|x', 'chal|daily|2026-08-02|sim|x',
  'chal|weekly|2026-W33|sim|y', 'duel|room123|p1',
);
const OVRS = [70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94];
for (const seed of SEEDS) {
  for (const ovr of OVRS) {
    const rec = G.withSeededRandom(G.lgSimSeed(seed + '|' + ovr), () => {
      const g = G.generateMatches(ovr);
      let w = 0, d = 0, l = 0;
      g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; else l++; });
      // Consume the same extra rand() calls a real league reveal does, in the
      // same seeded block, so the table is just as sensitive to drift as the
      // match list — this exercises code paths generateMatches alone does not.
      const table = G.generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents);
      return { n: g.matches.length, inTopSix: g.inTopSix,
               matches: g.matches.map(m => `${m.outcome}${m.gf}-${m.ga}${m.home ? 'H' : 'A'}`).join(','),
               table: table.map(r => `${r.name}:${r.pts}`).join(',') };
    });
    out.seededSeasons.push({ seed, ovr, ...rec });
  }
}

// 2. AI club ratings per season — these feed every table.
for (const y of [1999, 2005, 2012, 2020, 2025]) {
  out.aiRatings[y] = G.simTeamsForSeason(y, 13).map(t => `${t.teamId}:${t.ovr}`);
}

// 3. Every historical format still produces the right number of games.
for (const f of G.SEASON_FORMATS) {
  const g = G.withSeededRandom(4242, () => G.generateMatches(84, G.simTeamsForSeason(f.from, f.teams - 1), f));
  out.formats.push({ from: f.from, games: g.matches.length });
}

const dest = path.join(__dirname, 'golden-v1.json');
if (process.argv[2] === '--check') {
  const prev = JSON.parse(fs.readFileSync(dest, 'utf8'));
  const same = JSON.stringify(prev) === JSON.stringify(out);
  console.log(same ? 'GOLDEN OK — V1 output unchanged'
                   : 'GOLDEN MISMATCH — an existing user result would change');
  if (!same) {
    fs.writeFileSync(dest.replace('.json', '.actual.json'), JSON.stringify(out, null, 2));
    console.log('wrote golden-v1.actual.json for diffing');
  }
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log('captured', out.seededSeasons.length, 'seeded seasons,',
            Object.keys(out.aiRatings).length, 'seasons of AI ratings,',
            out.formats.length, 'formats');
