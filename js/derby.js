// ─── אלופי הדרבי — the run ───────────────────────────────────────────────────
// Spec: docs/superpowers/specs/2026-10-05-derby-champions-design.md
// v2 flow (spec §9): pick club → XI draft (the normal draft screen, one-club pool)
// → 7-man bench draft → the three rivals → three best-of-5 series, each game
// played live in 15-minute segments. The run lives in localStorage and is saved
// after every step, a live match at every segment boundary, so a refresh resumes.

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
    phase: 'draft', xi: null, bench: [], benchDraw: null, rerolls: 0, rivals: null, series: [], live: null, submitted: false };
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
  run.rerolls = state.seasonRerollsLeft || 0;
  run.phase = 'bench';
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
// ── The bench draft: seven more rounds after the XI, any position ───────────
function derbyBenchSeasonsUsed(run) {
  const used = new Set();
  run.xi.concat(run.bench).forEach(k => { if (k) used.add(k.squadId); });
  return used;
}
function derbyBenchNamesUsed(run) {
  return new Set(run.xi.concat(run.bench).filter(Boolean).map(k => k.name));
}
// The season on offer: persisted, so a refresh shows the same one.
function derbyBenchDraw(run) {
  if (run.bench.length >= DERBY_BENCH) return null;
  if (run.benchDraw) { const sq = SQUADS.find(s => s.id === run.benchDraw); if (sq) return sq; }
  const all = derbySeasonsOf(run.club), used = derbyBenchSeasonsUsed(run);
  const fresh = all.filter(sq => !used.has(sq.id));
  const pool = fresh.length ? fresh : all;
  const sq = pool[Math.floor(Math.random() * pool.length)];
  run.benchDraw = sq.id;
  derbySave(run);
  return sq;
}
function derbyBenchCandidates(run, sq) {
  const used = derbyBenchNamesUsed(run);
  return sq.players.filter(p => !used.has(p.name)).sort((a, b) => playerOVR(b) - playerOVR(a));
}
// Returns false (changing nothing) for a man already in the squad, one not in
// the season on offer, or a full bench.
function derbyBenchPick(run, name) {
  if (run.bench.length >= DERBY_BENCH || !run.benchDraw) return false;
  const sq = SQUADS.find(s => s.id === run.benchDraw);
  if (!sq || !sq.players.some(p => p.name === name) || derbyBenchNamesUsed(run).has(name)) return false;
  run.bench.push({ squadId: sq.id, name });
  run.benchDraw = null;
  if (run.bench.length === DERBY_BENCH) {
    const rng = derbyRng(run.seed);
    run.rivals = {};
    for (const id of DERBY_RIVALS[run.club]) {
      const d = derbyAiDraft(id, run.formationId, run.difficulty, rng);
      run.rivalFormationId = run.formationId;      // the rivals keep their shape whatever the player changes later
      run.rivals[id] = { xi: d.picks.map(derbyEntryKey), bench: d.bench.map(derbyEntryKey) };
    }
    run.series = [{ rival: derbySeriesRival(run.club, 0), games: [] }];
    run.phase = 'rivals';
    derbyTrack('progress', run.club + '|bench');
  }
  derbySave(run);
  return true;
}
function derbyBenchReroll(run) {
  if (!(run.rerolls > 0)) return false;
  run.rerolls--; run.benchDraw = null;
  derbySave(run);
  return true;
}
// The rivals screen's "to the first match".
function derbyBeginPlay(run) {
  if (run.phase !== 'rivals') return;
  run.phase = 'play';
  derbySave(run);
}

// ── Sides ───────────────────────────────────────────────────────────────────
function derbyMySide(run) {
  derbyApplyMine(run);
  return { picks: run.xi.map(derbyEntry), bench: run.bench.map(derbyEntry),
           slots: formationSlots(run.formationId, run.tactic), tactic: run.tactic,
           formationId: run.formationId, slotTac: run.tactic };
}
function derbyRivalSide(run, id) {
  const r = run.rivals[id];
  const fid = run.rivalFormationId || run.formationId;
  return { picks: r.xi.map(derbyEntry), bench: r.bench.map(derbyEntry),
           slots: formationSlots(fid, 'bal'), tactic: 'bal', formationId: fid, slotTac: 'bal' };
}

// ── The live match, saved at every segment boundary ─────────────────────────
const _dk = e => e ? { squadId: e.squad.id, name: e.player.name, on: e.on || 0 } : null;
const _de = k => { const e = derbyEntry(k); return e ? (k.on ? Object.assign(e, { on: k.on }) : e) : null; };
function derbyLiveSave(m) {
  const side = s => ({ picks: s.picks.map(_dk), bench: s.bench.map(_dk), off: s.off.map(_dk),
    tactic: s.tactic, formationId: s.formationId || null, slotTac: s.slotTac || null, chances: s.chances.slice(), subs: s.subs, windows: s.windows, lastWin: s.lastWin });
  return { min: m.min, gf: m.gf, ga: m.ga, home: m.home, seed: m.seed,
    events: JSON.parse(JSON.stringify(m.events)), over: m.over, won: m.won,
    pens: m.pens ? { gf: m.pens.gf, ga: m.pens.ga } : null,
    rival: m.rival, me: side(m.me), opp: side(m.opp) };
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
  return { min: L.min, gf: L.gf, ga: L.ga, home: L.home, seed: L.seed,
    events: JSON.parse(JSON.stringify(L.events)), over: L.over, won: L.won,
    pens: L.pens ? { gf: L.pens.gf, ga: L.pens.ga } : null, rival,
    me: side(L.me, derbyMySide(run)), opp: side(L.opp, derbyRivalSide(run, rival)) };
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
  const m = derbyMatchNew(derbyMySide(run), derbyRivalSide(run, rival), DERBY_GAME_HOME[cur.g],
    (run.seed + (cur.s + 1) * 7919 + (cur.g + 1) * 104729) | 0);
  m.rival = rival;
  run.live = derbyLiveSave(m);
  derbySave(run);
  return m;
}
// Play one segment, to minute `to` (default: the next 15-minute boundary; never
// past 45/60/75/90). The player's decisions are already on m.me. Returns its goal events.
function derbyGameStep(run, m, to) {
  if (m.over) return [];
  const cur = derbyCurrent(run);
  const ev = derbyMatchStep(m, false, to);
  if (m.over && cur) {
    const ser = run.series[cur.s];
    ser.games.push({ gf: m.gf, ga: m.ga, home: m.home, won: m.won, pens: m.pens, events: m.events });
    run.live = null;
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
