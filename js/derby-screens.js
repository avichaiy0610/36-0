// ─── אלופי הדרבי — screens (v2, spec §9) ─────────────────────────────────────
// picker → (the normal draft screen: XI, then the bench) → rivals → live matches → end.
// Every interpolated string goes through derbyEsc.
const DERBY_DIFF_HE = { easy: 'קל', normal: 'רגיל', hard: 'קשה' };
const DERBY_TACTIC_HE = { att: 'התקפי', bal: 'מאוזן', def: 'הגנתי' };
const DERBY_MS_PER_MIN = 45;
const DERBY_LOG_KEY = '36-0-derby-log';
let _derbyDiff = 'normal';
let _derbyTimer = null;
let _derbyGen = 0;          // bumped on every render: a stale tick never writes into a new screen
let _derbyPauseReq = false; // "⏸ עצירה" pressed: stop at the next 15' boundary
let _derbySel = null;       // the slot of your XI picked for a substitution
let _derbyBusyAt = 0;       // double-tap guard: a screen change swallows taps for ~350 ms
function derbyBusy() {
  const n = Date.now();
  if (n - _derbyBusyAt < 350) return true;
  _derbyBusyAt = n; return false;
}
function derbyLogClear() { try { localStorage.removeItem(DERBY_LOG_KEY); } catch (e) {} }
// bidi marks inside a name would scramble a shared line
function derbyPlain(s) { return String(s ?? '').replace(/[‎‏‪-‮⁦-⁩]/g, ''); }
// Which groups of the XI have no bench man who could take a slot there
// (shown under the bench slots on the draft screen, js/derby.js).
const DERBY_SLOT_GROUPS = [['שוער', ['GK']], ['הגנה', ['RB', 'CB', 'LB']],
  ['קישור', ['CDM', 'CM', 'CAM', 'RM', 'LM']], ['התקפה', ['RW', 'LW', 'CF', 'ST']]];
function derbyUncoveredGroups(slots, bench) {
  const players = bench.filter(Boolean).map(e => e.player);
  return DERBY_SLOT_GROUPS.filter(([, poss]) => slots.some(sl => poss.includes(slotFitPos(sl))
    && !players.some(p => playerFitsSlot(p, slotFitPos(sl))))).map(g => g[0]);
}

function derbyEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function derbyTeamName(id) { return (TEAMS[id] && TEAMS[id].name) || id; }
function derbyCrest(id, cls) { return `<img class="${cls || 'dc-crest'}" src="crests/${derbyEsc(id)}.png" alt="" loading="lazy">`; }
function derbyRoot() { return document.getElementById('derby-root'); }
function derbyStopClock() { _derbyGen++; if (_derbyTimer) { clearInterval(_derbyTimer); _derbyTimer = null; } }
function derbyActive() { return !!document.getElementById('screen-derby')?.classList.contains('active'); }
function derbyPosHe(p) { const k = normalizePos(p.position); return POS_HE[k] || k; }
function derbyNum(x) { return Number.isInteger(x) ? String(x) : x.toFixed(1); }

function derbyOpen() { derbyTrack('open'); derbyShow(); }

function derbyShow() {
  derbyStopClock();
  _derbyPauseReq = false; _derbySel = null;
  const scr = document.getElementById('screen-derby');
  if (!scr || !scr.classList.contains('active')) showScreen('derby');
  const back = document.getElementById('derby-back');
  if (back) back.onclick = () => {
    derbyStopClock(); state.derby = null;
    // the derby drafted over the full era range; put the slider back in step with state
    if (typeof prepareSetupScreen === 'function') prepareSetupScreen();
    showScreen('setup');
  };
  window.scrollTo?.(0, 0);
  const run = derbyLoad();
  if (!run || run.phase === 'draft') return derbyRenderPicker();
  // a v2 run parked in the old bench screen: back into the draft screen's bench rounds
  if (run.phase === 'bench') return derbyResumeOldBench(run) ? undefined : derbyRenderPicker();
  if (run.phase === 'rivals') return derbyRenderRivals(run);
  if (run.phase === 'play') return derbyRenderMatch(run);
  return derbyRenderEnd(run);
}

