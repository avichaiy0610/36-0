// ─── אלופי הדרבי — the run ───────────────────────────────────────────────────
// Spec: docs/superpowers/specs/2026-10-05-derby-champions-design.md
// v3 flow (spec §10.1): pick club → XI draft then 7-man bench draft, both in the
// normal draft screen (one-club pool) → the three rivals → three best-of-5 series, each game
// played live minute by minute (stop at any minute). The run lives in localStorage and is saved
// after every step, a live match after every minute, so a refresh resumes.

const DERBY_KEY = '36-0-derby';

function derbyLoad() {
  try { const r = JSON.parse(localStorage.getItem(DERBY_KEY)); return r && r.v === 2 ? r : null; }
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
  const run = { v: 2, club, difficulty, formationId: [_selectedFormationKey, state.formationId, '4-3-3'].find(k => k && FORMATIONS[k]),
    tactic: tacticOf(typeof _selectedTactic !== 'undefined' ? _selectedTactic : state.tactic), seed: (Math.random() * 2147483647) | 0,
    phase: 'draft', xi: null, bench: [], rerolls: 0, rivals: null, series: [], live: null, submitted: false };
  derbySave(run);
  if (typeof derbyLogClear === 'function') derbyLogClear();
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

// Called by game.js when the eleventh pick lands (and on a restored full XI).
// A full XI with a bench still short of seven goes on drafting the bench in the
// same screen; only a full bench hands off to the rivals.
function derbyAfterDraft() {
  const run = derbyLoad();
  // No run, or a run of another club: a stale flag. Never play a season with it on.
  if (!run || !state.derby || run.club !== state.derby.club) {
    state.derby = null;
    if (typeof clearDraftState === 'function') clearDraftState();
    showScreen('welcome');
    return;
  }
  if (run.phase !== 'draft') { derbyShow(); return; }       // re-entry: the squad is already fixed
  if (!Array.isArray(state.derby.bench)) {
    // The bench rounds begin. A v2 run left in its old bench screen brings the
    // men it had already taken (those still valid and not in the XI).
    state.derby.bench = [];
    derbyTrack('progress', run.club + '|bench');
    (run.bench || []).forEach(k => {
      const e = derbyEntry(k);
      if (e && !state.usedPlayerKeys.has(e.player.name) && derbyBenchAdd(state.derby, e)) state.usedPlayerKeys.add(e.player.name);
    });
    saveDraftState();
    if (state.derby.bench.length < DERBY_BENCH) { derbyBenchEnter(true); return; }
  } else if (state.derby.bench.length < DERBY_BENCH) { derbyBenchEnter(false); return; }
  run.xi = state.picks.map(derbyEntryKey);
  run.bench = state.derby.bench.slice(0, DERBY_BENCH);
  run.tactic = state.tactic || 'bal';
  run.rerolls = state.seasonRerollsLeft || 0;
  derbyFinishSquad(run);
  derbySave(run);
  derbyTrack('progress', run.club + '|drafted');
  derbyShow();
}
// A v2 run stored in its old 'bench' phase (the separate bench screen is gone):
// resume through its draft save, or start over at the picker.
function derbyResumeOldBench(run) {
  run.phase = 'draft'; run.benchDraw = null;
  derbySave(run);
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY) || 'null'); } catch (e) {}
  if (d && d.derby && d.derby.club === run.club && typeof restoreDraftState === 'function' && restoreDraftState()) return true;
  derbyClear(); derbyClearDraftSave();
  return false;
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
// ── The bench: seven more rounds IN THE DRAFT SCREEN after the XI (spec §10.1) ──
// state.picks stays the eleven (teamOVR, chemistry and the lines read it); the
// bench lives in state.derby.bench as {squadId, name} keys, so saveDraftState
// carries it through a refresh as it is. game.js asks derbyInBench() at a few
// guarded points (player tap, slot tap, progress line) and leaves the rest here.
function derbyInBench() {
  return !!(state.derby && Array.isArray(state.derby.bench) && state.derby.bench.length < DERBY_BENCH);
}
// The bench rounds have begun, including the moment after the seventh man while
// the hand-off to the rivals is on its way: the pitch must take no taps then either.
function derbyBenchPhase() {
  return !!(state.derby && Array.isArray(state.derby.bench));
}
// Pure: append one man to holder.bench (a run, or state.derby). Refused (false,
// nothing changed) for a full bench, an unknown man, or one already in the XI
// or on the bench.
function derbyBenchAdd(holder, entry) {
  if (!holder || !Array.isArray(holder.bench) || holder.bench.length >= DERBY_BENCH) return false;
  const k = derbyEntryKey(entry);
  if (!k || !derbyEntry(k)) return false;
  const taken = (holder.xi || []).concat(holder.bench).filter(Boolean).map(x => x.name);
  if (taken.includes(k.name)) return false;
  holder.bench.push(k);
  return true;
}
// Pure: the squad is complete — draft the three rivals and open the first series.
function derbyFinishSquad(run) {
  if (!run.xi || run.xi.length !== 11 || run.bench.length !== DERBY_BENCH) return false;
  const rng = derbyRng(run.seed);
  run.rivals = {};
  run.rivalFormationId = run.formationId;      // the rivals keep their shape whatever the player changes later
  for (const id of DERBY_RIVALS[run.club]) {
    const d = derbyAiDraft(id, run.formationId, run.difficulty, rng);
    run.rivals[id] = { xi: d.picks.map(derbyEntryKey), bench: d.bench.map(derbyEntryKey) };
  }
  run.series = [{ rival: derbySeriesRival(run.club, 0), games: [] }];
  derbyEnergyMaps(run);
  run.phase = 'rivals';
  return true;
}
// A tap on a player in the list during the bench rounds (from handlePlayerClick).
function derbyBenchTake(player) {
  if (!derbyInBench() || state.isAnimating || !state.currentSquad) return;
  if (state.usedPlayerKeys.has(player.name) || !state.currentSquad.players.includes(player)) return;
  // The same gate assignPlayer raises: no second man from this list while the
  // next roulette is on its way. animateRoulette clears it.
  state.isAnimating = true;
  if (!derbyBenchAdd(state.derby, { player, squad: state.currentSquad })) { state.isAnimating = false; return; }
  state.usedPlayerKeys.add(player.name);
  saveDraftState();
  derbyBenchRender();
  if (state.derby.bench.length >= DERBY_BENCH) {
    state.isAnimating = false;
    document.getElementById('players-list').innerHTML = '';
    setTimeout(() => derbyAfterDraft(), 500);
  } else {
    setTimeout(startRound, 400);
  }
}
// Into the bench rounds, on the draft screen. `fresh`: draw a new season;
// otherwise (a refresh) show the season that was on offer.
function derbyBenchEnter(fresh) {
  if (state.moveMode) { state.moveMode = false; updateMoveButton(); }
  state.movingFromIdx = null; state.selectedPlayer = null; state.selectedSlotIdx = null;
  state.isAnimating = false; state.awaitingSlotPick = false;
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) moveBtn.style.display = 'none';
  showScreen('draft');
  clearAllHighlights();
  updateProgress(); updateRerollButtons();
  if (fresh || !state.currentSquad) { startRound(); return; }
  showSquadCardData(state.currentSquad);
  renderSquadPlayers(state.currentSquad);
  setHint('בחר שחקן לספסל');
}
// The seven bench slots under the draft pitch: shown for a derby draft only.
function derbyBenchRender() {
  const el = document.getElementById('derby-bench-slots');
  if (!el) return;
  if (!state.derby) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const bench = (state.derby.bench || []).map(derbyEntry);
  const esc = typeof derbyEsc === 'function' ? derbyEsc : s => String(s ?? '');
  const slot = i => {
    const e = bench[i];
    if (!e) return `<div class="dbs-slot dbs-empty${i === bench.length && Array.isArray(state.derby.bench) ? ' dbs-next' : ''}"><span class="dbs-n">${i + 1}</span></div>`;
    const pos = normalizePos(e.player.position);
    return `<div class="dbs-slot"><span class="dbs-ov">${playerOVR(e.player)}</span>
      <span class="dbs-nm">${esc(typeof playerShortName === 'function' ? playerShortName(e.player.name) : e.player.name)}</span>
      <span class="dbs-meta">${esc(POS_HE[pos] || pos)} · ${esc(e.squad.season)}</span></div>`;
  };
  const gaps = bench.length && typeof derbyUncoveredGroups === 'function' && state.picks.every(Boolean)
    ? derbyUncoveredGroups(state.slots, bench) : [];
  el.innerHTML = `<div class="dbs-head">ספסל <span>${bench.length}/${DERBY_BENCH}</span></div>
    <div class="dbs-grid">${Array.from({ length: DERBY_BENCH }, (_, i) => slot(i)).join('')}</div>
    ${gaps.length && bench.length < DERBY_BENCH ? `<div class="dbs-gap">אין עדיין מחליף ל: ${gaps.map(esc).join(' · ')}</div>` : ''}`;
  el.style.display = '';
}
// The rivals screen's "to the first match".
function derbyBeginPlay(run) {
  if (run.phase !== 'rivals') return;
  run.phase = 'play';
  derbySave(run);
}

