// ─── Real-time 1v1 duels ───────────────────────────────────────────────────────
// Two players share a room; when both are ready each plays the FULL normal draft
// (own setup: formation, difficulty, mode) and submits their squad. When both
// squads are in, each player sees the normal results page for their own team,
// plus a separate duel summary comparing the two teams. A quick-match falls back
// to a client-side bot if nobody joins in 10s.

function dEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let _duelCode = null;
let _duelChan = null;
let _pendingDuelCode = null;
let _duelPhase = 'lobby';      // lobby | drafting | waiting | done
let _duelBot = false;
let _duelRoomSeed = 0;
let _quickBotTimer = null;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

async function showDuel() {
  showScreen('duel');
  document.getElementById('duel-back').onclick = () => { closeDuelRealtime(); showScreen('welcome'); };
  renderDuelHome();
}

function renderDuelHome() {
  closeDuelRealtime();
  _duelPhase = 'lobby'; _duelBot = false;
  const box = document.getElementById('duel-content');
  const user = getCurrentUser();
  if (!user) {
    box.innerHTML = `
      <p class="page-note">התחבר כדי לשחק דואל 1 על 1 מול חבר.</p>
      <button class="btn-primary" id="duel-login">התחבר</button>`;
    document.getElementById('duel-login').onclick = () =>
      document.getElementById('auth-modal').style.display = 'flex';
    return;
  }
  box.innerHTML = `
    <div class="lg-card duel-quick-card">
      <div class="lg-card-title">⚡ משחק מהיר</div>
      <p class="page-note" style="margin:4px 0 10px">מצא יריב אקראי — ואם אף אחד לא מצטרף תוך 10 שניות, שחק מול בוט 🤖.</p>
      <button class="btn-primary lg-btn" id="duel-quick" style="width:100%">חפש יריב</button>
    </div>
    <div class="lg-card">
      <div class="lg-card-title">🎮 צור חדר חדש</div>
      <p class="page-note" style="margin:4px 0 10px">חדר פרטי — שלח את הקוד לחבר והתחילו דואל.</p>
      <button class="btn-primary lg-btn" id="duel-create" style="width:100%">צור חדר</button>
    </div>
    <div class="lg-card">
      <div class="lg-card-title">🔑 הצטרף לחדר</div>
      <div class="lg-row">
        <input id="duel-join-code" class="lg-input lg-code-input" maxlength="4" placeholder="קוד חדר" dir="ltr" value="${dEsc(_pendingDuelCode || '')}">
        <button class="btn-primary lg-btn" id="duel-join">הצטרף</button>
      </div>
    </div>
    <div id="duel-msg" class="lg-msg"></div>`;
  document.getElementById('duel-quick').onclick = quickMatchFlow;
  document.getElementById('duel-create').onclick = createDuelFlow;
  document.getElementById('duel-join').onclick = joinDuelFlow;
  if (_pendingDuelCode) { duelMsg('נמצא קוד הזמנה — לחצו "הצטרף"', true); _pendingDuelCode = null; }
}

function duelMsg(text, ok) {
  const el = document.getElementById('duel-msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'lg-msg ' + (ok ? 'ok' : 'err');
}

async function createDuelFlow() {
  const { data, error } = await _supabase.rpc('create_duel_room', { p_settings: {} });
  if (error) { duelMsg('יצירת החדר נכשלה: ' + error.message, false); return; }
  openDuelRoom(data);
}

async function joinDuelFlow() {
  const code = document.getElementById('duel-join-code').value.trim().toUpperCase();
  if (code.length < 4) { duelMsg('הכנס קוד חדר תקין (4 תווים)', false); return; }
  const { error } = await _supabase.rpc('join_duel_room', { p_code: code });
  if (error) {
    const m = error.message.includes('full') ? 'החדר מלא' :
              error.message.includes('not found') ? 'לא נמצא חדר עם הקוד הזה' : 'ההצטרפות נכשלה';
    duelMsg(m, false); return;
  }
  openDuelRoom(code);
}

// Open a room: subscribe to its live row and render the lobby.
async function openDuelRoom(code) {
  closeDuelRealtime();
  _duelCode = code; _duelPhase = 'lobby'; _duelBot = false;
  _duelChan = _supabase
    .channel('duel:' + code)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'duel_rooms', filter: 'code=eq.' + code },
        payload => {
          if (payload.eventType === 'DELETE') { onDuelEnded(); return; }
          refreshDuelRoom();
        })
    .subscribe();
  await refreshDuelRoom();
}

