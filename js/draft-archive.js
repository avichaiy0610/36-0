// Every season you finish, kept — with the eleven that played it.
//
// The game threw its own history away. A season ended, the results screen was
// admired, and the next draft overwrote the save: the XI was gone unless you had
// signed in AND it happened to be your single best season, which is the only one
// the profile could show. Careers got an archive; ordinary drafts, the thing most
// people actually play, got nothing.
//
// Local, like the career archive. It stores squad id + name — never a copy of
// the ratings — so a corrected rating shows corrected in the archive instead of
// freezing whatever the number was that night, and it costs no Supabase table
// and no migration.

const DA_KEY = '36-0-draft-archive';
const DA_MAX = 60;          // ~11 picks each; well inside a localStorage budget

function daAll() {
  try {
    const a = JSON.parse(localStorage.getItem(DA_KEY));
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}

function daSave(list) {
  try { localStorage.setItem(DA_KEY, JSON.stringify(list)); }
  catch (e) {
    // out of room: the oldest entries give up their squads first, because the
    // RESULT is what a list of past seasons is for and the eleven is the bonus
    try {
      const trimmed = list.map((r, i) => i < list.length - 20 ? { ...r, xi: null } : r);
      localStorage.setItem(DA_KEY, JSON.stringify(trimmed));
    } catch (e2) { /* nothing more to give */ }
  }
}

// What kind of run produced this season — so the list can say where each one
// came from, and so a career season is not double-counted here.
function daMode() {
  if (typeof state === 'undefined' || !state) return null;
  if (state.career)    return null;             // the career keeps its own archive
  if (state.gauntlet)  return 'gauntlet';
  if (state.leagueCode) return 'league';
  if (state.duelCode)  return 'duel';
  if (state.challenge) return 'challenge';
  if (state.mgw)       return 'wordle';
  if (typeof salActive === 'function' && salActive()) return 'salary';
  return 'draft';
}

const DA_MODE_HE = {
  draft: '🎯 דראפט', league: '🏅 ליגה', duel: '⚔️ דו-קרב', challenge: '🗓️ אתגר',
  gauntlet: '🗺️ גאונטלט', wordle: '⚽ כדורדל', salary: '💰 תקרת שכר', auction: '💰 מכירה פומבית',
};

// Called once per finished season, from the end of the reveal. Idempotent by
// (mode + the exact XI + the points), because a refresh replays the same season
// and must not file it twice.
function daRecord(res) {
  const mode = daMode();
  if (!mode) return;
  if (typeof state === 'undefined' || !Array.isArray(state.picks)) return;
  const picks = state.picks.filter(Boolean);
  if (picks.length !== (state.slots || []).length || !picks.length) return;

  const xi = state.picks.map(p => p ? { squadId: p.squad.id, name: p.player.name } : null);
  const key = mode + '|' + xi.map(p => p ? p.name : '').join(',') + '|' + res.points;

  const list = daAll();
  if (list.some(r => r.key === key)) return;
  list.unshift({
    key, mode,
    at: new Date().toISOString(),
    formationId: state.formationId, tactic: state.tactic || 'bal',
    classic: !!state.classic,
    ovr: res.ovr, points: res.points, rank: res.rank || null, n: res.n || null,
    wins: res.wins, draws: res.draws, losses: res.losses,
    gf: res.gf, ga: res.ga, tier: res.tier || null,
    oppSeason: state.oppSeason || null,
    cupWon: (typeof cupPlayerWon === 'function') ? !!cupPlayerWon() : false,
    xi,
  });
  daSave(list.slice(0, DA_MAX));
}

/* ── the list ───────────────────────────────────────────────────────────────
   Lives on the profile, under the honours, because that is where somebody goes
   to look at what they have done rather than to do something new. */
function daEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function daListHTML(limit) {
  const list = daAll();
  const shown = list.slice(0, limit || 12);
  const rows = shown.map((r, i) => {
    const when = new Date(r.at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
    const place = r.rank ? `מקום ${r.rank}${r.n ? '/' + r.n : ''}` : (r.tier || '');
    const tro = (r.cupWon && typeof trophySVG === 'function') ? trophySVG('cup', { size: 15 }) : '';
    return `
      <div class="da-row" data-i="${i}" role="button" tabindex="0">
        <span class="da-mode">${daEsc(DA_MODE_HE[r.mode] || r.mode)}</span>
        <span class="da-main">
          <b>${r.points} נק׳</b> ${daEsc(place)} ${tro}
          <i>${daEsc(r.formationId)} · דירוג ${r.ovr} · ${r.wins}נ ${r.draws}ת ${r.losses}ה</i>
        </span>
        <span class="da-when">${daEsc(when)}</span>
        <span class="da-open">👕</span>
      </div>`;
  }).join('');

  if (!list.length) {
    return `
      <div class="pf-card">
        <div class="pf-card-title">👕 הדראפטים שלך</div>
        <p class="da-empty">כל עונה שתסיים תישמר כאן על ההרכב שלה, ותוכל לפתוח אותה מתי שבא לך.
        זה מתחיל מהעונה הבאה שתשחק.</p>
      </div>`;
  }
  return `
    <div class="pf-card">
      <div class="pf-card-title">👕 הדראפטים שלך <span class="da-count">${list.length}</span></div>
      <p class="da-hint">לחיצה על עונה פותחת את ההרכב ששיחק אותה</p>
      <div class="da-list">${rows}</div>
      ${list.length > shown.length ? `<p class="da-more">מוצגות ${shown.length} האחרונות מתוך ${list.length}</p>` : ''}
    </div>`;
}

function daWire() {
  document.querySelectorAll('.da-row').forEach(row => {
    const open = () => daShow(+row.dataset.i);
    row.onclick = open;
    row.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  });
}

function daShow(i) {
  const r = daAll()[i];
  if (!r || !Array.isArray(r.xi)) return;
  const slots = formationSlots(r.formationId, tacticOf(r.tactic));
  const bySquad = new Map(SQUADS.map(s => [s.id, s]));
  const rows = r.xi.map((p, idx) => {
    if (!p) return null;
    const sq = bySquad.get(p.squadId);
    const pl = sq && sq.players.find(x => x.name === p.name);
    if (!sq || !pl) return null;
    const team = typeof getTeam === 'function' ? getTeam(sq.teamId) : null;
    return { pl, sq, team, pos: slots[idx] ? (slots[idx].role || slots[idx].pos) : '' };
  }).filter(Boolean);
  if (!rows.length) return;

  const clubs = new Set(rows.map(x => x.sq.teamId));
  const list = rows.map(x => `
    <div class="cr-xi-row">
      <span class="cr-xi-pos">${daEsc(x.pos)}</span>
      <span class="cr-xi-name">${daEsc(x.pl.name)}</span>
      <span class="cr-xi-club">${daEsc(x.team ? x.team.name : '')} · ${daEsc(x.sq.season)}</span>
      <span class="cr-xi-ovr">${x.pl.ovr}</span>
    </div>`).join('');

  let w = document.getElementById('da-modal');
  if (!w) {
    w = document.createElement('div');
    w.id = 'da-modal';
    w.className = 'cr-xi-wrap cr-xi-top';
    document.body.appendChild(w);
  }
  const when = new Date(r.at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  w.innerHTML = `
    <div class="cr-xi-box" role="dialog" aria-modal="true">
      <div class="cr-xi-head">
        <span>${daEsc(DA_MODE_HE[r.mode] || r.mode)} · ${r.points} נק׳</span>
        <span class="cr-xi-meta">${daEsc(when)} · ${daEsc(r.formationId)} · דירוג ${r.ovr} ·
          ${r.wins}נ ${r.draws}ת ${r.losses}ה · ${clubs.size} מועדונים</span>
      </div>
      <div class="cr-xi-list">${list}</div>
      <button class="btn-secondary btn-full" id="da-close">סגור</button>
    </div>`;
  w.style.display = 'flex';
  const close = () => { w.style.display = 'none'; };
  document.getElementById('da-close').onclick = close;
  w.onclick = e => { if (e.target === w) close(); };
}
