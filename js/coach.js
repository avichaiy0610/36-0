/* ── מאמנים ───────────────────────────────────────────────────────────────────
 *
 * After the eleven is drafted, a real manager is drawn — one of the 34 in
 * js/coach-data.js, each with a playing style written for him by hand. The style
 * is not decoration: it changes how the season SOUNDS. How many goals fall, at
 * which end, how steadily the year lands on its projection, and whether home is
 * a fortress.
 *
 * What it deliberately does NOT change is whether you win. Every archetype is a
 * fair trade, and the reason is not politeness: the toggle is on by default on a
 * game with live leaderboards, so a manager who moved the odds would quietly
 * rewrite the meaning of every record already on them. Fewer goals at both ends
 * is a different season, not an easier one.
 *
 * Which is also why the draw is a draw. Even when each trade is fair on its own,
 * CHOOSING is an advantage — you would take the defensive man when your back
 * four is the good half of your squad. One spin, no re-spin, and the trade stays
 * honest.
 *
 * Trophies enter as the SIZE of the signature rather than as an edge: the same
 * style, stamped 1.5x by Barak Bakhar and 0.5x by a manager who never won
 * anything. On top of that sits one genuinely positive nudge, in the mechanism
 * and the ceiling of the "serial winner" tag that has been on the leaderboards
 * for months — half a rating point at the very most, and NEVER negative. A
 * manager who was worse than no manager would make "no manager" the correct
 * play, and the feature would be dead on arrival.
 *
 * The card shows his name and his style sentence. Nothing else — no tier, no
 * line explaining the mechanics. The effect is felt, not read, and that only
 * works because nothing the player decides depends on knowing the numbers.
 */
