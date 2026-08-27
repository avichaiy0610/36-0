// ─── Career: one club, ten seasons, one life ──────────────────────────────────
//
// A career is a chain of ordinary seasons played on the ordinary engine. What
// makes it a career is the one thing that survives between them: six players.
//
// Ageing is NOT simulated. Every player already exists in the data once per
// season he really played, with the rating he really had that year, so a kept
// player is simply looked up again in next season's squads: his rating becomes
// what it became, his club becomes the club he really moved to, and if he is
// not in the league next season he is gone — transferred abroad, relegated with
// his club, or retired. The most emotional screen in the mode is therefore a
// pure read of the data we already ship.
//
// The run is drafted, played and stored entirely on this device. The only
// things that ever leave it are the achievements a run earns and, when a
// dynasty ENDS, its shape — seasons, titles, points — for the board in
// career_runs. Ten seasons of squad state stay here.

const CR_KEY       = '36-0-career';
const CR_BEST_KEY  = '36-0-career-best';
const CR_SEASONS   = 10;   // a full run — or as many seasons as the data has left
const CR_KEEP      = 6;    // kept through the transfer window; the other five are re-drafted
const CR_RELEGATE  = 2;    // the bottom two go down, and going down ends the run
// Club swaps are a resource of the DYNASTY, not of the season: they carry
// across, they never refill, and spending one in 1999 is a hole in 2007. The
// ratio between the difficulties is the one the rest of the game uses (3:1:0),
// anchored so a normal career gets three for the whole thing.
const CR_REROLLS   = { easy: 9, normal: 3, hard: 0 };
function crRerollsLeft(run) {
  const r = run || crRun();
  return r.rerolls ?? CR_REROLLS[r.difficulty] ?? CR_REROLLS.normal;
}

function crEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Names in data.js carry directional marks (550 lines have one) and three
// different apostrophes. A career looks the same player up across seasons by
// name, so every comparison goes through here — otherwise players would
// "retire" simply because their card was typed with a LRM in one season.
function crNormName(s) {
  return String(s ?? '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[׳’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── the run ──────────────────────────────────────────────────────────────── */
function crBlank() {
  return {
    v: 1,
    startYear: null, clubName: '', formationId: '4-3-3', tactic: 'bal', classic: false,
    difficulty: 'normal',
    rerolls: CR_REROLLS.normal,   // club swaps left for the WHOLE career
    seasonIdx: 0,
    phase: 'preseason',        // preseason → played → (transfer) → preseason … | over
    squad: null,               // the XI that finished the last season
    pending: null,             // the kept players waiting for the next draft
    history: [], titles: 0,
    stay: {}, longestStay: 0,   // how long each man has been here, and the record
    awarded: [],                // achievement keys already toasted for this run
    over: false, overReason: null,
  };
}

let _crRun = null;
function crRun() {
  if (_crRun) return _crRun;
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(CR_KEY)); } catch (e) { raw = null; }
  if (raw && raw.v === 1 && raw.startYear) return (_crRun = raw);
  return (_crRun = crBlank());
}
function crSave() {
  try { localStorage.setItem(CR_KEY, JSON.stringify(crRun())); } catch (e) {}
}
function crClear() {
  _crRun = crBlank();
  try { localStorage.removeItem(CR_KEY); } catch (e) {}
}
function crHasRun() { const r = crRun(); return !!r.startYear; }

function crBest() {
  try { return JSON.parse(localStorage.getItem(CR_BEST_KEY)) || { seasons: 0, titles: 0 }; }
  catch (e) { return { seasons: 0, titles: 0 }; }
}
function crRecordBest(run) {
  const best = crBest();
  const seasons = run.history.length;
  if (seasons <= best.seasons && run.titles <= best.titles) return;
  const next = { seasons: Math.max(seasons, best.seasons),
                 titles:  Math.max(run.titles, best.titles),
                 at: new Date().toISOString().slice(0, 10) };
  try { localStorage.setItem(CR_BEST_KEY, JSON.stringify(next)); } catch (e) {}
}

/* ── seasons ──────────────────────────────────────────────────────────────── */
// A run is ten seasons — unless it starts late enough that the data runs out
// first. Starting in 1999 buys the full dynasty; starting in 2022 buys four
// seasons, and the screen says so before you commit.
function crSeasonsFor(startYear) {
  return Math.max(1, Math.min(CR_SEASONS, LATEST_SEASON_YEAR - startYear + 1));
}
function crTotalSeasons(run) { return crSeasonsFor((run || crRun()).startYear); }
function crYear(run) { const r = run || crRun(); return r.startYear + r.seasonIdx; }

// Every club-season a player appears in for a given year. A player who moved
// mid-season is in the data twice; the better card is the one he is judged by.
function crFindPlayerIn(year, name) {
  const want = crNormName(name);
  let best = null;
  SQUADS.forEach(sq => {
    if (parseSeasonYear(sq.season) !== year) return;
    const player = sq.players.find(p => crNormName(p.name) === want);
    if (player && (!best || player.ovr > best.player.ovr)) best = { squad: sq, player };
  });
  return best;
}

