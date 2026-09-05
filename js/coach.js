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
   * the value: at 1.5x a tempo of -0.10 becomes 0.85, where multiplying 0.90
   * directly would have given a legend a stronger LEAGUE rather than a stronger
   * style.
   *
   * The levers are the ones the TACTIC does not touch, on purpose. A manager who
   * moved attack against defence would simply cancel the tactic the player
   * chose, and taking back a decision the game just offered is worse than
   * offering nothing.
   *   tempo — scales both sides' xG. 1-0s and 2-1s, or 4-3s.
   *   cs    — the chance of conceding nothing, on the tags' own lever.
   *   venue — a home fortress, mirrored away, so eighteen and eighteen cancel.
   *   spear — who the goals go to. Never how many.
   *   comp  — the price, in rating points on the four lines. See below.
   *
   * WHY THERE IS A PRICE COLUMN AT ALL. The first cut of this table assumed a
   * lever that treats both sides alike costs nothing. scripts/sim/coach-balance.js
   * says otherwise, and it is not close: cutting the tempo for BOTH sides was
   * worth +3.3 points a season to an OVR 78 squad, because fewer goals is
   * shelter for whoever is worse — the better side needs the game to be long
   * enough to assert itself. Raising it pays the favourite for the same reason.
   * A clean-sheet multiplier is not a trade in any direction: it only ever
   * subtracts from the goals against. Football's payoff is not linear in goals,
   * so symmetry in the GOALS is not symmetry in the POINTS, and no amount of
   * even-handed design gets around that.
   *
   * So every archetype carries a measured price instead of an assumed one. The
   * numbers below were not chosen; they were solved for, by running the real
   * engine at three squad ratings and taking out exactly what each style put in.
   * Re-run the harness after any engine change — a drifting compensation is a
   * silently unfair manager.
   *
   * One lever needed no price and never will: `spear` moves goals BETWEEN the
   * player's own men and cannot touch a scoreline.
   *
   * Two levers were dropped rather than priced. The season's form SD, because at
   * the width the engine actually uses it moved the volatility of a campaign by
   * 1.15x where the design asked for 2x — invisible, and quietly profitable,
   * since a narrower swing on a concave payoff RAISES the mean. And a second
   * clean-sheet user, because two archetypes leaning on the same lever read as
   * one archetype with two names.
   */
  const COACH_ARCH = {
    grit:    { tempo: -0.07, cs: +0.19,     comp: -0.52 },
    press:   { tempo: +0.07,                comp: -0.09 },
    attack:  { tempo: +0.04, spear: +0.35,  comp: -0.08 },
    control: { tempo: -0.04, spear: -0.25,  comp: +0.07 },
    order:   { cs:    +0.10,                comp: -0.29 },
    spirit:  { venue: +0.08,                comp: +0.05 },
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

  function coachCleanMult() { const c = coachActive(); return c ? mult(COACH_ARCH[c.arch].cs) : 1; }

  // What the manager is worth on the four lines: his trophies, plus the price of
  // his own style. The two are added because they ride the same lever, but they
  // are different claims — the first is the advantage the owner asked for, the
  // second is what keeps the style itself from being one. Both settle in.
  function coachEdge() {
    const c = coachActive();
    if (!c) return 0;
    const t = COACH_TIER[c.tier] || COACH_TIER.journeyman;
    // The edge settles in like everything else: a manager appointed yesterday
    // has not yet made anyone braver.
    const trophies = t.edge * (c.settling ? COACH_SETTLE : 1);
    const price    = (COACH_ARCH[c.arch].comp || 0) * coachAmp();
    return trophies + price;
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

  /* ── the screens ──────────────────────────────────────────────────────────
   * Built as an overlay in JS rather than as markup, the way the January window
   * is, because that is the shape the owner picked when he saw the two side by
   * side: a moment in the game rather than a settings dialog.
   */
  function ensureStyle() {
    if (document.getElementById('coach-style')) return;
    const s = document.createElement('style');
    s.id = 'coach-style';
    s.textContent = `
.coach-wrap{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.74);backdrop-filter:blur(3px);padding:16px}
.coach-box{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);
  max-width:440px;width:100%;padding:22px;text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.55);
  animation:coachIn .22s ease-out}
@keyframes coachIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.coach-box.named{border-color:var(--accent)}
.coach-kicker{color:var(--accent);font-size:11.5px;letter-spacing:.1em;margin:0 0 7px;font-weight:600}
.coach-h{margin:0 0 14px;font-size:23px;color:var(--text)}
.coach-name{margin:0 0 12px;font-size:27px;color:var(--text);font-weight:700;line-height:1.2}
.coach-sub{margin:0 0 18px;color:var(--dim);font-size:14px;line-height:1.7}
.coach-style{margin:0 0 20px;color:var(--text);font-size:15px;line-height:1.75}
.coach-btns{display:flex;flex-direction:column;gap:9px}
.coach-b{padding:12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);
  color:var(--text);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;width:100%}
.coach-b:hover{background:var(--hover)}
.coach-b.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.coach-b[disabled]{opacity:.5;cursor:default}
.coach-spin{font-size:15px;color:var(--dim);min-height:34px;margin:0 0 14px;font-weight:600}
@media(max-width:420px){.coach-box{padding:17px}.coach-h{font-size:20px}.coach-name{font-size:23px}}
`;
    document.head.appendChild(s);
  }

  function close() {
    const w = document.querySelector('.coach-wrap');
    if (w) w.remove();
  }

  function frame(html, named) {
    ensureStyle();
    close();
    const w = document.createElement('div');
    w.className = 'coach-wrap';
    w.innerHTML = `<div class="coach-box${named ? ' named' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(w);
    return w;
  }

  // Step 2. His name, and the sentence written about him. Nothing else — no
  // trophies, no line explaining what he changes. Whatever he does to the season
  // is for the season to show.
  function coachShow(c, kicker, onDone) {
    frame(`
      <p class="coach-kicker">${kicker || 'המאמן שלך'}</p>
      <h3 class="coach-name">${c.name}</h3>
      <p class="coach-style">${c.style || ''}</p>
      <div class="coach-btns">
        <button class="coach-b go" id="coach-go">להמשיך עם ${coachFirstName(c.name)} ←</button>
      </div>`, true);
    document.getElementById('coach-go').onclick = () => { close(); if (onDone) onDone(); };
  }

  // Step 1. Two doors, and the promise the whole feature is built to keep.
  function coachOpen(onDone) {
    if (!coachEligible() || typeof COACHES === 'undefined' || !COACHES.length) { onDone(); return; }
    frame(`
      <p class="coach-kicker">אופציונלי</p>
      <h3 class="coach-h">למנות מאמן?</h3>
      <p class="coach-sub">מאמן משנה את האופי של העונה שלך, לא את הסיכוי שלך ל-36-0.</p>
      <div class="coach-btns">
        <button class="coach-b go" id="coach-draw">🎲 להגריל מאמן</button>
        <button class="coach-b" id="coach-none">בלי מאמן</button>
      </div>`);
    document.getElementById('coach-none').onclick = () => {
      coachClear();
      if (typeof crOnCoachAppointed === 'function') crOnCoachAppointed(null);
      if (typeof track === 'function') track('open', 'coach-none');
      close(); onDone();
    };
    document.getElementById('coach-draw').onclick = () => {
      const c = coachDraw();
      if (!c) { close(); onDone(); return; }
      coachAppoint(c, false);
      // A career keeps its manager between seasons, so the appointment belongs to
      // the RUN and not to this draft. crOnCoachAppointed is a no-op everywhere else.
      if (typeof crOnCoachAppointed === 'function') crOnCoachAppointed(state.coach);
      if (typeof track === 'function') track('open', 'coach');
      if (typeof saveDraftState === 'function') saveDraftState();
      // A beat on the way, so the name lands as a draw and not as a form field.
      frame(`<p class="coach-kicker">מחפשים מאמן</p>
             <h3 class="coach-h">מדברים עם כמה שמות…</h3>
             <p class="coach-spin" id="coach-spin">—</p>`);
      const el = document.getElementById('coach-spin');
      let n = 0;
      const t = setInterval(() => {
        el.textContent = COACHES[Math.floor(Math.random() * COACHES.length)].name;
        if (++n >= 9) { clearInterval(t); coachShow(state.coach || c, 'המאמן שלך', onDone); }
      }, 90);
    };
  }

  global.COACH_ARCH     = COACH_ARCH;
  global.COACH_TIER     = COACH_TIER;
  global.coachActive    = coachActive;
  global.coachAmp       = coachAmp;
  global.coachSimMods   = coachSimMods;
  global.coachCleanMult = coachCleanMult;
  global.coachEdge      = coachEdge;
  global.coachGoalMult  = coachGoalMult;
  global.coachEligible  = coachEligible;
  global.coachDraw      = coachDraw;
  global.coachRecord    = coachRecord;
  global.coachAppoint   = coachAppoint;
  global.coachClear     = coachClear;
  global.coachFirstName = coachFirstName;
  global.coachOpen      = coachOpen;
  global.coachShow      = coachShow;
})(typeof window !== 'undefined' ? window : globalThis);
