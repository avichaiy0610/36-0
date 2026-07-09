// ─── Real-time 1v1 duels — shared TURN-BASED draft ─────────────────────────────
// Host sets the room's shared settings; both players ready up, each picks a
// formation, then they draft from the SAME drawn teams: the first pick alternates
// each round, the round's first picker may reroll the team once, and rock-paper-
// scissors decides who's first in the final round. Both boards fill live. At the
// end each player sees the normal results page (opponent in the league table) plus
// a duel summary. Quick-match falls back to a local bot with the same rules.

function dEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let _duelCode = null;
let _duelChan = null;
let _pendingDuelCode = null;
let _quickBotTimer = null;
let _duelRevealed = false;
let _botRoom = null;          // local room object for bot games
let _duelPickable = [];
let _duelActive = false;      // true while an actual game is in progress (warn on leave)
let _duelSel = null;          // current selection: {type:'pick',player} | {type:'move',slotId}
let _duelMove = false;        // move (rearrange) mode toggle
let _duelRelax = false;       // no player fits an open slot → allow any placement

// Remember the active room so a refresh keeps you in the game.
const DUEL_PERSIST_KEY = '36-0-duel-room';
function duelSavePersist(code) { try { localStorage.setItem(DUEL_PERSIST_KEY, code); } catch (e) {} }
function duelClearPersist() { try { localStorage.removeItem(DUEL_PERSIST_KEY); } catch (e) {} }