(function (global) {
  'use strict';

  /* ── the six archetypes ───────────────────────────────────────────────────
   * Numbers are DELTAS from 1.0, so the tier multiplies the signature and not
   * the value: at 1.5x a tempo of -0.12 becomes 0.82, where multiplying 0.88
   * directly would have given a legend a stronger LEAGUE rather than a stronger
   * style.
   *
   * The levers are the ones the TACTIC does not touch, on purpose. A manager who
   * moved attack against defence would simply cancel the tactic the player
   * chose, and taking back a decision the game just offered is worse than
   * offering nothing.
   *   tempo — scales both sides' xG. 1-0s and 2-1s, or 4-3s. Same points.
   *   cs    — the chance of conceding nothing, on the tags' own lever.
   *   form  — the season's form SD. Symmetric, so it moves no average at all.
   *   venue — a home fortress, mirrored away, so eighteen and eighteen cancel.
   *   spear — who the goals go to. Never how many.
   */
  const COACH_ARCH = {
    grit:    { tempo: -0.12, cs:   +0.15 },
    press:   { tempo: +0.12, form: +0.50 },
    attack:  { tempo: +0.10, spear:+0.35 },
    control: { tempo: -0.10, form: -0.40 },
    order:   { form:  -0.55, cs:   +0.08 },
    spirit:  { venue: +0.10 },
  };

  // Amplitude is how hard he stamps it; edge is what the trophies are worth.
  // The edge ceiling is TAG_WINNER_CAP — the same half point a whole dressing
  // room of champions can buy — and journeyman is zero rather than negative.
  const COACH_TIER = {
    legend:     { amp: 1.5,  edge: 0.50 },
    winner:     { amp: 1.0,  edge: 0.25 },
    cup:        { amp: 0.75, edge: 0.15 },
    journeyman: { amp: 0.5,  edge: 0    },
  };

  // A new manager's first season runs at half signature: a squad takes a year to
  // learn a method. It is also what makes sacking in a career cost something
  // without needing a quota — sack every year and you never see a full one.
  const COACH_SETTLE = 0.5;

  // The spearhead. Nothing else moves: the weights are normalised when a scorer
  // is drawn, so lifting the front men lowers everyone else by exactly as much.
  const SPEAR_POS = ['ST', 'CF'];

  /* ── who is in charge ─────────────────────────────────────────────────────── */
  function coachActive() {
    if (typeof state === 'undefined' || !state) return null;
    const c = state.coach;
    return (c && c.arch && COACH_ARCH[c.arch]) ? c : null;
  }

  // Signature strength: tier amplitude, halved while he is still settling in.
  function coachAmp() {
    const c = coachActive();
    if (!c) return 0;
    const t = COACH_TIER[c.tier] || COACH_TIER.journeyman;
    return t.amp * (c.settling ? COACH_SETTLE : 1);
  }

  // A delta turned into a multiplier. Clamped low so no future tier can invert a
  // lever by driving it past zero.
  function mult(delta) {
    return Math.max(0.05, 1 + (delta || 0) * coachAmp());
  }

  /* ── the six things game.js asks ──────────────────────────────────────────── */

  // Tempo and venue, per match. Null means "no manager", and simulateMatchV2
  // then runs exactly as it did before any of this existed.
  function coachSimMods() {
    const c = coachActive();
    if (!c) return null;
    const a = COACH_ARCH[c.arch];
    if (!a.tempo && !a.venue) return null;
    const m = {};
    if (a.tempo) m.tempo = mult(a.tempo);
    if (a.venue) m.venue = mult(a.venue);
    return m;
  }

  function coachFormMult()  { const c = coachActive(); return c ? mult(COACH_ARCH[c.arch].form) : 1; }
  function coachCleanMult() { const c = coachActive(); return c ? mult(COACH_ARCH[c.arch].cs)   : 1; }

  function coachEdge() {
    const c = coachActive();
    if (!c) return 0;
    const t = COACH_TIER[c.tier] || COACH_TIER.journeyman;
    // The edge settles in like everything else: a manager appointed yesterday
    // has not yet made anyone braver.
    return t.edge * (c.settling ? COACH_SETTLE : 1);
  }

  function coachGoalMult(slotPos) {
    const c = coachActive();
    if (!c) return 1;
    const spear = COACH_ARCH[c.arch].spear;
    if (!spear || !SPEAR_POS.includes(slotPos)) return 1;
    return mult(spear);
  }

  /* ── when a manager is appointed at all ───────────────────────────────────── */
  // The same shape as janEligible(), and excluded for the same reasons: the
  // challenge and the leagues put everyone on identical terms, and a drawn
  // manager would break the comparison their boards depend on. Classic mode is
  // out because a manager is exactly the kind of layer classic exists to remove.
  //
  // Mini-games are NOT tested for here. They clear challenge/league/gauntlet
  // themselves and would sail straight through such a test — the trap that once
  // gave the daily Wordle a State Cup — so each of them sets state.coachOn
  // explicitly instead, the way each already sets state.januaryOn.
  function coachEligible() {
    if (typeof state === 'undefined' || !state) return false;
    if (state.coachOn === false) return false;
    if (typeof classicMode === 'function' && classicMode()) return false;
    if (state.challenge || state.leagueCode || state.duelCode || state.gauntlet) return false;
    if (state.salaryCap) return false;
    if (!Array.isArray(state.picks) || state.picks.some(p => !p)) return false;
    return true;
  }

  /* ── the draw ─────────────────────────────────────────────────────────────── */
  // Uniform, with no weighting anywhere. The target was a legend about one time
  // in twenty, and with only two of the 34 having won three titles the data
  // already delivers 5.9% on its own — a weights table would have been code
  // enforcing what was going to happen regardless. If the roster grows and the
  // tier balance moves, THIS is the line to revisit.
  function coachDraw() {
    if (typeof COACHES === 'undefined' || !COACHES.length) return null;
    return COACHES[Math.floor(Math.random() * COACHES.length)];
  }

  // What gets stored on the state: the four fields the game needs and not one
  // more. `settling` is set by the career for a manager in his first season.
  function coachRecord(c, settling) {
    if (!c) return null;
    return { name: c.name, style: c.style || '', arch: c.arch, tier: c.tier,
             settling: !!settling };
  }

  function coachAppoint(c, settling) {
    if (typeof state === 'undefined' || !state) return null;
    state.coach = coachRecord(c, settling);
    return state.coach;
  }

  function coachClear() {
    if (typeof state !== 'undefined' && state) state.coach = null;
  }

  // "המשך עם ברק" — the first name, the way you would talk about him.
  function coachFirstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || '';
  }

  global.COACH_ARCH     = COACH_ARCH;
  global.COACH_TIER     = COACH_TIER;
  global.coachActive    = coachActive;
  global.coachAmp       = coachAmp;
  global.coachSimMods   = coachSimMods;
  global.coachFormMult  = coachFormMult;
  global.coachCleanMult = coachCleanMult;
  global.coachEdge      = coachEdge;
  global.coachGoalMult  = coachGoalMult;
  global.coachEligible  = coachEligible;
  global.coachDraw      = coachDraw;
  global.coachRecord    = coachRecord;
  global.coachAppoint   = coachAppoint;
  global.coachClear     = coachClear;
  global.coachFirstName = coachFirstName;
})(typeof window !== 'undefined' ? window : globalThis);
