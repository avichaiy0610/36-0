// ─── ⚽ כדורדל — הוורדל של הכדורגל הישראלי ────────────────────────────────────
//
// One puzzle a day for the whole country: the same eleven clubs, dealt in the
// same order, one attempt, no rerolls. What separates two players is only who
// they took out of each squad.
//
// The share is the point. It carries no spoiler — eleven squares saying how
// good each of your picks was for the shirt you gave him, and the points the
// season came back with. Green means you took the best man available for that
// position; nobody learns who he was.
//
// It lives here rather than inside the rotating challenges on purpose: those
// have a server-side board and a fairness contract, and this one is a local
// daily that touches neither.

const MGW_KEY        = '36-0-mg-wordle';
const MGW_FORMATION  = '4-3-3';   // the same shape for everyone, or it is not the same puzzle
const MGW_EMOJI      = { best: '🟩', good: '🟨', poor: '⬜' };

function mgwState() {
  return mgLoad(MGW_KEY, { dayKey: null, done: false, points: 0, tier: '', grid: [],
                           streak: 0, best: 0, played: 0, bestPoints: 0 });
}
function mgwSave(s) { mgSave(MGW_KEY, s); }
function mgwToday() {
  const s = mgwState();
  return s.dayKey === mgDayKey() ? s : null;
}

function mgWordleShelfLine() {
  const s = mgwState();
  if (!s.played) return '';
  const today = s.dayKey === mgDayKey() && s.done ? ' · שוחק היום ✓' : '';
  return `🔥 רצף ${s.streak} · שיא ${s.best} · הכי טוב ${s.bestPoints} נק׳${today}`;
}

/* ── the deal ─────────────────────────────────────────────────────────────── */
// Eleven clubs, drawn from the whole archive by the day's seed. Deterministic,
// so two people on two phones are dealt the same thing.
function mgwDeck(key) {
  const day = key ?? mgDayKey();
  return mgShuffled(SQUADS, mgRng('kadurdle|' + day)).slice(0, 11);
}

/* ── the screen ───────────────────────────────────────────────────────────── */
function mgWordleOpen() {
  if (typeof track === 'function') track('open', 'minigame', 'wordle');
  const today = mgwToday();
  if (today && today.done) return mgwRenderResult(today);
  mgwRenderIntro();
}

function mgwRenderIntro() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const s = mgwState();
  const deck = mgwDeck();
  box.innerHTML = `
    ${mgBackBar('כדורדל')}
    <div class="mgw-head">
      <div class="mgw-title">⚽ כדורדל <span dir="ltr">#${mgDayNumber()}</span></div>
      <div class="mgw-sub">אותם 11 מועדונים, לכולם, באותו סדר. ניסיון אחד ליום.</div>
    </div>
    <div class="mgw-deck">
      ${deck.map((sq, i) => `
        <div class="mgw-deck-item">
          <span class="mgw-deck-n">${i + 1}</span>
          <span class="mgw-deck-badge">${mgBadge(sq.teamId)}</span>
          <span class="mgw-deck-club">${mgEsc(mgClub(sq.teamId))}</span>
          <span class="mgw-deck-season" dir="ltr">${mgEsc(sq.season)}</span>
        </div>`).join('')}
    </div>
    <ul class="cr-rules mgw-rules">
      <li>🎯 שחקן אחד מכל מועדון, ${MGW_FORMATION}, בלי החלפות ובלי הגרלה מחדש.</li>
      <li>🟩 ריבוע ירוק = ניצלת את העמדה — לקחת כמעט את הטוב ביותר שהיה לה בכל 11 הסגלים.</li>
      <li>📋 השיתוף לא מסגיר כלום — רק הריבועים והנקודות.</li>
    </ul>
    ${s.played ? `<div class="cr-best">🔥 רצף ${s.streak} · שיא ${s.best} · השיא שלך ${s.bestPoints} נק׳</div>` : ''}
    <button class="btn-primary btn-full" id="mgw-play">⚽ שחק את הכדורדל של היום</button>`;
  mgWireBack();
  document.getElementById('mgw-play').onclick = mgwPlay;
}

function mgwPlay() {
  const key = mgDayKey();
  state.leagueCode = null; state.duelCode = null; state.gauntlet = null; state.career = null;
  state.challenge = null; state.challengeDeck = null; state.challengeReqs = null;
  window._leagueReviewMode = null; window._duelReviewMode = null;
  window._restoredSeason = null; window._presetSeason = null;
  document.getElementById('league-review-back')?.remove();
  document.getElementById('duel-review-chrome')?.remove();

  state.mgw  = { key };
  state.deck = mgwDeck(key);
  state.difficulty  = 'normal';
  state.showRatings = true;
  state.draftMode   = 'squad-first';
  state.peakMode    = false;
  state.eraMin = YEAR_MIN; state.eraMax = YEAR_MAX;
  state.oppSeason = null; state.oppSeasonChoice = 'latest';
  state.leagueFormat = 'modern';          // the same league for everyone
  state.formationId  = MGW_FORMATION;
  beginDraftWithState();
  // one attempt means one deal: no rerolls, whatever the difficulty says
  state.teamRerollsLeft = 0; state.seasonRerollsLeft = 0;
  if (typeof updateRerollButtons === 'function') updateRerollButtons();
  if (typeof saveDraftState === 'function') saveDraftState();
}

