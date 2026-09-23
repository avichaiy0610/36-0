/* ── מצב סיפור: the flow ──────────────────────────────────────────────────────
 *
 * Owns the run in localStorage and walks it through its phases:
 *   summer (the market screen) → season (the ordinary reveal, with our seam)
 *   → jan (the market again, over the reveal) → season → done (the verdict).
 * Every decision is made in js/story-market.js and js/story-season.js, which are
 * tested in Node; this file only moves between them. Screens are in
 * js/story-screens.js.
 *
 * No track() calls: 'story' is not yet on the allow-list track() enforces, and
 * an unknown mode is dropped in silence (scripts/check_track_contract.js).
 */
(function (global) {
  'use strict';

  const RUN_KEY = '36-0-story-run';
  const BEST_KEY = '36-0-story-best';
  let _run = null;

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function storyRun() {
    if (!_run) {
      const r = load(RUN_KEY);
      _run = (r && r.v === 1 && storyChapter(r.chapterId)) ? r : null;
    }
    return _run;
  }
  function storySave() { if (_run) save(RUN_KEY, _run); }
  function storyBest() { return load(BEST_KEY) || {}; }

  function storyStart(chapterId) {
    const ch = storyChapter(chapterId);
    if (!ch) return;
    _run = storyNewRun(ch, (Math.random() * 4294967296) >>> 0);
    storySave();
    // A draft or season left in storage belongs to some other mode.
    if (typeof clearDraftState === 'function') clearDraftState();
    storyShowMarket('summer');
  }

  // From the summer market to the ordinary pre-season screen, with the chapter's
  // XI on the pitch and every other mode's field explicitly switched off —
  // `state` is shared, and a field nobody sets is a field that carries over.
  function storyEnterSeason() {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch) return;
    run.phase = 'season';
    storySave();
    const year = parseInt(ch.season, 10);
    Object.assign(state, {
      story: { chapterId: ch.id },
      challenge: null, challengeDeck: null, challengeReqs: null,
      leagueCode: null, duelCode: null, career: null, gauntlet: null,
      salaryCap: false, deck: null, mgw: null,
      classic: false, peakMode: false, showRatings: true, difficulty: 'normal',
      coach: null, coachOn: false, januaryOn: false,       // managers arrive in phase 2
      oppSeason: year, oppSeasonChoice: 'latest', leagueFormat: 'authentic',
      usedSquadIds: new Set(), currentSquad: null,
      selectedPlayer: null, selectedSlotIdx: null,
      isAnimating: false, awaitingSlotPick: false, moveMode: false, movingFromIdx: null,
    });
    storyApplyXI(run);
    state.usedPlayerKeys = new Set(state.picks.filter(Boolean).map(p => p.player.name));
    state.currentRound = state.slots.length;               // "drafted" — restore resumes at the season
    saveDraftState();
    showPreseason(teamOVR());
  }

  // Called by oppTeamsForState() while a chapter is on.
  function storyOppForState() {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    return ch ? storyOppForSim(ch, run) : [];
  }

  // Called by animateResults when a chapter's season is simulated.
  function storyPrepare(simulate) {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch || !state.story) return null;
    return storySeasonPrepare(simulate, run, ch);
  }

  // Called by the reveal at the seam. The market works on a COPY of the run and
  // commits only on confirm, so a refresh in the middle of it loses nothing but
  // the unconfirmed moves (and the season continues as `stay`, like january.js).
  function storyOpen(pair, tally, onChosen) {
    const run = storyRun();
    const ch = storyChapter(run.chapterId);
    run.phase = 'jan';
    storySave();
    const draft = JSON.parse(JSON.stringify(run));
    storyShowJanuary(pair, tally, draft, () => {
      const changed = JSON.stringify([draft.own, draft.formationId, draft.tactic]) !==
                      JSON.stringify([run.own, run.formationId, run.tactic]);
      Object.assign(run, draft, { phase: 'season' });
      storySave();
      if (!changed) { onChosen(pair.stay); return; }
      const season = storySeasonResim(pair, run, ch);
      saveDraftState();
      if (typeof buildResultsPitch === 'function') buildResultsPitch();
      onChosen(season);
    });
  }

  // Called from bindSeason. Runs again for a restored season, so it is idempotent:
  // the verdict is written once, and only re-rendered after that.
  function storyOnSeasonEnd(res) {
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch) return;
    if (run.phase !== 'done') {
      const r = storyResult(run, res.table, res.rank, res.points);
      const stars = storyStars(ch, r);
      run.result = { rank: r.rank, points: r.points, budget: r.budget, margin: r.margin,
                     buys: run.bought.length, stars, score: storyScore(ch, r) };
      run.phase = 'done';
      storySave();
      const best = storyBest();
      const b = best[ch.id] || { stars: [false, false, false], score: null };
      best[ch.id] = {
        stars: b.stars.map((s, i) => s || stars[i]),
        score: b.score == null ? run.result.score : Math.max(b.score, run.result.score),
      };
      save(BEST_KEY, best);
    }
    storyRenderEnd(ch, run.result);
  }

  function storyExit() {
    if (typeof clearDraftState === 'function') clearDraftState();
    state.story = null;
    storyShowHub();
  }

  Object.assign(global, {
    storyRun, storySave, storyBest, storyStart, storyEnterSeason, storyOppForState,
    storyPrepare, storyOpen, storyOnSeasonEnd, storyExit,
  });
})(typeof window !== 'undefined' ? window : globalThis);
