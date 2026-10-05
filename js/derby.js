// ─── אלופי הדרבי — the run ───────────────────────────────────────────────────
// Spec: docs/superpowers/specs/2026-10-05-derby-champions-design.md
// Flow: pick club → draft (the normal draft screen, one-club pool) → the rivals'
// XIs → best-of-5 → end. The run lives in localStorage and is saved after every
// step; a game is simulated only when it is reached, so a refresh resumes.

const DERBY_KEY = '36-0-derby';

function derbyLoad() {
  try { const r = JSON.parse(localStorage.getItem(DERBY_KEY)); return r && r.v === 1 ? r : null; }
  catch (e) { return null; }
}
function derbySave(run) { try { localStorage.setItem(DERBY_KEY, JSON.stringify(run)); } catch (e) {} }
// Remove the draft save only if it is a DERBY draft — by the time a series ends
// the player may have started another mode, whose save this must not delete.
function derbyClearDraftSave() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY) || 'null');
    if (d && d.derby && typeof clearDraftState === 'function') clearDraftState();
  } catch (e) {}
}
function derbyClear() { try { localStorage.removeItem(DERBY_KEY); } catch (e) {} }

// A pick is stored by squad id + name and looked up again on load.
function derbyEntryKey(e) { return e ? { squadId: e.squad.id, name: e.player.name } : null; }
function derbyEntry(k) {
  if (!k) return null;
  const sq = SQUADS.find(s => s.id === k.squadId);
  const p = sq && sq.players.find(x => x.name === k.name);
  return p ? { player: p, squad: sq } : null;
}

function derbyStart(club, difficulty) {
  const run = { v: 1, club, difficulty, formationId: [_selectedFormationKey, state.formationId, '4-3-3'].find(k => k && FORMATIONS[k]),
    tactic: tacticOf(typeof _selectedTactic !== 'undefined' ? _selectedTactic : state.tactic), seed: (Math.random() * 2147483647) | 0,
    phase: 'draft', xi: null, rivals: null, games: [], submitted: false };
  derbySave(run);
  derbyTrack('progress', club + '|start');
  derbyBeginDraft(run);
}

function derbyBeginDraft(run) {
  // Every other mode's field is set by hand — the derby must not inherit one.
  Object.assign(state, {
    leagueCode: null, duelCode: null, career: null, gauntlet: null, story: null,
    challenge: null, challengeDeck: null, challengeReqs: null,
    deck: null, mgw: null, mga: null, coach: null, salaryCap: null,
    difficulty: run.difficulty, showRatings: true, draftMode: 'squad-first', peakMode: false,
    eraMin: YEAR_MIN, eraMax: YEAR_MAX, formationId: run.formationId,
    derby: { club: run.club },
  });
  beginDraftWithState({ classic: false, tactic: run.tactic });
  // beginDraftWithState deals rerolls by difficulty; the derby has its own.
  state.teamRerollsLeft = 0;
  state.seasonRerollsLeft = DERBY_REROLLS;
  updateRerollButtons();
  saveDraftState();
}

// Called by game.js when the eleventh pick lands (and on a restored full draft).
function derbyAfterDraft() {
  const run = derbyLoad();
  // No run, or a run of another club: a stale flag. Never play a season with it on.
  if (!run || !state.derby || run.club !== state.derby.club) {
    state.derby = null;
    if (typeof clearDraftState === 'function') clearDraftState();
    showScreen('welcome');
    return;
  }
  if (run.phase !== 'draft') { derbyShow(); return; }       // re-entry: the XI is already fixed
  run.xi = state.picks.map(derbyEntryKey);
  run.tactic = state.tactic || 'bal';
  if (!run.rivals) {
    const rng = derbyRng(run.seed);
    run.rivals = {};
    for (const id of DERBY_RIVALS[run.club]) {
      run.rivals[id] = derbyAiDraft(id, run.formationId, run.difficulty, rng).picks.map(derbyEntryKey);
    }
  }
  run.phase = 'rivals';
  derbySave(run);
  derbyTrack('progress', run.club + '|drafted');
  derbyShow();
}

// Put the player's XI back on `state` (after a refresh nothing else will).
function derbyApplyMine(run) {
  state.formationId = run.formationId;
  state.tactic = run.tactic;
  state.slots = formationSlots(run.formationId, run.tactic);
  state.picks = run.xi.map(derbyEntry);
  state.derby = { club: run.club };
  // Whatever the last mode left on the shared state must not touch the ratings.
  state.peakMode = false; state.story = null; state.coach = null; state.classic = false;
  state.crowdMode = false;
}
function derbyRivalPicks(run, id) { return run.rivals[id].map(derbyEntry); }

// Simulate the next game, save, and return it (null when the series is over).
function derbyPlayNext(run) {
  if (derbySeriesStatus(run.games).over) return null;
  const i = run.games.length, rival = derbyGameRival(run.club, i);
  derbyApplyMine(run);
  const me = myLineRatings();
  const oppPicks = derbyRivalPicks(run, rival);
  const opp = derbyLinesFor(oppPicks, formationSlots(run.formationId, 'bal'));
  opp.name = TEAMS[rival].name;
  const seed = (run.seed + (i + 1) * 7919) | 0;
  const g = derbyPlayMatch(me, opp, DERBY_HOME[i], seed);
  g.rival = rival;
  g.events = derbyGoalEvents(g, state.picks, oppPicks, seed ^ 0x9e3779b9);
  run.games.push(g);
  const after = derbySeriesStatus(run.games);
  if (after.over) {
    run.phase = 'done'; derbyFinish(run, after);
    derbyClearDraftSave();   // a finished derby must not reopen on load
  }
  derbySave(run);
  return g;
}

function derbyFinish(run, st) {
  if (run.submitted) return;
  run.submitted = true;
  derbyTrack('finish', run.club + '|' + st.w + '-' + st.l);
  derbySubmit(run, st);
}

// Migration 20261005000002: signed-in only; the server clamps everything and
// returns only badges that are new.
function derbySubmit(run, st) {
  try {
    if (typeof getCurrentUser !== 'function' || !getCurrentUser() || typeof _supabase === 'undefined') return;
    const g = run.games;
    _supabase.rpc('submit_derby_run', { p: {
      club: run.club, difficulty: run.difficulty, wins: st.w, losses: st.l,
      comeback: st.won && g.length >= 4 && !g[0].won && !g[1].won,
      decider: g.length === 5 && g[4].won,
      xi: run.xi,
    } }).then(({ data }) => {
      const fresh = (data && data.achievements) || [];
      if (fresh.length && typeof showAchievementToasts === 'function') showAchievementToasts(fresh);
    }, () => {});
  } catch (e) { /* an award never breaks a series */ }
}

function derbyTrack(event, detail) {
  if (typeof track === 'function') track(event, 'derby', detail);
}
