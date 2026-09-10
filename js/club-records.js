// ─── בית המועדון — שיאי כל הזמנים ─────────────────────────────────────────────
//
// The club shipped as identity: a name, a crest, a kit, carried onto eleven
// screens. It renamed things and nothing more. This is the layer that makes it
// a RECORD — every season you play as your club is counted, forever, and the
// numbers are there to be broken.
//
// WHOSE records: the CLUB's, across every career and every ordinary season on
// this device. Never reset by a career ending, and never reset by a rename — a
// player who renames a club has not founded a new one.
//
// WHICH seasons: free play and career. Not challenges, leagues, duels, the
// gauntlet, salary cap or the mini-games. That list is NOT maintained here —
// see clrCounts(), which asks daMode() in js/draft-archive.js, the one place
// that already knows what kind of run produced a season.
//
// STORAGE is localStorage, beside 36-0-club, for the same reason club.js gives:
// it has to survive offline. The published copy on profiles.club (migration
// 20260910000001) is the precedent for putting it on the server later; nothing
// here blocks that.

const CLR_KEY = '36-0-club-recs';

/* The eleven of all time is composed by GROUP, not by formation slot: seasons
   are played in five different shapes and a "best RWB ever" would be empty for
   most players. One keeper, four at the back, three in midfield, three up
   front — the strongest side that ever wore the shirt. */
const CLR_GROUPS = [
  { id: 'gk',  n: 1, label: 'שוער',  set: ['GK'] },
  { id: 'def', n: 4, label: 'הגנה',  set: ['CB', 'RB', 'LB', 'RWB', 'LWB'] },
  { id: 'mid', n: 3, label: 'קישור', set: ['CM', 'CDM', 'CAM', 'RM', 'LM'] },
  { id: 'att', n: 3, label: 'התקפה', set: ['ST', 'CF', 'SS', 'RW', 'LW'] },
];

function clrGroupOf(pos) {
  const g = CLR_GROUPS.find(x => x.set.indexOf(pos) !== -1);
  return g ? g.id : 'mid';   // an unknown position is a midfielder, not a crash
}

// Hebrew counts one thing in the singular and says the number only from two up:
// "עונה אחת", never "1 עונות". Every value on this screen can legitimately BE
// one — a club with one season, a striker with one goal — so it goes through
// here rather than being concatenated.
function clrCount(n, one, many) { return n === 1 ? one : n + ' ' + many; }

function clrEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── the ledger ─────────────────────────────────────────────────────────────── */

function clrEmpty() {
  return { v: 1, club: '', seasons: 0, lastKey: null, players: {}, team: {} };
}

function clrGet() {
  try {
    const raw = JSON.parse(localStorage.getItem(CLR_KEY));
    if (!raw || typeof raw !== 'object') return clrEmpty();
    return { ...clrEmpty(), ...raw,
             players: raw.players || {}, team: raw.team || {} };
  } catch (e) { return clrEmpty(); }
}

function clrSave(l) {
  try { localStorage.setItem(CLR_KEY, JSON.stringify(l)); } catch (e) { /* full/blocked */ }
}

function clrWipe() { try { localStorage.removeItem(CLR_KEY); } catch (e) { /* ignore */ } }

function clrHasAny() { const l = clrGet(); return l.seasons > 0; }

/* ── does this season count ─────────────────────────────────────────────────── */
// Read at the point of use, never cached. This project's most repeated bug is a
// field nobody sets carrying over into the next mode, and the lesson written
// down after the third one was to put the guard where the field is READ. So the
// mode list lives in exactly one place — daMode() — and this asks it.
function clrCounts() {
  if (typeof clubHas !== 'function' || !clubHas()) return false;
  if (typeof state === 'undefined' || !state) return false;
  if (state.career) return true;                       // a dynasty season counts
  if (typeof daMode !== 'function') return false;      // no detector, no counting
  return daMode() === 'draft';                         // free play, and only that
}

// Which season this was, for stamping a record with a year. A career knows its
// own; an ordinary draft is stamped with the league it played against.
function clrYear() {
  try {
    if (state.career && state.career.year) return state.career.year;
    if (state.oppSeason) return parseInt(state.oppSeason, 10) || null;
  } catch (e) { /* fall through */ }
  return null;
}

function clrSeasonLabel(year) {
  if (!year) return '';
  return (typeof yearToSeason === 'function') ? yearToSeason(year) : String(year);
}

