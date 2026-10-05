// ─── אלופי הדרבי — screens ───────────────────────────────────────────────────
const DERBY_DIFF_HE = { easy: 'קל', normal: 'רגיל', hard: 'קשה' };
let _derbyDiff = 'normal';
let _derbyTimer = null;

function derbyEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function derbyTeamName(id) { return (TEAMS[id] && TEAMS[id].name) || id; }
function derbyCrest(id, cls) { return `<img class="${cls || 'dc-crest'}" src="crests/${id}.png" alt="" loading="lazy">`; }
function derbyRoot() { return document.getElementById('derby-root'); }
function derbyStopClock() { if (_derbyTimer) { clearInterval(_derbyTimer); _derbyTimer = null; } }

function derbyOpen() { derbyTrack('open'); derbyShow(); }

function derbyShow() {
  derbyStopClock();
  const scr = document.getElementById('screen-derby');
  if (!scr || !scr.classList.contains('active')) showScreen('derby');
  const back = document.getElementById('derby-back');
  if (back) back.onclick = () => { derbyStopClock(); state.derby = null; showScreen('setup'); };
  const run = derbyLoad();
  if (!run || run.phase === 'draft') return derbyRenderPicker();
  if (run.phase === 'rivals' || (run.phase === 'series' && !run.games.length)) return derbyRenderRivals(run);
  if (run.phase === 'series') return derbyRenderMatch(run, run.games.length - 1, false);
  return derbyRenderEnd(run);
}

/* ── pick a club ─────────────────────────────────────────────────────────── */
function derbyRenderPicker() {
  const root = derbyRoot();
  root.innerHTML = `
    <p class="dc-lead">בנה את הרכב הנצח של המועדון מכל העונות שלו בליגת העל, ואז נצח את היריבות בסדרת הטוב מ-5.</p>
    <div class="dc-diff">${['easy', 'normal', 'hard'].map(d =>
      `<button class="dc-diff-btn${d === _derbyDiff ? ' on' : ''}" data-diff="${d}">${DERBY_DIFF_HE[d]}</button>`).join('')}</div>
    <div class="dc-grid">${derbyClubs().map(id => {
      const [a, b, c] = DERBY_RIVALS[id];
      return `<button class="dc-club" data-club="${id}">
        ${derbyCrest(id)}
        <span class="dc-club-name">${derbyEsc(derbyTeamName(id))}</span>
        <span class="dc-club-seasons">${derbySeasonsOf(id).length} עונות</span>
        <span class="dc-club-rivals"><b>${derbyEsc(derbyTeamName(a))}</b> · ${derbyEsc(derbyTeamName(b))} · ${derbyEsc(derbyTeamName(c))}</span>
      </button>`;
    }).join('')}</div>`;
  root.querySelectorAll('.dc-diff-btn').forEach(b => { b.onclick = () => { _derbyDiff = b.dataset.diff; derbyRenderPicker(); }; });
  root.querySelectorAll('.dc-club').forEach(b => { b.onclick = () => derbyStart(b.dataset.club, _derbyDiff); });
}

/* ── the rivals ──────────────────────────────────────────────────────────── */
function derbyXiRows(entries, slots) {
  return entries.map((e, i) => e ? `<li><span class="dc-pos">${derbyEsc(slots[i].label || slots[i].pos)}</span>
    <span class="dc-nm">${derbyEsc(e.player.name)}</span><span class="dc-ss">${derbyEsc(e.squad.season)}</span>
    <span class="dc-ov">${e.player.ovr}</span></li>` : '').join('');
}

