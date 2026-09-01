// The European campaign — what a title-winning season is actually worth.
//
// This is NOT the gauntlet. The gauntlet is a roguelike: one life, relics, coins,
// a map. This is the season's own continuation, and BOTH the draft and the career
// arrive here through the same button on the results screen — the career runs no
// Europe of its own, it only records that the summer happened.
//
// ── What changed in v2 ───────────────────────────────────────────────────────
// v1 simulated the whole campaign the moment you walked in and printed it as one
// scrolling page: the result existed before your finger touched the screen. v2 is
// a SEQUENCE. One match at a time, simulated only when you ask for it, with the
// clock running and the goals arriving on it — the idiom the gauntlet's fight
// screen already established. The campaign persists after every leg, so a refresh
// puts you back exactly where you were rather than at the start or the end.
//
// It also no longer stops at a table position. Places 1-8 go straight to the last
// 16, 9-24 play a knockout play-off, and the ladder runs to a final.
//
// This file must stay DOM-free. Every number in docs/EUROPE.md was measured by
// loading it into Node against the real sim engine, and that has to keep working.

const EU_KEY = 'europe';                 // the slot inside the saved draft
const EU_SAVE_V = 2;                     // v1 campaigns are not migrated — see euLoad
let _euCampaign = null;

/* ── the European night ───────────────────────────────────────────────────────
   In the KNOCKOUT ROUNDS ONLY, your XI is lifted by a share of the gap between
   you and whoever is in front of you. Against a 99 that is an enormous hand;
   against an 85 it is nothing at all.

   It is deliberately NOT a flat bonus. A flat +10 was measured and rejected: it
   is wasted on a weak opponent and too small against a 99, which turned the first
   knockout round into a 94% formality — a corridor rather than a climb. Scaled to
   the gap, every round lands between 50% and 60%, and the whole mechanic is one
   sentence: under the lights you are the equal of anyone.

   1.15 is the single calibration point of this file. Measured over 150,000
   campaigns per rating against the live engine:

     XI 86 → 1:4,167    XI 87 → 1:1,293    XI 88 → 1:456    XI 89 → 1:196

   The brief was 0.1% at 87 and 0.2% at 88; this gives 0.08% and 0.22%. Each
   rating point is worth ~2.75x rather than 2x, because the league-phase gate is
   already steep before any bonus and the two compound. */
const EU_NIGHT_K = 1.15;

/* ── who has been here before ─────────────────────────────────────────────────
   Every player who has actually appeared in the Champions League — the six
   Israeli group-stage squads, plus the eighteen who played it abroad — raises
   the coefficient a little. `js/eu-caps-data.js` holds the record and
   scripts/build_europe_caps.js builds it.

   0.018 per capped player: an XI with nobody who has been there plays at 1.15,
   an XI of eleven who have plays at 1.35. Measured at OVR 88, 40,000 campaigns
   per step:

     caps 0 → 1:449    caps 4 → 1:377    caps 8 → 1:290    caps 11 → 1:282

   So a fully-experienced XI is worth about 1.6x, and the curve flattens at the
   top because the final is a coin flip either way. Worth drafting for, and never
   enough to replace the squad's rating as the thing that decides the summer. */
const EU_CAPS_K = 0.018;

// Counted once, when the campaign is built, and frozen into it — the XI cannot
// change afterwards and a saved campaign must not re-derive this from a draft
// screen that has moved on.
function euCapsInXI() {
  if (typeof EU_CAPS === 'undefined' || !state || !Array.isArray(state.picks)) return 0;
  return state.picks.filter(p => p && p.player && EU_CAPS[p.player.name]).length;
}

function euNightLines(me, oppOvr, caps) {
  const k = EU_NIGHT_K + EU_CAPS_K * (caps || 0);
  const lift = k * Math.max(0, oppOvr - me.ovr);
  if (!lift) return me;
  return { ovr: me.ovr + lift, atk: me.atk + lift, mid: me.mid + lift,
           def: me.def + lift, gk: me.gk + lift, cs: me.cs };
}

/* ── ratings ──────────────────────────────────────────────────────────────── */
// Four line ratings drawn at random that average EXACTLY the club's rating: the
// deltas are forced to sum to zero. A club is nothing but these four numbers —
// none of them exist in our player data, and none of them need to.
function euLines(ovr) {
  let d;
  do {
    d = [0, 0, 0].map(() => Math.floor(Math.random() * 9) - 4);
    d.push(-(d[0] + d[1] + d[2]));
  } while (Math.abs(d[3]) > 4);
  return { atk: ovr + d[0], mid: ovr + d[1], def: ovr + d[2], gk: ovr + d[3] };
}

