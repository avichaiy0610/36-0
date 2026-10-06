// ─── אלופי הדרבי — the match engine and the series (spec §9) ────────────────
// A match is played in DERBY_CHUNK-minute segments of the league's own model.
// The engine's goals are Binomial(SIM2.CHANCES, xg/CHANCES): five chances a side,
// a hard cap and a low variance. Drawing simDrawGoals(xg × share) per segment
// would be Binomial(30, ·) and fatten the tails (6+ goals, upsets, doubled 0-0s),
// so instead each side's CHANCES chances are PLACED on minutes 1..90 up front
// (m.me.chances / m.opp.chances — persisted with the match, so V4's live save
// must keep them) and each is converted, when its minute comes, with the engine's
// own per-chance probability. Tactic, tiredness and substitutions therefore act
// through that probability for the chances still to come. Between segments the manager may change the
// tactic or bring men on, and tiredness (derbyFatigue) is what makes that worth
// doing. Each chance is seeded by itself (seed, side, index): the result does not
// depend on where the steps fall, and a
// match replays identically from any saved minute given the same decisions.
// Both sides' clean-sheet tags count (simulateMatchV2 only applies the
// player's — its opponents are real clubs without tags).

function derbySide(xi) {
  return {
    picks: xi.picks.map(e => (e ? { player: e.player, squad: e.squad, on: e.on || 0 } : null)),
    bench: (xi.bench || []).map(e => ({ player: e.player, squad: e.squad })),
    slots: xi.slots, tactic: xi.tactic || 'bal', formationId: xi.formationId || null, slotTac: xi.slotTac || null,
    chances: (xi.chances || []).slice(),
    subs: xi.subs || 0, windows: xi.windows || 0, lastWin: xi.lastWin ?? -1, off: (xi.off || []).slice(),
  };
}

// me / opp: { picks, bench, slots, tactic } — picks aligned with slots.
function derbyMatchNew(me, opp, home, seed) {
  const m = { min: 0, gf: 0, ga: 0, home, seed: seed | 0, events: [], over: false, won: null, pens: null,
              me: derbySide(me), opp: derbySide(opp) };
  const place = x => {
    const r = derbyRng((m.seed ^ x) | 0), out = [];
    for (let i = 0; i < SIM2.CHANCES; i++) out.push(1 + Math.floor(r() * 90));
    return out.sort((p, q) => p - q);
  };
  if (!m.me.chances.length) m.me.chances = place(0x2545f491);
  if (!m.opp.chances.length) m.opp.chances = place(0x6c8e9cf5);
  return m;
}

