// ─── Leagues with friends (async, one-shot per member) ─────────────────────────
// Create/join a fixed-size league with shared settings; each member plays one
// dedicated league draft; the table is final once everyone has played.

function lgEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let _lgCreate = { max: 6, difficulty: 'normal', peak: false, ratings: true };
let _pendingLeagueCode = null;

async function showLeagues() {
  showScreen('leagues');
  document.getElementById('leagues-back').onclick = () => showScreen('welcome');
  renderLeaguesHome();
}

async function renderLeaguesHome() {
  const box = document.getElementById('leagues-content');
  const user = getCurrentUser();

  if (!user) {
    box.innerHTML = `
      <p class="page-note">התחבר כדי ליצור ליגה, להצטרף לחברים ולראות מי בנה את ההרכב הכי טוב.</p>
      <button class="btn-primary lg-login-btn" id="lg-login">התחבר</button>`;
    document.getElementById('lg-login').onclick = () =>
      document.getElementById('auth-modal').style.display = 'flex';
    return;
  }

  box.innerHTML = `
    <div class="lg-card">
      <div class="lg-card-title">➕ צור ליגה חדשה</div>
      <div class="lg-row">
        <input id="lg-create-name" class="lg-input" maxlength="40" placeholder="שם הליגה (למשל: החבר'ה מהעבודה)">
      </div>
      <div class="lg-config">
        <div class="lg-config-row"><span>מספר מקומות</span>
          <input id="lg-max" class="lg-input lg-max-input" type="number" min="2" max="30" value="${_lgCreate.max}"></div>
        <div class="lg-config-row"><span>קושי</span>
          <div class="lg-mini" id="lg-diff">
            <button data-v="easy">קל</button><button data-v="normal">רגיל</button><button data-v="hard">קשה</button>
          </div></div>
        <div class="lg-config-row"><span>מצב שיא ⚡</span>
          <div class="lg-mini" id="lg-peak"><button data-v="off">כבוי</button><button data-v="on">פעיל</button></div></div>
        <div class="lg-config-row"><span>דירוגים</span>
          <div class="lg-mini" id="lg-ratings"><button data-v="on">גלויים</button><button data-v="off">מוסתרים</button></div></div>
      </div>
      <button class="btn-primary lg-btn" id="lg-create-btn" style="width:100%">צור ליגה</button>
    </div>
    <div class="lg-card">
      <div class="lg-card-title">🔑 הצטרף בקוד</div>
      <div class="lg-row">
        <input id="lg-join-code" class="lg-input lg-code-input" maxlength="6" placeholder="קוד ליגה" dir="ltr" value="${lgEsc(_pendingLeagueCode || '')}">
        <button class="btn-primary lg-btn" id="lg-join-btn">הצטרף</button>
      </div>
    </div>
    <div id="lg-msg" class="lg-msg"></div>
    <div class="section-label" style="margin-top:18px">הליגות שלי</div>
    <div id="lg-my" class="lg-my"><div class="page-loading">טוען...</div></div>`;

  // wire mini toggles
  const wireMini = (id, cur, cb) => {
    const el = document.getElementById(id);
    el.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === cur);
      b.onclick = () => { el.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); cb(b.dataset.v); };
    });
  };
  wireMini('lg-diff', _lgCreate.difficulty, v => _lgCreate.difficulty = v);
  wireMini('lg-peak', _lgCreate.peak ? 'on' : 'off', v => _lgCreate.peak = v === 'on');
  wireMini('lg-ratings', _lgCreate.ratings ? 'on' : 'off', v => _lgCreate.ratings = v === 'on');
  document.getElementById('lg-max').oninput = e => _lgCreate.max = Math.max(2, Math.min(30, +e.target.value || 6));

  document.getElementById('lg-create-btn').onclick = createLeagueFlow;
  document.getElementById('lg-join-btn').onclick   = joinLeagueFlow;
  if (_pendingLeagueCode) { lgMsg('נמצא קוד הזמנה — לחצו "הצטרף"', true); _pendingLeagueCode = null; }
  loadMyLeagues();
}

