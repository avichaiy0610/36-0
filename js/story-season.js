/* ── מצב סיפור: the season ────────────────────────────────────────────────────
 *
 * The bridge between the market (js/story-market.js) and the engine that
 * already exists. No DOM: it reads and writes `state` the way the draft does, so
 * the results screen, the pitch and the share card work unchanged — and so the
 * calibration harness can run it in Node.
 *
 * The January window here is not js/january.js. That one knows its single
 * transfer before the season is played and simulates both futures up front. A
 * story window is a whole market, so the future cannot be known in advance.
 * Instead the season is REPLAYED from the same seed once the market closes:
 * the summer XI and the summer opponents are put back, the first half consumes
 * the RNG exactly as it did, and the January XI goes in at the seam. First half
 * identical, second half yours — the same guarantee january.js gives, reached
 * the other way round.
 */

/* ── the depth of the squad ──────────────────────────────────────────────────
 * The owner: the squad's depth must matter, "and remember there are
 * substitutions in an average match". Two ways, and neither touches the engine —
 * they change who is on the pitch and the four line ratings handed to it:
 *
 *   substitutions — the bench plays about 10% of an outfield line's minutes, so
 *     each line is weighted with the best fit man on the bench for it (a 70 if
 *     there is nobody). Selling the bench to pay for a star now costs something
 *     every match. The keeper is never changed.
 *   injuries — every player has a 6% chance of missing a half of the league
 *     season (4% for one European match). They are KNOWN AHEAD: the summer market
 *     shows who misses the first half, January who misses the second, the board
 *     who misses the next match. The XI is picked from whoever is fit.
 * Both are seeded on the run, so a refresh changes nothing. */
// ~10%: three to five changes of ~25 minutes is ~100 of an XI's 990 outfield minutes.
// (0.15 was measured first and read too strong; 10% is also the real share.)
const STORY_SUB_W = 0.10;
// ~2-3 of a 25-man squad unavailable at any moment is the usual Israeli picture.
const STORY_INJ = { half: 0.06, match: 0.04 };
// when: 'h1' | 'h2' for the league halves, 'eu|<round>|<leg>' for a European match
function storyIsInjured(run, when, name) {
  if (!when) return false;
  const p = String(when).startsWith('eu|') ? STORY_INJ.match : STORY_INJ.half;
  return storyRand(run, 'inj', when, name) < p;
}
function storyInjured(run, when) {
  return storyOwned(run).filter(e => storyIsInjured(run, when, e.player.name));
}

// Put the run's eleven on the pitch — yours if you picked one, else the best —
// from whoever is fit `when`, and note the bench's best man for each line.
function storyApplyXI(run, when, tactic) {
  state.formationId = run.formationId;
  state.tactic = tacticOf(tactic || run.tactic);
  state.slots = formationSlots(state.formationId, state.tactic);
  const fit = storyOwned(run).filter(e => !storyIsInjured(run, when, e.player.name));
  state.picks = storyPickXI(fit, state.slots, run.xi);
  const inXI = new Set(state.picks.filter(Boolean));
  const bench = fit.filter(e => !inXI.has(e));
  state.storyBench = {};
  for (const k of ['atk', 'mid', 'def']) {
    const b = bench.filter(e => SIM2_LINES[k].pos.includes(e.player.position)).map(e => e.player.ovr);
    state.storyBench[k] = b.length ? Math.max(...b) : 70;
  }
  return state.picks;
}

// Called at the end of game.js myLineRatings() while a chapter is on.
function storyDepthAdjust(me) {
  const b = typeof state !== 'undefined' && state.story ? state.storyBench : null;
  if (!b) return me;
  const w = STORY_SUB_W;
  return { ...me, atk: me.atk * (1 - w) + b.atk * w, mid: me.mid * (1 - w) + b.mid * w,
           def: me.def * (1 - w) + b.def * w };
}

function storySnapshot() {
  return { formationId: state.formationId, tactic: state.tactic,
           slots: state.slots.slice(), picks: state.picks.slice(), storyBench: state.storyBench };
}

// The rating the run's XI would have, without leaving a trace on `state`.
function storyXiOvr(run, when) {
  const keep = storySnapshot();
  try { storyApplyXI(run, when); return teamOVR(); } finally { Object.assign(state, keep); }
}

// The eleven and the bench's best per line, as the UI shows them, without a trace.
function storyLineup(run, when) {
  const keep = storySnapshot();
  try {
    storyApplyXI(run, when);
    return { slots: state.slots.slice(), picks: state.picks.slice(), bench: { ...state.storyBench }, ovr: teamOVR() };
  } finally { Object.assign(state, keep); }
}

