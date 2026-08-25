// ─── Mini games: the small loops that live outside a full season ──────────────
//
// Three short games share one screen and one shelf, so none of them has to
// bloat a section that already exists:
//   🎯 נחש את השחקן  (mg-guess.js)   — a career table, six guesses
//   ⚖️ מי טוב יותר    (mg-versus.js)  — two cards, one call, a streak
//   💰 מכירה פומבית   (mg-auction.js) — a budget instead of a draft, then a real season
//
// This file owns the shelf and everything the three of them share: the career
// index built out of SQUADS, the pools they draw from, and the day key.

const MG_EPOCH = '2026-08-23';   // mini-game #1

function mgEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Names in data.js carry directional marks and three kinds of apostrophe, and
// these games match players BY NAME across seasons. Every comparison goes
// through here.
function mgNorm(s) {
  return String(s ?? '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[׳’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── the day ──────────────────────────────────────────────────────────────── */
// Israel time, borrowed from the challenge engine so "today" means the same
// thing everywhere in the app.
function mgDayKey() {
  if (typeof challengeKey === 'function') return challengeKey('daily');
  return new Date().toISOString().slice(0, 10);
}
function mgDayNumber(key) {
  const k = key ?? mgDayKey();
  const a = Date.UTC(...MG_EPOCH.split('-').map((n, i) => i === 1 ? +n - 1 : +n));
  const b = Date.UTC(...k.split('-').map((n, i) => i === 1 ? +n - 1 : +n));
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/* ── deterministic randomness ─────────────────────────────────────────────── */
function mgSeed(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}
function mgRng(seed) {
  return typeof mulberry32 === 'function' ? mulberry32(mgSeed(seed)) : Math.random;
}
function mgShuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── the career index ─────────────────────────────────────────────────────── */
// Every player, once, with the seasons he really played. Built once and cached;
// a mid-season move puts a player in two clubs the same year, and only the
// better card of that year is kept so a career reads one row per season.
let _mgIndex = null;
function mgIndex() {
  if (_mgIndex) return _mgIndex;
  const idx = new Map();
  SQUADS.forEach(sq => {
    const y = parseSeasonYear(sq.season);
    sq.players.forEach(p => {
      const k = mgNorm(p.name);
      let e = idx.get(k);
      if (!e) { e = { key: k, name: p.name, rows: [] }; idx.set(k, e); }
      e.rows.push({ y, season: sq.season, teamId: sq.teamId, ovr: p.ovr, pos: normalizePos(p.position) });
    });
  });
  idx.forEach(e => {
    e.rows.sort((a, b) => a.y - b.y || b.ovr - a.ovr);
    const seen = new Set();
    e.rows = e.rows.filter(r => seen.has(r.y) ? false : (seen.add(r.y), true));
    e.peak    = Math.max(...e.rows.map(r => r.ovr));
    e.seasons = e.rows.length;
    e.first   = e.rows[0];
    e.last    = e.rows[e.rows.length - 1];
    e.clubs   = [...new Set(e.rows.map(r => r.teamId))];
    // the position he spent most of his career in
    const byPos = {};
    e.rows.forEach(r => { byPos[r.pos] = (byPos[r.pos] ?? 0) + 1; });
    e.pos = Object.keys(byPos).sort((a, b) => byPos[b] - byPos[a])[0];
  });
  return (_mgIndex = idx);
}

const _mgPools = {};
function mgPool(minSeasons, minPeak) {
  const ck = minSeasons + '|' + minPeak;
  if (_mgPools[ck]) return _mgPools[ck];
  const out = [];
  mgIndex().forEach(e => { if (e.seasons >= minSeasons && e.peak >= minPeak) out.push(e); });
  out.sort((a, b) => a.key < b.key ? -1 : 1);      // stable, so the daily rota is stable
  return (_mgPools[ck] = out);
}

let _mgNames = null;
function mgAllNames() {
  if (_mgNames) return _mgNames;
  const out = [];
  mgIndex().forEach(e => out.push(e));
  return (_mgNames = out.sort((a, b) => b.peak - a.peak));   // best-known first in suggestions
}
function mgFind(name) { return mgIndex().get(mgNorm(name)) || null; }

function mgClub(teamId) { return (TEAMS[teamId] ?? { name: teamId }).name; }
function mgBadge(teamId) { return (TEAMS[teamId] ?? {}).badge ?? '⚽'; }

/* ── storage ──────────────────────────────────────────────────────────────── */
function mgLoad(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (e) { return fallback; }
}
function mgSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* ── copy / share ─────────────────────────────────────────────────────────── */
async function mgShareText(text, btn) {
  const label = btn ? btn.textContent : '';
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    if (btn) { btn.textContent = '✓ הועתק'; setTimeout(() => { btn.textContent = label; }, 1800); }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    if (btn) { btn.textContent = 'ההעתקה נכשלה'; setTimeout(() => { btn.textContent = label; }, 1800); }
  }
}

/* ── the shelf ────────────────────────────────────────────────────────────── */
function showMiniGames() {
  showScreen('minigames');
  const back = document.getElementById('minigames-back');
  if (back) back.onclick = () => showScreen('welcome');
  mgHome();
}

function mgHome() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const games = [
    { id: 'wordle',  icon: '⚽', title: 'כדורדל',
      sub: 'אותם 11 מועדונים לכל המדינה, ניסיון אחד ביום. הוורדל של הכדורגל הישראלי.',
      best: typeof mgWordleShelfLine === 'function' ? mgWordleShelfLine() : '',
      go: () => mgWordleOpen() },
    { id: 'guess',   icon: '🎯', title: 'נחש את השחקן',
      sub: 'קריירה שנחשפת עונה אחרי עונה. שש הזדמנויות לזהות מי זה.',
      best: typeof mgGuessShelfLine === 'function' ? mgGuessShelfLine() : '',
      go: () => mgGuessOpen() },
    { id: 'versus',  icon: '⚖️', title: 'מי טוב יותר?',
      sub: 'שני שחקנים, שתי עונות, החלטה אחת. כמה תחזיק ברצף?',
      best: typeof mgVersusShelfLine === 'function' ? mgVersusShelfLine() : '',
      go: () => mgVersusOpen() },
    { id: 'grid',    icon: '🥅', title: 'רשת העל',
      sub: 'תשע משבצות: כל אחת מועדון מול תנאי. ניחוש אחד לכל משבצת, רשת אחת ליום.',
      best: typeof mgGridShelfLine === 'function' ? mgGridShelfLine() : '',
      go: () => mgGridOpen() },
    { id: 'auction', icon: '💰', title: 'מכירה פומבית',
      sub: 'בלי הגרלה — תקציב. תבנה סגל במכרז מול שלושה יריבים, ואז תשחק איתו עונה.',
      best: typeof mgAuctionShelfLine === 'function' ? mgAuctionShelfLine() : '',
      go: () => mgAuctionOpen() },
  ];
  box.innerHTML = `
    <p class="page-note mg-shelf-note">משחקים קצרים לצד המשחק הגדול — כל אחד נגמר בכמה דקות.</p>
    <div class="mg-shelf">
      ${games.map(g => `
        <button class="mg-card" data-id="${g.id}">
          <span class="mg-card-icon">${g.icon}</span>
          <span class="mg-card-body">
            <span class="mg-card-title">${mgEsc(g.title)}</span>
            <span class="mg-card-sub">${mgEsc(g.sub)}</span>
            ${g.best ? `<span class="mg-card-best">${mgEsc(g.best)}</span>` : ''}
          </span>
          <span class="mg-card-arrow">←</span>
        </button>`).join('')}
    </div>`;
  box.querySelectorAll('.mg-card').forEach(btn => {
    const g = games.find(x => x.id === btn.dataset.id);
    btn.onclick = g.go;
  });
}

// Every game hands the shelf back the same way.
function mgBackBar(title) {
  return `
    <div class="mg-topbar">
      <button class="back-btn" id="mg-to-shelf">→ למשחקונים</button>
      <span class="mg-topbar-title">${mgEsc(title)}</span>
    </div>`;
}
function mgWireBack() {
  const b = document.getElementById('mg-to-shelf');
  if (b) b.onclick = mgHome;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-minigames')?.addEventListener('click', showMiniGames);
});
