// ─── 🥅 רשת העל — nine squares, one guess each ───────────────────────────────
//
// Three clubs down the side, three conditions across the top, and every square
// is the crossing of two of them: a player who was at THIS club and also fits
// THAT. One guess per square, nine in a day, the same nine for the whole
// country. Immaculate Grid, in Hebrew, on our own data.
//
// Everything it needs already exists: mgIndex() knows every player's clubs,
// seasons, peak and position, and PLAYER_NATS knows where he is from. The only
// real work is drawing a grid where every square HAS answers — that is where
// grid games break, so the draw is validated before it is shown.

const MGT_KEY   = '36-0-mg-grid';
const MGT_MIN   = 3;      // a square with fewer answers than this is unfair
const MGT_TRIES = 40;     // draws to attempt before falling back

/* ── the conditions ───────────────────────────────────────────────────────── */
// Each is { id, label, test(entry) }. `_set` caches the players that match.
function mgtClubCriteria() {
  const counts = {};
  mgIndex().forEach(e => e.clubs.forEach(c => { counts[c] = (counts[c] ?? 0) + 1; }));
  return Object.keys(counts)
    .filter(id => counts[id] >= 60 && TEAMS[id])          // a club with a real history
    .sort()                                               // stable before the seeded shuffle
    .map(id => ({ id: 'club:' + id, kind: 'club', teamId: id,
                  label: TEAMS[id].name, test: e => e.clubs.indexOf(id) !== -1 }));
}

const MGT_POS_GROUPS = [
  { id: 'gk',  label: 'שוער',  set: ['GK'] },
  { id: 'def', label: 'הגנה',  set: ['CB', 'RB', 'LB', 'RWB', 'LWB'] },
  { id: 'mid', label: 'קישור', set: ['CM', 'CDM', 'CAM', 'RM', 'LM'] },
  { id: 'att', label: 'התקפה', set: ['ST', 'CF', 'SS', 'RW', 'LW'] },
];

function mgtOtherCriteria() {
  const out = [];

  // decades — the data starts in 1999/00, so the nineties are one season and out
  [[2000, 'שנות ה-2000'], [2010, 'שנות ה-2010'], [2020, 'שנות ה-2020']].forEach(([d, label]) => {
    out.push({ id: 'dec:' + d, kind: 'decade', label,
               test: e => e.rows.some(r => Math.floor(r.y / 10) * 10 === d) });
  });

  // nationalities — Israel would match nearly everyone, so it is not a condition
  const natCount = {};
  if (typeof PLAYER_NATS === 'object' && PLAYER_NATS) {
    Object.keys(PLAYER_NATS).forEach(name => {
      (PLAYER_NATS[name] || []).forEach(n => {
        if (n === 'ישראל') return;
        natCount[n] = (natCount[n] ?? 0) + 1;
      });
    });
  }
  Object.keys(natCount).filter(n => natCount[n] >= 12).sort().forEach(n => {
    out.push({ id: 'nat:' + n, kind: 'nat', label: n, test: e => mgtNatsOf(e).indexOf(n) !== -1 });
  });

  // rating and shape of career
  out.push({ id: 'peak85', kind: 'peak',  label: 'דירוג שיא 85+', test: e => e.peak >= 85 });
  out.push({ id: 'peak90', kind: 'peak',  label: 'דירוג שיא 90+', test: e => e.peak >= 90 });
  out.push({ id: 'long',   kind: 'span',  label: '8 עונות ומעלה', test: e => e.seasons >= 8 });

  MGT_POS_GROUPS.forEach(g => {
    out.push({ id: 'pos:' + g.id, kind: 'pos', label: g.label,
               test: e => g.set.indexOf(e.pos) !== -1 });
  });

  return out;
}