// picks ⇄ storage. Stored as squad id + name (the way the draft and the
// gauntlet store theirs) so the XI is rebuilt from the data, never from a copy
// of it that can drift when a rating is corrected.
function crPacksPicks(picks) {
  return picks.map(p => p ? { squadId: p.squad.id, name: p.player.name } : null);
}
function crRebuildPicks(list, formationId, tactic) {
  if (!Array.isArray(list)) return null;
  const slots = formationSlots(formationId, tacticOf(tactic));
  if (!slots || list.length !== slots.length) return null;
  const bySquad = new Map(SQUADS.map(s => [s.id, s]));
  const picks = new Array(slots.length).fill(null);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p) continue;
    const squad = bySquad.get(p.squadId);
    const player = squad && squad.players.find(x => crNormName(x.name) === crNormName(p.name));
    if (!squad || !player) return null;      // the data moved under the save
    picks[i] = { player, squad };
  }
  return picks;
}

/* ── screen ───────────────────────────────────────────────────────────────── */
function showCareer() {
  showScreen('career');
  const back = document.getElementById('career-back');
  if (back) back.onclick = () => showScreen('welcome');
  crRender();
}

function crRender() {
  const box = document.getElementById('career-content');
  if (!box) return;
  const run = crRun();
  const fresh = !crHasRun();
  if (fresh)                       crRenderSetup(box);
  else if (run.over)               crRenderOver(box, run);
  else if (run.phase === 'played') crRenderTransfer(box, run);
  else                             crRenderDashboard(box, run);
  crWireShare();   // the header carries the share button on all three screens
  if (typeof crAdminPanelHTML === 'function' && crIsAdmin()) {
    box.insertAdjacentHTML('beforeend', crAdminPanelHTML());
    crWireAdminPanel();
  }
  if (!fresh && run.over) { crSubmitRun(run); crMaybeSharePrompt(run); }
  // the board belongs where a dynasty is decided: before one starts, and when
  // one ends. Mid-run it would only be noise.
  if (fresh || run.over) crRenderBoard();
}

/* ── new career ───────────────────────────────────────────────────────────── */
let _crSetup = { startYear: 1999, difficulty: 'normal', formationId: '4-3-3', tactic: 'bal', classic: false };

function crRenderSetup(box) {
  const years = ALL_SEASON_YEARS.map(y =>
    `<option value="${y}"${y === _crSetup.startYear ? ' selected' : ''}>${crEsc(yearToSeason(y))}</option>`).join('');
  const forms = Object.keys(FORMATIONS).map(k =>
    `<option value="${crEsc(k)}"${k === _crSetup.formationId ? ' selected' : ''}>${crEsc(FORMATIONS[k].label)}</option>`).join('');
  // A dynasty is 20-odd seasons in one shape, so the tactic matters more here
  // than anywhere. Hidden for the formations that already fix their own midfield.
  const tacts = TACTIC_KEYS.map(k =>
    `<option value="${crEsc(k)}"${k === _crSetup.tactic ? ' selected' : ''}>${
      crEsc(TACTICS[k].label)} — ${crEsc(TACTICS[k].note)}</option>`).join('');
  const best = crBest();

  box.innerHTML = `
    <div class="cr-intro">
      <div class="cr-intro-title">👑 קריירה</div>
      <p class="cr-intro-text">
        עונה אחת זה משחק. <strong>עשר עונות זה שושלת.</strong><br>
        בוחרים 11 שחקנים מתוך הסגלים של אותה עונה בלבד, משחקים אותה בפורמט האמיתי שלה,
        ואז שומרים ${CR_KEEP} שחקנים ובוחרים ${11 - CR_KEEP} חדשים — מהעונה הבאה.
      </p>
      <ul class="cr-rules">
        <li>⏳ השחקנים שלך <strong>מזדקנים באמת</strong> — הדירוג של כל שחקן ששמרת הוא הדירוג האמיתי שלו בעונה הבאה.</li>
        <li>✈️ מי שעזב את הליגה, ירד ליגה או פרש — פשוט לא יהיה שם.</li>
        <li>💀 סיום בשני המקומות האחרונים = <strong>ירידת ליגה, והקריירה נגמרת</strong>.</li>
        <li>🇪🇺 אליפות פותחת את מוקדמות אירופה — והקריירה ממשיכה בלי קשר לתוצאה שם.</li>
        <li>🔄 החלפות הקבוצה בהגרלה הן משאב של <strong>כל הקריירה</strong> — הן לא מתחדשות בין עונות.</li>
      </ul>
    </div>

    <div class="lg-card">
      <div class="lg-card-title">התחלת קריירה חדשה</div>
      <div class="lg-config">
        <div class="lg-config-row"><span>שם המועדון</span>
          <input id="cr-club" class="lg-input cr-club-input" maxlength="24" placeholder="המועדון שלי" value="${crEsc(_crSetup.clubName || '')}"></div>
        <div class="lg-config-row"><span>עונת פתיחה</span>
          <select id="cr-year" class="lg-input cr-select">${years}</select></div>
        <div class="lg-config-row"><span>מערך</span>
          <select id="cr-formation" class="lg-input cr-select">${forms}</select></div>
        <div class="lg-config-row" id="cr-tactic-row"><span>טקטיקה</span>
          <select id="cr-tactic" class="lg-input cr-select">${tacts}</select></div>
        <div class="lg-config-row"><span>סגנון</span>
          <select id="cr-mode" class="lg-input cr-select">
            <option value="full"${_crSetup.classic ? '' : ' selected'}>מלא — כימיה, תגיות וטקטיקה</option>
            <option value="classic"${_crSetup.classic ? ' selected' : ''}>קלאסי — דירוגים בלבד</option>
          </select></div>
        <div class="lg-config-row"><span>קושי</span>
          <div class="lg-mini" id="cr-diff">
            <button data-v="easy">קל</button><button data-v="normal">רגיל</button><button data-v="hard">קשה</button>
          </div></div>
      </div>
      <div class="cr-len-note" id="cr-len-note"></div>
      <div class="cr-len-note" id="cr-reroll-note"></div>
      <button class="btn-primary lg-btn" id="cr-start" style="width:100%">התחל קריירה ⚽</button>
    </div>

    ${best.seasons ? `<div class="cr-best">🏅 השיא שלך: ${best.seasons} עונות · ${best.titles} אליפויות</div>` : ''}
    <div id="cr-board"></div>`;

  const diffBox = document.getElementById('cr-diff');
  const rerollNote = document.getElementById('cr-reroll-note');
  const syncRerollNote = () => {
    const n = CR_REROLLS[_crSetup.difficulty] ?? CR_REROLLS.normal;
    rerollNote.innerHTML = n
      ? `🔄 <strong>${n} החלפות קבוצה</strong> לכל הקריירה — לא מתחדשות בין עונות.`
      : '🔄 בלי החלפות קבוצה בכלל. מה שההגרלה נתנה, זה מה שיש.';
  };
  diffBox.querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', b.dataset.v === _crSetup.difficulty);
    b.onclick = () => {
      diffBox.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      _crSetup.difficulty = b.dataset.v;
      syncRerollNote();
    };
  });
  syncRerollNote();

  // the tactic row belongs only to shapes that leave the middle open
  const formSel = document.getElementById('cr-formation');
  const tacticRow = document.getElementById('cr-tactic-row');
  const modeSel = document.getElementById('cr-mode');
  const syncTacticRow = () => {
    const classic = modeSel && modeSel.value === 'classic';
    if (tacticRow) tacticRow.style.display = (!classic && formationTactical(formSel.value)) ? '' : 'none';
  };
  if (formSel) { formSel.addEventListener('change', syncTacticRow); }
  if (modeSel) { modeSel.addEventListener('change', syncTacticRow); }
  syncTacticRow();

  const yearSel = document.getElementById('cr-year');
  const note = document.getElementById('cr-len-note');
  const updateNote = () => {
    const y = parseInt(yearSel.value, 10);
    const n = crSeasonsFor(y);
    note.innerHTML = n < CR_SEASONS
      ? `הקריירה תימשך <strong>${n} עונות</strong> — עד ${crEsc(yearToSeason(LATEST_SEASON_YEAR))}, כי שם נגמרים הנתונים. התחלה מוקדמת יותר = שושלת ארוכה יותר.`
      : `הקריירה תימשך <strong>${n} עונות</strong> — ${crEsc(yearToSeason(y))} עד ${crEsc(yearToSeason(y + n - 1))}.`;
  };
  yearSel.onchange = updateNote;
  updateNote();

  document.getElementById('cr-start').onclick = () => {
    const run = crBlank();
    run.startYear   = parseInt(yearSel.value, 10);
    run.formationId = document.getElementById('cr-formation').value;
    run.classic     = (document.getElementById('cr-mode')?.value === 'classic');
    run.tactic      = (!run.classic && formationTactical(run.formationId))
      ? tacticOf(document.getElementById('cr-tactic')?.value) : 'bal';
    run.difficulty  = _crSetup.difficulty;
    run.rerolls     = CR_REROLLS[_crSetup.difficulty] ?? CR_REROLLS.normal;
    run.clubName    = (document.getElementById('cr-club').value || '').trim().slice(0, 24) || 'המועדון שלי';
    _crRun = run;
    crSave();
    crStartDraft();
  };
}