const DUEL_ERAS = [
  { v: 'all', label: 'כל התקופות' },
  { v: '90s', label: "שנות ה-90", min: 1990, max: 1999 },
  { v: '00s', label: "2000-2009", min: 2000, max: 2009 },
  { v: '10s', label: "2010-2019", min: 2010, max: 2019 },
  { v: 'now', label: 'עדכני', min: 2018, max: 3000 },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function duelPosFits(p, slotPos) {
  const allowed = COMPAT[slotPos] || [];
  if (allowed.includes(p.position)) return true;
  return Array.isArray(p.altPos) && p.altPos.some(x => allowed.includes(x));
}
function duelPOvr(p, settings) {
  return (settings && settings.peak_mode) ? (p.peak_ovr ?? p.ovr) : p.ovr;
}
function duelSquadPool(settings) {
  const emin = settings?.era_min ?? (typeof YEAR_MIN !== 'undefined' ? YEAR_MIN : 1990);
  const emax = settings?.era_max ?? (typeof YEAR_MAX !== 'undefined' ? YEAR_MAX : 3000);
  const pool = SQUADS.filter(sq => { const y = parseInt(sq.season, 10); return y >= emin && y <= emax; });
  return pool.length >= 15 ? pool : SQUADS;
}
function duelSeq(seed, settings) {
  const pool = duelSquadPool(settings).slice();
  const rng = mulberry32((seed >>> 0) || 1);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool;
}
function rpsHe(c) { return c === 'rock' ? '✊ אבן' : c === 'paper' ? '✋ נייר' : '✌ מספריים'; }

// Settings a searcher/host chooses — used for quick-match pairing.
let _quickSettings = { difficulty: 'normal', peak_mode: false, era_min: null, era_max: null, ratings_visible: true };
function duelEraV(s) { return DUEL_ERAS.find(e => (e.min ?? null) === (s.era_min ?? null) && (e.max ?? null) === (s.era_max ?? null))?.v || 'all'; }
function duelSettingsText(s) {
  const diffHe = { easy: 'קל', normal: 'רגיל', hard: 'קשה' }[s.difficulty || 'normal'];
  const eraLbl = DUEL_ERAS.find(e => e.v === duelEraV(s))?.label || 'כל התקופות';
  return `${diffHe}${s.peak_mode ? ' · מצב שיא ⚡' : ''} · ${eraLbl}`;
}
// The three mini toggle rows (difficulty / peak / era) bound to a settings object.
function duelSettingsRows(prefix, s) {
  const mini = (id, opts, cur) => `<div class="lg-mini" id="${id}">${opts.map(o => `<button data-v="${o.v}" class="${o.v === cur ? 'on' : ''}">${o.label}</button>`).join('')}</div>`;
  return `<div class="lg-config">
    <div class="lg-config-row"><span>קושי</span>${mini(prefix + '-diff', [{ v: 'easy', label: 'קל' }, { v: 'normal', label: 'רגיל' }, { v: 'hard', label: 'קשה' }], s.difficulty || 'normal')}</div>
    <div class="lg-config-row"><span>מצב שיא ⚡</span>${mini(prefix + '-peak', [{ v: 'off', label: 'כבוי' }, { v: 'on', label: 'פעיל' }], s.peak_mode ? 'on' : 'off')}</div>
    <div class="lg-config-row"><span>תקופה</span>${mini(prefix + '-era', DUEL_ERAS.map(e => ({ v: e.v, label: e.label })), duelEraV(s))}</div>
  </div>`;
}
function wireDuelSettings(prefix, s, onChange) {
  wireDuelMini(prefix + '-diff', v => { s.difficulty = v; onChange && onChange(); });
  wireDuelMini(prefix + '-peak', v => { s.peak_mode = v === 'on'; onChange && onChange(); });
  wireDuelMini(prefix + '-era', v => { const e = DUEL_ERAS.find(x => x.v === v); s.era_min = e?.min ?? null; s.era_max = e?.max ?? null; onChange && onChange(); });
}

// ─── Screens: home + lobby ─────────────────────────────────────────────────────
async function showDuel() {
  showScreen('duel');
  document.getElementById('duel-back').onclick = () => { closeDuelRealtime(); showScreen('welcome'); };
  renderDuelHome();
}

function renderDuelHome() {
  closeDuelRealtime();
  duelClearPersist();
  _botRoom = null; _duelRevealed = false; _duelActive = false; _duelSel = null; _duelMove = false;
  const box = document.getElementById('duel-content');
  const user = getCurrentUser();
  if (!user) {
    box.innerHTML = `<p class="page-note">התחבר כדי לשחק דואל 1 על 1 מול חבר.</p>
      <button class="btn-primary" id="duel-login">התחבר</button>`;
    document.getElementById('duel-login').onclick = () => document.getElementById('auth-modal').style.display = 'flex';
    return;
  }
  box.innerHTML = `
    <div id="duel-record" class="duel-record"></div>
    <div class="lg-card duel-quick-card">
      <div class="lg-card-title">${siteText('duel-quick-title', '⚡ משחק מהיר')}</div>
      <p class="page-note" style="margin:4px 0 8px">${siteText('duel-quick-note', 'בחר תנאים ומצא יריב שבחר בדיוק את אותם תנאים.')}</p>
      ${duelSettingsRows('qm', _quickSettings)}
      <button class="btn-primary lg-btn" id="duel-quick" style="width:100%;margin-top:8px">${siteText('duel-quick-btn', 'חפש יריב')}</button>
    </div>
    <div class="lg-card">
      <div class="lg-card-title">${siteText('duel-create-title', '🎮 צור חדר חדש')}</div>
      <p class="page-note" style="margin:4px 0 10px">${siteText('duel-create-note', 'חדר פרטי — אתה קובע את ההגדרות, שלח את הקוד לחבר.')}</p>
      <button class="btn-primary lg-btn" id="duel-create" style="width:100%">${siteText('duel-create-btn', 'צור חדר')}</button>
    </div>
    <div class="lg-card">
      <div class="lg-card-title">${siteText('duel-join-title', '🔑 הצטרף לחדר')}</div>
      <div class="lg-row">
        <input id="duel-join-code" class="lg-input lg-code-input" maxlength="4" placeholder="קוד חדר" dir="ltr" value="${dEsc(_pendingDuelCode || '')}">
        <button class="btn-primary lg-btn" id="duel-join">${siteText('duel-join-btn', 'הצטרף')}</button>
      </div>
    </div>
    <div id="duel-msg" class="lg-msg"></div>`;
  wireDuelSettings('qm', _quickSettings);
  document.getElementById('duel-quick').onclick = quickMatchFlow;
  document.getElementById('duel-create').onclick = createDuelFlow;
  document.getElementById('duel-join').onclick = joinDuelFlow;
  if (_pendingDuelCode) { duelMsg('נמצא קוד הזמנה — לחצו "הצטרף"', true); _pendingDuelCode = null; }
  _supabase.rpc('get_duel_record').then(({ data }) => {
    const r = data?.[0]; const el = document.getElementById('duel-record');
    if (!el || !r || (r.wins + r.losses + r.draws) === 0) return;
    el.innerHTML = `📊 השיא שלך: <b>${r.wins}</b> נצחונות · <b>${r.losses}</b> הפסדים · <b>${r.draws}</b> תיקו`;
  }, () => {});
}

function duelMsg(text, ok) {
  const el = document.getElementById('duel-msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'lg-msg ' + (ok ? 'ok' : 'err');
}

async function createDuelFlow() {
  const { data, error } = await _supabase.rpc('create_duel_room', { p_settings: { difficulty: 'normal', peak_mode: false, ratings_visible: true } });
  if (error) { duelMsg('יצירת החדר נכשלה: ' + error.message, false); return; }
  openDuelRoom(data);
}
async function joinDuelFlow() {
  const code = document.getElementById('duel-join-code').value.trim().toUpperCase();
  if (code.length < 4) { duelMsg('הכנס קוד חדר תקין (4 תווים)', false); return; }
  const { error } = await _supabase.rpc('join_duel_room', { p_code: code });
  if (error) {
    const m = error.message.includes('full') ? 'החדר מלא' : error.message.includes('not found') ? 'לא נמצא חדר עם הקוד הזה' : 'ההצטרפות נכשלה';
    duelMsg(m, false); return;
  }
  openDuelRoom(code);
}

async function openDuelRoom(code) {
  closeDuelRealtime();
  _duelCode = code; _duelRevealed = false;
  duelSavePersist(code);
  _duelChan = _supabase.channel('duel:' + code)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_rooms', filter: 'code=eq.' + code },
        payload => { if (payload.eventType === 'DELETE') { onDuelEnded(); return; } refreshDuelRoom(); })
    .subscribe();
  await refreshDuelRoom();
}

async function refreshDuelRoom() {
  if (!_duelCode) return;
  const { data, error } = await _supabase.rpc('get_duel_room', { p_code: _duelCode });
  if (error || !data?.length) { onDuelEnded(); return; }
  const room = data[0];
  if (room.guest_name && _quickBotTimer) { clearTimeout(_quickBotTimer); _quickBotTimer = null; }
  renderDuel(room);
}

// Generic Israeli-football-flavoured handles the "bots" appear under, so a bot
// opponent is indistinguishable from a real player who just joined.
const DUEL_BOT_NICKS = [
  'מכבי_לנצח', 'בית"ר_בלב', 'הפועל_אדום', 'אלוף_הליגה', 'גול_בדקה90', 'שוער_ברזל',
  'מלך_השערים', 'ילד_פלא', 'קוסם_הכדור', 'נשר_מהיציע', 'אגדת_הדשא', 'דרבי_מנצח',
  'פנטזיה2026', 'טורנדו10', 'בולדוזר9', 'קפטן_מהשכונה', 'חלוץ_חוד', 'רוח_אלופים',
  'ליגת_העל', 'כדורגלן_חובב', 'אריה_יהודה', 'סופר_גול', 'מהיר_כברק', 'חומת_הגנה',
];
function duelBotNick() { return DUEL_BOT_NICKS[Math.floor(Math.random() * DUEL_BOT_NICKS.length)]; }

// Master router — decides which duel view to show from the room state.
function renderDuel(room) {
  const d = room.draft || {};
  if (room.status === 'waiting') return renderDuelLobby(room);
  if (room.status === 'done' || d.phase === 'done') { startDuelReveal(room); return; }
  if (d.phase === 'rps') return renderDuelRPS(room);
  if (d.phase === 'draft') return renderDuelBoard(room);
  return renderDuelFormation(room);
}

function renderDuelLobby(room) {
  showScreen('duel');
  _duelActive = false;
  const box = document.getElementById('duel-content');
  const bothHere = !!room.host_name && !!room.guest_name;
  const myReady = room.is_host ? room.host_ready : room.guest_ready;
  const s = room.settings || {};

  const slot = (name, ready, crown) => `
    <div class="duel-slot ${name ? 'filled' : 'empty'} ${ready ? 'ready' : ''}">
      <div class="duel-slot-name">${crown} ${name ? dEsc(name) : 'ממתין ליריב…'}</div>
      <div class="duel-slot-status">${name ? (ready ? '✓ מוכן' : '⏳ מתכונן') : ''}</div>
    </div>`;

  // The host may set the conditions only while alone; once both are in they are
  // locked and shown as agreed (a quick-match pair already chose the same ones).
  const canEditSettings = room.is_host && !bothHere;
  const settingsHtml = canEditSettings
    ? duelSettingsRows('duel', s)
    : `<div class="duel-agreed ${bothHere ? 'ok' : ''}">${bothHere ? '✓ הגדרות מוסכמות · ' : 'הגדרות החדר · '}${duelSettingsText(s)}</div>`;

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
    ${settingsHtml}
    <button class="btn-primary duel-ready-btn ${myReady ? 'on' : ''}" id="duel-ready" ${bothHere ? '' : 'disabled'}>
      ${myReady ? '↩ בטל מוכנות' : (bothHere ? 'אני מוכן ✓' : 'ממתין ליריב…')}
    </button>
    ${bothHere ? '<div class="duel-hint">כששניכם מוכנים — בוחרים מערך ומתחיל דראפט תורות משותף 🔥</div>' : ''}
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
    if (room._local) {
      room.host_ready = !myReady;
      duelLocalMaybeStart(room);
      renderDuel(room); return;
    }
    readyBtn.disabled = true;
    const { error } = await _supabase.rpc('set_duel_ready', { p_code: room.code, p_ready: !myReady });
    if (error) { duelMsg('שגיאה: ' + error.message, false); readyBtn.disabled = false; }
  };
  if (canEditSettings) {
    const save = patch => {
      if (room._local) { room.settings = { ...room.settings, ...patch }; return; }
      // NOTE: supabase query builders are lazy — must .then()/await or it never runs.
      _supabase.rpc('set_duel_settings', { p_code: room.code, p_settings: patch }).then(() => {}, () => {});
    };
    wireDuelMini('duel-diff', v => save({ difficulty: v }));
    wireDuelMini('duel-peak', v => save({ peak_mode: v === 'on' }));
    wireDuelMini('duel-era', v => { const e = DUEL_ERAS.find(x => x.v === v); save({ era_min: e?.min ?? null, era_max: e?.max ?? null }); });
  }
}
function wireDuelMini(id, cb) {
  const el = document.getElementById(id); if (!el) return;
  el.querySelectorAll('button').forEach(b => b.onclick = () => {
    el.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); cb(b.dataset.v);
  });
}

