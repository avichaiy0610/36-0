// ─── 💰 מכירה פומבית ──────────────────────────────────────────────────────────
//
// The draft asks which of these eleven men you want. The auction asks what you
// are willing to pay, which is a different question and a harder one: the
// budget is 500 and three rivals are spending theirs on the same lots.
//
// Bids are blind and simultaneous — one decision per lot instead of a tapping
// war — and a tie goes to the human. Whatever is still empty at the end is
// filled for free with players nobody wanted, so the XI always gets to play a
// real season on the ordinary engine.

const MGA_KEY       = '36-0-mg-auction';
const MGA_BUDGET    = 500;
const MGA_FORMATION = '4-3-3';
const MGA_RIVALS    = ['מכבי הכסף', 'הפועל התקציב', 'בני המזומן'];
const MGA_LOT_BAND  = { min: 76, max: 96 };   // the lots worth bidding on
const MGA_FILL_MAX  = 70;                     // free agents are strictly worse than any lot
const MGA_RESERVE   = 18;                     // kept aside per unfilled slot — the cheapest lot costs 18
const MGA_PER_SLOT  = 3;                      // lots per slot: eleven of thirty-three have to be yours
// Rivals value a lot at the asking price give or take, and only turn up for
// some of them. Any greedier and they take the whole market: they have eleven
// slots each too, and three of them outbidding everything leaves nothing to buy.
const MGA_RIVAL_VAL = { min: 0.65, span: 0.5 };
const MGA_RIVAL_IN  = 0.55;                   // how often a rival shows up for a lot at all

function mgaState() { return mgLoad(MGA_KEY, { plays: 0, bestOvr: 0, bestSpent: 0 }); }
function mgAuctionShelfLine() {
  const s = mgaState();
  return s.plays ? `🏅 הסגל הכי טוב שבנית: ${s.bestOvr} (${s.bestSpent}/${MGA_BUDGET})` : '';
}

// Linear, and tuned against the budget: eleven players rated 84 cost 462 of the
// 500 at the asking price. So a disciplined bidder can just about buy a good
// squad, and every coin overpaid in the blind comes out of a later slot.
function mgaBase(ovr) { return Math.max(6, Math.round((ovr - 70) * 3)); }
function mgaFits(player, slotPos) {
  return typeof playerFitsSlot === 'function'
    ? playerFitsSlot(player, slotPos)
    : normalizePos(player.position) === slotPos;
}
function mgaEmptyFor(picks, slots, player) {
  return slots.map((s, i) => i).filter(i => !picks[i] && mgaFits(player, slots[i].pos));
}

/* ── the lots ─────────────────────────────────────────────────────────────── */
// Two candidates per slot, shuffled. Anything less and a formation can end up
// with a hole nobody could have bid on.
function mgaBuildLots(slots) {
  const used = new Set();
  const lots = [];
  // Best of three: the lots have to be good enough that eleven of them cost
  // about the whole budget. If the market were uniform over the band, the
  // average player would be cheap, everyone could afford everyone, and no bid
  // would ever be a decision.
  const tryDraw = (slotPos) => {
    let best = null;
    for (let i = 0, seen = 0; i < 400 && seen < 3; i++) {
      const sq = SQUADS[Math.floor(Math.random() * SQUADS.length)];
      const cands = sq.players.filter(p =>
        p.ovr >= MGA_LOT_BAND.min && p.ovr <= MGA_LOT_BAND.max &&
        !used.has(mgNorm(p.name)) && mgaFits(p, slotPos));
      if (!cands.length) continue;
      const p = cands[Math.floor(Math.random() * cands.length)];
      seen++;
      if (!best || p.ovr > best.player.ovr) best = { player: p, squad: sq, base: mgaBase(p.ovr) };
    }
    if (best) used.add(mgNorm(best.player.name));
    return best;
  };
  slots.forEach(s => { for (let k = 0; k < MGA_PER_SLOT; k++) { const l = tryDraw(s.pos); if (l) lots.push(l); } });
  return mgShuffled(lots, Math.random);
}

