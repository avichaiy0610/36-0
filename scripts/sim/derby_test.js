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
  'derbyEntryKey', 'derbyEntry', 'derbySave', 'derbyLoad', 'derbyBenchAdd', 'derbyFinishSquad', 'derbyInBench',
  'derbyBeginPlay', 'derbyCurrent', 'derbyGameStart', 'derbyGameStep', 'derbyLiveSave', 'derbyLiveLoad', 'derbySetTactic', 'derbyMakeSub',
  'FORMATIONS', 'derbySetFormation', 'derbySwap', 'derbyPreSwap', 'derbySetFormationMine', 'derbySwapMine', 'derbyPreSwapMine', 'derbyAutoTactic', 'localStorage',
  'DERBY_ENERGY_DRAIN', 'DERBY_ENERGY_FREE', 'DERBY_RECOVER_GAME', 'DERBY_RECOVER_SERIES', 'DERBY_ROTATE_BELOW',
  'derbyEnergyPenalty', 'derbyEnergyLevel', 'derbyEnergyAt', 'derbyEnergyAfter', 'derbyRotate', 'derbyEnergyMaps',
  'derbySnapshot', 'derbyRestore', 'derbySnapChanged', 'derbyMarkStop', 'derbyCanUndo', 'derbyUndoMine', 'inNaturalPos', 'derbyUndoSub', 'derbyResub', 'derbyUndoSubMine', 'derbyResubMine', 'derbyOffFor'];

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
    assert.ok(Math.abs(G.derbyFatigue({ on: 0 }, 90) - 2) <= 0.5, 'fresh 90\' ≈ −2');
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
  t('a sub may go in any slot (93% out of position); only strictly inside the match', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    const bi = m.me.bench.findIndex(b => !G.playerFitsSlot(b.player, 'GK'));
    assert.ok(bi >= 0);
    const before = G.derbyLinesFor(m.me.picks, m.me.slots, 'bal', 60);
    assert.ok(G.derbySub(m.me, 0, bi, 60), 'an outfielder in goal is allowed');
    const after = G.derbyLinesFor(m.me.picks, m.me.slots, 'bal', 60);
    assert.ok(after.gk < before.gk && after.ovr < before.ovr, 'the out-of-position penalty shows in the lines');
    const m2 = G.derbyMatchNew(xiA, xiB, true, 5);
    assert.ok(!sub(m2.me, 3, 0) && !sub(m2.me, 3, 90), 'minute bounds');
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
    const other = m.me.picks.findIndex((p, i) => i > 0 && i !== subSlot && !p.on);   // an outfielder (a keeper drains slower)
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
  // The XI is drafted by the computer here; the bench goes through the same pure
  // helpers the draft screen's bench rounds use (derbyBenchAdd, derbyFinishSquad).
  const newRun = (club, seed) => {
    const fid = '4-3-3', diff = 'normal';
    const d = G.derbyAiDraft(club, fid, diff, G.derbyRng(seed));
    return { v: 2, club, difficulty: diff, formationId: fid, tactic: 'bal', seed, phase: 'draft',
      xi: d.picks.map(G.derbyEntryKey), bench: [], rerolls: G.DERBY_REROLLS,
      rivals: null, series: [], live: null, submitted: false };
  };
  // One bench round: the first season not yet drawn, its best man not yet taken.
  const benchRound = (run, used) => {
    const seasons = G.derbySeasonsOf(run.club);
    const sq = seasons.find(s => !used.has(s.id)) || seasons[0];
    used.add(sq.id);
    const taken = new Set(run.xi.concat(run.bench).map(k => k.name));
    const p = sq.players.filter(x => !taken.has(x.name)).sort((a, b) => G.playerOVR(b) - G.playerOVR(a))[0];
    return p ? { player: p, squad: sq } : benchRound(run, used);
  };
  const draftBench = run => {
    const used = new Set(run.xi.map(k => k.squadId));
    for (let i = 0; i < G.DERBY_BENCH; i++) assert.ok(G.derbyBenchAdd(run, benchRound(run, used)));
    assert.ok(G.derbyFinishSquad(run));
  };
  t('a v1 run in storage is dropped by derbyLoad', () => {
    G.localStorage.setItem('36-0-derby', JSON.stringify({ v: 1, club: 'maccabi-haifa' }));
    assert.strictEqual(G.derbyLoad(), null);
    G.localStorage.removeItem('36-0-derby');
  });
  t('bench add never repeats a man, refuses an unknown one and a full bench; finish needs 11+7', () => {
    const run = newRun('maccabi-haifa', 11);
    const xi0 = G.derbyEntry(run.xi[0]);
    assert.strictEqual(G.derbyBenchAdd(run, xi0), false);                  // already in the XI
    assert.strictEqual(G.derbyBenchAdd(run, { player: { name: 'Nobody At All' }, squad: xi0.squad }), false);
    assert.strictEqual(G.derbyFinishSquad(run), false);                    // bench empty
    const used = new Set();
    for (let i = 0; i < G.DERBY_BENCH; i++) {
      const e = benchRound(run, used);
      assert.ok(G.derbyBenchAdd(run, e));
      assert.strictEqual(G.derbyBenchAdd(run, e), false);                 // already on the bench
      assert.strictEqual(run.phase, 'draft');
    }
    assert.strictEqual(G.derbyBenchAdd(run, benchRound(run, used)), false);   // full
    const names = run.xi.concat(run.bench).map(k => k.name);
    assert.strictEqual(new Set(names).size, 11 + G.DERBY_BENCH);
    assert.ok(G.derbyFinishSquad(run));
    assert.strictEqual(run.phase, 'rivals');
  });
  t('the draft screen bench rounds: derbyInBench follows state.derby.bench, keys survive JSON', () => {
    const saved = G.state.derby;
    G.state.derby = { club: 'maccabi-haifa' };
    assert.strictEqual(G.derbyInBench(), false);                           // still drafting the XI
    G.state.derby.bench = [];
    assert.strictEqual(G.derbyInBench(), true);
    const run = newRun('maccabi-haifa', 12), used = new Set();
    for (let i = 0; i < G.DERBY_BENCH; i++) {
      const e = benchRound(run, used);
      assert.ok(G.derbyBenchAdd(G.state.derby, e)); run.bench.push(G.derbyEntryKey(e));
      const back = JSON.parse(JSON.stringify(G.state.derby)).bench.map(G.derbyEntry);
      assert.strictEqual(back[i].player, e.player);
    }
    assert.strictEqual(G.derbyInBench(), false);                           // full: hand off
    G.state.derby = saved;
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

  // ── V3: stop at any minute, chance-seeded, formations and line-ups ─────────
  t('1-minute steps and 15-minute steps give the identical match (autoMe or not)', () => {
    for (const auto of [false, true]) for (let s = 1; s <= 150; s++) {
      const a = G.derbyMatchNew(xiA, xiB, s % 2 === 0, s), b = G.derbyMatchNew(xiA, xiB, s % 2 === 0, s);
      while (!a.over) G.derbyMatchStep(a, auto);
      while (!b.over) G.derbyMatchStep(b, auto, b.min + 1);
      assert.deepStrictEqual([b.gf, b.ga, b.won, b.pens, b.events, b.me.subs, b.opp.subs],
        [a.gf, a.ga, a.won, a.pens, a.events, a.me.subs, a.opp.subs], 'seed ' + s + ' auto ' + auto);
    }
  });
  t('an odd step pattern (7-minute steps, then to the end) is identical too', () => {
    for (let s = 1; s <= 60; s++) {
      const a = G.derbyMatchNew(xiA, xiB, true, s), b = G.derbyMatchNew(xiA, xiB, true, s);
      while (!a.over) G.derbyMatchStep(a, true);
      while (!b.over) G.derbyMatchStep(b, true, b.min < 56 ? b.min + 7 : 90);
      assert.deepStrictEqual([b.gf, b.ga, b.events], [a.gf, a.ga, a.events], 'seed ' + s);
    }
  });
  t('a step never jumps over 45, 60, 75 or 90', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 3);
    G.derbyMatchStep(m, false, 40); assert.strictEqual(m.min, 40);
    G.derbyMatchStep(m, false, 80); assert.strictEqual(m.min, 45);
    G.derbyMatchStep(m, false, 90); assert.strictEqual(m.min, 60);
    G.derbyMatchStep(m, false, 90); assert.strictEqual(m.min, 75);
    G.derbyMatchStep(m, false, 89); assert.strictEqual(m.min, 89);
    G.derbyMatchStep(m, false, 90); assert.strictEqual(m.min, 90); assert.ok(m.over);
    const d = G.derbyMatchNew(xiA, xiB, true, 3);        // no `to`: the next 15-minute boundary
    G.derbyMatchStep(d, false, 22); G.derbyMatchStep(d, false); assert.strictEqual(d.min, 30);
    G.derbyMatchStep(d, false, 22); assert.strictEqual(d.min, 45);   // to <= from is ignored: the default boundary
  });
  t('derbySetFormation: the same eleven men re-seated, slots match the new shape', () => {
    for (const f of Object.keys(G.FORMATIONS)) {
      const m = G.derbyMatchNew(xiA, xiB, true, 5);
      const names = m.me.picks.map(p => p.player.name).sort();
      assert.ok(G.derbySetFormation(m.me, f, 0), f);
      assert.strictEqual(m.me.picks.length, 11);
      assert.ok(m.me.picks.every(Boolean), f);
      assert.deepStrictEqual(m.me.picks.map(p => p.player.name).sort(), names, f);
      assert.deepStrictEqual(m.me.slots, G.formationSlots(f, 'bal'));
      assert.strictEqual(m.me.formationId, f);
      assert.strictEqual(m.me.subs, 0); assert.strictEqual(m.me.windows, 0);
      assert.ok(G.playerFitsSlot(m.me.picks[0].player, 'GK'), 'keeper stays in goal ' + f);
    }
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    assert.ok(G.derbySetFormation(m.me, '4-4-2', 59));
    assert.ok(!G.derbySetFormation(m.me, '4-4-2', 90) && !G.derbySetFormation(m.me, 'nope', 10));
  });
  t('a formation change keeps a sub\'s fresh legs', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    assert.ok(sub(m.me, 3, 60));
    const subName = m.me.picks[subSlot].player.name;
    G.derbySetFormation(m.me, '3-5-2', 60);
    assert.strictEqual(m.me.picks.find(p => p.player.name === subName).on, 60);
  });
  t('derbySwap swaps two men on the pitch, free', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    const a = m.me.picks[3], b = m.me.picks[9];
    assert.ok(G.derbySwap(m.me, 3, 9));
    assert.strictEqual(m.me.picks[3], b); assert.strictEqual(m.me.picks[9], a);
    assert.strictEqual(m.me.subs, 0); assert.strictEqual(m.me.windows, 0);
    assert.ok(!G.derbySwap(m.me, 3, 3) && !G.derbySwap(m.me, 3, 11));
  });
  t('derbyPreSwap: only at 0 minutes, not a sub, the man in starts, the starter goes to the bench', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    const out = m.me.picks[4].player.name, inn = m.me.bench[2].player.name;
    assert.ok(G.derbyPreSwap(m.me, 4, 2, m.min));
    assert.strictEqual(m.me.picks[4].player.name, inn); assert.strictEqual(m.me.picks[4].on, 0);
    assert.strictEqual(m.me.bench[2].player.name, out);
    assert.strictEqual(m.me.bench.length, G.DERBY_BENCH); assert.strictEqual(m.me.off.length, 0);
    assert.strictEqual(m.me.subs, 0); assert.strictEqual(m.me.windows, 0);
    G.derbyMatchStep(m, false, 10);
    assert.ok(!G.derbyPreSwap(m.me, 4, 2, m.min), 'refused after kick-off');
    assert.ok(!G.derbyPreSwap(G.derbyMatchNew(xiA, xiB, true, 5).me, 4, 99, 0));
  });
  t('v3 run layer: pre-kick changes become the run default; mid-match save/reload after a formation change + swap is exact', () => {
    for (const seed of [7, 99, 2024]) {
      const base = newRun('maccabi-haifa', seed); draftBench(base); G.derbyBeginPlay(base);
      const snap = JSON.stringify(base);
      const play = (run, interrupt) => {
        let m = G.derbyGameStart(run);
        assert.ok(G.derbyPreSwapMine(run, m, 5, 0));
        assert.ok(G.derbySetFormationMine(run, m, '4-4-2'));
        assert.strictEqual(run.formationId, '4-4-2');
        assert.deepStrictEqual(run.xi, m.me.picks.map(G.derbyEntryKey));
        assert.deepStrictEqual(run.bench, m.me.bench.map(G.derbyEntryKey));
        G.derbyGameStep(run, m, 38); assert.strictEqual(m.min, 38);
        G.derbyGameStep(run, m, 80); assert.strictEqual(m.min, 45);
        assert.ok(G.derbySetFormationMine(run, m, '3-5-2'));
        assert.ok(G.derbySwapMine(run, m, 2, 8));
        assert.strictEqual(run.formationId, '4-4-2', 'a mid-match change is not the default');
        assert.ok(!G.derbyPreSwapMine(run, m, 5, 0), 'no free swap after kick-off');
        G.derbyGameStep(run, m, 52);
        if (interrupt) { run = G.derbyLoad(); m = G.derbyGameStart(run); assert.strictEqual(m.me.formationId, '3-5-2'); }
        assert.deepStrictEqual(m.me.slots, G.formationSlots('3-5-2', 'bal'));
        assert.strictEqual(m.opp.formationId, '4-3-3');
        while (!m.over) G.derbyGameStep(run, m, m.min + 1);
        assert.strictEqual(G.derbySwapMine(run, m, 1, 2), false);
        assert.strictEqual(G.derbySetFormationMine(run, m, '4-3-3'), false);
        return { run, m };
      };
      G.derbySave(JSON.parse(snap)); const a = play(G.derbyLoad(), false);
      G.derbySave(JSON.parse(snap)); const b = play(G.derbyLoad(), true);
      assert.strictEqual(b.m.gf, a.m.gf); assert.strictEqual(b.m.ga, a.m.ga);
      assert.deepStrictEqual(b.m.events, a.m.events);
      assert.deepStrictEqual(b.run.series, a.run.series);
      assert.strictEqual(b.run.formationId, '4-4-2');
    }
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

  // ── V4 (spec §11): energy carried between games, undo at a stop ──────────
  const GK = G.SQUADS[0].players.find(p => p.position === 'GK') || { position: 'GK' };
  const OUT = { position: 'CM' };
  t('energy drains 0.45 a minute on the pitch, a keeper a third of that; off the pitch it stops', () => {
    assert.strictEqual(G.derbyEnergyAt({ player: OUT, e0: 100, on: 0 }, 10), 95.5);
    assert.ok(Math.abs(G.derbyEnergyAt({ player: OUT, e0: 100, on: 0 }, 90) - 59.5) < 1e-9);
    assert.ok(Math.abs(G.derbyEnergyAt({ player: GK, e0: 100, on: 0 }, 90) - 86.5) < 1e-9);
    assert.strictEqual(G.derbyEnergyAt({ player: OUT, e0: 80, on: 60 }, 60), 80);
    assert.ok(Math.abs(G.derbyEnergyAt({ player: OUT, e0: 80, on: 60 }, 90) - 66.5) < 1e-9);
    assert.ok(Math.abs(G.derbyEnergyAt({ player: OUT, e0: 100, on: 0, offAt: 60 }, 90) - 73) < 1e-9);
    assert.strictEqual(G.derbyEnergyAt({ player: OUT }, 0), 100);                 // no e0: fresh
    assert.strictEqual(G.derbyEnergyAt({ player: OUT, e0: 10, on: 0 }, 90), 0);   // never below 0
  });
  t('penalty: 0 at 75 and above, growing and steepening below; fresh 90\' ≈ −2', () => {
    for (const e of [75, 80, 100]) assert.strictEqual(G.derbyEnergyPenalty(e), 0);
    let prev = 0, prevStep = 0;
    for (let e = 74; e >= 0; e--) {
      const p = G.derbyEnergyPenalty(e);
      assert.ok(p > prev, 'monotonic at ' + e);
      assert.ok(p - prev >= prevStep - 1e-12, 'steepening at ' + e);
      prevStep = p - prev; prev = p;
    }
    const fresh = G.derbyFatigue({ player: OUT, e0: 100, on: 0 }, 90);
    assert.ok(Math.abs(fresh - 2) <= 0.5, 'fresh 90\' ' + fresh);
    const from70 = G.derbyFatigue({ player: OUT, e0: 70, on: 0 }, 90);
    assert.ok(from70 > 5 && from70 < 8, 'from 70: ' + from70);
    assert.deepStrictEqual([85, 79, 60, 59, 40, 39].map(e => G.derbyEnergyLevel(e).word),
      ['רענן', 'עייף', 'עייף', 'עייף מאוד', 'עייף מאוד', 'מותש']);
  });
  t('recovery: +30 between games (cap 100), a man who did not play back to 100, +60 between series', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    const sid = 3, bi = 0;
    assert.ok(G.derbySub(m.me, sid, bi, 60));
    while (!m.over) G.derbyMatchStep(m, false);
    const map = {};
    [...xiA.picks, ...xiA.bench].forEach(p => { map[p.player.name] = 100; });
    const full = m.me.picks.find((p, i) => i > 0 && !p.on), sub = m.me.picks[sid], off = m.me.off[0];
    const unused = m.me.bench[0];
    G.derbyEnergyAfter(m.me, map, G.DERBY_RECOVER_GAME);
    assert.strictEqual(map[full.player.name], 89.5);            // ended 59.5 → 89.5: not exhausted next game
    assert.strictEqual(map[sub.player.name], 100);              // 30' on: 86.5 + 30, capped
    assert.strictEqual(map[off.player.name], 100);              // off at 60: 73 + 30, capped
    assert.strictEqual(map[unused.player.name], 100);
    assert.strictEqual(map[m.me.picks[0].player.name], 100);    // the keeper: 86.5 + 30
    const map2 = {}; Object.keys(map).forEach(k => { map2[k] = 100; });
    const m2 = G.derbyMatchNew(Object.assign({}, xiA, { picks: xiA.picks.map(p => Object.assign({}, p, { e0: 50 })) }), xiB, true, 6);
    while (!m2.over) G.derbyMatchStep(m2, false);
    const a = Object.assign({}, map2), b = Object.assign({}, map2);
    G.derbyEnergyAfter(m2.me, a, G.DERBY_RECOVER_GAME); G.derbyEnergyAfter(m2.me, b, G.DERBY_RECOVER_SERIES);
    const st = m2.me.picks[5].player.name;
    assert.strictEqual(a[st], 39.5);                           // 50 − 40.5 + 30
    assert.strictEqual(b[st], 69.5);                           // 50 − 40.5 + 60
  });
  t('the computer rests a tired starter for a better-rested bench man who fits; never a sub', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    // a starter at 30 whose slot a bench man fits
    let si = -1, bi = -1;
    for (let i = 1; i < 11 && si < 0; i++) {
      const j = m.opp.bench.findIndex(b => G.inNaturalPos(b.player, m.opp.slots[i].pos));
      if (j >= 0) { si = i; bi = j; }
    }
    assert.ok(si > 0);
    const tired = m.opp.picks[si].player.name, fresh = m.opp.bench[bi].player.name;
    m.opp.picks[si].e0 = 20;
    m.opp.picks.forEach((p, i) => { if (i !== si) p.e0 = 90; });
    assert.ok(G.derbyRotate(m.opp) >= 1);
    assert.ok(m.opp.bench.some(b => b.player.name === tired), 'the tired man is on the bench');
    assert.ok(m.opp.picks.every(p => p.player.name !== tired));
    assert.ok(G.inNaturalPos(m.opp.picks[si].player, m.opp.slots[si].pos));
    assert.strictEqual(m.opp.picks[si].on, 0);
    assert.strictEqual(m.opp.subs, 0); assert.strictEqual(m.opp.windows, 0);
    assert.ok(fresh);
    // nobody under 55: nothing moves
    const m2 = G.derbyMatchNew(xiA, xiB, true, 5);
    const names = m2.opp.picks.map(p => p.player.name).join();
    m2.opp.picks.forEach(p => { p.e0 = 60; });
    assert.strictEqual(G.derbyRotate(m2.opp), 0);
    assert.strictEqual(m2.opp.picks.map(p => p.player.name).join(), names);
  });
  t('a run carries energy: game 2 starts from game 1\'s end + 30, both sides; series end → +60', () => {
    const run = newRun('maccabi-haifa', 314); draftBench(run); G.derbyBeginPlay(run);
    assert.ok(Object.values(run.energy).every(e => e === 100) && Object.keys(run.energy).length === 18);
    Object.values(run.rivalEnergy).forEach(mp => assert.strictEqual(Object.keys(mp).length, 18));
    let m = G.derbyGameStart(run);
    while (!m.over) G.derbyGameStep(run, m);
    const starters = m.me.picks.filter((p, i) => i > 0 && !p.on).map(p => p.player.name);
    starters.forEach(n => assert.strictEqual(run.energy[n], 89.5, n));
    m = G.derbyGameStart(run);
    m.me.picks.forEach(p => assert.strictEqual(p.e0, run.energy[p.player.name]));
    m.me.bench.forEach(b => assert.strictEqual(b.e0, run.energy[b.player.name]));
    const rv = run.rivalEnergy[m.rival];
    m.opp.picks.forEach(p => assert.strictEqual(p.e0, rv[p.player.name]));
    // play the series out; between series everyone gets +60
    let guard = 0;
    while (run.series.length < 2 && guard++ < 10) { while (!m.over) G.derbyGameStep(run, m); if (run.series.length < 2) m = G.derbyGameStart(run); }
    // m is the series' last game: its men got +60, not +30
    m.me.picks.concat(m.me.off).forEach(p => assert.strictEqual(run.energy[p.player.name],
      Math.min(100, Math.round((G.derbyEnergyAt(p, 90) + G.DERBY_RECOVER_SERIES) * 10) / 10), p.player.name));
    assert.ok(m.me.picks.some(p => G.derbyEnergyAt(p, 90) + 30 < 100), 'someone for whom +30 and +60 differ');
    m.me.bench.forEach(b => assert.strictEqual(run.energy[b.player.name], 100));
  });
  t('save + reload mid-match keeps every man\'s e0, on and offAt', () => {
    const run = newRun('hapoel-tlv', 77); draftBench(run); G.derbyBeginPlay(run);
    run.energy[G.derbyEntry(run.xi[4]).player.name] = 63;
    run.energy[G.derbyEntry(run.bench[1]).player.name] = 71;
    const m = G.derbyGameStart(run);
    G.derbyGameStep(run, m, 45);
    let done = false;
    m.me.bench.forEach((b, bi) => m.me.picks.forEach((p, si) => {
      if (!done && si > 0 && G.playerFitsSlot(b.player, G.slotFitPos(m.me.slots[si])) && G.derbyMakeSub(run, m, si, bi)) done = true;
    }));
    G.derbyGameStep(run, m, 52);
    const m2 = G.derbyGameStart(G.derbyLoad());
    const k = s => s.picks.concat(s.bench, s.off).map(p => [p.player.name, p.e0, p.on || 0, p.offAt ?? null]);
    assert.deepStrictEqual(k(m2.me), k(m.me)); assert.deepStrictEqual(k(m2.opp), k(m.opp));
    assert.ok(m2.me.picks.some(p => p.e0 === 63));
    assert.strictEqual(m2.me.off[0].offAt, 45);
  });
  t('undo at a stop restores the side exactly; an all-undone stop uses no window', () => {
    const run = newRun('maccabi-haifa', 909); draftBench(run); G.derbyBeginPlay(run);
    const m = G.derbyGameStart(run);
    G.derbyGameStep(run, m, 30);
    assert.ok(G.derbyMarkStop(run, m));
    assert.ok(!G.derbyCanUndo(m), 'nothing to undo yet');
    const before = JSON.stringify(G.derbyLiveSave(m).me);
    assert.ok(G.derbySetTactic(run, m, 'att'));
    assert.ok(G.derbySetFormationMine(run, m, '4-4-2'));
    assert.ok(G.derbySwapMine(run, m, 2, 3));
    assert.ok(G.derbyMakeSub(run, m, 5, 0) || G.derbyMakeSub(run, m, 6, 1));
    assert.strictEqual(m.me.windows, 1); assert.strictEqual(m.me.subs, 1);
    assert.ok(G.derbyCanUndo(m));
    assert.ok(G.derbyUndoMine(run, m));
    assert.strictEqual(JSON.stringify(G.derbyLiveSave(m).me), before);
    assert.strictEqual(m.me.windows, 0); assert.strictEqual(m.me.subs, 0); assert.strictEqual(m.me.lastWin, -1);
    assert.strictEqual(JSON.stringify(G.derbyLoad().live.me), before, 'saved too');
    // three more stops with a sub each still possible: the undone stop cost nothing
    for (const min of [35, 50, 70]) {
      while (m.min < min) G.derbyGameStep(run, m, min);
      G.derbyMarkStop(run, m);
      let ok = false;
      m.me.bench.forEach((b, bi) => { if (!ok) for (let si = 1; si < 11 && !ok; si++) ok = G.derbyMakeSub(run, m, si, bi); });
      assert.ok(ok, 'sub at ' + min);
    }
    assert.strictEqual(m.me.windows, 3);
    // a stop with no snapshot of this minute (play went on) cannot be undone
    G.derbyGameStep(run, m, 72);
    assert.ok(!G.derbyCanUndo(m) && !G.derbyUndoMine(run, m));
  });
  t('undo before kick-off restores the line-up, shape and the run default', () => {
    const run = newRun('maccabi-tlv', 4343); draftBench(run); G.derbyBeginPlay(run);
    const m = G.derbyGameStart(run);
    G.derbyMarkStop(run, m);
    const xi = JSON.stringify(run.xi), bench = JSON.stringify(run.bench), f = run.formationId;
    assert.ok(G.derbyPreSwapMine(run, m, 5, 0));
    assert.ok(G.derbySetFormationMine(run, m, '3-5-2'));
    assert.strictEqual(run.formationId, '3-5-2');
    assert.ok(G.derbyUndoMine(run, m));
    assert.strictEqual(JSON.stringify(run.xi), xi); assert.strictEqual(JSON.stringify(run.bench), bench);
    assert.strictEqual(run.formationId, f); assert.strictEqual(m.me.formationId, f);
    // the snapshot survives a refresh at the same stop
    assert.ok(G.derbyPreSwapMine(run, m, 6, 1));
    const m2 = G.derbyGameStart(G.derbyLoad());
    assert.ok(G.derbyCanUndo(m2));
  });

  // ── after v4: a single sub undone at its stop; re-sub ──────────────────────
  // Two like-for-like subs at the same minute (outfield, fitting): returns [slot, slot].
  const twoSubs = (side, min) => {
    const done = [];
    for (let si = 1; si < 11 && done.length < 2; si++) {
      const bi = side.bench.findIndex(b => G.playerFitsSlot(b.player, G.slotFitPos(side.slots[si])));
      if (bi >= 0 && G.derbySub(side, si, bi, min)) done.push(si);
    }
    return done;
  };
  const sideKey = s => JSON.stringify([s.picks.map(p => [p.player.name, p.on || 0, p.e0]), s.bench.map(b => [b.player.name, b.e0]),
    s.off.map(o => o.player.name), s.subs, s.windows, s.lastWin]);
  t('undo one of two subs at a stop restores exactly that one; undoing both gives the window back', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    m.me.picks.forEach((p, i) => { p.e0 = 70 + i; }); m.me.bench.forEach((b, i) => { b.e0 = 80 + i; });
    assert.ok(G.derbySub(m.me, 2, 0, 20));                       // an earlier stop
    const before = sideKey(m.me);
    const slots = twoSubs(m.me, 33);
    assert.strictEqual(slots.length, 2);
    const mid = JSON.parse(JSON.stringify([m.me.picks[slots[0]].player.name]));
    assert.strictEqual(m.me.subs, 3); assert.strictEqual(m.me.windows, 2);
    // swap the second replacement to another slot first: undo still finds him
    assert.ok(G.derbySwap(m.me, slots[1], 9));
    const o2 = m.me.off.findIndex(o => o.offAt === 33 && o.inName === m.me.picks[9].player.name);
    const name2 = m.me.off[o2].player.name, e2 = m.me.off[o2].e0, in2 = m.me.off[o2].inName;
    assert.ok(G.derbyUndoSub(m.me, o2, 33));
    assert.strictEqual(m.me.picks[9].player.name, name2); assert.strictEqual(m.me.picks[9].e0, e2); assert.strictEqual(m.me.picks[9].on, 0);
    assert.ok(m.me.bench.some(b => b.player.name === in2));
    assert.strictEqual(m.me.subs, 2); assert.strictEqual(m.me.windows, 2, 'the other sub still holds the window');
    assert.strictEqual(m.me.picks[slots[0]].player.name, mid[0]);
    G.derbySwap(m.me, slots[1], 9);                              // put the swap back
    const o1 = m.me.off.findIndex(o => o.offAt === 33);
    assert.ok(G.derbyUndoSub(m.me, o1, 33));
    assert.strictEqual(sideKey(m.me), before, 'exactly as before the stop');
    assert.strictEqual(m.me.windows, 1); assert.strictEqual(m.me.lastWin, 20);
  });
  t('a sub from an earlier stop cannot be undone; a half-time sub undone leaves the windows alone', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    assert.ok(G.derbySub(m.me, 2, 0, 20));
    assert.ok(!G.derbyUndoSub(m.me, 0, 33) && !G.derbyUndoSub(m.me, 0, 21));
    assert.strictEqual(m.me.subs, 1);
    assert.ok(G.derbySub(m.me, 3, 0, 45));
    assert.ok(G.derbyUndoSub(m.me, 1, 45));
    assert.strictEqual(m.me.windows, 1); assert.strictEqual(m.me.lastWin, 20); assert.strictEqual(m.me.subs, 1);
  });
  t('replace the replacement: one sub, one window, the first replacement back on the bench', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    assert.ok(G.derbySub(m.me, 4, 0, 33));
    const first = m.me.picks[4].player.name, out = m.me.off[0].player.name;
    const nb = m.me.bench[2].player.name;
    assert.ok(G.derbyResub(m.me, 0, 2, 33));
    assert.strictEqual(m.me.picks[4].player.name, nb); assert.strictEqual(m.me.picks[4].on, 33);
    assert.strictEqual(m.me.off.length, 1); assert.strictEqual(m.me.off[0].player.name, out); assert.strictEqual(m.me.off[0].inName, nb);
    assert.ok(m.me.bench.some(b => b.player.name === first));
    assert.strictEqual(m.me.subs, 1); assert.strictEqual(m.me.windows, 1);
    assert.ok(G.derbyUndoSub(m.me, 0, 33));                      // and that one undoes cleanly too
    assert.strictEqual(m.me.subs, 0); assert.strictEqual(m.me.windows, 0); assert.strictEqual(m.me.picks[4].player.name, out);
    assert.strictEqual(m.me.bench.length, G.DERBY_BENCH);
  });
  t('a single-sub undo and a re-sub survive save/reload at the stop', () => {
    let run = newRun('maccabi-haifa', 515); draftBench(run); G.derbyBeginPlay(run);
    let m = G.derbyGameStart(run);
    G.derbyGameStep(run, m, 37); G.derbyMarkStop(run, m);
    let ok = 0;
    m.me.bench.forEach((b, bi) => { for (let si = 1; si < 11 && ok < 2; si++) if (G.playerFitsSlot(b.player, G.slotFitPos(m.me.slots[si])) && G.derbyMakeSub(run, m, si, bi)) { ok++; break; } });
    assert.strictEqual(ok, 2);
    m = G.derbyGameStart(G.derbyLoad());                        // refresh at the stop
    assert.ok(m.me.off[0].inName); assert.strictEqual(m.me.off[0].prevWindows, 0); assert.strictEqual(m.me.off[1].prevWindows, 0);
    assert.ok(G.derbyUndoSubMine(run = G.derbyLoad(), m, 0));
    m = G.derbyGameStart(G.derbyLoad()); run = G.derbyLoad();
    assert.strictEqual(m.me.subs, 1); assert.strictEqual(m.me.windows, 1);
    assert.ok(G.derbyResubMine(run, m, 0, 0));
    m = G.derbyGameStart(G.derbyLoad()); run = G.derbyLoad();
    assert.strictEqual(m.me.subs, 1); assert.strictEqual(m.me.windows, 1);
    assert.ok(G.derbyUndoSubMine(run, m, 0));
    m = G.derbyGameStart(G.derbyLoad());
    assert.strictEqual(m.me.subs, 0); assert.strictEqual(m.me.windows, 0); assert.strictEqual(m.me.lastWin, -1);
    G.derbyGameStep(run = G.derbyLoad(), m, 50);
    assert.ok(!G.derbyUndoSubMine(run, m, 0));
  });

  t('tap either side of a sub: derbyOffFor finds the sub from its replacement; any other man → -1', () => {
    for (const stop of [37, 45]) {                                  // a paused odd minute, and half-time
      const run = newRun('maccabi-haifa', 616); draftBench(run); G.derbyBeginPlay(run);
      const m = G.derbyGameStart(run);
      while (m.min < stop) G.derbyGameStep(run, m, stop);
      assert.strictEqual(m.min, stop);
      G.derbyMarkStop(run, m);
      const subAt = (si, bi) => assert.ok(G.derbyMakeSub(run, m, si, bi));
      subAt(7, 0); subAt(4, 0);
      const y7 = m.me.picks[7].player.name;
      assert.ok(m.me.off.every(o => o.offAt === m.min));
      // (a)/(b): slot 7's replacement maps to the man he replaced, whichever is tapped first
      const oi = G.derbyOffFor(m, 7);
      assert.ok(oi >= 0 && m.me.off[oi].inName === y7);
      const x = m.me.off[oi].player.name;
      // (e): a different man on the pitch is not his replacement
      assert.strictEqual(G.derbyOffFor(m, 2), -1);
      assert.notStrictEqual(G.derbyOffFor(m, 4), oi);
      assert.ok(G.derbyUndoSubMine(run, m, oi));
      assert.strictEqual(m.me.picks[7].player.name, x);
      assert.ok(m.me.bench.some(b => b.player.name === y7));
      assert.strictEqual(m.me.subs, 1);
      assert.strictEqual(m.me.windows, stop === 45 ? 0 : 1);
      assert.strictEqual(G.derbyOffFor(m, 7), -1);
      // after play goes on, the replacement no longer maps to anything
      G.derbyGameStep(run, m, stop + 1);
      assert.strictEqual(G.derbyOffFor(m, 4), -1);
    }
  });

  console.log(`\n${n} passed`);
}
