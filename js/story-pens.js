/* ── מצב סיפור: penalties ─────────────────────────────────────────────────────
 *
 * A tie still level after extra time goes to a shootout the player runs: he
 * picks the five takers and their order from the eleven on the pitch, and the
 * rest follow in that order into sudden death. A kick goes in by the taker's
 * position and rating against the other side's keeper. The numbers keep every
 * kick between 55% and 88%: the choice moves the odds, it never settles them.
 *
 * No DOM, no Math.random: everything is drawn from the seed, so a refresh after
 * the order is chosen replays the same shootout. Loaded in Node by the tests
 * and the calibration harness.
 */

const STORY_PEN_BASE = { st: 0.80, wg: 0.78, cm: 0.77, fb: 0.73, cb: 0.72, gk: 0.62 };
const STORY_PEN_K = 0.004;           // per rating point, the taker's and the keeper's
const STORY_PEN_OPP = 0.76;          // an opponent's kick at an even rating

// Its own PRNG (mulberry32): js/duel.js has one, but story mode must not depend on duel.js being loaded.
function storyPenRng(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const storyPenClamp = p => Math.max(0.55, Math.min(0.88, p));

// Our kick: the taker { position, ovr } against their keeper's rating.
function storyPenP(taker, oppGk) {
  const base = STORY_PEN_BASE[storyGroupOf(taker.position)] ?? STORY_PEN_BASE.cm;
  return storyPenClamp(base + STORY_PEN_K * (taker.ovr - 80) - STORY_PEN_K * (oppGk - 80));
}
// Their kick: the club's rating against our keeper.
function storyOppPenP(oppOvr, ourGk) {
  return storyPenClamp(STORY_PEN_OPP + STORY_PEN_K * (oppOvr - 80) - STORY_PEN_K * (ourGk - 80));
}

// The best takers first and the keeper last: what the bot and the "auto"
// button choose.
function storyPensAutoOrder(xi) {
  return xi.slice().sort((a, b) => (a.position === 'GK') - (b.position === 'GK') ||
    storyPenP(b, 80) - storyPenP(a, 80) || b.ovr - a.ovr);
}

// seed: uint32. order: our eleven, in kicking order. opp: { ovr, gk }.
// ourGk: our keeper's rating. We kick first. Returns
//   { gf, ga, won, kicks: [{ us, name, scored }] }
function storyShootout(seed, order, opp, ourGk) {
  const rnd = storyPenRng(seed >>> 0);
  const kicks = [];
  let gf = 0, ga = 0;
  const kick = (us, i) => {
    const taker = order[i % order.length];
    const p = us ? storyPenP(taker, opp.gk) : storyOppPenP(opp.ovr, ourGk);
    const scored = rnd() < p;
    kicks.push({ us, name: us ? taker.name : null, scored });
    if (scored) { if (us) gf++; else ga++; }
  };
  // the first five each, stopping once one side cannot be caught
  for (let i = 0; i < 5; i++) {
    kick(true, i);
    if (gf > ga + (5 - i) || ga > gf + (4 - i)) break;
    kick(false, i);
    if (gf > ga + (4 - i) || ga > gf + (4 - i)) break;
  }
  // sudden death, a pair at a time, through the order again and again
  for (let i = 5; gf === ga && i < 60; i++) { kick(true, i); kick(false, i); }
  if (gf === ga) gf++;              // sixty rounds level: never in practice, but always an end
  return { gf, ga, won: gf > ga, kicks };
}