/* ── dashboard ────────────────────────────────────────────────────────────── */
function crRenderDashboard(box, run) {
  const year = crYear(run);
  const pending = run.pending ? crRebuildPicks(run.pending, run.formationId, run.tactic) : null;
  box.innerHTML = `
    ${crHeaderHTML(run)}
    <div class="lg-card cr-next-card">
      <div class="cr-next-label">העונה הבאה</div>
      <div class="cr-next-season">${crEsc(yearToSeason(year))}</div>
      <div class="cr-next-sub">${crEsc(formatLabel(seasonFormat(year)))}</div>
      ${pending ? `<div class="cr-next-kept">✅ ${pending.filter(Boolean).length} שחקנים כבר בסגל — נותרו ${pending.filter(p => !p).length} בחירות</div>` : ''}
      <button class="btn-primary btn-full" id="cr-play">⚽ ${pending ? 'המשך את הדראפט' : 'דראפט עונת ' + crEsc(yearToSeason(year))}</button>
    </div>
    ${crHistoryHTML(run)}
    <button class="lg-leave" id="cr-abandon">נטוש את הקריירה</button>`;
  document.getElementById('cr-play').onclick = () => crStartDraft();
  document.getElementById('cr-abandon').onclick = crAbandon;
}

function crHeaderHTML(run) {
  const total = crTotalSeasons(run);
  const played = run.history.length;
  return `
    <div class="cr-header">
      <div class="cr-club">${crEsc(run.clubName)}</div>
      <div class="cr-meta">
        <span>${run.over ? `${played} עונות · הסתיים` : `עונה ${Math.min(played + 1, total)} מתוך ${total}`}</span>
        <span>·</span>
        <span>🏆 ${run.titles} אליפויות</span>
        <span>·</span>
        <span>🔄 ${crRerollsLeft(run)} החלפות</span>
        <span>·</span>
        <span>${crEsc(FORMATIONS[run.formationId]?.label ?? run.formationId)}</span>
      </div>
      <div class="cr-bar"><div class="cr-bar-fill" style="width:${Math.round((played / total) * 100)}%"></div></div>
      ${played && !run.over ? crShareButtonHTML('cr-share-btn') : ''}
    </div>`;
}

