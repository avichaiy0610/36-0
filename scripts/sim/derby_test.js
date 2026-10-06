// scripts/sim/derby_test.js — unit tests for אלופי הדרבי. No framework: node + assert.
//   node scripts/sim/derby_test.js
// Loads the same bundle the browser runs, the way scripts/sim/story_test.js does.
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
const _ls = new Map();
const localStorage = { getItem(k){ return _ls.has(k) ? _ls.get(k) : null; }, setItem(k, v){ _ls.set(k, String(v)); }, removeItem(k){ _ls.delete(k); } };
const derbyShow = () => {};
const getCurrentUser = () => null;
const _supabase = { rpc(){ return Promise.resolve(); } };
// js/duel.js owns mulberry32 in the browser; withSeededRandom (league-sim.js) needs it.
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
`;
// chem-data/chemistry/tag-data/tags are loaded so the computer's XI gets the same
// chemistry and tag lifts the player's does. If one of them throws on load in
// Node, drop it from FILES: both sides then read 0 from it, which is still fair.
const FILES = ['js/data.js', 'js/league_tables.js', 'js/sim-engine.js', 'js/game.js',
  'js/league-sim.js', 'js/chem-data.js', 'js/chemistry.js', 'js/tag-data.js', 'js/tags.js',
  'js/derby-data.js', 'js/derby-ai.js', 'js/derby-match.js', 'js/derby.js'];
const EXPORTS = ['state', 'SQUADS', 'TEAMS', 'formationSlots', 'playerFitsSlot', 'slotFitPos',
  'myLineRatings', 'teamOVR', 'getEraFilteredSquads',
  'DERBY_RIVALS', 'DERBY_MIN_SEASONS', 'DERBY_MIN_RIVAL_SEASONS', 'DERBY_SERIES_ORDER', 'DERBY_GAME_HOME', 'DERBY_BENCH', 'DERBY_SUBS', 'DERBY_SUB_WINDOWS', 'DERBY_CHUNK', 'DERBY_AI', 'DERBY_REROLLS',
  'derbySeasonsOf', 'derbyClubs', 'derbyRng',
  'derbyAiDraft', 'derbyLinesFor',
  'derbyPlayMatch', 'derbySeriesStatus',
  'derbyFatigue', 'derbyMatchNew', 'derbyMatchStep', 'derbySub', 'derbyCanSub', 'derbyAutoManage', 'derbySeriesRival', 'derbyRunSummary', 'playerOVR', 'SIM2', 'simulateMatchV2', 'withSeededRandom', 'DERBY_UNDERDOGS',
  'derbyEntryKey', 'derbyEntry', 'derbySave', 'derbyLoad', 'derbyBenchDraw', 'derbyBenchCandidates', 'derbyBenchPick', 'derbyBenchReroll',
  'derbyBeginPlay', 'derbyCurrent', 'derbyGameStart', 'derbyGameStep', 'derbyLiveSave', 'derbyLiveLoad', 'derbySetTactic', 'derbyMakeSub', 'localStorage'];

function load() {
  return new Function(STUB + FILES.map(read).join('\n') +
    // typeof, so a name a later task defines loads as undefined instead of throwing
    `;return {${EXPORTS.map(k => `${k}: typeof ${k} !== 'undefined' ? ${k} : undefined`).join(',')}};`)();
}
module.exports = { load };

if (require.main === module) {
  const G = load();
  let n = 0;
  const t = (name, fn) => { fn(); n++; console.log('PASS  ' + name); };

  // ── Task 1: data ───────────────────────────────────────────────────────────
  t('13 clubs take part, all with 15+ seasons', () => {
    const clubs = G.derbyClubs();
    assert.strictEqual(clubs.length, 13);
    assert.ok(clubs.includes('beitar-jerusalem'));
    assert.ok(!clubs.includes('hapoel-jerusalem'));          // 6 seasons
    clubs.forEach(c => assert.ok(G.derbySeasonsOf(c).length >= G.DERBY_MIN_SEASONS, c));
  });
  t('every club has three distinct rivals, each with enough seasons to draft', () => {
    const clubs = new Set(G.derbyClubs());
    for (const c of clubs) {
      const r = G.DERBY_RIVALS[c];
      assert.strictEqual(r.length, 3, c);
      assert.strictEqual(new Set(r).size, 3, c);
      assert.ok(!r.includes(c), c);
      r.forEach(x => assert.ok(G.derbySeasonsOf(x).length >= G.DERBY_MIN_RIVAL_SEASONS, c + ' → ' + x));
    }
  });
  t('a rival from outside the 13 (Hadera, 7 seasons) still fields 11 in position, no repeated player', () => {
    for (const f of ['4-3-3', '4-4-2', '3-5-2']) for (let s = 1; s <= 100; s++) {
      const d = G.derbyAiDraft('hapoel-hadera', f, 'hard', G.derbyRng(s));
      assert.ok(d.picks.every(Boolean), f + ' seed ' + s);
      assert.strictEqual(new Set(d.picks.map(p => p.player.name)).size, 11);
      d.picks.forEach((p, i) => assert.ok(G.playerFitsSlot(p.player, G.slotFitPos(d.slots[i])), f + ' ' + p.player.name));
    }
  });
  t('owner rulings: Beitar\'s archrival is Sakhnin, Haifa\'s is Maccabi TLV', () => {
    assert.strictEqual(G.DERBY_RIVALS['beitar-jerusalem'][0], 'bnei-sakhnin');
    assert.strictEqual(G.DERBY_RIVALS['maccabi-haifa'][0], 'maccabi-tlv');
    assert.deepStrictEqual(G.DERBY_RIVALS['maccabi-netanya'], ['hapoel-beersheba', 'beitar-jerusalem', 'hapoel-hadera']);
    assert.strictEqual(G.DERBY_RIVALS['hapoel-beersheba'][2], 'maccabi-netanya');
    assert.strictEqual(G.DERBY_RIVALS['bnei-sakhnin'][0], 'beitar-jerusalem');
  });
  t('derbyRng is deterministic and in [0,1)', () => {
    const a = G.derbyRng(42), b = G.derbyRng(42);
    for (let i = 0; i < 100; i++) { const x = a(); assert.strictEqual(x, b()); assert.ok(x >= 0 && x < 1); }
  });

  // ── Task 2: the computer's draft ───────────────────────────────────────────
  for (const club of ['maccabi-haifa', 'hapoel-pt']) {
    t(`AI draft (${club}): 11 picks, no repeated player or season, all from the club`, () => {
      for (let s = 1; s <= 150; s++) {
        const d = G.derbyAiDraft(club, '4-3-3', 'normal', G.derbyRng(s));
        assert.strictEqual(d.picks.length, 11);
        assert.ok(d.picks.every(Boolean), 'empty slot, seed ' + s);
        assert.strictEqual(new Set(d.picks.map(p => p.player.name)).size, 11, 'repeat player, seed ' + s);
        assert.strictEqual(new Set(d.picks.map(p => p.squad.id)).size, 11, 'repeat season, seed ' + s);
        d.picks.forEach(p => assert.strictEqual(p.squad.teamId, club));
        d.picks.forEach((p, i) => assert.ok(G.playerFitsSlot(p.player, G.slotFitPos(d.slots[i])),
          `${p.player.name} (${p.player.position}) in ${d.slots[i].pos}, seed ${s}`));
      }
    });
  }
  t('harder computer drafts a stronger XI on average', () => {
    const avg = diff => {
      let sum = 0;
      for (let s = 1; s <= 200; s++) {
        const d = G.derbyAiDraft('maccabi-tlv', '4-3-3', diff, G.derbyRng(s));
        sum += G.derbyLinesFor(d.picks, d.slots).ovr;
      }
      return sum / 200;
    };
    const e = avg('easy'), nm = avg('normal'), h = avg('hard');
    assert.ok(h > nm && nm > e, `easy ${e} normal ${nm} hard ${h}`);
  });
  t('derbyLinesFor leaves the player\'s own XI on state untouched', () => {
    const before = G.state.picks, slotsBefore = G.state.slots;
    const d = G.derbyAiDraft('beitar-jerusalem', '4-3-3', 'hard', G.derbyRng(7));
    const r = G.derbyLinesFor(d.picks, d.slots);
    assert.ok(r.ovr > 60 && r.atk > 0 && r.gk > 0);
    assert.strictEqual(G.state.picks, before);
    assert.strictEqual(G.state.slots, slotsBefore);
  });

  t('the computer drafts a bench of 7: no player repeats across XI and bench', () => {
    for (let s = 1; s <= 100; s++) {
      const d = G.derbyAiDraft('hapoel-pt', '4-3-3', 'normal', G.derbyRng(s));   // 15 seasons < 18 rounds
      assert.strictEqual(d.bench.length, 7);
      const names = [...d.picks, ...d.bench].map(e => e.player.name);
      assert.strictEqual(new Set(names).size, 18, 'seed ' + s);
      d.bench.forEach(e => assert.strictEqual(e.squad.teamId, 'hapoel-pt'));
    }
  });
  t('tactic shifts attack against defence; tiredness lowers the lines after 60\'', () => {
    const d = G.derbyAiDraft('maccabi-haifa', '4-3-3', 'hard', G.derbyRng(3));
    const bal = G.derbyLinesFor(d.picks, d.slots, 'bal', 0);
    const att = G.derbyLinesFor(d.picks, d.slots, 'att', 0);
    const def = G.derbyLinesFor(d.picks, d.slots, 'def', 0);
    assert.ok(att.atk > bal.atk && att.def < bal.def, 'att');
    assert.ok(def.atk < bal.atk && def.def > bal.def, 'def');
    const late = G.derbyLinesFor(d.picks, d.slots, 'bal', 85);
    assert.ok(late.ovr < bal.ovr, 'no tiredness at 85\'');
    assert.strictEqual(G.derbyFatigue({ on: 0 }, 90), 3);
    assert.strictEqual(G.derbyFatigue({ on: 60 }, 90), 0);
  });

  // ── V2: the segment engine ─────────────────────────────────────────────────
  const dA = G.derbyAiDraft('maccabi-haifa', '4-3-3', 'hard', G.derbyRng(1));
  const dB = G.derbyAiDraft('maccabi-tlv', '4-3-3', 'hard', G.derbyRng(2));
  const xiA = { picks: dA.picks, bench: dA.bench, slots: dA.slots, tactic: 'bal' };
  const xiB = { picks: dB.picks, bench: dB.bench, slots: dB.slots, tactic: 'bal' };
  t('every match ends at 90 with a winner; a draw is settled on penalties', () => {
    let draws = 0;
    for (let s = 1; s <= 300; s++) {
      const m = G.derbyPlayMatch(xiA, xiB, s % 2 === 0, s);
      assert.strictEqual(m.min, 90); assert.ok(m.over);
      assert.strictEqual(m.events.filter(e => e.mine).length, m.gf);
      assert.strictEqual(m.events.filter(e => !e.mine).length, m.ga);
      if (m.gf === m.ga) { draws++; assert.ok(m.pens); assert.strictEqual(m.won, m.pens.gf > m.pens.ga); }
      else { assert.strictEqual(m.pens, null); assert.strictEqual(m.won, m.gf > m.ga); }
    }
    assert.ok(draws > 0);
  });
  t('a match is deterministic for its seed and decisions', () => {
    const a = G.derbyPlayMatch(xiA, xiB, true, 99), b = G.derbyPlayMatch(xiA, xiB, true, 99);
    assert.deepStrictEqual([a.gf, a.ga, a.won], [b.gf, b.ga, b.won]);
  });
  // a sub must fit the slot now: bring on the first bench man who fits an outfield
  // slot that has not been changed yet (the slot argument is only a tie-break hint)
  let subSlot = -1;
  const sub = (side, hint, min) => {
    for (let si = 1; si < side.picks.length; si++) {
      if (side.picks[si].on) continue;
      const bi = side.bench.findIndex(b => G.playerFitsSlot(b.player, G.slotFitPos(side.slots[si])));
      if (bi >= 0) { const ok = G.derbySub(side, si, bi, min); if (ok) subSlot = si; return ok; }
    }
    return false;
  };
  t('subs: at most 5, at most 3 windows, half-time is free', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    const side = m.me;
    assert.ok(sub(side, 1, 45)); assert.ok(sub(side, 2, 45));   // half-time: no window
    assert.strictEqual(side.windows, 0);
    assert.ok(sub(side, 3, 60)); assert.ok(sub(side, 4, 60));   // window 1
    assert.ok(sub(side, 5, 75));                                           // window 2, 5th sub
    assert.ok(!sub(side, 6, 75), 'a 6th sub');
    assert.strictEqual(side.subs, 5); assert.strictEqual(side.windows, 2);
    const s2 = G.derbyMatchNew(xiA, xiB, true, 5).me;
    assert.ok(sub(s2, 1, 15) && sub(s2, 2, 30) && sub(s2, 3, 60));
    assert.ok(!sub(s2, 4, 75), 'a 4th window');
    assert.ok(sub(s2, 4, 45), 'half-time is still free');
  });
  t('a sub must fit the slot, and only strictly inside the match', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    const cbIdx = m.me.bench.findIndex(b => G.slotFitPos({ pos: 'GK' }) && !G.playerFitsSlot(b.player, 'GK'));
    assert.ok(cbIdx >= 0);
    assert.ok(!G.derbySub(m.me, 0, cbIdx, 60), 'an outfielder in goal');
    assert.ok(!sub(m.me, 3, 0) && !sub(m.me, 3, 90), 'minute bounds');
  });
  t('chance-slots: no side beyond SIM2.CHANCES goals, and the scoring level matches the one-shot engine', () => {
    const lines = x => G.derbyLinesFor(x.picks, x.slots, 'bal', 0);
    const la = lines(xiA), lb = lines(xiB);
    const one = { gf: 0, n: 0 };
    let seg = 0, N = 2000;
    for (let s = 1; s <= N; s++) {
      const m = G.derbyMatchNew(xiA, Object.assign({}, xiB, { bench: [] }), s % 2 === 0, s);
      while (!m.over) G.derbyMatchStep(m, false);
      assert.ok(m.gf <= G.SIM2.CHANCES && m.ga <= G.SIM2.CHANCES, 'seed ' + s);
      seg += m.gf + m.ga;
      const o = G.withSeededRandom(s, () => G.simulateMatchV2(la, lb, s % 2 === 0));
      one.gf += o.gf + o.ga;
    }
    assert.ok(Math.abs(seg - one.gf) / one.gf < 0.10, 'segments ' + seg / N + ' vs one-shot ' + one.gf / N);
  });
  t('a substitute comes on fresh', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    assert.ok(sub(m.me, 3, 60));
    assert.strictEqual(m.me.picks[subSlot].on, 60);
    assert.strictEqual(G.derbyFatigue(m.me.picks[subSlot], 85), 0);
    const other = m.me.picks.findIndex((p, i) => i !== subSlot && !p.on);
    assert.ok(G.derbyFatigue(m.me.picks[other], 85) > 0);
  });
  t('the computer chases when behind and protects when ahead', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    G.derbyAutoManage(m.opp, 60, -1); assert.strictEqual(m.opp.tactic, 'att');
    G.derbyAutoManage(m.opp, 75, 1);  assert.strictEqual(m.opp.tactic, 'def');
    assert.ok(m.opp.subs >= 1 && m.opp.subs <= 5);
  });
  t('series order: ג, ב, then the archrival', () => {
    assert.deepStrictEqual([0, 1, 2].map(s => G.derbySeriesRival('maccabi-haifa', s)),
      ['beitar-jerusalem', 'hapoel-haifa', 'maccabi-tlv']);
  });
  t('series status and run summary', () => {
    const W = { won: true }, L = { won: false };
    assert.deepStrictEqual(G.derbySeriesStatus([W, L, W, L]), { w: 2, l: 2, over: false, won: false });
    const s = [{ games: [W, W, W] }, { games: [L, L, L] }, { games: [W, L, W, L, W] }];
    assert.deepStrictEqual(G.derbyRunSummary(s), { seriesWon: 2, over: true, title: false });
    assert.strictEqual(G.derbyRunSummary([{ games: [W, W, W] }, { games: [W, W, W] }, { games: [W, W, W] }]).title, true);
  });

  // ── Task 5: hooks ──────────────────────────────────────────────────────────
  t('a derby draws only the chosen club\'s seasons; outside it, nothing changes', () => {
    Object.assign(G.state, { eraMin: 1999, eraMax: 2025, derby: { club: 'ironi-ks' } });
    const pool = G.getEraFilteredSquads();
    assert.ok(pool.length === G.derbySeasonsOf('ironi-ks').length && pool.every(sq => sq.teamId === 'ironi-ks'));
    G.state.derby = null;
    assert.ok(G.getEraFilteredSquads().length > 300);
  });


  // ── Task V4: the run ───────────────────────────────────────────────────────
  const newRun = (club, seed) => {
    const fid = '4-3-3', diff = 'normal';
    const d = G.derbyAiDraft(club, fid, diff, G.derbyRng(seed));
    return { v: 2, club, difficulty: diff, formationId: fid, tactic: 'bal', seed, phase: 'bench',
      xi: d.picks.map(G.derbyEntryKey), bench: [], benchDraw: null, rerolls: G.DERBY_REROLLS,
      rivals: null, series: [], live: null, submitted: false };
  };
  const draftBench = run => {
    for (let i = 0; i < G.DERBY_BENCH; i++) {
      const sq = G.derbyBenchDraw(run);
      assert.ok(G.derbyBenchPick(run, G.derbyBenchCandidates(run, sq)[0].name));
    }
  };
  t('a v1 run in storage is dropped by derbyLoad', () => {
    G.localStorage.setItem('36-0-derby', JSON.stringify({ v: 1, club: 'maccabi-haifa' }));
    assert.strictEqual(G.derbyLoad(), null);
    G.localStorage.removeItem('36-0-derby');
  });
  t('bench pick never repeats a man or a foreign season; reroll decrements and stops at 0', () => {
    const run = newRun('maccabi-haifa', 11);
    assert.strictEqual(G.derbyBenchPick(run, run.xi[0].name), false);     // no draw yet
    const sq = G.derbyBenchDraw(run);
    assert.strictEqual(G.derbyBenchDraw(run).id, sq.id);                  // persisted draw
    const cands = G.derbyBenchCandidates(run, sq);
    assert.ok(cands.every(p => !run.xi.some(k => k.name === p.name)));
    assert.strictEqual(G.derbyBenchPick(run, 'Nobody At All'), false);
    for (let i = 0; i < 3; i++) { assert.strictEqual(G.derbyBenchReroll(run), true); assert.strictEqual(run.benchDraw, null); G.derbyBenchDraw(run); }
    assert.strictEqual(run.rerolls, 0);
    assert.strictEqual(G.derbyBenchReroll(run), false);
    assert.strictEqual(run.rerolls, 0);
    for (let i = 0; i < G.DERBY_BENCH; i++) {
      const s2 = G.derbyBenchDraw(run), c = G.derbyBenchCandidates(run, s2)[0].name;
      assert.ok(G.derbyBenchPick(run, c));
      assert.strictEqual(G.derbyBenchPick(run, c), false);               // draw cleared / already in
    }
    const names = run.xi.concat(run.bench).map(k => k.name);
    assert.strictEqual(new Set(names).size, 11 + G.DERBY_BENCH);
    assert.strictEqual(run.phase, 'rivals');
  });
  t('a full headless run: bench, rivals, three series in order, summary consistent', () => {
    const run = newRun('maccabi-tlv', 4242);
    draftBench(run);
    assert.strictEqual(run.phase, 'rivals');
    assert.deepStrictEqual(Object.keys(run.rivals).sort(), G.DERBY_RIVALS['maccabi-tlv'].slice().sort());
    Object.values(run.rivals).forEach(r => { assert.strictEqual(r.xi.length, 11); assert.strictEqual(r.bench.length, G.DERBY_BENCH); });
    assert.deepStrictEqual(run.series.map(s => s.rival), [G.derbySeriesRival('maccabi-tlv', 0)]);
    G.derbyBeginPlay(run);
    assert.strictEqual(run.phase, 'play');
    let guard = 0;
    while (run.phase !== 'done' && guard++ < 200) {
      const m = G.derbyGameStart(run);
      assert.ok(m && !m.over);
      assert.ok(run.live);
      while (!m.over) G.derbyGameStep(run, m);
      assert.strictEqual(run.live, null);
    }
    assert.strictEqual(run.phase, 'done');
    assert.strictEqual(run.series.length, 3);
    assert.deepStrictEqual(run.series.map(s => s.rival), [0, 1, 2].map(i => G.derbySeriesRival('maccabi-tlv', i)));
    run.series.forEach(s => { assert.ok(G.derbySeriesStatus(s.games).over); s.games.forEach((g, i) => assert.strictEqual(g.home, G.DERBY_GAME_HOME[i])); });
    const sum = G.derbyRunSummary(run.series);
    assert.ok(sum.over);
    assert.strictEqual(sum.seriesWon, run.series.filter(s => G.derbySeriesStatus(s.games).won).length);
    assert.strictEqual(G.derbyCurrent(run), null);
    assert.strictEqual(run.submitted, true);
  });
  t('save + reload mid-match continues to exactly the same match', () => {
    for (const seed of [7, 99, 2024]) {
      const base = newRun('maccabi-haifa', seed); draftBench(base); G.derbyBeginPlay(base);
      const snap = JSON.stringify(base);
      const play = (run, interrupt) => {
        let m = G.derbyGameStart(run);
        for (let i = 0; i < 3; i++) G.derbyGameStep(run, m);
        assert.strictEqual(m.min, 45);
        assert.ok(G.derbySetTactic(run, m, 'att'));
        // a like-for-like change at half-time: first bench man who fits an outfield slot
        let done = false;
        m.me.bench.forEach((b, bi) => m.me.picks.forEach((p, si) => {
          if (!done && si > 0 && G.playerFitsSlot(b.player, G.slotFitPos(m.me.slots[si])) && G.derbyMakeSub(run, m, si, bi)) done = true;
        }));
        if (interrupt) { run = G.derbyLoad(); m = G.derbyGameStart(run); }
        while (!m.over) G.derbyGameStep(run, m);
        return { run, m, subbed: done };
      };
      G.derbySave(JSON.parse(snap)); const a = play(G.derbyLoad(), false);
      G.derbySave(JSON.parse(snap)); const b = play(G.derbyLoad(), true);
      assert.ok(a.subbed && b.subbed && b.m.me.subs === 1);
      assert.strictEqual(b.m.gf, a.m.gf); assert.strictEqual(b.m.ga, a.m.ga);
      assert.deepStrictEqual(b.m.events, a.m.events);
      assert.deepStrictEqual(b.m.pens, a.m.pens);
      assert.deepStrictEqual(b.run.series, a.run.series);
      assert.strictEqual(G.derbyMakeSub(b.run, b.m, 1, 0), false);       // refused once over
      assert.strictEqual(G.derbySetTactic(b.run, b.m, 'def'), false);
    }
  });
  t('live save round-trips every engine field', () => {
    const run = newRun('hapoel-tlv', 5); draftBench(run); G.derbyBeginPlay(run);
    const m = G.derbyGameStart(run);
    G.derbyGameStep(run, m); G.derbyGameStep(run, m);
    const L = JSON.parse(JSON.stringify(G.derbyLiveSave(m)));
    G.derbySave(run);
    const m2 = G.derbyGameStart(G.derbyLoad());
    for (const k of ['min', 'gf', 'ga', 'home', 'seed', 'over', 'won', 'pens']) assert.deepStrictEqual(m2[k], m[k], k);
    assert.deepStrictEqual(m2.events, m.events);
    for (const side of ['me', 'opp']) for (const k of ['chances', 'subs', 'windows', 'lastWin', 'tactic'])
      assert.deepStrictEqual(m2[side][k], m[side][k], side + k);
    assert.deepStrictEqual(G.derbyLiveSave(m2), L);
  });

  // ── Task 8: the migration knows the same clubs ─────────────────────────────
  t('submit_derby_run\'s v_known == derbyClubs()', () => {
    const sql = read('supabase/migrations/20261005000002_derby_champions.sql');
    const m = sql.match(/v_known\s+text\[\]\s*:=\s*ARRAY\[([^\]]+)\]/);
    assert.ok(m, 'v_known not found');
    const known = m[1].match(/'([^']+)'/g).map(s => s.slice(1, -1)).sort();
    assert.deepStrictEqual(known, G.derbyClubs().slice().sort());
  });

  // ── Task V6: migration v2 mirrors the JS ───────────────────────────────────
  const V6 = () => read('supabase/migrations/20261005000002_derby_champions.sql');
  t('v_rivals == derbySeriesRival in play order, for every club', () => {
    const m = V6().match(/v_rivals\s+jsonb\s*:=\s*'(\{[^']*\})'::jsonb/);
    assert.ok(m, 'v_rivals not found');
    const sqlRivals = JSON.parse(m[1]);
    const want = {};
    for (const c of G.derbyClubs()) want[c] = [0, 1, 2].map(s => G.derbySeriesRival(c, s));
    assert.deepStrictEqual(sqlRivals, want);
  });
  t('v_underdog == DERBY_UNDERDOGS', () => {
    const m = V6().match(/v_underdog\s+text\[\]\s*:=\s*ARRAY\[([^\]]+)\]/);
    assert.ok(m, 'v_underdog not found');
    const got = m[1].match(/'([^']+)'/g).map(s => s.slice(1, -1)).sort();
    assert.deepStrictEqual(got, G.DERBY_UNDERDOGS.slice().sort());
  });
  t('every achievement key inserted is awarded by array_append, and vice versa', () => {
    const sql = V6();
    const ins = sql.match(/INSERT INTO achievements[\s\S]*?ON CONFLICT/)[0];
    const inserted = [...ins.matchAll(/\('(dc_\w+)'/g)].map(x => x[1]).sort();
    const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    const appended = [...new Set([...code.matchAll(/array_append\(earned,\s*'(dc_\w+)'\)/g)].map(x => x[1]))].sort();
    assert.strictEqual(inserted.length, 10);
    assert.deepStrictEqual(appended, inserted);
  });
  t('no `|| \'` concatenation onto an array in the SQL code', () => {
    const code = V6().split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    assert.ok(!/\|\|\s*'/.test(code), 'found || \' in code');
  });

  t('SQL casts w/l via ::numeric::int, rejects non-integers, stores a rebuilt series', () => {
    const code = V6().split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    assert.ok(/\(v_el->>'w'\)::numeric::int/.test(code) && /\(v_el->>'l'\)::numeric::int/.test(code));
    assert.ok(!/\(v_el->>'[wl]'\)::int/.test(code), 'direct ::int cast');
    assert.ok(/<> trunc\(\(v_el->>'w'\)::numeric\)/.test(code));
    assert.ok(/VALUES \(uid, v_club, v_diff, v_clean,/.test(code), 'raw series stored');
    assert.ok(/v_supersub AND v_sum_w >= 1/.test(code));
  });

  console.log(`\n${n} passed`);
}
