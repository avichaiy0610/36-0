# אלופי הדרבי v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the shipped-to-branch v1 (one best-of-5 across three rivals) into spec §9: three best-of-5 series (one per rival, archrival last), a 7-man bench drafted after the XI, and live matches played in 15-minute segments with pause, tactic changes and up to 5 substitutions in 3 windows, with tiredness so a substitution matters.

**Architecture:** The pure engine stays in Node-testable files: `derby-data.js` (constants), `derby-ai.js` (computer draft incl. bench, line ratings with tactic + fatigue), `derby-match.js` (segment engine, substitutions, the auto-manager both the computer and the calibration bot use, series/run summary). `derby.js` owns the run object and its persistence (incl. a live match saved at every segment boundary); `derby-screens.js` draws the bench draft, rivals, the interactive match and the end. The simulation ENGINE (`js/sim-engine.js`) is still never touched — a segment is `simExpectedGoals × share` drawn by `simDrawGoals`, the same pattern as `gtSimSegment` in `js/gauntlet.js`.

**Tech Stack:** vanilla JS globals, Node + assert harness (`scripts/sim/derby_test.js`), Supabase plpgsql.

**Spec:** `docs/superpowers/specs/2026-10-05-derby-champions-design.md` — §9 overrides §2/§4/§6.

**Branch:** `derby-champions`. Nothing is merged, pushed or applied to Supabase without the owner's OK. The two derby migrations (`20261005000002`, `20261005000003`) have NEVER been applied anywhere, so they are edited in place.

**Line-ending note:** the repo's files are CRLF in the working tree. When editing by script, normalise `\r\n` → `\n`, edit, and write back in the original style; or use an editor tool.

---

### Task V1: Constants, bench in the computer draft, tactic + fatigue in line ratings

**Files:** Modify `js/derby-data.js`, `js/derby-ai.js`, `scripts/sim/derby_test.js`

- [ ] **Step 1: Constants.** In `js/derby-data.js`, REPLACE the `DERBY_ORDER` / `DERBY_HOME` block (and its comment) with:

```js
// v2 (spec §9): three series, a best-of-5 against each rival — rival ג, then ב,
// then the archrival as the final. Every series: home, away, home, away, home.
const DERBY_SERIES_ORDER = [2, 1, 0];
const DERBY_GAME_HOME = [true, false, true, false, true];

// The bench: seven more draft rounds after the XI, any position.
const DERBY_BENCH = 7;
// In a match: five substitutions in three stoppages, as in the real game
// (half-time does not count as a stoppage). Played in 15-minute segments.
const DERBY_SUBS = 5;
const DERBY_SUB_WINDOWS = 3;
const DERBY_CHUNK = 15;
// Tiredness, so that a substitution is worth something: a man loses 0.1 of a
// rating point for every minute past his 60th on the pitch (−3 at 90').
const DERBY_FATIGUE_FROM = 60;
const DERBY_FATIGUE_PER_MIN = 0.1;
```

- [ ] **Step 2: Bench in `derbyAiDraft`.** In `js/derby-ai.js`, replace the final `return { slots, picks };` of `derbyAiDraft` with:

```js
  // The bench: DERBY_BENCH more rounds by the same rules, any position. Drawn
  // after the XI from the same stream, so the XI for a seed is unchanged.
  const bench = [];
  while (bench.length < DERBY_BENCH) {
    const fresh = seasons.filter(sq => !usedSeasons.has(sq.id));
    const pool = fresh.length ? fresh : seasons;
    let best = null;
    for (let k = 0; k < cfg.look; k++) {
      const sq = pool[Math.floor(rng() * pool.length)];
      const o = sq.players.filter(p => !usedNames.has(p.name))
        .map(p => ({ player: p, squad: sq }))
        .sort((a, b) => playerOVR(b.player) - playerOVR(a.player));
      if (o.length && (!best || playerOVR(o[0].player) > playerOVR(best.list[0].player))) best = { sq, list: o };
    }
    if (!best) break;
    const c = choose(best.list);
    bench.push({ player: c.player, squad: c.squad });
    usedNames.add(c.player.name); usedSeasons.add(best.sq.id);
  }
  return { slots, picks, bench };
```