function euTeam(club) { return { name: club.name, ovr: club.ovr, ...euLines(club.ovr) }; }

// A neutral venue, which simulateMatchV2 has no way to express — it hands the
// HOME multiplier to one side or the other. The final is played on nobody's
// ground, so both sides are computed as the away team.
function euSimMatch(me, opp, home) {
  if (home !== null) return simulateMatchV2(me, opp, home);
  const a = simShrinkLines(me), b = simShrinkLines(opp);
  const gf = simDrawGoals(simExpectedGoals(a, b, false));
  const ga = simDrawGoals(simExpectedGoals(b, a, false), me.cs);
  return { outcome: gf > ga ? 'W' : gf === ga ? 'D' : 'L', gf, ga, opponent: opp.name, home: null };
}

/* ── the campaign ─────────────────────────────────────────────────────────── */
// Nothing is simulated here. The campaign starts holding only the XI it will be
// played with, frozen at the moment you walked in.
function euBuildCampaign(tier) {
  let me = myLineRatings();
  if (typeof euForcedLines === 'function') me = euForcedLines(me);
  return {
    v: EU_SAVE_V,
    tier: EU_TIERS[tier] ? tier : 'ucl',   // which competition this summer is
    ovr: me.ovr,
    lines: { atk: me.atk, mid: me.mid, def: me.def, gk: me.gk },
    sandbox: typeof euSandboxActive === 'function' ? euSandboxActive() : false,
    caps: euCapsInXI(),          // players in the XI who have really played it
    view: 'tie',        // 'tie' | 'agg' | 'league' | 'standings' | 'road' | 'out' | 'trophy'
    qi: 0,              // next qualifying round to draw
    koi: -1,            // index into EU_KO once the knockouts start
    seeded: false,      // finished top 8, so the play-off round is skipped
    cur: null,          // the tie being played
    ties: [],           // every completed tie, qualifying and knockout alike
    league: null,
    result: null,       // 'out' | 'won'
    outAt: null,
    submitted: 0,       // how many ties had been reported the last time we sent
  };
}

// The XI as the engine wants it. Rebuilt from the frozen numbers rather than read
// from state.picks, so a campaign resumed after a refresh plays with the squad it
// started with even if the draft screen has moved on.
// Everything the engine needs to know about the competition being played.
function euTier(c) { return EU_TIERS[(c && c.tier) || 'ucl']; }

// The qualifying rounds of this competition. The Champions League has hand
// written opponents with their own histories; the other two draw a club from
// their own field inside the round's band, which is all they need.
function euQualRounds(c) {
  const t = euTier(c);
  return t.rounds || t.qual;
}
function euDrawQualClub(c, i) {
  const t = euTier(c);
  const r = euQualRounds(c)[i];
  if (r.clubs) {
    const forced = typeof euForcedClub === 'function' ? euForcedClub(i) : null;
    return forced || r.clubs[Math.floor(Math.random() * r.clubs.length)];
  }
  const beaten = new Set(c.ties.map(x => x.club.name));
  // Real qualifying clubs first — the sides that actually play these rounds. The
  // band over the league-phase field is only a fallback, and it exists because a
  // parachuted run can land in a round the list was never written for.
  const named = ((EU_QUAL_CLUBS[t.id] || {})[r.id] || []).filter(x => !beaten.has(x.name));
  if (named.length) return named[Math.floor(Math.random() * named.length)];
  const [lo, hi] = r.band;
  const pool = t.pots.flat().filter(x => !beaten.has(x.name) && x.ovr >= lo && x.ovr <= hi);
  const from = pool.length ? pool : t.pots.flat().filter(x => !beaten.has(x.name));
  return from[Math.floor(Math.random() * from.length)];
}

function euMe(c) {
  return { ovr: c.ovr, atk: c.lines.atk, mid: c.lines.mid, def: c.lines.def, gk: c.lines.gk };
}

