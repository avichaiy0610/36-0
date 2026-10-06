# אלופי הדרבי — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new mode where the player drafts the all-time XI of one real club (one of its seasons per round) and plays a best-of-5 series against the computer-drafted all-time XIs of that club's three rivals.

**Architecture:** A self-contained mode behind `state.derby`, the same pattern as `state.career` / `state.story`. The draft reuses the normal draft screen with the squad pool filtered to one club; three pure files (`derby-data`, `derby-ai`, `derby-match`) hold the data, the computer draft and the match, and load in Node for tests and calibration; `derby.js` runs the flow and persistence, `derby-screens.js` draws it. The simulation engine is NOT changed — difficulty lives only in how the computer drafts.

**Tech Stack:** Vanilla JS (global functions, no bundler), Node + `assert` harness in `scripts/sim/`, Supabase (plpgsql migration), static deploy on Vercel.

**Spec:** `docs/superpowers/specs/2026-10-05-derby-champions-design.md`

**One deliberate simplification vs the spec:** the end-of-series share is a TEXT share (results + the XI's names) via `navigator.share` / clipboard, not an image card. An image card can follow once the mode has proved itself.

**Branch:** `derby-champions` (already created; the spec is committed there). **Nothing is merged, pushed or applied to Supabase without the owner's explicit OK.**

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `js/derby-data.js` | create | `DERBY_RIVALS`, `DERBY_MIN_SEASONS`, `DERBY_ORDER`, `DERBY_HOME`, `DERBY_AI`, `DERBY_REROLLS`, `derbySeasonsOf`, `derbyClubs`, `derbyRng` |
| `js/derby-ai.js` | create | `derbyAiDraft` (computer draft), `derbyLinesFor` (line ratings of any XI) |
| `js/derby-match.js` | create | `derbyPlayMatch`, `derbyGoalEvents`, `derbySeriesStatus`, `derbyGameRival` |
| `js/derby.js` | create | run object, persistence, draft start/finish, playing the next game, submit + track |
| `js/derby-screens.js` | create | club picker, rivals preview, match, end screen, share, setup-card wiring |
| `css/derby.css` | create | styling, dark palette only |
| `scripts/sim/derby_test.js` | create | Node unit tests (+ exports `load()` for the calibrator) |
| `scripts/sim/derby_calibrate.js` | create | win-rate table per club × difficulty |
| `supabase/migrations/20261005000002_derby_champions.sql` | create | `derby_runs`, `submit_derby_run`, 6 achievements, `track()` + `'derby'` |
| `js/game.js` | modify | pool filter, rerolls, draft-end hook, save/restore, clears, `trackDraftMode` |
| `js/cup.js`, `js/january.js`, `js/coach.js` | modify | guards: no cup / January / manager in a derby |
| `js/club.js` | modify | `clubStory()` also lends the derby club |
| `js/gauntlet.js`, `js/challenges.js`, `js/mg-wordle.js`, `js/career.js` | modify | `state.derby = null` before their own `beginDraftWithState` |
| `index.html` | modify | setup card, `#screen-derby`, css link, five script tags |

---

### Task 1: Data file + test harness

**Files:**
- Create: `js/derby-data.js`
- Create: `scripts/sim/derby_test.js`

- [ ] **Step 1: Write the test harness with the Task 1 tests**

Create `scripts/sim/derby_test.js`:

```js
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

  console.log(`\n${n} passed`);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/sim/derby_test.js`
Expected: FAIL — `ENOENT ... js/derby-data.js` (and the derby-ai / derby-match files do not exist yet).

- [ ] **Step 3: Create empty placeholders for the two later files so the harness loads**

Create `js/derby-ai.js` with exactly:

```js
// ─── אלופי הדרבי — the computer's draft (Task 2) ─────────────────────────────
```

Create `js/derby-match.js` with exactly:

```js
// ─── אלופי הדרבי — one match and the series (Task 3) ─────────────────────────
```

- [ ] **Step 4: Write `js/derby-data.js`**

```js
// ─── אלופי הדרבי — data only ─────────────────────────────────────────────────
// Spec: docs/superpowers/specs/2026-10-05-derby-champions-design.md
//
// You draft the all-time XI of one club, one of its seasons per round, and play
// a best-of-5 against the all-time XIs of its three rivals, which the computer
// drafts by the same rules. Pure data and helpers: loads in Node for the tests
// and the calibrator.

// A club takes part only with this many top-flight seasons in SQUADS — fewer and
// eleven rounds without repeating a season are not possible.
const DERBY_MIN_SEASONS = 15;

// Three rivals per club, ARCHRIVAL FIRST. Approved by the owner 2026-10-05.
// Every rival must itself take part: a rival with three seasons has no squad
// deep enough for the computer to draft from. scripts/sim/derby_test.js checks it.
const DERBY_RIVALS = {
  'maccabi-haifa':    ['maccabi-tlv',      'hapoel-haifa',     'beitar-jerusalem'],
  'maccabi-tlv':      ['hapoel-tlv',       'maccabi-haifa',    'beitar-jerusalem'],
  'beitar-jerusalem': ['bnei-sakhnin',     'hapoel-tlv',       'maccabi-tlv'],
  'hapoel-tlv':       ['maccabi-tlv',      'beitar-jerusalem', 'bnei-yehuda'],
  'hapoel-haifa':     ['maccabi-haifa',    'hapoel-tlv',       'bnei-sakhnin'],
  'hapoel-beersheba': ['maccabi-haifa',    'maccabi-tlv',      'ms-ashdod'],
  'ms-ashdod':        ['hapoel-beersheba', 'bnei-yehuda',      'maccabi-pt'],
  'maccabi-netanya':  ['maccabi-pt',       'hapoel-pt',        'beitar-jerusalem'],
  'maccabi-pt':       ['hapoel-pt',        'maccabi-netanya',  'bnei-yehuda'],
  'hapoel-pt':        ['maccabi-pt',       'hapoel-tlv',       'maccabi-netanya'],
  'bnei-yehuda':      ['hapoel-tlv',       'maccabi-tlv',      'maccabi-pt'],
  'bnei-sakhnin':     ['ironi-ks',         'hapoel-haifa',     'maccabi-haifa'],
  'ironi-ks':         ['bnei-sakhnin',     'hapoel-haifa',     'maccabi-haifa'],
};

// The series: which rival each game is against (index into DERBY_RIVALS[club],
// 0 = archrival) and whether you are at home. Game 5 against the archrival is
// only ever reached at 2:2.
const DERBY_ORDER = [2, 1, 0, 1, 0];
const DERBY_HOME  = [true, false, true, false, true];

// How the computer drafts. Each round it ranks the players of the drawn season
// who fit an open slot and takes the 1st/2nd/3rd best with these weights; `look`
// is how many seasons it draws per round, keeping the best (its reroll).
// Starting values — Task 4 calibrates them; the engine is never touched.
const DERBY_AI = {
  easy:   { weights: [0.40, 0.35, 0.25], look: 1 },
  normal: { weights: [0.70, 0.20, 0.10], look: 1 },
  hard:   { weights: [1, 0, 0],          look: 1 },
};

// Season rerolls for the whole draft. The club reroll is hidden: with one club
// in the pool it could only redraw another season of the same club.
const DERBY_REROLLS = 3;

function derbySeasonsOf(teamId) {
  return SQUADS.filter(sq => sq.teamId === teamId);
}

// Computed from the data, not listed: a club that reaches 15 seasons later
// joins on its own — provided it has rivals defined.
function derbyClubs() {
  return Object.keys(DERBY_RIVALS)
    .filter(id => derbySeasonsOf(id).length >= DERBY_MIN_SEASONS)
    .sort((a, b) => derbySeasonsOf(b).length - derbySeasonsOf(a).length);
}

// mulberry32: the run's own seeded stream, so a refresh replays the same draft
// and the same goals.
function derbyRng(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node scripts/sim/derby_test.js`
Expected: 4 × `PASS`, then `4 passed`. If the load throws inside `chemistry.js` / `tags.js`, remove that file from `FILES` (see the comment above `FILES`) and re-run.

- [ ] **Step 6: Commit**

```bash
git add js/derby-data.js js/derby-ai.js js/derby-match.js scripts/sim/derby_test.js
git commit -m "feat(derby): clubs, rivalries and the test harness"
```

---

### Task 2: The computer's draft

**Files:**
- Modify: `js/derby-ai.js`
- Test: `scripts/sim/derby_test.js`

- [ ] **Step 1: Add the failing tests**

In `scripts/sim/derby_test.js`, insert before `console.log(\`\n${n} passed\`);`:

```js
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node scripts/sim/derby_test.js`
Expected: FAIL — `TypeError: G.derbyAiDraft is not a function`.

- [ ] **Step 3: Write `js/derby-ai.js`**

Replace the file's contents with:

```js
// ─── אלופי הדרבי — the computer's draft ──────────────────────────────────────
// The rivals' all-time XIs are drafted by the SAME rules as yours: one season of
// the club per round, never the same season or the same man twice, into the
// player's formation. Difficulty is only how greedily it picks (DERBY_AI) — the
// engine is never recalibrated. Pure: takes an rng, touches no state.

function derbyAiDraft(teamId, formationId, difficulty, rng) {
  const cfg = DERBY_AI[difficulty] || DERBY_AI.normal;
  const slots = formationSlots(formationId, 'bal');
  const picks = new Array(slots.length).fill(null);
  const usedSeasons = new Set(), usedNames = new Set();
  const seasons = derbySeasonsOf(teamId);
  const empty = () => slots.map((_, i) => i).filter(i => !picks[i]);

  // Everyone in a season who fits an open slot, best first, each with the slot.
  const options = sq => {
    const open = empty(), out = [];
    for (const p of sq.players) {
      if (usedNames.has(p.name)) continue;
      const slot = open.find(i => playerFitsSlot(p, slotFitPos(slots[i])));
      if (slot !== undefined) out.push({ player: p, squad: sq, slot });
    }
    return out.sort((a, b) => b.player.ovr - a.player.ovr);
  };
  const choose = list => {
    const w = cfg.weights.slice(0, list.length);
    const total = w.reduce((s, x) => s + x, 0);
    let r = rng() * total;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
    return list[0];
  };

  while (empty().length) {
    const fresh = seasons.filter(sq => !usedSeasons.has(sq.id));
    const pool = fresh.length ? fresh : seasons;
    let best = null;
    for (let k = 0; k < cfg.look; k++) {
      const sq = pool[Math.floor(rng() * pool.length)];
      const o = options(sq);
      if (o.length && (!best || o[0].player.ovr > best.list[0].player.ovr)) best = { sq, list: o };
    }
    // Nobody in the drawn season fits what is still open: look through the rest.
    if (!best) {
      for (const sq of pool) { const o = options(sq); if (o.length) { best = { sq, list: o }; break; } }
    }
    // Nobody fits anywhere: the best man left, out of position (teamOVR's 93%).
    if (!best) {
      const all = seasons.flatMap(sq => sq.players.map(p => ({ player: p, squad: sq })))
        .filter(e => !usedNames.has(e.player.name))
        .sort((a, b) => b.player.ovr - a.player.ovr);
      if (!all.length) break;
      picks[empty()[0]] = all[0];
      usedNames.add(all[0].player.name); usedSeasons.add(all[0].squad.id);
      continue;
    }
    const c = choose(best.list);
    picks[c.slot] = { player: c.player, squad: c.squad };
    usedNames.add(c.player.name); usedSeasons.add(best.sq.id);
  }
  return { slots, picks };
}

// The four line ratings of ANY XI, on exactly the terms of the player's own
// (myLineRatings: out-of-position penalty, chemistry, tags). It reads `state`,
// so the XI is lent to it and the player's own is put back, whatever happens.
function derbyLinesFor(picks, slots) {
  const keep = { picks: state.picks, slots: state.slots, tactic: state.tactic };
  try {
    state.picks = picks; state.slots = slots; state.tactic = 'bal';
    return myLineRatings();
  } finally {
    state.picks = keep.picks; state.slots = keep.slots; state.tactic = keep.tactic;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node scripts/sim/derby_test.js`
Expected: all PASS (8 passed). If the "fits slot" test fails for `hapoel-pt` with the out-of-position fallback, print the failing seed's picks and report — do NOT loosen the test without understanding which slot could not be filled.

- [ ] **Step 5: Commit**

```bash
git add js/derby-ai.js scripts/sim/derby_test.js
git commit -m "feat(derby): the computer drafts the rivals' all-time XIs"
```

---

### Task 3: One match and the series

**Files:**
- Modify: `js/derby-match.js`
- Test: `scripts/sim/derby_test.js`

- [ ] **Step 1: Add the failing tests**

Insert before `console.log(\`\n${n} passed\`);`:

```js
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node scripts/sim/derby_test.js`
Expected: FAIL — `TypeError: G.derbyPlayMatch is not a function`.

- [ ] **Step 3: Write `js/derby-match.js`**

Replace the file's contents with:

```js
// ─── אלופי הדרבי — one match and the series ──────────────────────────────────
// A match is the league's own model (simulateMatchV2: xG, binomial goals), so a
// derby is not a different sport. Every game needs a winner: level after ninety
// goes straight to penalties, tilted a little by the two goalkeepers.

function derbyPlayMatch(me, opp, home, seed) {
  return withSeededRandom(seed, () => {
    const m = simulateMatchV2(me, opp, home);
    const g = { gf: m.gf, ga: m.ga, home, won: m.gf > m.ga, pens: null };
    if (m.gf === m.ga) {
      const p = Math.max(0.35, Math.min(0.65, 0.5 + 0.01 * ((me.gk || 80) - (opp.gk || 80))));
      g.won = Math.random() < p;
      const w = 3 + Math.floor(Math.random() * 3);
      const l = w - 1 - (Math.random() < 0.3 ? 1 : 0);
      g.pens = g.won ? { gf: w, ga: l } : { gf: l, ga: w };
    }
    return g;
  });
}

// Who scored and when — display only; the result is already decided.
const DERBY_GOAL_W = { ST: 6, CF: 6, LW: 4, RW: 4, CAM: 4, LM: 2.5, RM: 2.5, CM: 2, CDM: 1,
                       LB: 0.7, RB: 0.7, CB: 0.6, GK: 0 };
function derbyGoalEvents(game, myPicks, oppPicks, seed) {
  const rng = derbyRng(seed);
  const scorer = picks => {
    const list = picks.filter(Boolean);
    const w = list.map(e => DERBY_GOAL_W[normalizePos(e.player.position)] ?? 1);
    let r = rng() * w.reduce((s, x) => s + x, 0);
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0 && w[i] > 0) return list[i].player.name; }
    return list.find((e, i) => w[i] > 0).player.name;
  };
  const ev = [];
  for (let i = 0; i < game.gf; i++) ev.push({ min: 1 + Math.floor(rng() * 90), mine: true,  name: scorer(myPicks) });
  for (let i = 0; i < game.ga; i++) ev.push({ min: 1 + Math.floor(rng() * 90), mine: false, name: scorer(oppPicks) });
  return ev.sort((a, b) => a.min - b.min);
}

function derbySeriesStatus(games) {
  const w = games.filter(g => g.won).length, l = games.length - w;
  return { w, l, over: w >= 3 || l >= 3, won: w >= 3 };
}

function derbyGameRival(club, i) {
  return DERBY_RIVALS[club][DERBY_ORDER[i]];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node scripts/sim/derby_test.js`
Expected: all PASS (13 passed).

- [ ] **Step 5: Commit**

```bash
git add js/derby-match.js scripts/sim/derby_test.js
git commit -m "feat(derby): a match with a winner every time, and the best-of-5"
```

---

### Task 4: Calibration (gate before any UI ships)

**Files:**
- Create: `scripts/sim/derby_calibrate.js`
- Modify (values only): `js/derby-data.js` → `DERBY_AI`

- [ ] **Step 1: Write the calibrator**

```js
// scripts/sim/derby_calibrate.js — how hard is a derby series, measured.
//
//   node scripts/sim/derby_calibrate.js [runs=1500]
//
// The player is a bot that takes the best man who fits from each drawn season,
// with no rerolls — a sensible player, not a perfect one (real players also
// reroll and chase chemistry, so they do a little better than this).
// Targets (spec §4, owner-approved): normal ≈ 40% series wins averaged over all
// clubs and no club under 10%; easy ≈ 65%; hard ≈ 20%.
// Levers: DERBY_AI weights and `look` in js/derby-data.js. Never the engine.
const { load } = require('./derby_test.js');
const G = load();
const N = parseInt(process.argv[2] || '1500', 10);
const F = '4-3-3';
const slots = G.formationSlots(F, 'bal');
Object.assign(G.state, { peakMode: false, classic: false, coach: null, story: null });

function seriesWin(club, diff, seed) {
  const rng = G.derbyRng(seed);
  const me = G.derbyAiDraft(club, F, 'hard', rng);          // the bot = greedy, no rerolls
  const myLines = G.derbyLinesFor(me.picks, slots);
  const rivals = {};
  for (const id of G.DERBY_RIVALS[club]) {
    const d = G.derbyAiDraft(id, F, diff, rng);
    rivals[id] = G.derbyLinesFor(d.picks, d.slots);
  }
  const games = [];
  for (let i = 0; i < 5 && !G.derbySeriesStatus(games).over; i++) {
    const opp = rivals[G.derbyGameRival(club, i)];
    games.push(G.derbyPlayMatch(myLines, opp, G.DERBY_HOME[i], (seed * 31 + i * 7919) | 0));
  }
  return G.derbySeriesStatus(games).won;
}

const diffs = ['easy', 'normal', 'hard'];
const rows = [], avg = { easy: 0, normal: 0, hard: 0 };
for (const club of G.derbyClubs()) {
  const row = { club };
  for (const d of diffs) {
    let w = 0;
    for (let s = 1; s <= N; s++) if (seriesWin(club, d, s)) w++;
    row[d] = Math.round(1000 * w / N) / 10;
    avg[d] += row[d];
  }
  rows.push(row);
}
const k = rows.length;
console.table(rows);
console.log('average:', diffs.map(d => `${d} ${(avg[d] / k).toFixed(1)}%`).join(' · '));
const minNormal = Math.min(...rows.map(r => r.normal));
console.log(`lowest club on normal: ${minNormal}%`);
const ok = Math.abs(avg.normal / k - 40) <= 5 && minNormal >= 10;
console.log(ok ? 'GATE: PASS' : 'GATE: FAIL — tune DERBY_AI');
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run it with the starting values**

Run: `node scripts/sim/derby_calibrate.js 1500`
Expected: a 13-row table, the averages line, and `GATE: PASS` or `GATE: FAIL`. Record the whole output in the commit message of Step 4.

- [ ] **Step 3: Tune `DERBY_AI` until the gate passes**

Rules, in order:
1. Move `normal.weights` first: more weight on index 0 makes rivals stronger (lower win %), more on 1/2 weaker.
2. If even `normal: [1,0,0]` leaves the player above 45%, raise `normal.look` to 2 (the computer keeps the better of two seasons per round), then re-tune weights.
3. Tune `easy` toward ~65% and `hard` toward ~20% the same way (`hard.look` may go to 2 or 3).
4. If one club is below 10% on normal while the average is right, **stop and report the table to the owner** — spec §4 says per-club calibration is then decided from the numbers; do not invent a per-club mechanism unasked.

Re-run `node scripts/sim/derby_calibrate.js 1500` after each change.

- [ ] **Step 4: Commit the calibrated values with the evidence**

```bash
git add js/derby-data.js scripts/sim/derby_calibrate.js
git commit -m "feat(derby): calibrate the computer's draft

<paste the final table and averages line here>"
```

---

### Task 5: Hooks in the shared game code

**Files:**
- Modify: `js/game.js` (functions named below; line numbers as of `96ba52ad`)
- Modify: `js/cup.js:36-40`, `js/january.js:32-35`, `js/coach.js:203-206`
- Modify: `js/club.js:294-305`
- Modify: `js/gauntlet.js:190`, `js/challenges.js:824`, `js/mg-wordle.js:121`, `js/career.js:931`
- Test: `scripts/sim/derby_test.js`

- [ ] **Step 1: Add the failing test for the pool filter**

Insert before `console.log(\`\n${n} passed\`);`:

```js
  // ── Task 5: hooks ──────────────────────────────────────────────────────────
  t('a derby draws only the chosen club\'s seasons; outside it, nothing changes', () => {
    Object.assign(G.state, { eraMin: 1999, eraMax: 2025, derby: { club: 'ironi-ks' } });
    const pool = G.getEraFilteredSquads();
    assert.ok(pool.length === G.derbySeasonsOf('ironi-ks').length && pool.every(sq => sq.teamId === 'ironi-ks'));
    G.state.derby = null;
    assert.ok(G.getEraFilteredSquads().length > 300);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/sim/derby_test.js`
Expected: FAIL on the new test (the pool has every club's seasons).

- [ ] **Step 3: Filter the pool** — in `js/game.js`, `getEraFilteredSquads()`:

```js
function getEraFilteredSquads() {
  // אלופי הדרבי: every round is a season of the one club (js/derby.js)
  if (state.derby) return SQUADS.filter(sq => sq.teamId === state.derby.club);
  const filtered = SQUADS.filter(sq => {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node scripts/sim/derby_test.js`
Expected: all PASS (14 passed).

- [ ] **Step 5: Rerolls** — in `js/game.js`, `updateRerollButtons()`, after the line that sets `btn-reroll-team`'s `disabled`:

```js
  // A derby draws from one club only, so a club reroll is just a season reroll.
  document.getElementById('btn-reroll-team').style.display = state.derby ? 'none' : '';
```

and in `rerollSeason()`, change the `sameTeam` line to:

```js
  const sameTeam = era.filter(sq => sq.teamId === currentTeamId && sq.id !== state.currentSquad?.id &&
                                    !(state.derby && state.usedSquadIds.has(sq.id)));
```

- [ ] **Step 6: Draft end** — in `js/game.js`, in the draft-complete block (the `if (state.duelCode ...) ... else if (state.gauntlet && typeof gtFight === 'function')` chain, ~line 2156), add directly after the gauntlet branch:

```js
    // אלופי הדרבי: no season — the XI goes to the rivals and the series
    else if (state.derby && typeof derbyAfterDraft === 'function') setTimeout(() => derbyAfterDraft(), 500);
```

- [ ] **Step 7: Save / restore** — in `saveDraftState()` add after `story: state.story || null,`:

```js
      derby: state.derby || null,
```

In `restoreDraftState()` add after `story: d.story ?? null,`:

```js
    derby: d.derby ?? null,
```

and in its "Draft finished" block (~line 1450), make the first branch:

```js
  if (state.currentRound >= slots.length) {
    if (state.derby && typeof derbyAfterDraft === 'function') { derbyAfterDraft(); return true; }
    if (d.season) {
```

- [ ] **Step 8: Clear the field at every other door** — "a field nobody sets is a field that carries over":
  - `startGame()`: add `state.derby = null;` next to `state.career = null;`.
  - `restartGame()`: add `derby: null,` after `story: null,` in the `Object.assign`.
  - `js/gauntlet.js` line before `beginDraftWithState();` (~190), `js/challenges.js` before `beginDraftWithState();` (~824), `js/mg-wordle.js` before `beginDraftWithState();` (~121), `js/career.js` before `beginDraftWithState({ classic: state.classic, tactic: state.tactic });` (~931): add

```js
  state.derby = null;          // a derby's one-club pool must not follow us here
```

- [ ] **Step 9: Guards at the point of use**
  - `js/cup.js` `cupEligible()`: `if (state.challenge || state.league || state.gauntlet || state.story || state.derby) return false;`
  - `js/january.js` `janEligible()`: same addition of `|| state.derby` to its mode line.
  - `js/coach.js` `coachBarredMode()`: `return !!(state.challenge || state.leagueCode || state.duelCode || state.gauntlet || state.salaryCap || state.derby);`
  - `js/game.js` `trackDraftMode()`: `if (state.career || state.derby) return null;` (the derby tracks itself in js/derby.js).

- [ ] **Step 10: The club on screen** — in `js/club.js`, `clubStory()`, replace the two lines that resolve `ch` and `t` with:

```js
    if (typeof state === 'undefined' || !state) return null;
    // A story chapter's club, or a derby's: both are a real club you play AS.
    const teamId = state.story && typeof storyChapter === 'function'
      ? (storyChapter(state.story.chapterId) || {}).teamId
      : (state.derby ? state.derby.club : null);
    const t = teamId && typeof TEAMS !== 'undefined' ? TEAMS[teamId] : null;
```

and in its return, change `clubId: ch.teamId` to `clubId: teamId`. (Remove the old first `if` line that returned null when `!state.story` — the new one replaces it.)

- [ ] **Step 11: Re-run everything that loads game.js**

Run: `node scripts/sim/derby_test.js && node scripts/sim/story_test.js`
Expected: both end with their `passed` line and no FAIL.

- [ ] **Step 12: Commit**

```bash
git add js/game.js js/cup.js js/january.js js/coach.js js/club.js js/gauntlet.js js/challenges.js js/mg-wordle.js js/career.js scripts/sim/derby_test.js
git commit -m "feat(derby): one-club pool, rerolls, draft hand-off and guards"
```

---

### Task 6: The run — `js/derby.js`

**Files:**
- Create: `js/derby.js`

- [ ] **Step 1: Write the file**

```js
// ─── אלופי הדרבי — the run ───────────────────────────────────────────────────
// Spec: docs/superpowers/specs/2026-10-05-derby-champions-design.md
// Flow: pick club → draft (the normal draft screen, one-club pool) → the rivals'
// XIs → best-of-5 → end. The run lives in localStorage and is saved after every
// step; a game is simulated only when it is reached, so a refresh resumes.

const DERBY_KEY = '36-0-derby';
const DERBY_WINS_KEY = '36-0-derby-wins';     // clubs won with, for dc_all

function derbyLoad() {
  try { const r = JSON.parse(localStorage.getItem(DERBY_KEY)); return r && r.v === 1 ? r : null; }
  catch (e) { return null; }
}
function derbySave(run) { try { localStorage.setItem(DERBY_KEY, JSON.stringify(run)); } catch (e) {} }
function derbyClear() { try { localStorage.removeItem(DERBY_KEY); } catch (e) {} }

// A pick is stored by squad id + name and looked up again on load.
function derbyEntryKey(e) { return e ? { squadId: e.squad.id, name: e.player.name } : null; }
function derbyEntry(k) {
  if (!k) return null;
  const sq = SQUADS.find(s => s.id === k.squadId);
  const p = sq && sq.players.find(x => x.name === k.name);
  return p ? { player: p, squad: sq } : null;
}

function derbyStart(club, difficulty) {
  const run = { v: 1, club, difficulty, formationId: state.formationId || '4-3-3',
    tactic: tacticOf(state.tactic), seed: (Math.random() * 2147483647) | 0,
    phase: 'draft', xi: null, rivals: null, games: [], submitted: false };
  derbySave(run);
  derbyTrack('progress', club + '|start');
  derbyBeginDraft(run);
}

function derbyBeginDraft(run) {
  // Every other mode's field is set by hand — the derby must not inherit one.
  Object.assign(state, {
    leagueCode: null, duelCode: null, career: null, gauntlet: null, story: null,
    challenge: null, challengeDeck: null, challengeReqs: null,
    deck: null, mgw: null, mga: null, coach: null, salaryCap: null,
    difficulty: run.difficulty, showRatings: true, draftMode: 'squad-first', peakMode: false,
    eraMin: YEAR_MIN, eraMax: YEAR_MAX, formationId: run.formationId,
    derby: { club: run.club },
  });
  beginDraftWithState({ classic: false, tactic: run.tactic });
  // beginDraftWithState deals rerolls by difficulty; the derby has its own.
  state.teamRerollsLeft = 0;
  state.seasonRerollsLeft = DERBY_REROLLS;
  updateRerollButtons();
  saveDraftState();
}

// Called by game.js when the eleventh pick lands (and on a restored full draft).
function derbyAfterDraft() {
  const run = derbyLoad();
  if (!run || !state.derby) { showPreseason(teamOVR()); return; }
  run.xi = state.picks.map(derbyEntryKey);
  run.tactic = state.tactic || 'bal';
  if (!run.rivals) {
    const rng = derbyRng(run.seed);
    run.rivals = {};
    for (const id of DERBY_RIVALS[run.club]) {
      run.rivals[id] = derbyAiDraft(id, run.formationId, run.difficulty, rng).picks.map(derbyEntryKey);
    }
  }
  if (run.phase === 'draft') run.phase = 'rivals';
  derbySave(run);
  derbyTrack('progress', run.club + '|drafted');
  derbyShow();
}

// Put the player's XI back on `state` (after a refresh nothing else will).
function derbyApplyMine(run) {
  state.formationId = run.formationId;
  state.tactic = run.tactic;
  state.slots = formationSlots(run.formationId, run.tactic);
  state.picks = run.xi.map(derbyEntry);
  state.derby = { club: run.club };
}
function derbyRivalPicks(run, id) { return run.rivals[id].map(derbyEntry); }

// Simulate the next game, save, and return it (null when the series is over).
function derbyPlayNext(run) {
  if (derbySeriesStatus(run.games).over) return null;
  const i = run.games.length, rival = derbyGameRival(run.club, i);
  derbyApplyMine(run);
  const me = myLineRatings();
  const oppPicks = derbyRivalPicks(run, rival);
  const opp = derbyLinesFor(oppPicks, formationSlots(run.formationId, 'bal'));
  opp.name = TEAMS[rival].name;
  const seed = (run.seed + (i + 1) * 7919) | 0;
  const g = derbyPlayMatch(me, opp, DERBY_HOME[i], seed);
  g.rival = rival;
  g.events = derbyGoalEvents(g, state.picks, oppPicks, seed ^ 0x9e3779b9);
  run.games.push(g);
  const after = derbySeriesStatus(run.games);
  if (after.over) { run.phase = 'done'; derbyFinish(run, after); }
  derbySave(run);
  return g;
}

function derbyFinish(run, st) {
  if (run.submitted) return;
  run.submitted = true;
  let wins = [];
  try { wins = JSON.parse(localStorage.getItem(DERBY_WINS_KEY)) || []; } catch (e) {}
  if (st.won && !wins.includes(run.club)) {
    wins.push(run.club);
    try { localStorage.setItem(DERBY_WINS_KEY, JSON.stringify(wins)); } catch (e) {}
  }
  derbyTrack('finish', run.club + '|' + st.w + '-' + st.l);
  derbySubmit(run, st, wins.length);
}

// Migration 20261005000002: signed-in only; the server clamps everything and
// returns only badges that are new.
function derbySubmit(run, st, wonClubs) {
  try {
    if (typeof getCurrentUser !== 'function' || !getCurrentUser() || typeof _supabase === 'undefined') return;
    const g = run.games;
    _supabase.rpc('submit_derby_run', { p: {
      club: run.club, difficulty: run.difficulty, wins: st.w, losses: st.l,
      comeback: st.won && g.length >= 4 && !g[0].won && !g[1].won,
      decider: g.length === 5 && g[4].won,
      won_clubs: wonClubs,
      xi: run.xi,
    } }).then(({ data }) => {
      const fresh = (data && data.achievements) || [];
      if (fresh.length && typeof showAchievementToasts === 'function') showAchievementToasts(fresh);
    }, () => {});
  } catch (e) { /* an award never breaks a series */ }
}

function derbyTrack(event, detail) {
  if (typeof track === 'function') track(event, 'derby', detail);
}
```

- [ ] **Step 2: Syntax check**

Run: `node --check js/derby.js`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add js/derby.js
git commit -m "feat(derby): the run — start, hand-off from the draft, games, submit"
```

---

### Task 7: Screens, styling, page wiring

**Files:**
- Create: `js/derby-screens.js`, `css/derby.css`
- Modify: `index.html`

- [ ] **Step 1: Write `js/derby-screens.js`**

```js
// ─── אלופי הדרבי — screens ───────────────────────────────────────────────────
const DERBY_DIFF_HE = { easy: 'קל', normal: 'רגיל', hard: 'קשה' };
let _derbyDiff = 'normal';
let _derbyTimer = null;

function derbyEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function derbyTeamName(id) { return (TEAMS[id] && TEAMS[id].name) || id; }
function derbyCrest(id, cls) { return `<img class="${cls || 'dc-crest'}" src="crests/${id}.png" alt="" loading="lazy">`; }
function derbyRoot() { return document.getElementById('derby-root'); }
function derbyStopClock() { if (_derbyTimer) { clearInterval(_derbyTimer); _derbyTimer = null; } }

function derbyOpen() { derbyTrack('open'); derbyShow(); }

function derbyShow() {
  derbyStopClock();
  const scr = document.getElementById('screen-derby');
  if (!scr || !scr.classList.contains('active')) showScreen('derby');
  const back = document.getElementById('derby-back');
  if (back) back.onclick = () => { derbyStopClock(); showScreen('setup'); };
  const run = derbyLoad();
  if (!run || run.phase === 'draft') return derbyRenderPicker();
  if (run.phase === 'rivals' || (run.phase === 'series' && !run.games.length)) return derbyRenderRivals(run);
  if (run.phase === 'series') return derbyRenderMatch(run, run.games.length - 1, false);
  return derbyRenderEnd(run);
}

/* ── pick a club ─────────────────────────────────────────────────────────── */
function derbyRenderPicker() {
  const root = derbyRoot();
  root.innerHTML = `
    <p class="dc-lead">בנה את הרכב הנצח של המועדון מכל העונות שלו בליגת העל, ואז נצח את היריבות בסדרת הטוב מ-5.</p>
    <div class="dc-diff">${['easy', 'normal', 'hard'].map(d =>
      `<button class="dc-diff-btn${d === _derbyDiff ? ' on' : ''}" data-diff="${d}">${DERBY_DIFF_HE[d]}</button>`).join('')}</div>
    <div class="dc-grid">${derbyClubs().map(id => {
      const [a, b, c] = DERBY_RIVALS[id];
      return `<button class="dc-club" data-club="${id}">
        ${derbyCrest(id)}
        <span class="dc-club-name">${derbyEsc(derbyTeamName(id))}</span>
        <span class="dc-club-seasons">${derbySeasonsOf(id).length} עונות</span>
        <span class="dc-club-rivals"><b>${derbyEsc(derbyTeamName(a))}</b> · ${derbyEsc(derbyTeamName(b))} · ${derbyEsc(derbyTeamName(c))}</span>
      </button>`;
    }).join('')}</div>`;
  root.querySelectorAll('.dc-diff-btn').forEach(b => { b.onclick = () => { _derbyDiff = b.dataset.diff; derbyRenderPicker(); }; });
  root.querySelectorAll('.dc-club').forEach(b => { b.onclick = () => derbyStart(b.dataset.club, _derbyDiff); });
}

/* ── the rivals ──────────────────────────────────────────────────────────── */
function derbyXiRows(entries, slots) {
  return entries.map((e, i) => e ? `<li><span class="dc-pos">${derbyEsc(slots[i].label || slots[i].pos)}</span>
    <span class="dc-nm">${derbyEsc(e.player.name)}</span><span class="dc-ss">${derbyEsc(e.squad.season)}</span>
    <span class="dc-ov">${e.player.ovr}</span></li>` : '').join('');
}

function derbyRenderRivals(run) {
  derbyApplyMine(run);
  const myOvr = teamOVR(), mine = state.picks, mySlots = state.slots;
  const rivalSlots = formationSlots(run.formationId, 'bal');
  const cards = DERBY_RIVALS[run.club].map((id, k) => {
    const picks = derbyRivalPicks(run, id);
    const ovr = derbyLinesFor(picks, rivalSlots).ovr;
    const games = DERBY_ORDER.map((r, i) => (r === k ? i + 1 : null)).filter(Boolean);
    return `<details class="dc-rival${k === 0 ? ' arch' : ''}"><summary>${derbyCrest(id)}
      <span class="dc-rv-name">${derbyEsc(derbyTeamName(id))}${k === 0 ? ' <em>המושבעת</em>' : ''}</span>
      <span class="dc-rv-games">משחק ${games.join(' ו-')}</span><span class="dc-ovr">${ovr}</span></summary>
      <ul class="dc-xi">${derbyXiRows(picks, rivalSlots)}</ul></details>`;
  }).join('');
  derbyRoot().innerHTML = `
    <div class="dc-me">${derbyCrest(run.club, 'dc-crest-lg')}<div>
      <div class="dc-me-name">${derbyEsc(derbyTeamName(run.club))} · הרכב הנצח שלך</div>
      <div class="dc-me-sub">דירוג ${myOvr} · רמה ${DERBY_DIFF_HE[run.difficulty]}</div></div></div>
    <details class="dc-rival mine"><summary>ההרכב שלך</summary><ul class="dc-xi">${derbyXiRows(mine, mySlots)}</ul></details>
    <div class="dc-sec">היריבות</div>${cards}
    <button class="btn-primary dc-go" id="dc-go">התחל את הסדרה ←</button>`;
  document.getElementById('dc-go').onclick = () => {
    run.phase = 'series'; derbySave(run);
    derbyTrack('progress', run.club + '|series');
    derbyRenderNext(run);
  };
}

/* ── a game ──────────────────────────────────────────────────────────────── */
function derbySeriesLine(games) {
  const s = derbySeriesStatus(games);
  return `<div class="dc-series">${games.map(g => `<span class="dc-dot ${g.won ? 'w' : 'l'}"></span>`).join('')}${
    Array.from({ length: 5 - games.length }, () => '<span class="dc-dot"></span>').join('')}<b>${s.w}:${s.l}</b></div>`;
}

function derbyRenderNext(run) {
  const g = derbyPlayNext(run);
  if (!g) return derbyShow();
  derbyRenderMatch(run, run.games.length - 1, true);
}

function derbyRenderMatch(run, i, animate) {
  derbyStopClock();
  const g = run.games[i];
  const homeId = g.home ? run.club : g.rival, awayId = g.home ? g.rival : run.club;
  derbyRoot().innerHTML = `
    <div class="dc-match-head">משחק ${i + 1} מתוך 5${DERBY_ORDER[i] === 0 ? ' · מול המושבעת' : ''}</div>
    <div class="dc-board">
      <div class="dc-side">${derbyCrest(homeId, 'dc-crest-lg')}<span>${derbyEsc(derbyTeamName(homeId))}</span></div>
      <div class="dc-score"><span id="dc-sc">0 - 0</span><span class="dc-clock" id="dc-clock">0'</span></div>
      <div class="dc-side">${derbyCrest(awayId, 'dc-crest-lg')}<span>${derbyEsc(derbyTeamName(awayId))}</span></div>
    </div>
    <ul class="dc-events" id="dc-events"></ul>
    <div id="dc-after"></div>`;
  const ev = g.events || [];
  let mineN = 0, theirsN = 0, k = 0;
  const paint = min => {
    while (k < ev.length && ev[k].min <= min) {
      const e = ev[k++];
      if (e.mine) mineN++; else theirsN++;
      const li = document.createElement('li');
      li.className = e.mine ? 'mine' : 'theirs';
      li.textContent = `${e.min}' ⚽ ${e.name}`;
      document.getElementById('dc-events')?.appendChild(li);
    }
    const h = g.home ? mineN : theirsN, a = g.home ? theirsN : mineN;
    const sc = document.getElementById('dc-sc'); if (sc) sc.textContent = `${h} - ${a}`;
    const cl = document.getElementById('dc-clock'); if (cl) cl.textContent = `${min}'`;
  };
  const done = () => { paint(90); derbyRenderAfter(run, i); };
  if (!animate) { done(); return; }
  let min = 0;
  _derbyTimer = setInterval(() => {
    min += 1;
    if (min >= 90) { derbyStopClock(); done(); } else paint(min);
  }, 45);
}

function derbyRenderAfter(run, i) {
  const g = run.games[i], upTo = run.games.slice(0, i + 1);
  const over = derbySeriesStatus(upTo).over;
  const el = document.getElementById('dc-after');
  if (!el) return;
  el.innerHTML = `${g.pens ? `<div class="dc-pens">תיקו ${g.gf}-${g.ga} · פנדלים ${g.pens.gf}-${g.pens.ga}</div>` : ''}
    <div class="dc-verdict ${g.won ? 'w' : 'l'}">${g.won ? 'ניצחון!' : 'הפסד'}</div>
    ${derbySeriesLine(upTo)}
    <button class="btn-primary dc-go" id="dc-next">${over ? 'לסיכום ←' : 'למשחק הבא ←'}</button>`;
  document.getElementById('dc-next').onclick = () => (over ? derbyRenderEnd(run) : derbyRenderNext(run));
}

/* ── the end ─────────────────────────────────────────────────────────────── */
function derbyRenderEnd(run) {
  derbyStopClock();
  const s = derbySeriesStatus(run.games), club = derbyTeamName(run.club);
  derbyRoot().innerHTML = `
    <div class="dc-end ${s.won ? 'w' : 'l'}">${derbyCrest(run.club, 'dc-crest-lg')}
      <div class="dc-end-title">${s.won ? '🏆 אלופי הדרבי!' : 'הפסד בסדרה'}</div>
      <div class="dc-end-score">${derbyEsc(club)} ${s.w}:${s.l}</div></div>
    <ul class="dc-games">${run.games.map((g, i) => `<li class="${g.won ? 'w' : 'l'}">
      <span>משחק ${i + 1}</span><span>${derbyEsc(derbyTeamName(g.rival))}</span>
      <span>${g.gf}-${g.ga}${g.pens ? ` (פנ' ${g.pens.gf}-${g.pens.ga})` : ''}</span></li>`).join('')}</ul>
    <div class="dc-end-btns">
      <button class="btn-primary" id="dc-share">שתף</button>
      <button class="btn-secondary" id="dc-again">שוב עם ${derbyEsc(club)}</button>
      <button class="btn-secondary" id="dc-other">מועדון אחר</button>
    </div>`;
  document.getElementById('dc-share').onclick = () => derbyShare(run);
  document.getElementById('dc-again').onclick = () => derbyStart(run.club, run.difficulty);
  document.getElementById('dc-other').onclick = () => { derbyClear(); derbyRenderPicker(); };
}

function derbyShareText(run) {
  const s = derbySeriesStatus(run.games);
  const head = `${s.won ? '🏆 אלופי הדרבי' : '⚔️ סדרת הדרבי'} · ${derbyTeamName(run.club)} ${s.w}:${s.l}`;
  const lines = run.games.map(g => `${g.won ? '🟩' : '🟥'} ${derbyTeamName(g.rival)} ${g.gf}-${g.ga}${g.pens ? ' (פנדלים)' : ''}`);
  const xi = (run.xi || []).map(derbyEntry).filter(Boolean).map(e => e.player.name).join(', ');
  return `${head}\n${lines.join('\n')}\nההרכב: ${xi}\nhttps://www.36-0.co.il`;
}

function derbyShare(run) {
  const text = derbyShareText(run);
  derbyTrack('share', run.club);
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  try {
    navigator.clipboard.writeText(text);
    const b = document.getElementById('dc-share'); if (b) b.textContent = 'הועתק ✓';
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setup-derby-card')?.addEventListener('click', derbyOpen);
});
```

- [ ] **Step 2: Write `css/derby.css`** — dark palette only (the owner has rejected light panels three times):

```css
/* אלופי הדרבי — js/derby-screens.js. Dark palette only: tokens from style.css. */
#derby-root { display: flex; flex-direction: column; gap: 12px; padding-bottom: 24px; }
.dc-lead { color: var(--dim); margin: 0; line-height: 1.5; }
.dc-crest { width: 36px; height: 36px; object-fit: contain; }
.dc-crest-lg { width: 56px; height: 56px; object-fit: contain; }

.dc-diff { display: flex; gap: 8px; }
.dc-diff-btn { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font: inherit; cursor: pointer; }
.dc-diff-btn.on { border-color: var(--accent); color: var(--accent); }

.dc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.dc-club { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px;
  border-radius: 10px; border: 1px solid var(--border); background: var(--surface);
  color: var(--text); font: inherit; cursor: pointer; text-align: center; }
.dc-club:hover { border-color: var(--accent); }
.dc-club-name { font-weight: 700; }
.dc-club-seasons { color: var(--dim); font-size: 12px; }
.dc-club-rivals { color: var(--dim); font-size: 11px; line-height: 1.4; }
.dc-club-rivals b { color: var(--text); }

.dc-me { display: flex; align-items: center; gap: 12px; }
.dc-me-name { font-weight: 700; font-size: 18px; }
.dc-me-sub { color: var(--dim); }
.dc-sec { color: var(--dim); font-size: 13px; margin-top: 4px; }
.dc-rival { border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
.dc-rival.arch { border-color: var(--accent2); }
.dc-rival summary { display: flex; align-items: center; gap: 10px; padding: 10px; cursor: pointer; list-style: none; }
.dc-rv-name { flex: 1; font-weight: 700; }
.dc-rv-name em { color: var(--accent2); font-style: normal; font-size: 12px; margin-inline-start: 6px; }
.dc-rv-games { color: var(--dim); font-size: 12px; }
.dc-ovr { font-weight: 800; color: var(--accent); min-width: 28px; text-align: center; }
.dc-xi { list-style: none; margin: 0; padding: 0 10px 10px; display: grid; gap: 4px; }
.dc-xi li { display: grid; grid-template-columns: 42px 1fr auto 28px; gap: 8px; font-size: 13px; }
.dc-pos, .dc-ss { color: var(--dim); }
.dc-ov { text-align: center; }
.dc-go { align-self: stretch; }

.dc-match-head { text-align: center; color: var(--dim); }
.dc-board { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 8px; }
.dc-side { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; font-weight: 700; }
.dc-score { display: flex; flex-direction: column; align-items: center; }
#dc-sc { font-size: 32px; font-weight: 800; direction: ltr; }
.dc-clock { color: var(--accent); font-variant-numeric: tabular-nums; }
.dc-events { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.dc-events li { padding: 6px 10px; border-radius: 8px; background: var(--surface2); font-size: 14px; }
.dc-events li.theirs { color: var(--dim); }
.dc-pens { text-align: center; color: var(--dim); }
.dc-verdict { text-align: center; font-size: 22px; font-weight: 800; }
.dc-verdict.w { color: #3fb950; }
.dc-verdict.l { color: #f85149; }
.dc-series { display: flex; justify-content: center; align-items: center; gap: 6px; }
.dc-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); }
.dc-dot.w { background: #3fb950; border-color: #3fb950; }
.dc-dot.l { background: #f85149; border-color: #f85149; }
.dc-series b { margin-inline-start: 6px; }

.dc-end { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px;
  border-radius: 12px; background: var(--surface); border: 1px solid var(--border); }
.dc-end.w { border-color: var(--accent); }
.dc-end-title { font-size: 26px; font-weight: 800; }
.dc-end.w .dc-end-title { color: var(--accent); }
.dc-end-score { color: var(--dim); }
.dc-games { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.dc-games li { display: grid; grid-template-columns: 70px 1fr auto; gap: 8px; padding: 8px 10px;
  border-radius: 8px; background: var(--surface2); border-inline-start: 3px solid var(--border); }
.dc-games li.w { border-inline-start-color: #3fb950; }
.dc-games li.l { border-inline-start-color: #f85149; }
.dc-end-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.dc-end-btns > * { flex: 1 1 140px; }
```

- [ ] **Step 3: Wire `index.html`**

(a) After the `setup-story-card` `</button>` (~line 372), add:

```html
      <button class="setup-mode-card" id="setup-derby-card">
        <span class="smc-icon">🏆</span>
        <span class="smc-body">
          <span class="smc-title">אלופי הדרבי <span class="smc-new">חדש</span></span>
          <span class="smc-sub">הרכב הנצח של המועדון שלך, מול היריבות, בסדרת הטוב מ-5</span>
        </span>
        <span class="smc-arrow">←</span>
      </button>
```

(b) After the closing `</div>` of `#screen-story` (the block that starts at the `<!-- ══ STORY` comment, ~line 1024), add:

```html
  <!-- ══ DERBY (js/derby.js, js/derby-screens.js) ═════════════════════════════ -->
  <div id="screen-derby" class="screen screen-page">
    <div class="page-inner">
      <div class="page-header">
        <button class="back-btn" id="derby-back">→ חזרה</button>
        <h2 class="page-title">🏆 אלופי הדרבי</h2>
      </div>
      <div id="derby-root"></div>
    </div>
  </div>
```

(c) After `<link rel="stylesheet" href="css/club.css?v=...` add `<link rel="stylesheet" href="css/derby.css" />`.

(d) After `<script src="js/story-screens.js?v=..."></script>` add:

```html
  <script src="js/derby-data.js"></script>
  <script src="js/derby-ai.js"></script>
  <script src="js/derby-match.js"></script>
  <script src="js/derby.js"></script>
  <script src="js/derby-screens.js"></script>
```

- [ ] **Step 4: Stamp assets and re-run the tests**

Run: `node scripts/stamp_assets.js && node scripts/stamp_assets.js --check && node scripts/sim/derby_test.js`
Expected: stamp reports the six new files stamped; `--check` exits 0; tests all PASS.

- [ ] **Step 5: Commit**

```bash
git add js/derby-screens.js css/derby.css index.html
git commit -m "feat(derby): club picker, rivals, match and end screens"
```

---

### Task 8: Migration — runs, achievements, tracking

**Files:**
- Create: `supabase/migrations/20261005000002_derby_champions.sql`
- Test: `scripts/sim/derby_test.js`, `scripts/check_track_contract.js`

- [ ] **Step 1: Add the failing test that keeps the server's club list in step**

Insert before `console.log(\`\n${n} passed\`);`:

```js
  // ── Task 8: the migration knows the same clubs ─────────────────────────────
  t('submit_derby_run\'s v_known == derbyClubs()', () => {
    const sql = read('supabase/migrations/20261005000002_derby_champions.sql');
    const m = sql.match(/v_known\s+text\[\]\s*:=\s*ARRAY\[([^\]]+)\]/);
    assert.ok(m, 'v_known not found');
    const known = m[1].match(/'([^']+)'/g).map(s => s.slice(1, -1)).sort();
    assert.deepStrictEqual(known, G.derbyClubs().slice().sort());
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/sim/derby_test.js`
Expected: FAIL — `ENOENT ... 20261005000002_derby_champions.sql`.

- [ ] **Step 3: Write the migration**

```sql
-- אלופי הדרבי: the runs, six achievements, and 'derby' in track().
--
-- The mode runs in the browser, so what reaches the server is clamped and
-- checked against the clubs that exist (js/derby-data.js derbyClubs(); a test in
-- scripts/sim/derby_test.js keeps v_known equal to it) — never trusted as given.
-- `xi` is stored from day one as the raw material for the fans' XI (spec §8);
-- nothing reads it and it is shown to no one until the owner approves.
--
-- array_append, never `earned || 'key'` (20260831000001: an untyped literal on
-- the right parses as an array and aborts the whole function).

CREATE TABLE IF NOT EXISTS derby_runs (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club        text NOT NULL,
  difficulty  text NOT NULL,
  wins        int  NOT NULL,
  losses      int  NOT NULL,
  won         boolean NOT NULL,
  xi          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS derby_runs_club_idx ON derby_runs (club, created_at DESC);
ALTER TABLE derby_runs ENABLE ROW LEVEL SECURITY;
-- no policies: rows are written by submit_derby_run only

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('dc_first',    'אלופי הדרבי',  'נצח בסדרת דרבי',                              '🏆', false),
  ('dc_sweep',    'טאטוא',        'נצח סדרת דרבי 3:0',                           '🧹', false),
  ('dc_comeback', 'קאמבק',        'נצח סדרת דרבי אחרי פיגור 0:2',                '🔥', false),
  ('dc_decider',  'משחק חמישי',   'נצח את היריבה המושבעת במשחק החמישי',           '⚔️', false),
  ('dc_hard',     'בלי הנחות',    'נצח סדרת דרבי ברמה קשה',                      '💪', false),
  ('dc_all',      'כל הדרבים',    'נצח סדרת דרבי עם כל אחד מהמועדונים',           '🌍', false)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_derby_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid        uuid    := auth.uid();
  v_known    text[]  := ARRAY['maccabi-haifa','maccabi-tlv','beitar-jerusalem','ms-ashdod','hapoel-tlv',
                              'maccabi-netanya','maccabi-pt','bnei-sakhnin','hapoel-beersheba','hapoel-haifa',
                              'bnei-yehuda','ironi-ks','hapoel-pt'];
  v_club     text    := COALESCE(p->>'club', '');
  v_diff     text    := COALESCE(p->>'difficulty', '');
  v_w        int     := LEAST(GREATEST(COALESCE((p->>'wins')::int, 0), 0), 3);
  v_l        int     := LEAST(GREATEST(COALESCE((p->>'losses')::int, 0), 0), 3);
  v_comeback boolean := COALESCE((p->>'comeback')::boolean, false);
  v_decider  boolean := COALESCE((p->>'decider')::boolean, false);
  v_total    int     := array_length(v_known, 1);
  v_clubs    int     := LEAST(GREATEST(COALESCE((p->>'won_clubs')::int, 0), 0), v_total);
  v_xi       jsonb   := CASE WHEN jsonb_typeof(p->'xi') = 'array' AND jsonb_array_length(p->'xi') <= 11
                             THEN p->'xi' ELSE '[]'::jsonb END;
  v_won      boolean;
  earned     text[]  := '{}';
  fresh      text[]  := '{}';
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF NOT (v_club = ANY (v_known)) OR v_diff NOT IN ('easy','normal','hard') THEN
    RETURN jsonb_build_object('error', 'bad run');
  END IF;
  -- a finished best-of-5 has exactly one side on three
  IF NOT ((v_w = 3 AND v_l < 3) OR (v_l = 3 AND v_w < 3)) THEN
    RETURN jsonb_build_object('error', 'bad series');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;
  v_won := v_w = 3;

  INSERT INTO derby_runs (user_id, club, difficulty, wins, losses, won, xi)
  VALUES (uid, v_club, v_diff, v_w, v_l, v_won, v_xi);

  IF v_won THEN
    earned := array_append(earned, 'dc_first');
    IF v_l = 0                    THEN earned := array_append(earned, 'dc_sweep');    END IF;
    IF v_comeback AND v_l = 2     THEN earned := array_append(earned, 'dc_comeback'); END IF;
    IF v_decider AND v_l = 2      THEN earned := array_append(earned, 'dc_decider');  END IF;
    IF v_diff = 'hard'            THEN earned := array_append(earned, 'dc_hard');     END IF;
    IF v_clubs >= v_total         THEN earned := array_append(earned, 'dc_all');      END IF;
  END IF;

  WITH ins AS (
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING
    RETURNING achievement_key
  )
  SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END $$;

GRANT EXECUTE ON FUNCTION submit_derby_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_derby_run(jsonb) FROM anon;

-- track(): 'derby' added. The body is COPIED from 20260923000001, not retyped —
-- retyping is how 'cid' replaced 'client_id' and six hours of events were lost.
-- scripts/check_track_contract.js compares the two.
CREATE OR REPLACE FUNCTION track(p jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid   uuid := NULLIF(p->>'client_id','')::uuid;
  v_uid   uuid := auth.uid();
  v_mode  text := lower(COALESCE(p->>'mode', ''));
  v_event text := lower(COALESCE(p->>'event', ''));
BEGIN
  IF v_cid IS NULL THEN RETURN; END IF;
  IF v_mode NOT IN ('draft','challenge','career','minigame','gauntlet','europe',
                    'duel','league','entry','salarycap','install','january',
                    'story','derby')
     OR v_event NOT IN ('open','finish','share','progress')
  THEN RETURN; END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(LEFT(COALESCE(p->>'detail',''), 120), ''));
END;
$$;
```

Before saving, open `supabase/migrations/20260923000001_story_mode_track.sql` and confirm the `track()` body above matches it character for character except `,'derby'`. If any later migration redefines `track()` (`grep -l "FUNCTION track" supabase/migrations/*.sql`), copy from the newest one instead.

- [ ] **Step 4: Run both checks**

Run: `node scripts/sim/derby_test.js && node scripts/check_track_contract.js`
Expected: derby tests all PASS. `check_track_contract.js` must not report a NEW failure about `derby` or the payload keys. (It already fails on main for `club` / `coach-none` modes — pre-existing, recorded in project memory; leave those alone.)

- [ ] **Step 5: Commit — do NOT apply to Supabase**

```bash
git add supabase/migrations/20261005000002_derby_champions.sql scripts/sim/derby_test.js
git commit -m "feat(derby): derby_runs, six achievements, track('derby')"
```

---

### Task 9: Verify in a real browser

**Files:** none (fixes found here get their own commits).

- [ ] **Step 1: Load the project's verify skill and follow it**

Invoke the `verify` skill (it knows how to serve and drive this site headless). Screenshots are the ground truth.

- [ ] **Step 2: Drive these paths and screenshot each**
1. Setup screen shows the "🏆 אלופי הדרבי" card.
2. Picker: 13 clubs with crests; Beitar's line reads **בני סכנין** first.
3. Start **Beitar / רגיל**: every round's card is a Beitar season; no season repeats; the club-reroll button is hidden; season reroll shows 3.
4. After pick 11: the rivals screen (not the preseason), three rivals with ratings, archrival marked.
5. Play the series to the end: clock runs, goals appear, a draw shows a penalties line, the series stops at 3.
6. Refresh in the middle of the series → it resumes at the last played game with "למשחק הבא".
7. Repeat steps 3-5 with **מכבי נתניה** (light club) — the draft card's ink is readable (project lesson: always test a light club).
8. After the series, "שחק עכשיו" → a normal draft: cards come from many clubs, both reroll buttons visible, the cup and January appear as usual in the season. (Nothing from the derby carried over.)
9. Console has no errors throughout.

- [ ] **Step 3: Final test pass and stamp check**

Run: `node scripts/sim/derby_test.js && node scripts/sim/story_test.js && node scripts/stamp_assets.js --check`
Expected: all pass, stamps up to date.

- [ ] **Step 4: Stop and hand over** — report to the owner with the screenshots and the calibration table. Deploy (apply the migration → merge `derby-champions` into `main` → push → verify www.36-0.co.il) happens **only after his explicit OK**, in that order.
