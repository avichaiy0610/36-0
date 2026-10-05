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
