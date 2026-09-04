// ─── 💰 מכירה פומבית ──────────────────────────────────────────────────────────
//
// The draft asks which of these eleven men you want. The auction asks what you
// are willing to pay, which is a different question and a harder one: the
// budget is 500 and three rivals are spending theirs on the same lots.
//
// It is an ASCENDING auction with a maximum, the way a real one works. You name
// the most you would pay; the lot climbs while people are still willing; and the
// moment somebody goes past your maximum you are told who, and asked whether to
// come back over the top or let him have it. The rivals do the same to each
// other, so a player you never bid on is still fought over.
//
// The price is settled the way an ascending auction settles: the highest
// maximum wins, and pays one step above the second-highest — so bidding your
// true maximum is safe, and a lot nobody else wants goes for the asking price.
// A tie goes to the human. Whatever is still empty at the end is filled for free
// with players nobody wanted, so the XI always gets to play a real season.

const MGA_KEY       = '36-0-mg-auction';
const MGA_BUDGET    = 500;
const MGA_FORMATION = '4-3-3';
const MGA_RIVALS    = ['נשיא המועדון', 'מני מזומני', 'בני המזומן'];
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
  if (typeof track === 'function') track('open', 'minigame', 'auction');
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
    outbid: null,                     // a lot still open, waiting on your answer
    vals: null,                       // what the rivals will pay for the open lot
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

// What each rival would pay for THIS lot, at most. Rolled once when the lot
// opens and then fixed — a valuation that moved every round would mean a rival
// could beat any number you named, which is not an auction, it is a wall.
function mgaValuations(run, lot) {
  return run.rivals.map(rival => {
    const open = mgaEmptyFor(rival.picks, run.slots, lot.player);
    if (!open.length) return { rival, slot: -1, max: 0 };
    if (Math.random() > MGA_RIVAL_IN) return { rival, slot: open[0], max: 0 };
    const value = Math.round(lot.base * rival.greed * (MGA_RIVAL_VAL.min + Math.random() * MGA_RIVAL_VAL.span));
    const cap   = mgaCeiling(rival.budget, mgaNeed(rival.picks));
    return { rival, slot: open[0], max: Math.max(0, Math.min(value, cap)) };
  });
}

// The step the room climbs in. Small money moves in small money.
function mgaStep(price) { return Math.max(2, Math.round(price * 0.08)); }

// Settle the room at the maximums on the table. Highest maximum takes it, one
// step above the second — capped by his own maximum, because nobody pays more
// than he was willing to. Ties go to the human.
function mgaSettleRoom(lot, myMax, vals) {
  const table = vals.filter(v => v.max >= lot.base).map(v => ({ who: v.rival.name, max: v.max, v }));
  if (myMax >= lot.base) table.push({ who: 'me', max: myMax, mine: true, v: null });
  if (!table.length) return { unsold: true };
  table.sort((a, b) => b.max - a.max || (a.mine ? -1 : b.mine ? 1 : 0));
  const win = table[0], next = table[1];
  const price = next ? Math.min(win.max, next.max + mgaStep(next.max)) : lot.base;
  return { win, next, price: Math.max(lot.base, price), table };
}

/* ── one lot ──────────────────────────────────────────────────────────────── */
// Who you are bidding against, and the only two things about them that decide
// whether they can take a lot off you: what is left in their pocket and how many
// holes they still have to fill. A rival with 40 coins and six slots cannot
// outbid you here, and knowing that is the whole game — the blind part is the
// BID, not the identity of the man across the table. Their appetite (`greed`)
// stays hidden, which is what keeps any single lot a guess.
function mgaRivalsHTML(run) {
  if (!run.rivals || !run.rivals.length) return '';
  return `<div class="mga-rivals">
    <div class="mga-rivals-t">מולך במכרז</div>
    <div class="mga-rivals-row">${run.rivals.map(r => {
      const need = mgaNeed(r.picks);
      const spent = done => done ? ' mga-rival-out' : '';
      const out = need === 0 || r.budget < 1;
      return `<span class="mga-rival${spent(out)}">
        <b>${mgEsc(r.name)}</b>
        <i>${out ? 'סיים' : '💰 ' + r.budget + ' · ' + need + ' משבצות'}</i>
      </span>`;
    }).join('')}</div>
  </div>`;
}

