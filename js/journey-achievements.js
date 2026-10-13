// Journey awards are kept on the device (they work signed out), and a signed-in
// player's route is also sent to submit_journey_run (migration 20261013000002),
// which grants the same keys as real achievements. The toast queue drops a key it
// has already shown, so the local and the server award announce themselves once.
const JOURNEY_ACH_KEY = '36-0-journey-achievements';
const JOURNEY_ACHIEVEMENTS = [
  { key: 'jx_finish', icon: '🧭', name_he: 'הדרך שלי', desc_he: 'השלם מסע של 11 שחקנים.' },
  { key: 'jx_chain', icon: '🔗', name_he: 'שרשרת ברזל', desc_he: 'השלם מסע בלי לשבור את השרשרת.' },
  // ברמה רגילה וקשה כל מועדון נכנס פעם אחת, כך ש"שמונה מועדונים" היה ניתן תמיד.
  // jx_clubs כבר לא מוענק, אבל מי שזכה בו ממשיך לראות אותו.
  { key: 'jx_clubs', icon: '🏟️', name_he: 'בכל מגרש', desc_he: 'השלם מסע שעובר בשמונה מועדונים שונים לפחות.', retired: true },
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
  if (metrics.phase === 'season' && rank === 1 && ['normal', 'hard'].includes(metrics.level)) keys.push('jx_title');
  return keys;
}
function journeyAwardAchievements(j, rank) {
  journeyServerSubmit(j, rank);
  if (rank != null) journeyReportSeason(j, rank);
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
// `only` (the main list, signed in): just the device's awards the account lacks,
// so none is listed twice next to the server's own card.
function journeyAchievementsHTML(only) {
  const earned = journeyAchievementsLoad();
  const shown = JOURNEY_ACHIEVEMENTS.filter(a => only ? only.includes(a.key) : (!a.retired || earned[a.key]));
  const count = shown.filter(a => earned[a.key]).length;
  return `<div class="jr-ach-head"><h2>הישגי מסע ה־11${only ? ' · במכשיר הזה' : ''}</h2><b dir="ltr">${count} / ${shown.length}</b></div>
    <p class="jr-ach-note">${only ? 'הישגים שהשגת במכשיר הזה ועוד לא נשמרו בחשבון שלך.' : 'הישגים אלה נשמרים במכשיר הזה, גם בלי להתחבר.'}</p>
    <div class="jr-ach-grid">${shown.map(a => `<div class="ach-card ${earned[a.key] ? 'ach-unlocked' : 'ach-locked'}" data-jr-ach="${a.key}">
      <div class="ach-icon">${a.icon}</div><div class="ach-info"><div class="ach-name">${a.name_he}${earned[a.key] ? ' ✓' : ''}</div>
        <div class="ach-desc">${a.desc_he}</div>${earned[a.key] ? `<div class="ach-date">${new Date(earned[a.key].at).toLocaleDateString('he-IL')}</div>` : ''}</div></div>`).join('')}</div>`;
}
function journeyRefreshAchievements() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  document.querySelectorAll('[data-journey-achievements]').forEach(el => { el.innerHTML = journeyAchievementsHTML(); });
}
// `serverHas` (signed in): the keys the account already holds. The device section is
// then shown only while it holds one the account lacks — a route still queued, or
// the retired jx_clubs — and lists only those, so nothing earned disappears from the
// main list and nothing is listed twice.
function journeyAppendAchievements(container, serverHas) {
  if (!container) return;
  let only = null;
  if (serverHas) {
    only = Object.keys(journeyAchievementsLoad()).filter(key => !serverHas[key]);
    if (!only.length) return;
  }
  const section = document.createElement('section');
  section.className = 'jr-ach-section';
  // the refresher repaints the full list; this one is a fixed subset
  if (!only) section.dataset.journeyAchievements = '';
  section.innerHTML = journeyAchievementsHTML(only); container.appendChild(section);
}