/* ── the run ──────────────────────────────────────────────────────────────── */
let _mgaRun = null;

function mgAuctionOpen() {
  _mgaRun = null;
  mgaRenderIntro();
}

function mgaRenderIntro() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const s = mgaState();
  box.innerHTML = `
    ${mgBackBar('מכירה פומבית')}
    <div class="mga-intro">
      <div class="mga-intro-title">💰 ${MGA_BUDGET} מטבעות. אחת עשרה משבצות.</div>
      <p class="mga-intro-text">
        אין הגרלה ואין החלפות. כל שחקן עולה למכירה בנפרד, אתה מציע סכום <strong>בעיוור</strong>,
        ושלושה יריבים מציעים באותו רגע. ההצעה הגבוהה זוכה — ותיקו נופל לטובתך.
      </p>
      <ul class="cr-rules">
        <li>💸 שילמת יותר מדי על חלוץ? זה יעלה לך בהגנה.</li>
        <li>🪑 משבצת שנשארה ריקה בסוף מתמלאת בחינם — בשחקן שאף אחד לא רצה.</li>
        <li>⚽ בסוף המכרז הסגל משחק עונה מלאה, באותו מנוע ובאותם חוקים.</li>
      </ul>
      ${s.plays ? `<div class="cr-best">🏅 הסגל הכי טוב שבנית: ${s.bestOvr} · הוצאת ${s.bestSpent}</div>` : ''}
      <button class="btn-primary btn-full" id="mga-start">פתח את המכרז ←</button>
    </div>`;
  mgWireBack();
  document.getElementById('mga-start').onclick = mgaStart;
}

function mgaStart() {
  const slots = FORMATIONS[MGA_FORMATION].slots;
  _mgaRun = {
    slots,
    picks: new Array(slots.length).fill(null),
    budget: MGA_BUDGET,
    spent: 0,
    lots: mgaBuildLots(slots),
    at: 0,
    bid: 0,
    last: null,                       // the outcome of the lot just closed
    rivals: MGA_RIVALS.map(name => ({
      name, budget: MGA_BUDGET, picks: new Array(slots.length).fill(null),
      greed: 0.85 + Math.random() * 0.45,
    })),
    over: false,
  };
  mgaRenderLot();
}

function mgaNeed(picks) { return picks.filter(p => !p).length; }

// What a bidder can spend on this lot without stranding himself: everything
// except a small reserve for each slot he still has to fill afterwards.
function mgaCeiling(budget, slotsLeft) {
  return Math.max(0, budget - Math.max(0, slotsLeft - 1) * MGA_RESERVE);
}

function mgaRivalBid(rival, lot, slots) {
  const open = mgaEmptyFor(rival.picks, slots, lot.player);
  if (!open.length) return null;
  if (Math.random() > MGA_RIVAL_IN) return null;          // not every rival wants every player
  const value = Math.round(lot.base * rival.greed * (MGA_RIVAL_VAL.min + Math.random() * MGA_RIVAL_VAL.span));
  const cap   = mgaCeiling(rival.budget, mgaNeed(rival.picks));
  const bid   = Math.min(value, cap);
  return bid > 0 ? { bid, slot: open[0] } : null;
}