function derbyRenderRivals(run) {
  derbyApplyMine(run);
  const myOvr = teamOVR(), mine = state.picks, mySlots = state.slots;
  const rivalSlots = formationSlots(run.formationId, 'bal');
  const cards = DERBY_RIVALS[run.club].map((id, k) => {
    const picks = derbyRivalPicks(run, id);
    const ovr = derbyLinesFor(picks, rivalSlots).ovr;
    const games = DERBY_ORDER.map((r, i) => (r === k ? i + 1 : null)).filter(Boolean);
    return `<details class="dc-rival${k === 0 ? ' arch' : ''}"><summary>${derbyCrest(id)}
      <span class="dc-rv-name">${derbyEsc(derbyTeamName(id))}${k === 0 ? ' <em>המושבעת</em>' : ''}</span>
      <span class="dc-rv-games">${games.length > 1 ? 'משחקים' : 'משחק'} ${games.join(', ')}</span><span class="dc-ovr">${ovr}</span></summary>
      <ul class="dc-xi">${derbyXiRows(picks, rivalSlots)}</ul></details>`;
  }).join('');
  derbyRoot().innerHTML = `
    <div class="dc-me">${derbyCrest(run.club, 'dc-crest-lg')}<div>
      <div class="dc-me-name">${derbyEsc(derbyTeamName(run.club))} · הרכב הנצח שלך</div>
      <div class="dc-me-sub">דירוג ${myOvr} · רמה ${DERBY_DIFF_HE[run.difficulty]}</div></div></div>
    <details class="dc-rival mine"><summary>ההרכב שלך</summary><ul class="dc-xi">${derbyXiRows(mine, mySlots)}</ul></details>
    <div class="dc-sec">היריבות</div>${cards}
    <button class="btn-primary dc-go" id="dc-go">התחל את הסדרה ←</button>`;
  document.getElementById('dc-go').onclick = () => {
    run.phase = 'series'; derbySave(run);
    derbyTrack('progress', run.club + '|series');
    derbyRenderNext(run);
  };
}

/* ── a game ──────────────────────────────────────────────────────────────── */
function derbySeriesLine(games) {
  const s = derbySeriesStatus(games);
  return `<div class="dc-series">${games.map(g => `<span class="dc-dot ${g.won ? 'w' : 'l'}"></span>`).join('')}${
    Array.from({ length: 5 - games.length }, () => '<span class="dc-dot"></span>').join('')}<b>${s.w}:${s.l}</b></div>`;
}

function derbyRenderNext(run) {
  const g = derbyPlayNext(run);
  if (!g) return derbyShow();
  derbyRenderMatch(run, run.games.length - 1, true);
}

function derbyRenderMatch(run, i, animate) {
  derbyStopClock();
  const g = run.games[i];
  const homeId = g.home ? run.club : g.rival, awayId = g.home ? g.rival : run.club;
  derbyRoot().innerHTML = `
    <div class="dc-match-head">משחק ${i + 1} מתוך 5${DERBY_ORDER[i] === 0 ? ' · מול המושבעת' : ''}</div>
    <div class="dc-board">
      <div class="dc-side">${derbyCrest(homeId, 'dc-crest-lg')}<span>${derbyEsc(derbyTeamName(homeId))}</span></div>
      <div class="dc-score"><span id="dc-sc">0 - 0</span><span class="dc-clock" id="dc-clock">0'</span></div>
      <div class="dc-side">${derbyCrest(awayId, 'dc-crest-lg')}<span>${derbyEsc(derbyTeamName(awayId))}</span></div>
    </div>
    <ul class="dc-events" id="dc-events"></ul>
    <div id="dc-after"></div>`;
  const ev = g.events || [];
  let mineN = 0, theirsN = 0, k = 0;
  const paint = min => {
    while (k < ev.length && ev[k].min <= min) {
      const e = ev[k++];
      if (e.mine) mineN++; else theirsN++;
      const li = document.createElement('li');
      li.className = e.mine ? 'mine' : 'theirs';
      li.textContent = `${e.min}' ⚽ ${e.name}`;
      document.getElementById('dc-events')?.appendChild(li);
    }
    const h = g.home ? mineN : theirsN, a = g.home ? theirsN : mineN;
    const sc = document.getElementById('dc-sc'); if (sc) sc.textContent = `${h} - ${a}`;
    const cl = document.getElementById('dc-clock'); if (cl) cl.textContent = `${min}'`;
  };
  const done = () => { paint(90); derbyRenderAfter(run, i); };
  if (!animate) { done(); return; }
  let min = 0;
  _derbyTimer = setInterval(() => {
    if (!document.getElementById('screen-derby')?.classList.contains('active')) { derbyStopClock(); return; }
    min += 1;
    if (min >= 90) { derbyStopClock(); done(); } else paint(min);
  }, 45);
}

