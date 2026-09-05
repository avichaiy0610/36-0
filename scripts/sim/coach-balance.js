// scripts/sim/coach-balance.js
//
// Proves the claim the whole feature rests on: a manager changes the CHARACTER
// of a season and not the odds of winning it. Runs the real engine — the same
// game.js the browser loads — with a manager appointed on `state`, and compares
// every archetype against no manager at all.
//
// Two things are measured separately on purpose, because they are two different
// promises:
//   1. THE STYLE must be neutral. Measured with the trophy edge forced to zero,
//      so what is left is only tempo, clean sheets, form and venue. Any archetype
//      that moves the points here is a bug and gets fixed, not explained.
//   2. THE EDGE is a deliberate, bounded advantage — what a manager's trophies
//      are worth, on the same lever and ceiling as the serial-winner tag. It is
//      REPORTED rather than gated, so its price is on the record.
//
// Usage: node scripts/sim/coach-balance.js [seasonsPerCell] [--tune]
//
// --tune SOLVES for the price instead of checking it: it measures each style
// with its compensation set to zero, measures what one rating point is worth at
// that squad rating, and prints the `comp` to paste into COACH_ARCH.
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

// coach.js publishes onto `window`, which in the browser makes the names global.
// Here `window` is a plain stub, so the names are lifted into the bundle's own
// scope right after it loads — that is what lets game.js call them bare, exactly
// as it does in the page.
const LIFT = `
var coachActive = window.coachActive, coachEdge = window.coachEdge,
    coachSimMods = window.coachSimMods, coachFormMult = window.coachFormMult,
    coachCleanMult = window.coachCleanMult, coachGoalMult = window.coachGoalMult,
    coachEligible = window.coachEligible, coachDraw = window.coachDraw,
    coachRecord = window.coachRecord, COACH_ARCH = window.COACH_ARCH,
    COACH_TIER = window.COACH_TIER;
`;

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const G = new Function(STUB
  + read('js/coach-data.js') + '\n'
  + read('js/coach.js') + '\n' + LIFT
  + read('js/data.js') + '\n'
  + read('js/sim-engine.js') + '\n'
  + read('js/game.js')
  + ';return { generateMatches, generateLeagueTable, simTeamsForSeason, MODERN_FORMAT,'
  + ' state, coachRecord, coachEdge, coachCleanMult, COACHES, COACH_ARCH, COACH_TIER };')();

const N    = parseInt(process.argv[2] || '3000', 10);
const TUNE = process.argv.includes('--tune');
const OVRS = [78, 84, 88];
const OPP  = G.simTeamsForSeason(2025, 13);

// One representative manager per archetype, so the run reads as real people
// rather than as keys. Tier is forced separately — the same man is measured at
// every amplitude.
const FACE = {};
for (const a of Object.keys(G.COACH_ARCH)) {
  FACE[a] = G.COACHES.find(c => c.arch === a).name;
}

// Appoint a manager for the next batch of seasons.
//   'style'  — the style alone: no trophy edge, and no price either. This is the
//              raw damage a lever does, and what --tune solves against.
//   'priced' — the style with its measured price paid, but still no trophies.
//              This is the promise the feature makes and the acceptance gate.
//   'full'   — everything, exactly as a player would get it.
function appoint(arch, tier, mode) {
  if (!arch) { G.state.coach = null; return 0; }
  const c = G.COACHES.find(x => x.name === FACE[arch]);
  G.state.coach = { name: c.name, style: c.style, arch, tier, settling: false };
  const amp   = G.COACH_TIER[tier].amp;
  const price = (G.COACH_ARCH[arch].comp || 0) * amp;
  if (mode === 'style')  return G.coachEdge() - G.COACH_TIER[tier].edge - price;
  if (mode === 'priced') return G.coachEdge() - G.COACH_TIER[tier].edge;
  return G.coachEdge();
}