/* ── the dynasty board ────────────────────────────────────────────────────── */
const CR_BEST_NOTE = 'שיא חדש — השושלת הזאת נכנסה ללוח 🏆';
// The run itself still never leaves the device. What goes up when a dynasty
// ENDS is its shape — seasons, titles, points, how it finished — so that ten
// seasons of work can finally be measured against everybody else's.
let _crBoardBest = false;
async function crSubmitRun(run) {
  if (typeof _supabase === 'undefined' || !_supabase) return;
  if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
  if (!run || !run.over || run.boardSent) return;
  if (run.sandbox) return;              // a sandbox decade is not a record
  run.boardSent = true;
  crSave();
  try {
    const best = run.history.reduce((b, h) => (!b || h.rank < b.rank ? h : b), null);
    const { data, error } = await _supabase.rpc('submit_career_run', {
      p: {
        club_name:    run.clubName,
        start_year:   run.startYear,
        seasons:      run.history.length,
        titles:       run.titles,
        points:       run.history.reduce((s, h) => s + h.points, 0),
        best_rank:    best ? best.rank : null,
        longest_stay: run.longestStay || 0,
        finished:     run.overReason === 'finished',
        relegated:    run.overReason === 'relegated',
      },
    });
    if (error) { run.boardSent = false; crSave(); return; }
    if (data && data.best) {
      _crBoardBest = true;
      const el = document.getElementById('cr-board-note');
      if (el) el.textContent = CR_BEST_NOTE;
    }
  } catch (e) { run.boardSent = false; crSave(); }
}

// Rendered on the career screen: before a run, as the thing to beat; after one,
// as the place your dynasty landed.
async function crRenderBoard() {
  const box = document.getElementById('cr-board');
  if (!box) return;
  if (typeof _supabase === 'undefined' || !_supabase) { box.innerHTML = ''; return; }
  try {
    const { data, error } = await _supabase.rpc('career_board', { p_limit: 25 });
    if (error || !data || !data.length) { box.innerHTML = ''; return; }
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const rows = data.map(r => {
      const me = user && r.user_id === user.id;
      const ending = r.relegated ? '💀' : r.finished ? '🏁' : '';
      return `
        <div class="lb-row cr-row${me ? ' lgsim-me' : ''}">
          <span class="lb-rank ${r.rank <= 3 ? 'lb-rank-top' : ''}">${r.rank}</span>
          <span class="lb-name">${crEsc(r.username || 'אנונימי')}${me ? ' (אתה)' : ''}
            <span class="cr-board-club">${crEsc(r.club_name)} ${ending}</span></span>
          <span class="lb-stat">🏆 ${r.titles}</span>
          <span class="lb-sub" dir="rtl"><bdi>${r.seasons} עונות</bdi> · <bdi>${r.points} נק׳</bdi></span>
        </div>`;
    }).join('');
    box.innerHTML = `
      <div class="section-label" style="margin-top:16px">👑 לוח השושלות</div>
      <div class="cr-board-hint">מדורג לפי אליפויות, ואז נקודות. נשמרת הקריירה הטובה ביותר של כל שחקן.</div>
      <div class="cr-board-note" id="cr-board-note">${_crBoardBest ? CR_BEST_NOTE : ''}</div>
      <div class="lb-table cr-table">${rows}</div>`;
  } catch (e) { box.innerHTML = ''; }
}

/* ── sharing a dynasty ────────────────────────────────────────────────────── */
// Ten seasons do not fit in a sentence, so they go out as a strip — one square
// per season, champion to relegated, in the order they happened. It is the
// Wordle trick: unreadable to a stranger, obvious to anyone who has played, and
// small enough to survive a WhatsApp forward.
function crSeasonSquare(h, n) {
  if (h.rank === 1) return '🏆';
  if (h.rank <= 3) return '🟩';
  if (h.rank <= Math.ceil(n / 2)) return '🟨';
  if (h.rank > n - CR_RELEGATE) return '💀';
  return '🟧';
}

function crShareText(run) {
  const strip = run.history.map(h => crSeasonSquare(h, h.n || 14)).join('');
  const points = run.history.reduce((s, h) => s + h.points, 0);
  const lines = [
    `👑 ${run.clubName} — ${run.history.length} עונות ב-36-0`,
    `${yearToSeason(run.startYear)}–${yearToSeason(crYear(run))}`,
    '',
    strip,
    `🏆 ${run.titles} אליפויות · ${points} נק׳`,
  ];
  // the man who stayed. A dynasty's best story is usually one player, and he
  // signs off as what he became: the club's legend.
  const stay = Object.entries(run.stay || {}).sort((a, b) => b[1] - a[1])[0];
  if (stay && stay[1] >= 3) {
    const name = (run.squad || []).map(p => p && p.name)
      .find(nm => nm && crNormName(nm) === stay[0]);
    if (name) lines.push(`❤️ אגדת המועדון: ${name} — ${stay[1]} עונות`);
  }
  if (run.over) lines.push(run.overReason === 'relegated' ? '💀 הסוף: ירידת ליגה' : '🏁 עשור שהושלם');
  lines.push('', 'https://www.36-0.co.il/');
  return lines.join('\n');
}

