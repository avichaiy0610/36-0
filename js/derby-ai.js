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
    return out.sort((a, b) => playerOVR(b.player) - playerOVR(a.player));
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
      if (o.length && (!best || playerOVR(o[0].player) > playerOVR(best.list[0].player))) best = { sq, list: o };
    }
    // Nobody in the drawn season fits what is still open: look through the rest.
    if (!best) {
      for (const sq of pool) { const o = options(sq); if (o.length) { best = { sq, list: o }; break; } }
    }
    // Nobody fits anywhere: the best man left, out of position (teamOVR's 93%),
    // from an unused season if there is one.
    if (!best) {
      const all = seasons.flatMap(sq => sq.players.map(p => ({ player: p, squad: sq })))
        .filter(e => !usedNames.has(e.player.name))
        .sort((a, b) => (usedSeasons.has(a.squad.id) - usedSeasons.has(b.squad.id)) ||
                        (playerOVR(b.player) - playerOVR(a.player)));
      if (!all.length) break;
      picks[empty()[0]] = all[0];
      usedNames.add(all[0].player.name); usedSeasons.add(all[0].squad.id);
      continue;
    }
    const c = choose(best.list);
    picks[c.slot] = { player: c.player, squad: c.squad };
    usedNames.add(c.player.name); usedSeasons.add(best.sq.id);
  }
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
}

// A man's energy at `minute` (spec §11.1). `pick.e0` is his energy at kick-off,
// or when he came on; `pick.on` the minute he came on (0 for a starter);
// `pick.offAt` the minute he went off, if he did. No e0 (tests, old saves): 100.
function derbyEnergyAt(pick, minute) {
  const e0 = pick.e0 ?? 100;
  const until = pick.offAt != null ? Math.min(minute, pick.offAt) : minute;
  const played = Math.max(0, until - (pick.on || 0));
  const gk = pick.player && normalizePos(pick.player.position) === 'GK';
  return Math.max(0, e0 - played * DERBY_ENERGY_DRAIN * (gk ? DERBY_ENERGY_GK : 1));
}
// Rating lost to tiredness at `minute`: the energy penalty (derbyEnergyPenalty).
function derbyFatigue(pick, minute) {
  return derbyEnergyPenalty(derbyEnergyAt(pick, minute));
}

// The four line ratings of ANY XI, on exactly the terms of the player's own
// (myLineRatings: out-of-position penalty, chemistry, tags, the tactic's
// +atk/−def trade), optionally at `minute` with tiredness. It reads `state`, so
// the XI is lent to it and the player's own is put back, whatever happens.
// Memoised: a calibration run asks for the same eleven hundreds of times.
const _derbyLinesMemo = new Map();
function derbyLinesFor(picks, slots, tactic, minute) {
  const m = minute || 0;
  // Each man's tiredness now: it, not the minute, is what the ratings depend on.
  const pen = picks.map(p => (p ? derbyFatigue(p, m) : 0));
  const tired = pen.some(x => x > 0);
  const flags = (typeof classicMode === 'function' && classicMode() ? 'c' : '') + (state.peakMode ? 'p' : '') +
    (state.crowdMode ? 'w' : '') + (state.coach ? 'k' : '') + (state.story ? 's' : '');
  const key = flags + '|' + (tactic || 'bal') + '|' + slots.map(s => s.id || s.pos).join(',') + '|' +
    picks.map((p, i) => p ? p.squad.id + ':' + p.player.name + ':' + pen[i] : '-').join(',');
  const hit = _derbyLinesMemo.get(key);
  if (hit) return Object.assign({}, hit);
  const keep = { picks: state.picks, slots: state.slots, tactic: state.tactic };
  try {
    state.picks = picks; state.slots = slots; state.tactic = tactic || 'bal';
    const out = myLineRatings(tired ? ((p, i) => playerOVR(p.player) - pen[i]) : undefined);
    if (_derbyLinesMemo.size > 20000) _derbyLinesMemo.clear();
    _derbyLinesMemo.set(key, out);
    return Object.assign({}, out);
  } finally {
    state.picks = keep.picks; state.slots = keep.slots; state.tactic = keep.tactic;
  }
}
