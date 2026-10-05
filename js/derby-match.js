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