- [ ] **Step 3: Tactic + fatigue in `derbyLinesFor`.** Replace `derbyLinesFor` with:

```js
// Rating lost to tiredness: 0.1 a minute past a man's 60th on the pitch.
// `pick.on` is the minute he came on (0 for a starter).
function derbyFatigue(pick, minute) {
  const t = minute - (pick.on || 0) - DERBY_FATIGUE_FROM;
  return t > 0 ? t * DERBY_FATIGUE_PER_MIN : 0;
}

// The four line ratings of ANY XI, on exactly the terms of the player's own
// (myLineRatings: out-of-position penalty, chemistry, tags, the tactic's
// +atk/−def trade), optionally at `minute` with tiredness. It reads `state`, so
// the XI is lent to it and the player's own is put back, whatever happens.
// Memoised: a calibration run asks for the same eleven hundreds of times.
const _derbyLinesMemo = new Map();
function derbyLinesFor(picks, slots, tactic, minute) {
  const m = minute || 0;
  const tired = m > DERBY_FATIGUE_FROM;
  const key = (tactic || 'bal') + '|' + (tired ? m : 0) + '|' + slots.map(s => s.id || s.pos).join(',') + '|' +
    picks.map(p => p ? p.squad.id + ':' + p.player.name + ':' + (p.on || 0) : '-').join(',');
  const hit = _derbyLinesMemo.get(key);
  if (hit) return Object.assign({}, hit);
  const keep = { picks: state.picks, slots: state.slots, tactic: state.tactic };
  try {
    state.picks = picks; state.slots = slots; state.tactic = tactic || 'bal';
    const out = myLineRatings(tired ? (p => playerOVR(p.player) - derbyFatigue(p, m)) : undefined);
    if (_derbyLinesMemo.size > 20000) _derbyLinesMemo.clear();
    _derbyLinesMemo.set(key, out);
    return Object.assign({}, out);
  } finally {
    state.picks = keep.picks; state.slots = keep.slots; state.tactic = keep.tactic;
  }
}
```

(The memo key includes everything `myLineRatings` reads that varies here. `peakMode`/`classic`/`coach`/`story`/`crowdMode` are forced off for the whole derby by `derbyApplyMine` / `derbyBeginDraft`, and the calibrator sets them off, so they are constant within a process.)

- [ ] **Step 4: Tests.** In `scripts/sim/derby_test.js`:
  - In `EXPORTS` replace `'DERBY_ORDER', 'DERBY_HOME',` with `'DERBY_SERIES_ORDER', 'DERBY_GAME_HOME', 'DERBY_BENCH', 'DERBY_SUBS', 'DERBY_SUB_WINDOWS', 'DERBY_CHUNK',` and add `'derbyFatigue', 'derbyMatchNew', 'derbyMatchStep', 'derbySub', 'derbyCanSub', 'derbyAutoManage', 'derbySeriesRival', 'derbyRunSummary', 'playerOVR'`; remove `'derbyGoalEvents', 'derbyGameRival'`.
  - Add these tests in the Task 2 block:

```js
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
```

- [ ] **Step 5:** Run `node scripts/sim/derby_test.js`. The OLD Task 3 match tests will now fail (they call removed functions) — that is expected and fixed in V2. The new V1 tests must pass. Do not commit yet; V1 and V2 are committed together.

---

### Task V2: The segment engine

**Files:** Replace `js/derby-match.js` entirely; modify `scripts/sim/derby_test.js` (replace the old Task 3 tests).

- [ ] **Step 1: Write `js/derby-match.js`:**