/* ── grading the eleven ───────────────────────────────────────────────────── */
// Each shirt is graded against the best player for it ANYWHERE in the day's
// eleven squads — not against the squad you happened to spend on it.
//
// Grading inside the squad was the obvious idea and it was worthless: taking
// the highest-rated card that fits an open slot is both the obvious move and
// automatically the best one in that squad, so every grid came back eleven
// greens. Measured against the whole deal it is a different question — you get
// one player per club, so a green means you spent the right club on that shirt,
// and the greedy pick leaves ⬜ behind it somewhere else.
const MGW_GRADE = { green: 2, yellow: 7 };
function mgwFits(p, slotPos) {
  return typeof playerFitsSlot === 'function' ? playerFitsSlot(p, slotPos)
                                              : normalizePos(p.position) === slotPos;
}
function mgwBestInDeck(deck, slotPos) {
  let best = 0;
  deck.forEach(sq => sq.players.forEach(p => { if (p.ovr > best && mgwFits(p, slotPos)) best = p.ovr; }));
  return best;
}
function mgwGrid(picks, slots, deck) {
  return slots.map((slot, i) => {
    const pick = picks[i];
    if (!pick) return 'poor';
    const gap = mgwBestInDeck(deck, slot.pos) - pick.player.ovr;
    if (gap <= MGW_GRADE.green) return 'best';
    if (gap <= MGW_GRADE.yellow) return 'good';
    return 'poor';
  });
}

/* ── the season came back ─────────────────────────────────────────────────── */
function mgwOnSeasonEnd(res) {
  const btn = document.getElementById('btn-mgw-next');
  if (btn) btn.style.display = 'none';
  if (!state.mgw) return;
  if (state.leagueCode || state.duelCode || state.challenge || state.gauntlet || state.career) return;

  const s = mgwState();
  const key = state.mgw.key;
  if (!(s.dayKey === key && s.done)) {
    const grid = mgwGrid(state.picks, state.slots, state.deck || mgwDeck(key));
    const points = res.wins * 3 + res.draws;
    const yesterday = new Date(Date.UTC(...key.split('-').map((n, i) => i === 1 ? +n - 1 : +n)) - 86400000)
      .toISOString().slice(0, 10);
    const kept = s.dayKey === yesterday && s.done;    // a day missed breaks the run
    const next = {
      dayKey: key, done: true, points, grid,
      tier: (window._lastTier && typeof tierDisplay === 'function') ? tierDisplay(window._lastTier).name : '',
      rank: res.rank, ovr: res.ovr,
      streak: (kept ? s.streak : 0) + 1,
      best: s.best, played: s.played + 1,
      bestPoints: Math.max(s.bestPoints || 0, points),
    };
    next.best = Math.max(s.best, next.streak);
    mgwSave(next);
    if (typeof track === 'function') track('finish', 'minigame', 'wordle');
  }

  if (!btn) return;
  btn.style.display = '';
  btn.onclick = () => { showMiniGames(); setTimeout(() => mgwRenderResult(mgwState()), 30); };
}

function mgwGridText(grid) { return grid.map(g => MGW_EMOJI[g] ?? MGW_EMOJI.poor).join(''); }

function mgwShareText(s) {
  return `⚽ כדורדל #${mgDayNumber(s.dayKey)} — ${s.points} נק׳\n` +
         `${mgwGridText(s.grid)}\n` +
         `🔥 רצף ${s.streak}\n\nhttps://www.36-0.co.il/`;
}

function mgwRenderResult(s) {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const greens = s.grid.filter(g => g === 'best').length;
  box.innerHTML = `
    ${mgBackBar('כדורדל')}
    <div class="mgw-head">
      <div class="mgw-title">⚽ כדורדל <span dir="ltr">#${mgDayNumber(s.dayKey)}</span></div>
      <div class="mgw-sub">שיחקת היום. הכדורדל הבא נפתח בחצות.</div>
    </div>
    <div class="mgw-result">
      <div class="mgw-grid">${s.grid.map(g => `<span class="mgw-sq ${g}">${MGW_EMOJI[g]}</span>`).join('')}</div>
      <div class="mgw-result-stats">
        <div><span>${s.points}</span>נקודות</div>
        <div><span>${greens}/11</span>עמדות מנוצלות</div>
        <div><span>${s.rank ?? '—'}</span>מקום בליגה</div>
        <div><span>${s.streak}</span>רצף ימים</div>
      </div>
      ${s.tier ? `<div class="mgw-tier">${mgEsc(s.tier)}</div>` : ''}
    </div>
    <button class="btn-primary btn-full" id="mgw-share">📋 שתף תוצאה</button>
    <p class="page-note mgw-foot">השיתוף מראה רק ריבועים ונקודות — אף שם לא נחשף.</p>`;
  mgWireBack();
  const share = document.getElementById('mgw-share');
  share.onclick = () => mgShareText(mgwShareText(s), share);
}