/* ── recording a season ─────────────────────────────────────────────────────── */
//
// Called from bindSeason's consequences block in game.js, beside daRecord —
// the seam the codebase already treats as "a season has really ended". It is
// gated on `consequences`, so a season with a January window still pending is
// provisional and does not reach here.
//
// IDEMPOTENT, and it has to be: the reveal replays, and a restored season
// re-enters that block. The key is daRecord's, in shape — mode, the eleven
// names, the points. Counting a season twice would inflate a record
// permanently and silently.
//
// Returns the list of records broken, most interesting first, for the results
// screen. Returns [] when the season did not count or was already counted.
function clubRecordSeason(res) {
  try {
    if (!clrCounts()) return [];
    const ps = (res && res.playerStats) || [];
    if (!ps.length) return [];

    const key = (typeof daMode === 'function' ? daMode() : '?') + '|' +
                ps.map(p => p.name).join(',') + '|' + (res.points ?? '');
    const l = clrGet();
    if (l.lastKey === key) return [];

    const year   = clrYear();
    const season = clrSeasonLabel(year);
    const before = clrSnapshot(l);

    l.club = (typeof clubNameRaw === 'function' ? clubNameRaw() : '') || l.club;
    l.seasons = (l.seasons || 0) + 1;
    l.lastKey = key;

    // ── players ──
    ps.forEach(p => {
      const norm = (typeof crNormName === 'function' ? crNormName(p.name) : String(p.name || '')).trim();
      if (!norm) return;
      const e = l.players[norm] || { name: p.name, goals: 0, assists: 0, seasons: 0,
                                     bestGoals: null, bestOvr: null };
      e.name     = p.name;                 // the last spelling seen wins
      e.goals   += p.goals   || 0;
      e.assists += p.assists || 0;
      e.seasons += 1;
      if (!e.bestGoals || (p.goals || 0) > e.bestGoals.n) {
        e.bestGoals = { n: p.goals || 0, year, season };
      }
      // The rating he had in the season he played for YOU, and the group he
      // played in — the all-time XI is composed from these two and nothing else.
      if (!e.bestOvr || (p.ovr || 0) > e.bestOvr.n) {
        e.bestOvr = { n: p.ovr || 0, year, season, grp: clrGroupOf(p.slotPos || p.playerPos) };
      }
      l.players[norm] = e;
    });

    // ── the team's season ──
    const t = l.team;
    const points = res.points ?? 0;
    if (!t.points || points > t.points.n) t.points = { n: points, year, season };
    if (!t.gf     || (res.gf ?? 0) > t.gf.n) t.gf = { n: res.gf ?? 0, year, season };
    // Fewest conceded — the only record where lower wins, so it cannot be
    // seeded with a zero and has to be compared as "not set yet, or better".
    if (!t.ga     || (res.ga ?? 0) < t.ga.n) t.ga = { n: res.ga ?? 0, year, season };
    const big = (typeof calcHighlights === 'function' && Array.isArray(res.matches))
      ? calcHighlights(res.matches).bigWin : null;
    if (big && (!t.bigWin || (big.gf - big.ga) > (t.bigWin.gf - t.bigWin.ga))) {
      t.bigWin = { gf: big.gf, ga: big.ga, opponent: big.opponent || '', year, season };
    }

    clrSave(l);
    return clrBroken(before, clrSnapshot(l), l.seasons === 1);
  } catch (e) { return []; }
}

/* ── what fell ──────────────────────────────────────────────────────────────── */
// A snapshot is the small set of things worth announcing, so before/after is a
// plain comparison instead of a diff over the whole ledger.
function clrSnapshot(l) {
  const lead = pick => {
    let best = null;
    Object.values(l.players).forEach(p => {
      const v = pick(p);
      if (v > 0 && (!best || v > best.v)) best = { name: p.name, v };
    });
    return best;
  };
  return {
    scorer:  lead(p => p.goals),
    assist:  lead(p => p.assists),
    legend:  lead(p => p.seasons),
    season:  (() => {                    // the best single season anyone has had
      let best = null;
      Object.values(l.players).forEach(p => {
        if (p.bestGoals && p.bestGoals.n > 0 && (!best || p.bestGoals.n > best.v)) {
          best = { name: p.name, v: p.bestGoals.n };
        }
      });
      return best;
    })(),
    points: l.team.points ? l.team.points.n : null,
    gf:     l.team.gf     ? l.team.gf.n     : null,
    ga:     l.team.ga     ? l.team.ga.n     : null,
    margin: l.team.bigWin ? l.team.bigWin.gf - l.team.bigWin.ga : null,
  };
}