/* ── pick a club ─────────────────────────────────────────────────────────── */
function derbyRenderPicker() {
  const root = derbyRoot();
  root.innerHTML = `
    <p class="dc-lead">בנה את הרכב הנצח של המועדון מכל העונות שלו בליגת העל — 11 בהרכב ו-7 על הספסל — ואז שחק סדרת הטוב מ-5 מול כל אחת משלוש היריבות. המושבעת בגמר.</p>
    <div class="dc-diff">${['easy', 'normal', 'hard'].map(d =>
      `<button class="dc-diff-btn${d === _derbyDiff ? ' on' : ''}" data-diff="${d}">${DERBY_DIFF_HE[d]}</button>`).join('')}</div>
    <div class="dc-grid">${derbyClubs().map(id => {
      const [a, b, c] = DERBY_RIVALS[id];
      return `<button class="dc-club" data-club="${derbyEsc(id)}">
        ${derbyCrest(id)}
        <span class="dc-club-name">${derbyEsc(derbyTeamName(id))}</span>
        <span class="dc-club-seasons">${derbySeasonsOf(id).length} עונות</span>
        <span class="dc-club-rivals"><b>${derbyEsc(derbyTeamName(a))}</b> · ${derbyEsc(derbyTeamName(b))} · ${derbyEsc(derbyTeamName(c))}</span>
      </button>`;
    }).join('')}</div>`;
  root.querySelectorAll('.dc-diff-btn').forEach(b => { b.onclick = () => { _derbyDiff = b.dataset.diff; derbyRenderPicker(); }; });
  root.querySelectorAll('.dc-club').forEach(b => { b.onclick = () => derbyStart(b.dataset.club, _derbyDiff); });
}

/* ── line-up rows ────────────────────────────────────────────────────────── */
function derbyXiRows(entries, slots) {
  return entries.map((e, i) => e ? `<li><span class="dc-pos">${derbyEsc(slots[i].label || slots[i].pos)}</span>
    <span class="dc-nm">${derbyEsc(e.player.name)}</span><span class="dc-ss">${derbyEsc(e.squad.season)}</span>
    <span class="dc-ov">${playerOVR(e.player)}</span></li>` : '').join('');
}
function derbyBenchRows(entries) {
  return entries.filter(Boolean).map(e => `<li><span class="dc-pos">${derbyEsc(derbyPosHe(e.player))}</span>
    <span class="dc-nm">${derbyEsc(e.player.name)}</span><span class="dc-ss">${derbyEsc(e.squad.season)}</span>
    <span class="dc-ov">${playerOVR(e.player)}</span></li>`).join('');
}
function derbySideCard(title, side, cls, extra) {
  return `<section class="dc-card ${cls || ''}">
    <div class="dc-card-head">${title}${extra || ''}</div>
    <ul class="dc-xi">${derbyXiRows(side.picks, side.slots)}</ul>
    ${side.bench.length ? `<div class="dc-sub-head">ספסל</div><ul class="dc-xi dc-xi-bench">${derbyBenchRows(side.bench)}</ul>` : ''}
  </section>`;
}

/* ── the rivals ──────────────────────────────────────────────────────────── */
function derbySeriesLabel(s) { return s === 2 ? 'הגמר · המושבעת' : `סדרה ${s + 1}`; }

function derbyRenderRivals(run) {
  const mine = derbyMySide(run);
  const myOvr = teamOVR();
  const cards = DERBY_SERIES_ORDER.map((k, s) => {
    const id = DERBY_RIVALS[run.club][k], side = derbyRivalSide(run, id);
    const ovr = derbyLinesFor(side.picks, side.slots, 'bal').ovr;
    return derbySideCard(`${derbyCrest(id)}<span class="dc-rv-name">${derbyEsc(derbyTeamName(id))}</span>
      <span class="dc-rv-games">${derbySeriesLabel(s)}</span><span class="dc-ovr">${ovr}</span>`, side, s === 2 ? 'arch' : '');
  }).join('');
  derbyRoot().innerHTML = `
    <div class="dc-me">${derbyCrest(run.club, 'dc-crest-lg')}<div>
      <div class="dc-me-name">${derbyEsc(derbyTeamName(run.club))} · הרכב הנצח שלך</div>
      <div class="dc-me-sub">דירוג ${myOvr} · רמה ${DERBY_DIFF_HE[run.difficulty] || ''} · שלוש סדרות של הטוב מ-5</div></div></div>
    ${derbySideCard('ההרכב שלך', mine, 'mine')}
    <div class="dc-sec">היריבות, לפי סדר הסדרות</div>${cards}
    <button class="btn-primary dc-go" id="dc-go">לסדרה הראשונה ←</button>`;
  document.getElementById('dc-go').onclick = () => {
    if (derbyBusy()) return;
    derbyBeginPlay(run);
    derbyTrack('progress', run.club + '|series');
    derbyShow();
  };
}