```js
// ─── אלופי הדרבי — the match engine and the series (spec §9) ────────────────
// A match is played in DERBY_CHUNK-minute segments of the league's own model:
// xG from the line ratings × the segment's share of ninety, goals drawn by the
// same binomial (simDrawGoals) — the gauntlet's gtSimSegment pattern, so a
// derby is not a different sport. Between segments the manager may change the
// tactic or bring men on, and tiredness (derbyFatigue) is what makes that worth
// doing. Each segment is seeded from the match seed and its first minute, so a
// match replays identically from any saved boundary given the same decisions.
// Both sides' clean-sheet tags count (simulateMatchV2 only applies the
// player's — its opponents are real clubs without tags).

function derbySide(xi) {
  return {
    picks: xi.picks.map(e => (e ? { player: e.player, squad: e.squad, on: e.on || 0 } : null)),
    bench: (xi.bench || []).map(e => ({ player: e.player, squad: e.squad })),
    slots: xi.slots, tactic: xi.tactic || 'bal',
    subs: xi.subs || 0, windows: xi.windows || 0, lastWin: xi.lastWin ?? -1, off: (xi.off || []).slice(),
  };
}

// me / opp: { picks, bench, slots, tactic } — picks aligned with slots.
function derbyMatchNew(me, opp, home, seed) {
  return { min: 0, gf: 0, ga: 0, home, seed: seed | 0, events: [], over: false, won: null, pens: null,
           me: derbySide(me), opp: derbySide(opp) };
}

// Half-time is free, as in the real rules; any other stoppage that brings a
// man on uses one of the DERBY_SUB_WINDOWS.
function derbyCanSub(side, minute) {
  if (side.subs >= DERBY_SUBS || !side.bench.length) return false;
  return minute === 45 || side.lastWin === minute || side.windows < DERBY_SUB_WINDOWS;
}

function derbySub(side, slotIdx, benchIdx, minute) {
  const inE = side.bench[benchIdx];
  if (!inE || !side.picks[slotIdx] || !derbyCanSub(side, minute)) return false;
  if (minute !== 45 && side.lastWin !== minute) { side.windows++; side.lastWin = minute; }
  side.subs++;
  side.off.push(side.picks[slotIdx]);
  side.picks[slotIdx] = { player: inE.player, squad: inE.squad, on: minute };
  side.bench.splice(benchIdx, 1);
  return true;
}

// How the computer manages — and the calibration bot's rule for the player.
// `lead` is this side's goal difference. Tactic: chase from 60', protect from
// 70'. Substitutions: three at 60', two at 75', each only when a bench man who
// fits the slot will be better than the tired man there over the next segment.
// The goalkeeper is never changed.
function derbyAutoManage(side, minute, lead) {
  side.tactic = (minute >= 60 && lead < 0) ? 'att' : (minute >= 70 && lead > 0) ? 'def' : 'bal';
  const n = minute === 60 ? 3 : minute === 75 ? 2 : 0;
  for (let k = 0; k < n && derbyCanSub(side, minute); k++) {
    let best = null;
    side.bench.forEach((b, bi) => {
      side.picks.forEach((p, si) => {
        const pos = slotFitPos(side.slots[si]);
        if (!p || pos === 'GK' || !playerFitsSlot(b.player, pos)) return;
        const gain = playerOVR(b.player) - (playerOVR(p.player) - derbyFatigue(p, minute + DERBY_CHUNK));
        if (gain > 0 && (!best || gain > best.gain)) best = { bi, si, gain };
      });
    });
    if (!best) break;
    derbySub(side, best.si, best.bi, minute);
  }
}

// Who scored — display only; the goal itself is already drawn.
const DERBY_GOAL_W = { ST: 6, CF: 6, LW: 4, RW: 4, CAM: 4, LM: 2.5, RM: 2.5, CM: 2, CDM: 1,
                       LB: 0.7, RB: 0.7, CB: 0.6, GK: 0 };
function derbyScorer(side, rng) {
  const list = side.picks.filter(Boolean);
  const w = list.map(e => DERBY_GOAL_W[normalizePos(e.player.position)] ?? 1);
  let r = rng() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0 && w[i] > 0) return list[i]; }
  return list.find((e, i) => w[i] > 0) || list[0];
}

// Play the next segment. The player's decisions must already be applied to
// m.me; the computer decides here (and, with autoMe, the calibration bot for
// the player). Returns the goal events of this segment.
function derbyMatchStep(m, autoMe) {
  if (m.over) return [];
  const from = m.min, to = Math.min(90, from + DERBY_CHUNK);
  const mid = (from + to) / 2, share = (to - from) / 90;
  derbyAutoManage(m.opp, from, m.ga - m.gf);
  if (autoMe) derbyAutoManage(m.me, from, m.gf - m.ga);
  const a = derbyLinesFor(m.me.picks, m.me.slots, m.me.tactic, mid);
  const b = derbyLinesFor(m.opp.picks, m.opp.slots, m.opp.tactic, mid);
  const seg = (m.seed + (from + 1) * 104729) | 0;
  const g = withSeededRandom(seg, () => {
    const A = simShrinkLines(a), B = simShrinkLines(b);
    // a clean-sheet promise is about the whole match: each segment gets its share
    return {
      gf: simDrawGoals(simExpectedGoals(A, B, m.home) * share, Math.pow(b.cs || 1, share)),
      ga: simDrawGoals(simExpectedGoals(B, A, !m.home) * share, Math.pow(a.cs || 1, share)),
    };
  });
  const rng = derbyRng(seg ^ 0x9e3779b9), out = [];
  const ev = (side, mine) => {
    const e = derbyScorer(side, rng);
    out.push({ min: from + 1 + Math.floor(rng() * (to - from)), mine, name: e.player.name, sub: (e.on || 0) > 0 });
  };
  for (let i = 0; i < g.gf; i++) ev(m.me, true);
  for (let i = 0; i < g.ga; i++) ev(m.opp, false);
  out.sort((x, y) => x.min - y.min);
  m.gf += g.gf; m.ga += g.ga; m.min = to;
  m.events.push(...out);
  if (to >= 90) derbyMatchEnd(m, a, b);
  return out;
}

// Level after ninety goes straight to penalties, tilted a little by the keepers.
function derbyMatchEnd(m, a, b) {
  m.over = true;
  m.won = m.gf > m.ga;
  if (m.gf !== m.ga) return;
  const rng = derbyRng((m.seed ^ 0x5bd1e995) | 0);
  const p = Math.max(0.35, Math.min(0.65, 0.5 + 0.01 * ((a.gk || 80) - (b.gk || 80))));
  m.won = rng() < p;
  const w = 3 + Math.floor(rng() * 3), l = w - 1 - (rng() < 0.3 ? 1 : 0);
  m.pens = m.won ? { gf: w, ga: l } : { gf: l, ga: w };
}

// A whole match with both sides managed by the rule — tests and calibration.
function derbyPlayMatch(me, opp, home, seed) {
  const m = derbyMatchNew(me, opp, home, seed);
  while (!m.over) derbyMatchStep(m, true);
  return m;
}

function derbySeriesStatus(games) {
  const w = games.filter(g => g.won).length, l = games.length - w;
  return { w, l, over: w >= 3 || l >= 3, won: w >= 3 };
}

function derbySeriesRival(club, s) {
  return DERBY_RIVALS[club][DERBY_SERIES_ORDER[s]];
}

// series: [{ rival, games: [...] }] in play order.
function derbyRunSummary(series) {
  const st = series.map(s => derbySeriesStatus(s.games));
  const seriesWon = st.filter(x => x.over && x.won).length;
  return { seriesWon, over: series.length === 3 && st.every(x => x.over), title: seriesWon === 3 };
}
```

