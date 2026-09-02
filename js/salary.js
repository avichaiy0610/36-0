// תקרת שכר — the salary cap mode.
//
// Third design, and the first that survives contact. What the two before it got
// wrong is worth keeping written down:
//
//   1. An exponential price on every player. It BOUND, but it stranded people:
//      spend early and every remaining card is unaffordable while slots are
//      still empty. Seen live — 7 of 11 filled, 0.3M left, nothing legal.
//   2. A quota per rating band. It could not strand anyone, but it did not bind
//      either: 90+ is 0.4% of the pool, so capping it almost never matters, and
//      the bands never traded against each other — max out all three and you
//      still have a dream team.
//
// This one is a budget that only charges for STARS, and the pool is what makes
// it safe: all 366 squads contain a player rated 81 or under, so a zero-cost
// pick always exists and the XI can always be finished. Measured: zero
// dead-ends at every budget from 8 to 40, 4,000 drafts each.
//
//   90+     ₪8מ׳        86-89  ₪5מ׳
//   82-85   ₪3מ׳        ≤81    free — a squad player on a basic contract
//
// An unconstrained always-take-the-best XI costs a median of 36, so every
// budget below that is a real decision:
//   easy 28 -> XI 83.5, six players 82+   normal 20 -> 82.6, five   hard 12 -> 81.7, three
(function (global) {
  const SAL_BUDGETS = { easy: 28, normal: 20, hard: 12 };

  // A step curve, not a formula: the player has to hold it in his head while
  // deciding, and "the 90 costs eight" is a thing you can remember.
  const SAL_TIERS = [
    { min: 90, cost: 8, label: '90+' },
    { min: 86, cost: 5, label: '86-89' },
    { min: 82, cost: 3, label: '82-85' },
    { min: 0,  cost: 0, label: '81 ומטה' },
  ];

  function salPrice(ovr) {
    const n = Number(ovr);
    if (!isFinite(n)) return 0;
    return SAL_TIERS.find(t => n >= t.min).cost;
  }
  // Charged on the rating the season is PLAYED with, so peak mode costs what
  // peak mode is worth.
  function salPriceOf(player) {
    if (!player) return 0;
    const ovr = (typeof playerOVR === 'function') ? playerOVR(player) : player.ovr;
    return salPrice(ovr);
  }
  function salBudget(difficulty) {
    return SAL_BUDGETS[difficulty] != null ? SAL_BUDGETS[difficulty] : SAL_BUDGETS.normal;
  }
  function salSpent(picks) {
    let t = 0;
    (picks || []).forEach(p => { if (p && p.player) t += salPriceOf(p.player); });
    return t;
  }
  function salRemaining(picks, difficulty) {
    return salBudget(difficulty) - salSpent(picks);
  }
  function salFmt(m) { return String(Math.round(Number(m) || 0)); }

  global.SAL_BUDGETS = SAL_BUDGETS;
  global.SAL_TIERS = SAL_TIERS;
  global.salPrice = salPrice;
  global.salPriceOf = salPriceOf;
  global.salBudget = salBudget;
  global.salSpent = salSpent;
  global.salRemaining = salRemaining;
  global.salFmt = salFmt;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { salPrice, salBudget, salSpent, salRemaining, SAL_BUDGETS, SAL_TIERS };
  }
})(typeof window !== 'undefined' ? window : globalThis);