// A first season sets every record at once, and a screen that announces eleven
// records announces nothing — so the first one says so in a single line and the
// rest stay for the club's own screen.
function clrBroken(before, after, first) {
  if (first) return [{ icon: '🏛', text: 'העונה הראשונה בהיסטוריה של המועדון — כל השיאים נקבעו היום.' }];
  const out = [];
  const beat = (b, a) => a && (!b || a.v > b.v);

  if (beat(before.season, after.season)) {
    out.push({ icon: '⚽', text: `שיא חדש — ${after.season.name}, ${after.season.v} שערים בעונה` +
      (before.season ? `. הקודם: ${before.season.v}.` : '.') });
  }
  if (after.scorer && (!before.scorer || before.scorer.name !== after.scorer.name)) {
    out.push({ icon: '👑', text: `${after.scorer.name} הוא מלך השערים של כל הזמנים — ${after.scorer.v} שערים` +
      (before.scorer ? `, ועקף את ${before.scorer.name}.` : '.') });
  }
  if (before.points !== null && after.points > before.points) {
    out.push({ icon: '📈', text: `שיא נקודות למועדון — ${after.points}. הקודם: ${before.points}.` });
  }
  if (before.margin !== null && after.margin > before.margin) {
    out.push({ icon: '💥', text: `הניצחון הגדול בתולדות המועדון.` });
  }
  if (before.gf !== null && after.gf > before.gf) {
    out.push({ icon: '🎯', text: `שיא שערים בעונה — ${after.gf}.` });
  }
  if (before.ga !== null && after.ga < before.ga) {
    out.push({ icon: '🧱', text: `הגנה הכי טובה אי פעם — ${after.ga} ספיגות בלבד.` });
  }
  if (after.legend && (!before.legend || before.legend.name !== after.legend.name)) {
    out.push({ icon: '🎖', text: `${after.legend.name} הוא שיאן העונות של המועדון — ${after.legend.v}.` });
  }
  return out.slice(0, 3);
}

// The lines under the awards on the results screen. Empty string when nothing
// fell, so the caller can assign it unconditionally.
function clrBrokenHTML(broken) {
  if (!broken || !broken.length) return '';
  return `<div class="clr-broken">` + broken.map(b =>
    `<div class="clr-broken-line">${b.icon} ${clrEsc(b.text)}</div>`).join('') + `</div>`;
}

/* ── the eleven of all time ─────────────────────────────────────────────────── */
// Composed from the players map, not stored: one source of truth means a
// corrected rating or a new season cannot leave a stale XI behind.
function clrAllTimeXI(l) {
  const byGroup = { gk: [], def: [], mid: [], att: [] };
  Object.values(l.players).forEach(p => {
    if (!p.bestOvr) return;
    (byGroup[p.bestOvr.grp] || byGroup.mid).push(p);
  });
  const out = [];
  CLR_GROUPS.forEach(g => {
    byGroup[g.id]
      .sort((a, b) => (b.bestOvr.n - a.bestOvr.n) ||
                      ((b.goals + b.assists) - (a.goals + a.assists)))
      .slice(0, g.n)
      .forEach(p => out.push({ group: g.id, label: g.label, name: p.name,
                               ovr: p.bestOvr.n, season: p.bestOvr.season,
                               goals: p.goals, assists: p.assists }));
  });
  return out;
}

/* ── the screen ─────────────────────────────────────────────────────────────── */

// `holder` is the name under the label — a player for a player record, the
// beaten opponent for the big win, nothing at all for a team number. `set` is
// what decides whether the row is a record or an empty shelf, because a team
// record can legitimately hold the value 0 (a season without conceding).
function clrRecordRow(icon, label, holder, value, sub, set) {
  const has = set === undefined ? !!holder : !!set;
  return `
    <div class="clr-row${has ? '' : ' clr-row-empty'}">
      <span class="clr-ico">${icon}</span>
      <span class="clr-main">
        <span class="clr-label">${clrEsc(label)}</span>
        ${has && holder ? `<span class="clr-holder">${clrEsc(holder)}</span>` : ''}
        ${has ? '' : '<span class="clr-holder"><i class="clr-none">עוד לא נקבע</i></span>'}
      </span>
      <span class="clr-val">${has ? clrEsc(value) : '—'}${
        has && sub ? `<small>${clrEsc(sub)}</small>` : ''}</span>
    </div>`;
}

