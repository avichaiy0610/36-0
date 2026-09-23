// scripts/sim/story_calibrate.js — how hard is a chapter, measured.
//
//   node scripts/sim/story_calibrate.js ks-2011 [runs=4000] [--sweep]
//
// A bot plays the chapter the way a GOOD player would: in summer it sells the
// bench for cash (never below the minimum squad) and spends on the upgrades
// that add most to the XI per shekel; in January it does the same with what is
// left, at January prices. It plays better than an average person, so the real
// mode is harder than these numbers — which is the intent (spec §7).
//
// --sweep runs the chapter at a range of budgets and prints a row per budget,
// so the budget in js/story-data.js is chosen from a table, not by feel.
const { load } = require('./story_test.js');
const G = load();

const id = process.argv[2] || 'ks-2011';
const N = parseInt(process.argv[3] || '4000', 10);
const SWEEP = process.argv.includes('--sweep');
// --detail B: at budget B, the distribution of every candidate ⭐⭐/⭐⭐⭐ metric
// among the runs that won ⭐ — so a star's condition is chosen from data.
const DETAIL = process.argv.includes('--detail');
const ch = G.storyChapter(id);
// RULES='{"buys":{"summer":2,"jan":1},"minSquad":20}' tries chapter rules before
// they are written into js/story-data.js; RB=3000 does the same for rivalBudget.
if (ch && process.env.RULES) ch.rules = JSON.parse(process.env.RULES);
if (ch && process.env.RB) ch.rivalBudget = Number(process.env.RB);
if (!ch) { console.log('no chapter ' + id); process.exit(1); }

const setUp = run => {
  Object.assign(G.state, { story: { chapterId: ch.id }, peakMode: false, classic: false,
    coach: null, oppSeason: parseInt(ch.season, 10), leagueFormat: 'authentic' });
  G.storyApplyXI(run);
};

// honor: the ⭐⭐⭐ profile — a player going for all three obeys the third star's
// rule. keepCore → never sell the real eleven; noBuyFrom → never shop there;
// maxBuys → stop signing at the limit.
const S3 = ch.stars[2] || {};
const keepOf = honor => (honor && S3.type === 'keepCore') ? new Set(G.storyCoreNames(ch)) : null;
function sellBench(run, priceOf, honor) {
  const keep = keepOf(honor);
  const xi = new Set(G.storyBestXI(G.storyOwned(run), G.formationSlots(run.formationId, run.tactic))
    .filter(Boolean).map(e => e.squad.id + '|' + e.player.name));
  const bench = G.storyOwned(run).filter(e => !xi.has(e.squad.id + '|' + e.player.name))
    .sort((a, b) => priceOf(b) - priceOf(a));
  for (const e of bench) {
    if (run.own.length <= G.storyRules(ch).minSquad) break;
    if (keep && keep.has(e.player.name)) continue;
    // Selling is by bids now: list him, take the best bid on the table.
    const bids = G.storyListPlayer(run, ch, e, priceOf(e));
    if (!bids.length) continue;
    const top = bids.reduce((a, b) => (b.amount > a.amount ? b : a));
    G.storyAcceptBid(run, top.id);
  }
}

// The XI's strength UNROUNDED. teamOVR() rounds to a whole number, so a single
// upgrade usually reads as +0 through it and the bot never bought anyone.
function xiStrength(run) {
  const xi = G.storyBestXI(G.storyOwned(run), G.formationSlots(run.formationId, run.tactic));
  return xi.filter(Boolean).reduce((s, e) => s + e.player.ovr, 0);
}

function buyUpgrades(run, priceFor, honor) {
  for (;;) {
    if (honor && S3.type === 'maxBuys' && run.bought.length >= S3.n) return;
    const base = xiStrength(run);
    let best = null;
    // Only the top of the pool can move a strong XI; checking all ~350 is wasted time.
    const cands = G.storyMarketPool(run, ch)
      .filter(e => !(honor && S3.type === 'noBuyFrom' && S3.teams.includes(e.squad.teamId)))
      .sort((a, b) => b.player.ovr - a.player.ovr).slice(0, 60);
    for (const e of cands) {
      // Buying is a negotiation now; the bot pays the asking price (a good
      // negotiator does better, so this errs towards "harder", as intended).
      const a = G.storyAsk(run, ch, e, priceFor(e));
      if (a.notForSale) continue;
      const price = a.ask;
      if (price > run.budget) continue;
      run.own.push({ squadId: e.squad.id, name: e.player.name });
      const gain = xiStrength(run) - base;
      run.own.pop();
      // Value per shekel, even under a cap on signings. "Biggest upgrade first" was
      // tried for the capped profile and did far worse (0.6% against 4.7% on KS):
      // it spends the budget on one star and has nothing left for the others.
      const score = gain / Math.max(price, 50);
      if (gain > 0 && (!best || score > best.score)) best = { e, price, score };
    }
    if (!best) return;
    const r = G.storyOffer(run, ch, best.e, priceFor(best.e), best.price);
    if (r.kind !== 'accept') return;
  }
}

