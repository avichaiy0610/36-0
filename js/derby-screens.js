// ─── אלופי הדרבי — screens (v3, spec §9–§10) ─────────────────────────────────────
// picker → (the normal draft screen: XI, then the bench) → rivals → live matches → end.
// Every interpolated string goes through derbyEsc.
// Difficulty — "רמת קושי", so the words are feminine (spec §11.3).
const DERBY_DIFF_HE = { easy: 'קלה', normal: 'רגילה', hard: 'קשה' };
function derbyDiffText(d) { return 'רמת קושי: ' + (DERBY_DIFF_HE[d] || DERBY_DIFF_HE.normal); }
const DERBY_TACTIC_HE = { att: 'התקפי', bal: 'מאוזן', def: 'הגנתי' };
const DERBY_MS_PER_MIN = 45;
const DERBY_LOG_KEY = '36-0-derby-log';
let _derbyDiff = 'normal';
let _derbyTimer = null;
let _derbyGen = 0;          // bumped on every render: a stale tick never writes into a new screen
let _derbySel = null;       // {k:'slot'|'bench', i}: the man picked for a swap or a substitution
let _derbyOppOpen = true;    // the rival's line-up card: open unless the player folds it
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
  return DERBY_SLOT_GROUPS.filter(([, poss]) => slots.some(sl => poss.includes(sl.pos)
    && !players.some(p => inNaturalPos(p, sl.pos)))).map(g => g[0]);
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
  _derbySel = null;
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
    <p class="dc-lead">בנה את הרכב הנצח של המועדון מכל העונות שלו בליגת העל — 11 בהרכב ו-7 על הספסל — ואז שחק סדרת הטוב מ-5 מול כל אחת משלוש היריבות. היריבה המושבעת בגמר.</p>
    <div class="dc-sub-head dc-diff-head">רמת קושי</div>
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
function derbySeriesLabel(s) { return s === 2 ? 'הגמר · היריבה המושבעת' : `סדרה ${s + 1}`; }

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
      <div class="dc-me-sub">דירוג ${myOvr} · ${derbyDiffText(run.difficulty)} · שלוש סדרות של הטוב מ-5</div></div></div>
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