async function leaveDuelFlow() {
  const code = _duelCode;
  closeDuelRealtime();
  if (code) await _supabase.rpc('leave_duel_room', { p_code: code });
  renderDuelHome();
}

// Leaving a game in progress = forfeit (counts as a loss). Used by the in-game
// leave/exit buttons and the nav guard below.
function duelForfeitCleanup() {
  if (_duelActive && typeof getCurrentUser === 'function' && getCurrentUser())
    _supabase.rpc('record_duel_outcome', { p_outcome: 'loss' }).then(() => {}, () => {});
  _duelActive = false;
  const code = _duelCode;
  if (code) _supabase.rpc('leave_duel_room', { p_code: code }).then(() => {}, () => {});
  _botRoom = null;
  duelClearPersist();
  closeDuelRealtime();
}
function duelForfeit() {
  if (!confirm('לצאת מהדואל? המשחק ייגמר ותפסיד אותו.')) return;
  duelForfeitCleanup();
  renderDuelHome();
}
// Warn before navigating away (top tabs / back) while a duel is in progress.
document.addEventListener('click', (e) => {
  const t = e.target.closest('.nav-btn, #duel-back');
  if (!t || t.id === 'nav-duel' || !_duelActive) return;
  if (!confirm('לצאת מהדואל? המשחק ייגמר ותפסיד אותו.')) { e.stopImmediatePropagation(); e.preventDefault(); return; }
  duelForfeitCleanup();      // confirmed — let the click proceed to its destination
}, true);
function onDuelEnded() {
  if (_botRoom) return;
  closeDuelRealtime();
  if (document.getElementById('screen-duel')) { renderDuelHome(); duelMsg('החדר נסגר (היריב עזב).', false); }
}
function closeDuelRealtime() {
  if (_duelChan) { _supabase.removeChannel(_duelChan); _duelChan = null; }
  if (_quickBotTimer) { clearTimeout(_quickBotTimer); _quickBotTimer = null; }
  _duelCode = null;
}

// ─── Formation choice ──────────────────────────────────────────────────────────
function renderDuelFormation(room) {
  showScreen('duel');
  _duelActive = true;
  const box = document.getElementById('duel-content');
  const myRole = room.is_host ? 'host' : 'guest';
  const mine = room.draft?.fmt?.[myRole];
  if (mine) {
    box.innerHTML = `<div class="lgsim-hero"><div class="lgsim-hero-title">מערך נבחר: ${dEsc(mine)}</div>
      <div class="lgsim-hero-sub">ממתין שהיריב יבחר מערך…</div><div class="duel-wait-spin">⚽</div></div>`;
    return;
  }
  const cards = Object.keys(FORMATIONS).map(k => `<button class="duel-fmt-btn" data-f="${k}">${dEsc(FORMATIONS[k].label)}</button>`).join('');
  box.innerHTML = `<div class="section-label" style="margin-top:8px">בחר את המערך שלך לדואל</div>
    <div class="duel-fmt-grid">${cards}</div>`;
  box.querySelectorAll('.duel-fmt-btn').forEach(b => b.onclick = () => duelSetFormation(room, b.dataset.f));
}
async function duelSetFormation(room, fmt) {
  if (room._local) { duelLocalFormation(room, fmt); return; }
  await _supabase.rpc('duel_set_formation', { p_code: room.code, p_formation: fmt });
}