/* ── one lot ──────────────────────────────────────────────────────────────── */
function mgaRenderLot() {
  const run = _mgaRun;
  const box = document.getElementById('mg-content');
  if (!run || !box) return;
  if (run.at >= run.lots.length || mgaNeed(run.picks) === 0) return mgaFinish();

  const lot = run.lots[run.at];
  const open = mgaEmptyFor(run.picks, run.slots, lot.player);
  const ceiling = Math.min(run.budget, mgaCeiling(run.budget, mgaNeed(run.picks)));
  const canBid = open.length > 0 && ceiling >= lot.base;
  if (run.bid < lot.base || run.bid > ceiling) run.bid = Math.min(Math.max(lot.base, 0), ceiling);
  const team = typeof getTeam === 'function' ? getTeam(lot.squad.teamId) : { primaryColor: '#222', secondaryColor: '#fff' };

  box.innerHTML = `
    ${mgBackBar('מכירה פומבית')}
    <div class="mga-bar">
      <span>💰 <strong>${run.budget}</strong></span>
      <span>פריט ${run.at + 1}/${run.lots.length}</span>
      <span>משבצות: <strong>${mgaNeed(run.picks)}</strong></span>
    </div>
    ${run.last ? `<div class="mga-last ${run.last.mine ? 'mine' : ''}">${mgEsc(run.last.text)}</div>` : ''}
    ${(run.skipped && run.skipped.length) ? `<div class="mga-skipped">בזמן שחיכית: ${
      run.skipped.slice(0, 3).map(t => mgEsc(t.replace(/^[✅❌] /, ''))).join(' · ')}</div>` : ''}
    <div class="mga-lot" style="--tc:${team.primaryColor};--ts:${team.secondaryColor}">
      <div class="mga-lot-top">
        <span class="mga-lot-badge">${mgBadge(lot.squad.teamId)}</span>
        <span class="mga-lot-ovr">${lot.player.ovr}</span>
      </div>
      <div class="mga-lot-name">${mgEsc(lot.player.name)}</div>
      <div class="mga-lot-meta">${mgEsc(mgClub(lot.squad.teamId))} · <span dir="ltr">${mgEsc(lot.squad.season)}</span> · ${mgEsc(normalizePos(lot.player.position))}</div>
      <div class="mga-lot-base">מחיר פתיחה: <strong>${lot.base}</strong></div>
    </div>
    ${canBid ? `
      <div class="mga-bidbox">
        <div class="mga-bid-row">
          <button class="mga-step" id="mga-minus">−</button>
          <div class="mga-bid" id="mga-bid">${run.bid}</div>
          <button class="mga-step" id="mga-plus">+</button>
        </div>
        <input type="range" id="mga-range" class="mga-range" min="${lot.base}" max="${ceiling}" value="${run.bid}">
        <div class="mga-quick">
          <button data-v="base">מחיר פתיחה</button>
          <button data-v="mid">בטוח</button>
          <button data-v="max">הכל על זה</button>
        </div>
        <button class="btn-primary btn-full" id="mga-offer">הצע ${run.bid} 💰</button>
      </div>`
    : `<div class="mga-cant">${open.length ? 'אין לך מספיק תקציב לפריט הזה' : 'אין לך משבצת מתאימה'}</div>`}
    <button class="btn-secondary btn-full" id="mga-pass">ויתור על הפריט</button>
    ${mgaSquadHTML(run)}`;

  mgWireBack();
  const bidEl = document.getElementById('mga-bid');
  const range = document.getElementById('mga-range');
  const offer = document.getElementById('mga-offer');
  const sync = v => {
    run.bid = Math.min(ceiling, Math.max(lot.base, Math.round(v)));
    if (bidEl) bidEl.textContent = run.bid;
    if (range) range.value = run.bid;
    if (offer) offer.textContent = `הצע ${run.bid} 💰`;
  };
  if (range) range.oninput = () => sync(+range.value);
  document.getElementById('mga-minus') && (document.getElementById('mga-minus').onclick = () => sync(run.bid - 5));
  document.getElementById('mga-plus')  && (document.getElementById('mga-plus').onclick  = () => sync(run.bid + 5));
  box.querySelectorAll('.mga-quick button').forEach(b => {
    b.onclick = () => sync(b.dataset.v === 'base' ? lot.base
                        : b.dataset.v === 'mid' ? lot.base * 1.35 : ceiling);
  });
  if (offer) offer.onclick = () => mgaResolve(run.bid);
  document.getElementById('mga-pass').onclick = () => mgaResolve(0);
}