/* ── ties ─────────────────────────────────────────────────────────────────── */
// Draw the tie that belongs at the current position, if it is not already drawn.
function euEnsureTie(c) {
  if (c.cur) return c.cur;

  if (c.koi < 0) {                                     // still in qualifying
    const r = euQualRounds(c)[c.qi];
    if (!r) return null;
    const club = euDrawQualClub(c, c.qi);
    c.cur = { kind: 'q', idx: c.qi, roundId: r.id, round: r.round, roundLong: r.roundLong,
              club: { ...club }, legs: [], oneLeg: false };
  } else {
    const k = EU_KO[c.koi];
    if (!k) return null;
    const club = euDrawKoOpponent(c, k);
    c.cur = { kind: 'ko', idx: c.koi, roundId: k.id, round: k.round, roundLong: k.roundLong,
              club: { ...club }, legs: [], oneLeg: !!k.oneLeg };
  }
  c.cur.lines = euLines(c.cur.club.ovr);
  return c.cur;
}

// Who is waiting in a knockout round. Drawn from the pots the ladder names, minus
// anyone already knocked out — you cannot meet a club twice, and you certainly
// cannot meet one you already beat.
function euDrawKoOpponent(c, k) {
  const beaten = new Set(c.ties.map(t => t.club.name));
  const all = euTier(c).pots;
  // The ladder names pot indexes for a four-pot competition. The Conference has
  // six, so the same index means "one of the strongest" there too — clamp rather
  // than read past the end and hand the draw an undefined.
  const idx = (c.seeded && k.seedPots) ? k.seedPots : k.pots;
  const pots = idx.map(i => Math.min(i, all.length - 1));
  const pool = pots.flatMap(i => all[i]).filter(x => !beaten.has(x.name));
  const from = pool.length ? pool : all.flat().filter(x => !beaten.has(x.name));
  return from[Math.floor(Math.random() * from.length)];
}

// How many legs this tie needs. The final is one match on neutral ground.
function euLegsNeeded(tie) { return tie.oneLeg ? 1 : 2; }
function euTieComplete(c) { const t = c.cur; return !!t && t.legs.length >= euLegsNeeded(t); }

// Play the next leg and return it. Away first, home second — the order Israeli
// clubs actually draw. The European night applies to knockout ties only.
function euPlayLeg(c) {
  const t = euEnsureTie(c);
  if (!t || euTieComplete(c)) return null;

  const opp = { name: t.club.name, ovr: t.club.ovr, ...t.lines };
  const base = euMe(c);
  const me = t.kind === 'ko' ? euNightLines(base, t.club.ovr, c.caps) : base;
  const home = t.oneLeg ? null : t.legs.length === 1;

  const leg = euSimMatch(me, opp, home);
  leg.leg = t.legs.length + 1;

  // Scorers, so a European row reads like a league row. Same helper the season
  // uses, so the names come from the XI that actually played.
  try { simulatePlayerStats([leg]); } catch (e) { leg.scorers = leg.scorers || []; }
  leg.events = euLegEvents(leg, t.club.name);
  t.legs.push(leg);
  euSave(c);
  return leg;
}

// The minute-by-minute feed the live screen plays back. Your goals already carry
// minutes and names from simulatePlayerStats; the opponent's carry only a club.
function euLegEvents(leg, oppName) {
  const used = new Set();
  const minute = () => {
    let m;
    do { m = 1 + Math.floor(Math.random() * 90); } while (used.has(m));
    used.add(m);
    return m;
  };
  const ev = [];
  (leg.scorers || []).forEach(s => { used.add(s.min); ev.push({ min: s.min, side: 'me', name: s.n }); });
  for (let i = 0; i < leg.ga; i++) ev.push({ min: minute(), side: 'them', name: oppName });
  return ev.sort((a, b) => a.min - b.min);
}