async function refreshDuelRoom() {
  if (!_duelCode) return;
  const { data, error } = await _supabase.rpc('get_duel_room', { p_code: _duelCode });
  if (error || !data?.length) { onDuelEnded(); return; }
  const room = data[0];
  if (room.guest_name && _quickBotTimer) { clearTimeout(_quickBotTimer); _quickBotTimer = null; }

  if (_duelPhase === 'lobby') {
    if (room.status === 'ready') { beginDuelDrafting(room); return; }
    renderDuelLobby(room);
  } else if (_duelPhase === 'drafting' || _duelPhase === 'waiting') {
    // opponent still drafting → don't disturb my own draft; reveal only once both are in
    if (room.status === 'done') startDuelReveal(room);
  }
}

function renderDuelLobby(room) {
  const box = document.getElementById('duel-content');
  const bothHere = !!room.host_name && !!room.guest_name;
  const myReady = room.is_host ? room.host_ready : room.guest_ready;

  const slot = (name, ready, crown) => `
    <div class="duel-slot ${name ? 'filled' : 'empty'} ${ready ? 'ready' : ''}">
      <div class="duel-slot-name">${crown} ${name ? dEsc(name) : 'ממתין ליריב…'}</div>
      <div class="duel-slot-status">${name ? (ready ? '✓ מוכן' : '⏳ מתכונן') : ''}</div>
    </div>`;

  box.innerHTML = `
    <button class="back-btn lg-inner-back" id="duel-room-back">→ חדרים</button>
    <div class="lg-share">
      <span class="lg-share-lbl">קוד החדר:</span>
      <span class="lg-share-code" dir="ltr">${dEsc(room.code)}</span>
      <button class="lg-copy" id="duel-copy">העתק הזמנה</button>
    </div>
    <div class="duel-slots">
      ${slot(room.host_name, room.host_ready, '👑')}
      <div class="duel-vs">VS</div>
      ${slot(room.guest_name, room.guest_ready, '🎽')}
    </div>
    <button class="btn-primary duel-ready-btn ${myReady ? 'on' : ''}" id="duel-ready" ${bothHere ? '' : 'disabled'}>
      ${myReady ? '↩ בטל מוכנות' : (bothHere ? 'אני מוכן ✓' : 'ממתין ליריב…')}
    </button>
    ${bothHere ? '<div class="duel-hint">כששניכם מוכנים — כל אחד עושה דראפט רגיל, ובסוף משווים 🔥</div>' : ''}
    <div id="duel-msg" class="lg-msg"></div>
    <button class="lg-leave" id="duel-leave">עזוב חדר</button>`;

  document.getElementById('duel-room-back').onclick = () => leaveDuelFlow();
  document.getElementById('duel-leave').onclick = () => leaveDuelFlow();
  document.getElementById('duel-copy').onclick = async () => {
    const link = location.origin + '/?duel=' + room.code;
    try { await navigator.clipboard.writeText(link); document.getElementById('duel-copy').textContent = '✓ הועתק'; }
    catch (e) { document.getElementById('duel-copy').textContent = room.code; }
  };
  const readyBtn = document.getElementById('duel-ready');
  if (readyBtn) readyBtn.onclick = async () => {
    readyBtn.disabled = true;
    const { error } = await _supabase.rpc('set_duel_ready', { p_code: room.code, p_ready: !myReady });
    if (error) { duelMsg('שגיאה בסימון מוכנות: ' + error.message, false); readyBtn.disabled = false; }
  };
}

