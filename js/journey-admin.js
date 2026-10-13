/* ── מסע ה־11 (v1.61): the admin view ─────────────────────────────────────────
 *
 * Section A, everyone (anonymous included): a funnel per level from usage_detail
 * filtered to mode 'journey'. js/journey*.js emit
 *   open      the hub (detail null)
 *   progress  '<level>|start' | '<level>|break' | '<level>|season|<rank>'
 *   finish    '<level>|chain' | '<level>|break'   (the eleventh man was taken)
 *   share     '<level>'                           (the route image)
 * Section B, signed-in players: journey_admin_runs(p_days, p_limit), migration
 * 20261013000002 — one row per finished route, with its season's rank once played.
 * Both stay empty until 20261013000001/2 are applied and 1.61 is live.
 */
const JA_LEVELS = { easy: 'קל', normal: 'רגיל', hard: 'קשה', legacy: 'לפני הרמות' };
const JA_ORDER = ['normal', 'hard', 'easy', 'legacy'];

function jaEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function jaNum(n) { return n ? String(n) : '<span class="us-zero">·</span>'; }
function jaPct(a, b) { return b ? Math.round(100 * a / b) + '%' : '<span class="us-zero">·</span>'; }
function jaClubName(id) {
  return (typeof TEAMS !== 'undefined' && TEAMS[id]) ? TEAMS[id].name : id;
}
// 'beitar-jerusalem-1999' -> 'בית"ר ירושלים 1999/00'
function jaSquadName(squadId) {
  const m = /^(.*)-(\d{4})$/.exec(String(squadId || ''));
  if (!m) return String(squadId || '');
  const y = Number(m[2]);
  return `${jaClubName(m[1])} ${y}/${String((y + 1) % 100).padStart(2, '0')}`;
}

// usage rows ({mode,detail,event,events,people}) -> { hub, levels:[...], totals }
function journeyAdminSummary(usageRows) {
  const rows = (usageRows || []).filter(r => r.mode === 'journey');
  const hub = rows.filter(r => r.event === 'open').reduce((a, r) => a + Number(r.people || 0), 0);
  const blank = level => ({ level, startP: 0, startE: 0, breakE: 0, finishE: 0, chainE: 0,
    seasonE: 0, titleE: 0, rankSum: 0, shareE: 0 });
  const per = {};
  for (const r of rows) {
    if (r.event === 'open' || !r.detail || r.detail === '—') continue;
    const [level, what, rank] = String(r.detail).split('|');
    if (!JA_LEVELS[level]) continue;
    const c = per[level] || (per[level] = blank(level));
    const p = Number(r.people || 0), e = Number(r.events || 0);
    if (r.event === 'progress') {
      if (what === 'start') { c.startP += p; c.startE += e; }
      else if (what === 'break') c.breakE += e;
      // only a whole rank 1-20 counts: '1oops' or a missing rank is not a season
      else if (what === 'season' && /^(?:[1-9]|1[0-9]|20)$/.test(rank || '')) {
        const n = Number(rank);
        c.seasonE += e;
        if (n === 1) c.titleE += e;
        c.rankSum += n * e;
      }
    } else if (r.event === 'finish') {
      if (what !== 'chain' && what !== 'break') continue;
      c.finishE += e;
      if (what === 'chain') c.chainE += e;
    } else if (r.event === 'share') c.shareE += e;
  }
  const levels = JA_ORDER.filter(k => per[k]).map(k => per[k]);
  const totals = blank('סה"כ');
  for (const c of levels) for (const k of Object.keys(totals)) if (k !== 'level') totals[k] += c[k];
  return { hub, levels, totals };
}

function journeyAdminFmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  try {
    return d.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit',
      year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
}

// runs from journey_admin_runs -> display rows (raw text, escaped on render) + per-user summary
function journeyAdminRunsRows(runs, opts) {
  const o = opts || {};
  const rows = (runs || []).filter(r => !o.level || r.level === o.level).map(r => ({
    when: journeyAdminFmtTime(r.created_at),
    user: r.username || '—',
    level: JA_LEVELS[r.level] || r.level || '',
    formation: r.formation || '',
    clubs: Number(r.clubs) || 0,
    gap: Number(r.year_gap) || 0,
    back: Number(r.backwards) || 0,
    broken: !!r.broken,
    ovr: r.ovr == null ? '' : String(r.ovr),
    rank: r.rank == null ? null : Number(r.rank),
    route: (Array.isArray(r.route) ? r.route : []).map(s => `${jaSquadName(s && s.squadId)} · ${(s && s.name) || ''}`),
  }));
  const users = {};
  for (const r of rows) {
    const u = users[r.user] || (users[r.user] = { user: r.user, runs: 0, seasons: 0, titles: 0 });
    u.runs++; if (r.rank != null) u.seasons++; if (r.rank === 1) u.titles++;
  }
  return { rows, users: Object.values(users).sort((a, b) => b.runs - a.runs || b.titles - a.titles) };
}

const JA_EMPTY = '<div class="chal-note">עוד אין נתונים — מסע ה־11 (גרסה 1.61) עדיין לא עלה לאוויר / המיגרציות לא הוחלו</div>';