function lgMsg(text, ok) {
  const el = document.getElementById('lg-msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'lg-msg ' + (ok ? 'ok' : 'err');
}

async function createLeagueFlow() {
  const name = document.getElementById('lg-create-name').value.trim();
  if (name.length < 2) { lgMsg('בחר שם ליגה (2 תווים לפחות)', false); return; }
  const settings = {
    difficulty: _lgCreate.difficulty, peak_mode: _lgCreate.peak,
    ratings_visible: _lgCreate.ratings, draft_mode: 'squad-first',
  };
  const { data, error } = await _supabase.rpc('create_league', { p_name: name, p_max: _lgCreate.max, p_settings: settings });
  if (error) { lgMsg('יצירת הליגה נכשלה: ' + error.message, false); return; }
  openLeague(data);
}

async function joinLeagueFlow() {
  const code = document.getElementById('lg-join-code').value.trim().toUpperCase();
  if (code.length < 4) { lgMsg('הכנס קוד ליגה תקין', false); return; }
  const { data, error } = await _supabase.rpc('join_league', { p_code: code });
  if (error) {
    const m = error.message.includes('full') ? 'הליגה מלאה' :
              error.message.includes('not found') ? 'לא נמצאה ליגה עם הקוד הזה' : 'ההצטרפות נכשלה';
    lgMsg(m, false); return;
  }
  openLeague(code);
}

async function loadMyLeagues() {
  const my = document.getElementById('lg-my');
  if (!my) return;
  const { data, error } = await _supabase.rpc('get_my_leagues');
  if (error) { my.innerHTML = '<div class="page-note">טעינה נכשלה</div>'; return; }
  if (!data?.length) { my.innerHTML = '<div class="page-note">עדיין אינך חבר באף ליגה. צור אחת או הצטרף בקוד.</div>'; return; }
  my.innerHTML = '';
  data.forEach(l => {
    const item = document.createElement('button');
    item.className = 'lg-item';
    item.innerHTML = `
      <span class="lg-item-name">${lgEsc(l.name)}</span>
      <span class="lg-item-meta"><span class="lg-item-code" dir="ltr">${lgEsc(l.code)}</span> · ${l.members} 👥</span>`;
    item.onclick = () => openLeague(l.code);
    my.appendChild(item);
  });
}

async function openLeague(code) {
  const box = document.getElementById('leagues-content');
  box.innerHTML = '<div class="page-loading">טוען טבלה...</div>';
  const [{ data: info }, { data, error }] = await Promise.all([
    _supabase.rpc('get_league_info', { p_code: code }),
    _supabase.rpc('get_league_standings', { p_code: code }),
  ]);
  if (error || !info?.length) { box.innerHTML = '<div class="page-note">טעינת הליגה נכשלה</div>'; return; }
  const meta = info[0];
  const complete = meta.is_complete;
  const members = [...(data ?? [])];

  // Status line + play button
  let statusHtml, playHtml = '';
  if (complete) {
    statusHtml = `<div class="lg-status complete">🏆 הליגה הסתיימה — הטבלה מוכנה לחשיפה!</div>`;
  } else {
    statusHtml = `<div class="lg-status">${meta.members}/${meta.max_players} שחקנים · ${meta.played_count} סיימו דראפט
      <br><span class="lg-status-hint">🔒 הטבלה תיחשף כשכל השחקנים יסיימו</span></div>`;
  }
  if (meta.is_member) {
    if (meta.has_played) {
      playHtml = `<div class="lg-played-badge">✓ שלחת את ההרכב — בהצלחה! 🤞</div>`;
    } else {
      playHtml = `<button class="btn-primary lg-play" id="lg-play">⚽ שחק את הדראפט שלך לליגה</button>`;
    }
  }

  let html = `
    <button class="back-btn lg-inner-back" id="lg-back-home">→ הליגות שלי</button>
    <div class="lg-league-name">${lgEsc(meta.name)}</div>
    <div class="lg-share">
      <span class="lg-share-lbl">קוד הליגה:</span>
      <span class="lg-share-code" id="lg-share-code" dir="ltr">${lgEsc(code)}</span>
      <button class="lg-copy" id="lg-copy">העתק הזמנה</button>
    </div>
    ${statusHtml}
    ${playHtml}
    <div class="section-label" style="margin-top:14px">טבלת הליגה</div>
    <div id="lg-table-area"></div>`;
  if (meta.is_member) html += `<button class="lg-leave" id="lg-leave">עזוב ליגה</button>`;
  box.innerHTML = html;

  document.getElementById('lg-back-home').onclick = renderLeaguesHome;
  document.getElementById('lg-copy').onclick = async () => {
    const link = location.origin + '/?league=' + code;
    try { await navigator.clipboard.writeText(link); document.getElementById('lg-copy').textContent = '✓ הועתק'; }
    catch (e) { document.getElementById('lg-copy').textContent = code; }
  };
  const playBtn = document.getElementById('lg-play');
  if (playBtn) playBtn.onclick = () => startLeagueDraft(code, meta.settings);
  const leaveBtn = document.getElementById('lg-leave');
  if (leaveBtn) leaveBtn.onclick = () => leaveLeagueFlow(code);

  const area = document.getElementById('lg-table-area');
  if (complete) {
    const myName = (document.getElementById('nav-username')?.textContent || '').trim();
    renderLeagueComplete(area, code, members, myName);
  } else {
    renderLeagueWaiting(area, members);
  }
}

// Before the league is complete: show only who's ready vs. still drafting —
// no points, no order, no squads. The suspense is the whole point.
function renderLeagueWaiting(area, members) {
  if (!members.length) { area.innerHTML = '<div class="page-note">אין עדיין חברים בליגה</div>'; return; }
  let h = '<div class="lb-table lg-table lg-masked">';
  members.forEach(r => {
    const played = r.points != null;
    h += `
      <div class="lb-row">
        <span class="lb-rank">·</span>
        <span class="lb-name">הקבוצה של ${lgEsc(r.username ?? 'אנונימי')}</span>
        <span class="lg-chip ${played ? 'done' : 'wait'}">${played ? '✓ מוכן' : '⏳ ממתין'}</span>
      </div>`;
  });
  h += '</div>';
  area.innerHTML = h;
}

// (The completed-league view is rendered by renderLeagueComplete in league-sim.js:
//  a full shared Ligat Ha'al season the members watch, then a members-only table.)

async function leaveLeagueFlow(code) {
  if (!confirm('לעזוב את הליגה? לא תוכל לחזור אליה ללא הקוד.')) return;
  await _supabase.rpc('leave_league', { p_code: code });
  renderLeaguesHome();
}

function showLeagueSquad(players, title) {
  const modal = document.getElementById('squad-modal');
  document.getElementById('squad-modal-title').textContent = title;
  const pitch = document.getElementById('squad-modal-pitch');
  const list = document.createElement('div');
  list.className = 'squad-player-list';
  [...players].sort((a, b) => (b.ovr ?? 0) - (a.ovr ?? 0)).forEach(p => {
    const item = document.createElement('div');
    item.className = 'squad-player-item';
    item.innerHTML = `
      <span class="sq-pos">${lgEsc(p.pos)}</span>
      <span class="sq-name">${lgEsc(p.name)}</span>
      <span class="sq-ovr">${lgEsc(p.ovr)}</span>`;
    list.appendChild(item);
  });
  pitch.innerHTML = '';
  pitch.appendChild(list);
  document.getElementById('squad-modal-close').onclick = () => modal.style.display = 'none';
  modal.style.display = 'flex';
}

// One-time notice: the first time a member connects after their league has been
// played out by everyone, pop a heads-up so they don't have to keep checking.
const LG_SEEN_KEY = '36-0-lg-complete-seen';
function lgSeenSet() { try { return new Set(JSON.parse(localStorage.getItem(LG_SEEN_KEY) || '[]')); } catch (e) { return new Set(); } }
function lgSaveSeen(set) { try { localStorage.setItem(LG_SEEN_KEY, JSON.stringify([...set])); } catch (e) {} }

async function maybeNotifyLeagueComplete() {
  if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
  const { data, error } = await _supabase.rpc('get_my_leagues');
  if (error || !data?.length) return;
  const seen = lgSeenSet();
  const fresh = data.filter(l => l.is_complete && !seen.has(l.code));
  if (!fresh.length) return;
  fresh.forEach(l => seen.add(l.code));
  lgSaveSeen(seen);
  showLeagueCompletePopup(fresh);
}

function showLeagueCompletePopup(leagues) {
  let modal = document.getElementById('lg-complete-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lg-complete-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  const names = leagues.map(l => `<div class="lgc-name">🏆 ${lgEsc(l.name)}</div>`).join('');
  modal.innerHTML = `
    <div class="modal-box placement-box">
      <div class="placement-tier" style="color:#22c55e">הליגה הסתיימה! 🎉</div>
      <div class="placement-sub">${leagues.length > 1 ? 'הליגות הבאות מוכנות לחשיפה — כל השחקנים סיימו:' : 'כל השחקנים סיימו את הדראפט — הטבלה מוכנה לחשיפה:'}</div>
      ${names}
      <button class="btn-primary btn-full" id="lgc-go">לחשיפת הטבלה ←</button>
      <button class="lg-leave" id="lgc-close" style="margin-top:8px">אחר כך</button>
    </div>`;
  modal.querySelector('#lgc-go').onclick = () => {
    modal.style.display = 'none';
    showLeagues();
    if (leagues.length === 1) setTimeout(() => openLeague(leagues[0].code), 60);
  };
  modal.querySelector('#lgc-close').onclick = () => { modal.style.display = 'none'; };
  modal.style.display = 'flex';
}

// Invite link: /?league=CODE opens the leagues screen with the code ready to join.
document.addEventListener('DOMContentLoaded', () => {
  const m = /[?&]league=([A-Za-z0-9]{4,8})/.exec(location.search);
  if (!m) return;
  _pendingLeagueCode = m[1].toUpperCase();
  setTimeout(() => { if (typeof showLeagues === 'function') showLeagues(); }, 1400);
});