// simulatePlayerStats credits whoever is in state.picks, so each half is credited
// with the eleven who actually played it — and seeded, so both futures of the
// first half name the same scorers.
function storyStatsFor(snap, matches, seed) {
  const keep = storySnapshot();
  Object.assign(state, { formationId: snap.formationId, tactic: snap.tactic,
                         slots: snap.slots, picks: snap.picks, storyBench: snap.storyBench });
  try { return withSeededRandom(seed, () => simulatePlayerStats(matches)); }
  finally { Object.assign(state, keep); }
}

function storyMergeStats(a, b) {
  const by = new Map();
  for (const p of [...a, ...b]) {
    const cur = by.get(p.name);
    if (!cur) by.set(p.name, { ...p });
    else { cur.goals += p.goals; cur.assists += p.assists; cur.cs += p.cs; }
  }
  return [...by.values()];
}

function storyNameUs(season, ch) {
  const name = ((typeof TEAMS !== 'undefined' && TEAMS[ch.teamId]) || {}).name;
  if (name) season.leagueTable.forEach(r => { if (r.us) r.name = name; });
  return season;
}

// The opponents the CURRENT simulation is playing. The January hook rewrites
// these objects in place — the fixture pool holds references to them, so a
// rival who lost his striker in January plays the second half without him.
let _storyOppLive = null;
function storyOppForSim(ch, run) {
  _storyOppLive = storyOpponents(ch, run, 'summer');
  return _storyOppLive;
}
function storyOppJanuary(ch, run) {
  if (!_storyOppLive) return;
  const next = storyOpponents(ch, run, 'all');
  for (const o of _storyOppLive) {
    const n = next.find(x => x.teamId === o.teamId);
    if (n) Object.assign(o, n);
  }
}

// A simulate() with the same shape animateResults builds, for Node. The browser
// passes animateResults' own closure instead — it reaches the same opponents
// through oppTeamsForState(), which story.js points at storyOppForSim.
function storySimulateFn(ch, run) {
  return (halfHook = null) => {
    const spec = seasonFormat(parseInt(ch.season, 10));
    const g = generateMatches(myLineRatings(), storyOppForSim(ch, run), spec, SIM_ENGINE_CURRENT, halfHook);
    let w = 0, d = 0;
    g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    const l = g.matches.length - w - d;
    return {
      ovr: teamOVR(), engine: SIM_ENGINE_CURRENT, matches: g.matches, inTopSix: g.inTopSix,
      leagueTable: spec.modern
        ? generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents)
        : generateAuthenticTable(w, d, l, g),
      playerStats: simulatePlayerStats(g.matches),
    };
  };
}

// The summer half of the chapter. Returns the season as it runs with no January
// changes (`stay`), plus everything the replay needs.
function storySeasonPrepare(simulate, run, ch) {
  storyApplyXI(run, 'h1');
  const snapA = storySnapshot();
  let firstHalf = null, snapStay = null;
  // Even with no January moves the second half has its own injuries.
  const stay = withSeededRandom(run.seed, () => simulate(fh => {
    firstHalf = fh;
    storyApplyXI(run, 'h2');
    snapStay = storySnapshot();
    return myLineRatings();
  }));
  if (!firstHalf || !firstHalf.length) return null;
  const played = firstHalf.length;
  const firstStats = storyStatsFor(snapA, stay.matches.slice(0, played), run.seed + 1);
  const rest = storyStatsFor(snapStay, stay.matches.slice(played), run.seed + 2);
  Object.assign(state, snapA);
  stay.playerStats = storyMergeStats(firstStats, rest);
  storyNameUs(stay, ch);
  return { story: true, stay, played, firstHalf: stay.matches.slice(0, played),
           firstStats, snapA, simulate };
}

// After the January market has committed into `run`: replay from the same seed.
function storySeasonResim(pair, run, ch) {
  Object.assign(state, { formationId: pair.snapA.formationId, tactic: pair.snapA.tactic,
                         slots: pair.snapA.slots.slice(), picks: pair.snapA.picks.slice(),
                         storyBench: pair.snapA.storyBench });
  let snapB = null;
  const season = withSeededRandom(run.seed, () => pair.simulate(() => {
    storyApplyXI(run, 'h2');
    storyOppJanuary(ch, run);
    snapB = storySnapshot();
    return myLineRatings();
  }));
  const played = pair.played;
  // simulate() credited the whole season to the January XI and rewrote the
  // first half's scorers doing it. Put the real ones back, then credit the rest.
  storyStatsFor(pair.snapA, season.matches.slice(0, played), run.seed + 1);
  const rest = storyStatsFor(snapB, season.matches.slice(played), run.seed + 2);
  season.playerStats = storyMergeStats(pair.firstStats, rest);
  storyNameUs(season, ch);
  Object.assign(state, snapB);
  season.ovr = teamOVR();
  return season;
}
