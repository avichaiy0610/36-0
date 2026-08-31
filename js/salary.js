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

/* ── the screens ───────────────────────────────────────────────────────────── */
// Kept out of game.js on purpose: every touch point below is a no-op unless
// state.salaryCap is on, so the mode cannot change a normal draft by accident.
(function (global) {
  function salActive() {
    return typeof state !== 'undefined' && !!state.salaryCap;
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
    set('sal-left', salFmt(left));
    set('sal-total', salFmt(total));
    const fill = document.getElementById('sal-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, (spent / total) * 100)) + '%';

    const over = document.getElementById('sal-over');
    if (!over) return;
    if (left >= 0) { over.style.display = 'none'; over.innerHTML = ''; return; }
    over.style.display = 'block';
    const opts = salReleaseOptions(state.picks, state.difficulty).slice(0, 4);
    over.innerHTML =
      `<div class="sal-over-t">חרגת ב-₪${salFmt(-left)}מ׳ — שחרר שחקן כדי לשחק</div>` +
      opts.map(o =>
        `<button class="sal-rel" data-idx="${o.idx}">` +
        `${o.player.name} <span>₪${salFmt(o.price)}מ׳</span></button>`).join('');
  }

  // Releasing empties the slot. It is NOT re-drafted — at kick-off an empty slot
  // is filled by a free agent, which is what makes a star cost a starter.
  function salRelease(idx) {
    if (!salActive() || !state.picks[idx]) return;
    const p = state.picks[idx];
    state.usedPlayerKeys.delete(p.player.name);
    state.picks[idx] = null;
    if (typeof saveDraftState === 'function') saveDraftState();
    if (typeof refreshAllTokens === 'function') refreshAllTokens();
    if (typeof updateDraftOVR === 'function') updateDraftOVR();
    salSyncBar();
  }

  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.sal-rel');
    if (!b) return;
    ev.preventDefault();
    salRelease(+b.dataset.idx);
  });

  global.salActive = salActive;
  global.salChip = salChip;
  global.salSyncBar = salSyncBar;
  global.salRelease = salRelease;
})(typeof window !== 'undefined' ? window : globalThis);
