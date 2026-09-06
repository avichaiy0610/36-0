// ─── בונה כדורגלן — חמש־עשרה העונות ───────────────────────────────────────────
//
// The build takes two minutes; this is what it was for. One player, ages 18 to
// 32, and at the end a page of history: appearances, goals, assists, the titles
// he was there for, and the years he was the best in the league at what he does.
//
// Pure and seeded. Nothing here touches the DOM, so the whole thing runs in Node
// — which is how the numbers below were tuned, the same way the auction's were:
//
//   node scripts/sim/pb_harness.js
//
// One deliberate departure from the rest of the project: this does NOT call
// simDrawGoals. That function draws goals for one MATCH out of a fixed number of
// chances, and a season total is a different question. The draw here is the same
// family — binomial over appearances — but over the right denominator.

const PB_FIRST_AGE = 18;
const PB_SEASONS   = 15;

// Where a career actually sits at each age. Peaks at 27, and the two ends are
// far apart on purpose: an 18-year-old who is already his peak self would make
// the age curve decoration.
const PB_AGE_CURVE = [
  0.72, 0.78, 0.83, 0.87, 0.91,   // 18-22
  0.94, 0.965, 0.985, 0.997, 1.0, // 23-27
  0.99, 0.97, 0.94, 0.90, 0.85,   // 28-32
];

// What each role is expected to produce in a full season, at rating 80 with the
// matching attribute at 85, in a mid-table side. Everything else scales off it.
// The reason a defender's goals are not zero is that they are not zero in the
// tables either.
const PB_OUTPUT = {
  fw: { goals: 8.2, assists: 3 },
  w:  { goals: 5.5, assists: 6 },
  cm: { goals: 3,   assists: 6.5 },
  df: { goals: 1.2, assists: 2 },
  gk: { goals: 0,   assists: 0 },
};

// How sharply production scales with the season rating. The first pass used 2.2
// on ovr/80 and a raw fin/70, and the two compounded into 333 career goals for a
// top build — twenty-two a season, every season, for fifteen years. A great
// striker in this league scores fifteen to twenty in his best years and finishes
// around two hundred; the exponent is what decides whether the top of the range
// is a career or a cartoon.
const PB_SHARP = 1.7;

const PB_APPS = 32;          // a full league season, roughly, across all eras

/* ── seeded rng ───────────────────────────────────────────────────────────── */
// Same mulberry32 the duel uses. A career must be reproducible from its seed:
// the leaderboard has to be able to replay a run it is asked to believe.
function pbRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Binomial: n independent chances at p. Used for goals over appearances, which
// is what a season total actually is.
function pbBinom(rng, n, p) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng() < p) k++;
  return k;
}

/* ── the clubs he could play for ──────────────────────────────────────────── */
// Real clubs, tiered by the strength they actually had across the archive —
// mean squad rating over every season they appear in. Derived from SQUADS at
// runtime rather than written down, so a club that gets re-rated moves tier by
// itself and no list goes stale.
let _pbTiers = null;
function pbClubTiers() {
  if (_pbTiers) return _pbTiers;
  const by = new Map();
  SQUADS.forEach(sq => {
    const m = sq.players.reduce((a, p) => a + p.ovr, 0) / (sq.players.length || 1);
    const e = by.get(sq.teamId) || { sum: 0, n: 0 };
    e.sum += m; e.n++;
    by.set(sq.teamId, e);
  });
  const clubs = [...by.entries()]
    .map(([teamId, e]) => ({ teamId, name: (TEAMS[teamId] || {}).name || teamId, str: e.sum / e.n }))
    .sort((a, b) => b.str - a.str);
  // Four bands. The top band is small because the real league's top band is.
  const cut = [3, 8, 16];
  clubs.forEach((c, i) => { c.tier = i < cut[0] ? 1 : i < cut[1] ? 2 : i < cut[2] ? 3 : 4; });
  return (_pbTiers = clubs);
}

function pbClubOfTier(rng, tier) {
  const pool = pbClubTiers().filter(c => c.tier === tier);
  return pool.length ? pool[Math.floor(rng() * pool.length)] : pbClubTiers()[0];
}

