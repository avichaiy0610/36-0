// ─── Real-time 1v1 duels (Phase A: the live waiting room) ──────────────────────
// A host creates a room and shares a 4-char code; a guest joins; both mark ready.
// The room is a single row in `duel_rooms`, and both clients subscribe to it over
// Supabase Realtime, so a join / ready / leave shows up instantly on both screens.
// Phase B (the synchronized shared draft) plugs into the `ready` state below.

function dEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let _duelCode = null;
let _duelChan = null;
let _pendingDuelCode = null;

async function showDuel() {
  showScreen('duel');
  document.getElementById('duel-back').onclick = () => { closeDuelRealtime(); showScreen('welcome'); };
  renderDuelHome();
}

function renderDuelHome() {
  closeDuelRealtime();
  const box = document.getElementById('duel-content');
  const user = getCurrentUser();
  if (!user) {
    box.innerHTML = `
      <p class="page-note">התחבר כדי לשחק דואל 1 על 1 בזמן אמת מול חבר.</p>
      <button class="btn-primary" id="duel-login">התחבר</button>`;
    document.getElementById('duel-login').onclick = () =>
      document.getElementById('auth-modal').style.display = 'flex';
    return;
  }
  box.innerHTML = `
    <div class="lg-card">
      <div class="lg-card-title">🎮 צור חדר חדש</div>
      <p class="page-note" style="margin:4px 0 10px">חדר פרטי בזמן אמת — שלח את הקוד לחבר והתחילו דואל.</p>
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

// Open a room: subscribe to its live row and render the current state.
async function openDuelRoom(code) {
  closeDuelRealtime();      // tear down any previous room (also clears _duelCode)
  _duelCode = code;
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
  renderDuelRoom(data[0]);
}

function renderDuelRoom(room) {
  clearDuelTimer();
  // Both ready → the synchronized draft; all picks in → the shared result.
  if (room.status === 'ready' || room.status === 'drafting') return renderDuelDraft(room);
  if (room.status === 'done') return renderDuelResult(room);

  const box = document.getElementById('duel-content');
  const bothHere = !!room.host_name && !!room.guest_name;
  const myReady = room.is_host ? room.host_ready : room.guest_ready;

  const slot = (name, ready, crown) => `
    <div class="duel-slot ${name ? 'filled' : 'empty'} ${ready ? 'ready' : ''}">
      <div class="duel-slot-name">${crown} ${name ? dEsc(name) : 'ממתין ליריב…'}</div>
      <div class="duel-slot-status">${name ? (ready ? '✓ מוכן' : '⏳ מתכונן') : ''}</div>
    </div>`;

  const actionHtml = `
      <button class="btn-primary duel-ready-btn ${myReady ? 'on' : ''}" id="duel-ready" ${bothHere ? '' : 'disabled'}>
        ${myReady ? '↩ בטל מוכנות' : (bothHere ? 'אני מוכן ✓' : 'ממתין ליריב…')}
      </button>
      ${bothHere ? '<div class="duel-hint">כששניכם מוכנים — הדראפט המשותף מתחיל 🔥</div>' : ''}`;

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
    ${actionHtml}
    <div id="duel-msg" class="lg-msg"></div>
    <button class="lg-leave" id="duel-leave">עזוב חדר</button>`;

  document.getElementById('duel-room-back').onclick = () => { leaveDuelFlow(); };
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
    if (error) { console.error('set_duel_ready failed:', error); duelMsg('שגיאה בסימון מוכנות: ' + error.message, false); readyBtn.disabled = false; }
  };
}

async function leaveDuelFlow() {
  const code = _duelCode;
  closeDuelRealtime();
  if (code) await _supabase.rpc('leave_duel_room', { p_code: code });
  renderDuelHome();
}

function onDuelEnded() {
  closeDuelRealtime();
  if (document.getElementById('screen-duel')) {
    renderDuelHome();
    duelMsg('החדר נסגר (היריב עזב).', false);
  }
}

function closeDuelRealtime() {
  if (_duelChan) { _supabase.removeChannel(_duelChan); _duelChan = null; }
  _duelCode = null;
}

// ─── Phase B+C: the synchronized alternating draft ─────────────────────────────
// Both clients derive the same team sequence and turn order from the room's
// shared `seed`; only the picks are synced (server-authoritative via duel_pick).
// A shared team is drawn each "round"; the two players alternate taking one of
// its players onto their own 4-3-3, and can't take what the other already grabbed.

const DUEL_FORMATION = '4-3-3';
const DUEL_TURN_SECONDS = 25;
let _duelTimer = null;
let _duelPickable = [];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Deterministic 11-team sequence (2 picks each = 22) from the shared seed.
function duelTeamSeq(seed) {
  const rng = mulberry32((seed >>> 0) || 1);
  const arr = SQUADS.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 11);
}

function duelFits(player, slotPos) {
  const allowed = COMPAT[slotPos] || [];
  if (allowed.includes(player.position)) return true;
  return Array.isArray(player.altPos) && player.altPos.some(p => allowed.includes(p));
}
function duelEmptySlots(slots, myPicks) {
  const filled = new Set(myPicks.map(p => p.slotId));
  return slots.filter(s => !filled.has(s.id));
}
function duelAssignSlot(player, empties) {
  return empties.find(s => duelFits(player, s.pos)) || empties[0] || null;
}

