let lbTab    = 'ovr';
let lbPeriod = 'all';

// Escape user-controlled strings before inserting into innerHTML (usernames and
// stored squad data are attacker-controllable — prevents stored XSS).
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
let lbMode   = 'all';   // all | season | peak
// 'modern' = the general board: today's 36/33 format only, so every record on it
// is comparable. Any other value is a season year — its own board, where everyone
// played that season's authentic format.
let lbLeague = 'modern';

function lbInitSeasonSelect() {
  const sel = document.getElementById('lb-season-sel');
  if (!sel) return;
  if (!sel.options.length) {
    const add = (v, label) => { const o = document.createElement('option'); o.value = v; o.textContent = label; sel.appendChild(o); };
    add('modern', 'כללי — פורמט מודרני (36/33)');
    [...ALL_SEASON_YEARS].reverse().forEach(y => {
      if (isModernSpec(seasonFormat(y))) return;   // 2012+ IS the modern format
      add(String(y), `🏛 ליגת ${yearToSeason(y)} — ${totalGamesFor(seasonFormat(y), 0)} מחזורים`);
    });
    sel.onchange = () => { lbLeague = sel.value; loadLeaderboard(); };
  }
  sel.value = lbLeague;
  lbUpdateSeasonNote();
}

function lbUpdateSeasonNote() {
  const note = document.getElementById('lb-season-note');
  if (!note) return;
  if (lbLeague === 'modern') {
    note.textContent = 'הטבלה הכללית — רק עונות בפורמט של היום, כדי שההשוואה תהיה הוגנת';
    return;
  }
  const y = parseInt(lbLeague);
  note.textContent = `כל מי ששיחק את ${yearToSeason(y)} בפורמט המקורי: ${formatLabel(seasonFormat(y))}`;
}

async function showLeaderboard() {
  showScreen('leaderboard');

  document.getElementById('leaderboard-back').onclick = () => {
    showScreen('welcome');
  };

  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('selected'));
      tab.classList.add('selected');
      lbTab = tab.dataset.tab;
      loadLeaderboard();
    });
  });

  document.querySelectorAll('.lb-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      lbPeriod = btn.dataset.period;
      loadLeaderboard();
    });
  });

  document.querySelectorAll('.lb-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-mode').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      lbMode = btn.dataset.mode;
      loadLeaderboard();
    });
  });

  document.getElementById('squad-modal-close').onclick = () => {
    document.getElementById('squad-modal').style.display = 'none';
  };

  lbInitSeasonSelect();
  loadLeaderboard();
}

// The gauntlet board is a different game: no seasons, no formats, no periods —
// how deep you got, and at which banner. Its filters are hidden rather than
// disabled, because none of them mean anything here.
function lbToggleSeasonFilters(show) {
  ['.lb-season-row', '.lb-modes', '.lb-filters:not(.lb-modes)'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => { el.style.display = show ? '' : 'none'; });
  });
}

// The dynasty board: ten seasons at one club, ranked by titles. The run itself
// lives in the player's browser; only its shape reaches career_runs.
async function loadCareerBoardTab(table) {
  const { data: rows, error } = await _supabase.rpc('career_board', { p_limit: 100 });
  // the board opens with the migration; until then this is "not yet", not "broken"
  if (error || !rows || !rows.length) {
    table.innerHTML = `<div class="page-note">
      עוד לא הסתיימה אף קריירה — סיים עשור במועדון אחד והיה הראשון על הלוח 👑
    </div>`;
    return;
  }
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  table.innerHTML = rows.map(r => {
    const me = user && r.user_id === user.id;
    const ending = r.relegated ? '💀' : r.finished ? '🏁' : '';
    return `
      <div class="lb-row${me ? ' lgsim-me' : ''}">
        <span class="lb-rank ${r.rank <= 3 ? 'lb-rank-top' : ''}">${r.rank}</span>
        <span class="lb-name">${esc(r.username || 'אנונימי')}${me ? ' (אתה)' : ''}
          <span class="cr-board-club">${esc(r.club_name)} ${ending}</span></span>
        <span class="lb-stat">🏆 ${r.titles}</span>
        <span class="lb-sub" dir="rtl"><bdi>${r.seasons} עונות</bdi> · <bdi>${r.points} נק׳</bdi></span>
      </div>`;
  }).join('');
}

