// Career sandbox — one account only.
//
// Reaching the last season of a dynasty honestly costs ten drafted seasons and
// about a quarter of an hour, which makes the two screens that matter most (the
// end of a run and the share prompt) the two hardest to look at. This panel
// jumps straight to them.
//
// The same two rules as the gauntlet sandbox keep it out of the real game:
//   1. it is only drawn for the admin account, and
//   2. anything it touches flags the run, and a flagged run is never sent to
//      the dynasty board — a sandbox decade is not a record.

const CR_ADMIN_EMAIL = 'avichaiy0610@outlook.com';

function crIsAdmin() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return !!(u && u.email === CR_ADMIN_EMAIL);
}

function crMarkSandbox() {
  const run = crRun();
  if (!run.sandbox) { run.sandbox = true; crSave(); }
}

/* ── inventing seasons ────────────────────────────────────────────────────── */
// A plausible season for a given year: a random-ish finish, points that match
// it, and a champion often enough that titles and Europe both get exercised.
// An invented season needs an invented ELEVEN, or the archive it lands in has
// nothing to open and the sandbox cannot exercise the one screen it exists to
// test. Real players from that year's real squads, so the XI reads correctly
// and rebuilds from data.js exactly like a drafted one.
function crFakeXI(year, formationId, tactic) {
  if (typeof formationSlots !== 'function' || typeof SQUADS === 'undefined') return null;
  const slots = formationSlots(formationId || '4-3-3', tacticOf(tactic));
  const pool = SQUADS.filter(sq => parseSeasonYear(sq.season) === year);
  if (!pool.length) return null;
  const used = new Set();
  return slots.map(slot => {
    const fit = slotFitPos(slot);
    for (const sq of pool) {
      for (const pl of sq.players) {
        if (used.has(pl.name) || !playerFitsSlot(pl, fit)) continue;
        used.add(pl.name);
        return { squadId: sq.id, name: pl.name };
      }
    }
    return null;
  });
}

function crFakeSeason(year, rank, n) {
  const clubs = n || 14;
  const wins   = Math.max(4, Math.round((clubs - rank) * 1.9));
  const draws  = 6;
  const losses = Math.max(0, 36 - wins - draws);
  return {
    year, rank, n: clubs,
    points: wins * 3 + draws,
    wins, draws, losses,
    gf: 40 + wins, ga: 20 + losses,
    ovr: 78 + Math.max(0, 10 - rank),
    champion: rank === 1,
    // The cabinet, the timeline and the winter window all read fields that a
    // sandbox season never had, so a filled run showed a shelf of nothing and
    // there was no way to see any of it without playing ten real seasons.
    europe: rank === 1 ? 'ucl' : rank <= 3 ? 'uel' : rank === 4 ? 'uecl' : false,
    cupWon: rank <= 2 && year % 2 === 0,
    cupOut: rank <= 2 && year % 2 === 0 ? null : (['r32', 'r16', 'qf', 'sf'][year % 4]),
    euTrophy: rank === 1 && year % 3 === 0 ? 'ucl' : rank === 2 && year % 5 === 0 ? 'uel' : null,
  };
}

// Fill a run's history up to `count` seasons, keeping whatever it already has.
function crAdminFillSeasons(run, count, opts) {
  const o = opts || {};
  const total = crTotalSeasons(run);
  const want = Math.min(count, total);
  while (run.history.length < want) {
    const idx = run.history.length;
    const year = run.startYear + idx;
    // a title every third season by default — enough for cr_dynasty and Europe
    const rank = o.allTitles ? 1 : (idx % 3 === 0 ? 1 : 2 + (idx % 5));
    const season = crFakeSeason(year, rank, 14);
    season.xi = crFakeXI(year, run.formationId, run.tactic);
    // one invented window, so the winter-transfer block has something to draw
    if (idx === 1 && season.xi) {
      const inSq = (typeof SQUADS !== 'undefined')
        ? SQUADS.filter(sq => parseSeasonYear(sq.season) === year)[0] : null;
      const star = inSq && inSq.players.slice().sort((a, b) => b.ovr - a.ovr)[0];
      if (star) {
        season.jan = {
          took: 'gamble', outName: 'שחקן הספסל', outOvr: 74,
          inName: star.name, inOvr: star.ovr,
          inClub: (typeof getTeam === 'function' ? (getTeam(inSq.teamId) || {}).name : '') || '',
          inSeason: inSq.season, slot: 'חלוץ', title: 'סנדבוקס',
          teamBefore: 83, teamAfter: 85, ptsStay: 58, ptsGamble: 66,
        };
      }
    }
    run.history.push(season);
    if (season.champion) run.titles++;
  }
  run.seasonIdx = run.history.length;
  run.longestStay = Math.max(run.longestStay || 0, Math.min(run.history.length, 7));
  crSave();
}

/* ── the panel ────────────────────────────────────────────────────────────── */
function crAdminPanelHTML() {
  if (!crIsAdmin()) return '';
  const run = crRun();
  const has = crHasRun();
  return `
    <div class="cr-admin">
      <div class="cr-admin-title">🧪 סנדבוקס קריירה <span>(רק אתה רואה את זה)</span></div>
      ${has ? `
        <div class="cr-admin-row">
          <button class="cr-admin-btn" data-act="last">קפוץ לעונה האחרונה</button>
          <button class="cr-admin-btn" data-act="finish">סיים את הקריירה 🏁</button>
          <button class="cr-admin-btn" data-act="releg">סיים בירידת ליגה 💀</button>
        </div>
        <div class="cr-admin-row">
          <button class="cr-admin-btn" data-act="prompt">הצג שוב את מסך השיתוף</button>
          <button class="cr-admin-btn" data-act="wipe">מחק את הריצה</button>
        </div>
        <div class="cr-admin-note">
          ${run.sandbox ? '⚠ הריצה מסומנת כסנדבוקס — היא לא תיכנס ללוח השושלות.' : 'ריצה אמיתית. כל לחיצה כאן תסמן אותה כסנדבוקס.'}
        </div>`
      : `<div class="cr-admin-note">התחל קריירה כלשהי, ואז אפשר לקפוץ איתה קדימה.</div>`}
    </div>`;
}

function crWireAdminPanel() {
  const box = document.querySelector('.cr-admin');
  if (!box) return;
  box.querySelectorAll('.cr-admin-btn').forEach(btn => {
    btn.onclick = () => {
      const run = crRun();
      crMarkSandbox();
      switch (btn.dataset.act) {
        case 'last':                                  // one season short of the end
          crAdminFillSeasons(run, crTotalSeasons(run) - 1);
          run.phase = 'preseason';
          run.over = false; run.overReason = null;
          break;
        case 'finish':
          crAdminFillSeasons(run, crTotalSeasons(run));
          run.over = true; run.overReason = 'finished';
          run.sharePrompted = false; run.shared = false;
          break;
        case 'releg':
          crAdminFillSeasons(run, Math.max(1, Math.min(5, crTotalSeasons(run))));
          run.history[run.history.length - 1].rank = 14;   // bottom two go down
          run.over = true; run.overReason = 'relegated';
          run.sharePrompted = false; run.shared = false;
          break;
        case 'prompt':
          run.sharePrompted = false; run.shared = false;
          break;
        case 'wipe':
          crClear();
          crRender();
          return;
      }
      crRecordBest(run);
      crSave();
      crRender();
    };
  });
}