function duelState(room) {
  const seed = Number(room.seed) || 1;
  const slots = FORMATIONS[DUEL_FORMATION].slots;
  const picks = (room.draft && room.draft.picks) || [];
  const turn = picks.length, total = 22;
  const first = (seed % 2 === 0) ? 'host' : 'guest';
  const myRole = room.is_host ? 'host' : 'guest';
  const oppRole = myRole === 'host' ? 'guest' : 'host';
  const picker = (turn % 2 === 0) ? first : (first === 'host' ? 'guest' : 'host');
  const teamSeq = duelTeamSeq(seed);
  const currentTeam = teamSeq[Math.floor(turn / 2)] || null;
  return {
    seed, slots, picks, turn, total, myRole, oppRole, picker,
    isMyTurn: picker === myRole && turn < total, currentTeam,
    myName: room.is_host ? room.host_name : room.guest_name,
    oppName: room.is_host ? room.guest_name : room.host_name,
  };
}

function renderDuelDraft(room) {
  clearDuelTimer();
  const box = document.getElementById('duel-content');
  const st = duelState(room);
  const myPicks = st.picks.filter(p => p.by === st.myRole);
  const oppPicks = st.picks.filter(p => p.by === st.oppRole);

  let listHtml = '';
  const team = st.currentTeam;
  if (team) {
    const taken = new Set(st.picks.filter(p => p.squadId === team.id).map(p => p.player));
    const empties = duelEmptySlots(st.slots, myPicks);
    const avail = team.players.filter(pl => !taken.has(pl.name));
    const fitting = avail.filter(pl => empties.some(s => duelFits(pl, s.pos)));
    _duelPickable = (fitting.length ? fitting : avail).slice().sort((a, b) => b.ovr - a.ovr);
    listHtml = _duelPickable.map((pl, i) => `
      <button class="duel-pl" data-i="${i}" ${st.isMyTurn ? '' : 'disabled'}>
        <span class="duel-pl-pos">${dEsc(pl.position)}</span>
        <span class="duel-pl-name">${dEsc(playerShortName(pl.name))}</span>
        <span class="duel-pl-ovr">${pl.ovr}</span>
      </button>`).join('');
  }

  const teamLabel = team ? `${dEsc(getTeam(team.teamId).name)} · ${dEsc(team.season)}` : '';
  const turnBadge = st.isMyTurn
    ? `<span class="duel-turn me">🟢 תורך לבחור!</span>`
    : `<span class="duel-turn opp">⏳ תור ${dEsc(st.oppName || 'היריב')}…</span>`;

  const squadCol = (title, picks, mine) => {
    const bySlot = new Map(picks.map(p => [p.slotId, p]));
    const rows = st.slots.map(s => {
      const p = bySlot.get(s.id);
      return `<div class="duel-sq-row ${p ? 'f' : ''}"><span class="duel-sq-pos">${s.pos}</span><span class="duel-sq-nm">${p ? dEsc(playerShortName(p.player)) : '—'}</span><span class="duel-sq-ovr">${p ? p.ovr : ''}</span></div>`;
    }).join('');
    return `<div class="duel-sq ${mine ? 'mine' : ''}"><div class="duel-sq-h">${dEsc(title)} <span>${picks.length}/11</span></div>${rows}</div>`;
  };

  box.innerHTML = `
    <div class="duel-draft-top">
      ${turnBadge}
      <span class="duel-prog">בחירה ${Math.min(st.turn + 1, st.total)}/${st.total}</span>
      <span class="duel-timer" id="duel-timer"></span>
    </div>
    <div class="duel-team-panel">
      <div class="duel-team-name">⚽ ${teamLabel}</div>
      <div class="duel-pl-list">${listHtml || '<div class="page-note">—</div>'}</div>
      ${st.isMyTurn ? '' : '<div class="duel-wait-note">היריב בוחר…</div>'}
    </div>
    <div class="duel-squads">
      ${squadCol('הקבוצה שלך', myPicks, true)}
      ${squadCol(st.oppName || 'יריב', oppPicks, false)}
    </div>
    <button class="lg-leave" id="duel-leave">עזוב דואל</button>`;

  document.getElementById('duel-leave').onclick = () => leaveDuelFlow();
  if (st.isMyTurn && team) {
    box.querySelectorAll('.duel-pl').forEach(btn =>
      btn.onclick = () => duelDoPick(room, _duelPickable[+btn.dataset.i]));
    startDuelTimer(room);
  }
}

async function duelDoPick(room, player) {
  if (!player) return;
  const st = duelState(room);
  if (!st.isMyTurn || !st.currentTeam) return;
  clearDuelTimer();
  const myPicks = st.picks.filter(p => p.by === st.myRole);
  const slot = duelAssignSlot(player, duelEmptySlots(st.slots, myPicks));
  if (!slot) return;
  const payload = { i: st.turn, squadId: st.currentTeam.id, player: player.name, slotId: slot.id, pos: slot.pos, ovr: player.ovr };
  const { error } = await _supabase.rpc('duel_pick', { p_code: room.code, p_pick: payload });
  if (error) console.warn('duel_pick rejected:', error.message);  // realtime will re-sync
}