// ── Energy (spec §11.1) ─────────────────────────────────────────────────────
// run.energy: { name: 0–100 } for the player's 18; run.rivalEnergy: { rivalId:
// { name: 0–100 } } for each rival's. Everyone starts at 100; a run saved before
// energy existed gets its maps here, full.
function derbyEnergyMaps(run) {
  const fill = (map, keys) => { (keys || []).forEach(k => { if (k && map[k.name] == null) map[k.name] = 100; }); return map; };
  run.energy = fill(run.energy || {}, (run.xi || []).concat(run.bench || []));
  run.rivalEnergy = run.rivalEnergy || {};
  for (const id of Object.keys(run.rivals || {})) {
    const r = run.rivals[id];
    run.rivalEnergy[id] = fill(run.rivalEnergy[id] || {}, r.xi.concat(r.bench));
  }
  return run;
}
const _withE = map => e => (e ? Object.assign(e, { e0: (map && map[e.player.name]) ?? 100 }) : e);

// ── Sides ───────────────────────────────────────────────────────────────────
function derbyMySide(run) {
  derbyApplyMine(run);
  const en = _withE(run.energy);
  return { picks: run.xi.map(derbyEntry).map(en), bench: run.bench.map(derbyEntry).map(en),
           slots: formationSlots(run.formationId, run.tactic), tactic: run.tactic,
           formationId: run.formationId, slotTac: run.tactic };
}
function derbyRivalSide(run, id) {
  const r = run.rivals[id];
  const fid = run.rivalFormationId || run.formationId;
  const en = _withE(run.rivalEnergy && run.rivalEnergy[id]);
  return { picks: r.xi.map(derbyEntry).map(en), bench: r.bench.map(derbyEntry).map(en),
           slots: formationSlots(fid, 'bal'), tactic: 'bal', formationId: fid, slotTac: 'bal' };
}

