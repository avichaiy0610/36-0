/* ── אלופי הדרבי: the admin view ─────────────────────────────────────────────
 *
 * Section A, everyone (anonymous included): a funnel per club from usage_detail
 * filtered to mode 'derby'. js/derby.js emits
 *   open      the hub (detail null)
 *   progress  '<club>|start' | '<club>|bench' | '<club>|drafted' | '<club>|series'
 *   finish    '<club>|<seriesWon 0-3>'      (3 = the title)
 *   share     '<club>'
 * Section B, signed-in players: derby_admin_runs(p_days, p_limit), migration
 * 20261012000001 — one row per finished run. Empty until the migrations from
 * 20261005000002 are applied and the mode is live.
 */
const DA_LEVEL = { easy: 'קלה', normal: 'רגילה', hard: 'קשה' };

function daEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function daNum(n) { return n ? String(n) : '<span class="us-zero">·</span>'; }
function daPct(a, b) { return b ? Math.round(100 * a / b) + '%' : '<span class="us-zero">·</span>'; }
function daClubName(id) {
  return (typeof TEAMS !== 'undefined' && TEAMS[id]) ? TEAMS[id].name : id;
}

// usage rows ({mode,detail,event,events,people}) -> { hub, clubs:[...], totals }
function derbyAdminSummary(usageRows) {
  const rows = (usageRows || []).filter(r => r.mode === 'derby');
  const hub = rows.filter(r => r.event === 'open').reduce((a, r) => a + Number(r.people || 0), 0);
  const per = {};
  const get = id => per[id] || (per[id] = {
    club: id, startP: 0, startE: 0, draftedP: 0, seriesP: 0, finishP: 0, finishE: 0,
    won: [0, 0, 0, 0], shareE: 0, shareP: 0,
  });
  for (const r of rows) {
    if (r.event === 'open') continue;
    const [id, what] = String(r.detail || '').split('|');
    if (!id || r.detail === '—') continue;
    const c = get(id), p = Number(r.people || 0), e = Number(r.events || 0);
    if (r.event === 'progress') {
      if (what === 'start') { c.startP += p; c.startE += e; }
      else if (what === 'drafted') c.draftedP += p;
      else if (what === 'series') c.seriesP += p;
    } else if (r.event === 'finish') {
      c.won[Math.max(0, Math.min(3, parseInt(what, 10) || 0))] += e;
      c.finishE += e; c.finishP += p;
    } else if (r.event === 'share') { c.shareE += e; c.shareP += p; }
  }
  const clubs = Object.values(per).sort((a, b) => b.startP - a.startP || b.startE - a.startE);
  const totals = { club: 'סה"כ', startP: 0, startE: 0, draftedP: 0, seriesP: 0, finishP: 0, finishE: 0,
    won: [0, 0, 0, 0], shareE: 0, shareP: 0 };
  for (const c of clubs) {
    for (const k of ['startP', 'startE', 'draftedP', 'seriesP', 'finishP', 'finishE', 'shareE', 'shareP']) totals[k] += c[k];
    for (let i = 0; i < 4; i++) totals.won[i] += c.won[i];
  }
  return { hub, clubs, totals };
}

function derbyAdminFmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  try {
    return d.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit',
      year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
}

// the three series as "בית"ר 3:1 · הפועל חיפה 1:3 · ..." (w:l from the player's side)
function derbyAdminSeriesText(series) {
  return (Array.isArray(series) ? series : [])
    .map(s => `${daClubName(s && s.rival)} ${Number(s && s.w) || 0}:${Number(s && s.l) || 0}`).join(' · ');
}

// runs from derby_admin_runs -> display rows (raw text, escaped on render) + per-user summary
function derbyAdminRunsRows(runs, opts) {
  const o = opts || {};
  const rows = (runs || []).filter(r => !o.club || r.club === o.club).map(r => ({
    when: derbyAdminFmtTime(r.created_at),
    user: r.username || '—',
    club: daClubName(r.club),
    clubId: r.club,
    level: DA_LEVEL[r.difficulty] || r.difficulty || '',
    series: derbyAdminSeriesText(r.series),
    won: Number(r.series_won) || 0,
    title: !!r.title,
  }));
  const users = {};
  for (const r of rows) {
    const u = users[r.user] || (users[r.user] = { user: r.user, runs: 0, titles: 0 });
    u.runs++; if (r.title) u.titles++;
  }
  return { rows, users: Object.values(users).sort((a, b) => b.runs - a.runs || b.titles - a.titles) };
}

const DA_EMPTY = '<div class="chal-note">עוד אין נתונים — המצב עדיין לא עלה לאוויר / המיגרציות לא הוחלו</div>';

