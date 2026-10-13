// Device-local journey awards. Never read from or write to the production DB.
const JOURNEY_ACH_KEY = '36-0-journey-achievements';
const JOURNEY_ACHIEVEMENTS = [
  { key: 'jx_finish', icon: '🧭', name_he: 'הדרך שלי', desc_he: 'השלם מסע של 11 שחקנים.' },
  { key: 'jx_chain', icon: '🔗', name_he: 'שרשרת ברזל', desc_he: 'השלם מסע בלי לשבור את השרשרת.' },
  // ברמה רגילה וקשה כל מועדון נכנס פעם אחת, כך ש"שמונה מועדונים" היה ניתן תמיד.
  { key: 'jx_hard', icon: '🙈', name_he: 'בלי מספרים', desc_he: 'השלם מסע ברמה קשה, בלי לראות דירוגים.' },
  { key: 'jx_time', icon: '⌛', name_he: 'מסע בזמן', desc_he: 'השלם מסע עם פער של עשרים שנה לפחות בין העונה המוקדמת למאוחרת.' },
  { key: 'jx_back', icon: '⏪', name_he: 'בחזרה לעבר', desc_he: 'השלם מסע עם לפחות ארבעה מעברים לעונה מוקדמת יותר.' },
  { key: 'jx_title', icon: '🏆', name_he: 'אליפות בדרך שלי', desc_he: 'זכה באליפות הליגה עם הרכב שבנית במסע ה־11, ברמה רגילה או קשה.' },
];
function journeyAchievementsLoad() {
  try {
    const saved = JSON.parse(localStorage.getItem(JOURNEY_ACH_KEY));
    if (!saved || saved.v !== 1 || !saved.earned || typeof saved.earned !== 'object') return {};
    const earned = {};
    JOURNEY_ACHIEVEMENTS.forEach(a => {
      const row = saved.earned[a.key];
      if (row && typeof row.at === 'string' && Number.isFinite(Date.parse(row.at))) earned[a.key] = { at: row.at };
    });
    return earned;
  } catch (e) { return {}; }
}
function journeyAchievementMetrics(j) {
  if (!j || !['complete', 'season'].includes(j.phase) || !Array.isArray(j.path) || j.path.length !== 11 ||
    !Array.isArray(j.visited) || j.visited.length !== 11 || typeof j.broken !== 'boolean') return null;
  if (j.level != null && !JOURNEY_LEVELS[j.level]) return null;
  const squads = j.path.map(p => p && journeyEngine(j).squad(p.squadId));
  if (squads.some((s, i) => !s || j.visited[i] !== s.id || !s.players.some(p => p.name === j.path[i].name)) ||
    new Set(j.path.map(p => p.name)).size !== 11 || new Set(j.visited).size !== 11 || j.path[0].arrival !== 'start') return null;
  let breaks = 0, backwards = 0;
  for (let i = 1; i < squads.length; i++) {
    if (j.path[i].arrival === 'break') breaks++;
    else if (j.path[i].arrival !== 'career' || !squads[i].players.some(p => p.name === j.path[i - 1].name)) return null;
    if (parseInt(squads[i].season, 10) < parseInt(squads[i - 1].season, 10)) backwards++;
  }
  if (breaks > 1 || !!breaks !== j.broken) return null;
  const limit = journeyLevel(j).clubLimit, perClub = {};
  if (limit && squads.some(s => (perClub[s.teamId] = (perClub[s.teamId] || 0) + 1) > limit)) return null;
  const years = squads.map(s => parseInt(s.season, 10));
  return { phase: j.phase, broken: j.broken, level: journeyLevelKey(j), clubs: new Set(squads.map(s => s.teamId)).size,
    yearGap: Math.max(...years) - Math.min(...years), backwards };
}
function journeyAchievementKeys(metrics, rank) {
  if (!metrics) return [];
  const keys = ['jx_finish'];
  if (!metrics.broken) keys.push('jx_chain');
  if (metrics.level === 'hard') keys.push('jx_hard');
  if (metrics.yearGap >= 20) keys.push('jx_time');
  if (metrics.backwards >= 4) keys.push('jx_back');
  if (metrics.phase === 'season' && rank === 1 && metrics.level !== 'easy') keys.push('jx_title');
  return keys;
}
function journeyAwardAchievements(j, rank) {
  const keys = journeyAchievementKeys(journeyAchievementMetrics(j), rank);
  const earned = journeyAchievementsLoad();
  const fresh = keys.filter(key => !earned[key]);
  if (!fresh.length) return [];
  const at = new Date().toISOString();
  fresh.forEach(key => { earned[key] = { at }; });
  try { localStorage.setItem(JOURNEY_ACH_KEY, JSON.stringify({ v: 1, earned })); }
  catch (e) { return []; }
  if (typeof enqueueAchievementToasts === 'function') {
    enqueueAchievementToasts(JOURNEY_ACHIEVEMENTS.filter(a => fresh.includes(a.key)));
  }
  journeyRefreshAchievements();
  return fresh;
}
function journeyAchievementsHTML() {
  const earned = journeyAchievementsLoad();
  const count = JOURNEY_ACHIEVEMENTS.filter(a => earned[a.key]).length;
  return `<div class="jr-ach-head"><h2>הישגי מסע ה־11</h2><b dir="ltr">${count} / ${JOURNEY_ACHIEVEMENTS.length}</b></div>
    <p class="jr-ach-note">הישגים אלה נשמרים במכשיר הזה, גם בלי להתחבר.</p>
    <div class="jr-ach-grid">${JOURNEY_ACHIEVEMENTS.map(a => `<div class="ach-card ${earned[a.key] ? 'ach-unlocked' : 'ach-locked'}" data-jr-ach="${a.key}">
      <div class="ach-icon">${a.icon}</div><div class="ach-info"><div class="ach-name">${a.name_he}${earned[a.key] ? ' ✓' : ''}</div>
        <div class="ach-desc">${a.desc_he}</div>${earned[a.key] ? `<div class="ach-date">${new Date(earned[a.key].at).toLocaleDateString('he-IL')}</div>` : ''}</div></div>`).join('')}</div>`;
}
function journeyRefreshAchievements() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  document.querySelectorAll('[data-journey-achievements]').forEach(el => { el.innerHTML = journeyAchievementsHTML(); });
}
function journeyAppendAchievements(container) {
  if (!container) return;
  const section = document.createElement('section');
  section.className = 'jr-ach-section'; section.dataset.journeyAchievements = '';
  section.innerHTML = journeyAchievementsHTML(); container.appendChild(section);
}
