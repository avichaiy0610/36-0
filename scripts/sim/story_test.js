// scripts/sim/story_test.js — unit tests for מצב סיפור. No framework: node + assert.
//   node scripts/sim/story_test.js
// Loads the same bundle the browser runs (data, tables, engine, game, league-sim)
// plus the three story files, exactly like scripts/sim/golden-v1.js does.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const STUB = `
const document = { addEventListener(){}, getElementById(){ return null; },
  querySelectorAll(){ return []; }, querySelector(){ return null; },
  createElement(){ return { style:{}, classList:{ add(){}, remove(){} } }; } };
const window = {};
const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const getCurrentUser = () => null;
const _supabase = { rpc(){ return Promise.resolve(); } };
`;
const MULBERRY = `
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
`;
const FILES = ['js/data.js', 'js/league_tables.js', 'js/sim-engine.js', 'js/game.js',
  'js/league-sim.js', 'js/story-facts.js', 'js/story-data.js', 'js/story-market.js', 'js/story-season.js'];
const EXPORTS = ['state', 'SQUADS', 'LEAGUE_TABLES', 'FORMATIONS', 'formationSlots',
  'simTeamsForSeason', 'withSeededRandom', 'generateMatches', 'generateLeagueTable',
  'seasonFormat', 'myLineRatings', 'teamOVR', 'simulatePlayerStats', 'SIM_ENGINE_CURRENT',
  'STORY_RULES', 'STORY_CHAPTERS', 'storyChapter', 'storyValueOfOvr', 'storyPrevSeason',
  'storySummerValue', 'storyPerfBonus', 'storyJanValue', 'storySellPrice', 'storyBuyPrice',
  'storyIsRival', 'storyReal', 'storyHomeSquad', 'storyNewRun', 'storyOwned', 'storyMarketPool',
  'storyBuy', 'storySell', 'storyOpponents', 'storyBestXI', 'storyStars', 'storyScore', 'storyCoreNames', 'storyResolveOvr', 'storyResult',
  'storyApplyXI', 'storyXiOvr', 'storyStatsFor', 'storyMergeStats', 'storySimulateFn',
  'storySeasonPrepare', 'storySeasonResim', 'storyOppForSim'];

function load() {
  return new Function(STUB + MULBERRY + FILES.map(read).join('\n') +
    // typeof, so a name a later task defines loads as undefined instead of throwing
    `;return {${EXPORTS.map(k => `${k}: typeof ${k} !== 'undefined' ? ${k} : undefined`).join(',')}};`)();
}
module.exports = { load };

if (require.main === module) {
  const G = load();
  let n = 0;
  const t = (name, fn) => { fn(); n++; console.log('PASS  ' + name); };
  const ch = G.storyChapter('b7-2015');

  // ── Task 1: the market ─────────────────────────────────────────────────────
  t('chapter exists and its home squad is the real one', () => {
    assert.ok(ch);
    const home = G.storyHomeSquad(ch);
    assert.strictEqual(home.teamId, 'hapoel-beersheba');
    assert.strictEqual(home.season, '2015/16');
  });
  t('real finish is read from LEAGUE_TABLES', () => {
    const r = G.storyReal(ch);
    assert.deepStrictEqual([r.pos, r.pts, r.n], [1, 83, 14]);
  });
  t('previous season string', () => {
    assert.strictEqual(G.storyPrevSeason('2015/16'), '2014/15');
    assert.strictEqual(G.storyPrevSeason('2000/01'), '1999/00');
  });
  t('value tiers', () => {
    assert.strictEqual(G.storyValueOfOvr(90), 14);
    assert.strictEqual(G.storyValueOfOvr(84), 7);
    assert.strictEqual(G.storyValueOfOvr(79), 1.2);
    assert.strictEqual(G.storyValueOfOvr(60), 0.5);
  });
  t('reputation premium: last season top scorer is dearer in summer', () => {
    // מאור בוזגלו was 3rd scorer and top assister of 2014/15 (LEAGUE_SCORERS/ASSISTS)
    const p = { name: 'מאור בוזגלו', ovr: 84, position: 'LW' };
    assert.strictEqual(G.storySummerValue(p, '2015/16'), 8.8);         // 7 × 1.25 → 8.75 → 8.8
    assert.strictEqual(G.storySummerValue({ name: 'אף אחד', ovr: 84 }, '2015/16'), 7);
  });
  t('performance bonus: a 79 striker with 11 goals is valued like an 84', () => {
    assert.strictEqual(G.storyPerfBonus('ST', { goals: 11, assists: 0, cs: 0 }), 5);
    assert.strictEqual(G.storyJanValue({ ovr: 79, position: 'ST' }, { goals: 11, assists: 0, cs: 0 }), 7);
    assert.strictEqual(G.storyPerfBonus('ST', { goals: 0, assists: 0, cs: 0 }), -2);
    assert.strictEqual(G.storyPerfBonus('CB', { goals: 0, assists: 0, cs: 10 }), 4);
    assert.strictEqual(G.storyPerfBonus('GK', null), 0);
  });
  t('prices', () => {
    assert.strictEqual(G.storySellPrice(7), 5.6);
    assert.strictEqual(G.storyBuyPrice(7, false), 7);
    assert.strictEqual(G.storyBuyPrice(7, true), 10.5);
  });
  t('rival = finished above you last season', () => {
    // 2014/15: maccabi-tlv 1st, hapoel-beersheba 3rd
    assert.strictEqual(G.storyIsRival(ch, 'maccabi-tlv'), true);
    assert.strictEqual(G.storyIsRival(ch, 'bnei-sakhnin'), false);
  });
  t('a new run owns the real squad and the chapter budget', () => {
    const run = G.storyNewRun(ch, 42);
    assert.strictEqual(run.own.length, G.storyHomeSquad(ch).players.length);
    assert.strictEqual(run.budget, ch.budget);
    assert.strictEqual(run.phase, 'summer');
    assert.strictEqual(G.storyOwned(run).length, run.own.length);
  });
  t('buy moves a player in, charges, and removes him from the pool', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 50;
    const pool = G.storyMarketPool(run, ch);
    const e = pool[0];
    assert.strictEqual(G.storyBuy(run, ch, e, 7), null);
    assert.strictEqual(run.budget, 43);
    assert.strictEqual(run.buys.summer, 1);
    assert.ok(G.storyOwned(run).some(x => x.player.name === e.player.name));
    assert.ok(!G.storyMarketPool(run, ch).some(x => x.squad.id === e.squad.id && x.player.name === e.player.name));
  });
  t('buy is refused over budget and over the window limit', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 3;
    const pool = G.storyMarketPool(run, ch);
    assert.strictEqual(G.storyBuy(run, ch, pool[0], 4), 'אין מספיק תקציב');
    run.budget = 100;
    for (let i = 0; i < 4; i++) assert.strictEqual(G.storyBuy(run, ch, pool[i], 1), null);
    assert.strictEqual(G.storyBuy(run, ch, pool[5], 1), 'נגמרו הרכישות בחלון הזה');
  });
  t('sell credits and respects the minimum squad', () => {
    const run = G.storyNewRun(ch, 1);
    const owned = G.storyOwned(run);
    assert.strictEqual(G.storySell(run, owned[0], 2.5), null);
    assert.strictEqual(run.budget, G.storyChapter('b7-2015').budget + 2.5);
    while (run.own.length > G.STORY_RULES.minSquad) G.storySell(run, G.storyOwned(run)[0], 0);
    assert.ok(/מתחת/.test(G.storySell(run, G.storyOwned(run)[0], 0)));
  });
  t('opponents: the 13 other clubs, rated exactly like simTeamsForSeason', () => {
    const run = G.storyNewRun(ch, 1);
    const opp = G.storyOpponents(ch, run, 'summer');
    assert.strictEqual(opp.length, 13);
    assert.ok(!opp.some(o => o.teamId === 'hapoel-beersheba'));
    const ref = G.simTeamsForSeason(2015, 14);
    for (const o of opp) {
      const r = ref.find(x => x.teamId === o.teamId);
      assert.deepStrictEqual([o.ovr, o.atk, o.def], [r.ovr, r.atk, r.def]);
    }
  });
  t('buying a rival\'s stars weakens that rival', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 100;
    // Three, not one: a single signing can be covered by an equally rated squad man.
    const stars = G.storyMarketPool(run, ch).filter(e => e.squad.teamId === 'maccabi-tlv')
      .sort((a, b) => b.player.ovr - a.player.ovr).slice(0, 3);
    const before = G.storyOpponents(ch, run, 'all').find(o => o.teamId === 'maccabi-tlv');
    stars.forEach(e => assert.strictEqual(G.storyBuy(run, ch, e, 1), null));
    const after = G.storyOpponents(ch, run, 'all').find(o => o.teamId === 'maccabi-tlv');
    assert.ok(after.ovr <= before.ovr);
    assert.ok(after.atk + after.mid + after.def + after.gk < before.atk + before.mid + before.def + before.gk);
  });
  t('a January buy does not touch the summer opponents', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 100; run.phase = 'jan';
    const star = G.storyMarketPool(run, ch).filter(e => e.squad.teamId === 'maccabi-tlv')
      .sort((a, b) => b.player.ovr - a.player.ovr)[0];
    const s0 = JSON.stringify(G.storyOpponents(ch, run, 'summer'));
    G.storyBuy(run, ch, star, 1);
    assert.strictEqual(JSON.stringify(G.storyOpponents(ch, run, 'summer')), s0);
  });
  t('best XI fills every slot, natural positions first', () => {
    const run = G.storyNewRun(ch, 1);
    const slots = G.formationSlots('4-3-3', 'bal');
    const xi = G.storyBestXI(G.storyOwned(run), slots);
    assert.strictEqual(xi.filter(Boolean).length, 11);
    assert.strictEqual(new Set(xi.map(p => p.player.name)).size, 11);
    assert.strictEqual(xi[0].player.position, 'GK');
  });
  t('stars are graded, and keepCore reads the real opening eleven', () => {
    const r = G.storyReal(ch);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts + 1, budget: 0, sold: [] }), [true, true, true]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 2, points: r.pts + 9, budget: 0, sold: [] }), [false, false, false]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts, budget: 0, sold: [] }), [true, false, false]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts + 1, budget: 0, sold: ['לא קיים'] }), [true, true, true]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts + 1, budget: 0, sold: [G.storyCoreNames(ch)[0]] }), [true, true, false]);
  });
  t('score', () => {
    const r = G.storyReal(ch);
    const res = { rank: 1, points: r.pts + 5, budget: 10, sold: [] };
    assert.strictEqual(G.storyScore(ch, res), 3000 + 100 + 100);
  });
  t('margin and maxBuys stars, from storyResult', () => {
    const ks = G.storyChapter('ks-2011');
    const run = G.storyNewRun(ks, 1);
    run.budget = 100;
    const table = [{ us: true, pts: 80 }, { us: false, w: 23, d: 5, l: 9 }];   // 74 pts: margin 6
    let res = G.storyResult(run, table, 1, 80);
    assert.strictEqual(res.margin, 6);
    assert.deepStrictEqual(G.storyStars(ks, res), [true, true, true]);
    G.storyMarketPool(run, ks).slice(0, 4).forEach(e => G.storyBuy(run, ks, e, 1));   // the summer's four
    assert.deepStrictEqual(G.storyStars(ks, G.storyResult(run, table, 1, 80)), [true, true, true]);
    run.phase = 'jan';
    G.storyBuy(run, ks, G.storyMarketPool(run, ks)[0], 1);                               // a fifth
    assert.deepStrictEqual(G.storyStars(ks, G.storyResult(run, table, 1, 80)), [true, true, false]);
    const tight = [{ us: true, pts: 80 }, { us: false, pts: 77 }];
    assert.deepStrictEqual(G.storyStars(ks, G.storyResult(run, tight, 1, 80)), [true, false, false]);
  });
  t('js/story-facts.js covers every chapter (else: node scripts/build_story_facts.js)', () => {
    for (const c of G.STORY_CHAPTERS) {
      const r = G.storyReal(c);
      assert.ok(r, c.id + ' has no real table row');
      const t = G.LEAGUE_TABLES[c.season].find(x => x.teamId === c.teamId);
      assert.deepStrictEqual([r.pos, r.pts], [t.pos, t.pts]);
    }
  });
  t('ks-2011 is the live chapter: 16 clubs, real champion on 73', () => {
    const ks = G.storyChapter('ks-2011');
    assert.ok(ks && !ks.hidden);
    assert.deepStrictEqual(Object.values(G.storyReal(ks)), [1, 73, 16]);
    assert.strictEqual(G.storyOpponents(ks, G.storyNewRun(ks, 1), 'summer').length, 15);
    assert.strictEqual(G.storyCoreNames(ks).length, 11);
  });

  if (process.argv.includes('--season')) require('./story_test_season.js')(G, t);
  console.log(`\n${n} passed`);
}