// ── The live match, saved at every segment boundary ─────────────────────────
// Each man with his energy: e0 (kick-off or coming on), on, and offAt if he went off.
const _SUBK = ['inName', 'benchIdx', 'prevWindows', 'prevLastWin'];   // a sub's own record, on the man who went off
const _dk = e => {
  if (!e) return null;
  const k = { squadId: e.squad.id, name: e.player.name, on: e.on || 0, e0: e.e0 ?? 100 };
  if (e.offAt != null) k.offAt = e.offAt;
  _SUBK.forEach(x => { if (e[x] != null) k[x] = e[x]; });
  return k;
};
const _de = k => {
  const e = derbyEntry(k);
  if (!e) return null;
  if (k.on) e.on = k.on;
  e.e0 = k.e0 ?? 100;
  if (k.offAt != null) e.offAt = k.offAt;
  _SUBK.forEach(x => { if (k[x] != null) e[x] = k[x]; });
  return e;
};
function derbyLiveSave(m) {
  const side = s => ({ picks: s.picks.map(_dk), bench: s.bench.map(_dk), off: s.off.map(_dk),
    tactic: s.tactic, formationId: s.formationId || null, slotTac: s.slotTac || null, chances: s.chances.slice(), subs: s.subs, windows: s.windows, lastWin: s.lastWin });
  const snap = m.snap ? { min: m.snap.min, picks: m.snap.picks.map(_dk), bench: m.snap.bench.map(_dk), off: m.snap.off.map(_dk),
    tactic: m.snap.tactic, formationId: m.snap.formationId || null, slotTac: m.snap.slotTac || null,
    subs: m.snap.subs, windows: m.snap.windows, lastWin: m.snap.lastWin } : null;
  return { min: m.min, gf: m.gf, ga: m.ga, home: m.home, seed: m.seed,
    events: JSON.parse(JSON.stringify(m.events)), over: m.over, won: m.won,
    pens: m.pens ? { gf: m.pens.gf, ga: m.pens.ga } : null,
    rival: m.rival, me: side(m.me), opp: side(m.opp), snap };
}
// The inverse; slots are rebuilt from the run (the two side builders).
function derbyLiveLoad(run) {
  const L = run.live, cur = derbyCurrent(run);
  const rival = L.rival || (cur && run.series[cur.s].rival);
  const side = (saved, base) => Object.assign(base, {
    picks: saved.picks.map(_de), bench: saved.bench.map(_de).filter(Boolean), off: saved.off.map(_de).filter(Boolean),
    tactic: saved.tactic, chances: saved.chances.slice(), subs: saved.subs, windows: saved.windows, lastWin: saved.lastWin },
    saved.formationId && FORMATIONS[saved.formationId]
      ? { formationId: saved.formationId, slotTac: saved.slotTac || 'bal', slots: formationSlots(saved.formationId, saved.slotTac || 'bal') } : {});
  const me = side(L.me, derbyMySide(run));
  const S = L.snap;
  const snap = S ? { min: S.min, picks: S.picks.map(_de), bench: S.bench.map(_de).filter(Boolean), off: S.off.map(_de).filter(Boolean),
    tactic: S.tactic, formationId: S.formationId, slotTac: S.slotTac, subs: S.subs, windows: S.windows, lastWin: S.lastWin,
    slots: S.formationId && FORMATIONS[S.formationId] ? formationSlots(S.formationId, S.slotTac || 'bal') : me.slots } : null;
  return { min: L.min, gf: L.gf, ga: L.ga, home: L.home, seed: L.seed,
    events: JSON.parse(JSON.stringify(L.events)), over: L.over, won: L.won,
    pens: L.pens ? { gf: L.pens.gf, ga: L.pens.ga } : null, rival,
    me, opp: side(L.opp, derbyRivalSide(run, rival)), snap };
}