function mgaSquadHTML(run) {
  const filled = run.picks.map((p, i) => ({ p, i })).filter(x => x.p);
  if (!filled.length) return '';
  return `
    <div class="section-label">הסגל שלך</div>
    <div class="mga-squad">
      ${filled.map(({ p, i }) => `
        <div class="mga-sq-row">
          <span class="mga-sq-pos">${mgEsc(run.slots[i].pos)}</span>
          <span class="mga-sq-name">${mgEsc(p.player.name)}</span>
          <span class="mga-sq-ovr">${p.player.ovr}</span>
          <span class="mga-sq-price">${p.price} 💰</span>
        </div>`).join('')}
    </div>`;
}

// Lots the human cannot touch — no compatible slot left, or not enough budget —
// are settled without asking. Otherwise the last third of the auction is a row
// of taps on players you were never allowed to buy.
function mgaAutoSkip(run) {
  const skipped = [];
  while (run.at < run.lots.length && mgaNeed(run.picks) > 0) {
    const lot = run.lots[run.at];
    const open = mgaEmptyFor(run.picks, run.slots, lot.player);
    const ceiling = Math.min(run.budget, mgaCeiling(run.budget, mgaNeed(run.picks)));
    if (open.length && ceiling >= lot.base) break;
    const out = mgaSettle(run, 0);
    if (out && !out.unsold) skipped.push(out.text);
  }
  return skipped;
}

function mgaResolve(myBid) {
  const run = _mgaRun;
  run.last = mgaSettle(run, myBid);
  run.bid = 0;
  run.skipped = mgaAutoSkip(run);
  mgaRenderLot();
}

// Settles the lot at run.at and advances. Returns what happened, without
// touching the DOM, so the auto-skip can run it in a loop.
function mgaSettle(run, myBid) {
  const lot = run.lots[run.at];
  if (!lot) return null;
  const bids = [];
  if (myBid > 0) bids.push({ who: 'me', bid: myBid });
  run.rivals.forEach(r => {
    const b = mgaRivalBid(r, lot, run.slots);
    if (b) bids.push({ who: r.name, bid: b.bid, rival: r, slot: b.slot });
  });
  // A tie goes to the human: losing a player on a coin flip you cannot see is
  // the one outcome a blind auction must not have.
  bids.sort((a, b) => b.bid - a.bid || (a.who === 'me' ? -1 : 1));
  const winner = bids[0];

  let out;
  if (!winner) {
    out = { unsold: true, mine: false, text: `${lot.player.name} — אף אחד לא הציע.` };
  } else if (winner.who === 'me') {
    const open = mgaEmptyFor(run.picks, run.slots, lot.player);
    run.picks[open[0]] = { player: lot.player, squad: lot.squad, price: winner.bid };
    run.budget -= winner.bid;
    run.spent  += winner.bid;
    const second = bids[1];
    out = { mine: true, text: `✅ ${lot.player.name} שלך תמורת ${winner.bid}${second ? ` (ההצעה הבאה: ${second.bid})` : ' — בלי מתחרים'}` };
  } else {
    winner.rival.picks[winner.slot] = { player: lot.player, squad: lot.squad };
    winner.rival.budget -= winner.bid;
    out = { mine: false, text: `❌ ${lot.player.name} הלך ל${winner.who} תמורת ${winner.bid}${myBid ? ` — הצעת ${myBid}` : ''}` };
  }
  run.at++;
  return out;
}

/* ── the end of the window ────────────────────────────────────────────────── */
// Free agents: the best player nobody would have bid on, so an empty slot is
// always a punishment and never a strategy.
function mgaFreeAgent(slotPos, taken) {
  for (let i = 0; i < 500; i++) {
    const sq = SQUADS[Math.floor(Math.random() * SQUADS.length)];
    const cands = sq.players.filter(p => p.ovr <= MGA_FILL_MAX && !taken.has(mgNorm(p.name)) && mgaFits(p, slotPos));
    if (!cands.length) continue;
    const p = cands[Math.floor(Math.random() * cands.length)];
    return { player: p, squad: sq, price: 0, free: true };
  }
  return null;
}