// ─── The turn-based board ──────────────────────────────────────────────────────
function duelBoardState(room) {
  const d = room.draft;
  const myRole = room.is_host ? 'host' : 'guest';
  const oppRole = myRole === 'host' ? 'guest' : 'host';
  const round = d.round;
  const first = round < 10 ? (round % 2 === 0 ? 'host' : 'guest') : (d.rps && d.rps.decided);
  const rs = d.roundState || {};
  const picker = !rs[first] ? first : (first === 'host' ? 'guest' : 'host');
  const settings = room.settings || {};
  const seq = duelSeq(Number(room.seed) || 1, settings);
  const team = d.squadId ? (SQUADS.find(s => s.id === d.squadId) || null) : (seq[d.cursor] || null);
  const pool = team ? duelSquadPool(settings) : [];
  const seasonAlts = team ? pool.filter(s => s.teamId === team.teamId && s.id !== team.id) : [];        // same club, other season
  const teamAlts   = team ? pool.filter(s => s.teamId !== team.teamId && s.season === team.season) : []; // other club, same season
  const taken = new Set();   // by player NAME — the same person can't be taken twice
  [...(d.picks.host || []), ...(d.picks.guest || [])].forEach(p => taken.add(p.player));
  if (rs.host) taken.add(rs.host.player);
  if (rs.guest) taken.add(rs.guest.player);
  const myRR = (d.rerolls && d.rerolls[myRole]) || { team: 0, season: 0 };
  const isFirstNow = first === myRole && !rs[first];
  return {
    d, myRole, oppRole, round, first, picker, isMyTurn: picker === myRole, team, seasonAlts, teamAlts, taken, settings,
    myFmt: d.fmt[myRole], oppFmt: d.fmt[oppRole],
    myName: room.is_host ? room.host_name : room.guest_name,
    oppName: room.is_host ? room.guest_name : room.host_name,
    teamRerolls: myRR.team || 0, seasonRerolls: myRR.season || 0,
    canRerollTeam:   isFirstNow && (myRR.team || 0) > 0 && teamAlts.length > 0,
    canRerollSeason: isFirstNow && (myRR.season || 0) > 0 && seasonAlts.length > 0,
  };
}

// A full-width, readable pitch with positioned tokens. `isMe` makes it
// interactive (tap a slot to place/move); highlights reflect the current selection.
function duelPitchHTML(fmt, picks, isMe) {
  const slots = FORMATIONS[fmt].slots;
  const bySlot = new Map((picks || []).map(p => [p.slotId, p]));
  const selPlayer = (isMe && _duelSel && _duelSel.type === 'pick') ? _duelSel.player : null;
  const moveFrom  = (isMe && _duelSel && _duelSel.type === 'move') ? _duelSel.slotId : null;
  const tokens = slots.map(slot => {
    const pick = bySlot.get(slot.id);
    let cls = '';
    if (isMe && selPlayer && !pick && (_duelRelax || duelPosFits(selPlayer, slot.pos))) cls = ' hl';
    if (isMe && moveFrom) { if (slot.id === moveFrom) cls = ' selmove'; else if (pick) cls = ' hl'; }
    if (pick) {
      const sq = SQUADS.find(s => s.id === pick.squadId);
      const team = sq ? getTeam(sq.teamId) : { primaryColor: '#333', secondaryColor: '#fff' };
      const tx = textColorFor(team.primaryColor);
      return `<div class="slot-token filled${cls}" data-slot="${slot.id}" style="left:${slot.x}%;top:${slot.y}%;--tc:${team.primaryColor};--ts:${team.secondaryColor};--tx:${tx}">
        <div class="slot-circle filled-circle"><span class="slot-player-short">${dEsc(playerShortName(pick.player))}</span></div>
        <div class="slot-name-label">${dEsc(pick.player)}</div></div>`;
    }
    return `<div class="slot-token empty${cls}" data-slot="${slot.id}" style="left:${slot.x}%;top:${slot.y}%">
      <div class="slot-circle"><span class="slot-pos-label">${slot.pos}</span></div></div>`;
  }).join('');
  return `<div class="pitch duel-pitch ${isMe ? 'mine' : 'opp'}">${tokens}</div>`;
}