/* ── the live match ──────────────────────────────────────────────────────── */
// Substitutions are not goal events (m.events feeds the game record), so the
// display log of subs is kept on its own, keyed by the match seed.
function derbyLogLoad(seed) {
  try { const L = JSON.parse(localStorage.getItem(DERBY_LOG_KEY)); return L && L.seed === seed && Array.isArray(L.rows) ? L.rows : []; }
  catch (e) { return []; }
}
function derbyLogAdd(m, row) {
  const rows = derbyLogLoad(m.seed); rows.push(row);
  try { localStorage.setItem(DERBY_LOG_KEY, JSON.stringify({ seed: m.seed, rows })); } catch (e) {}
}

function derbySeriesLine(games) {
  const s = derbySeriesStatus(games);
  return `<div class="dc-series">${games.map(g => `<span class="dc-dot ${g.won ? 'w' : 'l'}"></span>`).join('')}${
    Array.from({ length: Math.max(0, 5 - games.length) }, () => '<span class="dc-dot"></span>').join('')}<b>${s.w}:${s.l}</b></div>`;
}

function derbyRenderMatch(run) {
  derbyStopClock();
  const cur = derbyCurrent(run);
  const m = cur && derbyGameStart(run);
  if (!m) return derbyRenderEnd(run);
  const ctx = { run, m, cur, rival: m.rival, shown: m.min, mode: 'paused', ser: run.series[cur.s] };
  const homeId = m.home ? run.club : m.rival, awayId = m.home ? m.rival : run.club;
  const prev = derbyPrevGame(run);
  derbyRoot().innerHTML = `
    <div class="dc-match-head">
      <div>סדרה ${cur.s + 1} מתוך 3 · מול ${derbyEsc(derbyTeamName(m.rival))}${cur.s === 2 ? ' (המושבעת)' : ''} · משחק ${cur.g + 1}</div>
      <div id="dc-head-ser">${derbySeriesLine(ctx.ser.games)}</div>
    </div>
    ${prev && m.min === 0 ? `<div class="dc-prev">${prev}</div>` : ''}
    <div class="dc-board">
      <div class="dc-side">${derbyCrest(homeId, 'dc-crest-lg')}<span>${derbyEsc(derbyTeamName(homeId))}</span><small>בית</small></div>
      <div class="dc-score"><span id="dc-sc"></span><span class="dc-clock" id="dc-clock"></span></div>
      <div class="dc-side">${derbyCrest(awayId, 'dc-crest-lg')}<span>${derbyEsc(derbyTeamName(awayId))}</span><small>חוץ</small></div>
    </div>
    <ul class="dc-events" id="dc-events"></ul>
    <div id="dc-ctl"></div>
    <div id="dc-mine"></div>
    <div id="dc-opp"></div>`;
  derbyPaintBoard(ctx);
  derbyPaintPanel(ctx);
}

// The most recent finished game, as a line for the pre-match view.
function derbyPrevGame(run) {
  for (let s = run.series.length - 1; s >= 0; s--) {
    const gs = run.series[s].games;
    if (gs.length) {
      const g = gs[gs.length - 1];
      return `המשחק הקודם: מול ${derbyEsc(derbyTeamName(run.series[s].rival))} · ${derbyResultText(g)}`;
    }
  }
  return '';
}
// Won/lost first, so the score never has to say which side is which.
function derbyResultText(g) {
  const hi = Math.max(g.gf, g.ga), lo = Math.min(g.gf, g.ga);
  if (g.pens) return `תיקו ${g.gf}-${g.ga}, ${g.won ? 'ניצחון' : 'הפסד'} בפנדלים ${Math.max(g.pens.gf, g.pens.ga)}-${Math.min(g.pens.gf, g.pens.ga)}`;
  return `${g.won ? 'ניצחון' : 'הפסד'} ${hi}-${lo}`;
}