function mgaFinish() {
  const run = _mgaRun;
  const taken = new Set(run.picks.filter(Boolean).map(p => mgNorm(p.player.name)));
  let freebies = 0;
  run.picks.forEach((p, i) => {
    if (p) return;
    const fa = mgaFreeAgent(run.slots[i].pos, taken);
    if (fa) { run.picks[i] = fa; taken.add(mgNorm(fa.player.name)); freebies++; }
  });
  run.over = true;

  const ovr = mgaSquadOvr(run);
  const s = mgaState();
  s.plays++;
  if (ovr > s.bestOvr) { s.bestOvr = ovr; s.bestSpent = run.spent; }
  mgSave(MGA_KEY, s);

  const box = document.getElementById('mg-content');
  box.innerHTML = `
    ${mgBackBar('מכירה פומבית')}
    <div class="mga-done">
      <div class="mga-done-title">המכרז נסגר</div>
      <div class="mga-done-stats">
        <div><span>${ovr}</span>דירוג הסגל</div>
        <div><span>${run.spent}</span>הוצאת</div>
        <div><span>${run.budget}</span>נשאר</div>
        <div><span>${freebies}</span>חופשיים</div>
      </div>
      ${freebies ? `<div class="mga-done-note">${freebies} משבצות נסגרו עם שחקנים חופשיים.</div>` : ''}
    </div>
    ${mgaSquadHTML(run)}
    <button class="btn-primary btn-full" id="mga-play">⚽ שחק את העונה עם הסגל הזה</button>
    <button class="btn-secondary btn-full" id="mga-redo">🔁 מכרז חדש</button>`;
  mgWireBack();
  document.getElementById('mga-play').onclick = mgaPlaySeason;
  document.getElementById('mga-redo').onclick = mgaStart;
}

// The squad's rating on the game's own terms, without disturbing the live
// state: teamOVR reads `state`, so the XI is priced by the same weighting here.
function mgaSquadOvr(run) {
  const keepSlots = state.slots, keepPicks = state.picks;
  state.slots = run.slots;
  state.picks = run.picks;
  const ovr = teamOVR();
  state.slots = keepSlots; state.picks = keepPicks;
  return ovr;
}

function mgaPlaySeason() {
  const run = _mgaRun;
  if (!run) return;
  state.leagueCode = null; state.duelCode = null; state.gauntlet = null; state.career = null;
  state.challenge = null; state.challengeDeck = null; state.challengeReqs = null;
  state.deck = null; state.mgw = null;
  window._leagueReviewMode = null; window._duelReviewMode = null;
  window._restoredSeason = null; window._presetSeason = null;
  document.getElementById('league-review-back')?.remove();
  document.getElementById('duel-review-chrome')?.remove();

  state.difficulty = 'normal';
  state.showRatings = true;
  state.draftMode = 'squad-first';
  state.peakMode = false;
  state.eraMin = YEAR_MIN; state.eraMax = YEAR_MAX;
  state.oppSeason = null; state.oppSeasonChoice = 'latest';
  state.leagueFormat = 'modern';
  state.formationId = MGA_FORMATION;
  state.slots = run.slots;
  state.picks = run.picks.map(p => p ? { player: p.player, squad: p.squad } : null);
  state.currentRound = state.slots.length;
  state.usedSquadIds = new Set(run.picks.filter(Boolean).map(p => p.squad.id));
  state.usedPlayerKeys = new Set(run.picks.filter(Boolean).map(p => p.player.name));
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  state.isAnimating = false; state.awaitingSlotPick = false;
  state.moveMode = false; state.movingFromIdx = null;
  state.teamRerollsLeft = 0; state.seasonRerollsLeft = 0;

  if (typeof saveDraftState === 'function') saveDraftState();
  showPreseason(teamOVR());
}
