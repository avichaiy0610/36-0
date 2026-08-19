// ─── V2 simulation engine: line matchups ──────────────────────────────────────
// The V1 engine draws an OUTCOME from the overall-OVR gap and then invents a
// scoreline to fit it, so a 5-4 can never occur and the four line ratings shown
// in the UI are decoration. V2 inverts that: each side's expected goals come
// from attack-vs-(defence+keeper) plus midfield territory, goals are drawn, and
// the outcome falls out of the comparison.
//
// Calibration and the reasoning behind every constant:
// docs/superpowers/specs/2026-08-19-line-matchup-sim-design.md
const SIM_ENGINE_CURRENT = 2;

const SIM2 = {
  BASE:      1.25,    // baseline goals per side per match
  KA:        0.055,   // attack sensitivity, per rating point
  KD:        0.220,   // defence+keeper sensitivity — 4x KA on purpose (see spec)
  T:         0.0286,  // midfield sensitivity — ~half KA, because midfield acts
                      // on BOTH sides of the ball and would otherwise pay twice
  CHANCES:   3,       // goals = chances x conversion; lower = less variance
  MU_MAX:    3.4,     // ceiling on a side's xG — keeps 36-0 from exploding at
                      // the top of the rating range (there is deliberately no
                      // floor on the opponent's xG; see spec)
  HOME:      1.15,
  LAMBDA:    0.75,    // shrink each line toward the overall OVR
  GK_WEIGHT: 0.30,    // keeper's share of the defensive rating
};

// Which positions make up each line, and how many of them a real squad fields.
const SIM2_LINES = {
  atk: { pos: ['ST', 'CF', 'RW', 'LW'],               count: 3 },
  mid: { pos: ['CAM', 'CM', 'CDM', 'RM', 'LM'],       count: 3 },
  def: { pos: ['CB', 'RB', 'LB'],                     count: 4 },
  gk:  { pos: ['GK'],                                 count: 1 },
};

// A real club's four line ratings: the best N at each line, averaged.
// Falls back to the club's overall rating when a squad has nobody in a line.
function simLineRatingsForSquad(squadPlayers, fallbackOvr) {
  const out = {};
  for (const key of Object.keys(SIM2_LINES)) {
    const { pos, count } = SIM2_LINES[key];
    const best = squadPlayers
      .filter(p => pos.includes(p.position))
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, count);
    out[key] = best.length
      ? best.reduce((s, p) => s + p.ovr, 0) / best.length
      : fallbackOvr;
  }
  return out;
}

// Pull each line toward the overall rating, so the headline OVR stays a real
// anchor and a wildly lopsided XI is damped without an artificial penalty.
function simShrinkLines(t) {
  const L = SIM2.LAMBDA, o = t.ovr;
  return {
    ovr: o,
    atk: o + L * (t.atk - o),
    mid: o + L * (t.mid - o),
    def: o + L * (t.def - o),
    gk:  o + L * (t.gk  - o),
  };
}

function simDefGk(t) {
  return (1 - SIM2.GK_WEIGHT) * t.def + SIM2.GK_WEIGHT * t.gk;
}

// Expected goals for `me` against `opp`. Both are shrunk line-rating objects.
function simExpectedGoals(me, opp, home) {
  const xg = SIM2.BASE
    * Math.exp(SIM2.KA * (me.atk - 80))
    * Math.exp(SIM2.KD * (80 - simDefGk(opp)))
    * Math.exp(SIM2.T  * (me.mid - opp.mid))
    * (home ? SIM2.HOME : 1);
  return Math.min(SIM2.MU_MAX, xg);
}

// Goals as chances x conversion. Binomial rather than Poisson: its variance is
// np(1-p) instead of np, and Poisson's spread makes a 36-win season impossible
// at any believable goal level.
function simDrawGoals(xg) {
  const p = Math.min(0.97, xg / SIM2.CHANCES);
  let goals = 0;
  for (let i = 0; i < SIM2.CHANCES; i++) if (Math.random() < p) goals++;
  return goals;
}

// me / opp: { ovr, atk, mid, def, gk }. Returns the same shape as V1.
function simulateMatchV2(me, opp, homeOverride = null) {
  const home = homeOverride !== null ? homeOverride : Math.random() > 0.5;
  const a = simShrinkLines(me), b = simShrinkLines(opp);
  const gf = simDrawGoals(simExpectedGoals(a, b, home));
  const ga = simDrawGoals(simExpectedGoals(b, a, !home));
  const outcome = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
  return { outcome, gf, ga, opponent: opp.name, home };
}

// ─── Closed-form table estimate ───────────────────────────────────────────────
// The AI clubs never play each other for real, but the final table and the
// playoff split both need their points. Under V1 those came from a win-% curve
// tuned to V1's scoring level; under V2 they have to come from the same xG model
// the player's own matches use, or the table shows a 25-point gap that no match
// ever produced. Computed exactly rather than sampled, so the table carries no
// simulation noise of its own.

// Probability of scoring exactly k goals from CHANCES chances at rate xg.
function simGoalPmf(xg) {
  const n = SIM2.CHANCES, p = Math.min(0.97, xg / n), out = [];
  for (let k = 0; k <= n; k++) {
    let c = 1;
    for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
    out.push(c * Math.pow(p, k) * Math.pow(1 - p, n - k));
  }
  return out;
}

// Exact expected points for `me` over one match against `opp`.
function simExpectedPoints(me, opp, home) {
  const a = simGoalPmf(simExpectedGoals(me, opp, home));
  const b = simGoalPmf(simExpectedGoals(opp, me, !home));
  let win = 0, draw = 0;
  for (let x = 0; x < a.length; x++) {
    for (let y = 0; y < b.length; y++) {
      if (x > y) win += a[x] * b[y];
      else if (x === y) draw += a[x] * b[y];
    }
  }
  return win * 3 + draw;
}

// Each club's expected points over a `games`-long season against the rest of the
// field, home and away in equal measure. Same units as the player's real total,
// because it is derived from the same xG model.
function simTableEstimateV2(clubs, games) {
  const per = clubs.map(t => {
    const me = simShrinkLines(t);
    let sum = 0, n = 0;
    for (const o of clubs) {
      if (o === t) continue;
      const them = simShrinkLines(o);
      sum += simExpectedPoints(me, them, true) + simExpectedPoints(me, them, false);
      n += 2;
    }
    return sum / n;                       // expected points per match
  });
  return per.map(p => Math.max(3, Math.round(p * games)));
}