// Half-time is free, as in the real rules; any other stoppage that brings a
// man on uses one of the DERBY_SUB_WINDOWS.
function derbyCanSub(side, minute) {
  if (minute <= 0 || minute >= 90) return false;
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

// The computer's tactic rule, pure: chase from 60', protect from 70'.
function derbyAutoTactic(minute, lead) {
  return (minute >= 60 && lead < 0) ? 'att' : (minute >= 70 && lead > 0) ? 'def' : 'bal';
}

// Formation, line-up and bench changes (spec §10.2). None of them costs a
// substitution or a window; only a bench man coming on in the match does.
// Re-seat the same men in `slots`: the scarcest slot first, the best natural fit
// for it, and when nobody left fits, the best man left (out of position, 93%) —
// the keeper last of all.
function derbyAssign(entries, slots) {
  const pool = entries.slice().sort((a, b) => playerOVR(b.player) - playerOVR(a.player));
  const fits = (e, i) => playerFitsSlot(e.player, slotFitPos(slots[i]));
  const order = slots.map((_, i) => i).sort((a, b) =>
    (pool.filter(e => fits(e, a)).length - pool.filter(e => fits(e, b)).length) || (a - b));
  const used = new Set(), out = new Array(slots.length).fill(null);
  const isGK = e => normalizePos(e.player.position) === 'GK';
  for (const i of order) {
    const pick = pool.find(e => !used.has(e) && fits(e, i)) ||
      pool.find(e => !used.has(e) && !isGK(e)) || pool.find(e => !used.has(e));
    if (pick) { out[i] = pick; used.add(pick); }
  }
  return out;
}
function derbySetFormation(side, formationId, minute) {
  if (!FORMATIONS[formationId] || (minute || 0) >= 90) return false;
  const men = side.picks.filter(Boolean);
  const slots = formationSlots(formationId, 'bal');
  if (men.length !== slots.length) return false;
  side.picks = derbyAssign(men, slots);
  side.slots = slots; side.formationId = formationId; side.slotTac = 'bal';
  return true;
}
function derbySwap(side, i, j) {
  if (i === j || !side.picks[i] || !side.picks[j]) return false;
  const t = side.picks[i]; side.picks[i] = side.picks[j]; side.picks[j] = t;
  return true;
}
// Before the whistle only: a starter and a bench man trade places for free, and
// the man coming in starts (on 0). The starter goes to the bench.
function derbyPreSwap(side, slotIdx, benchIdx, minute) {
  const inE = side.bench[benchIdx], out = side.picks[slotIdx];
  if ((minute || 0) > 0 || !inE || !out) return false;
  side.picks[slotIdx] = { player: inE.player, squad: inE.squad, on: 0 };
  side.bench[benchIdx] = { player: out.player, squad: out.squad };
  return true;
}

// Play the next segment, up to minute `to` (m.min < to <= 90); left out, to the
// next DERBY_CHUNK boundary. A step never jumps a decision point (45, 60, 75,
// 90). The player's decisions must already be applied to m.me; the computer
// decides here (and, with autoMe, the calibration bot for the player).
//
// The outcome does not depend on where the steps fall: each chance is drawn by
// its own seed (side + index), priced at its own minute with the tactics in
// force then (an auto-managed side's tactic follows the running score), and the
// computer's substitutions happen only at 60' and 75', which no step skips.
// Returns the goal events of this segment.
const DERBY_STOPS = [45, 60, 75, 90];
function derbyMatchStep(m, autoMe, to) {
  if (m.over) return [];
  const from = m.min;
  const next = DERBY_STOPS.find(x => x > from);
  let end = (Number.isInteger(to) && to > from && to <= 90) ? to : (Math.floor(from / DERBY_CHUNK) + 1) * DERBY_CHUNK;
  end = Math.min(end, next, 90);
  if (from === 60 || from === 75) {
    derbyAutoManage(m.opp, from, m.ga - m.gf);
    if (autoMe) derbyAutoManage(m.me, from, m.gf - m.ga);
  }
  // Per-chance conversion, solved exactly as simDrawGoals does (clamp, then the
  // clean-sheet tag scales P(0), then clamp again) — from the FULL-match xG.
  const conv = (xg, cs) => {
    let p = Math.min(0.97, xg / SIM2.CHANCES);
    if (cs && cs !== 1) p = Math.min(0.97, Math.max(0, 1 - Math.pow(cs, 1 / SIM2.CHANCES) * (1 - p)));
    return p;
  };
  const linesAt = (minute, tacMe, tacOpp) => ({
    a: derbyLinesFor(m.me.picks, m.me.slots, tacMe, minute),
    b: derbyLinesFor(m.opp.picks, m.opp.slots, tacOpp, minute) });
  const todo = [];
  m.me.chances.forEach((min, k) => { if (min > from && min <= end) todo.push({ min, mine: true, k }); });
  m.opp.chances.forEach((min, k) => { if (min > from && min <= end) todo.push({ min, mine: false, k }); });
  todo.sort((x, y) => (x.min - y.min) || (x.mine ? -1 : 1) - (y.mine ? -1 : 1) || (x.k - y.k));
  const out = [];
  let gf = m.gf, ga = m.ga;
  for (const c of todo) {
    const tacMe = autoMe ? derbyAutoTactic(c.min, gf - ga) : m.me.tactic;
    const tacOpp = derbyAutoTactic(c.min, ga - gf);
    const { a, b } = linesAt(c.min, tacMe, tacOpp);
    const p = c.mine
      ? conv(simExpectedGoals(simShrinkLines(a), simShrinkLines(b), m.home), b.cs)
      : conv(simExpectedGoals(simShrinkLines(b), simShrinkLines(a), !m.home), a.cs);
    const rng = derbyRng(((m.seed ^ (c.mine ? 0x3c6ef372 : 0x1f83d9ab)) + c.k * 2654435761) | 0);
    if (rng() < p) {
      const e = derbyScorer(c.mine ? m.me : m.opp, rng);
      out.push({ min: c.min, mine: c.mine, name: e.player.name, sub: (e.on || 0) > 0 });
      if (c.mine) gf++; else ga++;
    }
  }
  m.gf = gf; m.ga = ga; m.min = end;
  m.events.push(...out);
  // Shown tactic of an auto-managed side: what the rule says now.
  m.opp.tactic = derbyAutoTactic(end, m.ga - m.gf);
  if (autoMe) m.me.tactic = derbyAutoTactic(end, m.gf - m.ga);
  if (end >= 90) {
    const { a, b } = linesAt(90, m.me.tactic, m.opp.tactic);
    derbyMatchEnd(m, a, b);
  }
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