// Every finished route waits in a device queue until the server has answered it.
// A refresh can restore the summary before initAuth knows the user, and a route
// finished signed out has nobody to belong to yet: both are sent by
// journeyFlushPending when onSignIn runs (js/auth.js). The server keeps the first
// call's route and only ever adds a missing rank, so resending is harmless.
// Each entry carries its `owner`: the account signed in when the route was
// finished, or null. A signed-out route is adopted by whoever signs in next;
// one finished in an account is only ever sent for that account (Codex's review
// of ddded8f4: a shared device must not hand A's route to B).
const JOURNEY_PENDING_KEY = '36-0-journey-pending';
function journeyPendingLoad() {
  try {
    const saved = JSON.parse(localStorage.getItem(JOURNEY_PENDING_KEY));
    return saved && saved.v === 1 && saved.runs && typeof saved.runs === 'object' ? saved.runs : {};
  } catch (e) { return {}; }
}
function journeyPendingSave(runs) {
  // the newest ten: an abandoned device must not grow the queue forever
  const ids = Object.keys(runs).sort((a, b) => (runs[a].at || 0) - (runs[b].at || 0)).slice(-10);
  const kept = {}; ids.forEach(id => { kept[id] = runs[id]; });
  try { localStorage.setItem(JOURNEY_PENDING_KEY, JSON.stringify({ v: 1, runs: kept })); } catch (e) {}
}
function journeyUserId() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return u && u.id ? String(u.id) : null;
}
function journeyServerSubmit(j, rank) {
  try {
    if (!journeyAchievementMetrics(j) || !j.id) return;
    const runs = journeyPendingLoad(), old = runs[j.id];
    const me = journeyUserId();
    // an owned entry stays its owner's, even if this device now has someone else on it
    if (old && old.owner && me && old.owner !== me) return;
    const p = { run_id: String(j.id), level: journeyLevelKey(j), formation: state.formationId || '',
      route: j.path.map(s => ({ squadId: s.squadId, name: s.name })), broken: !!j.broken };
    if (typeof teamOVR === 'function') p.ovr = teamOVR();
    if (rank != null) p.rank = rank;
    else if (old && old.p && old.p.rank != null) p.rank = old.p.rank;
    const entry = { p, owner: (old && old.owner) || me, at: (old && old.at) || Date.now() };
    runs[j.id] = entry;
    journeyPendingSave(runs);
    // sent from memory: a full or blocked localStorage must not stop the award
    journeySendPending(j.id, entry);
  } catch (e) { /* an award never breaks a run */ }
}
// Answered means the server took it or refused it for good; a sign-in, profile
// or network failure keeps it queued for the next sign-in.
const JOURNEY_RETRY = ['not signed in', 'no profile'];
function journeySendPending(id, given) {
  const me = journeyUserId();
  if (!me || typeof _supabase === 'undefined' || !_supabase) return;
  const entry = given || journeyPendingLoad()[id];
  if (!entry || !entry.p || (entry.owner && entry.owner !== me)) return;
  const sentRank = entry.p.rank;
  _supabase.rpc('submit_journey_run', { p: entry.p }).then(({ data, error }) => {
    if (error || !data || JOURNEY_RETRY.includes(data.error)) return;
    const runs = journeyPendingLoad();
    // a season that arrived while this was in flight stays queued for its own send
    if (runs[id] && runs[id].p.rank === sentRank) { delete runs[id]; journeyPendingSave(runs); }
    const fresh = data.achievements || [];
    if (fresh.length && typeof showAchievementToasts === 'function') showAchievementToasts(fresh);
  }, () => {});
}
function journeyFlushPending() {
  try { Object.keys(journeyPendingLoad()).forEach(journeySendPending); } catch (e) {}
}
// One 'season' event per journey: a refreshed results screen replays the season,
// and track()'s two-second guard would let the replay count it twice.
const JOURNEY_SEASONS_KEY = '36-0-journey-seasons';
function journeyReportSeason(j, rank) {
  try {
    if (!j || !j.id || typeof track !== 'function') return;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(JOURNEY_SEASONS_KEY)) || []; } catch (e) { seen = []; }
    if (!Array.isArray(seen)) seen = [];
    if (seen.includes(j.id)) return;
    track('progress', 'journey', journeyLevelKey(j) + '|season|' + rank);
    localStorage.setItem(JOURNEY_SEASONS_KEY, JSON.stringify(seen.concat(j.id).slice(-30)));
  } catch (e) { /* a counter never breaks a game */ }
}