// nationality lookup goes through the same normalisation as everything else
let _mgtNats = null;
function mgtNatsOf(entry) {
  if (!_mgtNats) {
    _mgtNats = new Map();
    if (typeof PLAYER_NATS === 'object' && PLAYER_NATS) {
      Object.keys(PLAYER_NATS).forEach(name => _mgtNats.set(mgNorm(name), PLAYER_NATS[name] || []));
    }
  }
  return _mgtNats.get(entry.key) || [];
}

function mgtMatches(c) {
  if (c._set) return c._set;
  const out = new Set();
  mgIndex().forEach(e => { if (c.test(e)) out.add(e.key); });
  return (c._set = out);
}

// the players that satisfy a row AND a column
function mgtAnswers(rowC, colC) {
  const a = mgtMatches(rowC), b = mgtMatches(colC);
  const small = a.size <= b.size ? a : b;
  const big   = a.size <= b.size ? b : a;
  const out = [];
  small.forEach(k => { if (big.has(k)) out.push(k); });
  return out;
}

/* ── the daily draw ───────────────────────────────────────────────────────── */
// Rows are three clubs; columns are one more club (so three squares are the
// classic "played for both") plus two open conditions. A draw is only shown if
// every one of the nine squares has at least MGT_MIN answers.
function mgtBuildGrid(dayKey) {
  const rng = mgRng('grid|' + dayKey);
  const clubs  = mgShuffled(mgtClubCriteria(), rng);
  const others = mgShuffled(mgtOtherCriteria(), rng);

  for (let t = 0; t < MGT_TRIES; t++) {
    const rows = [clubs[(t * 4) % clubs.length],
                  clubs[(t * 4 + 1) % clubs.length],
                  clubs[(t * 4 + 2) % clubs.length]];
    const cols = [clubs[(t * 4 + 3) % clubs.length],
                  others[(t * 2) % others.length],
                  others[(t * 2 + 1) % others.length]];
    const ids = new Set([...rows, ...cols].map(c => c.id));
    if (ids.size !== 6) continue;                       // no condition twice
    let ok = true;
    const answers = [];
    for (const r of rows) {
      for (const c of cols) {
        const a = mgtAnswers(r, c);
        if (a.length < MGT_MIN) { ok = false; break; }
        answers.push(a);
      }
      if (!ok) break;
    }
    if (ok) return { rows, cols, answers };
  }
  // Never leave a player without a puzzle: the loosest possible board.
  const rows = clubs.slice(0, 3);
  const cols = [clubs[3], others.find(c => c.id === 'dec:2010') || others[0],
                          others.find(c => c.id === 'peak85') || others[1]];
  const answers = [];
  rows.forEach(r => cols.forEach(c => answers.push(mgtAnswers(r, c))));
  return { rows, cols, answers };
}

let _mgtGrid = null;
function mgtGrid() {
  const key = mgDayKey();
  if (_mgtGrid && _mgtGrid.key === key) return _mgtGrid;
  const g = mgtBuildGrid(key);
  return (_mgtGrid = { key, ...g });
}

/* ── state ────────────────────────────────────────────────────────────────── */
function mgtState() {
  const s = mgLoad(MGT_KEY, null);
  const key = mgDayKey();
  if (!s || s.dayKey !== key) return { dayKey: key, cells: Array(9).fill(null), played: 0, best: (s && s.best) || 0 };
  return s;
}
function mgtSave(s) { mgSave(MGT_KEY, s); }
function mgtScore(s) { return s.cells.filter(c => c && c.ok).length; }
function mgtDone(s)  { return s.cells.every(Boolean); }

function mgGridShelfLine() {
  const s = mgtState();
  if (!s.cells.some(Boolean)) return s.best ? `🏅 השיא שלך: ${s.best}/9` : '';
  return mgtDone(s) ? `✓ היום: ${mgtScore(s)}/9` : `בעיצומו: ${s.cells.filter(Boolean).length}/9 משבצות`;
}

/* ── the screen ───────────────────────────────────────────────────────────── */
let _mgtPick = null;      // the cell waiting for a name

