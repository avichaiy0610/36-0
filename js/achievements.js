async function showAchievementToasts(achievementKeys) {
  if (!achievementKeys?.length) return;
  const { data: achs } = await _supabase
    .from('achievements')
    .select('key, name_he, icon')
    .in('key', achievementKeys);
  for (const ach of (achs ?? [])) {
    await showSingleToast(ach);
  }
}

function showSingleToast(ach) {
  return new Promise(resolve => {
    const toast = document.getElementById('achievement-toast');
    document.getElementById('toast-icon').textContent = ach.icon;
    document.getElementById('toast-name').textContent = ach.name_he;
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; resolve(); }, 3500);
  });
}

function getRarity(pct) {
  if (pct < 1)  return { label: 'אגדי',  color: '#f59e0b' };
  if (pct < 5)  return { label: 'נדיר',  color: '#a855f7' };
  if (pct < 15) return { label: 'קשה',   color: '#3b82f6' };
  if (pct < 40) return { label: 'בינוני',color: '#22c55e' };
  return               { label: 'קל',    color: '#6b7280' };
}

async function showAchievements() {
  showScreen('achievements');
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = '<div class="page-loading">טוען...</div>';

  document.getElementById('achievements-back').onclick = () => {
    showScreen('welcome');
  };

  const user = getCurrentUser();

  const [{ data: allAchs }, { data: statsRows }, unlockedRows] = await Promise.all([
    _supabase.from('achievements').select('*').order('is_hidden', { ascending: true }),
    _supabase.rpc('get_achievement_stats'),
    user
      ? _supabase.from('user_achievements').select('achievement_key, unlocked_at').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const statsMap = {};
  (statsRows ?? []).forEach(r => { statsMap[r.key] = r; });

  const unlockedMap = {};
  (unlockedRows.data ?? []).forEach(u => { unlockedMap[u.achievement_key] = u.unlocked_at; });

  grid.innerHTML = '';

  if (!user) {
    const note = document.createElement('p');
    note.className = 'page-note';
    note.textContent = 'התחבר כדי לראות את ההישגים שלך';
    grid.appendChild(note);
  }

  (allAchs ?? []).forEach(ach => {
    const isUnlocked        = !!unlockedMap[ach.key];
    const isHiddenAndLocked = ach.is_hidden && !isUnlocked;

    const s           = statsMap[ach.key];
    const totalUsers  = Number(s?.total_users ?? 0);
    const unlockCount = Number(s?.unlock_count ?? 0);
    const pct         = totalUsers > 0 ? (unlockCount / totalUsers) * 100 : 0;
    const rarity      = getRarity(pct);
    const pctLabel    = totalUsers > 0 ? `${pct.toFixed(1)}%` : '—';

    const card = document.createElement('div');
    card.className = `ach-card ${isUnlocked ? 'ach-unlocked' : 'ach-locked'}`;
    card.innerHTML = `
      <div class="ach-icon">${isHiddenAndLocked ? '❓' : ach.icon}</div>
      <div class="ach-info">
        <div class="ach-name">${isHiddenAndLocked ? '???' : ach.name_he}</div>
        <div class="ach-desc">${isHiddenAndLocked ? '' : ach.desc_he}</div>
        ${isUnlocked ? `<div class="ach-date">${new Date(unlockedMap[ach.key]).toLocaleDateString('he-IL')}</div>` : ''}
        <div class="ach-rarity-row">
          <span class="ach-rarity-tag" style="color:${rarity.color};border-color:${rarity.color}40">${rarity.label}</span>
          <div class="ach-bar-wrap">
            <div class="ach-bar-fill" style="width:${Math.min(pct,100).toFixed(1)}%;background:${rarity.color}"></div>
          </div>
          <span class="ach-pct">${pctLabel}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