async function leaveDuelFlow() {
  const code = _duelCode;
  closeDuelRealtime();
  if (code) await _supabase.rpc('leave_duel_room', { p_code: code });
  renderDuelHome();
}

function onDuelEnded() {
  // If we're mid-draft, don't yank the player out; only matters in the lobby.
  if (_duelPhase !== 'lobby') return;
  closeDuelRealtime();
  if (document.getElementById('screen-duel')) {
    renderDuelHome();
    duelMsg('החדר נסגר (היריב עזב).', false);
  }
}

function closeDuelRealtime() {
  if (_duelChan) { _supabase.removeChannel(_duelChan); _duelChan = null; }
  if (_quickBotTimer) { clearTimeout(_quickBotTimer); _quickBotTimer = null; }
  _duelCode = null;
}

// ─── Both ready → each plays the normal draft ──────────────────────────────────
function beginDuelDrafting(room) {
  _duelPhase = 'drafting';
  _duelBot = false;
  _duelRoomSeed = Number(room.seed) || lgSimSeed(room.code || 'duel');
  startDuelDraft(room.code);      // → normal setup screen (formation/difficulty/mode)
}

// Launch the standard single-player draft, flagged as a duel.
function startDuelDraft(code) {
  startGame();                     // normal, unlocked setup + formation picker
  state.duelCode = code;
}

function duelPosFits(p, slotPos) {
  const allowed = COMPAT[slotPos] || [];
  if (allowed.includes(p.position)) return true;
  return Array.isArray(p.altPos) && p.altPos.some(x => allowed.includes(x));
}

function buildDuelSquadPayload() {
  return {
    formation: FORMATIONS[state.formationId]?.label ?? state.formationId,
    ovr: teamOVR(),
    settings: { difficulty: state.difficulty, peak_mode: state.peakMode, ratings_visible: state.showRatings },
    players: state.picks.flatMap((pick, i) => pick ? [{
      teamId: pick.squad.teamId, season: pick.squad.season, name: pick.player.name,
      pos: state.slots[i].pos, ovr: playerOVR(pick.player), slotId: state.slots[i].id,
    }] : []),
  };
}

// A random bot squad for the quick-match fallback (fills the player's formation).
function makeBotSquad(formationLabel) {
  const fKey = Object.keys(FORMATIONS).find(k => FORMATIONS[k].label === formationLabel) || '4-3-3';
  const slots = FORMATIONS[fKey].slots;
  const used = new Set();
  const players = slots.map(slot => {
    for (let t = 0; t < 60; t++) {
      const sq = SQUADS[Math.floor(Math.random() * SQUADS.length)];
      const cands = sq.players.filter(p => !used.has(p.name) && duelPosFits(p, slot.pos));
      if (cands.length) {
        const p = cands[Math.floor(Math.random() * cands.length)];
        used.add(p.name);
        return { teamId: sq.teamId, season: sq.season, name: p.name, pos: slot.pos, ovr: p.ovr, slotId: slot.id };
      }
    }
    return null;
  }).filter(Boolean);
  const ovr = players.length ? Math.round(players.reduce((s, p) => s + p.ovr, 0) / players.length) : 70;
  return { formation: formationLabel, ovr, players };
}

// Called by the draft engine when a duel draft is complete.
async function submitDuelSquad() {
  const squad = buildDuelSquadPayload();

  if (_duelBot) {
    const bot = makeBotSquad(squad.formation);
    startDuelReveal({ _local: true, seed: _duelRoomSeed, is_host: true,
      host_name: document.getElementById('nav-username')?.textContent?.trim() || 'אתה',
      guest_name: 'בוט 🤖', draft: { host: squad, guest: bot } });
    return;
  }

  _duelPhase = 'waiting';
  renderDuelWaiting();
  const { error } = await _supabase.rpc('duel_submit_squad', { p_code: state.duelCode, p_squad: squad });
  if (error) {
    document.getElementById('duel-content').innerHTML =
      `<div class="lgsim-hero"><div class="lgsim-hero-title" style="color:#f85149">שליחה נכשלה</div>
       <button class="btn-primary" id="duel-resub">נסה שוב</button></div>`;
    document.getElementById('duel-resub').onclick = submitDuelSquad;
    return;
  }
  await refreshDuelRoom();          // reveal immediately if the opponent already finished
}