function clrRecordsHTML(l) {
  const s = clrSnapshot(l);
  const t = l.team;
  const topOf = pick => {
    let best = null;
    Object.values(l.players).forEach(p => { const v = pick(p); if (v > 0 && (!best || v > best.v)) best = { p, v }; });
    return best;
  };
  const bestSeason = (() => {
    let best = null;
    Object.values(l.players).forEach(p => {
      if (p.bestGoals && p.bestGoals.n > 0 && (!best || p.bestGoals.n > best.n)) {
        best = { name: p.name, n: p.bestGoals.n, season: p.bestGoals.season };
      }
    });
    return best;
  })();
  const scorer = topOf(p => p.goals), assist = topOf(p => p.assists), legend = topOf(p => p.seasons);

  return `
    <div class="section-label">🏅 שיאי המועדון</div>
    <div class="clr-block">
      ${clrRecordRow('👑', 'מלך השערים של כל הזמנים', scorer && scorer.p.name,
                     scorer ? clrCount(scorer.v, 'שער אחד', 'שערים') : '')}
      ${clrRecordRow('🎩', 'מלך הבישולים', assist && assist.p.name,
                     assist ? clrCount(assist.v, 'בישול אחד', 'בישולים') : '')}
      ${clrRecordRow('🎖', 'אגדת המועדון', legend && legend.p.name,
                     legend ? clrCount(legend.v, 'עונה אחת', 'עונות') : '')}
      ${clrRecordRow('⚽', 'הכי הרבה שערים בעונה', bestSeason && bestSeason.name,
                     bestSeason ? clrCount(bestSeason.n, 'שער אחד', 'שערים') : '',
                     bestSeason && bestSeason.season)}
    </div>
    <div class="clr-block">
      ${clrRecordRow('📈', 'הכי הרבה נקודות בעונה', '', t.points ? t.points.n + ' נק׳' : '',
                     t.points && t.points.season, !!t.points)}
      ${clrRecordRow('🎯', 'הכי הרבה שערים בעונה', '', t.gf ? t.gf.n : '',
                     t.gf && t.gf.season, !!t.gf)}
      ${clrRecordRow('🧱', 'הכי מעט ספיגות בעונה', '', t.ga ? t.ga.n : '',
                     t.ga && t.ga.season, !!t.ga)}
      ${clrRecordRow('💥', 'הניצחון הגדול ביותר', t.bigWin ? t.bigWin.opponent : '',
                     t.bigWin ? `${t.bigWin.gf}-${t.bigWin.ga}` : '',
                     t.bigWin && t.bigWin.season, !!t.bigWin)}
    </div>`;
}

// The numbers are the CLUB's, not this screen's: cmSetNum in js/club-media.js
// stores them on the club record keyed by the player's FULL name, so a man
// keeps the number you gave him in the team photo when he turns up in the
// eleven of all time — and the other way round. Same store, same key, same
// edit-mode-not-an-input pattern.
let _clrEditNums = false;

function clrXIHTML(l) {
  const xi = clrAllTimeXI(l);
  if (!xi.length) {
    return `<div class="section-label">⭐ האחד עשר של כל הזמנים</div>
            <div class="clr-empty">אחד עשר מקומות ריקים. כל עונה שתשחק ממלאת אותם.</div>`;
  }
  const club = (typeof clubGet === 'function' ? clubGet() : null);
  // The keeper wears the keeper's strip. It is a rule of the game rather than a
  // preference — club.js says so where kitGK is defined, and a team photo with
  // eleven identical shirts reads wrong immediately.
  const shirt = (name, n, gk) => (typeof clubShirtSVG === 'function')
    ? clubShirtSVG(club, 54, n, gk, (typeof clubSurname === 'function' ? clubSurname(name) : name))
    : '';
  // A number you chose wins over the teamsheet default, which is simply the
  // order the eleven is built in: 1 in goal, 2-5 across the back, 6-8 in
  // midfield, 9-11 up front.
  const over = (typeof cmNums === 'function') ? cmNums() : {};
  const cells = xi.map((p, i) => {
    const num = over[p.name] || (i + 1);
    return `
    <div class="clr-man">
      ${shirt(p.name, num, p.group === 'gk')}
      <span class="clr-man-name">${clrEsc(typeof playerShortName === 'function' ? playerShortName(p.name) : p.name)}</span>
      <span class="clr-man-sub">${p.ovr}${p.season ? ' · ' + clrEsc(p.season) : ''}</span>
      ${_clrEditNums ? `<input class="cm-num-in" type="number" min="1" max="99" value="${num}"
              data-name="${clrEsc(p.name)}" aria-label="מספר של ${clrEsc(p.name)}">` : ''}
    </div>`;
  }).join('');
  return `
    <div class="section-label">⭐ האחד עשר של כל הזמנים</div>
    <div class="clr-xi">${cells}</div>
    <div class="clr-xi-note">הדירוג הוא זה שהיה לו בעונה שבה שיחק אצלך.</div>
    <button class="cl-mini${_clrEditNums ? ' cm-edit-on' : ''}" id="clr-nums">${
      _clrEditNums ? '✓ סיום' : '✏️ ערוך מספרים'}</button>`;
}