/* ── the live match (spec §10.2–§10.3) ───────────────────────────────────── */
// Substitutions are not goal events (m.events feeds the game record), so the
// display log of subs is kept on its own, keyed by the match seed.
function derbyLogLoad(seed) {
  try { const L = JSON.parse(localStorage.getItem(DERBY_LOG_KEY)); return L && L.seed === seed && Array.isArray(L.rows) ? L.rows : []; }
  catch (e) { return []; }
}
// Undo at a stop: the player's substitution rows of this minute go too.
function derbyLogDropMine(m, min) {
  const rows = derbyLogLoad(m.seed).filter(r => !(r && r.cls === 'mine' && r.min === min));
  try { localStorage.setItem(DERBY_LOG_KEY, JSON.stringify({ seed: m.seed, rows })); } catch (e) {}
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
  _derbySel = null;
  const ctx = { run, m, cur, rival: m.rival, shown: m.min, mode: 'paused', ser: run.series[cur.s] };
  const homeId = m.home ? run.club : m.rival, awayId = m.home ? m.rival : run.club;
  const prev = derbyPrevGame(run);
  derbyRoot().innerHTML = `
    <div class="dc-match-head">
      <div>סדרה ${cur.s + 1} מתוך 3 · מול ${derbyEsc(derbyTeamName(m.rival))}${cur.s === 2 ? ' (היריבה המושבעת)' : ''} · משחק ${cur.g + 1}</div>
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
    <div id="dc-opp"></div>
    <div class="dc-bar" id="dc-bar" hidden>
      <div class="dc-bar-score">${derbyCrest(homeId, 'dc-crest-sm')}<span class="dc-bar-sc" id="dc-bar-sc"></span>${derbyCrest(awayId, 'dc-crest-sm')}
        <span class="dc-bar-min" id="dc-bar-min" dir="ltr"></span></div>
      <button type="button" class="btn-secondary dc-pause" id="dc-pause">⏸ עצירה</button>
    </div>`;
  // Built once: a button rebuilt by every tick would swallow a tap that lands mid-tick.
  document.getElementById('dc-pause').onclick = () => {
    if (ctx.mode !== 'playing' || !_derbyTimer) return;
    // Stop AT the minute on screen: m.min is already played and saved.
    derbyStopClock(); _derbySel = null;
    ctx.mode = 'paused'; ctx.shown = m.min;
    derbyMarkStop(run, m);
    derbyPaintBoard(ctx);
    derbyPaintPanel(ctx);
  };
  derbyMarkStop(run, m);           // the pre-kick screen (or a refreshed stop): undo from here
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
  const { m } = ctx, upTo = ctx.shown;
  const goals = m.events.filter(e => e.min <= upTo);
  const mineN = goals.filter(e => e.mine).length, theirsN = goals.length - mineN;
  const home = m.home ? mineN : theirsN, away = m.home ? theirsN : mineN;
  // RTL: the home side sits on the RIGHT of the board. The score is direction:ltr,
  // so its RIGHT-hand number is the last one written — the home goals go last.
  const sc = document.getElementById('dc-sc'); if (sc) sc.textContent = `${away} - ${home}`;
  const bsc = document.getElementById('dc-bar-sc'); if (bsc) bsc.textContent = `${away} - ${home}`;
  const cl = document.getElementById('dc-clock');
  if (cl) cl.textContent = ctx.mode === 'over' ? 'סיום' : upTo === 45 && ctx.mode === 'paused' ? "מחצית · 45'" : `${upTo}'`;
  const bm = document.getElementById('dc-bar-min'); if (bm) bm.textContent = `${upTo}'`;
  const bar = document.getElementById('dc-bar');
  const showBar = ctx.mode === 'playing' && m.min < 90;
  if (bar) bar.hidden = !showBar;
  derbyRoot()?.classList.toggle('dc-has-bar', showBar);
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

// Each man's worth on the pitch now, exactly as the engine counts him
// (teamOVR / calcGroupOVR, through derbyLinesFor): rating, less his energy
// penalty now (derbyFatigue), plus chemistry; out of position (judged by slot.pos, as the
// engine does — a tactic's CAM/CDM role slot is still a CM slot) at 93%, rounded.
// The side is lent to `state` for chemAt and put back whatever happens.
function derbyRatings(side, minute) {
  const keep = { picks: state.picks, slots: state.slots };
  try {
    state.picks = side.picks; state.slots = side.slots;
    return side.picks.map((p, i) => {
      if (!p) return null;
      const ovr = playerOVR(p.player) - derbyFatigue(p, minute) + chemAt(i);
      return derbyInPos(p, side.slots[i]) ? ovr : Math.round(ovr * OUT_OF_POS);
    });
  } finally { state.picks = keep.picks; state.slots = keep.slots; }
}
function derbyInPos(p, slot) { return inNaturalPos(p.player, slot.pos); }
function derbyTeamVars(squad) {
  const t = getTeam(squad.teamId);
  return `--tc:${derbyEsc(t.primaryColor)};--ts:${derbyEsc(t.secondaryColor)};--tx:${derbyEsc(textColorFor(t.primaryColor))}`;
}
// Energy (spec §11.1): a thin bar under each token, coloured by level.
function derbyEnergyBar(e) {
  const v = Math.max(0, Math.min(100, Math.round(e))), L = derbyEnergyLevel(v);
  return `<span class="dc-en dc-en-${L.key}" title="כושר ${v} · ${L.word}"><i style="width:${v}%"></i></span>`;
}
function derbyEnergyWord(e) {
  const v = Math.round(e), L = derbyEnergyLevel(v);
  return `<span class="dc-lvl dc-lvl-${L.key}">${L.word} ${v}</span>`;
}
const DERBY_ENERGY_LEGEND = `<div class="dc-legend dc-en-legend">כושר: ${DERBY_ENERGY_LEVELS.map(l =>
  `<span class="dc-lg"><i class="dc-en-${l[2]}"></i>${l[1]}</span>`).join('')}</div>`;
// Before kick-off: who of the 18 is not fresh, most tired first.
function derbyRestHtml(side) {
  const men = side.picks.concat(side.bench).filter(Boolean).map(p => ({ p, e: p.e0 ?? 100, on: side.picks.includes(p) }))
    .filter(x => Math.round(x.e) < 80).sort((a, b) => a.e - b.e);
  if (!men.length) return '<div class="dc-rest dc-rest-ok">כל ה-18 רעננים.</div>';
  return `<div class="dc-rest"><b>צריכים מנוחה:</b> ${men.map(x =>
    `<span class="dc-rest-man">${derbyShort(x.p)}${x.on ? '' : ' <small>(ספסל)</small>'} ${derbyEnergyWord(x.e)}</span>`).join(' ')}</div>`;
}
function derbyShort(p) { return derbyEsc(typeof playerShortName === 'function' ? playerShortName(p.player.name) : p.player.name); }

// Your XI on a pitch, as in the draft. `live`: tappable (a stop or before kick-off).
function derbyPitchHtml(ctx, live) {
  const { m } = ctx, me = m.me, sel = _derbySel;
  const selBench = sel && sel.k === 'bench' ? me.bench[sel.i] : null;
  const rt = derbyRatings(me, m.min);
  return `<div class="dc-pitch-wrap"><div class="pitch dc-pitch">${me.picks.map((p, i) => {
    if (!p) return '';
    const slot = me.slots[i], f = derbyFatigue(p, m.min), en = derbyEnergyAt(p, m.min);
    const oop = !derbyInPos(p, slot);
    const cls = (sel && sel.k === 'slot' && sel.i === i ? ' highlight-selected'
      : selBench && derbyInPos(selBench, slot) ? ' highlight-compat' : '') + (live ? '' : ' dc-ro');
    const pills = (p.on ? `<span class="dc-pill dc-pill-on" dir="ltr">⬆${derbyEsc(p.on)}'</span>` : '');
    const inner = `<div class="slot-circle filled-circle${oop ? ' circle-oop' : ''}">
        <span class="slot-ovr${f > 0 ? ' dc-ovr-tired' : ''}">${Math.round(rt[i])}</span>
        ${oop ? '<span class="slot-oop" title="מחוץ לעמדה — 93%">⇄</span>' : ''}
        <span class="slot-player-short">${derbyShort(p)}</span>${pills}</div>
      ${derbyEnergyBar(en)}
      <div class="slot-name-label${oop ? ' dc-oop-lbl' : ''}"${oop ? ' title="מחוץ לעמדה — 93%"' : ''}>${derbyEsc(slot.label || slot.pos)}</div>`;
    const st = `left:${+slot.x}%;top:${+slot.y}%;${derbyTeamVars(p.squad)}`;
    return live
      ? `<button type="button" class="slot-token filled dc-tok${cls}" style="${st}" data-slot="${i}" aria-label="${derbyEsc(p.player.name)}">${inner}</button>`
      : `<div class="slot-token filled dc-tok${cls}" style="${st}">${inner}</div>`;
  }).join('')}</div></div>
    <div class="dc-legend"><span class="dc-legend-oop">⇄ כתום = מחוץ לעמדה (93%)</span> · <span class="dc-in">⬆ נכנס</span></div>
    ${DERBY_ENERGY_LEGEND}`;
}
// The bench as a row of tokens. With a pitch slot picked, the men who fit it
// naturally are lit; the others show the 93% they would play at. The men taken
// off follow, greyed with the minute they went off: they cannot come back —
// except one taken off at THIS stop, whose substitution can still be undone.
function derbyOffUndoable(m, o) { return !!(o && o.inName && o.offAt === m.min && m.min > 0 && !m.over); }
function derbyGoneHtml(ctx, live) {
  const { m } = ctx, sel = _derbySel;
  return m.me.off.map((o, oi) => {
    const can = live && derbyOffUndoable(m, o);
    const inner = `<div class="slot-circle filled-circle"><span class="slot-ovr">${playerOVR(o.player)}</span>
        <span class="slot-player-short">${derbyShort(o)}</span></div>
      ${derbyEnergyBar(derbyEnergyAt(o, 90))}
      <span class="dc-btok-pos dc-gone-mark">יצא <bdi dir="ltr">${derbyEsc(o.offAt)}'</bdi></span>`;
    const cls = ' dc-gone' + (sel && sel.k === 'off' && sel.i === oi ? ' sel' : '') + (can ? ' dc-gone-undo' : '');
    return can
      ? `<button type="button" class="dc-btok${cls}" style="${derbyTeamVars(o.squad)}" data-off="${oi}" aria-label="${derbyEsc(o.player.name)} — יצא, אפשר להחזיר">${inner}</button>`
      : `<div class="dc-btok dc-ro${cls}" style="${derbyTeamVars(o.squad)}" aria-disabled="true" title="יצא — לא יכול לחזור">${inner}</div>`;
  }).join('');
}
function derbyBenchHtml(ctx, live, benchOk) {
  const { m } = ctx, me = m.me, sel = _derbySel;
  if (!me.bench.length && !me.off.length) return '<div class="dc-bench-empty">הספסל ריק.</div>';
  const slot = sel && sel.k === 'slot' ? me.slots[sel.i] : null;
  return `<div class="dc-bench">${me.bench.map((b, bi) => {
    const fit = slot ? derbyInPos(b, slot) : true;
    // what he would be worth coming on now: rating less his energy penalty (93% out of position)
    const ovr = Math.round((playerOVR(b.player) - derbyEnergyPenalty(b.e0 ?? 100)) * (fit ? 1 : OUT_OF_POS));
    const cls = (sel && sel.k === 'bench' && sel.i === bi ? ' sel' : '') + (slot && fit ? ' fit' : '');
    const inner = `<div class="slot-circle filled-circle${slot && !fit ? ' circle-oop' : ''}">
        <span class="slot-ovr">${ovr}</span><span class="slot-player-short">${derbyShort(b)}</span></div>
      ${derbyEnergyBar(b.e0 ?? 100)}
      <span class="dc-btok-pos${slot && !fit ? ' dc-oop-lbl' : ''}">${slot && !fit ? 'מחוץ לעמדה' : derbyEsc(derbyPosHe(b.player))}</span>`;
    return live
      ? `<button type="button" class="dc-btok${cls}" style="${derbyTeamVars(b.squad)}" data-bench="${bi}"${benchOk ? '' : ' disabled'} aria-label="${derbyEsc(b.player.name)}">${inner}</button>`
      : `<div class="dc-btok dc-ro" style="${derbyTeamVars(b.squad)}">${inner}</div>`;
  }).join('')}${derbyGoneHtml(ctx, live)}</div>`;
}
function derbyFormationsHtml(m) {
  return `<div class="dc-forms">${Object.entries(FORMATIONS).map(([k, f]) =>
    `<button type="button" class="dc-form${m.me.formationId === k ? ' on' : ''}" data-f="${derbyEsc(k)}" dir="ltr">${derbyEsc(f.label)}</button>`).join('')}</div>`;
}
function derbyOffHtml(s) {
  return s.off.length ? `<div class="dc-off">יצאו: ${s.off.map(p => `⬇ ${derbyEsc(p.player.name)}`).join(' · ')}</div>` : '';
}

