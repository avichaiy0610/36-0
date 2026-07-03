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

  loadLeaderboard();
}

async function loadLeaderboard() {
  const table = document.getElementById('leaderboard-table');
  table.innerHTML = '<div class="page-loading">טוען...</div>';

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
    const subStat  = [other, row.formation, record, date]
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

async function openSquadModal(resultId, username) {
  const { data: squad } = await _supabase
    .from('squads')
    .select('players')
    .eq('result_id', resultId)
    .eq('is_public', true)
    .single();

  document.getElementById('squad-modal-title').textContent = `הרכב של ${username}`;
  const pitch = document.getElementById('squad-modal-pitch');

  if (!squad?.players?.length) {
    pitch.innerHTML = '<p class="page-note">המשתמש לא שיתף את ההרכב</p>';
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