- [ ] **Step 2: Replace the old Task 3 tests** (from `// ── Task 3: match and series` through the clean-sheet test) with:

```js
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
  t('subs: at most 5, at most 3 windows, half-time is free', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    const side = m.me;
    assert.ok(G.derbySub(side, 1, 0, 45)); assert.ok(G.derbySub(side, 2, 0, 45));   // half-time: no window
    assert.strictEqual(side.windows, 0);
    assert.ok(G.derbySub(side, 3, 0, 60)); assert.ok(G.derbySub(side, 4, 0, 60));   // window 1
    assert.ok(G.derbySub(side, 5, 0, 75));                                           // window 2, 5th sub
    assert.ok(!G.derbySub(side, 6, 0, 75), 'a 6th sub');
    assert.strictEqual(side.subs, 5); assert.strictEqual(side.windows, 2);
    const s2 = G.derbyMatchNew(xiA, xiB, true, 5).me;
    assert.ok(G.derbySub(s2, 1, 0, 15) && G.derbySub(s2, 2, 0, 30) && G.derbySub(s2, 3, 0, 60));
    assert.ok(!G.derbySub(s2, 4, 0, 75), 'a 4th window');
    assert.ok(G.derbySub(s2, 4, 0, 45), 'half-time is still free');
  });
  t('a substitute comes on fresh', () => {
    const m = G.derbyMatchNew(xiA, xiB, true, 5);
    assert.ok(G.derbySub(m.me, 3, 0, 60));
    assert.strictEqual(m.me.picks[3].on, 60);
    assert.strictEqual(G.derbyFatigue(m.me.picks[3], 85), 0);
    assert.ok(G.derbyFatigue(m.me.picks[4], 85) > 0);
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
```