function renderDuelBoard(room) {
  showScreen('duel');
  _duelActive = true;
  const box = document.getElementById('duel-content');
  const st = duelBoardState(room);
  const myPicks = st.d.picks[st.myRole] || [];
  const oppPicks = st.d.picks[st.oppRole] || [];
  const myEmpties = FORMATIONS[st.myFmt].slots.filter(s => !myPicks.some(p => p.slotId === s.id));

  // Only offer players that fit an open slot; if none fit, relax the constraint.
  let listHtml = '';
  if (st.team && st.isMyTurn) {
    const avail = st.team.players.filter(pl => !st.taken.has(pl.name));
    const fitting = avail.filter(pl => myEmpties.some(s => duelPosFits(pl, s.pos)));
    _duelRelax = fitting.length === 0;
    _duelPickable = (_duelRelax ? avail : fitting).slice().sort((a, b) => duelPOvr(b, st.settings) - duelPOvr(a, st.settings));
    listHtml = _duelPickable.map((pl, i) => {
      const sel = _duelSel && _duelSel.type === 'pick' && _duelSel.player && _duelSel.player.name === pl.name;
      return `<button class="duel-pl ${sel ? 'sel' : ''}" data-i="${i}">
        <span class="duel-pl-pos">${dEsc(pl.position)}</span>
        <span class="duel-pl-name">${dEsc(pl.name)}</span>
        <span class="duel-pl-ovr">${duelPOvr(pl, st.settings)}</span></button>`;
    }).join('');
  }

  const teamLabel = st.team ? `${dEsc(getTeam(st.team.teamId).name)} · ${dEsc(st.team.season)}` : '';
  const turnBadge = st.isMyTurn
    ? `<span class="duel-turn me">🟢 תורך${st.first === st.myRole ? ' — אתה ראשון' : ''}</span>`
    : `<span class="duel-turn opp">⏳ תור ${dEsc(st.oppName || 'היריב')}…</span>`;
  const hint = !st.isMyTurn ? '' :
    _duelSel && _duelSel.type === 'pick' ? '👉 בחר משבצת פנויה במגרש שלך' :
    _duelSel && _duelSel.type === 'move' ? '⇄ בחר שחקן שני להחלפה' :
    _duelMove ? '⇄ בחר שני שחקנים כדי להחליף ביניהם' :
    (myPicks.length < 11 ? '👇 בחר שחקן מהרשימה, ואז משבצת במגרש' : '');

  box.innerHTML = `
    <button class="btn-draft-exit" id="duel-board-exit" style="margin-bottom:8px">← יציאה</button>
    <div class="duel-draft-top">${turnBadge}<span class="duel-prog">סבב ${Math.min(st.round + 1, 11)}/11</span></div>
    <div class="duel-team-panel">
      <div class="duel-team-name">⚽ ${teamLabel}</div>
      ${(st.canRerollTeam || st.canRerollSeason) ? `<div class="duel-reroll-row">
        ${st.canRerollTeam ? `<button class="duel-reroll-btn" id="duel-reroll-team">🔄 החלף קבוצה <span class="rr-badge">${st.teamRerolls}</span></button>` : ''}
        ${st.canRerollSeason ? `<button class="duel-reroll-btn" id="duel-reroll-season">📅 החלף עונה <span class="rr-badge">${st.seasonRerolls}</span></button>` : ''}
      </div>` : ''}
      ${st.isMyTurn ? `<div class="duel-pl-list">${listHtml || '<div class="page-note">—</div>'}</div>` : '<div class="duel-wait-note">היריב בוחר…</div>'}
      ${hint ? `<div class="duel-hint2">${hint}</div>` : ''}
    </div>
    <div class="duel-board-head">
      <span>הקבוצה שלך · ${myPicks.length}/11</span>
      ${st.isMyTurn && myPicks.length >= 2 ? `<button class="duel-move-btn ${_duelMove ? 'on' : ''}" id="duel-move">⇄ הזז</button>` : ''}
    </div>
    <div class="duel-pitch-wrap">${duelPitchHTML(st.myFmt, myPicks, true)}</div>
    <div class="duel-board-head opp"><span>${dEsc(st.oppName || 'יריב')} · ${oppPicks.length}/11</span></div>
    <div class="duel-pitch-wrap opp">${duelPitchHTML(st.oppFmt, oppPicks, false)}</div>
    <button class="lg-leave" id="duel-leave">עזוב דואל</button>`;

  document.getElementById('duel-board-exit').onclick = () => duelForfeit();
  document.getElementById('duel-leave').onclick = () => duelForfeit();
  const rrT = document.getElementById('duel-reroll-team'); if (rrT) rrT.onclick = () => duelReroll(room, 'team');
  const rrS = document.getElementById('duel-reroll-season'); if (rrS) rrS.onclick = () => duelReroll(room, 'season');
  const mv = document.getElementById('duel-move'); if (mv) mv.onclick = () => { _duelMove = !_duelMove; _duelSel = null; renderDuel(room); };
  if (st.isMyTurn) {
    box.querySelectorAll('.duel-pl').forEach(btn => btn.onclick = () => duelPlayerClick(room, +btn.dataset.i));
    box.querySelectorAll('.duel-pitch-wrap:not(.opp) .slot-token').forEach(tok => tok.onclick = () => duelSlotClick(room, tok.dataset.slot));
  }
}

function duelPlayerClick(room, i) {
  const pl = _duelPickable[i]; if (!pl) return;
  _duelMove = false;
  _duelSel = (_duelSel && _duelSel.type === 'pick' && _duelSel.player.name === pl.name) ? null : { type: 'pick', player: pl };
  renderDuel(room);
}

async function duelSlotClick(room, slotId) {
  const st = duelBoardState(room);
  if (!st.isMyTurn) return;
  const myPicks = st.d.picks[st.myRole] || [];
  const occupied = myPicks.some(p => p.slotId === slotId);
  const slot = FORMATIONS[st.myFmt].slots.find(s => s.id === slotId);

  if (_duelSel && _duelSel.type === 'pick') {
    if (occupied || !st.team) return;
    if (!_duelRelax && !duelPosFits(_duelSel.player, slot.pos)) return;
    const pl = _duelSel.player; _duelSel = null;
    const pick = { round: st.round, squadId: st.team.id, player: pl.name, slotId, pos: slot.pos, ovr: duelPOvr(pl, st.settings) };
    if (room._local) { duelLocalPick(room, pick); return; }
    await _supabase.rpc('duel_draft_pick', { p_code: room.code, p_pick: pick });
    await refreshDuelRoom();   // show the pick immediately, don't wait for the realtime echo
    return;
  }
  if (_duelMove) {
    if (_duelSel && _duelSel.type === 'move') {
      const from = _duelSel.slotId; _duelSel = null;
      if (from !== slotId && occupied) duelMove(room, from, slotId); else renderDuel(room);
    } else if (occupied) {
      _duelSel = { type: 'move', slotId }; renderDuel(room);
    }
  }
}

async function duelMove(room, a, b) {
  if (room._local) { duelLocalMove(room, a, b); return; }
  await _supabase.rpc('duel_move', { p_code: room.code, p_a: a, p_b: b });
}
function duelLocalMove(room, a, b) {
  const picks = room.draft.picks[room.is_host ? 'host' : 'guest'] || [];
  const pa = picks.find(p => p.slotId === a), pb = picks.find(p => p.slotId === b);
  if (pa && pb) {
    const s = pa.slotId, ps = pa.pos; pa.slotId = pb.slotId; pa.pos = pb.pos; pb.slotId = s; pb.pos = ps;
  }
  renderDuel(room);
}
async function duelReroll(room, mode) {
  const st = duelBoardState(room);
  const alts = mode === 'season' ? st.seasonAlts : st.teamAlts;   // season: same club · team: same season
  if (!alts.length) return;
  const squadId = alts[Math.floor(Math.random() * alts.length)].id;
  if (room._local) { duelLocalReroll(room, mode, squadId); return; }
  const { error } = await _supabase.rpc('duel_reroll', { p_code: room.code, p_mode: mode, p_squad: squadId });
  if (error) console.warn('duel_reroll:', error.message);
}