// Close the tie: aggregate, extra time in the second leg, then penalties.
// No away goals — UEFA abolished them in 2021 and this ladder is the modern one.
function euCloseTie(c) {
  const t = c.cur;
  if (!t || !euTieComplete(c)) return null;

  let gf = t.legs.reduce((s, l) => s + l.gf, 0);
  let ga = t.legs.reduce((s, l) => s + l.ga, 0);
  t.et = null; t.pens = null;

  if (gf === ga) {
    const base = euMe(c);
    const me = t.kind === 'ko' ? euNightLines(base, t.club.ovr, c.caps) : base;
    const opp = { name: t.club.name, ovr: t.club.ovr, ...t.lines };
    const a = simShrinkLines(me), b = simShrinkLines(opp);
    const eg = simDrawGoals(simExpectedGoals(a, b, true) / 3);       // a third of a match
    const ea = simDrawGoals(simExpectedGoals(b, a, false) / 3);
    t.et = { gf: eg, ga: ea };
    gf += eg; ga += ea;
  }
  if (gf === ga) {
    const mine = 3 + (Math.random() < 0.5 ? 1 : 0);
    t.pens = { gf: mine, ga: mine === 4 ? 3 : 4 };
  }
  t.agg = { gf, ga };
  t.won = t.pens ? t.pens.gf > t.pens.ga : gf > ga;

  // The sandbox forces a result by mirroring the tie it just watched, rather than
  // by replaying until the dice agree: a 90-rated squad losing to a 79 is a sub-1%
  // event and a retry budget loses that coin flip often enough to matter. The
  // legs, the aggregate and the scorers all stay internally consistent.
  // Keyed by round id, not by index — 'q1' and 'ko-po' are both index 0.
  const want = typeof euForcedOutcome === 'function' ? euForcedOutcome(t.roundId) : null;
  if (want && (want === 'W') !== t.won) euMirrorTie(t);

  c.ties.push(t);
  c.cur = null;
  c.view = 'agg';
  euSave(c);
  euSubmit(c);
  return t;
}

// Swap both sides of every leg. The scoreline stays a real one the engine could
// have produced, it just belongs to the other team now.
function euMirrorTie(t) {
  t.legs.forEach(l => {
    const g = l.gf; l.gf = l.ga; l.ga = g;
    l.outcome = l.gf > l.ga ? 'W' : l.gf === l.ga ? 'D' : 'L';
    l.scorers = [];                       // they were the other side's goals
    l.events = (l.events || []).map(e => ({ ...e, side: e.side === 'me' ? 'them' : 'me' }));
  });
  if (t.et) { const g = t.et.gf; t.et.gf = t.et.ga; t.et.ga = g; }
  if (t.pens) { const g = t.pens.gf; t.pens.gf = t.pens.ga; t.pens.ga = g; }
  const gf = t.legs.reduce((s, l) => s + l.gf, 0) + (t.et ? t.et.gf : 0);
  const ga = t.legs.reduce((s, l) => s + l.ga, 0) + (t.et ? t.et.ga : 0);
  t.agg = { gf, ga };
  t.won = t.pens ? t.pens.gf > t.pens.ga : gf > ga;
  return t;
}

/* ── after a tie ──────────────────────────────────────────────────────────── */
// The one place that decides where the campaign goes next. Called when the
// aggregate screen is dismissed.
function euAfterTie(c) {
  const t = c.ties[c.ties.length - 1];
  if (!t) return;

  if (!t.won) {
    // ── the parachute ──────────────────────────────────────────────────────
    // Losing ANY qualifying round drops you a competition rather than ending the
    // summer, into the round after the one you just lost. Lose the play-off and
    // there is no round after it, so you land in the league phase itself. The
    // whole screen changes colour at that moment, because the palette follows
    // the tier you are IN and not the one you started in.
    const drop = t.kind === 'q' ? EU_PARACHUTE[c.tier || 'ucl'] : null;
    if (drop) {
      c.droppedFrom = c.tier || 'ucl';
      c.droppedAt = t.roundId;
      c.tier = drop;
      // The round after the one just lost, in the competition below.
      const nextId = EU_ROUND_SEQ[EU_ROUND_SEQ.indexOf(t.roundId) + 1];
      const at = nextId ? euQualRounds(c).findIndex(r => r.id === nextId) : -1;
      if (at >= 0) {
        c.qi = at;                     // straight into that qualifying round
        c.view = 'drop';
      } else {
        c.qi = euQualRounds(c).length;  // no rounds left — the league phase
        euPlayLeaguePhase(c);
        c.view = 'drop';
      }
    } else {
      c.result = 'out';
      c.outAt = t.roundId;
      c.view = 'out';
    }
  } else if (t.kind === 'q') {
    c.qi++;
    if (c.qi >= euQualRounds(c).length) { euPlayLeaguePhase(c); c.view = 'league'; }
    else c.view = 'tie';
  } else if (t.roundId === 'final') {
    c.result = 'won';
    c.view = 'trophy';
  } else {
    c.koi++;
    c.view = 'tie';
  }
  euSave(c);
  euSubmit(c);
}

// Leaving the standings: 25-36 is the end of the road, 1-8 skips the play-off.
function euEnterKnockouts(c) {
  const band = euBand(c.league.rank);
  if (band.id === 'out') {
    c.result = 'out';
    c.outAt = 'league';
    c.view = 'out';
  } else {
    c.seeded = band.id === 'r16';
    c.koi = c.seeded ? 1 : 0;            // index 0 is the knockout play-off
    c.view = 'road';
  }
  euSave(c);
  euSubmit(c);
}