function derbyPaintBoard(ctx) {
  const { m, run } = ctx, upTo = ctx.shown;
  const goals = m.events.filter(e => e.min <= upTo);
  const mineN = goals.filter(e => e.mine).length, theirsN = goals.length - mineN;
  const home = m.home ? mineN : theirsN, away = m.home ? theirsN : mineN;
  // RTL: the home side sits on the RIGHT of the board. The score is direction:ltr,
  // so its RIGHT-hand number is the last one written — the home goals go last.
  const sc = document.getElementById('dc-sc'); if (sc) sc.textContent = `${away} - ${home}`;
  const cl = document.getElementById('dc-clock');
  if (cl) cl.textContent = ctx.mode === 'over' ? 'סיום' : upTo === 45 && ctx.mode === 'paused' ? "מחצית · 45'" : `${upTo}'`;
  const rows = goals.map(e => ({ min: e.min, cls: e.mine ? 'mine' : 'theirs',
      html: derbyEsc(`${e.min}' ⚽ ${e.name}${e.sub ? ' (מחליף)' : ''}`) }))
    .concat(derbyLogLoad(m.seed).filter(r => r && r.min <= upTo).map(r => ({ min: r.min, cls: derbyEsc(r.cls) + ' sub',
      html: `${derbyEsc(r.min)}' 🔁 ` + (r.inn != null
        ? `${derbyEsc(r.team)}: <span class="dc-in">⬆ ${derbyEsc(r.inn)}</span> <span class="dc-out">⬇ ${derbyEsc(r.out)}</span>`
        : derbyEsc(r.text)) })))
    .sort((a, b) => a.min - b.min);
  const ul = document.getElementById('dc-events');
  if (ul) ul.innerHTML = rows.map(r => `<li class="${r.cls}">${r.html}</li>`).join('');
}

function derbyPaintPanel(ctx) {
  const { m, run } = ctx, ctl = document.getElementById('dc-ctl');
  if (!ctl) return;
  if (ctx.mode === 'playing' && m.min >= 90) {
    ctl.innerHTML = '';      // the last segment: a pause could stop nothing
  } else if (ctx.mode === 'playing') {
    ctl.innerHTML = `<button class="btn-secondary dc-pause${_derbyPauseReq ? ' on' : ''}" id="dc-pause">${
      _derbyPauseReq ? `⏸ עוצרים ב-${Math.min(90, m.min)}' (ביטול)` : '⏸ עצירה'}</button>`;
    document.getElementById('dc-pause').onclick = () => { _derbyPauseReq = !_derbyPauseReq; derbyPaintPanel(ctx); };
  } else if (ctx.mode === 'paused') {
    const can = derbyCanSub(m.me, m.min);
    const noFit = can && _derbySel != null && m.me.bench.length
      && !m.me.bench.some(b => playerFitsSlot(b.player, slotFitPos(m.me.slots[_derbySel])));
    const why = noFit ? 'אין בספסל מחליף שמתאים לעמדה הזו.'
      : m.min === 0 && _derbySel == null ? 'חילופים אפשר מהעצירה הראשונה. הטקטיקה חלה כבר משריקת הפתיחה.'
      : m.me.subs >= DERBY_SUBS ? 'ניצלת את כל החילופים.'
      : !m.me.bench.length ? 'אין עוד שחקנים על הספסל.'
      : !can ? 'ניצלת את שלוש העצירות. אפשר לשנות רק טקטיקה.'
      : _derbySel == null ? 'לחילוף: בחר שחקן מההרכב, ואז מחליף מהספסל.'
      : 'עכשיו בחר מחליף מהספסל (רק מי שמתאים לעמדה).';
    ctl.innerHTML = `<div class="dc-panel">
      <div class="dc-panel-title">${m.min === 0 ? 'לפני שריקת הפתיחה' : m.min === 45 ? 'מחצית' : `עצירה · דקה ${m.min}`}</div>
      <div class="dc-tactics">${TACTIC_KEYS.map(k => `<button class="dc-tac${m.me.tactic === k ? ' on' : ''}" data-t="${k}">
        <b>${DERBY_TACTIC_HE[k]}</b><small>${tacticTrade(k) || 'ללא שינוי'}</small></button>`).join('')}</div>
      <div class="dc-counts">חילופים ${m.me.subs}/${DERBY_SUBS} · עצירות ${m.me.windows}/${DERBY_SUB_WINDOWS} (המחצית לא נספרת)</div>
      <div class="dc-hint">${why}</div>
      <button class="btn-primary dc-go" id="dc-cont">${m.min === 0 ? 'שריקת פתיחה ▶' : 'המשך ▶'}</button>
    </div>`;
    ctl.querySelectorAll('.dc-tac').forEach(b => {
      b.onclick = () => { if (derbySetTactic(run, m, b.dataset.t)) derbyPaintPanel(ctx); };
    });
    document.getElementById('dc-cont').onclick = () => { if (derbyBusy()) return; _derbySel = null; derbyPlaySegment(ctx); };
  } else {
    ctl.innerHTML = derbyAfterHtml(ctx);
    const hs = document.getElementById('dc-head-ser'); if (hs) hs.innerHTML = derbySeriesLine(ctx.ser.games);
    document.getElementById('dc-next').onclick = () => { if (derbyBusy()) return; derbyShow(); };
  }
  derbyPaintSides(ctx);
}

