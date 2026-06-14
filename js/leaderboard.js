let lbTab    = 'ovr';
let lbPeriod = 'all';

async function showLeaderboard() {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  const screen = document.getElementById('screen-leaderboard');
  screen.style.display = 'flex';

  document.getElementById('leaderboard-back').onclick = () => {
    screen.style.display = 'none';
    document.getElementById('screen-welcome').style.display = 'flex';
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
    .select('id, ovr, wins, draws, losses, points, gf, ga, formation, tier, created_at, profiles(username, avatar_url)')
    .order(orderCol, { ascending: false })
    .limit(100);

  if (lbPeriod === 'week') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
  } else if (lbPeriod === 'month') {
    query = query.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  }

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
    const mainStat = lbTab === 'ovr' ? `OVR ${row.ovr}` : `${row.points} נק׳`;
    const subStat  = lbTab === 'ovr'
      ? `${row.wins}נ ${row.draws}ת ${row.losses}ה`
      : `OVR ${row.ovr} · ${row.formation}`;

    const tr = document.createElement('div');
    tr.className = 'lb-row';
    tr.innerHTML = `
      <span class="lb-rank ${rank <= 3 ? 'lb-rank-top' : ''}">${rank}</span>
      <span class="lb-name">${username}</span>
      <span class="lb-stat">${mainStat}</span>
      <span class="lb-sub">${subStat}</span>
      <button class="lb-view-btn" data-id="${row.id}" data-user="${username}">הרכב</button>
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
        <span class="sq-pos">${p.pos}</span>
        <span class="sq-name">${p.name}</span>
        <span class="sq-ovr">${p.ovr}</span>
      `;
      list.appendChild(item);
    });
    pitch.innerHTML = '';
    pitch.appendChild(list);
  }

  document.getElementById('squad-modal').style.display = 'flex';
}
