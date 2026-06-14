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
  // Implemented in Task 8
}