// Native share sheet where there is one (that is the WhatsApp button on a
// phone), clipboard everywhere else. Never throws, never blocks the screen.
async function crShare(btn) {
  const run = crRun();
  if (!crHasRun() || !run.history.length) return;
  const text = crShareText(run);
  const label = btn ? btn.textContent : '';
  run.shared = true; crSave();
  if (typeof track === 'function') track('share', 'career', String(run.history.length));
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    if (btn) { btn.textContent = '✓ הועתק — הדבק בוואטסאפ'; setTimeout(() => { btn.textContent = label; }, 2200); }
  } catch (e) {
    if (e && e.name === 'AbortError') return;      // the sheet was dismissed
    if (btn) { btn.textContent = 'ההעתקה נכשלה'; setTimeout(() => { btn.textContent = label; }, 1800); }
  }
}

/* ── the one prompt ───────────────────────────────────────────────────────── */
// A dynasty ends once. That is the single moment worth interrupting for — and
// only that moment: once per run, never mid-run, never twice, gone on a tap
// anywhere outside it, and it shows the strip so there is nothing to imagine.
// If the player already shared this run, it does not appear at all.
const CR_NO_PROMPT_KEY = '36-0-career-noprompt';
function crPromptMuted() {
  try { return localStorage.getItem(CR_NO_PROMPT_KEY) === '1'; } catch (e) { return false; }
}

function crMaybeSharePrompt(run) {
  if (!run || !run.over || run.sharePrompted || run.shared) return;
  if (!run.history.length || crPromptMuted()) return;
  run.sharePrompted = true;
  crSave();

  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay cr-share-modal';
  wrap.innerHTML = `
    <div class="modal-box cr-share-box">
      <button class="modal-close" id="cr-sp-close" aria-label="סגירה">✕</button>
      <div class="modal-title">${run.overReason === 'relegated' ? '💀 סוף השושלת' : '🏁 עשור שהושלם'}</div>
      <div class="cr-sp-strip" dir="rtl">${crEsc(run.history.map(h => crSeasonSquare(h, h.n || 14)).join(''))}</div>
      <div class="cr-sp-sub">${run.history.length} עונות · ${run.titles} אליפויות ב${crEsc(run.clubName)}</div>
      <div class="cr-sp-warn">אל תאבד את הקבוצה שלך — שתף אותה כדי לשמור אותה. ברגע שתתחיל קריירה חדשה, העשור הזה נעלם.</div>
      <button class="btn-primary btn-full" id="cr-sp-share">📤 שתף את השושלת</button>
      <button class="cr-sp-later" id="cr-sp-later">אחר כך</button>
      <label class="cr-sp-mute"><input type="checkbox" id="cr-sp-mute"> אל תציע לי יותר</label>
    </div>`;
  document.body.appendChild(wrap);

  // the checkbox is honoured whichever way the box is closed, sharing included
  const close = () => {
    if (wrap.querySelector('#cr-sp-mute').checked) {
      try { localStorage.setItem(CR_NO_PROMPT_KEY, '1'); } catch (e) {}
    }
    wrap.remove();
  };
  wrap.querySelector('#cr-sp-close').onclick = close;
  wrap.querySelector('#cr-sp-later').onclick = close;
  wrap.onclick = e => { if (e.target === wrap) close(); };
  wrap.querySelector('#cr-sp-share').onclick = async () => {
    await crShare(wrap.querySelector('#cr-sp-share'));
    close();
  };
}

// One button, wired wherever it appears.
function crShareButtonHTML(cls) {
  return `<button class="${cls}" id="cr-share">📤 שתף את הקריירה</button>`;
}
function crWireShare() {
  const btn = document.getElementById('cr-share');
  if (btn) btn.onclick = () => crShare(btn);
}

function crHistoryHTML(run) {
  if (!run.history.length) return '';
  const rows = run.history.map(h => {
    const medal = h.rank === 1 ? '🏆' : h.rank <= 3 ? '🥉' : '';
    return `
      <div class="lb-row cr-row">
        <span class="lb-rank ${h.rank === 1 ? 'lb-rank-top' : ''}">${h.rank}</span>
        <span class="lb-name">${crEsc(yearToSeason(h.year))} ${medal}${h.europe ? ' 🇪🇺' : ''}</span>
        <span class="lb-stat">${h.points} נק׳</span>
        <span class="lb-sub" dir="rtl">${h.wins}נ ${h.draws}ת ${h.losses}ה · דירוג ${h.ovr}</span>
      </div>`;
  }).join('');
  return `<div class="section-label">היסטוריית המועדון</div><div class="lb-table cr-table">${rows}</div>`;
}

function crAbandon() {
  if (!confirm('לנטוש את הקריירה? כל העונות שנצברו יימחקו.')) return;
  crClear();
  if (typeof clearDraftState === 'function') clearDraftState();
  state.career = null;
  crRender();
}

/* ── the draft ────────────────────────────────────────────────────────────── */
// Career drafts are ordinary drafts with two things pinned: the pool is a
// SINGLE season (era min = era max), and the opponents are that same season's
// real league in its real format. Everything else — rerolls, the pre-season
// screen, the results — is the game as it already is.
function crApplyStateFor(run) {
  const year = crYear(run);
  state.leagueCode = null; state.duelCode = null; state.gauntlet = null;
  state.challenge = null; state.challengeDeck = null; state.challengeReqs = null;
  state.deck = null; state.mgw = null;
  window._leagueReviewMode = null; window._duelReviewMode = null;
  window._restoredSeason = null; window._presetSeason = null;
  document.getElementById('league-review-back')?.remove();
  document.getElementById('duel-review-chrome')?.remove();

  state.career      = { year, seasonIdx: run.seasonIdx };
  state.difficulty  = run.difficulty || 'normal';
  state.showRatings = true;
  state.draftMode   = 'squad-first';
  state.peakMode    = false;
  state.eraMin      = year;
  state.eraMax      = year;                       // one season = one transfer market
  state.oppSeason   = year === LATEST_SEASON_YEAR ? null : year;
  state.oppSeasonChoice = String(year);
  state.leagueFormat    = 'authentic';
  state.formationId = FORMATIONS[run.formationId] ? run.formationId : '4-3-3';
  state.tactic      = tacticOf(run.tactic);
  state.classic     = run.classic === true;
}

