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
  const box = document.getElementById('duel-content');
  const bothHere = !!room.host_name && !!room.guest_name;
  const myReady = room.is_host ? room.host_ready : room.guest_ready;
  const started = room.status === 'ready';

  const slot = (name, ready, crown) => `
    <div class="duel-slot ${name ? 'filled' : 'empty'} ${ready ? 'ready' : ''}">
      <div class="duel-slot-name">${crown} ${name ? dEsc(name) : 'ממתין ליריב…'}</div>
      <div class="duel-slot-status">${name ? (ready ? '✓ מוכן' : '⏳ מתכונן') : ''}</div>
    </div>`;

  let actionHtml;
  if (started) {
    actionHtml = `
      <div class="duel-ready-note">🔥 שני השחקנים מוכנים!</div>
      <div class="duel-soon">הדראפט המשותף בזמן אמת — בבנייה 🔨<br><span>seed משותף: ${room.seed}</span></div>`;
  } else {
    actionHtml = `
      <button class="btn-primary duel-ready-btn ${myReady ? 'on' : ''}" id="duel-ready" ${bothHere ? '' : 'disabled'}>
        ${myReady ? '↩ בטל מוכנות' : (bothHere ? 'אני מוכן ✓' : 'ממתין ליריב…')}
      </button>`;
  }

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

// Invite link: /?duel=CODE opens the duel screen with the code ready to join.
document.addEventListener('DOMContentLoaded', () => {
  const m = /[?&]duel=([A-Za-z0-9]{4})/.exec(location.search);
  if (!m) return;
  _pendingDuelCode = m[1].toUpperCase();
  setTimeout(() => { if (typeof showDuel === 'function') showDuel(); }, 1400);
});