function euBand(rank) { return EU_BANDS.find(b => rank <= b.max); }

/* ── the league phase ─────────────────────────────────────────────────────── */
// Eight matches against eight different clubs: two out of every pot, one at home
// and one away in each — the real format since 2024. Your own pot gives you two
// of the eight clubs in it, because the ninth seat is you.
function euPlayLeaguePhase(c) {
  const me = euMe(c);
  const beaten = c.ties.map(t => t.club.name);
  const T = euTier(c);
  const out = new Set(beaten);
  const used = new Set();                // a reserve fills exactly one seat
  const pots = T.pots.map((pot, i) => {
    const kept = pot.filter(x => !out.has(x.name));
    // refill, so the field is always 35 opponents and the table always 36 rows
    for (const club of (EU_RESERVES[i] || [])) {
      if (kept.length >= pot.length) break;
      if (!used.has(club.name)) { kept.push(club); used.add(club.name); }
    }
    // A pot can in principle lose all four qualifying opponents, more than its
    // own bench covers, so a pot that is still short borrows from the others.
    // Without this the table quietly returns 35 rows and calls itself 36.
    for (const club of EU_RESERVES.flat()) {
      if (kept.length >= pot.length) break;
      if (!used.has(club.name)) { kept.push(club); used.add(club.name); }
    }
    return kept;
  });

  const opponents = [];
  pots.forEach((pot, pi) => {
    // Two from each of four pots in the Champions and Europa Leagues; one from
    // each of six in the Conference. Eight matches against six.
    shuffleArr([...pot]).slice(0, T.perPot)
      .forEach((club, k) => opponents.push({ ...club, pot: pi + 1, home: k % 2 === 0 }));
  });
  const matches = shuffleArr(opponents).map(o => {
    const m = simulateMatchV2(me, euTeam(o), o.home);
    m.pot = o.pot; m.flag = o.flag; m.ovr = o.ovr; m.cid = o.id;
    return m;
  });
  try { simulatePlayerStats(matches); } catch (e) {}

  // The other 35 clubs never play a ball. Their points come from the same
  // closed-form estimator that already fills the Israeli league table, over the
  // same eight matches — order from the xG model, spacing conventionalised, and
  // a form swing per club so the table is not identical every campaign.
  const field = pots.flat().map(x => ({ ...x, ...euLines(x.ovr) }));
  const est = simTableEstimateV2([...field, { ...me, name: 'me' }], T.matches);
  const pts = matches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);

  const table = field.map((x, i) => ({ name: x.name, flag: x.flag, cid: x.id, pts: est[i], us: false }));
  table.push({ name: 'הקבוצה שלי', flag: '🇮🇱', pts, us: true, ovr: c.ovr });
  // Ties always favour the player — the same rule the league table uses.
  table.sort((a, b) => b.pts - a.pts || (a.us ? -1 : b.us ? 1 : 0));

  c.league = { matches, table, rank: table.findIndex(t => t.us) + 1, pts };

  // The sandbox can dictate where you finished. Reaching the knockouts honestly
  // is a ~3% run even with a perfect draft, so without this the entire second
  // half of the mode is untestable by playing it. The row is MOVED rather than
  // renumbered, so the table still reads top to bottom.
  const forced = typeof euForcedRank === 'function' ? euForcedRank() : null;
  if (forced && forced >= 1 && forced <= 36) {
    const mine = table.splice(table.findIndex(t => t.us), 1)[0];
    table.splice(forced - 1, 0, mine);
    c.league.rank = forced;
  }
  euSave(c);
  return c.league;
}

/* ── the road ─────────────────────────────────────────────────────────────── */
// The ladder as the screen wants it: every knockout round from where you entered
// to the final, each either won, current, or still to come.
function euRoad(c) {
  const done = c.ties.filter(t => t.kind === 'ko');
  return EU_KO.filter((k, i) => !(c.seeded && i === 0)).map(k => {
    const t = done.find(x => x.roundId === k.id);
    const cur = c.cur && c.cur.roundId === k.id;
    const at = EU_KO.findIndex(x => x.id === k.id);
    return {
      id: k.id, round: k.round, roundLong: k.roundLong,
      state: t ? (t.won ? 'won' : 'lost') : (cur || c.koi === at ? 'now' : 'todo'),
      tie: t || (cur ? c.cur : null),
    };
  });
}

