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
// doing. Each segment is seeded from the match seed and its first minute, so a
// match replays identically from any saved boundary given the same decisions.
// Both sides' clean-sheet tags count (simulateMatchV2 only applies the
// player's — its opponents are real clubs without tags).

function derbySide(xi) {
  return {
    picks: xi.picks.map(e => (e ? { player: e.player, squad: e.squad, on: e.on || 0 } : null)),
    bench: (xi.bench || []).map(e => ({ player: e.player, squad: e.squad })),
    slots: xi.slots, tactic: xi.tactic || 'bal',
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
  if (!playerFitsSlot(inE.player, slotFitPos(side.slots[slotIdx]))) return false;
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
  const mid = (from + to) / 2;
  derbyAutoManage(m.opp, from, m.ga - m.gf);
  if (autoMe) derbyAutoManage(m.me, from, m.gf - m.ga);
  const a = derbyLinesFor(m.me.picks, m.me.slots, m.me.tactic, mid);
  const b = derbyLinesFor(m.opp.picks, m.opp.slots, m.opp.tactic, mid);
  const seg = (m.seed + (from + 1) * 104729) | 0;
  // Per-chance conversion, solved exactly as simDrawGoals does (clamp, then the
  // clean-sheet tag scales P(0), then clamp again) — from the FULL-match xG.
  const conv = (xg, cs) => {
    let p = Math.min(0.97, xg / SIM2.CHANCES);
    if (cs && cs !== 1) p = Math.min(0.97, Math.max(0, 1 - Math.pow(cs, 1 / SIM2.CHANCES) * (1 - p)));
    return p;
  };
  const pf = conv(simExpectedGoals(simShrinkLines(a), simShrinkLines(b), m.home), b.cs);
  const pa = conv(simExpectedGoals(simShrinkLines(b), simShrinkLines(a), !m.home), a.cs);
  const rng = derbyRng(seg ^ 0x9e3779b9), out = [];
  const inSeg = x => x > from && x <= to;
  withSeededRandom(seg, () => {
    m.me.chances.filter(inSeg).forEach(min => {
      if (Math.random() < pf) out.push({ min, mine: true, e: derbyScorer(m.me, rng) });
    });
    m.opp.chances.filter(inSeg).forEach(min => {
      if (Math.random() < pa) out.push({ min, mine: false, e: derbyScorer(m.opp, rng) });
    });
  });
  const goals = out.map(o => ({ min: o.min, mine: o.mine, name: o.e.player.name, sub: (o.e.on || 0) > 0 }));
  out.length = 0; out.push(...goals);
  const g = { gf: out.filter(o => o.mine).length, ga: out.filter(o => !o.mine).length };
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
