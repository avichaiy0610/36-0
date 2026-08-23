// Personal profile — the lifetime record behind all those seasons.
// Everything comes from one RPC (player_stats), which aggregates the caller's
// own game_results / squads / user_achievements server-side.

function profEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function showProfile() {
  showScreen('profile');
  const body = document.getElementById('profile-body');
  const backBtn = document.getElementById('profile-back');
  if (backBtn) backBtn.onclick = () => showScreen('welcome');
  if (!body) return;

  if (typeof getCurrentUser !== 'function' || !getCurrentUser()) {
    body.innerHTML = `<p class="page-note">${profEsc('צריך להתחבר כדי לראות את הסטטיסטיקות שלך.')}</p>`
      + `<button class="btn-primary btn-full" id="profile-login">התחבר</button>`;
    const b = document.getElementById('profile-login');
    if (b) b.onclick = () => { document.getElementById('auth-modal').style.display = 'flex'; };
    return;
  }

  body.innerHTML = '<div class="page-loading">טוען...</div>';
  let s;
  try {
    const { data, error } = await _supabase.rpc('player_stats');
    if (error) throw error;
    s = data || {};
  } catch (e) {
    body.innerHTML = '<p class="page-note">לא הצלחנו לטעון את הסטטיסטיקות. נסה שוב עוד רגע.</p>';
    return;
  }
  if (s.error || !s.seasons_played) {
    body.innerHTML = '<p class="page-note">עוד לא סיימת עונה. שחק אחת, והמספרים יתחילו להצטבר כאן.</p>';
    return;
  }
  renderProfile(body, s);
}

// The season worth bragging about, with the XI that did it one tap away.
function bestCardHTML(s) {
  const b = s.best;
  if (!b) return '';
  const when = b.created_at ? new Date(b.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '';
  const opp = b.settings && b.settings.opp_season ? ` · 🆚 ליגת ${profEsc(b.settings.opp_season)}/${profEsc(String(+b.settings.opp_season + 1).slice(-2))}` : '';
  const retro = b.settings && b.settings.league_format === 'authentic' ? ' · 🏛 פורמט אותנטי' : '';
  return `
    <div class="pf-card pf-best">
      <div class="pf-card-title">🏆 העונה הכי טובה שלך</div>
      <div class="pf-best-head">
        <span class="pf-best-tier">${profEsc(b.tier || '')}</span>
        <span class="pf-best-pts">${profEsc(b.points)} נק׳</span>
      </div>
      <div class="pf-sub">${profEsc(b.wins)}נ׳ ${profEsc(b.draws)}ת׳ ${profEsc(b.losses)}ה׳ · OVR ${profEsc(b.ovr)} · ${profEsc(b.formation || '')}${opp}${retro}${when ? ' · ' + profEsc(when) : ''}</div>
      ${b.has_squad
        ? `<button class="btn-primary btn-full pf-best-btn" id="pf-view-squad">👕 צפה בהרכב</button>`
        : `<p class="pf-note">ההרכב של העונה הזאת לא נשמר</p>`}
    </div>`;
}

function renderProfile(body, s) {
  const teamName = id => (typeof TEAMS === 'object' && TEAMS[id] ? TEAMS[id].name : id);
  const games = (s.wins || 0) + (s.draws || 0) + (s.losses || 0);
  const winPct = games ? Math.round((s.wins / games) * 100) : 0;
  const dateHe = d => d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '—';

  const tile = (val, label, cls) =>
    `<div class="pf-tile"><span class="pf-val ${cls || ''}">${profEsc(val)}</span><span class="pf-lbl">${profEsc(label)}</span></div>`;
  const line = (icon, label, val) => val == null || val === '' ? '' :
    `<div class="pf-line"><span class="pf-line-l">${icon} ${profEsc(label)}</span><span class="pf-line-v">${profEsc(val)}</span></div>`;

  body.innerHTML = `
    <div class="pf-grid">
      ${tile(s.seasons_played, 'עונות ששיחקת')}
      ${tile(s.best_points ?? '—', 'שיא נקודות', 'gold')}
      ${tile(s.perfect_seasons || 0, 'עונות מושלמות', s.perfect_seasons ? 'gold' : '')}
      ${tile(s.titles || 0, 'אליפויות')}
      ${tile(s.best_ovr ?? '—', 'ההרכב הכי חזק')}
      ${tile(s.achievements || 0, 'הישגים')}
    </div>

    ${bestCardHTML(s)}

    <div class="pf-card">
      <div class="pf-card-title">📊 המאזן שלך</div>
      <div class="pf-record">
        <span class="pf-rec-w">${s.wins || 0}<small>נ׳</small></span>
        <span class="pf-rec-d">${s.draws || 0}<small>ת׳</small></span>
        <span class="pf-rec-l">${s.losses || 0}<small>ה׳</small></span>
      </div>
      <div class="pf-bar">
        <span style="width:${winPct}%"></span>
      </div>
      <div class="pf-sub">${winPct}% ניצחונות · ${profEsc(s.goals_for || 0)} שערים לזכותך, ${profEsc(s.goals_against || 0)} לחובתך</div>
    </div>

    <div class="pf-card">
      <div class="pf-card-title">🎯 ההרגלים שלך</div>
      ${line('⚽', 'השחקן שבחרת הכי הרבה', s.top_player ? `${s.top_player} (${s.top_player_n})` : null)}
      ${line('🛡', 'המועדון שאתה חוזר אליו', s.top_club ? `${teamName(s.top_club)} (${s.top_club_n})` : null)}
      ${line('📋', 'המערך המועדף', s.top_formation ? `${s.top_formation} (${s.top_formation_n})` : null)}
      ${line('🏅', 'הדרגה שהכי חזרה', s.top_tier)}
      ${line('📈', 'ממוצע נקודות לעונה', s.avg_points)}
      ${line('📉', 'ממוצע דירוג הרכב', s.avg_ovr)}
      ${line('🛡️', 'עונות ללא הפסד', s.unbeaten || 0)}
      ${line('🗓', 'העונה הראשונה שלך', dateHe(s.first_season))}
      ${line('🕐', 'העונה האחרונה', dateHe(s.last_season))}
    </div>

    ${s.seasons_played > s.seasons_saved
      ? `<p class="pf-note">שיחקת ${profEsc(s.seasons_played)} עונות, מתוכן ${profEsc(s.seasons_saved)} נשמרו ללוח השיאים. עונות שלא שמרת נספרות כאן אבל אין להן פירוט.</p>`
      : ''}
  `;

  const btn = document.getElementById('pf-view-squad');
  if (btn && s.best) {
    btn.onclick = () => {
      if (typeof openSquadModal !== 'function') return;
      openSquadModal(s.best.result_id, s.username || 'אני', true);
      document.getElementById('squad-modal').style.display = 'flex';
    };
  }
}