function mgGridOpen() {
  if (typeof track === 'function') track('open', 'minigame', 'grid');
  _mgtPick = null;
  mgtRender();
}

function mgtHeadHTML(c) {
  if (c.kind === 'club') {
    return `<img class="mgt-crest" src="crests/${c.teamId}.png" alt="" loading="lazy"
                 onerror="this.style.display='none'"><span class="mgt-head-label">${mgEsc(c.label)}</span>`;
  }
  return `<span class="mgt-head-label mgt-head-cond">${mgEsc(c.label)}</span>`;
}

function mgtRender() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const g = mgtGrid();
  const s = mgtState();
  const done = mgtDone(s);

  let cells = '';
  g.rows.forEach((r, ri) => {
    cells += `<div class="mgt-head mgt-row-head">${mgtHeadHTML(r)}</div>`;
    g.cols.forEach((c, ci) => {
      const i = ri * 3 + ci;
      const cell = s.cells[i];
      const state = !cell ? (i === _mgtPick ? ' picking' : '') : (cell.ok ? ' ok' : ' bad');
      cells += `
        <button class="mgt-cell${state}" data-i="${i}" ${cell ? 'disabled' : ''}>
          ${cell
            ? `<span class="mgt-cell-name">${mgEsc(cell.name)}</span>
               <span class="mgt-cell-mark">${cell.ok ? '✓' : '✗'}</span>
               ${cell.ok ? `<span class="mgt-cell-rate">${cell.pool} אפשרויות</span>` : ''}`
            : '<span class="mgt-cell-plus">+</span>'}
        </button>`;
    });
  });

  box.innerHTML = `
    ${mgBackBar('רשת העל')}
    <div class="mgt-intro">
      <div class="mgt-title">🥅 רשת העל <span dir="ltr">#${mgDayNumber()}</span></div>
      <p class="mgt-sub">כל משבצת היא שחקן שעונה על <b>שני התנאים</b> — של השורה ושל העמודה.
         מועדון מול מועדון? מי ששיחק בשניהם. מועדון מול לאום, עשור או עמדה? מי שעונה על שניהם.<br>
         ניחוש אחד לכל משבצת, תשע משבצות, אותה רשת לכל המדינה.</p>
    </div>
    <div class="mgt-grid">
      <div class="mgt-corner"></div>
      ${g.cols.map(c => `<div class="mgt-head mgt-col-head">${mgtHeadHTML(c)}</div>`).join('')}
      ${cells}
    </div>
    <div class="mgt-status" id="mgt-status">${done
      ? `<b>${mgtScore(s)}/9</b> — הרשת של היום נגמרה`
      : (_mgtPick == null ? 'בחר משבצת ריקה' : 'מי מתאים למשבצת הזאת?')}</div>
    ${(!done && _mgtPick != null) ? `
      <div class="mgg-input-wrap">
        <input id="mgt-input" class="lg-input" type="text" autocomplete="off"
               placeholder="שם השחקן…">
        <div class="mgg-sugg" id="mgt-sugg"></div>
      </div>` : ''}
    ${done ? `
      <button class="btn-primary btn-full" id="mgt-share">📤 שתף את הרשת</button>
      <div class="mgt-answers" id="mgt-answers"></div>` : ''}`;

  mgWireBack();
  box.querySelectorAll('.mgt-cell').forEach(b => {
    b.onclick = () => { _mgtPick = Number(b.dataset.i); mgtRender(); };
  });
  if (_mgtPick != null && !done) mgtWireInput();
  if (done) {
    const share = document.getElementById('mgt-share');
    if (share) share.onclick = () => mgShareText(mgtShareText(s), share);
    mgtRenderAnswers(s);
  }
}