function measure(ovr, arch, tier, mode) {
  const edge = appoint(arch, tier, mode);
  const cs   = arch ? G.coachCleanMult() : 1;
  let pts = 0, pts2 = 0, gf = 0, ga = 0, titles = 0, clean = 0, hPts = 0, aPts = 0, hN = 0, aN = 0;
  for (let s = 0; s < N; s++) {
    // Mirrors myLineRatings: the edge rides the four lines, the clean-sheet
    // multiplier rides `cs`, and everything else reaches the season through the
    // engine seams while it runs.
    const me = { ovr, atk: ovr + edge, mid: ovr + edge, def: ovr + edge, gk: ovr + edge, cs };
    const g = G.generateMatches(me, OPP, G.MODERN_FORMAT, 2);
    let w = 0, d = 0;
    for (const m of g.matches) {
      gf += m.gf; ga += m.ga;
      if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++;
      if (m.ga === 0) clean++;
      const p1 = m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0;
      if (m.home) { hPts += p1; hN++; } else { aPts += p1; aN++; }
    }
    const l = g.matches.length - w - d;
    const p = w * 3 + d;
    pts += p; pts2 += p * p;
    const table = G.generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents);
    if (table.findIndex(t => t.us) === 0) titles++;
  }
  const mean = pts / N;
  return { pts: mean, sd: Math.sqrt(Math.max(0, pts2 / N - mean * mean)),
           gf: gf / N, ga: ga / N, title: titles / N * 100, clean: clean / N,
           homeEdge: (hN && aN) ? (hPts / hN - aPts / aN) : 0 };
}

const f1 = n => n.toFixed(1), f2 = n => n.toFixed(2);
const sgn = n => (n >= 0 ? '+' : '') + f1(n);
const row = (label, r, base) => {
  const d = base ? sgn(r.pts - base.pts) : '   —';
  const t = base ? sgn(r.title - base.title) : '   —';
  return `${label.padEnd(20)} ${f1(r.pts).padStart(5)} ${d.padStart(6)}` +
         `  ${f1(r.title).padStart(5)}% ${t.padStart(6)}` +
         `  ${(f1(r.gf) + ':' + f1(r.ga)).padStart(11)}  ${f1(r.clean).padStart(4)}  ${f1(r.homeEdge).padStart(5)}`;
};
const HEAD = 'manager                pts     Δ  title      Δ       goals    cs  home';

console.log(`${N.toLocaleString()} seasons per cell · engine 2 · the real generateMatches\n`);

/* ── --tune: solve for the price rather than check it ─────────────────────────
 * One rating point is worth a different number of points at every squad rating,
 * so the price cannot be reasoned about in the abstract — it is measured. For
 * each archetype: how far the raw style moves the season, and what a rating
 * point buys right there. The quotient is the compensation, averaged over the
 * three ratings because one number has to serve all of them.
 */
if (TUNE) {
  console.log('── solving for comp (style with no price, no trophies) ──\n');
  const slope = {}, base = {};
  for (const ovr of OVRS) {
    base[ovr] = measure(ovr, null, null, 'style');
    G.state.coach = null;
    // What one rating point is worth here: a squad half a point better, halved back.
    let pts = 0;
    for (let s = 0; s < N; s++) {
      const o = ovr + 0.5;
      const g = G.generateMatches({ ovr, atk: o, mid: o, def: o, gk: o, cs: 1 }, OPP, G.MODERN_FORMAT, 2);
      let w = 0, d = 0;
      for (const m of g.matches) { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; }
      pts += w * 3 + d;
    }
    slope[ovr] = (pts / N - base[ovr].pts) / 0.5;
    console.log(`OVR ${ovr}: no manager ${f1(base[ovr].pts)} pts · one rating point = ${f2(slope[ovr])} pts`);
  }
  console.log('');
  for (const arch of Object.keys(G.COACH_ARCH)) {
    const dmg = [];
    for (const ovr of OVRS) {
      const r = measure(ovr, arch, 'winner', 'style');
      dmg.push(r.pts - base[ovr].pts);
      console.log(`${arch.padEnd(8)} OVR ${ovr}: Δ${sgn(dmg[dmg.length - 1])} pts`);
    }
    // The damage is not a straight line in the squad rating — a lower tempo is
    // shelter for a weak side and a tax on a strong one, so it can even change
    // SIGN across the range. Averaging the three corrections would then fix the
    // middle and make the ends worse, so the search minimises the WORST cell
    // instead: the number that leaves no squad rating badly served.
    let best = 0, bestWorst = Infinity;
    for (let c = -1.5; c <= 1.5; c += 0.01) {
      const worst = Math.max(...OVRS.map((o, i) => Math.abs(dmg[i] + c * slope[o])));
      if (worst < bestWorst) { bestWorst = worst; best = c; }
    }
    console.log(`${arch.padEnd(8)} → comp: ${f2(best)}   (worst cell then ${f2(bestWorst)} pts)\n`);
  }
  process.exit(0);
}