/* ── the screens ───────────────────────────────────────────────────────────── */
// Every touch point here is a no-op unless state.salaryCap is on, so the mode
// cannot change a normal draft by accident.
(function (global) {
  const SAL_FREE_MAX = 70;      // what a released slot is closed with

  function salActive() {
    return typeof state !== 'undefined' && !!state.salaryCap;
  }

  // Enforced, unlike the money in the previous design: a man you cannot pay for
  // cannot be picked, so a draft cannot end over the cap. A free player is never
  // blocked, which is what guarantees a legal pick every round.
  function salTooDear(player) {
    if (!salActive() || !player) return false;
    const price = salPriceOf(player);
    if (price === 0) return false;
    return price > salRemaining(state.picks, state.difficulty);
  }

  function salChip(player) {
    if (!salActive() || !player) return '';
    const p = salPriceOf(player);
    if (p === 0) return '<span class="sal-chip sal-chip-free">חופשי</span>';
    const cls = salTooDear(player) ? ' sal-chip-over' : '';
    return `<span class="sal-chip${cls}">₪${salFmt(p)}מ׳</span>`;
  }

  function salSwapsLeft() {
    if (typeof state === 'undefined') return 0;
    return state.salSwaps == null ? 1 : state.salSwaps;
  }

  function salSyncBar() {
    const bar = document.getElementById('sal-bar');
    if (!bar) return;
    if (!salActive()) { bar.style.display = 'none'; return; }
    const total = salBudget(state.difficulty);
    const spent = salSpent(state.picks);
    const left = total - spent;
    bar.style.display = 'block';
    bar.classList.toggle('sal-busted', left <= 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sal-left', salFmt(left));
    set('sal-total', salFmt(total));
    const lbl = document.querySelector('#sal-bar .sal-label');
    if (lbl) lbl.textContent = salSwapsLeft() ? 'תקציב' : 'תקציב · ההחלפה נוצלה';
    const fill = document.getElementById('sal-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, (spent / total) * 100)) + '%';

    // the price list, so the trade is legible without a tutorial
    const q = document.getElementById('sal-quota');
    if (q) q.innerHTML = SAL_TIERS.map(t =>
      `<span class="sal-q${t.cost && t.cost > left ? ' sal-q-full' : ''}">${t.label}` +
      `<b>${t.cost ? '₪' + t.cost + 'מ׳' : 'חופשי'}</b></span>`).join('');

    const over = document.getElementById('sal-over');
    if (!over) return;
    const picked = state.picks.filter(Boolean).length;
    const swaps = salSwapsLeft();
    if (!swaps || !picked || state.salSwapOpen !== true) {
      over.innerHTML = swaps && picked
        ? '<button class="sal-swap-btn" id="sal-swap-open">🔄 החלפה אחת נותרה</button>' : '';
      over.style.display = over.innerHTML ? 'block' : 'none';
      return;
    }
    over.style.display = 'block';
    const opts = state.picks
      .map((p, i) => (p ? { idx: i, player: p.player, price: salPriceOf(p.player) } : null))
      .filter(Boolean).sort((a, b) => b.price - a.price);
    over.innerHTML =
      '<div class="sal-over-t">שחרר שחקן — הכסף חוזר והעמדה נפתחת מחדש</div>' +
      opts.map(o => `<button class="sal-rel" data-idx="${o.idx}">${o.player.name} ` +
        `<span>${o.price ? '₪' + salFmt(o.price) + 'מ׳' : 'חופשי'}</span></button>`).join('') +
      '<button class="sal-swap-btn" id="sal-swap-cancel">ביטול</button>';
  }

  // ONE swap per run. It is not a recovery from overspending — that cannot
  // happen — it is the single chance to change your mind.
  function salRelease(idx) {
    if (!salActive() || !state.picks[idx]) return;
    state.usedPlayerKeys.delete(state.picks[idx].player.name);
    const ovr = (typeof playerOVR === 'function')
      ? playerOVR(state.picks[idx].player) : state.picks[idx].player.ovr;
    state.salSoldOvr = Math.max(state.salSoldOvr || 0, ovr || 0);
    state.picks[idx] = null;
    state.salSwaps = salSwapsLeft() - 1;
    state.salSwapOpen = false;
    // Give the round back, or the freed position never comes round again and
    // the only way to use it is to move another player into it.
    if (typeof state.currentRound === 'number' && state.currentRound > 0) state.currentRound--;
    if (typeof saveDraftState === 'function') saveDraftState();
    if (typeof refreshAllTokens === 'function') refreshAllTokens();
    if (typeof updateDraftOVR === 'function') updateDraftOVR();
    salSyncBar();
    if (typeof startRound === 'function') setTimeout(() => startRound(), 250);
  }

  document.addEventListener('click', ev => {
    if (!ev.target.closest) return;
    if (ev.target.closest('#sal-swap-open'))   { ev.preventDefault(); state.salSwapOpen = true;  salSyncBar(); return; }
    if (ev.target.closest('#sal-swap-cancel')) { ev.preventDefault(); state.salSwapOpen = false; salSyncBar(); return; }
    const b = ev.target.closest('.sal-rel');
    if (!b) return;
    ev.preventDefault();
    salRelease(+b.dataset.idx);
  });

  /* ── free agents ─────────────────────────────────────────────────────────── */
  // teamOVR is an AVERAGE, so an empty slot would RAISE the rating and releasing
  // your weakest man would be a free upgrade. The same device and ceiling as
  // mg-auction.js: an empty slot is always a punishment, never a strategy.
  function salFreeAgent(slotPos, taken) {
    if (typeof SQUADS === 'undefined') return null;
    for (let i = 0; i < 500; i++) {
      const sq = SQUADS[Math.floor(Math.random() * SQUADS.length)];
      if (!sq || !sq.players) continue;
      const cands = sq.players.filter(p =>
        p.ovr <= SAL_FREE_MAX && !taken.has(p.name) &&
        (typeof playerFitsSlot !== 'function' || playerFitsSlot(p, slotPos)));
      if (cands.length) return { player: cands[Math.floor(Math.random() * cands.length)], squad: sq, free: true };
    }
    return null;
  }

  function salFillEmptySlots() {
    if (!salActive() || typeof state === 'undefined') return [];
    const taken = new Set(state.picks.filter(Boolean).map(p => p.player.name));
    const signed = [];
    state.picks.forEach((pick, i) => {
      if (pick) return;
      const fa = salFreeAgent(state.slots[i] ? (typeof slotFitPos === 'function' ? slotFitPos(state.slots[i]) : state.slots[i].pos) : null, taken);
      if (!fa) return;
      state.picks[i] = fa;
      taken.add(fa.player.name);
      if (state.usedPlayerKeys) state.usedPlayerKeys.add(fa.player.name);
      if (typeof fillToken === 'function') fillToken(i, fa.player, fa.squad);
      signed.push(fa.player.name);
    });
    if (signed.length && typeof saveDraftState === 'function') saveDraftState();
    return signed;
  }

  function salWageLine() {
    if (!salActive() || typeof state === 'undefined') return '';
    const spent = salSpent(state.picks.filter(p => p && !p.free));
    const free = state.picks.filter(p => p && p.free).length;
    return `💰 שכר ההרכב: ₪${salFmt(spent)}מ׳ מתוך ₪${salFmt(salBudget(state.difficulty))}מ׳` +
      (free ? ` · ${free} ${free === 1 ? 'שחקן חופשי' : 'שחקנים חופשיים'}` : '');
  }

  /* ── awarding ────────────────────────────────────────────────────────────── */
  function salAward(r) {
    if (!salActive() || !r) return;
    // The mode tracked its opens and not its finishes, so the admin panel read
    // "19 opened, 0 finished" while nineteen seasons sat on the board. Signed
    // out too — most of the game is played without an account.
    if (typeof track === 'function') {
      track('finish', 'salarycap', state.difficulty || 'normal');
    }
    if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
    if (typeof _supabase === 'undefined' || !_supabase) return;
    // The board. Points are recomputed server-side from W/D/L, so this is a
    // report of what happened rather than a claim about where it ranks.
    try {
      _supabase.rpc('submit_salary_run', {
        p: {
          difficulty: state.difficulty,
          budget: salBudget(state.difficulty),
          spent: salSpent(state.picks.filter(x => x && !x.free)),
          free_agents: state.picks.filter(x => x && x.free).length,
          ovr: (typeof teamOVR === 'function' ? teamOVR() : 0),
          wins: r.wins | 0, draws: r.draws | 0, losses: r.losses | 0,
          gf: r.gfTotal | 0, ga: r.gaTotal | 0,
        },
      }).then(() => {}, () => {});
    } catch (e) { /* a board never breaks the results screen */ }
    try {
      _supabase.rpc('award_salary_achievements', {
        p: {
          budget: salBudget(state.difficulty),
          spent: salSpent(state.picks.filter(x => x && !x.free)),
          wins: r.wins | 0, draws: r.draws | 0, losses: r.losses | 0,
          champion: r.myRank === 1,
          sold_ovr: state.salSoldOvr || 0,
        },
      }).then(() => {}, () => {});
    } catch (e) { /* an award never breaks the results screen */ }
  }

  global.SAL_FREE_MAX = SAL_FREE_MAX;
  global.salActive = salActive;
  global.salTooDear = salTooDear;
  global.salChip = salChip;
  global.salSwapsLeft = salSwapsLeft;
  global.salSyncBar = salSyncBar;
  global.salRelease = salRelease;
  global.salFreeAgent = salFreeAgent;
  global.salFillEmptySlots = salFillEmptySlots;
  global.salWageLine = salWageLine;
  global.salAward = salAward;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── the review, before the whistle ────────────────────────────────────────── */
// A complete XI used to go straight into the season. But the one swap is only
// worth anything once all eleven are on the pitch together — that is when you
// can see the hole, not while the roulette is still spinning. So the run stops
// here and asks.
(function (global) {
  function salReviewEl() { return document.getElementById('sal-review'); }

  function salShowReview() {
    const box = salReviewEl();
    if (!box) { if (typeof showPreseason === 'function') showPreseason(teamOVR()); return; }
    const spent = salSpent(state.picks.filter(p => p && !p.free));
    const total = salBudget(state.difficulty);
    const free = state.picks.filter(p => p && p.free).length;
    const sub = document.getElementById('sal-review-sub');
    if (sub) sub.textContent =
      `דירוג ${teamOVR()} · ₪${salFmt(spent)}מ׳ מתוך ₪${salFmt(total)}מ׳` +
      (free ? ` · ${free} ${free === 1 ? 'שחקן חופשי' : 'שחקנים חופשיים'}` : '');

    const swapBox = document.getElementById('sal-review-swap');
    if (swapBox) {
      if (!salSwapsLeft()) {
        swapBox.innerHTML = '<div class="sal-review-none">ההחלפה שלך כבר נוצלה</div>';
      } else {
        const opts = state.picks
          .map((p, i) => (p ? { idx: i, player: p.player, price: salPriceOf(p.player) } : null))
          .filter(Boolean).sort((a, b) => b.price - a.price);
        swapBox.innerHTML =
          '<div class="sal-review-t">נותרה לך החלפה אחת — שחרר מישהו והעמדה תיפתח מחדש</div>' +
          '<div class="sal-review-list">' + opts.map(o =>
            `<button class="sal-rel" data-idx="${o.idx}">${o.player.name} ` +
            `<span>${o.price ? '₪' + salFmt(o.price) + 'מ׳' : 'חופשי'}</span></button>`).join('') +
          '</div>';
      }
    }
    box.style.display = 'flex';
  }

  function salHideReview() {
    const box = salReviewEl();
    if (box) box.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const go = document.getElementById('sal-review-go');
    if (go) go.addEventListener('click', () => {
      salHideReview();
      if (typeof showPreseason === 'function') showPreseason(teamOVR());
    });
  });

  // A release from inside the review closes it: salRelease already hands the
  // round back and restarts the draft, and the review will open again when the
  // eleven are complete a second time.
  document.addEventListener('click', ev => {
    if (!ev.target.closest) return;
    if (!ev.target.closest('#sal-review .sal-rel')) return;
    salHideReview();
  }, true);

  global.salShowReview = salShowReview;
  global.salHideReview = salHideReview;
})(typeof window !== 'undefined' ? window : globalThis);
