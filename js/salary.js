// תקרת שכר — the salary cap mode.
//
// One rule makes this mode: a player's price is EXPONENTIAL in his rating, so a
// 90 costs 9.6× what a 70 costs while being worth 1.29× his rating. One star is
// priced like nine journeymen, which turns every star into an argument with the
// rest of the XI.
//
// The budget is not a wall. You may always pick the man you want — but a squad
// over the cap cannot play, and the only way back under is to RELEASE someone
// already picked. His fee returns in full and his slot stays empty, and an empty
// slot is filled at kick-off by a free agent rated 70 or less. So the sentence
// this mode is built around is: a star costs you a starter.
//
// Budgets were calibrated against 4,000 simulated drafts on the real squad pool,
// not chosen: always-take-the-best costs a median of 30.3M, random costs 12.4M.
// Below ~12M the mode collapses into "take the cheapest"; above ~35M the cap
// never binds. See docs/superpowers/specs/2026-08-31-salary-cap-and-january-window-design.md
(function (global) {
  const BASE = 0.5;    // a 70-rated player costs half a million
  const K = 1.12;

  const BUDGETS = { easy: 30, normal: 26, hard: 22 };

  // Rounded to 0.1M so the numbers stay readable — a price nobody can hold in
  // their head is a price nobody can budget against.
  function salPrice(ovr) {
    const n = Number(ovr);
    if (!isFinite(n)) return 0;
    return Math.max(0.1, Math.round(BASE * Math.pow(K, n - 70) * 10) / 10);
  }

  // The rating a price is charged against is the rating the season is PLAYED
  // with, so peak mode costs what peak mode is worth.
  function salPriceOf(player) {
    if (!player) return 0;
    const ovr = (typeof playerOVR === 'function') ? playerOVR(player) : player.ovr;
    return salPrice(ovr);
  }

  function salBudget(difficulty) {
    return BUDGETS[difficulty] != null ? BUDGETS[difficulty] : BUDGETS.normal;
  }

  // "12.4M" reads worse than "12.4" beside a ₪ sign that is already on screen.
  function salFmt(m) {
    const n = Math.round(Number(m) * 10) / 10;
    return (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));
  }

  // picks is the game's own array: entries are {player, squad} or null.
  function salSpent(picks) {
    if (!picks || !picks.length) return 0;
    let t = 0;
    for (const p of picks) if (p && p.player) t += salPriceOf(p.player);
    return Math.round(t * 10) / 10;
  }

  function salRemaining(picks, difficulty) {
    return Math.round((salBudget(difficulty) - salSpent(picks)) * 10) / 10;
  }

  function salOverCap(picks, difficulty) {
    return salRemaining(picks, difficulty) < 0;
  }

  // Who could be released to get back under, cheapest sufficient first — the
  // list a player is shown when he has overspent.
  function salReleaseOptions(picks, difficulty) {
    const over = -salRemaining(picks, difficulty);
    if (over <= 0) return [];
    const out = [];
    picks.forEach((p, i) => {
      if (p && p.player) out.push({ idx: i, player: p.player, price: salPriceOf(p.player) });
    });
    // enough on its own first, then by price, so the cheapest fix leads
    return out.sort((a, b) => (b.price >= over) - (a.price >= over) || a.price - b.price);
  }

  global.SAL_BUDGETS = BUDGETS;
  global.salPrice = salPrice;
  global.salPriceOf = salPriceOf;
  global.salBudget = salBudget;
  global.salFmt = salFmt;
  global.salSpent = salSpent;
  global.salRemaining = salRemaining;
  global.salOverCap = salOverCap;
  global.salReleaseOptions = salReleaseOptions;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { salPrice, salBudget, salFmt, salSpent, salRemaining, salOverCap, salReleaseOptions, BUDGETS };
  }
})(typeof window !== 'undefined' ? window : globalThis);


