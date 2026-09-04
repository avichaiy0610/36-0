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
  let s, held = {};   // key -> times won
  try {
    // The trophies ride along with the stats — two independent reads, one wait,
    // and the honours row is drawn from what the account actually holds.
    const user = getCurrentUser();
    const [statsRes, achRes] = await Promise.all([
      _supabase.rpc('player_stats'),
      _supabase.from('user_achievements').select('achievement_key, times_earned').eq('user_id', user.id),
    ]);
    if (statsRes.error) throw statsRes.error;
    s = statsRes.data || {};
    (achRes.data || []).forEach(r => { held[r.achievement_key] = Math.max(1, +r.times_earned || 1); });
  } catch (e) {
    body.innerHTML = '<p class="page-note">לא הצלחנו לטעון את הסטטיסטיקות. נסה שוב עוד רגע.</p>';
    return;
  }
  if (s.error || !s.seasons_played) {
    body.innerHTML = '<p class="page-note">עוד לא סיימת עונה. שחק אחת, והמספרים יתחילו להצטבר כאן.</p>';
    return;
  }
  renderProfile(body, s, held);
}

/* ── the honours row ────────────────────────────────────────────────────────
   What this account has EVER lifted, across every mode, and how many times.
   The league title is counted by player_stats off the results table; the four
   cups are counted by times_earned on their own badge, which the cup and
   European submits increment once per run (20260904000001_count_trophies.sql).

   A shelf shows ✓ rather than a number when the badge exists but has never been
   incremented — every row predating that migration sits at times_earned = 1, and
   printing "×1" for a player who has four State Cups would be a worse lie than
   saying nothing. So: a real count when there is one, a tick when there is only
   the fact. */
const PF_TROPHY_KEYS = {
  league: null,          // counted, not badged
  cup:  'cup_win',
  ucl:  'eu_bigears',
  uel:  'eu_uel',
  uecl: 'eu_uecl',
};

function honoursHTML(s, held) {
  if (typeof trophySVG !== 'function') return '';
  const has = k => !!held[k];
  const times = k => held[k] || 0;
  const titles = Number(s.titles || 0);
  const cells = ['league', 'cup', 'ucl', 'uel', 'uecl'].map(kind => {
    const key = PF_TROPHY_KEYS[kind];
    const won = kind === 'league' ? titles > 0 : has(key);
    const n = kind === 'league' ? titles : times(key);
    const val = !won ? '—' : (n > 1 ? '×' + n : (kind === 'league' ? '×1' : '✓'));
    // the trophy, and its reflection in the shelf — same as the career cabinet
    const art = trophySVG(kind, { size: 44, muted: !won });
    return `
      <div class="pf-hon${won ? '' : ' pf-hon-empty'}">
        <div class="pf-hon-stand">
          <div class="pf-hon-art">${art}</div>
          <div class="pf-hon-mirror" aria-hidden="true">${art}</div>
        </div>
        <span class="pf-hon-n">${profEsc(val)}</span>
        <span class="pf-hon-l">${profEsc(trophyName(kind, true))}</span>
      </div>`;
  }).join('');

  const extras = [];
  if (has('cup_double')) extras.push('👑 דאבל');
  if (has('eu_treble'))  extras.push('🌍 שלושת המפעלים');
  if (has('cr_dynasty')) extras.push('🏰 שושלת');
  const kinds = ['cup', 'ucl', 'uel', 'uecl'].filter(k => has(PF_TROPHY_KEYS[k])).length + (titles ? 1 : 0);
  const total = titles + ['cup', 'ucl', 'uel', 'uecl'].reduce((a, k) => a + times(PF_TROPHY_KEYS[k]), 0);

  return `
    <div class="pf-card">
      <div class="pf-card-title">🏛 ארון התארים</div>
      <div class="pf-hon-case"><div class="pf-hon-row">${cells}</div></div>
      <div class="pf-sub pf-hon-sub">${
        kinds ? `${total} ${total === 1 ? 'תואר' : 'תארים'} · ${kinds} מתוך 5 המפעלים`
                + (extras.length ? ' · ' + extras.map(profEsc).join(' · ') : '')
              : 'המדפים ריקים. יש חמישה למלא.'
      }</div>
      <p class="pf-note pf-hon-note">✓ = הורם, בלי מונה. גביעים שנזכו לפני שהספירה נכנסה מופיעים ככה.</p>
    </div>`;
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

function renderProfile(body, s, held) {
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

    ${honoursHTML(s, held || {})}

    ${bestCardHTML(s)}

    ${typeof daListHTML === 'function' ? daListHTML() : ''}

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

  if (typeof daWire === 'function') daWire();

  const btn = document.getElementById('pf-view-squad');
  if (btn && s.best) {
    btn.onclick = () => {
      if (typeof openSquadModal !== 'function') return;
      openSquadModal(s.best.result_id, s.username || 'אני', true);
      document.getElementById('squad-modal').style.display = 'flex';
    };
  }
}