/* ── achievements ─────────────────────────────────────────────────────────── */
// Reported after every completed tie, not once at the end.
//
// v1 sent this a single time, when the campaign was built — which worked only
// because the campaign was built complete. In a sequence there is no such moment,
// and a player who closes the tab three rounds deep would never report at all.
// The gauntlet learned this the hard way: its board read 0/8 for weeks because a
// run only reported itself when it ENDED, and the only runs that end quickly are
// the ones that die at the first whistle.
//
// Sending is cheap and the server clamps everything, so the guard is simply "has
// anything new happened since the last send".
async function euSubmit(c) {
  if (c.sandbox) return;                 // a sandbox 👑 שמינית הגמר is not an achievement
  const done = c.ties.length + (c.league ? 1 : 0) + (c.result ? 1 : 0);
  if (done <= (c.submitted || 0)) return;
  c.submitted = done;

  // the campaign IS the run, recorded whether or not anyone is signed in
  if (typeof track === 'function' && c.result) {
    track('finish', 'europe', c.result === 'won' ? 'trophy'
                            : c.league ? String(c.league.rank) : 'qual');
  }
  if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;

  const L = c.league;
  const ko = c.ties.filter(t => t.kind === 'ko');
  const giant = !!(L && L.matches.some(m => m.outcome === 'W' && m.ovr >= 96));
  // a tie survived without conceding over BOTH legs, extra time included
  const clean = c.ties.some(t => t.won &&
    t.legs.reduce((n, l) => n + l.ga, 0) + (t.et ? t.et.ga : 0) === 0);
  try {
    const r = await _supabase.rpc('submit_europe_run', {
      p: {
        tier: c.tier || 'ucl',
        // A parachuted run reaches a league phase having LOST its last qualifier,
        // so this cannot be inferred from the number of ties won.
        reached_league: !!c.league,
        parachuted: !!c.droppedFrom,
        won_ties: c.ties.filter(t => t.kind === 'q' && t.won).length,
        rank: L ? L.rank : 0,
        points: L ? L.pts : 0,
        beat_giant: giant,
        clean_tie: clean,
        // New with the knockouts. The live function ignores unknown keys, so
        // these are inert until the migration that reads them is applied.
        ko_won: ko.filter(t => t.won).length,
        reached_final: ko.some(t => t.roundId === 'final'),
        trophy: c.result === 'won',
      },
    });
    // pop the toast for whatever the run just earned, same as everywhere else
    const got = (r && r.data && r.data.achievements) || [];
    if (got.length && typeof showAchievementToasts === 'function') showAchievementToasts(got);
  } catch (e) {}
}

/* ── persistence ──────────────────────────────────────────────────────────── */
// The campaign lives beside the season inside the saved draft, so a refresh
// shows the campaign you played rather than rolling a new one. A new season
// deletes it — see the save path in js/game.js, which also clears the cache here.
function euSave(c) {
  try {
    const raw = localStorage.getItem(DRAFT_SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    d[EU_KEY] = c;
    localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
  } catch (e) {}
}
// A v1 campaign is not migrated. It belongs to a season that has already been
// played to its end, and the shapes have nothing in common.
function euLoad() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY));
    return d && d[EU_KEY] && d[EU_KEY].v === EU_SAVE_V ? d[EU_KEY] : null;
  } catch (e) { return null; }
}
function euClear() {
  _euCampaign = null;
  try {
    const raw = localStorage.getItem(DRAFT_SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    delete d[EU_KEY];
    localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
  } catch (e) {}
}

/* ── editable copy ────────────────────────────────────────────────────────── */
// Every sentence on this screen is overridable from the admin panel, like the
// rest of the site. The four qualifying blurbs deliberately reuse the gauntlet's
// own keys (gt-eu-*) so a club is described the same way wherever it turns up.
function euText(key, def) {
  return (typeof siteText === 'function' ? siteText(key, def) : def) || def;
}

/* ── entry ────────────────────────────────────────────────────────────────── */
function euStart(tier) {
  if (!state.picks || !state.picks.some(Boolean)) return;
  _euCampaign = _euCampaign || euLoad();
  if (!_euCampaign) { _euCampaign = euBuildCampaign(tier); euSave(_euCampaign); }
  showScreen('europe');
  const back = document.getElementById('eu-back');
  if (back) back.onclick = () => euLeave();
  euRender();
}
