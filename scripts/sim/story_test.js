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
  'js/league-sim.js', 'js/story-facts.js', 'js/story-data.js', 'js/story-market.js', 'js/story-season.js', 'js/story-europe.js'];
const EXPORTS = ['state', 'SQUADS', 'LEAGUE_TABLES', 'FORMATIONS', 'formationSlots',
  'simTeamsForSeason', 'withSeededRandom', 'generateMatches', 'generateLeagueTable',
  'seasonFormat', 'myLineRatings', 'teamOVR', 'simulatePlayerStats', 'SIM_ENGINE_CURRENT',
  'STORY_RULES', 'STORY_CHAPTERS', 'storyChapter', 'storyValueOfOvr', 'storyPrevSeason',
  'storySummerValue', 'storyPerfBonus', 'storyJanValue', 'storyK', 'storyAsk', 'storyTalk', 'storyClubRank',
  'storyOffer', 'storyTakeCounter', 'storyListPlayer', 'storyCourt', 'storyLiveOffers', 'storyAcceptBid',
  'storyRejectBid', 'storyPushBid', 'storyGroupOf', 'storyGroupNeeds', 'storyRivalClubs', 'storyRivalShop', 'storyRules', 'storyPickXI', 'storyInjured', 'storyIsInjured', 'storyDepthAdjust', 'storyIsDerby', 'storyIsSymbol', 'STORY_RIVAL_RULES',
  'storyIsRival', 'storyReal', 'storyHomeSquad', 'storyNewRun', 'storyOwned', 'storyMarketPool',
  'storyBuy', 'storySell', 'storyOpponents', 'storyBestXI', 'storyStars', 'storyScore', 'storyCoreNames', 'storyResolveOvr', 'storyResult',
  'storyApplyXI', 'storyXiOvr', 'storyStatsFor', 'storyMergeStats', 'storySimulateFn',
  'storySeasonPrepare', 'storySeasonResim', 'storyOppForSim',
  'storyEuStart', 'storyEuPlay', 'storyEuCloseTie', 'storyEuNeed', 'storyEuResult', 'storyEuRealReach',
  'storyEuWindowDue', 'storyEuOver', 'storyEuRound', 'storyEuLiveTable', 'storyJanValue'];

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
  t('value tiers, in thousands of ₪ (the dearest player costs 2.5 million)', () => {
    assert.strictEqual(G.storyValueOfOvr(90), 2500);
    assert.strictEqual(G.storyValueOfOvr(84), 1000);
    assert.strictEqual(G.storyValueOfOvr(79), 180);
    assert.strictEqual(G.storyValueOfOvr(60), 80);
    assert.strictEqual(G.storyK(1234), 1230);
  });
  t('reputation premium: last season top scorer is dearer in summer', () => {
    // מאור בוזגלו was 3rd scorer and top assister of 2014/15 (LEAGUE_SCORERS/ASSISTS)
    const p = { name: 'מאור בוזגלו', ovr: 84, position: 'LW' };
    assert.strictEqual(G.storySummerValue(p, '2015/16'), 1150);
    assert.strictEqual(G.storySummerValue({ name: 'אף אחד', ovr: 84 }, '2015/16'), 1000);
  });
  t('performance bonus: a 79 striker with 11 goals is valued like an 84', () => {
    assert.strictEqual(G.storyPerfBonus('ST', { goals: 11, assists: 0, cs: 0 }), 5);
    assert.strictEqual(G.storyJanValue({ ovr: 79, position: 'ST' }, { goals: 11, assists: 0, cs: 0 }), 1000);
    assert.strictEqual(G.storyPerfBonus('ST', { goals: 0, assists: 0, cs: 0 }), -2);
    assert.strictEqual(G.storyPerfBonus('CB', { goals: 0, assists: 0, cs: 10 }), 4);
    assert.strictEqual(G.storyPerfBonus('GK', null), 0);
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
    run.budget = 5000;
    const pool = G.storyMarketPool(run, ch);
    const e = pool[0];
    assert.strictEqual(G.storyBuy(run, ch, e, 700), null);
    assert.strictEqual(run.budget, 4300);
    assert.strictEqual(run.buys.summer, 1);
    assert.ok(G.storyOwned(run).some(x => x.player.name === e.player.name));
    assert.ok(!G.storyMarketPool(run, ch).some(x => x.squad.id === e.squad.id && x.player.name === e.player.name));
  });
  t('buy is refused over budget and over the window limit', () => {
    const run = G.storyNewRun(ch, 1);
    run.budget = 300;
    const pool = G.storyMarketPool(run, ch);
    assert.strictEqual(G.storyBuy(run, ch, pool[0], 400), 'אין מספיק תקציב');
    run.budget = 10000;
    for (let i = 0; i < 4; i++) assert.strictEqual(G.storyBuy(run, ch, pool[i], 100), null);
    assert.strictEqual(G.storyBuy(run, ch, pool[5], 100), 'נגמרו הרכישות בחלון הזה');
  });
  t('sell credits and respects the minimum squad', () => {
    const run = G.storyNewRun(ch, 1);
    const owned = G.storyOwned(run);
    assert.strictEqual(G.storySell(run, owned[0], 250), null);
    assert.strictEqual(run.budget, ch.budget + 250);
    while (run.own.length > G.STORY_RULES.minSquad) G.storySell(run, G.storyOwned(run)[0], 0);
    assert.ok(/מתחת/.test(G.storySell(run, G.storyOwned(run)[0], 0)));
  });

  // ── negotiation ────────────────────────────────────────────────────────────
  const ks = G.storyChapter('ks-2011');
  const pick = (run, pred) => G.storyMarketPool(run, ks).filter(pred)
    .sort((a, b) => b.player.ovr - a.player.ovr)[0];
  t('the asking price: rival ×1.5, one of the club\'s three best ×1.3', () => {
    const run = G.storyNewRun(ks, 3);
    const plain = e => !G.storyIsRival(ks, e.squad.teamId) && !G.storyIsDerby(ks.teamId, e.squad.teamId) && !G.storyIsSymbol(e, ks.season);
    const e = pick(run, e => plain(e) && G.storyClubRank(e) > 3);
    const a = G.storyAsk(run, ks, e, 1000);
    assert.deepStrictEqual([a.ask, a.rival, a.key, a.notForSale], [1000, false, false, false]);
    const k = pick(run, e => plain(e) && G.storyClubRank(e) === 1);
    assert.strictEqual(G.storyAsk(run, ks, k, 1000).ask, 1150);
  });
  t('a derby: dearer, a symbol never crosses, an ordinary player sometimes refuses', () => {
    const mta = G.storyChapter('mta-2002');                     // Maccabi TA; Hapoel TA and Haifa are rivals
    assert.ok(G.storyIsDerby('maccabi-tlv', 'hapoel-tlv') && G.storyIsDerby('hapoel-tlv', 'maccabi-tlv'));
    assert.ok(!G.storyIsDerby('maccabi-tlv', 'bnei-yehuda'));
    const run = G.storyNewRun(mta, 3);
    const pool = G.storyMarketPool(run, mta).filter(e => e.squad.teamId === 'hapoel-tlv');
    const sym = pool.find(e => G.storyIsSymbol(e, mta.season) && G.storyClubRank(e) > 3);
    assert.ok(sym, 'no Hapoel TA symbol in 2002/03');
    assert.strictEqual(G.storyAsk(run, mta, sym, 1000).why, 'symbol');
    assert.strictEqual(G.storyOffer(run, mta, sym, 1000, 99999).kind, 'blocked');
    // an ordinary derby player: 1.4 dearer when he is willing
    let seen = false;
    for (let seed = 1; seed < 30 && !seen; seed++) {
      const r = G.storyNewRun(mta, seed);
      const e = G.storyMarketPool(r, mta).find(x => x.squad.teamId === 'hapoel-tlv' && !G.storyIsSymbol(x, mta.season) && G.storyClubRank(x) > 3);
      const a = G.storyAsk(r, mta, e, 1000);
      if (a.why) continue;
      seen = true;
      assert.ok(a.ask >= 1400, 'derby ask ' + a.ask);
    }
    assert.ok(seen);
    // refusals happen, roughly as often as the rule says
    let refuse = 0, n = 0;
    for (let seed = 1; seed < 200; seed++) {
      const r = G.storyNewRun(mta, seed);
      const e = G.storyMarketPool(r, mta).find(x => x.squad.teamId === 'hapoel-tlv' && !G.storyIsSymbol(x, mta.season) && G.storyClubRank(x) > 3);
      n++; if (G.storyAsk(r, mta, e, 1000).why === 'refuse') refuse++;
    }
    assert.ok(refuse / n > 0.15 && refuse / n < 0.45, 'refusal rate ' + refuse / n);
  });
  t('a top rival will not sell one of its three best', () => {
    // 2010/11: maccabi-haifa were champions — above KS, top three
    const run = G.storyNewRun(ks, 3);
    const e = pick(run, e => e.squad.teamId === 'maccabi-haifa' && G.storyClubRank(e) === 1);
    assert.strictEqual(G.storyAsk(run, ks, e, 1000).notForSale, true);
    const r = G.storyOffer(run, ks, e, 1000, 99999);
    assert.strictEqual(r.kind, 'blocked');
    assert.strictEqual(run.own.length, G.storyHomeSquad(ks).players.length);
  });
  t('offering the asking price buys him at that price', () => {
    const run = G.storyNewRun(ks, 3);
    run.budget = 5000;
    const e = pick(run, e => !G.storyIsRival(ks, e.squad.teamId) && !G.storyIsSymbol(e, ks.season) && !G.storyIsDerby(ks.teamId, e.squad.teamId) && G.storyClubRank(e) > 3);
    const ask = G.storyTalk(run, ks, e, 600).ask;
    const r = G.storyOffer(run, ks, e, 600, ask);
    assert.deepStrictEqual([r.kind, r.price], ['accept', ask]);
    assert.strictEqual(run.budget, 5000 - ask);
    assert.ok(G.storyOwned(run).some(x => x.player.name === e.player.name));
  });
  t('an insulting offer is refused; three refusals close the talk', () => {
    const run = G.storyNewRun(ks, 3);
    run.budget = 5000;
    const e = pick(run, e => !G.storyIsRival(ks, e.squad.teamId) && !G.storyIsSymbol(e, ks.season) && !G.storyIsDerby(ks.teamId, e.squad.teamId) && G.storyClubRank(e) > 3);
    for (let i = 0; i < 3; i++) assert.strictEqual(G.storyOffer(run, ks, e, 600, 100).kind, 'reject');
    assert.strictEqual(G.storyOffer(run, ks, e, 600, 600).kind, 'blocked');
  });
  t('a counter is never below your offer, and can be taken', () => {
    let found = false;
    for (let seed = 1; seed < 60 && !found; seed++) {
      const run = G.storyNewRun(ks, seed);
      run.budget = 5000;
      const e = pick(run, e => !G.storyIsRival(ks, e.squad.teamId) && !G.storyIsSymbol(e, ks.season) && !G.storyIsDerby(ks.teamId, e.squad.teamId) && G.storyClubRank(e) > 3);
      const r = G.storyOffer(run, ks, e, 600, 540);
      if (r.kind !== 'counter') continue;
      found = true;
      assert.ok(r.counter >= 540 && r.counter <= 600);
      const t2 = G.storyTakeCounter(run, ks, e, 600);
      assert.deepStrictEqual([t2.kind, t2.price], ['accept', G.storyTalk(run, ks, e, 600).ask]);
    }
    assert.ok(found, 'no counter in 60 seeds at 90% of the ask');
  });
  t('the same offer on the same run always gets the same answer', () => {
    const a = G.storyNewRun(ks, 77), b = G.storyNewRun(ks, 77);
    a.budget = b.budget = 5000;
    const e = pick(a, e => !G.storyIsRival(ks, e.squad.teamId) && !G.storyIsSymbol(e, ks.season) && G.storyClubRank(e) > 3);
    assert.deepStrictEqual(G.storyOffer(a, ks, e, 600, 500), G.storyOffer(b, ks, e, 600, 500));
  });

  // ── bids on your players ───────────────────────────────────────────────────
  t('listing a player brings 1-3 bids, one per club, at 65-110% of value', () => {
    const run = G.storyNewRun(ks, 5);
    const e = G.storyOwned(run)[3];
    const bids = G.storyListPlayer(run, ks, e, 1000);
    assert.ok(bids.length >= 1 && bids.length <= 3);
    assert.strictEqual(new Set(bids.map(b => b.club)).size, bids.length);
    bids.forEach(b => assert.ok(b.amount >= 650 && b.amount <= 1100));
    assert.deepStrictEqual(G.storyListPlayer(run, ks, e, 1000), []);          // once per window
  });
  t('accepting a bid sells him and clears his other bids', () => {
    const run = G.storyNewRun(ks, 5);
    const e = G.storyOwned(run)[3];
    const bids = G.storyListPlayer(run, ks, e, 1000);
    assert.strictEqual(G.storyAcceptBid(run, bids[0].id), null);
    assert.strictEqual(run.budget, ks.budget + bids[0].amount);
    assert.ok(!G.storyOwned(run).some(x => x.player.name === e.player.name));
    assert.strictEqual(G.storyLiveOffers(run).length, 0);
  });
  t('naming your price to a bidder: a little more is paid, too much and he walks', () => {
    const run = G.storyNewRun(ks, 5);
    const [e1, e2] = G.storyOwned(run).slice(4, 6);
    const b1 = G.storyListPlayer(run, ks, e1, 1000)[0];
    const want = G.storyK(b1.amount * 1.05);                  // read before: the push updates the bid
    const r1 = G.storyPushBid(run, b1.id, want);
    assert.strictEqual(r1.kind, 'accept');
    assert.strictEqual(run.budget, ks.budget + want);
    const b2 = G.storyListPlayer(run, ks, e2, 1000)[0];
    assert.strictEqual(G.storyPushBid(run, b2.id, b2.amount * 3).kind, 'walk');
    assert.ok(!G.storyLiveOffers(run).some(o => o.id === b2.id));
  });
  t('a bidder can raise his bid, never above what he will pay, and stops after three rounds', () => {
    let seen = false;
    for (let seed = 1; seed < 80 && !seen; seed++) {
      const run = G.storyNewRun(ks, seed);
      const e = G.storyOwned(run)[6];
      const b = G.storyListPlayer(run, ks, e, 1000)[0];
      const opening = b.amount;
      const r = G.storyPushBid(run, b.id, opening * 1.45);
      if (r.kind !== 'counter') continue;
      seen = true;
      assert.ok(r.amount > opening && r.amount <= opening * 1.3 + 10);
      assert.strictEqual(G.storyLiveOffers(run).find(o => o.id === b.id).amount, r.amount);
    }
    assert.ok(seen, 'no counter in 80 seeds at 45% over the bid');
  });
  t('no asking price above the ceiling, however the markups stack', () => {
    const run = G.storyNewRun(ks, 3);
    const e = G.storyMarketPool(run, ks).sort((a, b) => b.player.ovr - a.player.ovr)[0];
    assert.ok(G.storyAsk(run, ks, e, 99999).ask <= G.STORY_RULES.maxAsk);
  });
  t('unsolicited bids come once per window, only for the courted', () => {
    const run = G.storyNewRun(ks, 5);
    const owned = G.storyOwned(run);
    const courted = new Set([owned[0].player.name]);
    const made = G.storyCourt(run, ks, owned, () => 1000, e => courted.has(e.player.name));
    assert.ok(made.length === 1 && made[0].unsolicited && made[0].name === owned[0].player.name);
    assert.deepStrictEqual(G.storyCourt(run, ks, owned, () => 1000, () => true), []);
  });
  t('rivals who shop: last season\'s top three, after your window, once per window', () => {
    const b7 = Object.assign({}, G.storyChapter('b7-2015'), { rivalBudget: 3000 });
    assert.deepStrictEqual(G.storyRivalClubs(b7).length, 3);
    assert.ok(!G.storyRivalClubs(b7).includes('hapoel-beersheba'));
    const run = G.storyNewRun(b7, 9);
    const before = G.storyOpponents(b7, run, 'summer').find(o => o.teamId === 'maccabi-tlv');
    const made = G.storyRivalShop(run, b7, 'summer');
    assert.ok(made.length > 0 && made.length <= 9);
    made.forEach(b => assert.ok(!G.storyMarketPool(run, b7).some(e => e.squad.id === b.squadId && e.player.name === b.name)));
    const after = G.storyOpponents(b7, run, 'summer').find(o => o.teamId === 'maccabi-tlv');
    assert.ok(after.atk + after.mid + after.def + after.gk >= before.atk + before.mid + before.def + before.gk);
    assert.deepStrictEqual(G.storyRivalShop(run, b7, 'summer'), []);
    const spent = t => made.filter(b => b.teamId === t).reduce((a, b) => a + b.price, 0);
    G.storyRivalClubs(b7).forEach(t => assert.ok(spent(t) <= 3000));
  });
  t('a chapter without rivalBudget has rivals who stand still', () => {
    const run = G.storyNewRun(ks, 9);
    assert.deepStrictEqual(G.storyRivalShop(run, ks, 'summer'), []);
  });
  t('a player you signed first is not there for a rival', () => {
    const b7 = Object.assign({}, G.storyChapter('b7-2015'), { rivalBudget: 99999 });
    const run = G.storyNewRun(b7, 9);
    run.budget = 99999;
    const star = G.storyMarketPool(run, b7).sort((a, b) => b.player.ovr - a.player.ovr)[0];
    G.storyBuy(run, b7, star, 1);
    const made = G.storyRivalShop(run, b7, 'summer');
    assert.ok(!made.some(b => b.name === star.player.name));
  });
  // ── Europe ─────────────────────────────────────────────────────────────────
  const euSet = (c, run) => {
    Object.assign(G.state, { story: { chapterId: c.id }, peakMode: false, classic: false, coach: null });
    G.storyApplyXI(run);
  };
  t('europe chapters: rounds are well formed, stars point at real rounds', () => {
    for (const c of G.STORY_CHAPTERS.filter(c => c.kind === 'europe')) {
      const ids = c.europe.rounds.map(r => r.id);
      assert.ok(ids.includes(c.europe.window), c.id + ' window');
      assert.ok(ids.includes(c.europe.realOut), c.id + ' realOut');
      c.stars.filter(s => s.type === 'euReach').forEach(s => assert.ok(ids.includes(s.round), c.id + ' ' + s.round));
      c.europe.rounds.filter(r => r.kind === 'group').forEach(r => {
        assert.strictEqual(r.fixtures.length, 6);
        [0, 1, 2].forEach(k => assert.strictEqual(r.fixtures.filter(f => f[0] === k).length, 2));
        [0, 1, 2].forEach(k => assert.deepStrictEqual(r.fixtures.filter(f => f[0] === k).map(f => f[1]).sort(), [false, true]));
      });
      assert.ok(G.storyHomeSquad(c), c.id + ' squad');
    }
  });
  t('a tie: two legs, then closed, and the same choices replay the same way', () => {
    const c = G.storyChapter('hta-2001');
    const play = () => {
      const run = G.storyNewRun(c, 31); G.storyEuStart(run); euSet(c, run);
      const a = G.storyEuPlay(c, run, 'bal');
      const b = G.storyEuPlay(c, run, 'att');
      return { run, a, b };
    };
    const x = play(), y = play();
    assert.ok(!x.a.closed && x.b.closed);
    assert.deepStrictEqual([x.a.leg.gf, x.a.leg.ga, x.b.leg.gf, x.b.leg.ga], [y.a.leg.gf, y.a.leg.ga, y.b.leg.gf, y.b.leg.ga]);
    assert.strictEqual(x.a.leg.home, true);                    // q: firstHome
    assert.strictEqual(x.b.leg.home, false);
    assert.ok(x.run.eu.at === 1 || x.run.eu.out);
  });
  t('away goals decide a level tie, then extra time and penalties', () => {
    const c = G.storyChapter('hta-2001');
    const run = G.storyNewRun(c, 5);
    const round = c.europe.rounds[0];
    // 1-2 at home, 1-0 away: 2-2, but their two away goals beat our one
    const r = G.storyEuCloseTie(c, run, round, [{ gf: 1, ga: 2, home: true }, { gf: 1, ga: 0, home: false }]);
    assert.deepStrictEqual([r.agg.gf, r.agg.ga, r.how, r.won], [2, 2, 'away', false]);
    // 1-1 and 1-1: level on away goals too, so extra time, then penalties
    const s = G.storyEuCloseTie(c, run, round, [{ gf: 1, ga: 1, home: true }, { gf: 1, ga: 1, home: false }]);
    assert.ok(['et', 'pens'].includes(s.how));
    assert.strictEqual(s.won, s.pens ? s.pens.gf > s.pens.ga : s.agg.gf > s.agg.ga);
  });
  t('the need line reads the tie', () => {
    const c = G.storyChapter('hta-2001');
    const r = c.europe.rounds[2];
    assert.ok(/מובילים/.test(G.storyEuNeed(c, r, [{ gf: 2, ga: 0, home: true }])));
    assert.ok(/פיגור/.test(G.storyEuNeed(c, r, [{ gf: 0, ga: 1, home: false }])));
    assert.strictEqual(G.storyEuNeed(c, r, []), '');
  });
  t('a group: six matchdays, a full table, a position', () => {
    const c = G.storyChapter('haifa-2009');
    const run = G.storyNewRun(c, 12); G.storyEuStart(run); euSet(c, run);
    run.eu.at = c.europe.rounds.findIndex(r => r.kind === 'group');
    let last;
    for (let i = 0; i < 6; i++) last = G.storyEuPlay(c, run, 'bal');
    assert.ok(last.closed && last.closed.kind === 'group');
    const tb = last.closed.table;
    assert.strictEqual(tb.length, 4);
    tb.forEach(r => assert.strictEqual(r.p, 6));
    assert.strictEqual(tb.reduce((s, r) => s + r.gf, 0), tb.reduce((s, r) => s + r.ga, 0));
    const res = { budget: 0, eu: G.storyEuResult(c, run), sold: [], boughtTeams: [] };
    const st = G.storyStars(c, res);
    assert.strictEqual(st[0], last.closed.pts >= 3);
  });
  t('europe stars: reach counts rounds entered', () => {
    const c = G.storyChapter('hta-2001');
    const idx = id => c.europe.rounds.findIndex(r => r.id === id);
    const res = reached => ({ budget: 0, sold: [], boughtTeams: [], eu: { reached, group: null, champion: false } });
    assert.deepStrictEqual(G.storyStars(c, res(idx('qf'))), [true, false, false]);
    assert.deepStrictEqual(G.storyStars(c, res(idx('final'))), [true, true, true]);
    assert.deepStrictEqual(G.storyStars(c, res(idx('r4'))), [false, false, false]);
    assert.strictEqual(G.storyEuRealReach(c), idx('qf'));
  });
  t('a picked eleven: your choice holds, the rest is filled, a sold man drops out', () => {
    const run = G.storyNewRun(ks, 2);
    const slots = G.formationSlots('4-3-3', 'bal');
    const owned = G.storyOwned(run);
    const auto = G.storyBestXI(owned, slots);
    const benchGk = owned.filter(e => e.player.position === 'GK' && !auto.includes(e))[0];
    const key = e => e.squad.id + '|' + e.player.name;
    const xi = { gk: key(benchGk) };
    const mine = G.storyPickXI(owned, slots, xi);
    assert.strictEqual(mine[0].player.name, benchGk.player.name);
    assert.strictEqual(mine.filter(Boolean).length, 11);
    assert.strictEqual(new Set(mine.map(e => e.player.name)).size, 11);
    // the same man in two slots counts once
    const twice = G.storyPickXI(owned, slots, { gk: key(benchGk), cb1: key(benchGk) });
    assert.strictEqual(new Set(twice.map(e => e.player.name)).size, 11);
    // sell him: the goal is filled from who is left
    run.budget = 0;
    G.storySell(run, benchGk, 0);
    const after = G.storyPickXI(G.storyOwned(run), slots, xi);
    assert.ok(after[0] && after[0].player.name !== benchGk.player.name);
    assert.deepStrictEqual(G.storyPickXI(owned, slots, {}).map(e => e.player.name), auto.map(e => e.player.name));
  });
  t('the achievements migration knows every chapter', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260923000002_story_achievements.sql'), 'utf8');
    const known = (sql.match(/v_known\s+text\[\]\s+:=\s+ARRAY\[([^\]]*)\]/) || [])[1] || '';
    const ids = known.split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean).sort();
    assert.deepStrictEqual(ids, G.STORY_CHAPTERS.map(c => c.id).sort(),
      'a chapter was added or renamed: add it to v_known in a new migration');
  });
  t('a signing at 85% of the first price or less is a bargain', () => {
    let hit = false;
    for (let seed = 1; seed < 120 && !hit; seed++) {
      const run = G.storyNewRun(ks, seed);
      run.budget = 5000;
      const e = pick(run, e => !G.storyIsRival(ks, e.squad.teamId) && !G.storyIsSymbol(e, ks.season) && !G.storyIsDerby(ks.teamId, e.squad.teamId) && G.storyClubRank(e) > 3);
      const r = G.storyOffer(run, ks, e, 1000, 850);
      if (r.kind === 'accept') { assert.ok(run.bargain); hit = true; }
      else assert.ok(!run.bargain);
    }
    assert.ok(hit, 'no club accepted 85% in 120 seeds');
  });
  t('position groups and what a shape needs', () => {
    assert.strictEqual(G.storyGroupOf('CAM'), 'cm');
    assert.strictEqual(G.storyGroupOf('RW'), 'wg');
    const need = G.storyGroupNeeds(G.formationSlots('4-3-3', 'bal'));
    assert.strictEqual(Object.values(need).reduce((a, b) => a + b, 0), 11);
    assert.strictEqual(need.gk, 1);
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
    // a chapter built for the test: the graded rule and keepCore, on B7's squad
    const ch = Object.assign({}, G.storyChapter('b7-2015'), { stars: [
      { type: 'rank', max: 1 }, { type: 'beatPoints' }, { type: 'keepCore' }] });
    const r = G.storyReal(ch);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts + 1, budget: 0, sold: [] }), [true, true, true]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 2, points: r.pts + 9, budget: 0, sold: [] }), [false, false, false]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts, budget: 0, sold: [] }), [true, false, false]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts + 1, budget: 0, sold: ['לא קיים'] }), [true, true, true]);
    assert.deepStrictEqual(G.storyStars(ch, { rank: 1, points: r.pts + 1, budget: 0, sold: [G.storyCoreNames(ch)[0]] }), [true, true, false]);
  });
  t('score', () => {
    const r = G.storyReal(ch);
    const res = { rank: 1, points: r.pts + 17, margin: 10, budget: 10000, sold: [], boughtTeams: [] };   // 100 pts, 10 million
    assert.strictEqual(G.storyScore(ch, res), 3000 + 17 * 20 + 100);
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
    for (const c of G.STORY_CHAPTERS.filter(c => c.kind !== 'europe')) {
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