// ── Flow ────────────────────────────────────────────────────────────────────
// The first series not over and the next game number in it; null when all three are.
function derbyCurrent(run) {
  for (let s = 0; s < run.series.length; s++) {
    if (!derbySeriesStatus(run.series[s].games).over) return { s, g: run.series[s].games.length };
  }
  return null;
}
// The match to play now: the saved live one, or a fresh one from FRESH sides
// (never a side left over from an earlier match — it would carry its chances).
function derbyGameStart(run) {
  if (run.live) return derbyLiveLoad(run);
  const cur = derbyCurrent(run);
  if (!cur) return null;
  const rival = run.series[cur.s].rival;
  derbyEnergyMaps(run);
  const m = derbyMatchNew(derbyMySide(run), derbyRivalSide(run, rival), DERBY_GAME_HOME[cur.g],
    (run.seed + (cur.s + 1) * 7919 + (cur.g + 1) * 104729) | 0);
  m.rival = rival;
  derbyRotate(m.opp);              // the computer rests its tired men (spec §11.1)
  m.snap = null;
  run.live = derbyLiveSave(m);
  derbySave(run);
  return m;
}
// Play one segment, to minute `to` (default: the next 15-minute boundary; never
// past 45/60/75/90). The player's decisions are already on m.me. Returns its goal events.
function derbyGameStep(run, m, to) {
  if (m.over) return [];
  const cur = derbyCurrent(run);
  m.snap = null;                   // playing on commits the stop: nothing left to undo
  const ev = derbyMatchStep(m, false, to);
  if (m.over && cur) {
    const ser = run.series[cur.s];
    ser.games.push({ gf: m.gf, ga: m.ga, home: m.home, won: m.won, pens: m.pens, events: m.events });
    run.live = null;
    // Energy carried to the next game: +30 within a series, +60 into the next one.
    derbyEnergyMaps(run);
    const rec = derbySeriesStatus(ser.games).over ? DERBY_RECOVER_SERIES : DERBY_RECOVER_GAME;
    derbyEnergyAfter(m.me, run.energy, rec);
    if (run.rivalEnergy[m.rival]) derbyEnergyAfter(m.opp, run.rivalEnergy[m.rival], rec);
    if (derbySeriesStatus(ser.games).over && cur.s < 2) {
      run.series.push({ rival: derbySeriesRival(run.club, cur.s + 1), games: [] });
    }
    if (!derbyCurrent(run)) {
      run.phase = 'done';
      derbyFinish(run);
      derbyClearDraftSave();
    }
  } else {
    run.live = derbyLiveSave(m);
  }
  derbySave(run);
  return ev;
}
// The player's in-match decisions; refused once the match is over.
function derbySetTactic(run, m, tactic) {
  if (m.over || !TACTIC_KEYS.includes(tactic)) return false;
  m.me.tactic = tactic;
  run.live = derbyLiveSave(m); derbySave(run);
  return true;
}
function derbyMakeSub(run, m, slotIdx, benchIdx) {
  if (m.over || !derbySub(m.me, slotIdx, benchIdx, m.min)) return false;
  run.live = derbyLiveSave(m); derbySave(run);
  return true;
}

