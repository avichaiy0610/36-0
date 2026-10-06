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
  'FORMATIONS', 'derbySetFormation', 'derbySwap', 'derbyPreSwap', 'derbySetFormationMine', 'derbySwapMine', 'derbyPreSwapMine', 'derbyAutoTactic', 'localStorage'];

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

  console.log(`\n${n} passed`);
}