// Why a bench man cannot come on now (in-match), or '' when he can.
function derbySubBlock(m) {
  if (m.min === 0 || derbyCanSub(m.me, m.min)) return '';
  if (m.me.subs >= DERBY_SUBS) return `ניצלת את כל ${DERBY_SUBS} החילופים.`;
  if (!m.me.bench.length) return 'אין עוד שחקנים על הספסל.';
  return `ניצלת את ${DERBY_SUB_WINDOWS} העצירות לחילופים (המחצית חינם).`;
}

function derbyPaintPanel(ctx) {
  const { m, run } = ctx, ctl = document.getElementById('dc-ctl');
  if (!ctl) return;
  const head = `<div class="dc-card-head">${derbyEsc(derbyTeamName(run.club))} · ההרכב שלך
    <span class="dc-dim">· ${derbyEsc((FORMATIONS[m.me.formationId] || {}).label || '')} · ${DERBY_TACTIC_HE[m.me.tactic] || ''}</span></div>`;
  if (ctx.mode === 'paused') {
    const sel = _derbySel;
    const selOff = sel && sel.k === 'off' ? m.me.off[sel.i] : null;
    // a man taken off at this stop is picked: any bench man may replace his replacement
    const pre = m.min === 0, block = derbySubBlock(m), benchOk = pre || !block || derbyOffUndoable(m, selOff);
    const free = pre ? 'לפני השריקה זה לא נספר כחילוף.' : 'החלפת מקומות ומערך — חינם; כניסה מהספסל נספרת כחילוף.';
    const selMan = sel && !selOff ? (sel.k === 'slot' ? m.me.picks[sel.i] : m.me.bench[sel.i]) : null;
    const selEn = selMan ? (sel.k === 'slot' ? derbyEnergyAt(selMan, m.min) : (selMan.e0 ?? 100)) : 0;
    const who = selMan ? `<b>${derbyEsc(selMan.player.name)}</b> · כושר: ${derbyEnergyWord(selEn)}. ` : '';
    const undo = derbyCanUndo(m);
    const why = selOff
        ? `<b>${derbyEsc(selOff.player.name)}</b> יצא בדקה ${derbyEsc(selOff.offAt)} ו-<b>${derbyEsc(selOff.inName)}</b> נכנס במקומו.
           <button type="button" class="btn-secondary dc-back" id="dc-back">↩ החזר למגרש</button>
           או לחץ על שחקן מהספסל שייכנס במקום ${derbyEsc(selOff.inName)} (אותו חילוף).`
      : sel && sel.k === 'slot'
        ? (benchOk ? 'עכשיו לחץ על שחקן אחר במגרש להחלפת מקומות, או על שחקן מהספסל (ירוק = מתאים לעמדה).'
                   : `עכשיו לחץ על שחקן אחר במגרש להחלפת מקומות. ${block}`)
      : sel && sel.k === 'bench' ? 'עכשיו לחץ על השחקן במגרש שיפנה לו מקום (ירוק = עמדה מתאימה).'
      : `לחץ על שחקן במגרש, ואז על שחקן אחר במגרש או על שחקן מהספסל. ${free}${block ? ' ' + block : ''}`;
    ctl.innerHTML = `<div class="dc-panel">
      <div class="dc-panel-title">${pre ? 'לפני שריקת הפתיחה — סדר הרכב ומערך' : m.min === 45 ? 'מחצית' : `עצירה · דקה ${m.min}`}</div>
      <div class="dc-sub-head">מערך</div>
      ${derbyFormationsHtml(m)}
      <div class="dc-sub-head">טקטיקה</div>
      <div class="dc-tactics">${TACTIC_KEYS.map(k => `<button type="button" class="dc-tac${m.me.tactic === k ? ' on' : ''}" data-t="${k}">
        <b>${DERBY_TACTIC_HE[k]}</b><small>${tacticTrade(k) || 'ללא שינוי'}</small></button>`).join('')}</div>
      ${pre ? '' : `<div class="dc-counts">חילופים ${m.me.subs}/${DERBY_SUBS} · עצירות ${m.me.windows}/${DERBY_SUB_WINDOWS} (המחצית לא נספרת)</div>`}
      ${pre ? derbyRestHtml(m.me) : ''}
      <div class="dc-hint" id="dc-hint">${who}${why}</div>
      ${derbyPitchHtml(ctx, true)}
      <div class="dc-sub-head">ספסל</div>
      ${derbyBenchHtml(ctx, true, benchOk)}
      <button type="button" class="btn-secondary dc-undo" id="dc-undo"${undo ? '' : ' disabled'}>↺ בטל שינויים</button>
      <button type="button" class="btn-primary dc-go" id="dc-cont">${pre ? 'שריקת פתיחה ▶' : 'המשך ▶'}</button>
    </div>`;
    ctl.querySelectorAll('.dc-form').forEach(b => {
      b.onclick = () => {
        if (b.dataset.f === m.me.formationId) return;
        if (derbySetFormationMine(run, m, b.dataset.f)) { _derbySel = null; derbyPaintPanel(ctx); }
      };
    });
    ctl.querySelectorAll('.dc-tac').forEach(b => {
      b.onclick = () => { if (derbySetTactic(run, m, b.dataset.t)) derbyPaintPanel(ctx); };
    });
    ctl.querySelectorAll('[data-slot]').forEach(b => { b.onclick = () => derbyTapSlot(ctx, +b.dataset.slot); });
    ctl.querySelectorAll('[data-bench]').forEach(b => { b.onclick = () => derbyTapBench(ctx, +b.dataset.bench); });
    ctl.querySelectorAll('[data-off]').forEach(b => { b.onclick = () => derbyTapOff(ctx, +b.dataset.off); });
    const bk = document.getElementById('dc-back');
    if (bk) bk.onclick = () => {
      if (!selOff || !derbyUndoSubMine(run, m, sel.i)) return;
      _derbySel = null;
      derbyPaintBoard(ctx); derbyPaintPanel(ctx);
    };
    document.getElementById('dc-undo').onclick = () => {
      if (!derbyUndoMine(run, m)) return;
      derbyLogDropMine(m, m.min);
      _derbySel = null;
      derbyPaintBoard(ctx); derbyPaintPanel(ctx);
    };
    document.getElementById('dc-cont').onclick = () => { if (derbyBusy()) return; _derbySel = null; derbyRunClock(ctx); };
  } else if (ctx.mode === 'playing') {
    ctl.innerHTML = `<section class="dc-card mine">${head}${derbyPitchHtml(ctx, false)}
      <div class="dc-sub-head">ספסל</div>${derbyBenchHtml(ctx, false, false)}</section>`;
  } else {
    ctl.innerHTML = derbyAfterHtml(ctx) + `<section class="dc-card mine">${head}${derbyPitchHtml(ctx, false)}${derbyOffHtml(m.me)}</section>`;
    const hs = document.getElementById('dc-head-ser'); if (hs) hs.innerHTML = derbySeriesLine(ctx.ser.games);
    const nx = document.getElementById('dc-next');
    if (nx) nx.onclick = () => { if (derbyBusy()) return; derbyShow(); };
  }
  if (typeof fitShortNames === 'function') fitShortNames(ctl);
  derbyPaintOpp(ctx);
}