function journeyAdminFunnelHTML(usageRows, days) {
  const s = journeyAdminSummary(usageRows);
  if (!s.hub && !s.levels.length) return JA_EMPTY;
  const avg = c => c.seasonE ? (c.rankSum / c.seasonE).toFixed(1) : '<span class="us-zero">·</span>';
  const row = c => `<tr>
      <td>${jaEsc(JA_LEVELS[c.level] || c.level)}</td>
      <td><b>${jaNum(c.startP)}</b></td><td>${jaNum(c.startE)}</td>
      <td><b>${jaNum(c.finishE)}</b></td><td>${jaPct(c.finishE, c.startE)}</td>
      <td>${jaNum(c.chainE)}</td><td>${jaNum(c.breakE)}</td>
      <td>${jaNum(c.seasonE)}</td><td>${jaNum(c.titleE)}${c.titleE ? ' 🏆' : ''}</td><td>${jaPct(c.titleE, c.seasonE)}</td>
      <td>${avg(c)}</td><td>${jaNum(c.shareE)}</td></tr>`;
  return `<div class="us-h3">${Number(days) || 30} הימים האחרונים · ${s.hub} אנשים פתחו את מסך המסע ·
      ${s.totals.startE} מסעות התחילו · ${s.totals.finishE} מסלולים הושלמו</div>
    <div class="us-wrap"><table class="us-table">
      <thead><tr><th>רמה</th><th>התחילו (אנשים)</th><th>מסעות</th><th>השלימו 11</th><th>אחוז השלמה</th>
        <th>בלי שבירה</th><th>שבירות</th><th>עונות ששוחקו</th><th>אליפויות</th><th>אחוז אליפות</th><th>מקום ממוצע</th><th>שיתופי תמונה</th></tr></thead>
      <tbody>${s.levels.map(row).join('')}${row(s.totals)}</tbody></table></div>
    <div class="chal-note">כולל גולשים בלי חשבון. "השלימו 11" = נבחר השחקן ה-11; "עונות ששוחקו" נספרות פעם אחת למסע,
      גם אם העונה נטענה מחדש. אחוז אליפות = אליפויות חלקי עונות. כיול צפוי (סימולציה, 13.10): רגיל ≈30% אליפות.</div>`;
}

function journeyAdminRunsHTML(runs, opts) {
  const { rows, users } = journeyAdminRunsRows(runs, opts);
  if (!rows.length) return '<div class="chal-note">אין מסעות בטווח הזה.</div>';
  const body = rows.map(r => `<tr><td>${jaEsc(r.when)}</td><td>${jaEsc(r.user)}</td><td>${jaEsc(r.level)}</td>
      <td dir="ltr">${jaEsc(r.formation)}</td><td>${r.clubs}</td><td>${r.gap}</td><td>${r.back}</td><td>${r.broken ? '✂' : ''}</td>
      <td>${jaEsc(r.ovr)}</td><td>${r.rank == null ? '<span class="us-zero">טרם</span>' : r.rank + (r.rank === 1 ? ' 🏆' : '')}</td>
      <td style="text-align:start"><details><summary>11 תחנות</summary>${r.route.map(x => `<div>${jaEsc(x)}</div>`).join('')}</details></td></tr>`).join('');
  const ubody = users.slice(0, 15).map(u =>
    `<tr><td>${jaEsc(u.user)}</td><td>${u.runs}</td><td>${jaNum(u.seasons)}</td><td>${jaNum(u.titles)}</td></tr>`).join('');
  return `<div class="us-h3">${rows.length} מסעות שהושלמו</div>
    <div class="us-wrap"><table class="us-table">
      <thead><tr><th>מתי</th><th>שחקן</th><th>רמה</th><th>מערך</th><th>מועדונים</th><th>פער שנים</th><th>אחורה בזמן</th><th>שבירה</th>
        <th>דירוג</th><th>מקום בעונה</th><th>המסלול</th></tr></thead>
      <tbody>${body}</tbody></table></div>
    <div class="us-h3">לפי שחקן</div>
    <div class="us-wrap"><table class="us-table">
      <thead><tr><th>שחקן</th><th>מסעות</th><th>עונות</th><th>אליפויות</th></tr></thead><tbody>${ubody}</tbody></table></div>`;
}

function journeyAdminMissing(err) {
  const m = String((err && err.code) || '') + ' ' + String((err && err.message) || '');
  return /PGRST202|42883|could not find the function|does not exist/i.test(m);
}

let _jaRuns = [];

async function journeyAdminLoad(funnelEl, runsEl, statusEl, days) {
  statusEl.textContent = 'טוען…';
  statusEl.className = 'chal-status';
  const [u, r] = await Promise.all([
    _supabase.rpc('usage_detail', { p_days: days }),
    _supabase.rpc('journey_admin_runs', { p_days: days, p_limit: 500 }),
  ]);
  const errs = [];
  if (u.error) errs.push('פירוט שימוש: ' + u.error.message);
  else funnelEl.innerHTML = journeyAdminFunnelHTML(u.data || [], days);
  if (r.error) {
    if (journeyAdminMissing(r.error)) { _jaRuns = []; runsEl.innerHTML = JA_EMPTY; }
    else errs.push('מי שיחק: ' + r.error.message);
  } else {
    _jaRuns = r.data || [];
    journeyAdminRenderRuns(runsEl);
  }
  statusEl.textContent = errs.length ? 'טעינה נכשלה: ' + errs.join(' · ') : '';
  statusEl.className = errs.length ? 'chal-status err' : 'chal-status';
}

function journeyAdminRenderRuns(runsEl, level) {
  if (!_jaRuns.length) { runsEl.innerHTML = JA_EMPTY; return; }
  const cur = level || '';
  const opts = '<option value="">כל הרמות</option>' + JA_ORDER.filter(k => _jaRuns.some(x => x.level === k))
    .map(k => `<option value="${k}"${k === cur ? ' selected' : ''}>${JA_LEVELS[k]}</option>`).join('');
  runsEl.innerHTML = `<div class="us-controls"><label>רמה</label>
      <select class="tp-select ja-level">${opts}</select></div>${journeyAdminRunsHTML(_jaRuns, { level: cur })}`;
  const sel = runsEl.querySelector('.ja-level');
  if (sel) sel.onchange = () => journeyAdminRenderRuns(runsEl, sel.value);
}