// Your XI (tap one, then a bench man to bring on) and the rival's current XI.
function derbyPaintSides(ctx) {
  const { m, run } = ctx, paused = ctx.mode === 'paused';
  const can = paused && derbyCanSub(m.me, m.min);
  const eff = p => playerOVR(p.player) - derbyFatigue(p, m.min);
  const row = (p, i, side, interactive) => {
    if (!p) return '';
    const f = derbyFatigue(p, m.min), slot = side.slots[i];
    const mark = p.on ? `<span class="dc-in" dir="ltr">⬆${p.on}'</span>` : '';
    const inner = `<span class="dc-pos">${derbyEsc(slot.label || slot.pos)}</span>
      <span class="dc-nm">${derbyEsc(p.player.name)} ${mark}</span>
      <span class="dc-ov${f > 0 ? ' tired' : ''}">${derbyNum(eff(p))}${f > 0 ? '<i class="dc-tired" title="עייף">עייף</i>' : ''}</span>`;
    return interactive
      ? `<li class="dc-btn-li"><button class="dc-xi-btn${_derbySel === i ? ' sel' : ''}" data-slot="${i}"${can ? '' : ' disabled'}>${inner}</button></li>`
      : `<li class="dc-xi-row">${inner}</li>`;
  };
  const off = s => s.off.length ? `<div class="dc-off">יצאו: ${s.off.map(p => `⬇ ${derbyEsc(p.player.name)}`).join(' · ')}</div>` : '';
  const selSlot = _derbySel != null ? m.me.slots[_derbySel] : null;
  const benchBtns = m.me.bench.map((b, bi) => {
    const ok = can && selSlot && playerFitsSlot(b.player, slotFitPos(selSlot));
    return `<li class="dc-btn-li"><button class="dc-xi-btn dc-bench-btn" data-bench="${bi}"${ok ? '' : ' disabled'}>
      <span class="dc-pos">${derbyEsc(derbyPosHe(b.player))}</span><span class="dc-nm">${derbyEsc(b.player.name)}</span>
      <span class="dc-ov">${playerOVR(b.player)}</span></button></li>`;
  }).join('');
  const mineEl = document.getElementById('dc-mine'), oppEl = document.getElementById('dc-opp');
  if (mineEl) {
    mineEl.innerHTML = `<section class="dc-card mine">
      <div class="dc-card-head">${derbyEsc(derbyTeamName(run.club))} · ההרכב שלך <span class="dc-dim">· ${DERBY_TACTIC_HE[m.me.tactic] || ''}</span></div>
      <ul class="dc-xi dc-live">${m.me.picks.map((p, i) => row(p, i, m.me, paused)).join('')}</ul>
      ${off(m.me)}
      ${m.me.bench.length ? `<div class="dc-sub-head">ספסל</div><ul class="dc-xi dc-live">${paused ? benchBtns : derbyBenchRows(m.me.bench)}</ul>` : ''}
    </section>`;
    if (paused) {
      mineEl.querySelectorAll('[data-slot]').forEach(b => {
        b.onclick = () => { const i = +b.dataset.slot; _derbySel = _derbySel === i ? null : i; derbyPaintPanel(ctx); };
      });
      mineEl.querySelectorAll('[data-bench]').forEach(b => {
        b.onclick = () => {
          const si = _derbySel, bi = +b.dataset.bench;
          const out = m.me.picks[si], inn = m.me.bench[bi];
          if (si == null || !out || !inn) return;
          if (derbyMakeSub(run, m, si, bi)) {
            derbyLogAdd(m, { min: m.min, cls: 'mine', team: derbyTeamName(run.club), inn: inn.player.name, out: out.player.name });
            _derbySel = null;
            derbyPaintBoard(ctx);
            derbyPaintPanel(ctx);
          }
        };
      });
    }
  }
  if (oppEl) {
    oppEl.innerHTML = `<details class="dc-card dc-opp${ctx.cur.s === 2 ? ' arch' : ''}" open>
      <summary class="dc-card-head">${derbyCrest(m.rival)}<span class="dc-rv-name">${derbyEsc(derbyTeamName(m.rival))}</span>
        <span class="dc-dim">${DERBY_TACTIC_HE[m.opp.tactic] || ''}</span></summary>
      <ul class="dc-xi dc-live">${m.opp.picks.map((p, i) => row(p, i, m.opp, false)).join('')}</ul>
      ${off(m.opp)}
      ${m.opp.bench.length ? `<div class="dc-sub-head">ספסל</div><ul class="dc-xi dc-xi-bench">${derbyBenchRows(m.opp.bench)}</ul>` : ''}
    </details>`;
  }
}