function clubHomeHTML() {
  const club = (typeof clubGet === 'function' ? clubGet() : null);
  if (!club || !String(club.name || '').trim()) {
    return `<div class="clr-intro">
      <p>עוד אין לך מועדון. תן לו שם, סמל וצבעים — ומהעונה הבאה כל שער, כל נקודה
         וכל תואר נרשמים על שמו.</p>
      <button class="btn-primary" id="clr-make">✎ הקם מועדון</button>
    </div>`;
  }
  const l = clrGet();
  const crest = (typeof clubCrestSVG === 'function') ? clubCrestSVG(club, 64) : '';
  const line = l.seasons
    ? `${l.seasons} ${l.seasons === 1 ? 'עונה' : 'עונות'} בהיסטוריה של המועדון`
    : 'עוד לא שוחקה עונה על שם המועדון';
  const cabinet = (typeof crHonoursHTML === 'function' && typeof crLifetimeHonours === 'function')
    ? crHonoursHTML(null, { counts: crLifetimeHonours(), title: 'ארון התארים' })
    : '';
  return `
    <div class="clr-head">
      <div class="clr-head-crest">${crest}</div>
      <div class="clr-head-txt">
        <div class="clr-head-name">${clrEsc(club.name)}</div>
        ${club.city ? `<div class="clr-head-city">${clrEsc(club.city)}</div>` : ''}
        <div class="clr-head-line">${clrEsc(line)}</div>
      </div>
    </div>
    ${cabinet}
    ${clrRecordsHTML(l)}
    ${clrXIHTML(l)}
    <div class="clr-actions">
      <button class="cl-mini" id="clr-edit">✎ ערוך את המועדון</button>
      <button class="cl-mini clr-danger" id="clr-reset">אפס את השיאים</button>
    </div>`;
}

function showClubHome() {
  const body = document.getElementById('club-home-body');
  if (!body) return;
  body.innerHTML = clubHomeHTML();
  if (typeof showScreen === 'function') showScreen('club-home');
  if (typeof track === 'function') track('open', 'club');

  // Back to where the door is: the setup screen carries the club card.
  const back = document.getElementById('club-home-back');
  if (back) back.onclick = () => {
    if (typeof clubSyncSetupCard === 'function') clubSyncSetupCard();
    if (typeof showScreen === 'function') showScreen('setup');
  };

  // Editing the numbers is a MODE, not an input parked on every shirt — the
  // same call club-media.js made, for the same reason: eleven live inputs are
  // eleven things between you and the team you came here to look at.
  body.querySelector('#clr-nums')?.addEventListener('click', () => {
    _clrEditNums = !_clrEditNums;
    showClubHome();
  });
  // Delegated, and ASSIGNED rather than added: showClubHome re-renders itself
  // after every change, and #club-home-body survives that — addEventListener
  // here would stack one more listener per render until a single edit fired
  // eleven of them.
  body.onchange = e => {
    const el = e.target.closest && e.target.closest('.cm-num-in');
    if (!el || typeof cmSetNum !== 'function') return;
    cmSetNum(el.dataset.name, el.value);
    showClubHome();
  };

  const edit = () => { if (typeof showClubEditor === 'function') showClubEditor(() => showClubHome()); };
  body.querySelector('#clr-make')?.addEventListener('click', edit);
  body.querySelector('#clr-edit')?.addEventListener('click', edit);
  body.querySelector('#clr-reset')?.addEventListener('click', () => {
    // Wiping is never automatic — not on a rename, not on a career ending. It
    // happens here, once, and it says what it is taking.
    if (!confirm('לאפס את כל שיאי המועדון? התארים והקריירות יישארו, השיאים יימחקו.')) return;
    clrWipe();
    showClubHome();
  });
}