// ─── Rock-paper-scissors for the final round ───────────────────────────────────
function renderDuelRPS(room) {
  showScreen('duel');
  _duelActive = true;
  const box = document.getElementById('duel-content');
  const myRole = room.is_host ? 'host' : 'guest';
  const rps = room.draft.rps || {};
  const myChoice = rps[myRole];
  if (myChoice && !rps.tie) {
    box.innerHTML = `<div class="lgsim-hero"><div class="lgsim-hero-title">בחרת ${rpsHe(myChoice)}</div>
      <div class="lgsim-hero-sub">ממתין ליריב…</div><div class="duel-wait-spin">✊</div></div>`;
    return;
  }
  box.innerHTML = `
    <div class="section-label" style="margin-top:8px">🎮 אבן · נייר · מספריים</div>
    <p class="page-note" style="text-align:center">הזוכה בוחר ראשון בסבב האחרון (ה-11)</p>
    ${rps.tie ? '<div class="duel-hint" style="color:#f59e0b">תיקו! שחקו שוב</div>' : ''}
    <div class="duel-rps-row">
      <button class="duel-rps-btn" data-c="rock">✊<br>אבן</button>
      <button class="duel-rps-btn" data-c="paper">✋<br>נייר</button>
      <button class="duel-rps-btn" data-c="scissors">✌<br>מספריים</button>
    </div>`;
  box.querySelectorAll('.duel-rps-btn').forEach(b => b.onclick = () => duelRPS(room, b.dataset.c));
}
async function duelRPS(room, choice) {
  if (room._local) { duelLocalRPS(room, choice); return; }
  await _supabase.rpc('duel_rps', { p_code: room.code, p_choice: choice });
}

// ─── Reveal: normal results (opponent in the table) + duel summary ─────────────
function duelPicksToSquad(picks, fmt) {
  const players = (picks || []).map(p => {
    const sq = SQUADS.find(s => s.id === p.squadId);
    return { teamId: sq?.teamId, season: sq?.season, name: p.player, pos: p.pos, ovr: p.ovr, slotId: p.slotId };
  });
  const ovr = players.length ? Math.round(players.reduce((s, p) => s + p.ovr, 0) / players.length) : 70;
  return { formation: fmt, ovr, players };
}
// A team's raw season (records only) — used to build both league tables.
function duelRawSeason(squad) {
  const g = generateMatches(squad.ovr);
  let w = 0, d = 0, gf = 0, ga = 0;
  g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; gf += m.gf; ga += m.ga; });
  return { g, w, d, l: g.matches.length - w - d, gf, ga, pts: w * 3 + d, inTopSix: g.inTopSix };
}
// A team's personal season (matches + stats) for the results screen.
function duelBuildPersonal(squad, raw, settings) {
  lgReconstructState(squad.players, squad.formation, settings);   // for simulatePlayerStats / pitch
  let proj = 8; try { proj = calcPreseasonOdds(squad.ovr, 40).projectedFinish; } catch (e) {}
  return { ovr: squad.ovr, matches: raw.g.matches, inTopSix: raw.g.inTopSix,
           playerStats: simulatePlayerStats(raw.g.matches), projectedFinish: proj, pts: raw.pts };
}
// ONE combined 14-team league table (both real teams + 12 AI), identical for both
// players — so the whole table (not just the two of them) is in sync.
function duelCombinedTable(hRaw, gRaw, hostName, guestName) {
  const aiRows = IL_TEAMS_SIM.slice(0, 12).map(t => {
    const winP = Math.max(0.1, Math.min(0.85, 0.47 + (t.ovr - 78) * WINP_SLOPE));
    const est  = Math.max(20, Math.round((winP * 3 + 0.2) * 34 + rand(-5, 5)));   // ~34-game points
    const d = rand(4, 9);
    const w = Math.max(0, Math.min(34 - d, Math.round((est - d) / 3)));
    return { name: t.name, role: null, pts: w * 3 + d, w, d, l: Math.max(0, 34 - w - d) };
  });
  const real = [
    { name: 'הקבוצה של ' + (hostName || 'מארח'),  role: 'host',  pts: hRaw.pts, w: hRaw.w, d: hRaw.d, l: hRaw.l },
    { name: 'הקבוצה של ' + (guestName || 'יריב'), role: 'guest', pts: gRaw.pts, w: gRaw.w, d: gRaw.d, l: gRaw.l },
  ];
  return [...real, ...aiRows].sort((a, b) => b.pts - a.pts || b.w - a.w);
}
function duelComputeResult(hostSquad, guestSquad, hostName, guestName, settings) {
  const hRaw = duelRawSeason(hostSquad), gRaw = duelRawSeason(guestSquad);
  return {
    table: duelCombinedTable(hRaw, gRaw, hostName, guestName),
    host:  duelBuildPersonal(hostSquad,  hRaw, settings),
    guest: duelBuildPersonal(guestSquad, gRaw, settings),
  };
}

// Reveal is computed ONCE and stored in the room; both clients render the same
// stored result, so the two seasons/tables are always in sync.
async function startDuelReveal(room) {
  if (_duelRevealed) return;
  _duelRevealed = true;
  const myRole = room.is_host ? 'host' : 'guest';
  const oppRole = myRole === 'host' ? 'guest' : 'host';
  const d = room.draft;
  if (!d.picks?.[myRole]?.length || !d.picks?.[oppRole]?.length) { _duelRevealed = false; return; }
  const settings = room.settings || {};
  const hostSquad = duelPicksToSquad(d.picks.host, d.fmt.host);
  const guestSquad = duelPicksToSquad(d.picks.guest, d.fmt.guest);

  let result = d.result;
  if (!result) {
    result = duelComputeResult(hostSquad, guestSquad, room.host_name, room.guest_name, settings);
    if (!room._local) {
      await _supabase.rpc('duel_set_result', { p_code: room.code, p_result: result });   // first writer wins
      const { data } = await _supabase.rpc('get_duel_room', { p_code: room.code });
      result = data?.[0]?.draft?.result || result;                                        // use the authoritative copy
    }
  }
  duelRenderResult(room, result, myRole, oppRole);
}

