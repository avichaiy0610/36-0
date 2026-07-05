// ─── Leagues with friends (async) ──────────────────────────────────────────────
// Players join a league by code, keep playing the normal game, and a shared
// table ranks each member by their best season. All server logic is in RPCs.

function lgEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

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
    <div class="lg-actions">
      <div class="lg-card">
        <div class="lg-card-title">➕ צור ליגה חדשה</div>
        <div class="lg-row">
          <input id="lg-create-name" class="lg-input" maxlength="40" placeholder="שם הליגה (למשל: החבר'ה מהעבודה)">
          <button class="btn-primary lg-btn" id="lg-create-btn">צור</button>
        </div>
      </div>
      <div class="lg-card">
        <div class="lg-card-title">🔑 הצטרף בקוד</div>
        <div class="lg-row">
          <input id="lg-join-code" class="lg-input lg-code-input" maxlength="6" placeholder="קוד ליגה" dir="ltr">
          <button class="btn-primary lg-btn" id="lg-join-btn">הצטרף</button>
        </div>
      </div>
    </div>
    <div id="lg-msg" class="lg-msg"></div>
    <div class="section-label" style="margin-top:18px">הליגות שלי</div>
    <div id="lg-my" class="lg-my"><div class="page-loading">טוען...</div></div>`;

  document.getElementById('lg-create-btn').onclick = createLeagueFlow;
  document.getElementById('lg-join-btn').onclick   = joinLeagueFlow;
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
  const { data, error } = await _supabase.rpc('create_league', { p_name: name });
  if (error) { lgMsg('יצירת הליגה נכשלה: ' + error.message, false); return; }
  lgMsg('הליגה נוצרה! הקוד: ' + data, true);
  loadMyLeagues();
  openLeague(data);
}

async function joinLeagueFlow() {
  const code = document.getElementById('lg-join-code').value.trim().toUpperCase();
  if (code.length < 4) { lgMsg('הכנס קוד ליגה תקין', false); return; }
  const { data, error } = await _supabase.rpc('join_league', { p_code: code });
  if (error) { lgMsg(error.message.includes('not found') ? 'לא נמצאה ליגה עם הקוד הזה' : 'ההצטרפות נכשלה', false); return; }
  lgMsg('הצטרפת לליגה "' + data + '" ✓', true);
  loadMyLeagues();
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
  if (error) { box.innerHTML = '<div class="page-note">טעינת הטבלה נכשלה</div>'; return; }
  const meta = info?.[0] ?? {};

  // Ligat Ha'al table: everyone's league team together, ranked by points then OVR.
  const rows = [...(data ?? [])].sort((a, b) => {
    const ap = a.points ?? -1, bp = b.points ?? -1;
    if (bp !== ap) return bp - ap;
    return (b.ovr ?? -1) - (a.ovr ?? -1);
  });

  // Play / replay button for the current user
  let playHtml = '';
  if (meta.is_member) {
    playHtml = meta.has_played
      ? `<button class="btn-secondary lg-play" id="lg-play">🔁 שחק שוב לשיפור</button>`
      : `<button class="btn-primary lg-play" id="lg-play">⚽ שחק את הדראפט שלך לליגה</button>`;
  }

  let html = `
    <button class="back-btn lg-inner-back" id="lg-back-home">→ הליגות שלי</button>
    <div class="lg-league-name">${lgEsc(meta.name ?? '')}</div>
    <div class="lg-share">
      <span class="lg-share-lbl">שתפו את הקוד כדי שחברים יצטרפו:</span>
      <span class="lg-share-code" id="lg-share-code" dir="ltr">${lgEsc(code)}</span>
      <button class="lg-copy" id="lg-copy">העתק</button>
    </div>
    ${playHtml}
    <div class="section-label" style="margin-top:14px">טבלת הליגה</div>
    <div class="lb-table lg-table">`;

  if (!rows.length) {
    html += '<div class="page-note">אין עדיין חברים בליגה</div>';
  }
  rows.forEach((r, i) => {
    const played = r.points != null;
    const rank = i + 1;
    const teamName = 'הקבוצה של ' + lgEsc(r.username ?? 'אנונימי');
    const main = played ? `${r.points} נק׳` : '—';
    const sub  = played
      ? `OVR ${r.ovr} · ${lgEsc(r.formation ?? '')} · ${r.wins}נ ${r.draws}ת ${r.losses}ה`
      : 'עדיין לא שיחק';
    html += `
      <div class="lb-row">
        <span class="lb-rank ${rank <= 3 && played ? 'lb-rank-top' : ''}">${played ? rank : '·'}</span>
        <span class="lb-name">${teamName}</span>
        <span class="lb-stat">${main}</span>
        <span class="lb-sub" dir="rtl">${sub}</span>
      </div>`;
  });
  html += '</div>';
  box.innerHTML = html;

  document.getElementById('lg-back-home').onclick = renderLeaguesHome;
  document.getElementById('lg-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(code); document.getElementById('lg-copy').textContent = '✓ הועתק'; }
    catch (e) { /* ignore */ }
  };
  const playBtn = document.getElementById('lg-play');
  if (playBtn) playBtn.onclick = () => startLeagueDraft(code);
}
