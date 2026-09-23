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

// Put the run's best eleven on the pitch, in its formation and tactic.
function storyApplyXI(run) {
  state.formationId = run.formationId;
  state.tactic = tacticOf(run.tactic);
  state.slots = formationSlots(state.formationId, state.tactic);
  state.picks = storyBestXI(storyOwned(run), state.slots);
  return state.picks;
}

function storySnapshot() {
  return { formationId: state.formationId, tactic: state.tactic,
           slots: state.slots.slice(), picks: state.picks.slice() };
}

// The rating the run's XI would have, without leaving a trace on `state`.
function storyXiOvr(run) {
  const keep = storySnapshot();
  try { storyApplyXI(run); return teamOVR(); } finally { Object.assign(state, keep); }
}

// simulatePlayerStats credits whoever is in state.picks, so each half is credited
// with the eleven who actually played it — and seeded, so both futures of the
// first half name the same scorers.
function storyStatsFor(snap, matches, seed) {
  const keep = storySnapshot();
  Object.assign(state, { formationId: snap.formationId, tactic: snap.tactic,
                         slots: snap.slots, picks: snap.picks });
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
  const snapA = storySnapshot();
  let firstHalf = null;
  const stay = withSeededRandom(run.seed, () => simulate(fh => { firstHalf = fh; return null; }));
  if (!firstHalf || !firstHalf.length) return null;
  const played = firstHalf.length;
  const firstStats = storyStatsFor(snapA, stay.matches.slice(0, played), run.seed + 1);
  const rest = storyStatsFor(snapA, stay.matches.slice(played), run.seed + 2);
  stay.playerStats = storyMergeStats(firstStats, rest);
  storyNameUs(stay, ch);
  return { story: true, stay, played, firstHalf: stay.matches.slice(0, played),
           firstStats, snapA, simulate };
}

// After the January market has committed into `run`: replay from the same seed.
function storySeasonResim(pair, run, ch) {
  Object.assign(state, { formationId: pair.snapA.formationId, tactic: pair.snapA.tactic,
                         slots: pair.snapA.slots.slice(), picks: pair.snapA.picks.slice() });
  let snapB = null;
  const season = withSeededRandom(run.seed, () => pair.simulate(() => {
    storyApplyXI(run);
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