function derbyAdminFunnelHTML(usageRows, days) {
  const s = derbyAdminSummary(usageRows);
  if (!s.hub && !s.clubs.length) return DA_EMPTY;
  const row = c => `<tr>
      <td>${daEsc(c.club === s.totals.club ? c.club : daClubName(c.club))}</td>
      <td><b>${daNum(c.startP)}</b></td><td>${daNum(c.startE)}</td><td>${daNum(c.draftedP)}</td><td>${daNum(c.seriesP)}</td>
      <td><b>${daNum(c.finishE)}</b></td>
      <td>${daNum(c.won[0])}</td><td>${daNum(c.won[1])}</td><td>${daNum(c.won[2])}</td><td>${daNum(c.won[3])}${c.won[3] ? ' 🏆' : ''}</td>
      <td>${daPct(c.won[3], c.finishE)}</td><td>${daNum(c.shareE)}</td></tr>`;
  return `<div class="us-h3">${Number(days) || 30} הימים האחרונים · ${s.hub} אנשים פתחו את מסך הדרבי ·
      ${s.totals.startP} כניסות · ${s.totals.finishE} סיומים</div>
    <div class="us-wrap"><table class="us-table">
      <thead><tr><th>מועדון</th><th>נכנסו (אנשים)</th><th>כניסות</th><th>סיימו דראפט</th><th>התחילו סדרות</th><th>סיימו</th>
        <th>0 סדרות</th><th>1</th><th>2</th><th>3 🏆</th><th>אחוז תארים</th><th>שיתופים</th></tr></thead>
      <tbody>${s.clubs.map(row).join('')}${row(s.totals)}</tbody></table></div>
    <div class="chal-note">כולל גולשים בלי חשבון. "נכנסו" = בחרו מועדון והתחילו. "סיימו" = הגיעו לסוף שלוש הסדרות;
      3 סדרות שנוצחו = התואר. אחוז תארים = תארים חלקי סיומים.</div>`;
}

function derbyAdminRunsHTML(runs, opts) {
  const { rows, users } = derbyAdminRunsRows(runs, opts);
  if (!rows.length) return '<div class="chal-note">אין ריצות בטווח הזה.</div>';
  const body = rows.map(r => `<tr><td>${daEsc(r.when)}</td><td>${daEsc(r.user)}</td><td>${daEsc(r.club)}</td>
      <td>${daEsc(r.level)}</td><td style="text-align:start">${daEsc(r.series)}</td><td>${r.won}</td><td>${r.title ? '🏆' : ''}</td></tr>`).join('');
  const ubody = users.slice(0, 15).map(u =>
    `<tr><td>${daEsc(u.user)}</td><td>${u.runs}</td><td>${daNum(u.titles)}</td></tr>`).join('');
  return `<div class="us-h3">${rows.length} ריצות</div>
    <div class="us-wrap"><table class="us-table">
      <thead><tr><th>מתי</th><th>שחקן</th><th>מועדון</th><th>רמה</th><th>סדרות</th><th>סדרות שנוצחו</th><th>תואר</th></tr></thead>
      <tbody>${body}</tbody></table></div>
    <div class="us-h3">לפי שחקן</div>
    <div class="us-wrap"><table class="us-table">
      <thead><tr><th>שחקן</th><th>ריצות</th><th>תארים</th></tr></thead><tbody>${ubody}</tbody></table></div>`;
}

function derbyAdminMissing(err) {
  const m = String((err && err.code) || '') + ' ' + String((err && err.message) || '');
  return /PGRST202|42883|could not find the function|does not exist/i.test(m);
}

let _daRuns = [];

async function derbyAdminLoad(funnelEl, runsEl, statusEl, days) {
  statusEl.textContent = 'טוען…';
  statusEl.className = 'chal-status';
  const [u, r] = await Promise.all([
    _supabase.rpc('usage_detail', { p_days: days }),
    _supabase.rpc('derby_admin_runs', { p_days: days, p_limit: 500 }),
  ]);
  const errs = [];
  if (u.error) errs.push('פירוט שימוש: ' + u.error.message);
  else funnelEl.innerHTML = derbyAdminFunnelHTML(u.data || [], days);
  if (r.error) {
    if (derbyAdminMissing(r.error)) { _daRuns = []; runsEl.innerHTML = DA_EMPTY; }
    else errs.push('מי שיחק: ' + r.error.message);
  } else {
    _daRuns = r.data || [];
    derbyAdminRenderRuns(runsEl);
  }
  statusEl.textContent = errs.length ? 'טעינה נכשלה: ' + errs.join(' · ') : '';
  statusEl.className = errs.length ? 'chal-status err' : 'chal-status';
}

function derbyAdminRenderRuns(runsEl, club) {
  if (!_daRuns.length) { runsEl.innerHTML = DA_EMPTY; return; }
  const ids = [...new Set(_daRuns.map(x => x.club))].sort();
  const cur = club || '';
  const opts = '<option value="">כל המועדונים</option>' +
    ids.map(id => `<option value="${daEsc(id)}"${id === cur ? ' selected' : ''}>${daEsc(daClubName(id))}</option>`).join('');
  runsEl.innerHTML = `<div class="us-controls"><label>מועדון</label>
      <select class="tp-select da-club">${opts}</select></div>${derbyAdminRunsHTML(_daRuns, { club: cur })}`;
  const sel = runsEl.querySelector('.da-club');
  if (sel) sel.onchange = () => derbyAdminRenderRuns(runsEl, sel.value);
}
