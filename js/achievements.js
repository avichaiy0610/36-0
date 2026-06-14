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

async function showAchievements() {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  const screen = document.getElementById('screen-achievements');
  screen.style.display = 'flex';
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = '<div class="page-loading">טוען...</div>';

  document.getElementById('achievements-back').onclick = () => {
    screen.style.display = 'none';
    document.getElementById('screen-welcome').style.display = 'flex';
  };

  const { data: allAchs } = await _supabase
    .from('achievements')
    .select('*')
    .order('is_hidden', { ascending: true });

  let unlockedMap = {};
  const user = getCurrentUser();
  if (user) {
    const { data: unlocked } = await _supabase
      .from('user_achievements')
      .select('achievement_key, unlocked_at')
      .eq('user_id', user.id);
    (unlocked ?? []).forEach(u => { unlockedMap[u.achievement_key] = u.unlocked_at; });
  }

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
    const card = document.createElement('div');
    card.className = `ach-card ${isUnlocked ? 'ach-unlocked' : 'ach-locked'}`;
    card.innerHTML = `
      <div class="ach-icon">${isHiddenAndLocked ? '❓' : ach.icon}</div>
      <div class="ach-info">
        <div class="ach-name">${isHiddenAndLocked ? '???' : ach.name_he}</div>
        <div class="ach-desc">${isHiddenAndLocked ? '' : ach.desc_he}</div>
        ${isUnlocked ? `<div class="ach-date">${new Date(unlockedMap[ach.key]).toLocaleDateString('he-IL')}</div>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
}