- [ ] **Step 3:** Run `node scripts/sim/derby_test.js` — all pass. (The old `derbyGoalEvents` / `derbyGameRival` / `derbyPlayMatch(lines…)` usages are gone from the tests.)

- [ ] **Step 4: Commit V1 + V2 together:**

```bash
git add js/derby-data.js js/derby-ai.js js/derby-match.js scripts/sim/derby_test.js
git commit -m "feat(derby): v2 engine — bench, 15-minute segments, subs, live tactic, tiredness"
```

(`js/derby.js`, `js/derby-screens.js` and `scripts/sim/derby_calibrate.js` still call v1 names and are fixed in V3-V5; the branch is not deployable between V2 and V5.)

---

### Task V3: Calibration for three series

**Files:** Rewrite `scripts/sim/derby_calibrate.js`; tune `DERBY_AI` in `js/derby-data.js` only.

- [ ] **Step 1:** Rewrite the calibrator. Keep its header comment style. Behaviour:
  - `G.DERBY_AI.__bot = { weights: [1, 0, 0], look: 1 }` — the player bot (greedy, no rerolls), drafted with `derbyAiDraft(club, '4-3-3', '__bot', rng)` (it gets a bench too).
  - Rivals drafted with the difficulty under test, each with bench.
  - Three series in `DERBY_SERIES_ORDER`, each best-of-5 with `DERBY_GAME_HOME`, every game `derbyPlayMatch(me, opp, home, seed)` — BOTH sides auto-managed (same rule).
  - Per club × difficulty: **series win %** (over all series played) and **title %** (3/3).
  - Print a table (club, easy/normal/hard series %, and title % for normal), averages, `NOTE:` for clubs under 10% series wins on normal.
  - **Gate:** normal average series win % within 50 ± 5. Exit code 0/1.
  - Default runs: 300 (the engine is ~6× heavier than v1). Allow `node scripts/sim/derby_calibrate.js 300`.
- [ ] **Step 2:** Run it. Tune `DERBY_AI` (weights first, then `look`, look ≤ 3) until the gate passes; easy ≈ 65%, hard ≈ 35% series wins as close as the levers allow. Do NOT add per-club mechanisms.
- [ ] **Step 3:** Add `DERBY_UNDERDOGS` to `js/derby-data.js`: the three clubs with the lowest normal series-win % in the final run, with a comment citing the date and their numbers. Export it in the test harness.
- [ ] **Step 4:** `node scripts/sim/derby_test.js` passes (incl. "harder computer drafts a stronger XI"). Commit `js/derby-data.js scripts/sim/derby_calibrate.js scripts/sim/derby_test.js` as "feat(derby): calibrate three series" with the final table in the message.

