// ─── 🎯 נחש את השחקן ──────────────────────────────────────────────────────────
//
// A career table with every season in it, but only the years are legible. One
// row opens with each wrong guess, and six guesses is all there is. The daily
// player is the same for everyone (Israel time), and the rota is a fixed
// shuffle of the pool, so nobody repeats until the whole pool has been used.

const MGG_KEY   = '36-0-mg-guess';
const MGG_TRIES = 6;
const MGG_POOL  = { seasons: 3, peak: 82 };   // 313 players — recognisable, and long enough to read

function mggState() {
  return mgLoad(MGG_KEY, { dayKey: null, guesses: [], done: null, streak: 0, best: 0, wins: 0, played: 0 });
}
function mggSave(s) { mgSave(MGG_KEY, s); }

function mgGuessShelfLine() {
  const s = mggState();
  if (!s.played) return '';
  const today = s.dayKey === mgDayKey() && s.done ? ' · היומי של היום ' + (s.done === 'win' ? '✓' : '✗') : '';
  return `🔥 רצף ${s.streak} · שיא ${s.best} · ${s.wins}/${s.played}${today}`;
}

/* ── the target ───────────────────────────────────────────────────────────── */
function mggDailyTarget(key) {
  const pool = mgPool(MGG_POOL.seasons, MGG_POOL.peak);
  const rota = mgShuffled(pool, mgRng('mg-guess-rota-v1'));
  return rota[(mgDayNumber(key) - 1) % rota.length];
}
function mggRandomTarget() {
  const pool = mgPool(MGG_POOL.seasons, MGG_POOL.peak);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── run state (in memory; the daily also persists) ───────────────────────── */
let _mggRun = null;

function mgGuessOpen() {
  if (typeof track === 'function') track('open', 'minigame', 'guess');
  const s = mggState();
  const key = mgDayKey();
  if (s.dayKey !== key) { s.dayKey = key; s.guesses = []; s.done = null; mggSave(s); }
  _mggRun = {
    mode: 'daily', key, target: mggDailyTarget(key),
    guesses: s.guesses.slice(), done: s.done,
  };
  mggRender();
}

function mgGuessEndless() {
  _mggRun = { mode: 'endless', key: null, target: mggRandomTarget(), guesses: [], done: null };
  mggRender();
}

/* ── clues ────────────────────────────────────────────────────────────────── */
// Rows open from the first season forward. When a career is shorter than the
// six guesses, the leftovers buy the softer clues instead.
function mggOpenRows(run) { return Math.min(run.target.rows.length, run.guesses.length + 1); }
function mggExtraClues(run) {
  const spare = Math.max(0, (run.guesses.length + 1) - run.target.rows.length);
  const out = [];
  if (spare >= 1) out.push({ label: 'דירוג שיא', value: String(run.target.peak) });
  if (spare >= 2) {
    const nats = typeof playerNats === 'function' ? playerNats(run.target.name) : [];
    out.push({ label: 'לאום', value: nats.length
      ? nats.map(n => `${typeof natFlag === 'function' ? natFlag(n) : ''} ${n}`).join(' · ') : 'לא ידוע' });
  }
  if (spare >= 3) out.push({ label: 'מספר מועדונים', value: String(run.target.clubs.length) });
  return out;
}

/* ── scoring a guess ──────────────────────────────────────────────────────── */
function mggPosGroup(pos) {
  const has = (arr) => Array.isArray(arr) && arr.includes(pos);
  if (pos === 'GK') return 'GK';
  if (typeof DEF_POS !== 'undefined' && has(DEF_POS)) return 'DEF';
  if (typeof MID_POS !== 'undefined' && has(MID_POS)) return 'MID';
  if (typeof ATK_POS !== 'undefined' && has(ATK_POS)) return 'ATK';
  return 'MID';
}
function mggScore(guess, target) {
  const posHit = guess.pos === target.pos ? 'hit'
               : mggPosGroup(guess.pos) === mggPosGroup(target.pos) ? 'near' : 'miss';
  const shared = guess.clubs.filter(c => target.clubs.includes(c));
  const clubHit = shared.length ? 'hit' : 'miss';
  const gA = guess.first.y, gB = guess.last.y, tA = target.first.y, tB = target.last.y;
  const overlap = gA <= tB && tA <= gB;
  const gap = overlap ? 0 : Math.min(Math.abs(tA - gB), Math.abs(gA - tB));
  const eraHit = overlap ? 'hit' : gap <= 5 ? 'near' : 'miss';
  const d = target.peak - guess.peak;
  const peakHit = Math.abs(d) <= 1 ? 'hit' : d > 0 ? 'up' : 'down';
  return { posHit, clubHit, eraHit, peakHit, shared };
}
const MGG_EMOJI = { hit: '🟩', near: '🟨', miss: '⬜', up: '🔼', down: '🔽' };

/* ── render ───────────────────────────────────────────────────────────────── */
function mggRender() {
  const run = _mggRun;
  const box = document.getElementById('mg-content');
  if (!run || !box) return;
  const t = run.target;
  const open = mggOpenRows(run);
  const finished = !!run.done;

  const rows = t.rows.map((r, i) => {
    const shown = finished || i < open;
    return `
      <div class="mgg-row ${shown ? 'open' : 'masked'}">
        <span class="mgg-season" dir="ltr">${mgEsc(r.season)}</span>
        <span class="mgg-club">${shown ? mgEsc(mgBadge(r.teamId) + ' ' + mgClub(r.teamId)) : '• • •'}</span>
        <span class="mgg-pos">${shown ? mgEsc(r.pos) : '••'}</span>
        <span class="mgg-ovr">${shown ? r.ovr : '••'}</span>
      </div>`;
  }).join('');

  const extras = finished ? [] : mggExtraClues(run);
  const guessRows = run.guesses.map(name => {
    const g = mgFind(name);
    if (!g) return '';
    const sc = mggScore(g, t);
    const chip = (state, label) => `<span class="mgg-chip ${state}">${MGG_EMOJI[state]} ${label}</span>`;
    return `
      <div class="mgg-guess">
        <div class="mgg-guess-name">${mgEsc(g.name)} <span class="mgg-guess-meta">${g.first.y}–${g.last.y} · שיא ${g.peak}</span></div>
        <div class="mgg-chips">
          ${chip(sc.posHit, g.pos)}
          ${chip(sc.clubHit, sc.shared.length ? mgClub(sc.shared[0]) : 'מועדון')}
          ${chip(sc.eraHit, 'תקופה')}
          ${chip(sc.peakHit, sc.peakHit === 'up' ? 'המבוקש מדורג גבוה יותר'
                           : sc.peakHit === 'down' ? 'המבוקש מדורג נמוך יותר' : 'אותו דירוג שיא')}
        </div>
      </div>`;
  }).join('');

  const left = MGG_TRIES - run.guesses.length;
  const title = run.mode === 'daily' ? `🎯 נחש את השחקן <span dir="ltr">#${mgDayNumber(run.key)}</span>` : '🎯 סיבוב חופשי';

  box.innerHTML = `
    ${mgBackBar('נחש את השחקן')}
    <div class="mgg-head">
      <div class="mgg-title">${title}</div>
      <div class="mgg-sub">${finished ? '' : `עמדה: <strong>${mgEsc(t.pos)}</strong> · ${t.rows.length} עונות בליגה · נותרו <strong>${left}</strong> ניחושים`}</div>
    </div>
    <div class="mgg-table">
      <div class="mgg-row mgg-head-row"><span>עונה</span><span>מועדון</span><span>עמדה</span><span>דירוג</span></div>
      ${rows}
    </div>
    ${extras.length ? `<div class="mgg-extras">${extras.map(c =>
      `<span class="mgg-extra"><b>${mgEsc(c.label)}:</b> ${mgEsc(c.value)}</span>`).join('')}</div>` : ''}
    ${finished ? mggEndHTML(run) : `
      <div class="mgg-input-wrap">
        <input id="mgg-input" class="lg-input" placeholder="שם השחקן..." autocomplete="off">
        <div id="mgg-sugg" class="mgg-sugg"></div>
      </div>`}
    <div class="mgg-guesses">${guessRows}</div>`;

  mgWireBack();
  if (finished) mggWireEnd(run); else mggWireInput();
}

function mggEndHTML(run) {
  const win = run.done === 'win';
  const t = run.target;
  const nats = typeof playerNats === 'function' ? playerNats(t.name) : [];
  return `
    <div class="mgg-end ${win ? 'win' : 'lose'}">
      <div class="mgg-end-title">${win ? `יפה! ${run.guesses.length}/${MGG_TRIES}` : 'לא הפעם'}</div>
      <div class="mgg-end-name">${mgEsc(t.name)}</div>
      <div class="mgg-end-meta">
        ${nats.length ? mgEsc(nats.map(n => (typeof natFlag === 'function' ? natFlag(n) : '') + ' ' + n).join(' · ')) + ' · ' : ''}
        ${mgEsc(t.pos)} · שיא ${t.peak} · ${t.rows.length} עונות
      </div>
      <div class="mgg-end-actions">
        <button class="btn-primary" id="mgg-share">📋 שתף תוצאה</button>
        <button class="btn-secondary" id="mgg-again">🎲 סיבוב חופשי</button>
      </div>
    </div>`;
}

function mggShareText(run) {
  const t = run.target;
  const head = run.mode === 'daily'
    ? `🎯 נחש את השחקן #${mgDayNumber(run.key)}`
    : '🎯 נחש את השחקן — סיבוב חופשי';
  const score = run.done === 'win' ? `${run.guesses.length}/${MGG_TRIES}` : `X/${MGG_TRIES}`;
  const grid = run.guesses.map(name => {
    const g = mgFind(name);
    if (!g) return '';
    const sc = mggScore(g, t);
    return MGG_EMOJI[sc.posHit] + MGG_EMOJI[sc.clubHit] + MGG_EMOJI[sc.eraHit] + MGG_EMOJI[sc.peakHit];
  }).join('\n');
  return `${head} — ${score}\n${grid}\n\nhttps://www.36-0.co.il/`;
}

function mggWireEnd(run) {
  const share = document.getElementById('mgg-share');
  if (share) share.onclick = () => mgShareText(mggShareText(run), share);
  const again = document.getElementById('mgg-again');
  if (again) again.onclick = mgGuessEndless;
}

/* ── the guess box ────────────────────────────────────────────────────────── */
function mggWireInput() {
  const input = document.getElementById('mgg-input');
  const sugg  = document.getElementById('mgg-sugg');
  if (!input || !sugg) return;
  input.focus();

  const close = () => { sugg.innerHTML = ''; sugg.classList.remove('open'); };
  input.oninput = () => {
    const q = mgNorm(input.value);
    if (q.length < 2) return close();
    const hits = mgAllNames()
      .filter(e => e.key.includes(q) && !_mggRun.guesses.some(g => mgNorm(g) === e.key))
      .slice(0, 8);
    if (!hits.length) return close();
    sugg.innerHTML = hits.map(e => `
      <button class="mgg-sugg-item" data-name="${mgEsc(e.name)}">
        <span>${mgEsc(e.name)}</span>
        <span class="mgg-sugg-meta">${e.first.y}–${e.last.y} · ${mgEsc(e.pos)}</span>
      </button>`).join('');
    sugg.classList.add('open');
    sugg.querySelectorAll('.mgg-sugg-item').forEach(b => {
      b.onclick = () => { close(); mggSubmit(b.dataset.name); };
    });
  };
  input.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const first = sugg.querySelector('.mgg-sugg-item');
    if (first) { close(); mggSubmit(first.dataset.name); }
  };
}

function mggSubmit(name) {
  const run = _mggRun;
  if (!run || run.done) return;
  const g = mgFind(name);
  if (!g) return;
  run.guesses.push(g.name);
  if (g.key === run.target.key) run.done = 'win';
  else if (run.guesses.length >= MGG_TRIES) run.done = 'lose';

  // The daily is the one that counts — an endless round changes no record.
  if (run.mode === 'daily') {
    const s = mggState();
    s.dayKey = run.key;
    s.guesses = run.guesses.slice();
    s.done = run.done;
    if (run.done) {
      s.played++;
      if (run.done === 'win') { s.wins++; s.streak++; s.best = Math.max(s.best, s.streak); }
      else s.streak = 0;
    }
    mggSave(s);
  }
  if (run.done && typeof track === 'function') track('finish', 'minigame', 'guess-' + run.done);
  mggRender();
}
