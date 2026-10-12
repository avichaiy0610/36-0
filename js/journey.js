// מסע ה־11 owns the route; the existing draft owns the pitch and the season.
let _journeyEngine = null;
let _journeyChoicesKey = null;
let _journeyChoices = [];
function journeyEngine() {
  if (!_journeyEngine) _journeyEngine = JourneyEngine.create(SQUADS, playerFitsSlot);
  return _journeyEngine;
}
function journeyContext() {
  const j = state.journey;
  return { currentId: state.currentSquad && state.currentSquad.id,
    remaining: emptySlotIndices().map(i => slotFitPos(state.slots[i])),
    usedNames: [...state.usedPlayerKeys], visited: j ? j.visited : [], breakLeft: j && !j.broken ? 1 : 0 };
}
function journeyOptions() {
  const c = journeyContext();
  const key = JSON.stringify(c);
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
function journeyStart(formationId) {
  const formation = FORMATIONS[formationId] ? formationId : '4-3-3';
  const starts = journeyEngine().starts(formationSlots(formation, 'bal').map(slotFitPos));
  if (!starts.length) return;
  const first = starts[Math.floor(Math.random() * starts.length)];
  Object.assign(state, {
    leagueCode: null, duelCode: null, career: null, gauntlet: null, story: null, derby: null,
    challenge: null, challengeDeck: null, challengeReqs: null, deck: null, mgw: null, mga: null,
    salaryCap: false, coach: null, coachOn: false, januaryOn: false,
    difficulty: 'normal', showRatings: true, draftMode: 'squad-first', peakMode: false,
    eraMin: YEAR_MIN, eraMax: YEAR_MAX, formationId: formation,
    oppSeason: null, oppSeasonChoice: 'latest', leagueFormat: 'modern',
  });
  window._leagueReviewMode = null; window._duelReviewMode = null;
  window._lastResult = null; window._lastSeason = null;
  window._restoredSeason = null; window._presetSeason = null;
  window._preseasonProjected = null; window._preseasonPoints = null;
  _salaryCapPick = false;
  const journey = { v: 1, id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
    phase: 'pick', path: [], visited: [first.id], broken: false,
    arrival: 'start', escapeIds: null };
  beginDraftWithState({ classic: false, tactic: 'bal', journey });
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
  j.escapeIds = null;
  _journeyChoicesKey = null;
  if (j.phase === 'complete' && typeof journeyAwardAchievements === 'function') journeyAwardAchievements(j);
}
function journeyDestinations() {
  const j = state.journey;
  const last = j.path[j.path.length - 1];
  return last ? journeyEngine().destinations(last.name, journeyContext()) : [];
}
function journeyPrepareEscape() {
  const j = state.journey;
  if (!j || j.phase !== 'travel' || j.broken || state.isAnimating || state.currentRound >= 11) return [];
  if (!j.escapeIds) {
    const pool = journeyEngine().escapes(journeyContext());
    const ids = pool.map(s => s.id);
    shuffleArr(ids);
    j.escapeIds = ids.slice(0, 3);
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
  j.arrival = breaking ? 'break' : 'career';
  j.visited.push(id); j.phase = 'pick'; j.escapeIds = null;
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
  if (j.v !== 1 || !['pick', 'travel', 'complete', 'season'].includes(j.phase) ||
    !Array.isArray(j.path) || !Array.isArray(j.visited) ||
    new Set(j.visited).size !== j.visited.length || j.visited.length > 12 ||
    typeof j.broken !== 'boolean' || j.path.length !== picks.filter(Boolean).length ||
    j.path.length !== d.currentRound || j.path.length > 11 ||
    !j.visited.every(id => journeyEngine().squad(id))) return false;
  if (['complete', 'season'].includes(j.phase) !== (j.path.length === 11)) return false;
  if (j.visited.length !== j.path.length + (j.phase === 'pick' ? 1 : 0) ||
    d.currentSquadId !== j.visited[j.visited.length - 1]) return false;
  if (j.escapeIds != null && (!Array.isArray(j.escapeIds) || j.escapeIds.length > 3 ||
    new Set(j.escapeIds).size !== j.escapeIds.length ||
    !j.escapeIds.every(id => journeyEngine().squad(id) && !j.visited.includes(id)))) return false;
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
      !journeyEngine().career(j.path[i - 1].name).some(s => s.id === j.visited[i])) return false;
  }
  return breaks <= 1 && !!breaks === j.broken;
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setup-journey-card')?.addEventListener('click', journeyShowHub);
});