async function loadGauntletBoard(table) {
  const { data: rows, error } = await _supabase
    .from('gauntlet_runs')
    .select('depth, cleared, banner, team_ovr, ended, created_at, profiles(username, avatar_url)')
    .order('banner', { ascending: false })
    .order('depth', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(200);

  if (error || !rows?.length) {
    table.innerHTML = '<div class="page-loading">אין ריצות עדיין — היה הראשון</div>';
    return;
  }
  // one row per player: his best run, which is the first he appears in
  const seen = new Set();
  const best = rows.filter(r => {
    const who = r.profiles?.username ?? '—';
    if (seen.has(who)) return false;
    seen.add(who);
    return true;
  });

  table.innerHTML = '';
  best.forEach((row, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    const date = new Date(row.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
    const sub = [row.cleared ? '🏆 המסע הושלם' : row.ended === false ? '🔴 בריצה עכשיו' : null,
                 row.banner ? '🏴 ' + gtBannerName(row.banner) : null,
                 row.team_ovr ? 'OVR ' + row.team_ovr : null, date]
      .filter(Boolean).map(x => `<bdi>${esc(x)}</bdi>`).join(' · ');

    const el = document.createElement('div');
    el.className = 'lb-row gt-lb-row';
    el.innerHTML = `
      <span class="lb-rank ${rank <= 3 ? 'lb-rank-top' : ''}">${medal}</span>
      <span class="lb-name">${esc(row.profiles?.username ?? 'אנונימי')}</span>
      <span class="lb-stat">${row.depth}<small>/8</small></span>
      <span class="lb-sub" dir="rtl">${sub}</span>`;
    table.appendChild(el);
  });
}

async function loadLeaderboard() {
  const table = document.getElementById('leaderboard-table');
  table.innerHTML = '<div class="page-loading">טוען...</div>';

  // neither the gauntlet nor a dynasty has seasons, formats or periods
  lbToggleSeasonFilters(lbTab !== 'gauntlet' && lbTab !== 'career');
  if (lbTab === 'gauntlet') return loadGauntletBoard(table);
  if (lbTab === 'career')   return loadCareerBoardTab(table);

  const orderCol = lbTab === 'ovr' ? 'ovr' : 'points';
  let query = _supabase
    .from('game_results')
    .select('id, ovr, wins, draws, losses, points, gf, ga, formation, tier, settings, created_at, profiles(username, avatar_url)')
    .order(orderCol, { ascending: false })
    .limit(100);

  if (lbPeriod === 'today') {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    query = query.gte('created_at', midnight.toISOString());
  } else if (lbPeriod === 'week') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
  } else if (lbPeriod === 'month') {
    query = query.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  }

  if (lbMode === 'peak')   query = query.eq('settings->>peak_mode', 'true');
  if (lbMode === 'season') query = query.neq('settings->>peak_mode', 'true');

  // League board: the general one excludes historical formats entirely; a season
  // board shows only runs played in that season's own format.
  if (lbLeague === 'modern') {
    // rows saved before the format setting existed were all modern
    query = query.or('settings->>league_format.is.null,settings->>league_format.eq.modern');
  } else {
    query = query.eq('settings->>opp_season', lbLeague).eq('settings->>league_format', 'authentic');
  }

  lbUpdateSeasonNote();

  const { data: rows, error } = await query;
  if (error || !rows?.length) {
    table.innerHTML = '<div class="page-loading">אין תוצאות עדיין</div>';
    return;
  }

  const seen = new Set();
  const best = [];
  for (const row of rows) {
    const uid = row.profiles?.username ?? row.id;
    if (!seen.has(uid)) { seen.add(uid); best.push(row); }
  }

  table.innerHTML = '';
  best.forEach((row, i) => {
    const rank     = i + 1;
    const username = row.profiles?.username ?? 'אנונימי';
    const isPeak   = row.settings?.peak_mode === true;
    const mainStat = (lbTab === 'ovr' ? `OVR ${row.ovr}` : `${row.points} נק׳`) + (isPeak ? ' ⚡' : '');
    // both tabs show the full picture: the other stat, formation, record, date
    const other    = lbTab === 'ovr' ? `${row.points} נק׳` : `OVR ${row.ovr}`;
    const record   = `${row.wins}נ ${row.draws}ת ${row.losses}ה`;
    const date     = new Date(row.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
    // Isolate each segment with <bdi> so the mixed Hebrew/Latin pieces keep a
    // stable order regardless of which stat leads (OVR vs points).
    const oppSeason = row.settings?.opp_season;
    const isAuthentic = row.settings?.league_format === 'authentic';
    const leagueTag = isAuthentic && oppSeason ? `🏛 ${yearToSeason(+oppSeason)}`
                    : oppSeason ? `🆚 ${yearToSeason(+oppSeason)}` : null;
    const subStat  = [other, row.formation, record, leagueTag, date].filter(Boolean)
      .map(x => `<bdi>${esc(x)}</bdi>`).join(' · ');

    const tr = document.createElement('div');
    tr.className = 'lb-row';
    tr.innerHTML = `
      <span class="lb-rank ${rank <= 3 ? 'lb-rank-top' : ''}">${rank}</span>
      <span class="lb-name">${esc(username)}</span>
      <span class="lb-stat">${esc(mainStat)}</span>
      <span class="lb-sub" dir="rtl">${subStat}</span>
      <button class="lb-view-btn" data-id="${esc(row.id)}" data-user="${esc(username)}">הרכב</button>
    `;
    tr.querySelector('.lb-view-btn').addEventListener('click', e => {
      openSquadModal(e.target.dataset.id, e.target.dataset.user);
    });
    table.appendChild(tr);
  });
}

// own = your own season from the profile, where the squad is readable whether or
// not you chose to share it (RLS already limits this to the owner).
async function openSquadModal(resultId, username, own = false) {
  let q = _supabase.from('squads').select('players').eq('result_id', resultId);
  if (!own) q = q.eq('is_public', true);
  const { data: squad } = await q.single();

  document.getElementById('squad-modal-title').textContent = own ? 'ההרכב שלך' : `הרכב של ${username}`;
  const pitch = document.getElementById('squad-modal-pitch');

  if (!squad?.players?.length) {
    pitch.innerHTML = `<p class="page-note">${own ? 'ההרכב של העונה הזאת לא נשמר' : 'המשתמש לא שיתף את ההרכב'}</p>`;
  } else {
    const list = document.createElement('div');
    list.className = 'squad-player-list';
    squad.players.forEach(p => {
      const item = document.createElement('div');
      item.className = 'squad-player-item';
      item.innerHTML = `
        <span class="sq-pos">${esc(p.pos)}</span>
        <span class="sq-name">${esc(p.name)}</span>
        <span class="sq-ovr">${esc(p.ovr)}</span>
      `;
      list.appendChild(item);
    });
    pitch.innerHTML = '';
    pitch.appendChild(list);
  }

  document.getElementById('squad-modal').style.display = 'flex';
}