function derbyRenderAfter(run, i) {
  const g = run.games[i], upTo = run.games.slice(0, i + 1);
  const over = derbySeriesStatus(upTo).over;
  const el = document.getElementById('dc-after');
  if (!el) return;
  el.innerHTML = `${g.pens ? `<div class="dc-pens">תיקו ${g.gf}-${g.ga} · פנדלים ${g.pens.gf}-${g.pens.ga}</div>` : ''}
    <div class="dc-verdict ${g.won ? 'w' : 'l'}">${g.won ? 'ניצחון!' : 'הפסד'}</div>
    ${derbySeriesLine(upTo)}
    <button class="btn-primary dc-go" id="dc-next">${over ? 'לסיכום ←' : 'למשחק הבא ←'}</button>`;
  document.getElementById('dc-next').onclick = () => (over ? derbyRenderEnd(run) : derbyRenderNext(run));
}

/* ── the end ─────────────────────────────────────────────────────────────── */
function derbyRenderEnd(run) {
  derbyStopClock();
  const s = derbySeriesStatus(run.games), club = derbyTeamName(run.club);
  derbyRoot().innerHTML = `
    <div class="dc-end ${s.won ? 'w' : 'l'}">${derbyCrest(run.club, 'dc-crest-lg')}
      <div class="dc-end-title">${s.won ? '🏆 אלופי הדרבי!' : 'הפסד בסדרה'}</div>
      <div class="dc-end-score">${derbyEsc(club)} ${s.w}:${s.l}</div></div>
    <ul class="dc-games">${run.games.map((g, i) => `<li class="${g.won ? 'w' : 'l'}">
      <span>משחק ${i + 1}</span><span>${derbyEsc(derbyTeamName(g.rival))}</span>
      <span>${g.gf}-${g.ga}${g.pens ? ` (פנ' ${g.pens.gf}-${g.pens.ga})` : ''}</span></li>`).join('')}</ul>
    <div class="dc-end-btns">
      <button class="btn-primary" id="dc-share">שתף</button>
      <button class="btn-secondary" id="dc-again">שוב עם ${derbyEsc(club)}</button>
      <button class="btn-secondary" id="dc-other">מועדון אחר</button>
    </div>`;
  document.getElementById('dc-share').onclick = () => derbyShare(run);
  document.getElementById('dc-again').onclick = () => derbyStart(run.club, run.difficulty);
  document.getElementById('dc-other').onclick = () => { derbyClear(); clearDraftState(); state.derby = null; derbyRenderPicker(); };
}

function derbyShareText(run) {
  const s = derbySeriesStatus(run.games);
  const head = `${s.won ? '🏆 אלופי הדרבי' : '⚔️ סדרת הדרבי'} · ${derbyTeamName(run.club)} ${s.w}:${s.l}`;
  const lines = run.games.map(g => `${g.won ? '🟩' : '🟥'} ${derbyTeamName(g.rival)} ${g.gf}-${g.ga}${g.pens ? ' (פנדלים)' : ''}`);
  const xi = (run.xi || []).map(derbyEntry).filter(Boolean).map(e => e.player.name).join(', ');
  return `${head}\n${lines.join('\n')}\nההרכב: ${xi}\nhttps://www.36-0.co.il`;
}

function derbyShare(run) {
  const text = derbyShareText(run);
  derbyTrack('share', run.club);
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  try {
    navigator.clipboard.writeText(text);
    const b = document.getElementById('dc-share'); if (b) b.textContent = 'הועתק ✓';
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setup-derby-card')?.addEventListener('click', derbyOpen);
});