// One 15-minute segment: computed at once (derbyGameStep saves it), then shown
// minute by minute. The next one follows unless a pause was asked for; half-time
// always pauses.
function derbyPlaySegment(ctx) {
  const { m, run } = ctx;
  if (m.over) return;
  derbyStopClock();
  const gen = _derbyGen;
  document.querySelector('.dc-prev')?.remove();   // the previous game's line belongs to kick-off only
  const from = m.min, oppBefore = m.opp.picks.slice();
  derbyGameStep(run, m);
  // The computer's substitutions happen at the start of the segment.
  m.opp.picks.forEach((p, i) => {
    const was = oppBefore[i];
    if (p && was && p.player.name !== was.player.name) {
      derbyLogAdd(m, { min: from, cls: 'theirs', team: derbyTeamName(ctx.rival), inn: p.player.name, out: was.player.name });
    }
  });
  ctx.mode = 'playing'; ctx.shown = from;
  derbyPaintBoard(ctx);
  derbyPaintPanel(ctx);
  _derbyTimer = setInterval(() => {
    if (gen !== _derbyGen || !derbyActive()) { if (gen === _derbyGen) derbyStopClock(); return; }
    ctx.shown++;
    if (ctx.shown >= m.min) {
      clearInterval(_derbyTimer); _derbyTimer = null;
      ctx.shown = m.min;
      if (m.over) ctx.mode = 'over';
      else if (_derbyPauseReq || m.min === 45) { ctx.mode = 'paused'; _derbyPauseReq = false; }
      derbyPaintBoard(ctx);
      if (ctx.mode === 'playing') { derbyPlaySegment(ctx); return; }
      derbyPaintPanel(ctx);
      return;
    }
    derbyPaintBoard(ctx);
  }, DERBY_MS_PER_MIN);
}

function derbyAfterHtml(ctx) {
  const { run, cur } = ctx, ser = run.series[cur.s], g = ser.games[ser.games.length - 1];
  if (!g) return '';
  const st = derbySeriesStatus(ser.games);
  const label = run.phase === 'done' ? 'לסיכום ←' : st.over ? 'לסדרה הבאה ←' : 'למשחק הבא ←';
  const serTxt = st.over
    ? (st.won ? `ניצחת בסדרה ${st.w}:${st.l}!` : `הפסדת בסדרה ${st.w}:${st.l}`)
    : `הסדרה: ${st.w}:${st.l}`;
  return `<div class="dc-after">
    <div class="dc-verdict ${g.won ? 'w' : 'l'}">${g.won ? 'ניצחון!' : 'הפסד'}</div>
    ${g.pens ? `<div class="dc-pens">${derbyResultText(g)}</div>` : ''}
    ${derbySeriesLine(ser.games)}
    <div class="dc-ser-txt">${serTxt}</div>
    <button class="btn-primary dc-go" id="dc-next">${label}</button>
  </div>`;
}