function duelRenderResult(room, result, myRole, oppRole) {
  const mySeason = result[myRole], oppSeason = result[oppRole];
  const myPts = mySeason.pts, oppPts = oppSeason.pts;
  const myName = myRole === 'host' ? room.host_name : room.guest_name;
  const oppName = oppRole === 'host' ? room.host_name : room.guest_name;
  const mySquad = duelPicksToSquad(room.draft.picks[myRole], room.draft.fmt[myRole]);
  const oppSquad = duelPicksToSquad(room.draft.picks[oppRole], room.draft.fmt[oppRole]);

  _duelActive = false;
  if (typeof getCurrentUser === 'function' && getCurrentUser()) {
    const outcome = myPts > oppPts ? 'win' : myPts < oppPts ? 'loss' : 'draw';
    _supabase.rpc('record_duel_outcome', { p_outcome: outcome }).then(() => {}, () => {});
  }

  lgReconstructState(mySquad.players, mySquad.formation, room.settings || {});   // my pitch/OVR
  // Shared table, marked/renamed for THIS viewer (my row = "הקבוצה שלי").
  const table = result.table
    ? result.table.map(r => {
        const isMe = r.role === myRole, isOpp = r.role === oppRole;
        return { name: isMe ? 'הקבוצה שלי' : (isOpp ? ('הקבוצה של ' + (oppName || 'יריב')) : r.name),
                 pts: r.pts, w: r.w, d: r.d, l: r.l, us: isMe };
      })
    : mySeason.leagueTable;   // legacy result (pre-shared-table)
  window._presetSeason = { ...mySeason, leagueTable: table };
  window._duelReviewMode = { mySquad, oppSquad, myName, oppName, myPts, oppPts };
  state.duelCode = null; state.leagueCode = null;
  duelClearPersist();
  closeDuelRealtime(); _botRoom = null;
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
  bar.innerHTML = `<button class="duel-chrome-summary" id="duel-chrome-open" style="color:${color}">🆚 ${label} · ${d.myPts}–${d.oppPts}</button>
    <button class="duel-chrome-exit" id="duel-chrome-exit">יציאה</button>`;
  document.getElementById('screen-results')?.appendChild(bar);
  document.getElementById('duel-chrome-open').onclick = showDuelSummary;
  document.getElementById('duel-chrome-exit').onclick = () => { bar.remove(); window._duelReviewMode = null; showDuel(); };
  setTimeout(showDuelSummary, 4600);
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
      <div class="duel-sum-score" dir="ltr"><b>${dEsc(d.myName || 'אתה')}</b> ${d.myPts} — ${d.oppPts} <b>${dEsc(d.oppName || 'יריב')}</b></div>
      <div class="duel-sum-ovr">OVR ${d.mySquad.ovr} · ${d.oppSquad.ovr}</div>
      <button class="btn-primary btn-full" id="duel-sum-opp">👁 צפה בהרכב היריב</button>
      <button class="btn-primary btn-full" id="duel-sum-close" style="margin-top:6px">לצפייה בתוצאות שלך ←</button>
    </div>`;
  modal.querySelector('#duel-sum-opp').onclick = () => {
    modal.style.display = 'none';   // close the summary so the squad modal isn't stacked under it
    showLeagueSquad(d.oppSquad.players.map(p => ({ pos: p.pos, name: p.name, ovr: p.ovr })), 'הקבוצה של ' + (d.oppName || 'יריב'));
  };
  modal.querySelector('#duel-sum-close').onclick = () => { modal.style.display = 'none'; };
  modal.style.display = 'flex';
}

// ─── Quick match + local bot ───────────────────────────────────────────────────
async function quickMatchFlow() {
  duelMsg('מחפש יריב עם אותם תנאים…', true);
  const { data, error } = await _supabase.rpc('quick_match', { p_settings: { ..._quickSettings, ratings_visible: true } });
  if (error || !data?.length) { duelMsg('החיפוש נכשל, נסו שוב', false); return; }
  const { code, role } = data[0];
  await openDuelRoom(code);
  if (role === 'host') {
    clearTimeout(_quickBotTimer);
    _quickBotTimer = setTimeout(async () => {
      const { data: dd } = await _supabase.rpc('get_duel_room', { p_code: code });
      if (dd?.[0]?.guest_name) return;
      const settings = dd?.[0]?.settings || { ..._quickSettings, ratings_visible: true };
      await _supabase.rpc('leave_duel_room', { p_code: code });
      startBotDuel(settings);
    }, 10000);
  }
}

// A bot game runs entirely locally, but presents like a real opponent: it joins
// the lobby under a nickname and takes a moment to press "ready".
function startBotDuel(settings) {
  closeDuelRealtime();
  _duelRevealed = false;
  const nick = duelBotNick();
  _botRoom = {
    _local: true, code: null, is_host: true,
    host_name: document.getElementById('nav-username')?.textContent?.trim() || 'אתה',
    guest_name: null, host_ready: false, guest_ready: false,
    seed: Math.floor(Math.random() * 2147483646),
    status: 'waiting',
    settings: settings && Object.keys(settings).length ? { ...settings, ratings_visible: true }
                                                       : { difficulty: 'normal', peak_mode: false, ratings_visible: true },
    draft: {},
  };
  renderDuel(_botRoom);
  setTimeout(() => {                                   // opponent "joins"
    if (!_botRoom) return;
    _botRoom.guest_name = nick;
    if (_botRoom.status === 'waiting') renderDuel(_botRoom);
    setTimeout(() => {                                 // opponent "readies up"
      if (!_botRoom) return;
      _botRoom.guest_ready = true;
      duelLocalMaybeStart(_botRoom);
      if (_botRoom.status === 'waiting' || _botRoom.status === 'ready') renderDuel(_botRoom);
    }, 1300 + Math.random() * 1600);
  }, 900 + Math.random() * 1500);
}

// Both sides ready in a local (bot) game → begin the formation phase.
function duelLocalMaybeStart(room) {
  if (room.host_ready && room.guest_ready && room.status === 'waiting') {
    room.status = 'ready';
    room.draft = { phase: 'formation', fmt: {}, round: 0, cursor: 0, rr: 0, picks: { host: [], guest: [] }, roundState: {}, rps: {} };
  }
}

// local mirrors of the server rules (host = human, guest = bot)
function duelLocalFormation(room, fmt) {
  room.draft.fmt.host = fmt;
  room.draft.fmt.guest = duelBotFormation();
  room.draft.phase = 'draft';
  const cnt = ({ easy: 3, normal: 1, hard: 0 })[room.settings?.difficulty] ?? 1;
  room.draft.rerolls = { host: { team: cnt, season: cnt }, guest: { team: cnt, season: cnt } };
  duelLocalBotAdvance(room);
}
function duelBotFormation() {
  const keys = Object.keys(FORMATIONS);
  return keys[Math.floor(Math.random() * keys.length)];
}
function duelLocalReroll(room, mode, squadId) {
  const st = duelBoardState(room);
  const key = mode === 'season' ? 'season' : 'team';
  if (key === 'season' ? !st.canRerollSeason : !st.canRerollTeam) return;
  if (squadId) room.draft.squadId = squadId;    // both swap types land on a chosen squad
  room.draft.rerolls[st.myRole][key] = (room.draft.rerolls[st.myRole][key] || 0) - 1;
  renderDuel(room);
}
function duelLocalPick(room, pick) {
  duelLocalApplyPick(room, 'host', pick);
  duelLocalBotAdvance(room);
}
function duelLocalRPS(room, choice) {
  const bot = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
  if (choice === bot) { room.draft.rps = { tie: true }; renderDuel(room); return; }
  const hostWins = (choice === 'rock' && bot === 'scissors') || (choice === 'scissors' && bot === 'paper') || (choice === 'paper' && bot === 'rock');
  room.draft.rps = { decided: hostWins ? 'host' : 'guest', host: choice, guest: bot };
  room.draft.phase = 'draft';
  duelLocalBotAdvance(room);
}
// apply a pick to local state and advance the round if both picked
function duelLocalApplyPick(room, role, pick) {
  const d = room.draft;
  d.roundState[role] = pick;
  if (d.roundState.host && d.roundState.guest) {
    d.picks.host.push(d.roundState.host);
    d.picks.guest.push(d.roundState.guest);
    d.round++; d.cursor++; d.rr = 0; d.roundState = {}; delete d.squadId;
    if (d.round >= 11) d.phase = 'done';
    else if (d.round === 10) { d.phase = 'rps'; d.rps = {}; }
  }
}
// run the bot's moves until it's the human's turn again (or done)
function duelLocalBotAdvance(room) {
  const d = room.draft;
  let guard = 0;
  while (guard++ < 40) {
    if (d.phase === 'done') break;
    if (d.phase === 'rps') {
      if (!d.rps.guest && !d.rps.decided) { /* wait for human */ break; }
      break;
    }
    const st = duelBoardState(room);
    if (st.picker !== 'guest') break;          // human's turn (or first & human)
    // bot picks highest available for its formation
    const bp = duelBotPick(room);
    if (!bp) break;
    duelLocalApplyPick(room, 'guest', bp);
  }
  renderDuel(room);
}
function duelBotPick(room) {
  const st = duelBoardState(room);
  if (!st.team) return null;
  const slots = FORMATIONS[st.oppFmt].slots;   // oppFmt = guest (bot) formation from host's perspective
  const filled = new Set((room.draft.picks.guest || []).map(p => p.slotId));
  const empties = slots.filter(s => !filled.has(s.id));
  const avail = st.team.players.filter(pl => !st.taken.has(st.team.id + '|' + pl.name));
  const fitting = avail.filter(pl => empties.some(s => duelPosFits(pl, s.pos)));
  const cand = (fitting.length ? fitting : avail).slice().sort((a, b) => duelPOvr(b, st.settings) - duelPOvr(a, st.settings))[0];
  if (!cand) return null;
  const slot = empties.find(s => duelPosFits(cand, s.pos)) || empties[0];
  if (!slot) return null;
  return { round: st.round, squadId: st.team.id, player: cand.name, slotId: slot.id, pos: slot.pos, ovr: duelPOvr(cand, st.settings) };
}

// On load: an invite link (/?duel=CODE) auto-joins that room; otherwise, if a
// game was in progress, a refresh rejoins it (keeps you in the match).
function duelOpenWhenReady(code, isInvite) {
  let tries = 0;
  const tick = () => {
    if (typeof getCurrentUser === 'function' && getCurrentUser()) {
      showDuel();
      if (isInvite) {
        _supabase.rpc('join_duel_room', { p_code: code }).then(({ error }) => {
          if (!error) openDuelRoom(code);
          else { renderDuelHome(); duelMsg(error.message.includes('full') ? 'החדר מלא' : 'לא נמצא חדר עם הקוד הזה', false); }
        }, () => renderDuelHome());
      } else {
        _supabase.rpc('get_duel_room', { p_code: code }).then(({ data }) => {
          if (data?.[0] && data[0].status !== 'done') openDuelRoom(code);
          else duelClearPersist();
        }, () => {});
      }
      return;
    }
    if (++tries < 30) setTimeout(tick, 400);   // wait up to ~12s for auth to resolve
  };
  setTimeout(tick, 700);
}
document.addEventListener('DOMContentLoaded', () => {
  const m = /[?&]duel=([A-Za-z0-9]{4})/.exec(location.search);
  const invite = m ? m[1].toUpperCase() : null;
  let saved = null; try { saved = localStorage.getItem(DUEL_PERSIST_KEY); } catch (e) {}
  const target = invite || saved;
  if (!target) return;
  _pendingDuelCode = invite;
  duelOpenWhenReady(target, !!invite);
});
