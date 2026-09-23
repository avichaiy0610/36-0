/* ── מצב סיפור: the admin view ───────────────────────────────────────────────
 *
 * Per chapter: how many people went in, how many finished, and the stars they
 * finished with. Used by admin-story.html (a page for this alone) and by the
 * section in admin.html.
 *
 * Built from usage_detail — the admin-gated aggregate the "מה משחקים" section
 * already reads — filtered to mode 'story'. js/story.js emits:
 *   open      the chapter hub
 *   progress  '<chapter>|start'     went into a chapter
 *   finish    '<chapter>|<stars>'   reached its end, with 0-3 stars
 * No new RPC and no raw rows: usage_events stays unreadable to every role.
 * Empty until migration 20260923000001 is applied (track() drops 'story'
 * before it) and the mode is live.
 */
const ST_LEVEL = { easy: 'קל', normal: 'רגיל', hard: 'קשה', hardest: 'הכי קשה' };

function stEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function stNum(n) { return n ? String(n) : '<span class="us-zero">·</span>'; }

async function storyAdminLoad(outEl, statusEl, days) {
  statusEl.textContent = 'טוען…';
  statusEl.className = 'chal-status';
  const { data, error } = await _supabase.rpc('usage_detail', { p_days: days });
  if (error) {
    statusEl.textContent = 'טעינה נכשלה: ' + error.message;
    statusEl.className = 'chal-status err';
    return;
  }
  statusEl.textContent = '';
  outEl.innerHTML = storyAdminHTML((data || []).filter(r => r.mode === 'story'), days);
}

function storyAdminHTML(rows, days) {
  const hub = rows.filter(r => r.event === 'open').reduce((a, r) => a + Number(r.people || 0), 0);
  const per = {};
  const get = id => per[id] || (per[id] = { inP: 0, inE: 0, outP: 0, outE: 0, stars: [0, 0, 0, 0] });
  for (const r of rows) {
    const [id, what] = String(r.detail || '').split('|');
    if (!id || r.detail === '—') continue;
    const c = get(id);
    if (r.event === 'progress' && what === 'start') { c.inP += Number(r.people); c.inE += Number(r.events); }
    if (r.event === 'finish') {
      const n = Math.max(0, Math.min(3, parseInt(what, 10) || 0));
      c.stars[n] += Number(r.events);
      c.outE += Number(r.events);
      // people per star count are summed; someone finishing twice with
      // different stars counts twice here — the events column is exact
      c.outP += Number(r.people);
    }
  }
  const chapters = typeof STORY_CHAPTERS !== 'undefined' ? STORY_CHAPTERS : [];
  const name = ch => {
    const t = (typeof TEAMS !== 'undefined' && TEAMS[ch.teamId]) ? TEAMS[ch.teamId].name : ch.teamId;
    return `${t} ${ch.season} · ${ch.title}`;
  };
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '<span class="us-zero">·</span>';
  const body = chapters.map(ch => {
    const c = per[ch.id] || get(ch.id);
    const one = c.stars[1] + c.stars[2] + c.stars[3];          // at least ⭐ (stars are graded)
    return `<tr>
      <td>${stEsc(name(ch))}${ch.kind === 'europe' ? ' 🇪🇺' : ''}</td><td>${ST_LEVEL[ch.level] || ''}</td>
      <td><b>${stNum(c.inP)}</b></td><td><b>${stNum(c.outP)}</b></td><td>${pct(c.outE, c.inE)}</td>
      <td>${stNum(c.inE)}</td><td>${stNum(c.outE)}</td>
      <td>${stNum(c.stars[0])}</td><td>${stNum(c.stars[1])}</td><td>${stNum(c.stars[2])}</td><td>${stNum(c.stars[3])}</td>
      <td>${pct(one, c.outE)}</td></tr>`;
  }).join('');
  const went = Object.values(per).reduce((a, c) => a + c.inP, 0);
  const done = Object.values(per).reduce((a, c) => a + c.outP, 0);
  return `<div class="us-h3">${days} הימים האחרונים · ${hub} אנשים פתחו את מסך הפרקים ·
      ${went} כניסות לפרקים · ${done} סיומים</div>
    <div class="us-wrap"><table class="us-table">
      <thead><tr><th>פרק</th><th>רמה</th><th>נכנסו (אנשים)</th><th>סיימו (אנשים)</th><th>השלימו</th>
        <th>התחלות</th><th>סיומים</th><th>0 ⭐</th><th>⭐</th><th>⭐⭐</th><th>⭐⭐⭐</th><th>לפחות ⭐</th></tr></thead>
      <tbody>${body}</tbody></table></div>
    <div class="chal-note">"נכנסו" = התחילו את הפרק (לחצו "להתחיל את הפרק"). "סיימו" = הגיעו לסוף העונה או המסע.
      "השלימו" = סיומים חלקי התחלות. יעד הכוכבים: פרק "רגיל" ⭐ ב-30-45% מהסיומים, "קשה" 20-30%, "הכי קשה" 10-20%.</div>`;
}