// A European chapter: the campaign instead of a season. Tactics the way a
// sensible player picks them: balanced unless the tie says otherwise — attack
// when behind on aggregate, defend a lead.
function euTactic(run) {
  const round = G.storyEuRound(ch, run);
  const legs = (run.eu.cur && run.eu.cur.legs) || [];
  if (round.kind !== 'tie' || legs.length !== 1) return 'bal';
  const d = legs[0].gf - legs[0].ga;
  return d < 0 ? 'att' : d > 0 ? 'def' : 'bal';
}
function playEurope(run, honor) {
  G.storyEuStart(run);
  Object.assign(G.state, { story: { chapterId: ch.id }, peakMode: false, classic: false, coach: null });
  for (let guard = 0; guard < 40 && !G.storyEuOver(ch, run); guard++) {
    if (G.storyEuWindowDue(ch, run)) {
      run.phase = 'jan';
      const st = n => run.eu.stats[n] || null;
      sellBench(run, e => G.storyJanValue(e.player, st(e.player.name)), honor);
      buyUpgrades(run, e => G.storyValueOfOvr(e.player.ovr), honor);
      run.eu.windowDone = true;
      run.phase = 'europe';
      continue;
    }
    G.storyEuPlay(ch, run, euTactic(run));
  }
  const res = { budget: run.budget, eu: G.storyEuResult(ch, run), sold: run.sold.map(s => s.name),
                boughtTeams: run.bought.map(b => (G.SQUADS.find(s => s.id === b.squadId) || {}).teamId) };
  return G.storyStars(ch, res);
}

function playOnce(budget, seed, honor) {
  const run = G.storyNewRun(ch, seed);
  run.budget = budget;
  const summerValue = e => G.storySummerValue(e.player, ch.season);
  sellBench(run, summerValue, honor);
  buyUpgrades(run, summerValue, honor);
  if (ch.kind === 'europe') return playEurope(run, honor);

  G.storyRivalShop(run, ch, 'summer');          // the rivals move after your window
  run.phase = 'season';
  setUp(run);
  const pair = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);

  run.phase = 'jan';
  const statOf = name => pair.firstStats.find(s => s.name === name) || null;
  const janValue = e => G.storyJanValue(e.player, statOf(e.player.name));
  const before = JSON.stringify(run.own);
  sellBench(run, janValue, honor);
  buyUpgrades(run, e => G.storyValueOfOvr(e.player.ovr), honor);
  const rivalJan = G.storyRivalShop(run, ch, 'jan');
  const season = (JSON.stringify(run.own) === before && !rivalJan.length) ? pair.stay : G.storySeasonResim(pair, run, ch);

  const pts = season.matches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);
  const rank = season.leagueTable.findIndex(r => r.us) + 1;
  const stars = G.storyStars(ch, G.storyResult(run, season.leagueTable, rank, pts));
  if (!DETAIL) return stars;
  const gf = season.matches.reduce((a, m) => a + m.gf, 0), ga = season.matches.reduce((a, m) => a + m.ga, 0);
  const l = season.matches.filter(m => m.outcome === 'L').length;
  const second = season.leagueTable.filter(r => !r.us)[0];
  return { stars, rank, pts, gd: gf - ga, ga, l, margin: pts - (second.pts ?? (second.w * 3 + second.d)),
           spent: run.bought.reduce((a, b) => a + b.price, 0), nBought: run.bought.length,
           maxBought: Math.max(0, ...run.bought.map(b => G.storyResolveOvr(b))) };
}

// Two players. ⭐ and ⭐⭐ are measured on the greedy one, who sells whoever the
// XI no longer needs. ⭐⭐⭐ is measured on one who goes for all three and so never
// breaks the third star's rule — the greedy bot breaks it whenever it pays, and
// would report ⭐⭐⭐ as ~0% whatever the chapter.
function measure(budget) {
  const hit = [0, 0, 0];
  for (let i = 1; i <= N; i++) {
    const seed = i * 2654435761 >>> 0;
    const greedy = playOnce(budget, seed, null);
    const keeper = playOnce(budget, seed, true);
    if (greedy[0]) hit[0]++;
    if (greedy[1]) hit[1]++;
    if (keeper[2]) hit[2]++;
  }
  return hit.map(h => (100 * h / N).toFixed(1) + '%');
}

if (DETAIL) {
  const b = parseFloat(process.argv[process.argv.indexOf('--detail') + 1]);
  const won = [];
  for (let i = 1; i <= N; i++) { const r = playOnce(b, i * 2654435761 >>> 0, null); if (r.stars[0]) won.push(r); }
  const real = G.storyReal(ch);
  console.log(`${ch.id} budget ${b}: ⭐ in ${won.length}/${N}. real: ${real.pts} pts`);
  const q = (k, p) => { const a = won.map(r => r[k]).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };
  for (const k of ['rank', 'pts', 'margin', 'gd', 'ga', 'l', 'spent', 'nBought', 'maxBought']) {
    console.log(k.padEnd(10), [0.1, 0.25, 0.5, 0.75, 0.9].map(p => String(q(k, p)).padStart(6)).join(''));
  }
  process.exit(0);
}
console.log(`${ch.id} · ${ch.title} · level ${ch.level} · ${N} runs`);
const budgets = SWEEP ? (process.env.B ? process.env.B.split(',').map(Number) : [1000, 1500, 2000, 2500, 3000]) : [ch.budget];
for (const b of budgets) {
  const [s1, s2, s3] = measure(b);
  console.log(`budget ${String(b).padStart(3)}  ⭐ ${s1.padStart(6)}  ⭐⭐ ${s2.padStart(6)}  ⭐⭐⭐ ${s3.padStart(6)}`);
}