function crStartDraft() {
  const run = crRun();
  crApplyStateFor(run);
  const kept = run.pending ? crRebuildPicks(run.pending, state.formationId, state.tactic) : null;
  if (kept && kept.some(Boolean)) crBeginDraftWithKept(kept);
  else beginDraftWithState({ classic: state.classic, tactic: state.tactic });
  // The season is the one thing a career draft cannot swap — the whole market
  // is that single year. The club swaps are whatever the dynasty has left.
  state.seasonRerollsLeft = 0;
  state.teamRerollsLeft   = crRerollsLeft(run);
  updateRerollButtons();
  if (typeof saveDraftState === 'function') saveDraftState();
}

// Spent is spent: a swap taken in one season is gone from every season after
// it, so it is written to the run the moment it is used — not at the end of
// the season, which an abandoned draft would never reach.
function crOnRerollUsed(left) {
  const run = crRun();
  if (!crHasRun() || run.over) return;
  run.rerolls = Math.max(0, left);
  crSave();
}

// beginDraftWithState always starts from eleven empty slots. A career season
// after the first starts from six filled ones, so this is the same setup with
// the picks (and everything derived from them) carried in.
function crBeginDraftWithKept(picks) {
  state.teamRerollsLeft   = crRerollsLeft();
  state.seasonRerollsLeft = 0;              // one season, nothing to swap it for
  state.slots  = formationSlots(state.formationId, state.tactic);
  state.picks  = picks;
  state.currentRound   = picks.filter(Boolean).length;
  state.usedSquadIds   = new Set(picks.filter(Boolean).map(p => p.squad.id));
  state.usedPlayerKeys = new Set(picks.filter(Boolean).map(p => p.player.name));
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  state.isAnimating = false; state.awaitingSlotPick = false;
  state.moveMode = false; state.movingFromIdx = null;

  const banner = document.getElementById('peak-mode-banner');
  if (banner) banner.style.display = 'none';
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) { moveBtn.style.display = ''; moveBtn.classList.remove('move-active'); moveBtn.textContent = '⇄ הזז שחקן'; }
  const ovrDisp = document.getElementById('draft-ovr-display');
  if (ovrDisp) ovrDisp.style.display = 'none';
  const ovrLines = document.getElementById('draft-ovr-lines');
  if (ovrLines) { ovrLines.innerHTML = ''; ovrLines.style.display = 'none'; }

  buildPitch('pitch-slots', true);
  refreshAllTokens();
  if (typeof updateChallengeReqsUI === 'function') updateChallengeReqsUI();
  showScreen('draft');
  updateDraftOVR();
  startRound();
}

/* ── end of season ────────────────────────────────────────────────────────── */
// Called from animateResults for every season it renders — including the replay
// after a refresh, which is why recording is keyed by year and runs once.
function crOnSeasonEnd(res) {
  const btn = document.getElementById('btn-career-next');
  if (btn) btn.style.display = 'none';
  const run = crRun();
  if (!state.career || !crHasRun()) return;
  // another mode reused the results screen — a career must never claim its result
  if (state.leagueCode || state.duelCode || state.challenge || state.gauntlet) return;
  if (state.career.year !== crYear(run) && !run.over) return;

  if (!run.over && !run.history.some(h => h.year === state.career.year)) {
    const champion  = res.rank === 1;
    const relegated = res.rank > res.n - CR_RELEGATE;
    run.history.push({
      year: state.career.year, rank: res.rank, n: res.n,
      points: res.wins * 3 + res.draws,
      wins: res.wins, draws: res.draws, losses: res.losses,
      gf: res.gf, ga: res.ga, ovr: res.ovr,
      champion, europe: champion,
    });
    if (champion) run.titles++;
    // Who has been here before, and for how long. Counted before the XI is
    // overwritten, because that is the only moment both squads exist.
    const before = new Set((run.squad || []).filter(Boolean).map(p => crNormName(p.name)));
    const stay = {};
    state.picks.filter(Boolean).forEach(p => {
      const k = crNormName(p.player.name);
      stay[k] = before.has(k) ? ((run.stay || {})[k] || 1) + 1 : 1;
    });
    run.stay = stay;
    run.longestStay = Math.max(run.longestStay || 0, ...Object.values(stay), 0);
    run.squad   = crPacksPicks(state.picks);
    run.pending = null;
    run.phase   = 'played';
    if (relegated) { run.over = true; run.overReason = 'relegated'; }
    else if (run.history.length >= crTotalSeasons(run)) { run.over = true; run.overReason = 'finished'; }
    crRecordBest(run);
    crSave();
    crAward(run);
    // how far careers actually get: the season number, with F for a full ten and
    // R for a run that ended in relegation ("3", "10F", "5R"). Signed out too —
    // most of the career is played without an account.
    if (typeof track === 'function') {
      track('finish', 'career', String(run.history.length) +
        (run.over ? (run.overReason === 'relegated' ? 'R' : 'F') : ''));
    }
  }

  if (!btn) return;
  btn.style.display = '';
  if (run.over) {
    btn.textContent = run.overReason === 'relegated'
      ? '💀 ירדת ליגה — סוף הקריירה'
      : '🏁 סיום הקריירה — לסיכום';
    btn.classList.toggle('cr-btn-dead', run.overReason === 'relegated');
  } else {
    btn.classList.remove('cr-btn-dead');
    btn.textContent = `➡️ חלון העברות — ${yearToSeason(crYear(run) + 1)}`;
  }
  btn.onclick = () => showCareer();
}