function clearDuelTimer() { if (_duelTimer) { clearInterval(_duelTimer); _duelTimer = null; } }
function startDuelTimer(room) {
  clearDuelTimer();
  let t = DUEL_TURN_SECONDS;
  const paint = () => { const e = document.getElementById('duel-timer'); if (e) e.textContent = '⏱ ' + t; };
  paint();
  _duelTimer = setInterval(() => {
    t--; paint();
    if (t <= 0) { clearDuelTimer(); if (_duelPickable.length) duelDoPick(room, _duelPickable[0]); }
  }, 1000);
}

// Deterministic shared scoreline from the seed (both clients compute the same).
function duelScore(seed, ovrHost, ovrGuest) {
  const rng = mulberry32(((seed >>> 0) ^ 0x9e3779b9) || 7);
  const g = ovr => Math.max(0, Math.round((ovr - 72) / 6 + rng() * 2.2));
  return [g(ovrHost), g(ovrGuest)];
}

function renderDuelResult(room) {
  clearDuelTimer();
  const box = document.getElementById('duel-content');
  const seed = Number(room.seed) || 1;
  const picks = (room.draft && room.draft.picks) || [];
  const myRole = room.is_host ? 'host' : 'guest';
  const of = role => picks.filter(p => p.by === role);
  const ovrOf = arr => arr.length ? Math.round(arr.reduce((s, p) => s + (p.ovr || 0), 0) / arr.length) : 0;
  const hostP = of('host'), guestP = of('guest');
  const hostOvr = ovrOf(hostP), guestOvr = ovrOf(guestP);
  const [hg, gg] = duelScore(seed, hostOvr, guestOvr);
  const draw = hg === gg;

  const teams = [
    { name: room.host_name || 'מארח', ovr: hostOvr, goals: hg, picks: hostP, mine: myRole === 'host' },
    { name: room.guest_name || 'יריב', ovr: guestOvr, goals: gg, picks: guestP, mine: myRole === 'guest' },
  ];
  teams.sort((a, b) => b.goals - a.goals || b.ovr - a.ovr);
  const iWon = !draw && teams[0].mine;
  const headline = draw ? '🤝 תיקו!' : (iWon ? '🏆 ניצחת!' : '😞 הפסדת');
  const headColor = draw ? '#f59e0b' : (iWon ? '#22c55e' : '#f85149');

  const rows = teams.map((t, i) => `
    <div class="lb-row lg-clickable duel-res-row" data-role="${t.mine ? myRole : (myRole === 'host' ? 'guest' : 'host')}">
      <span class="lb-rank ${i === 0 && !draw ? 'lb-rank-top' : ''}">${draw ? '·' : i + 1}</span>
      <span class="lb-name">הקבוצה של ${dEsc(t.name)}${t.mine ? ' (אתה)' : ''}</span>
      <span class="lb-stat">${t.goals}</span>
      <span class="lb-sub" dir="rtl">OVR ${t.ovr}</span>
    </div>`).join('');

  box.innerHTML = `
    <div class="duel-result-head" style="color:${headColor}">${headline}</div>
    <div class="duel-scoreline" dir="ltr">${dEsc(teams.find(t=>t.mine)?.name||'')} <b>${teams.find(t=>t.mine)?.goals}</b> — <b>${teams.find(t=>!t.mine)?.goals}</b> ${dEsc(teams.find(t=>!t.mine)?.name||'')}</div>
    <div class="section-label" style="margin-top:12px">טבלת הדואל</div>
    <div class="lb-table lg-table">${rows}</div>
    <p class="page-note" style="text-align:center;margin-top:8px">לחצו על קבוצה כדי לראות את ההרכב</p>
    <button class="btn-primary" id="duel-again" style="width:100%;margin-top:6px">🔁 חדר חדש</button>
    <button class="lg-leave" id="duel-leave">יציאה</button>`;

  const squadFor = role => picks.filter(p => p.by === role)
    .map(p => ({ pos: p.pos, name: p.player, ovr: p.ovr }));
  box.querySelectorAll('.duel-res-row').forEach(row => {
    row.onclick = () => {
      const role = row.dataset.role;
      const name = role === 'host' ? room.host_name : room.guest_name;
      showLeagueSquad(squadFor(role), 'הקבוצה של ' + (name || ''));
    };
  });
  document.getElementById('duel-again').onclick = () => leaveDuelFlow();
  document.getElementById('duel-leave').onclick = () => leaveDuelFlow();
}

// Invite link: /?duel=CODE opens the duel screen with the code ready to join.
document.addEventListener('DOMContentLoaded', () => {
  const m = /[?&]duel=([A-Za-z0-9]{4})/.exec(location.search);
  if (!m) return;
  _pendingDuelCode = m[1].toUpperCase();
  setTimeout(() => { if (typeof showDuel === 'function') showDuel(); }, 1400);
});