function renderDuelWaiting() {
  showScreen('duel');
  document.getElementById('duel-content').innerHTML = `
    <div class="lgsim-hero">
      <div class="lgsim-hero-title">✓ ההרכב נשלח!</div>
      <div class="lgsim-hero-sub">ממתין שהיריב יסיים את הדראפט…</div>
      <div class="duel-wait-spin">⚽</div>
      <button class="lg-leave" id="duel-leave">עזוב</button>
    </div>`;
  document.getElementById('duel-leave').onclick = () => leaveDuelFlow();
}

// ─── Reveal: normal results page + a separate duel summary ──────────────────────
function duelSeasonRecord(seed, ovr) {
  return withSeededRandom(seed, () => {
    const g = generateMatches(ovr);
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; else l++; gf += m.gf; ga += m.ga; });
    return { w, d, l, gf, ga, pts: w * 3 + d, inTopSix: g.inTopSix };
  });
}

function startDuelReveal(room) {
  _duelPhase = 'done';
  const myRole = room.is_host ? 'host' : 'guest';
  const oppRole = myRole === 'host' ? 'guest' : 'host';
  const mySquad = room.draft[myRole], oppSquad = room.draft[oppRole];
  if (!mySquad || !oppSquad) return;
  const roomSeed = Number(room.seed) || lgSimSeed(String(room.code || 'bot'));
  const myName = myRole === 'host' ? room.host_name : room.guest_name;
  const oppName = oppRole === 'host' ? room.host_name : room.guest_name;

  // The opponent's deterministic season — used both for the shared league table
  // (they play in the same Ligat Ha'al) and the duel summary.
  const oppRec = duelSeasonRecord(lgSimSeed(String(roomSeed) + '|' + oppRole), oppSquad.ovr);
  const oppPts = oppRec.pts;
  const oppTeam = { name: 'הקבוצה של ' + (oppName || 'יריב'), pts: oppRec.pts,
    w: oppRec.w, d: oppRec.d, l: oppRec.l, gf: oppRec.gf, ga: oppRec.ga, inTopSix: oppRec.inTopSix };

  // Rebuild my team into `state` (safe across refresh) and compute my own season,
  // inserting the opponent's team into my league table (as in the leagues reveal).
  lgReconstructState(mySquad.players, mySquad.formation, mySquad.settings || {});
  let proj = 8; try { proj = calcPreseasonOdds(mySquad.ovr, 50).projectedFinish; } catch (e) {}
  const season = withSeededRandom(lgSimSeed(String(roomSeed) + '|' + myRole), () => {
    const g = generateMatches(mySquad.ovr);
    let w = 0, d = 0; g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    const l = g.matches.length - w - d;
    const table = lgInjectFriends(
      generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents), [oppTeam]);
    return { ovr: mySquad.ovr, matches: g.matches, inTopSix: g.inTopSix, leagueTable: table,
      playerStats: simulatePlayerStats(g.matches), projectedFinish: proj, _pts: w * 3 + d };
  });
  const myPts = season._pts;

  window._presetSeason = season;
  window._duelReviewMode = { room, mySquad, oppSquad, myName, oppName, myPts, oppPts };
  state.duelCode = null; state.leagueCode = null;
  showResults();
  setTimeout(() => addDuelReviewChrome(), 80);
}