/* ── what the career earned ───────────────────────────────────────────────── */
// The run itself never leaves this device. What DOES go up is the handful of
// facts an achievement hangs on, and the server clamps every one of them.
// Signed out it does nothing — the career is fully playable without an account.
async function crAward(run) {
  if (typeof _supabase === 'undefined' || !_supabase) return;
  if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
  try {
    const { data, error } = await _supabase.rpc('award_career_achievements', {
      p: {
        seasons: run.history.length,
        titles: run.titles,
        longest_stay: run.longestStay || 0,
        finished:  !!run.over && run.overReason === 'finished',
        relegated: !!run.over && run.overReason === 'relegated',
      },
    });
    if (error || !data) return;
    const keys = data.achievements || [];
    const fresh = keys.filter(k => !(run.awarded || []).includes(k));
    run.awarded = keys;
    crSave();
    if (fresh.length && typeof showAchievementToasts === 'function') showAchievementToasts(fresh);
  } catch (e) { /* an achievement is a decoration; a career is never lost to one */ }
}

/* ── the transfer window ──────────────────────────────────────────────────── */
// The screen this whole mode exists for: what a year did to the eleven men you
// picked, read straight out of next season's squads.
function crAgeingReport(run) {
  const nextYear = crYear(run) + 1;
  const slots = formationSlots(run.formationId, tacticOf(run.tactic));
  const current = crRebuildPicks(run.squad, run.formationId, run.tactic) || [];
  return slots.map((slot, i) => {
    const cur = current[i];
    if (!cur) return { slot, gone: true, reason: 'לא אויש' };
    const next = crFindPlayerIn(nextYear, cur.player.name);
    if (!next) {
      return { slot, cur, gone: true, reason: 'יצא מהליגה' };
    }
    const oldClub = getTeam(cur.squad.teamId).name;
    const newClub = getTeam(next.squad.teamId).name;
    return {
      slot, cur, next, gone: false,
      delta: next.player.ovr - cur.player.ovr,
      moved: next.squad.teamId !== cur.squad.teamId,
      oldClub, newClub,
      posChanged: normalizePos(next.player.position) !== normalizePos(cur.player.position),
    };
  });
}

function crRenderTransfer(box, run) {
  const nextYear = crYear(run) + 1;
  const report = crAgeingReport(run);
  const stayed = report.filter(r => !r.gone);
  const keepMax = Math.min(CR_KEEP, stayed.length);
  const last = run.history[run.history.length - 1];

  const cards = report.map((r, i) => {
    if (r.gone) {
      return `
        <div class="cr-p cr-p-gone">
          <div class="cr-p-main">
            <span class="cr-p-slot">${crEsc(r.slot.pos)}</span>
            <span class="cr-p-name">${crEsc(r.cur ? r.cur.player.name : '—')}</span>
          </div>
          <div class="cr-p-sub">🏁 ${crEsc(r.reason)} — לא ניתן לשמור</div>
        </div>`;
    }
    const arrow = r.delta > 0 ? `<span class="cr-up">▲ ${r.delta}</span>`
                : r.delta < 0 ? `<span class="cr-down">▼ ${Math.abs(r.delta)}</span>`
                : `<span class="cr-flat">=</span>`;
    const move = r.moved ? `<span class="cr-move">✈️ ${crEsc(r.newClub)}</span>` : '';
    const pos  = r.posChanged ? `<span class="cr-poschange">${crEsc(r.cur.player.position)} → ${crEsc(r.next.player.position)}</span>` : '';
    // Keeping a man who is half of a pair keeps the pair. This is the decision
    // the transfer window is FOR, so the link has to be on the row.
    let chem = '';
    if (typeof chemPair === 'function') {
      const mate = report.find((o, j) => j !== i && !o.gone && o.next && chemPair(r.next.player.name, o.next.player.name));
      if (mate) {
        const pr = chemPair(r.next.player.name, mate.next.player.name);
        chem = `<span class="cr-chem" title="${crEsc(chemWhy({ seasons: pr[1], titles: pr[2] }))}">🔗 צמד עם ${crEsc(playerShortName(mate.next.player.name))} +${pr[0]}</span>`;
      }
    }
    return `
      <label class="cr-p${chem ? ' cr-p-chem' : ''}" data-i="${i}">
        <input type="checkbox" class="cr-keep-box" data-i="${i}">
        <div class="cr-p-main">
          <span class="cr-p-slot">${crEsc(r.slot.pos)}</span>
          <span class="cr-p-name">${crEsc(r.next.player.name)}</span>
          <span class="cr-p-ovr"><span dir="ltr">${r.cur.player.ovr} → <strong>${r.next.player.ovr}</strong></span> ${arrow}</span>
        </div>
        <div class="cr-p-sub">${crEsc(r.oldClub)} ${move} ${pos}</div>
        ${chem}
      </label>`;
  }).join('');

  box.innerHTML = `
    ${crHeaderHTML(run)}
    <div class="cr-season-done">
      עונת ${crEsc(yearToSeason(crYear(run)))} הסתיימה במקום <strong>${last?.rank ?? '?'}</strong>
      מתוך ${last?.n ?? '?'} · ${last?.points ?? 0} נק׳${last?.champion ? ' · 🏆 אלופה!' : ''}
    </div>
    <div class="cr-intro-title cr-tw-title">🔁 חלון ההעברות — ${crEsc(yearToSeason(nextYear))}</div>
    <p class="page-note cr-tw-note">
      כך נראים השחקנים שלך בעונה הבאה, לפי מה שקרה להם באמת.
      בחר <strong>${keepMax}</strong> שיישארו — את השאר תבחר מחדש מסגלי ${crEsc(yearToSeason(nextYear))}.
    </p>
    <div class="cr-keep-count" id="cr-keep-count"></div>
    <div class="cr-players">${cards}</div>
    <button class="btn-primary btn-full" id="cr-confirm" disabled>המשך לדראפט</button>`;

  const boxes = [...box.querySelectorAll('.cr-keep-box')];
  const counter = document.getElementById('cr-keep-count');
  const confirm = document.getElementById('cr-confirm');
  const sync = () => {
    const chosen = boxes.filter(b => b.checked);
    counter.textContent = `נבחרו ${chosen.length} מתוך ${keepMax}`;
    counter.classList.toggle('full', chosen.length === keepMax);
    boxes.forEach(b => {
      const card = b.closest('.cr-p');
      const blocked = !b.checked && chosen.length >= keepMax;
      b.disabled = blocked;
      card.classList.toggle('cr-p-blocked', blocked);
      card.classList.toggle('cr-p-kept', b.checked);
    });
    confirm.disabled = chosen.length !== keepMax;
  };
  boxes.forEach(b => b.onchange = sync);
  sync();

  confirm.onclick = () => {
    const keep = boxes.filter(b => b.checked).map(b => parseInt(b.dataset.i, 10));
    crConfirmKeep(run, report, keep);
  };
}