// How much a club multiplies what a player produces. A striker in the best side
// in the league gets chances a striker in the worst one never sees.
const PB_CLUB_OUTPUT = { 0: 1.30, 1: 1.18, 2: 1.0, 3: 0.86, 4: 0.74 };
// And how often it wins the thing. Tier 0 is abroad, where our league title is
// not on offer at all.
const PB_CLUB_TITLE  = { 0: 0.00, 1: 0.34, 2: 0.12, 3: 0.03, 4: 0.004 };

// A keeper produces neither goals nor assists, so without this he has no career
// to read and no way onto the board — the first harness run had him at a tenth
// of a striker's score, which is not a balance problem, it is a missing stat.
// Clean sheets are his line, and they come from the same place a defender's
// evidence does.
const PB_CS_BASE = 0.30;

// Production is measured against what the role is expected to produce, or the
// board is a list of strikers. Calibrated from the harness so that a well-built
// player of any role lands in the same range — the divisor is per role, and it
// is the only place roles are compared at all.
const PB_ROLE_NORM = { fw: 1.00, w: 0.92, cm: 0.86, df: 0.32, gk: 5.00 };

/* ── one career ───────────────────────────────────────────────────────────── */
// build: { role, attrs } — attrs as produced by attrsOf()
function pbSimCareer(build, seed) {
  const rng = pbRng(seed);
  const role = build.role;
  const a = build.attrs;
  const peak = attrOvr(a, role);

  // Stability does two things and only two, and both are why anyone would ever
  // spend a slot on it: it flattens the age curve, and it keeps him on the
  // pitch. It never makes him better.
  // PHYSICAL is what a career is made of length-wise, so it is what carries the
  // old "stability" role: it flattens the decline and keeps him on the pitch. It
  // never makes him better in a given season.
  //
  // The first tuning pass made this symmetric — it flattened the whole curve — and the harness said plainly that nobody should ever buy it: a
  // fragile build with four more rating points beat a stable one at the median
  // AND matched it at the tenth percentile. Lowering someone's ceiling without
  // raising their floor is not a trade, it is a tax.
  //
  // So it acts on the DECLINE, where a career is actually decided. A stable
  // player is still himself at 32; a fragile one falls off a cliff at 29 and the
  // last four seasons of the fifteen are worth almost nothing.
  const staF = Math.max(0, Math.min(1, (a.phy - 50) / 43));
  const lostP = 0.12 * (1 - staF);               // 12% down to 0
  const formSd = 5.5 * (1 - 0.45 * staF);

  const out = PB_OUTPUT[role] || PB_OUTPUT.cm;
  let club = pbClubOfTier(rng, 3);                // everyone starts mid-table
  let abroadLeft = 0;

  const seasons = [];
  const tot = { apps: 0, goals: 0, assists: 0, cs: 0, titles: 0, boots: 0, poty: 0, caps: 0, abroad: 0, lost: 0 };

  for (let i = 0; i < PB_SEASONS; i++) {
    const age = PB_FIRST_AGE + i;
    const decay = i >= 9 ? 1.35 - 0.70 * staF : 1.00 - 0.25 * staF;
    const curve = 1 - (1 - PB_AGE_CURVE[i]) * decay;
    const form = (rng() + rng() + rng() - 1.5) * formSd;   // roughly normal
    const ovr = Math.max(40, Math.min(99, Math.round(peak * curve + form)));

    const lost = rng() < lostP;
    const apps = lost ? Math.round(PB_APPS * (0.05 + rng() * 0.25)) : Math.round(PB_APPS * (0.8 + rng() * 0.2));

    const clubMult = PB_CLUB_OUTPUT[club.tier];
    const sharp = Math.pow(ovr / 80, PB_SHARP);
    // A dribbler makes chances that a static player does not, so כדרור counts
    // toward both lines rather than being a number with nowhere to go.
    const driF = 0.85 + 0.30 * (a.dri / 85);
    const finF = role === 'gk' ? 0 : (a.sho / 85) * driF;
    const creF = (a.pas / 85) * driF;

    const goals   = pbBinom(rng, apps, Math.min(0.95, out.goals   * sharp * clubMult * finF / PB_APPS));
    const assists = pbBinom(rng, apps, Math.min(0.95, out.assists * sharp * clubMult * creF / PB_APPS));

    // Clean sheets — a keeper's only production line, and the one stat where the
    // club he is behind matters as much as he does.
    const cs = role === 'gk'
      ? pbBinom(rng, apps, Math.min(0.75, PB_CS_BASE * Math.pow(a.def / 85, 1.4) / (clubMult > 1 ? 1 : 1.25) * clubMult))
      : 0;

    // The honours. The title is the club's, not his — a good player nudges it,
    // he does not decide it, for the same reason the serial_winner tag nudges a
    // side rather than lifting a man.
    const titleP = PB_CLUB_TITLE[club.tier] * (0.75 + 0.5 * (ovr / 99));
    const champion = !lost && rng() < titleP;

    // Top of the scorers' table. The bar moves year to year the way it really
    // does — no season has a fixed number that wins it. Abroad it is not on
    // offer: this is our league's table, not theirs.
    const bar = 13 + Math.round(rng() * 7);
    const goldenBoot = !lost && club.tier !== 0 && goals >= bar;

    // The keeper's equivalent, or his honours board stays empty for fifteen
    // years while everyone else collects. Most clean sheets in a season.
    const csBar = 11 + Math.round(rng() * 5);
    const goldenGlove = role === 'gk' && !lost && club.tier !== 0 && cs >= csBar;

    // Footballer of the season goes to a big year at a club that mattered.
    const potyP = (goldenBoot || goldenGlove ? 0.35 : 0) + (champion ? 0.18 : 0) + (ovr >= 88 ? 0.10 : 0);
    const poty = !lost && club.tier !== 0 && rng() < potyP;

    const caps = lost ? 0 : Math.max(0, Math.round((ovr - 76) / 3 + rng() * 3));

    seasons.push({
      age, club: club.name, tier: club.tier, abroad: club.tier === 0,
      ovr, apps, goals, assists, cs, champion, goldenBoot, goldenGlove, poty, caps, lost,
    });

    tot.apps += apps; tot.goals += goals; tot.assists += assists; tot.cs += cs;
    tot.caps += caps;
    if (champion) tot.titles++;
    if (goldenBoot || goldenGlove) tot.boots++;
    if (poty) tot.poty++;
    if (club.tier === 0) tot.abroad++;
    if (lost) tot.lost++;

    /* ── where he plays next ─────────────────────────────────────────────── */
    if (abroadLeft > 0) { abroadLeft--; if (abroadLeft === 0) club = pbClubOfTier(rng, 2); }
    else if (!lost && ovr >= 86 && (goldenBoot || poty || (champion && ovr >= 88)) && rng() < 0.45) {
      abroadLeft = 2 + Math.floor(rng() * 3);      // a spell abroad, then home
      club = { name: 'חו״ל', tier: 0 };
    } else if (!lost && ovr >= 78 && club.tier > 1 && rng() < 0.42) {
      club = pbClubOfTier(rng, club.tier - 1);     // a move up
    } else if ((lost || ovr < 72) && club.tier < 4 && rng() < 0.35) {
      club = pbClubOfTier(rng, club.tier + 1);     // and a move back down
    } else if (rng() < 0.16) {
      // A sideways move. Without it a career that never climbs never moves at
      // all: the first run printed thirteen identical rows of עירוני טבריה,
      // which is not a modest career, it is a table with nothing to read.
      club = pbClubOfTier(rng, club.tier || 2);
    }
  }

  // One number for the board. Two halves: what he produced, measured against
  // what his role is expected to produce, and what he won, which is the same
  // currency for everyone. Weighted so no single line can carry a career on its
  // own — a pure goalscorer with nothing else lands well short of a man who
  // scored, created, won, and was still there at 32.
  const prod = role === 'gk' ? tot.cs * 4 : tot.goals * 2 + tot.assists * 1.5;
  const legacy = Math.round(
    prod / PB_ROLE_NORM[role] + tot.apps * 0.3 +
    tot.titles * 40 + tot.boots * 35 + tot.poty * 45 +
    tot.abroad * 12 + tot.caps * 1.5
  );

  return { role, peak, seasons, totals: tot, legacy, seed };
}