// Line-up taps at a stop. Pitch + pitch: change places (free). Pitch + bench:
// before kick-off a free swap, in the match a substitution (counted).
function derbyTapSlot(ctx, i) {
  const { m, run } = ctx, sel = _derbySel;
  if (!m.me.picks[i]) return;
  if (!sel || sel.k === 'off') { _derbySel = { k: 'slot', i }; }
  else if (sel.k === 'slot') {
    if (sel.i !== i) derbySwapMine(run, m, sel.i, i);
    _derbySel = null;
  } else { derbyBenchIn(ctx, i, sel.i); return; }
  derbyPaintPanel(ctx);
}
function derbyTapBench(ctx, bi) {
  const { m } = ctx, sel = _derbySel;
  if (!m.me.bench[bi]) return;
  if (sel && sel.k === 'slot') { derbyBenchIn(ctx, sel.i, bi); return; }
  if (sel && sel.k === 'off') {
    // replace the replacement: the same substitution, another man coming on
    const { run } = ctx, o = m.me.off[sel.i], inn = m.me.bench[bi];
    if (o && derbyResubMine(run, m, sel.i, bi)) {
      derbyLogAdd(m, { min: m.min, cls: 'mine', team: derbyTeamName(run.club), inn: inn.player.name, out: o.player.name });
      _derbySel = null;
      derbyPaintBoard(ctx); derbyPaintPanel(ctx);
    }
    return;
  }
  _derbySel = sel && sel.k === 'bench' && sel.i === bi ? null : { k: 'bench', i: bi };
  derbyPaintPanel(ctx);
}
// A man taken off at this stop: pick him to bring him back or replace his replacement.
function derbyTapOff(ctx, oi) {
  const { m } = ctx, sel = _derbySel;
  if (!derbyOffUndoable(m, m.me.off[oi])) return;
  _derbySel = sel && sel.k === 'off' && sel.i === oi ? null : { k: 'off', i: oi };
  derbyPaintPanel(ctx);
}
function derbyBenchIn(ctx, si, bi) {
  const { m, run } = ctx;
  const out = m.me.picks[si], inn = m.me.bench[bi];
  if (!out || !inn) return;
  if (m.min === 0) {
    derbyPreSwapMine(run, m, si, bi);
  } else if (derbyMakeSub(run, m, si, bi)) {
    derbyLogAdd(m, { min: m.min, cls: 'mine', team: derbyTeamName(run.club), inn: inn.player.name, out: out.player.name });
    derbyPaintBoard(ctx);
  } else {
    const h = document.getElementById('dc-hint');
    if (h) h.textContent = derbySubBlock(m) || 'החילוף לא אפשרי כרגע.';
    return;
  }
  _derbySel = null;
  derbyPaintPanel(ctx);
}