function crConfirmKeep(run, report, keepIdxs) {
  const slots = formationSlots(run.formationId, tacticOf(run.tactic));
  const pending = new Array(slots.length).fill(null);
  keepIdxs.forEach(i => {
    const r = report[i];
    if (!r || r.gone) return;
    pending[i] = { squadId: r.next.squad.id, name: r.next.player.name };
  });
  run.seasonIdx++;
  run.phase   = 'preseason';
  run.pending = pending;
  run.squad   = null;
  crSave();
  crStartDraft();
}

/* ── the end ──────────────────────────────────────────────────────────────── */
function crRenderOver(box, run) {
  const dead = run.overReason === 'relegated';
  const best = run.history.reduce((b, h) => (!b || h.rank < b.rank ? h : b), null);
  box.innerHTML = `
    ${crHeaderHTML(run)}
    <div class="cr-over ${dead ? 'cr-over-dead' : 'cr-over-done'}">
      <div class="cr-over-title">${dead ? '💀 ירדת ליגה' : '🏁 הקריירה הושלמה'}</div>
      <div class="cr-over-sub">
        ${dead
          ? `עונת ${crEsc(yearToSeason(crYear(run)))} הסתיימה במקום ${run.history[run.history.length - 1]?.rank}. שושלת נגמרת גם ככה.`
          : `${run.history.length} עונות ב${crEsc(run.clubName)}, מ-${crEsc(yearToSeason(run.startYear))} עד ${crEsc(yearToSeason(crYear(run)))}.`}
      </div>
      <div class="cr-over-stats">
        <div><span>${run.titles}</span>אליפויות</div>
        <div><span>${run.history.length}</span>עונות</div>
        <div><span>${best ? best.rank : '—'}</span>הסיום הטוב</div>
        <div><span>${run.history.reduce((s, h) => s + h.points, 0)}</span>נקודות</div>
      </div>
    </div>
    ${crHistoryHTML(run)}
    ${crShareButtonHTML('btn-primary btn-full')}
    <div id="cr-board"></div>
    <button class="btn-secondary btn-full" id="cr-new" style="margin-top:8px">👑 קריירה חדשה</button>`;

  document.getElementById('cr-new').onclick = () => {
    crClear();
    if (typeof clearDraftState === 'function') clearDraftState();
    state.career = null;
    crRender();
  };
}

/* ── the way in ───────────────────────────────────────────────────────────── */
// Career is offered where the decision belongs — on the setup screen, the
// moment you sit down to play — rather than as another permanent nav button.
function crSyncSetupCard() {
  const sub = document.getElementById('smc-career-sub');
  const card = document.getElementById('setup-career-card');
  if (!sub || !card) return;
  const run = crRun();
  card.classList.toggle('smc-active', crHasRun() && !run.over);
  if (!crHasRun() || run.over) {
    sub.textContent = 'עשר עונות במועדון אחד — שומרים 6 שחקנים בין עונה לעונה';
    return;
  }
  const total = crTotalSeasons(run);
  sub.textContent = run.phase === 'played'
    ? `${crEsc(run.clubName)} · חלון ההעברות של ${yearToSeason(crYear(run) + 1)} מחכה`
    : `${crEsc(run.clubName)} · עונה ${Math.min(run.history.length + 1, total)} מתוך ${total} · ${run.titles} אליפויות`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setup-career-card')?.addEventListener('click', showCareer);
  document.getElementById('nav-career')?.addEventListener('click', showCareer);
});
