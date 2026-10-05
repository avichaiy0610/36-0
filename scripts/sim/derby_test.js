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
const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
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
  'js/derby-data.js', 'js/derby-ai.js', 'js/derby-match.js'];
const EXPORTS = ['state', 'SQUADS', 'TEAMS', 'formationSlots', 'playerFitsSlot', 'slotFitPos',
  'myLineRatings', 'teamOVR', 'getEraFilteredSquads',
  'DERBY_RIVALS', 'DERBY_MIN_SEASONS', 'DERBY_ORDER', 'DERBY_HOME', 'DERBY_AI', 'DERBY_REROLLS',
  'derbySeasonsOf', 'derbyClubs', 'derbyRng',
  'derbyAiDraft', 'derbyLinesFor',
  'derbyPlayMatch', 'derbyGoalEvents', 'derbySeriesStatus', 'derbyGameRival'];

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
  t('every club has three distinct rivals, all of them taking part', () => {
    const clubs = new Set(G.derbyClubs());
    for (const c of clubs) {
      const r = G.DERBY_RIVALS[c];
      assert.strictEqual(r.length, 3, c);
      assert.strictEqual(new Set(r).size, 3, c);
      assert.ok(!r.includes(c), c);
      r.forEach(x => assert.ok(clubs.has(x), c + ' → ' + x));
    }
  });
  t('owner rulings: Beitar\'s archrival is Sakhnin, Haifa\'s is Maccabi TLV', () => {
    assert.strictEqual(G.DERBY_RIVALS['beitar-jerusalem'][0], 'bnei-sakhnin');
    assert.strictEqual(G.DERBY_RIVALS['maccabi-haifa'][0], 'maccabi-tlv');
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

  // ── Task 3: match and series ───────────────────────────────────────────────
  const xiA = G.derbyAiDraft('maccabi-haifa', '4-3-3', 'hard', G.derbyRng(1));
  const xiB = G.derbyAiDraft('maccabi-tlv', '4-3-3', 'hard', G.derbyRng(2));
  const lnA = G.derbyLinesFor(xiA.picks, xiA.slots), lnB = G.derbyLinesFor(xiB.picks, xiB.slots);
  t('every match has a winner; a draw is settled on penalties consistently', () => {
    let draws = 0;
    for (let s = 1; s <= 500; s++) {
      const g = G.derbyPlayMatch(lnA, lnB, s % 2 === 0, s);
      assert.strictEqual(typeof g.won, 'boolean');
      if (g.gf === g.ga) {
        draws++;
        assert.ok(g.pens, 'draw without pens, seed ' + s);
        assert.strictEqual(g.won, g.pens.gf > g.pens.ga);
      } else {
        assert.strictEqual(g.pens, null);
        assert.strictEqual(g.won, g.gf > g.ga);
      }
    }
    assert.ok(draws > 0, 'no draw in 500 matches');
  });
  t('a match is deterministic for its seed', () => {
    assert.deepStrictEqual(G.derbyPlayMatch(lnA, lnB, true, 99), G.derbyPlayMatch(lnA, lnB, true, 99));
  });
  t('goal events: one per goal, sorted, no goalkeeper scores', () => {
    for (let s = 1; s <= 200; s++) {
      const g = G.derbyPlayMatch(lnA, lnB, true, s);
      const ev = G.derbyGoalEvents(g, xiA.picks, xiB.picks, s);
      assert.strictEqual(ev.filter(e => e.mine).length, g.gf);
      assert.strictEqual(ev.filter(e => !e.mine).length, g.ga);
      for (let i = 1; i < ev.length; i++) assert.ok(ev[i].min >= ev[i - 1].min);
      const gks = new Set([...xiA.picks, ...xiB.picks].filter(p => p.player.position === 'GK').map(p => p.player.name));
      ev.forEach(e => assert.ok(!gks.has(e.name), 'GK scored: ' + e.name));
    }
  });
  t('series status stops at three', () => {
    const W = { won: true }, L = { won: false };
    assert.deepStrictEqual(G.derbySeriesStatus([W, W, W]), { w: 3, l: 0, over: true, won: true });
    assert.deepStrictEqual(G.derbySeriesStatus([L, W, L, L]), { w: 1, l: 3, over: true, won: false });
    assert.deepStrictEqual(G.derbySeriesStatus([W, L, W, L]), { w: 2, l: 2, over: false, won: false });
  });
  t('series order for Haifa: Beitar, H. Haifa, M. TLV, H. Haifa, M. TLV', () => {
    assert.deepStrictEqual([0, 1, 2, 3, 4].map(i => G.derbyGameRival('maccabi-haifa', i)),
      ['beitar-jerusalem', 'hapoel-haifa', 'maccabi-tlv', 'hapoel-haifa', 'maccabi-tlv']);
  });

  console.log(`\n${n} passed`);
}