function mgtWireInput() {
  const input = document.getElementById('mgt-input');
  const sugg  = document.getElementById('mgt-sugg');
  if (!input || !sugg) return;
  input.focus();
  const s = mgtState();
  const used = new Set(s.cells.filter(Boolean).map(c => mgNorm(c.name)));

  const close = () => { sugg.innerHTML = ''; sugg.classList.remove('open'); };
  input.oninput = () => {
    const q = mgNorm(input.value);
    if (q.length < 2) return close();
    const hits = mgAllNames().filter(e => e.key.includes(q) && !used.has(e.key)).slice(0, 8);
    if (!hits.length) return close();
    sugg.innerHTML = hits.map(e => `
      <button class="mgg-sugg-item" data-name="${mgEsc(e.name)}">
        <span>${mgEsc(e.name)}</span>
        <span class="mgg-sugg-meta">${e.first.y}–${e.last.y} · ${mgEsc(e.pos)}</span>
      </button>`).join('');
    sugg.classList.add('open');
    sugg.querySelectorAll('.mgg-sugg-item').forEach(b => {
      b.onclick = () => { close(); mgtSubmit(b.dataset.name); };
    });
  };
  input.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const first = sugg.querySelector('.mgg-sugg-item');
    if (first) { close(); mgtSubmit(first.dataset.name); }
  };
}

function mgtSubmit(name) {
  const i = _mgtPick;
  if (i == null) return;
  const entry = mgFind(name);
  if (!entry) return;
  const s = mgtState();
  if (s.cells[i]) return;
  // one player, one square — the suggestion list hides used names, and this is
  // the rule behind it
  if (s.cells.some(c => c && mgNorm(c.name) === entry.key)) return;
  const g = mgtGrid();
  const r = g.rows[Math.floor(i / 3)], c = g.cols[i % 3];
  const pool = g.answers[i] || mgtAnswers(r, c);
  const ok = pool.indexOf(entry.key) !== -1;

  s.cells[i] = { name: entry.name, ok, pool: pool.length };
  if (mgtDone(s)) {
    s.played = (s.played || 0) + 1;
    s.best = Math.max(s.best || 0, mgtScore(s));
    if (typeof track === 'function') track('finish', 'minigame', 'grid-' + mgtScore(s));
  }
  mgtSave(s);
  _mgtPick = null;
  mgtRender();
}

/* ── the end ──────────────────────────────────────────────────────────────── */
// What COULD have gone in the squares you missed — the part people screenshot.
function mgtRenderAnswers(s) {
  const box = document.getElementById('mgt-answers');
  if (!box) return;
  const g = mgtGrid();
  const misses = [];
  s.cells.forEach((cell, i) => {
    if (cell && cell.ok) return;
    const r = g.rows[Math.floor(i / 3)], c = g.cols[i % 3];
    const names = (g.answers[i] || mgtAnswers(r, c))
      .map(k => mgIndex().get(k))
      .filter(Boolean)
      .sort((a, b) => b.peak - a.peak)
      .slice(0, 4)
      .map(e => e.name);
    misses.push({ r, c, names });
  });
  if (!misses.length) { box.innerHTML = '<div class="mgt-perfect">🏆 תשע מתוך תשע. רשת מושלמת.</div>'; return; }
  box.innerHTML = `
    <div class="section-label">מה היה אפשר לשים</div>
    ${misses.map(m => `
      <div class="mgt-answer">
        <div class="mgt-answer-head">${mgEsc(m.r.label)} <span>✕</span> ${mgEsc(m.c.label)}</div>
        <div class="mgt-answer-names">${m.names.map(mgEsc).join(' · ')}</div>
      </div>`).join('')}`;
}

function mgtShareText(s) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    rows.push(s.cells.slice(r * 3, r * 3 + 3)
      .map(c => !c ? '⬜' : c.ok ? '🟩' : '🟥').join(''));
  }
  return [
    `🥅 רשת העל #${mgDayNumber()} — ${mgtScore(s)}/9`,
    '',
    ...rows,
    '',
    'https://www.36-0.co.il/',
  ].join('\n');
}
