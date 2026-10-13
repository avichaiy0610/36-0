// מסע ה־11 owns the route; the existing draft owns the pitch and the season.
// A greedy route that may pick from every destination and revisit clubs averages
// ~88 OVR against ~83 for a greedy ordinary draft. One squad per club and a draw of
// three doors bring it back to ~83.6 with every rating visible (scratch calibration,
// 25 runs a variant, 2026-10-13). קשה also hides the numbers.
const JOURNEY_LEVELS = {
  easy:   { clubLimit: 2, doors: 0, ratings: true,  label: 'קל' },
  normal: { clubLimit: 1, doors: 3, ratings: true,  label: 'רגיל' },
  hard:   { clubLimit: 1, doors: 3, ratings: false, label: 'קשה' },
};
const _journeyEngines = {};
let _journeyChoicesKey = null;
let _journeyChoices = [];
// A save made before levels existed was an unlimited route: it is read as קל.
function journeyLevelKey(j) {
  const level = (j || state.journey || {}).level;
  return JOURNEY_LEVELS[level] ? level : 'easy';
}
function journeyLevel(j) { return JOURNEY_LEVELS[journeyLevelKey(j)]; }
function journeyEngine(j) {
  const limit = journeyLevel(j).clubLimit;
  if (!_journeyEngines[limit]) _journeyEngines[limit] = JourneyEngine.create(SQUADS, playerFitsSlot, { clubLimit: limit });
  return _journeyEngines[limit];
}
function journeyShuffled(list) { const copy = list.slice(); shuffleArr(copy); return copy; }
function journeyContext() {
  const j = state.journey;
  return { currentId: state.currentSquad && state.currentSquad.id,
    remaining: emptySlotIndices().map(i => slotFitPos(state.slots[i])),
    usedNames: [...state.usedPlayerKeys], visited: j ? j.visited : [], breakLeft: j && !j.broken ? 1 : 0 };
}
function journeyOptions() {
  const c = journeyContext();
  const key = journeyLevelKey() + JSON.stringify(c);
  if (key !== _journeyChoicesKey) {
    _journeyChoices = journeyEngine().choices(c);
    _journeyChoicesKey = key;
  }
  return _journeyChoices;
}
function journeyAllowedSlots(player) {
  const option = journeyOptions().find(p => p.name === player.name);
  const empty = emptySlotIndices();
  return option ? option.slots.map(i => empty[i]) : [];
}
function journeyCanAssign(idx, player) {
  return !!(state.journey && state.journey.phase === 'pick' && !state.isAnimating &&
    state.currentSquad && state.currentSquad.players.includes(player) &&
    !state.usedPlayerKeys.has(player.name) && journeyAllowedSlots(player).includes(idx));
}
function journeyStart(formationId, levelKey) {
  const formation = FORMATIONS[formationId] ? formationId : '4-3-3';
  const level = JOURNEY_LEVELS[levelKey] ? levelKey : 'normal';
  // The first proven squad of a shuffled pool — proving all 366 took 1–1.6s on a desktop.
  const first = journeyEngine({ level }).starts(formationSlots(formation, 'bal').map(slotFitPos), journeyShuffled, 1)[0];
  if (!first) return;
  Object.assign(state, {
    leagueCode: null, duelCode: null, career: null, gauntlet: null, story: null, derby: null,
    challenge: null, challengeDeck: null, challengeReqs: null, deck: null, mgw: null, mga: null,
    salaryCap: false, coach: null, coachOn: false, januaryOn: false,
    difficulty: 'normal', showRatings: JOURNEY_LEVELS[level].ratings, draftMode: 'squad-first', peakMode: false,
    eraMin: YEAR_MIN, eraMax: YEAR_MAX, formationId: formation,
    oppSeason: null, oppSeasonChoice: 'latest', leagueFormat: 'modern',
  });
  window._leagueReviewMode = null; window._duelReviewMode = null;
  window._lastResult = null; window._lastSeason = null;
  window._restoredSeason = null; window._presetSeason = null;
  window._preseasonProjected = null; window._preseasonPoints = null;
  _salaryCapPick = false;
  const journey = { v: 1, id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
    level, phase: 'pick', path: [], visited: [first.id], broken: false,
    arrival: 'start', escapeIds: null, destIds: null };
  beginDraftWithState({ classic: false, tactic: 'bal', journey });
  if (typeof track === 'function') track('progress', 'journey', 'start-' + level);
}
function journeyStartRound() {
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  state.isAnimating = false; state.awaitingSlotPick = false;
  state.teamRerollsLeft = 0; state.seasonRerollsLeft = 0;
  updateRerollButtons();
  const j = state.journey;
  if (j.phase === 'travel') { journeyShowTravel(); return; }
  if (j.phase === 'complete') { journeyShowComplete(); return; }
  const id = j.visited[j.visited.length - 1];
  state.currentSquad = journeyEngine().squad(id);
  if (!state.currentSquad) { journeyPause(); return; }
  state.usedSquadIds.add(id);
  clearAllHighlights();
  updateProgress();
  showScreen('draft');
  showSquadCardData(state.currentSquad);
  renderSquadPlayers(state.currentSquad);
  journeyRenderDraft();
  setHint('בחר שחקן — הוא יקבע גם את התחנה הבאה שלך');
  saveDraftState();
}
function journeyRecordPick(idx, player) {
  const j = state.journey;
  j.path.push({ squadId: state.currentSquad.id, name: player.name,
    slotId: state.slots[idx].id, arrival: j.arrival });
  j.phase = state.currentRound === state.slots.length ? 'complete' : 'travel';
  j.escapeIds = null; j.destIds = null;
  _journeyChoicesKey = null;
  if (j.phase === 'complete') {
    if (typeof track === 'function') track('finish', 'journey', journeyLevelKey(j) + (j.broken ? '-break' : ''));
    if (typeof journeyAwardAchievements === 'function') journeyAwardAchievements(j);
  }
}
// With doors, the draw is saved before it is shown, as the break's is: a refresh
// must not deal three new destinations.
function journeyDestinations() {
  const j = state.journey;
  const last = j.path[j.path.length - 1];
  if (!last) return [];
  const doors = journeyLevel(j).doors;
  if (!doors) return journeyEngine().destinations(last.name, journeyContext());
  if (!j.destIds) {
    j.destIds = journeyEngine().destinations(last.name, journeyContext(), journeyShuffled, doors).map(s => s.id);
    saveDraftState();
  }
  return j.destIds.map(id => journeyEngine().squad(id)).filter(Boolean);
}
function journeyPrepareEscape() {
  const j = state.journey;
  if (!j || j.phase !== 'travel' || j.broken || state.isAnimating || state.currentRound >= 11) return [];
  if (!j.escapeIds) {
    j.escapeIds = journeyEngine().escapes(journeyContext(), journeyShuffled, 3).map(s => s.id);
    saveDraftState();
  }
  return j.escapeIds.map(id => journeyEngine().squad(id)).filter(Boolean);
}
function journeyEnter(id, breaking) {
  const j = state.journey;
  if (!j || state.isAnimating || j.phase === 'complete') return false;
  if (j.phase !== 'travel') return false;
  const pool = breaking ? journeyPrepareEscape() : journeyDestinations();
  const next = pool.find(s => s.id === id);
  if (!next || j.visited.includes(id)) return false;
  if (breaking) j.broken = true;
  if (breaking && typeof track === 'function') track('progress', 'journey', 'break-' + j.path.length);
  j.arrival = breaking ? 'break' : 'career';
  j.visited.push(id); j.phase = 'pick'; j.escapeIds = null; j.destIds = null;
  state.currentSquad = next;
  _journeyChoicesKey = null;
  saveDraftState();
  journeyStartRound();
  return true;
}
function journeyAfterDraft() { journeyShowComplete(); }
function journeyPlaySeason() {
  if (!state.journey || state.journey.path.length !== 11 || state.picks.some(p => !p)) return;
  state.journey.phase = 'season';
  saveDraftState();
  showPreseason(teamOVR());
}
function journeyPause() {
  if (state.journey && state.journey.phase !== 'season') saveDraftState();
  state.journey = null;
  journeySyncSurfaces();
  showScreen('welcome');
}
function journeyRestart() {
  if (!confirm('להתחיל מסע חדש? המסע הנוכחי יוחלף.')) return;
  clearDraftState(); state.journey = null;
  journeyShowHub();
}
function journeyValidSave(d, picks) {
  const j = d.journey;
  if (!j) return true;
  if (j.level != null && !JOURNEY_LEVELS[j.level]) return false;
  const engine = journeyEngine(j), level = journeyLevel(j);
  if (j.v !== 1 || !['pick', 'travel', 'complete', 'season'].includes(j.phase) ||
    !Array.isArray(j.path) || !Array.isArray(j.visited) ||
    new Set(j.visited).size !== j.visited.length || j.visited.length > 12 ||
    typeof j.broken !== 'boolean' || j.path.length !== picks.filter(Boolean).length ||
    j.path.length !== d.currentRound || j.path.length > 11 ||
    !j.visited.every(id => engine.squad(id))) return false;
  if (['complete', 'season'].includes(j.phase) !== (j.path.length === 11)) return false;
  if (j.visited.length !== j.path.length + (j.phase === 'pick' ? 1 : 0) ||
    d.currentSquadId !== j.visited[j.visited.length - 1]) return false;
  if (j.escapeIds != null && (!Array.isArray(j.escapeIds) || j.escapeIds.length > 3 ||
    new Set(j.escapeIds).size !== j.escapeIds.length ||
    !j.escapeIds.every(id => engine.squad(id) && !j.visited.includes(id)))) return false;
  if (j.destIds != null && (!Array.isArray(j.destIds) || j.phase !== 'travel' || !level.doors ||
    j.destIds.length > level.doors || new Set(j.destIds).size !== j.destIds.length || !j.path.length ||
    !j.destIds.every(id => !j.visited.includes(id) &&
      engine.career(j.path[j.path.length - 1].name).some(s => s.id === id)))) return false;
  if (level.clubLimit) {
    const perClub = {};
    for (const id of j.visited) {
      const club = engine.squad(id).teamId;
      perClub[club] = (perClub[club] || 0) + 1;
      if (perClub[club] > level.clubLimit) return false;
    }
  }
  const slots = formationSlots(d.formationId, tacticOf(d.tactic));
  if (!j.visited.length || j.path.some((step, i) =>
    !step || step.squadId !== j.visited[i] ||
    !picks.some((p, idx) => p && p.player.name === step.name && p.squad.id === step.squadId && slots[idx].id === step.slotId))) return false;
  const names = j.path.map(p => p.name);
  if (new Set(names).size !== names.length) return false;
  let breaks = 0;
  for (let i = 1; i < j.visited.length; i++) {
    const arrival = j.path[i] ? j.path[i].arrival : j.arrival;
    if (arrival === 'break') { breaks++; continue; }
    if (arrival !== 'career' || !j.path[i - 1] ||
      !engine.career(j.path[i - 1].name).some(s => s.id === j.visited[i])) return false;
  }
  return breaks <= 1 && !!breaks === j.broken;
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setup-journey-card')?.addEventListener('click', journeyShowHub);
});