function addDuelReviewChrome() {
  document.getElementById('duel-review-chrome')?.remove();
  const d = window._duelReviewMode; if (!d) return;
  const draw = d.myPts === d.oppPts, iWon = d.myPts > d.oppPts;
  const label = draw ? '🤝 תיקו' : (iWon ? '🏆 ניצחת!' : '😞 הפסדת');
  const color = draw ? '#f59e0b' : (iWon ? '#22c55e' : '#f85149');
  const bar = document.createElement('div');
  bar.id = 'duel-review-chrome';
  bar.innerHTML = `
    <button class="duel-chrome-summary" id="duel-chrome-open" style="color:${color}">
      🆚 ${label} · ${d.myPts}–${d.oppPts}
    </button>
    <button class="duel-chrome-exit" id="duel-chrome-exit">יציאה</button>`;
  document.getElementById('screen-results')?.appendChild(bar);
  document.getElementById('duel-chrome-open').onclick = showDuelSummary;
  document.getElementById('duel-chrome-exit').onclick = () => {
    bar.remove(); window._duelReviewMode = null; renderDuelHome();
  };
  setTimeout(showDuelSummary, 4600);     // surface the summary once the reveal settles
}

function showDuelSummary() {
  const d = window._duelReviewMode; if (!d) return;
  const draw = d.myPts === d.oppPts, iWon = d.myPts > d.oppPts;
  const headline = draw ? '🤝 תיקו!' : (iWon ? '🏆 ניצחת בדואל!' : '😞 הפסדת בדואל');
  const color = draw ? '#f59e0b' : (iWon ? '#22c55e' : '#f85149');

  let modal = document.getElementById('duel-summary-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'duel-summary-modal'; modal.className = 'modal-overlay'; document.body.appendChild(modal); }
  modal.innerHTML = `
    <div class="modal-box placement-box">
      <div class="placement-tier" style="color:${color}">${headline}</div>
      <div class="duel-sum-score" dir="ltr">
        <b>${dEsc(d.myName || 'אתה')}</b> ${d.myPts} — ${d.oppPts} <b>${dEsc(d.oppName || 'יריב')}</b>
      </div>
      <div class="duel-sum-ovr">OVR ${d.mySquad.ovr} · ${d.oppSquad.ovr}</div>
      <button class="btn-primary btn-full" id="duel-sum-opp">👁 צפה בהרכב היריב</button>
      <button class="btn-primary btn-full" id="duel-sum-close" style="margin-top:6px">לצפייה בתוצאות שלך ←</button>
    </div>`;
  modal.querySelector('#duel-sum-opp').onclick = () =>
    showLeagueSquad(d.oppSquad.players.map(p => ({ pos: p.pos, name: p.name, ovr: p.ovr })), 'הקבוצה של ' + (d.oppName || 'יריב'));
  modal.querySelector('#duel-sum-close').onclick = () => { modal.style.display = 'none'; };
  modal.style.display = 'flex';
}

// ─── Quick match + bot fallback ────────────────────────────────────────────────
async function quickMatchFlow() {
  duelMsg('מחפש יריב…', true);
  const { data, error } = await _supabase.rpc('quick_match');
  if (error || !data?.length) { duelMsg('החיפוש נכשל, נסו שוב', false); return; }
  const { code, role } = data[0];
  await openDuelRoom(code);
  if (role === 'host') {
    clearTimeout(_quickBotTimer);
    _quickBotTimer = setTimeout(async () => {
      const { data: d } = await _supabase.rpc('get_duel_room', { p_code: code });
      if (d?.[0]?.guest_name) return;                 // a real opponent joined
      await _supabase.rpc('leave_duel_room', { p_code: code });
      startBotDuel();
    }, 10000);
  }
}

function startBotDuel() {
  closeDuelRealtime();
  _duelBot = true;
  _duelPhase = 'drafting';
  _duelRoomSeed = Math.floor(Math.random() * 2147483646);
  duelMsg('לא נמצא יריב — משחקים מול בוט 🤖', true);
  startDuelDraft('__BOT__');
}

// Invite link: /?duel=CODE opens the duel screen with the code ready to join.
document.addEventListener('DOMContentLoaded', () => {
  const m = /[?&]duel=([A-Za-z0-9]{4})/.exec(location.search);
  if (!m) return;
  _pendingDuelCode = m[1].toUpperCase();
  setTimeout(() => { if (typeof showDuel === 'function') showDuel(); }, 1400);
});