// Undo ONE substitution of this stop, or swap its replacement for another
// bench man (one substitution still). The match log loses that sub's line; the
// screen writes the new one for a re-sub.
function derbyDropSubLog(m, o) {
  if (typeof derbyLogLoad !== 'function' || !o) return;
  const rows = derbyLogLoad(m.seed).filter(r => !(r && r.cls === 'mine' && r.min === o.offAt && r.out === o.player.name));
  try { localStorage.setItem(DERBY_LOG_KEY, JSON.stringify({ seed: m.seed, rows })); } catch (e) {}
}
function derbyUndoSubMine(run, m, offIdx) {
  const o = m.me.off[offIdx];
  if (m.over || !derbyUndoSub(m.me, offIdx, m.min)) return false;
  derbyDropSubLog(m, o);
  run.live = derbyLiveSave(m); derbySave(run);
  return true;
}
function derbyResubMine(run, m, offIdx, benchIdx) {
  const o = m.me.off[offIdx];
  if (m.over || !derbyResub(m.me, offIdx, benchIdx, m.min)) return false;
  derbyDropSubLog(m, o);
  run.live = derbyLiveSave(m); derbySave(run);
  return true;
}

// Undo at a stop (spec §11.2). A stop — or the pre-kick screen — begins with a
// snapshot of the player's side; "↺ בטל שינויים" puts it back until play goes
// on (derbyGameStep drops it). A refresh at the same stop keeps the snapshot.
function derbyMarkStop(run, m) {
  if (m.over) return false;
  if (m.snap && m.snap.min === m.min) return false;
  m.snap = derbySnapshot(m.me, m.min);
  run.live = derbyLiveSave(m); derbySave(run);
  return true;
}
function derbyCanUndo(m) {
  return !!(m && !m.over && m.snap && m.snap.min === m.min && derbySnapChanged(m.me, m.snap));
}
function derbyUndoMine(run, m) {
  if (!derbyCanUndo(m) || !derbyRestore(m.me, m.snap)) return false;
  derbyRememberMine(run, m);       // at 0': the run's default line-up and shape go back too
  run.live = derbyLiveSave(m); derbySave(run);
  return true;
}

// Formation and line-up changes (spec §10.2). Before the whistle they also
// become the run's default for the next game.
function derbyRememberMine(run, m) {
  if (m.min !== 0) return;
  if (m.me.formationId && FORMATIONS[m.me.formationId]) run.formationId = m.me.formationId;
  run.xi = m.me.picks.map(derbyEntryKey);
  run.bench = m.me.bench.map(derbyEntryKey);
}
function derbyMineChanged(run, m) {
  derbyRememberMine(run, m);
  run.live = derbyLiveSave(m); derbySave(run);
  return true;
}
function derbySetFormationMine(run, m, f) {
  if (m.over || !derbySetFormation(m.me, f, m.min)) return false;
  return derbyMineChanged(run, m);
}
function derbySwapMine(run, m, i, j) {
  if (m.over || m.min >= 90 || !derbySwap(m.me, i, j)) return false;
  return derbyMineChanged(run, m);
}
function derbyPreSwapMine(run, m, slotIdx, benchIdx) {
  if (m.over || !derbyPreSwap(m.me, slotIdx, benchIdx, m.min)) return false;
  return derbyMineChanged(run, m);
}

function derbyFinish(run) {
  if (run.submitted) return;
  run.submitted = true;
  derbyTrack('finish', run.club + '|' + derbyRunSummary(run.series).seriesWon);
  derbySubmit(run);
}

// Migration 20261005000002: signed-in only; the server clamps everything and
// returns only badges that are new.
function derbySubmit(run) {
  try {
    if (typeof getCurrentUser !== 'function' || !getCurrentUser() || typeof _supabase === 'undefined') return;
    const sr = run.series;
    _supabase.rpc('submit_derby_run', { p: {
      club: run.club, difficulty: run.difficulty,
      series: sr.map(s => { const st = derbySeriesStatus(s.games); return { rival: s.rival, w: st.w, l: st.l }; }),
      decider: !!(sr[2] && sr[2].games.length === 5 && sr[2].games[4].won),
      comeback: sr.some(s => { const g = s.games; return derbySeriesStatus(g).won && g.length >= 4 && !g[0].won && !g[1].won; }),
      super_sub: sr.some(s => s.games.some(g => g.won && g.events.some(e => e.mine && e.sub))),
      xi: run.xi, bench: run.bench,
    } }).then(({ data }) => {
      const fresh = (data && data.achievements) || [];
      if (fresh.length && typeof showAchievementToasts === 'function') showAchievementToasts(fresh);
    }, () => {});
  } catch (e) { /* an award never breaks a run */ }
}

function derbyTrack(event, detail) {
  if (typeof track === 'function') track(event, 'derby', detail);
}