// The winner's goals first, as a result is said in Hebrew; the colour says whose.
function derbyChip(g) {
  return `${Math.max(g.gf, g.ga)}-${Math.min(g.gf, g.ga)}${g.pens ? ' פנ׳' : ''}`;
}

/* ── the end ─────────────────────────────────────────────────────────────── */
function derbyRenderEnd(run) {
  derbyStopClock(); derbyLogClear();
  const sum = derbyRunSummary(run.series), club = derbyTeamName(run.club);
  const rows = run.series.map((s, i) => {
    const st = derbySeriesStatus(s.games);
    return `<li class="${st.won ? 'w' : 'l'}">
      <div class="dc-er-top">${derbyCrest(s.rival)}<span class="dc-rv-name">${derbyEsc(derbyTeamName(s.rival))}</span>
        <span class="dc-dim">${derbySeriesLabel(i)}</span><b class="dc-er-score">${st.w}:${st.l}</b></div>
      <div class="dc-er-games">${s.games.map(g => `<span class="dc-chip ${g.won ? 'w' : 'l'}">${derbyChip(g)}</span>`).join('')}</div>
    </li>`;
  }).join('');
  derbyRoot().innerHTML = `
    <div class="dc-end ${sum.title ? 'w' : 'l'}">${derbyCrest(run.club, 'dc-crest-lg')}
      <div class="dc-end-title">${sum.title ? '🏆 אלופי הדרבי!' : `ניצחת ${sum.seriesWon} מתוך 3 סדרות`}</div>
      <div class="dc-end-sub">${derbyEsc(club)} · רמה ${DERBY_DIFF_HE[run.difficulty] || ''}${sum.title ? ' · ניצחת בשלוש הסדרות' : ''}</div></div>
    <ul class="dc-end-rows">${rows}</ul>
    <div class="dc-end-btns">
      <button class="btn-primary" id="dc-share">שתף</button>
      <button class="btn-secondary" id="dc-again">שוב עם ${derbyEsc(club)}</button>
      <button class="btn-secondary" id="dc-other">מועדון אחר</button>
    </div>`;
  document.getElementById('dc-share').onclick = () => derbyShare(run);
  document.getElementById('dc-again').onclick = () => derbyStart(run.club, run.difficulty);
  document.getElementById('dc-other').onclick = () => { derbyClear(); derbyLogClear(); derbyClearDraftSave(); state.derby = null; derbyRenderPicker(); };
}

function derbyShareText(run) {
  const sum = derbyRunSummary(run.series), club = derbyTeamName(run.club);
  const head = sum.title ? `🏆 אלופי הדרבי! · ${club} · 3 מתוך 3 סדרות`
    : `⚔️ אלופי הדרבי · ${club} · ניצחתי ${sum.seriesWon} מתוך 3 סדרות`;
  const lines = run.series.map(s => {
    const st = derbySeriesStatus(s.games);
    return `${st.won ? '🟩' : '🟥'} ${derbyTeamName(s.rival)} ${st.w}:${st.l} (${s.games.map(g => (g.won ? '✅' : '❌') + derbyChip(g)).join(', ')})`;
  });
  const xi = (run.xi || []).map(derbyEntry).filter(Boolean).map(e => derbyPlain(e.player.name)).join(', ');
  return `${head}\n${lines.join('\n')}\nההרכב: ${xi}\nhttps://www.36-0.co.il`;
}

function derbyShare(run) {
  const text = derbyShareText(run);
  derbyTrack('share', run.club);
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  try {
    navigator.clipboard.writeText(text).then(() => {
      const b = document.getElementById('dc-share'); if (b) b.textContent = 'הועתק ✓';
    }, () => {});
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setup-derby-card')?.addEventListener('click', derbyOpen);
});