// The rival's current XI, as a list (kept open).
function derbyPaintOpp(ctx) {
  const { m } = ctx, oppEl = document.getElementById('dc-opp');
  if (!oppEl) return;
  const rt = derbyRatings(m.opp, m.min);
  const row = (p, i) => {
    if (!p) return '';
    const f = derbyFatigue(p, m.min), slot = m.opp.slots[i], en = derbyEnergyAt(p, m.min);
    const mark = p.on ? `<span class="dc-in" dir="ltr">⬆${derbyEsc(p.on)}'</span>` : '';
    return `<li class="dc-xi-row"><span class="dc-pos">${derbyEsc(slot.label || slot.pos)}</span>
      <span class="dc-nm">${derbyEsc(p.player.name)} ${mark}</span>
      <span class="dc-ov${f > 0 ? ' tired' : ''}">${Math.round(en) < 80 ? derbyEnergyWord(en) : ''} ${derbyNum(Math.round(rt[i] * 10) / 10)}</span></li>`;
  };
  const was = oppEl.querySelector('details');
  if (was) _derbyOppOpen = was.open;     // a folded rival card stays folded
  oppEl.innerHTML = `<details class="dc-card dc-opp${ctx.cur.s === 2 ? ' arch' : ''}"${_derbyOppOpen ? ' open' : ''}>
    <summary class="dc-card-head">${derbyCrest(m.rival)}<span class="dc-rv-name">${derbyEsc(derbyTeamName(m.rival))}</span>
      <span class="dc-dim">${derbyEsc((FORMATIONS[m.opp.formationId] || {}).label || '')} · ${DERBY_TACTIC_HE[m.opp.tactic] || ''}</span></summary>
    <ul class="dc-xi dc-live">${m.opp.picks.map(row).join('')}</ul>
    ${derbyOffHtml(m.opp)}
    ${m.opp.bench.length ? `<div class="dc-sub-head">ספסל</div><ul class="dc-xi dc-xi-bench">${derbyBenchRows(m.opp.bench)}</ul>` : ''}
  </details>`;
}