function mgaRenderLot() {
  const run = _mgaRun;
  const box = document.getElementById('mg-content');
  if (!run || !box) return;
  if (run.at >= run.lots.length || mgaNeed(run.picks) === 0) return mgaFinish();

  const lot = run.lots[run.at];
  const open = mgaEmptyFor(run.picks, run.slots, lot.player);
  const ceiling = Math.min(run.budget, mgaCeiling(run.budget, mgaNeed(run.picks)));
  // Once the room has started climbing, the floor is the price to beat.
  const floor = run.outbid ? run.outbid.next : lot.base;
  const canBid = open.length > 0 && ceiling >= floor;
  if (run.bid < floor || run.bid > ceiling) run.bid = Math.min(Math.max(floor, 0), ceiling);
  const team = typeof getTeam === 'function' ? getTeam(lot.squad.teamId) : { primaryColor: '#222', secondaryColor: '#fff' };

  box.innerHTML = `
    ${mgBackBar('מכירה פומבית')}
    <div class="mga-bar">
      <span>💰 <strong>${run.budget}</strong></span>
      <span>פריט ${run.at + 1}/${run.lots.length}</span>
      <span>משבצות: <strong>${mgaNeed(run.picks)}</strong></span>
    </div>
    ${mgaRivalsHTML(run)}
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
    ${run.outbid ? `
      <div class="mga-outbid">
        <div class="mga-outbid-who">🔨 <strong>${mgEsc(run.outbid.by)}</strong> הציע <strong>${run.outbid.price}</strong></div>
        <div class="mga-outbid-sub">עברת את התקרה שלך. להחזיר?</div>
      </div>` : ''}
    ${canBid ? `
      <div class="mga-bidbox">
        <div class="mga-bid-row">
          <button class="mga-step" id="mga-minus">−</button>
          <div class="mga-bid" id="mga-bid">${run.bid}</div>
          <button class="mga-step" id="mga-plus">+</button>
        </div>
        <input type="range" id="mga-range" class="mga-range" min="${floor}" max="${ceiling}" value="${run.bid}">
        <div class="mga-quick">
          <button data-v="base">${run.outbid ? 'צעד אחד' : 'מחיר פתיחה'}</button>
          <button data-v="mid">בטוח</button>
          <button data-v="max">הכל על זה</button>
        </div>
        <button class="btn-primary btn-full" id="mga-offer">${
          run.outbid ? `העלה ל-${run.bid} 💰` : `הצע עד ${run.bid} 💰`}</button>
      </div>`
    : `<div class="mga-cant">${open.length ? 'אין לך מספיק תקציב לפריט הזה' : 'אין לך משבצת מתאימה'}</div>`}
    <button class="btn-secondary btn-full" id="mga-pass">${
      run.outbid ? 'שיהיה לו — ויתור' : 'ויתור על הפריט'}</button>
    ${mgaSquadHTML(run)}`;

  mgWireBack();
  const bidEl = document.getElementById('mga-bid');
  const range = document.getElementById('mga-range');
  const offer = document.getElementById('mga-offer');
  const sync = v => {
    run.bid = Math.min(ceiling, Math.max(floor, Math.round(v)));
    if (bidEl) bidEl.textContent = run.bid;
    if (range) range.value = run.bid;
    if (offer) offer.textContent = run.outbid ? `העלה ל-${run.bid} 💰` : `הצע עד ${run.bid} 💰`;
  };
  if (range) range.oninput = () => sync(+range.value);
  document.getElementById('mga-minus') && (document.getElementById('mga-minus').onclick = () => sync(run.bid - 5));
  document.getElementById('mga-plus')  && (document.getElementById('mga-plus').onclick  = () => sync(run.bid + 5));
  box.querySelectorAll('.mga-quick button').forEach(b => {
    b.onclick = () => sync(b.dataset.v === 'base' ? floor
                        : b.dataset.v === 'mid' ? floor * 1.35 : ceiling);
  });
  if (offer) offer.onclick = () => mgaResolve(run.bid);
  document.getElementById('mga-pass').onclick = () => (run.outbid ? mgaConcede() : mgaResolve(0));
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

function mgaResolve(myMax) {
  const run = _mgaRun;
  const out = mgaSettle(run, myMax);
  // Not a result — a question. Hold the lot open and let him answer it.
  if (out && out.outbid) {
    run.outbid = out;
    run.bid = out.next;
    mgaRenderLot();
    return;
  }
  run.outbid = null;
  run.last = out;
  run.bid = 0;
  run.skipped = mgaAutoSkip(run);
  mgaRenderLot();
}

// Walking away from a lot you were beaten on: the room finishes without you.
function mgaConcede() {
  const run = _mgaRun;
  run.outbid = null;
  run.last = mgaSettle(run, 0);
  run.bid = 0;
  run.skipped = mgaAutoSkip(run);
  mgaRenderLot();
}

// Settles the lot at run.at against the maximum the human has named. Either it
// closes — he wins it, or somebody outbid him and it is gone — or it comes back
// as `outbid`, which is not a result but a question: this man has gone past you,
// do you want him at one step more? Nothing is committed until it closes.
function mgaSettle(run, myMax) {
  const lot = run.lots[run.at];
  if (!lot) return null;
  if (!run.vals) run.vals = mgaValuations(run, lot);

  const r = mgaSettleRoom(lot, myMax, run.vals);

  if (r.unsold) {
    run.at++; run.vals = null;
    return { unsold: true, mine: false, text: `${lot.player.name} — אף אחד לא הציע.` };
  }

  // Beaten, and still able to answer: ask rather than settle.
  if (!r.win.mine) {
    const step = mgaStep(r.price);
    const ceiling = Math.min(run.budget, mgaCeiling(run.budget, mgaNeed(run.picks)));
    const canAnswer = mgaEmptyFor(run.picks, run.slots, lot.player).length > 0
      && r.price + step <= ceiling;
    if (canAnswer && myMax >= lot.base) {
      return { outbid: true, by: r.win.who, price: r.price, next: r.price + step, ceiling };
    }
  }

  // Closing.
  run.vals = null;
  if (r.win.mine) {
    const open = mgaEmptyFor(run.picks, run.slots, lot.player);
    run.picks[open[0]] = { player: lot.player, squad: lot.squad, price: r.price };
    run.budget -= r.price;
    run.spent  += r.price;
    const under = r.next ? ` (${r.next.who} עצר ב-${r.next.max})` : ' — בלי מתחרים';
    run.at++;
    return { mine: true, text: `✅ ${lot.player.name} שלך תמורת ${r.price}${under}` };
  }
  const w = r.win.v;
  w.rival.picks[w.slot] = { player: lot.player, squad: lot.squad };
  w.rival.budget -= r.price;
  run.at++;
  return { mine: false, text: `❌ ${lot.player.name} הלך ל${r.win.who} תמורת ${r.price}${
    myMax >= lot.base ? ` — עצרת ב-${myMax}` : ''}` };
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
  if (typeof track === 'function') track('finish', 'minigame', 'auction');
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
  // Two flags that decide what the SEASON contains, set here rather than
  // inherited. Both modes clear challenge/league/gauntlet, which is exactly what
  // cupEligible() and janEligible() test — so the cup was already running here
  // by accident, and whether a January window opened depended on the mode played
  // BEFORE this one. That is the "a field nobody sets is a field that carries
  // over" trap beginDraftWithState warns about, and it made a daily
  // non-deterministic. Now it is a decision: the cup YES (a one-shot XI gets a
  // cup run too, and "דלג" plays it out silently for anyone in a hurry), the
  // January window NO — a transfer window is the opposite of one attempt.
  state.januaryOn = false;

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