---

### Task V4: The run — `js/derby.js` v2

**Files:** Modify `js/derby.js`

Keep everything that is unrelated to the series (load/save/clear, `derbyClearDraftSave`, `derbyEntryKey`/`derbyEntry`, `derbyStart`, `derbyBeginDraft`, `derbyApplyMine`, `derbyTrack`, the fallback/guard logic in `derbyAfterDraft`). Change:

- [ ] **Run shape** — `v: 2`. `derbyLoad` returns null for anything but v 2 (a v1 run in a tester's storage is simply dropped). Fields:
  `{ v:2, club, difficulty, formationId, tactic, seed, phase: 'draft'|'bench'|'rivals'|'play'|'done', xi:[key], bench:[key], benchDraw: squadId|null, rerolls: n, rivals: { [id]: { xi:[key], bench:[key] } }, series: [{ rival, games: [game] }], live: null|liveMatch, submitted }`
  where `game = { gf, ga, home, won, pens, events }`.
- [ ] **`derbyAfterDraft`** (phase `draft` only): store `run.xi`, `run.tactic`, `run.rerolls = state.seasonRerollsLeft`, set `phase = 'bench'`, track `'|drafted'`, `derbyShow()`. Rivals are NOT drafted here any more.
- [ ] **Bench draft:**
  - `derbyBenchSeasonsUsed(run)` → set of squad ids in `run.xi` + `run.bench`.
  - `derbyBenchDraw(run)` → if `run.benchDraw` is set return that squad; else draw a random season of the club not yet used (any season if all are used), store `run.benchDraw`, save, return it. Uses `Math.random` (it's the human's draw; persisted so a refresh shows the same season).
  - `derbyBenchCandidates(run, sq)` → that season's players whose names are not in xi/bench, best first by `playerOVR`.
  - `derbyBenchPick(run, name)` → push the key, clear `benchDraw`, save. When `run.bench.length === DERBY_BENCH`: draft the rivals (`derbyAiDraft(id, run.formationId, run.difficulty, derbyRng(run.seed))` for each `DERBY_RIVALS[run.club]`, storing `{ xi, bench }` keys), `run.series = [{ rival: derbySeriesRival(run.club, 0), games: [] }]`, `phase = 'rivals'`, save, track `'|bench'`.
  - `derbyBenchReroll(run)` → if `run.rerolls > 0`: decrement, clear `benchDraw`, save; returns boolean.
- [ ] **Sides:** `derbyMySide(run)` → `{ picks: run.xi.map(derbyEntry), bench: run.bench.map(derbyEntry), slots: formationSlots(run.formationId, run.tactic), tactic: run.tactic }` (call `derbyApplyMine(run)` first so `state` is neutral). `derbyRivalSide(run, id)` → same from `run.rivals[id]` with `formationSlots(run.formationId, 'bal')`, tactic `'bal'`.
- [ ] **Live match persistence:** `derbyLiveSave(m)` → a JSON-safe copy where every `{player, squad, on}` becomes `{squadId, name, on}` (in `me/opp.picks`, `bench`, `off`); slots are NOT stored (rebuilt from the run). `derbyLiveLoad(run)` → the inverse, rebuilding slots via the two side builders.
- [ ] **Flow:**
  - `derbyCurrent(run)` → `{ s, g }`: the index of the first series not over and the next game number in it; null when all three are over.
  - `derbyGameStart(run)` → if `run.live` exists return it (loaded); else build `derbyMatchNew(derbyMySide(run), derbyRivalSide(run, rival), DERBY_GAME_HOME[g], (run.seed + (s + 1) * 7919 + (g + 1) * 104729) | 0)`, save it to `run.live`, return the match object.
  - `derbyGameStep(run, m)` → `derbyMatchStep(m, false)`; then if `m.over`: push `{gf,ga,home:m.home,won:m.won,pens:m.pens,events:m.events}` to the current series' games, `run.live = null`; if that series is over and `s < 2`, push the next series `{ rival: derbySeriesRival(run.club, s + 1), games: [] }`; if all three are over: `phase = 'done'`, `derbyFinish(run)`, `derbyClearDraftSave()`. Else `run.live = derbyLiveSave(m)`. Save. Return the segment's events.
  - The player's in-match decisions mutate `m.me` (`m.me.tactic = …`, `derbySub(m.me, slotIdx, benchIdx, m.min)`) and then `run.live = derbyLiveSave(m); derbySave(run)`.
- [ ] **`derbyFinish(run)`**: track finish `club|<seriesWon>`; `derbySubmit(run)`.
- [ ] **`derbySubmit(run)` payload:**

```js
{ club, difficulty,
  series: run.series.map(s => { const st = derbySeriesStatus(s.games); return { rival: s.rival, w: st.w, l: st.l }; }),
  decider: !!(run.series[2] && run.series[2].games.length === 5 && run.series[2].games[4].won),
  comeback: run.series.some(s => { const g = s.games; return derbySeriesStatus(g).won && g.length >= 4 && !g[0].won && !g[1].won; }),
  super_sub: run.series.some(s => s.games.some(g => g.won && g.events.some(e => e.mine && e.sub))),
  xi: run.xi, bench: run.bench }
```

- [ ] `node --check js/derby.js`. Commit "feat(derby): v2 run — bench draft, three series, live match saved per segment".

---

### Task V5: Screens v2

**Files:** Modify `js/derby-screens.js`, `css/derby.css`. Dark palette only; mobile first (390px, 16px gutter, no horizontal scroll). Every interpolated string through `derbyEsc`.

- [ ] **`derbyShow` routing:** no run → picker; `draft` → picker (unchanged); `bench` → bench screen; `rivals` → rivals screen; `play` → match screen (resume `run.live` paused, or the pre-match view of the next game); `done` → end screen. The `rivals` screen's start button sets `phase = 'play'`.
- [ ] **Bench screen:** header "ספסל · שחקן N מתוך 7"; the drawn season as a small card (crest + "מכבי חיפה 2004/05"); its candidate list (position, name, rating) — tap = pick; a "החלף עונה (n)" button using `derbyBenchReroll`; below, the 11 already picked (compact) and the bench so far. No roulette animation needed.
- [ ] **Rivals screen:** every rival's XI AND bench shown **open** (not inside a collapsed `<details>`), plus your XI and bench. Show which series each rival is: "סדרה 1", "סדרה 2", "הגמר · המושבעת".
- [ ] **Match screen:**
  - Header: "סדרה S מתוך 3 · מול <rival> · משחק G" and the series score of THIS series ("1:2").
  - **Scoreboard bug fix:** the home side is on the RIGHT in RTL, so the score text must read with the home goals on the right. With the score element `direction:ltr`, render `${awayGoals} - ${homeGoals}`. Add a comment saying why.
  - Clock runs per segment (≈ 45 ms per minute as now), painting goals of that segment by minute. After each segment the next one plays automatically unless the player pressed **"⏸ עצירה"** (it pauses at the next boundary). **Half-time (45') always pauses.**
  - **Pause panel:** tactic chips התקפי / מאוזן / הגנתי (current one selected) with the trade text from `tacticTrade(k)` if available; **substitutions**: tap a player on your XI list, then a bench player → `derbySub(m.me, slotIdx, benchIdx, m.min)`; show "חילופים: X/5 · עצירות: Y/3 (המחצית לא נספרת)"; disable when `derbyCanSub` is false; a tired man's effective rating shown (`playerOVR - derbyFatigue`) so the choice is informed; "המשך ▶".
  - Both line-ups visible on the match screen: yours (with ⬆/⬇ marks for subs) and the rival's current XI, collapsible is fine here.
  - When the computer makes subs, add a line to the events list: "🔁 <rival>: X ⬅ Y" (derive by diffing `m.opp.picks` before/after `derbyGameStep`).
  - After 90: result line (+ penalties), series status, button "למשחק הבא" / "לסדרה הבאה" / "לסיכום".
- [ ] **End screen:** headline "🏆 אלופי הדרבי!" only on 3/3; otherwise "ניצחת N מתוך 3 סדרות". One row per series: rival, series score (e.g. 3:1) and its games' scores. Remove the old "מכבי חיפה 3:0" line. Share text updated the same way.
- [ ] Remove every use of `DERBY_ORDER`/`DERBY_HOME`/`derbyGameRival`.
- [ ] `node --check`, `node scripts/stamp_assets.js && node scripts/stamp_assets.js --check`, `node scripts/sim/derby_test.js`. Commit "feat(derby): v2 screens — bench, open line-ups, live match with subs and tactic".

---

### Task V6: Migration v2 + achievements

**Files:** Edit in place `supabase/migrations/20261005000002_derby_champions.sql`; tests in `scripts/sim/derby_test.js`.

- [ ] `derby_runs` columns become: `user_id, club, difficulty, series jsonb, series_won int, title boolean, xi jsonb, bench jsonb, created_at` (drop wins/losses/won).
- [ ] Achievements (keep the `ON CONFLICT … DO UPDATE` pattern; texts in Hebrew per spec §9.5): `dc_first` (title), `dc_sweep`, `dc_comeback`, `dc_decider`, `dc_hard` (title on hard), `dc_all` (titles with all 13 — counted from rows), `dc_arch_sweep` (final series 3:0), `dc_both_sides` (titles with a club AND with its archrival — counted from rows, both directions), `dc_underdog` (series_won ≥ 2 on normal/hard with a club in `v_underdog`), `dc_super_sub` (client flag, only if at least one series game was won).
- [ ] `submit_derby_run(p)` validates: known club, difficulty in easy/normal/hard, `series` is an array of exactly 3, each `{rival, w, l}` with exactly one side on 3 (other < 3), and `rival` equal to the expected rival for that position — from a `v_rivals jsonb` map club → [ג, ב, archrival] in play order. Computes `series_won`, `title`. Inserts, then awards with `array_append` only. `xi`/`bench` stored as arrays only if they are arrays of ≤ 11 / ≤ 7 (nested CASE).
- [ ] Constants that must stay equal to the JS, each with a test in `derby_test.js` that parses the SQL:
  - `v_known` = `derbyClubs()` (exists),
  - `v_rivals` = for each club, `[0,1,2].map(s => derbySeriesRival(club, s))`,
  - `v_underdog` = `DERBY_UNDERDOGS`.
  Generate the SQL literals with a short Node one-off rather than typing them.
- [ ] `node scripts/sim/derby_test.js`, `node scripts/check_track_contract.js` (no new failure). Commit "feat(derby): v2 migration — three series, ten achievements".

---

### Task V7: Browser verification (as v1 Task 9, updated)

Use the `verify` skill + a CDP driver (the previous run's driver lives in the scratchpad `derby-verify/`). Mobile 390 and desktop 1280; screenshots are the ground truth.

1. Draft 11 + 7 bench for מכבי חיפה; bench screen shows the right counts; a bench reroll works and counts down; no player repeats.
2. Rivals screen: all three rivals' XI + bench visible without expanding; series labels.
3. Match: score reads correctly (home on the right — check a game where the AWAY side scores); clock; ⏸ pauses at the next boundary; half-time pauses by itself; switch to התקפי; make 2 subs at 45' (windows stays 0) and 1 at 60' (windows 1); a 4th window is refused; computer subs appear in the events.
4. Refresh mid-match → paused at the last boundary, same score, same subs.
5. Play all three series to the end (all three are played even after a lost series); end screen reads "ניצחת N מתוך 3 סדרות" or the title.
6. Leak check as before (normal draft afterwards is normal; welcome doesn't show the derby club).
7. Console clean apart from the Vercel insights 404s.

Report per-step PASS/FAIL with screenshot paths; do not fix bugs, report them.