/* ── the real rule: how many stars, not how much money ─────────────────────── */
// A pure money cap strands people. Spend early and every remaining card is
// struck through with slots still empty and no legal pick anywhere — measured
// live: 7 of 11 filled, 0.3M left, the whole list unbuyable.
//
// A quota per rating band cannot do that, and the pool is why. Every one of the
// 366 squads in the game contains at least one player rated 78-81 (100%), and
// 99% contain a 74-77. So as long as the quota only limits the bands ABOVE 78,
// a legal pick always exists — the mode can never dead-end.
//
// Where the limits sit comes from what an always-take-the-best XI actually
// draws over 3,000 drafts: a median of 1 in 90+, 3 in 86-89, 5 in 82-85 and 2
// in 78-81. A quota is only a decision if it bites just under that.
(function (global) {
  const SAL_BANDS = [
    { min: 90, key: '90',    label: '90+'   },
    { min: 86, key: '86',    label: '86-89' },
    { min: 82, key: '82',    label: '82-85' },
  ];
  // Measured over 4,000 drafts each, against an unconstrained greedy XI of 84.5:
  //   easy 2/3/4 -> 83.9    normal 1/2/3 -> 83.3    hard 0/1/2 -> 81.7
  // and zero dead-ends in all three. Hard forbids a 90+ outright, which is a
  // rule you can say in four words. Capping 78-81 as well WAS tried and is not
  // here: it strands 7 to 57 drafts per 4,000, because that band is the one
  // every squad has.
  const SAL_QUOTA = {
    easy:   { '90': 2, '86': 3, '82': 4 },
    normal: { '90': 1, '86': 2, '82': 3 },
    hard:   { '90': 0, '86': 1, '82': 2 },
  };

  function salBandKey(ovr) {
    const b = SAL_BANDS.find(x => ovr >= x.min);
    return b ? b.key : null;            // below 82 is unlimited, by design
  }
  function salQuota(difficulty) {
    return SAL_QUOTA[difficulty] || SAL_QUOTA.normal;
  }
  function salUsed(picks, key) {
    let n = 0;
    (picks || []).forEach(p => {
      if (!p || !p.player) return;
      const ovr = (typeof playerOVR === 'function') ? playerOVR(p.player) : p.player.ovr;
      if (salBandKey(ovr) === key) n++;
    });
    return n;
  }
  function salBandsState() {
    const q = salQuota(state.difficulty);
    return SAL_BANDS.map(b => ({
      key: b.key, label: b.label,
      used: salUsed(state.picks, b.key), max: q[b.key],
    }));
  }
  global.SAL_BANDS = SAL_BANDS;
  global.SAL_QUOTA = SAL_QUOTA;
  global.salBandKey = salBandKey;
  global.salQuota = salQuota;
  global.salUsed = salUsed;
  global.salBandsState = salBandsState;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── the screens ───────────────────────────────────────────────────────────── */
// Kept out of game.js on purpose: every touch point below is a no-op unless
// state.salaryCap is on, so the mode cannot change a normal draft by accident.
(function (global) {
  function salActive() {
    return typeof state !== 'undefined' && !!state.salaryCap;
  }

  // A player costs more than what is left. The draft refuses him rather than
  // letting the squad end over the cap.
  function salTooDear(player) {
    if (!salActive() || !player) return false;
    const ovr = (typeof playerOVR === 'function') ? playerOVR(player) : player.ovr;
    const key = salBandKey(ovr);
    if (!key) return false;                    // below 82 is never blocked
    return salUsed(state.picks, key) >= salQuota(state.difficulty)[key];
  }

  // The chip that rides on a player card in the draft list.
  function salChip(player) {
    if (!salActive() || !player) return '';
    const p = salPriceOf(player);
    const left = salRemaining(state.picks, state.difficulty);
    const cls = p > left ? ' sal-chip-over' : '';
    return `<span class="sal-chip${cls}">₪${salFmt(p)}מ׳</span>`;
  }

  // The budget bar under the draft progress.
  function salSyncBar() {
    const bar = document.getElementById('sal-bar');
    if (!bar) return;
    if (!salActive()) { bar.style.display = 'none'; return; }
    const total = salBudget(state.difficulty);
    const left = salRemaining(state.picks, state.difficulty);
    const spent = salSpent(state.picks);
    bar.style.display = 'block';
    bar.classList.toggle('sal-busted', left < 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    // Money is reported, never enforced — the quota is the rule, so the wallet
    // can no longer strand anyone with empty slots and nothing legal to pick.
    set('sal-left', salFmt(spent));
    set('sal-total', salFmt(total));
    const lbl = document.querySelector('#sal-bar .sal-label');
    if (lbl) lbl.textContent = salSwapsLeft() ? 'סגל' : 'סגל · ההחלפה נוצלה';
    const fill = document.getElementById('sal-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, (spent / total) * 100)) + '%';
    const q = document.getElementById('sal-quota');
    if (q) q.innerHTML = salBandsState().map(b =>
      `<span class="sal-q${b.used >= b.max ? ' sal-q-full' : ''}">${b.label}` +
      `<b>${b.used}/${b.max}</b></span>`).join('');

    // ONE swap per run. It is not a recovery from overspending — that cannot
    // happen any more — it is the single chance to change your mind.
    const over = document.getElementById('sal-over');
    if (!over) return;
    const picked = state.picks.filter(Boolean).length;
    const swaps = salSwapsLeft();
    if (!swaps || !picked || state.salSwapOpen !== true) {
      over.innerHTML = swaps && picked
        ? `<button class="sal-swap-btn" id="sal-swap-open">🔄 החלפה אחת נותרה</button>`
        : '';
      over.style.display = over.innerHTML ? 'block' : 'none';
      return;
    }
    over.style.display = 'block';
    const opts = state.picks
      .map((p, i) => (p ? { idx: i, player: p.player, price: salPriceOf(p.player) } : null))
      .filter(Boolean)
      .sort((a, b) => b.price - a.price);
    over.innerHTML =
      `<div class="sal-over-t">שחרר שחקן — הכסף חוזר והעמדה נפתחת מחדש</div>` +
      opts.map(o =>
        `<button class="sal-rel" data-idx="${o.idx}">` +
        `${o.player.name} <span>₪${salFmt(o.price)}מ׳</span></button>`).join('') +
      `<button class="sal-swap-btn" id="sal-swap-cancel">ביטול</button>`;
  }

  function salSwapsLeft() {
    if (typeof state === 'undefined') return 0;
    return state.salSwaps == null ? 1 : state.salSwaps;
  }

  // Releasing empties the slot. It is NOT re-drafted — at kick-off an empty slot
  // is filled by a free agent, which is what makes a star cost a starter.
  function salRelease(idx) {
    if (!salActive() || !state.picks[idx]) return;
    const p = state.picks[idx];
    // the best man a release let go, for the "sold the star" award
    const ovr = (typeof playerOVR === 'function') ? playerOVR(p.player) : p.player.ovr;
    state.salSoldOvr = Math.max(state.salSoldOvr || 0, ovr || 0);
    state.usedPlayerKeys.delete(p.player.name);
    state.picks[idx] = null;
    state.salSwaps = salSwapsLeft() - 1;
    state.salSwapOpen = false;
    // Give the round back. Without this the draft still believed it was on
    // round 11 of 11, so the freed position never came round again and the only
    // way to use it was to move another player into it.
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

  global.salActive = salActive;
  global.salChip = salChip;
  global.salTooDear = salTooDear;
  global.salSwapsLeft = salSwapsLeft;
  global.salSyncBar = salSyncBar;
  global.salRelease = salRelease;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── free agents ───────────────────────────────────────────────────────────── */
// The reason a released slot is a punishment and not a trick. teamOVR is an
// AVERAGE, so an empty slot quietly RAISES the team's rating — releasing your
// weakest man would have made the side better, which is the exact opposite of
// what this mode is for. A free agent rated 70 or less closes the slot and puts
// the cost back where it belongs. The same idea, and the same ceiling, as
// mg-auction.js: "an empty slot is always a punishment and never a strategy".
(function (global) {
  const SAL_FREE_MAX = 70;

  function salFreeAgent(slotPos, taken) {
    if (typeof SQUADS === 'undefined') return null;
    for (let i = 0; i < 500; i++) {
      const sq = SQUADS[Math.floor(Math.random() * SQUADS.length)];
      if (!sq || !sq.players) continue;
      const cands = sq.players.filter(p =>
        p.ovr <= SAL_FREE_MAX &&
        !taken.has(p.name) &&
        (typeof playerFitsSlot !== 'function' || playerFitsSlot(p, slotPos)));
      if (!cands.length) continue;
      return { player: cands[Math.floor(Math.random() * cands.length)], squad: sq, free: true };
    }
    return null;
  }

  // Called once, when the draft ends. Returns the names signed, for the report.
  function salFillEmptySlots() {
    if (!salActive() || typeof state === 'undefined') return [];
    const taken = new Set(state.picks.filter(Boolean).map(p => p.player.name));
    const signed = [];
    state.picks.forEach((pick, i) => {
      if (pick) return;
      const slot = state.slots[i];
      const fa = salFreeAgent(slot ? slot.pos : null, taken);
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

  // What the results screen says about the money.
  function salWageLine() {
    if (!salActive() || typeof state === 'undefined') return '';
    const spent = salSpent(state.picks.filter(p => p && !p.free));
    const free = state.picks.filter(p => p && p.free).length;
    return `💰 שכר ההרכב: ₪${salFmt(spent)}מ׳ מתוך ₪${salFmt(salBudget(state.difficulty))}מ׳` +
      (free ? ` · ${free} ${free === 1 ? 'שחקן חופשי' : 'שחקנים חופשיים'}` : '');
  }

  global.SAL_FREE_MAX = SAL_FREE_MAX;
  global.salFreeAgent = salFreeAgent;
  global.salFillEmptySlots = salFillEmptySlots;
  global.salWageLine = salWageLine;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── awarding ──────────────────────────────────────────────────────────────── */
// Fired once when a capped season is rendered. Every number is clamped again on
// the server — this call cannot claim a budget it never had.
(function (global) {
  function salAward(r) {
    if (!salActive() || !r) return;
    if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
    if (typeof _supabase === 'undefined' || !_supabase) return;
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
  global.salAward = salAward;
})(typeof window !== 'undefined' ? window : globalThis);