/* ── the gate: every style, priced, against no manager at all ─────────────── */
let worstPts = 0, worstTitle = 0;
const cell = {};
for (const ovr of OVRS) {
  const base = measure(ovr, null, null, 'priced');
  console.log(`── OVR ${ovr} ──   the style with its price paid, no trophies`);
  console.log(HEAD);
  console.log(row('no manager', base, null));
  cell[`base|${ovr}`] = base;
  for (const arch of Object.keys(G.COACH_ARCH)) {
    for (const tier of ['winner', 'legend']) {
      const r = measure(ovr, arch, tier, 'priced');
      console.log(row(`${arch} · ${tier}`, r, base));
      worstPts   = Math.max(worstPts,   Math.abs(r.pts - base.pts));
      worstTitle = Math.max(worstTitle, Math.abs(r.title - base.title));
      cell[`${arch}|${ovr}|${tier}`] = r;
    }
  }
  console.log('');
}

// The trophies, priced. This one is NOT a gate — it is the advantage the owner
// asked for, and the number is here so it can never be quietly larger than the
// half rating point it is supposed to be.
console.log('── what the trophies are worth, at the top tier ──');
for (const ovr of OVRS) {
  const full  = measure(ovr, 'grit', 'legend', 'full');
  const plain = measure(ovr, 'grit', 'legend', 'priced');
  console.log(`OVR ${ovr}: ${sgn(full.pts - plain.pts)} pts · ${sgn(full.title - plain.title)}pp of title chance`);
}

/* ── the gate needs enough seasons to mean anything ───────────────────────────
 * A season's points have an SD near 7, so at 1,200 seasons a cell's mean carries
 * an SE of ~0.2 and a DIFFERENCE of two of them ~0.29 — and the statistic being
 * graded is the worst of thirty-six such differences, which overshoots by a
 * couple of SE as a matter of course. A short run therefore goes red on numbers
 * a long one passes comfortably (1.64 at 1,200 against 1.33 at 5,000), and a
 * gate that cries wolf is a gate somebody eventually edits down. So a short run
 * prints the table and declines to grade it.
 */
const MIN_N = 3000;
if (N < MIN_N) {
  console.log(`
-- not graded --
${N.toLocaleString()} seasons per cell is too few to judge a `
    + `1.5-point threshold: the noise alone is worth about half of it. Re-run with ${MIN_N} or more.`);
  process.exit(0);
}

console.log('\n── acceptance ──');
const at = (arch, ovr, tier) => cell[`${arch}|${ovr}|${tier}`];
const goals = r => r.gf + r.ga;
const goalGap = Math.abs(goals(at('grit', 88, 'legend')) - goals(at('press', 88, 'legend')));
const cleanGain = at('grit', 88, 'legend').clean / cell['base|88'].clean;
const homeGain  = at('spirit', 88, 'legend').homeEdge - cell['base|88'].homeEdge;
const check = (name, ok, got) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(48)} ${got}`); return ok; };
let pass = true;
pass = check('a style moves points by less than 1.5', worstPts < 1.5, `worst ${f2(worstPts)}`) && pass;
pass = check('a style moves title chance by less than 3.5pp', worstTitle < 3.5, `worst ${f2(worstTitle)}pp`) && pass;
pass = check('grit and press differ by more than 15 goals', goalGap > 15, `${f1(goalGap)} goals`) && pass;
pass = check('grit keeps 25% more clean sheets', cleanGain > 1.25, `${f2(cleanGain)}x`) && pass;
pass = check('spirit adds 0.10 ppg at home over away', homeGain > 0.10, `${f2(homeGain)} ppg`) && pass;
if (!pass) { console.log('\nA failing row is a number to FIX, not to edit down.'); process.exit(1); }