// The clock: one minute per tick (derbyGameStep to m.min + 1 — the result does
// not depend on where the steps fall). "⏸ עצירה" stops at the minute in progress;
// half-time stops by itself.
function derbyRunClock(ctx) {
  const { m } = ctx;
  if (m.over) return;
  derbyStopClock();
  const gen = _derbyGen;
  document.querySelector('.dc-prev')?.remove();   // the previous game's line belongs to kick-off only
  _derbySel = null;
  m.snap = null;                  // "המשך" commits the stop: nothing left to undo (saved with the next minute)
  ctx.mode = 'playing'; ctx.shown = m.min;
  derbyPaintBoard(ctx);
  derbyPaintPanel(ctx);
  // "המשך" sits at the foot of the line-up: bring the score and the goals back into view
  document.querySelector('.dc-match-head')?.scrollIntoView?.({ block: 'start' });
  _derbyTimer = setInterval(() => {
    if (gen !== _derbyGen || !derbyActive()) { if (gen === _derbyGen) derbyStopClock(); return; }
    derbyTick(ctx);
  }, DERBY_MS_PER_MIN);
}
function derbyTick(ctx) {
  const { m, run } = ctx;
  if (ctx.mode !== 'playing' || m.over) return;
  const from = m.min, oppBefore = m.opp.picks.slice();
  derbyGameStep(run, m, from + 1);
  // The computer's substitutions happen at the start of a step (60' and 75').
  m.opp.picks.forEach((p, i) => {
    const was = oppBefore[i];
    if (p && was && p.player.name !== was.player.name) {
      derbyLogAdd(m, { min: from, cls: 'theirs', team: derbyTeamName(ctx.rival), inn: p.player.name, out: was.player.name });
    }
  });
  ctx.shown = m.min;
  if (m.over) ctx.mode = 'over';
  else if (m.min === 45) ctx.mode = 'paused';
  if (ctx.mode !== 'playing') { derbyStopClock(); _derbySel = null; }
  if (ctx.mode === 'paused') derbyMarkStop(run, m);
  derbyPaintBoard(ctx);
  // Every 45 ms only the score, the clock and the events move. The line-ups are
  // redrawn when what they show changes: a man on or off, a rival's tactic, a
  // shown rating, or an energy bar by a visible step (5 points).
  const sig = ctx.mode + '|' + m.opp.tactic + '|'
    + m.me.picks.concat(m.opp.picks).map(p => p ? p.player.name + ':' + Math.round(derbyFatigue(p, m.min) * 10) + ':' + Math.round(derbyEnergyAt(p, m.min) / 5) : '-').join(',');
  if (ctx.mode !== 'playing' || sig !== ctx.sig) { ctx.sig = sig; derbyPaintPanel(ctx); }
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
      <div class="dc-end-sub">${derbyEsc(club)} · ${derbyDiffText(run.difficulty)}${sum.title ? ' · ניצחת בשלוש הסדרות' : ''}</div></div>
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
