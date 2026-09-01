/* ── חלון ההעברות של החורף ────────────────────────────────────────────────────
 *
 * Half the season is played, the table is on screen, and then one question:
 * stand pat, or gamble. Take the gamble and a scenario is drawn — the squad
 * changes, for better or for worse — and the remaining fixtures are played
 * against the team you now have rather than the one you drafted.
 *
 * Two rules make it a gamble rather than a menu:
 *   · you commit before you see the outcome, and
 *   · there is no undo.
 *
 * How it stays honest across a refresh: both continuations are simulated up
 * front from the SAME seed, so the first half is byte-identical in each and the
 * halves diverge only where the hook changes the squad. The pair is saved, the
 * choice picks one, and the other is dropped. Nothing re-rolls, and no outcome
 * can be ground by reloading the page.
 *
 * Where it does NOT fire: the daily challenge and the leagues, where everyone
 * plays identical conditions and a drawn scenario would break the comparison
 * the boards depend on; the gauntlet, which has its own run rules; and the
 * salary cap, whose whole subject is a budget a free transfer would insult.
 */
(function (global) {
  'use strict';

  /* ── when it fires ───────────────────────────────────────────────────────── */
  function janEligible() {
    if (typeof state === 'undefined' || !state) return false;
    if (state.challenge || state.league || state.gauntlet) return false;
    if (state.salaryCap || state.career) return false;      // career has its own window
    if (!Array.isArray(state.picks) || state.picks.some(p => !p)) return false;
    return true;
  }

  /* ── the pool a signing comes from ───────────────────────────────────────── */
  // Anyone in the era who is not already in the XI. Squads are the unit the
  // draft deals in, so a signing carries his club and season with him and the
  // pitch token, the share card and the player stats all keep working unchanged.
  function janPool() {
    const squads = (typeof getEraFilteredSquads === 'function')
      ? getEraFilteredSquads()
      : (typeof SQUADS !== 'undefined' ? SQUADS : []);
    const taken = new Set(state.picks.filter(Boolean).map(p => p.player.name));
    const out = [];
    for (const sq of squads) {
      for (const pl of (sq.players || [])) {
        if (!taken.has(pl.name)) out.push({ player: pl, squad: sq });
      }
    }
    return out;
  }

  function janFits(cand, slotIdx) {
    const pos = state.slots[slotIdx].pos;
    return (typeof playerFitsSlot === 'function') ? playerFitsSlot(cand.player, pos) : true;
  }

  function ovrOf(p) { return (typeof playerOVR === 'function') ? playerOVR(p) : (p.ovr || 0); }

  function weakestIdx() {
    let best = -1, bestOvr = Infinity;
    state.picks.forEach((p, i) => {
      if (!p) return;
      const o = ovrOf(p.player);
      if (o < bestOvr) { bestOvr = o; best = i; }
    });
    return best;
  }

  function strongestIdx() {
    let best = -1, bestOvr = -Infinity;
    state.picks.forEach((p, i) => {
      if (!p) return;
      const o = ovrOf(p.player);
      if (o > bestOvr) { bestOvr = o; best = i; }
    });
    return best;
  }

  /* ── the scenarios ───────────────────────────────────────────────────────── */
  // Four, not sixteen. Each names a slot and a band to draw the replacement
  // from; the drama is entirely in the band. Weights are the odds of each being
  // the one you get, and they add up to 100.
  //
  // Deliberately, only ONE of the four is a straight upgrade. A window where the
  // gamble always pays is not a gamble, it is a button.
  const SCENARIOS = [
    {
      key: 'find', weight: 38,
      title: 'מציאה',
      blurb: 'סוכן מציע שחקן שאף אחד לא שם לב אליו. אתה חותם עיוור.',
      slot: weakestIdx,
      // Skewed high, but the bottom of the band is below what you already have:
      // most of the time this helps, and sometimes you paid for nothing.
      band: cur => [cur - 4, cur + 12],
    },
    {
      key: 'offer', weight: 22,
      title: 'ההצעה מחו״ל',
      blurb: 'מועדון זר קונה את הכוכב שלך. הכסף קונה מחליף — לא באותה רמה.',
      slot: strongestIdx,
      band: cur => [cur - 10, cur - 1],
    },
    {
      key: 'forced', weight: 15,
      title: 'מכירה כפויה',
      blurb: 'ההנהלה מוכרת מעליך. מגיע מחליף, ואין לך מה להגיד על זה.',
      slot: () => {
        const live = state.picks.map((p, i) => (p ? i : -1)).filter(i => i >= 0);
        return live[Math.floor(Math.random() * live.length)];
      },
      band: cur => [cur - 8, cur + 8],
    },
    {
      key: 'punt', weight: 25,
      title: 'הימור על נער',
      blurb: 'כישרון צעיר, בלי עבר. או שהוא מתפוצץ, או שהוא לא.',
      slot: weakestIdx,
      band: cur => [cur - 9, cur + 16],
    },
  ];

  function drawScenario() {
    const total = SCENARIOS.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const s of SCENARIOS) { if ((r -= s.weight) <= 0) return s; }
    return SCENARIOS[0];
  }

  /* ── the plan ────────────────────────────────────────────────────────────── */
  // Everything the window will do, decided in one place and BEFORE either
  // continuation is simulated, so both branches are computed against a fixed
  // outcome. The player still sees nothing until they have committed.
  function janPlan() {
    const scenario = drawScenario();
    const idx = scenario.slot();
    if (idx == null || idx < 0 || !state.picks[idx]) return null;

    const outgoing = state.picks[idx];
    const cur = ovrOf(outgoing.player);
    const [lo, hi] = scenario.band(cur);

    // Candidates that both fit the slot and land in the band. The band is
    // widened rather than abandoned if nothing fits — a window that silently
    // does nothing is worse than one that offers a smaller swing.
    const pool = janPool().filter(c => janFits(c, idx));
    if (!pool.length) return null;
    let inBand = pool.filter(c => { const o = ovrOf(c.player); return o >= lo && o <= hi; });
    for (let grow = 3; !inBand.length && grow <= 15; grow += 3) {
      inBand = pool.filter(c => { const o = ovrOf(c.player); return o >= lo - grow && o <= hi + grow; });
    }
    if (!inBand.length) inBand = pool;

    const incoming = inBand[Math.floor(Math.random() * inBand.length)];
    return {
      key: scenario.key,
      title: scenario.title,
      blurb: scenario.blurb,
      idx,
      outName: outgoing.player.name,
      outOvr: cur,
      inName: incoming.player.name,
      inOvr: ovrOf(incoming.player),
      incoming: { player: incoming.player, squad: incoming.squad },
      outgoing: { player: outgoing.player, squad: outgoing.squad },
    };
  }

  /* ── applying it ─────────────────────────────────────────────────────────── */
  // Swapping the pick is the whole mechanic: teamOVR and calcGroupOVR read
  // state.picks, so myLineRatings() reflects the new XI with no further help.
  function janApply(plan) {
    if (!plan) return null;
    state.picks[plan.idx] = plan.incoming;
    if (state.usedPlayerKeys) {
      state.usedPlayerKeys.delete(plan.outName);
      state.usedPlayerKeys.add(plan.inName);
    }
    return (typeof myLineRatings === 'function') ? myLineRatings() : null;
  }

  function janRevert(plan) {
    if (!plan) return;
    state.picks[plan.idx] = plan.outgoing;
    if (state.usedPlayerKeys) {
      state.usedPlayerKeys.delete(plan.inName);
      state.usedPlayerKeys.add(plan.outName);
    }
  }

  /* ── the screen ──────────────────────────────────────────────────────────── */
  function ensureStyle() {
    if (document.getElementById('jan-style')) return;
    const s = document.createElement('style');
    s.id = 'jan-style';
    s.textContent = `
.jan-wrap{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.72);backdrop-filter:blur(3px);padding:16px}
.jan-box{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);
  max-width:460px;width:100%;padding:22px;text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.5)}
.jan-kicker{color:var(--accent);font-size:12.5px;letter-spacing:.06em;margin:0 0 6px}
.jan-h{margin:0 0 6px;font-size:23px;color:var(--text)}
.jan-sub{margin:0 0 16px;color:var(--dim);font-size:14px;line-height:1.6}
.jan-cap{margin:0 0 5px;font-size:12.5px;color:var(--dim)}
.jan-tab{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13.5px;
  border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.jan-tab td.n{padding:7px 4px;text-align:center;color:var(--dim);width:25%;white-space:nowrap}
.jan-tab td.pts{color:var(--text)}
.jan-tab td.pts b{font-size:16px}
.jan-warn{color:var(--dim);font-size:12.5px;margin:0 0 16px}
.jan-btns{display:flex;flex-direction:column;gap:9px}
.jan-b{padding:12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);
  color:var(--text);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
.jan-b:hover{background:var(--hover)}
.jan-b.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.jan-b small{display:block;font-weight:400;font-size:12px;opacity:.8;margin-top:3px}
.jan-swap{display:flex;align-items:center;justify-content:center;gap:12px;margin:4px 0 16px;flex-wrap:wrap}
.jan-man{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 13px;min-width:118px}
.jan-man b{display:block;font-size:14px;color:var(--text)}
.jan-man span{font-size:19px;font-weight:700}
.jan-man.out span{color:var(--dim)}
.jan-arrow{font-size:20px;color:var(--dim)}
.jan-verdict{font-size:15px;font-weight:600;margin:0 0 16px}
.jan-up{color:#3fb950}.jan-down{color:#f85149}
@media(max-width:420px){.jan-box{padding:17px}.jan-h{font-size:20px}}
`;
    document.head.appendChild(s);
  }

  function close() {
    const w = document.querySelector('.jan-wrap');
    if (w) w.remove();
  }

  function frame(html) {
    ensureStyle();
    close();
    const w = document.createElement('div');
    w.className = 'jan-wrap';
    w.innerHTML = `<div class="jan-box" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(w);
    return w;
  }

  // The standings after the first half, so the decision is taken against
  // something real rather than a vibe.
  function halfTable(firstHalf, played) {
    let w = 0, d = 0;
    firstHalf.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    const l = played - w - d;
    return `<p class="jan-cap">אחרי ${played} מחזורים</p>
      <table class="jan-tab"><tr>
      <td class="n">${w} נצ׳</td><td class="n">${d} תיקו</td><td class="n">${l} הפ׳</td>
      <td class="n pts"><b>${w * 3 + d}</b> נק׳</td></tr></table>`;
  }

  // Step 1 — the question. Nothing about the scenario is shown yet: that is the
  // difference between a gamble and a shop.
  function janAsk(firstHalf, played, onChoice) {
    frame(`
      <p class="jan-kicker">ינואר</p>
      <h3 class="jan-h">חלון ההעברות נפתח</h3>
      ${halfTable(firstHalf, played)}
      <p class="jan-sub">אפשר להמשיך עם אותם אחד־עשר, או לצאת לשוק פעם אחת.
        לא תדע מה מציעים לך לפני שתחליט, ואי אפשר להתחרט.</p>
      <div class="jan-btns">
        <button class="jan-b go" id="jan-go">לצאת לשוק
          <small>הקבוצה תשתנה — לטובה או לרעה</small></button>
        <button class="jan-b" id="jan-stay">להישאר עם הסגל
          <small>אותם שחקנים עד סוף העונה</small></button>
      </div>`);
    document.getElementById('jan-go').onclick   = () => onChoice(true);
    document.getElementById('jan-stay').onclick = () => onChoice(false);
  }

  // Step 2 — what you got. Shown only after the commitment, and the continue
  // button is the only way out: the outcome is already simulated by now.
  function janReveal(plan, onDone) {
    const delta = plan.inOvr - plan.outOvr;
    const cls = delta > 0 ? 'jan-up' : delta < 0 ? 'jan-down' : '';
    // The verdict is about the TEAM, not the man. A 68 swapped for a 79 is +11
    // on one card and usually +1 on the eleven, and saying the bigger number
    // would be flattering the transfer rather than reporting it.
    const tb = plan.teamBefore, ta = plan.teamAfter;
    const td = (tb != null && ta != null) ? ta - tb : delta;
    // The numerals need their own ltr run: a neutral between two digits resolves
    // RTL, and "83 → 84" would otherwise render as "84 → 83".
    const verdict = (tb != null && ta != null)
      ? `דירוג הקבוצה <span dir="ltr">${tb} → ${ta}</span>`
        + (td === 0 ? ' — בלי שינוי' : ` <span dir="ltr">(${td > 0 ? '+' : ''}${td})</span>`)
      : (td > 0 ? `הקבוצה התחזקה ב-${td}` : td < 0 ? `הקבוצה נחלשה ב-${Math.abs(td)}` : 'בלי שינוי');
    const vcls = td > 0 ? 'jan-up' : td < 0 ? 'jan-down' : '';
    frame(`
      <p class="jan-kicker">${plan.title}</p>
      <h3 class="jan-h">העסקה נסגרה</h3>
      <p class="jan-sub">${plan.blurb}</p>
      <div class="jan-swap">
        <div class="jan-man out"><b>${plan.outName}</b><span dir="ltr">${plan.outOvr}</span></div>
        <div class="jan-arrow">←</div>
        <div class="jan-man"><b>${plan.inName}</b><span dir="ltr" class="${cls}">${plan.inOvr}</span></div>
      </div>
      <p class="jan-verdict ${vcls}">${verdict}</p>
      <p class="jan-warn">שאר העונה תשוחק עם ההרכב הזה.</p>
      <div class="jan-btns"><button class="jan-b go" id="jan-ok">להמשיך את העונה</button></div>`);
    document.getElementById('jan-ok').onclick = () => { close(); onDone(); };
  }

  /* ── the orchestrator ────────────────────────────────────────────────────── */
  // Returns true if it has taken over — animateResults then returns, and we call
  // it back with the chosen season in _janPicked.
  //
  // Both continuations are simulated here, before the question is asked, from
  // one seed. Same seed means the fixture order and the first half are identical
  // in each; the only thing that differs is the `me` handed to the second half.
  // So the table shown in the window is true of whichever future you pick, and
  // the one you did not pick is simply thrown away.
  let running = false;

  function janRunWindow(ovr, simulate) {
    if (running) return false;
    if (!janEligible()) return false;
    if (typeof withSeededRandom !== 'function') return false;

    const plan = janPlan();
    if (!plan) return false;                    // no legal swap — no window

    // The post-transfer ratings, computed once and without leaving a trace: the
    // squad is put back immediately, so the "stay" branch is simulated against
    // the XI that was actually drafted.
    const teamBefore = (typeof teamOVR === 'function') ? teamOVR() : null;
    const meAfter = janApply(plan);
    const teamAfter = (typeof teamOVR === 'function') ? teamOVR() : null;
    janRevert(plan);
    if (!meAfter) return false;
    plan.teamBefore = teamBefore;
    plan.teamAfter  = teamAfter;

    running = true;
    const seed = (Math.random() * 4294967296) >>> 0;
    let firstHalf = null;

    const stay   = withSeededRandom(seed, () => simulate(fh => { firstHalf = fh; return null; }));
    const played = firstHalf ? firstHalf.length : 0;
    if (!played) { running = false; return false; }   // a format with no seam
    const gamble = withSeededRandom(seed, () => simulate(() => meAfter));

    if (typeof track === 'function') track('open', 'january');

    janAsk(firstHalf, played, (gambled) => {
      const finish = () => {
        running = false;
        global._janPicked = gambled ? gamble : stay;
        if (typeof track === 'function') track('finish', 'january', gambled ? 'gamble' : 'stay');
        animateResults(ovr);
      };
      if (!gambled) { close(); finish(); return; }
      // Commit the swap for real, so the pitch, the player stats and the share
      // card all show the man who actually played the second half.
      janApply(plan);
      // Persist the new XI, or a refresh would replay the season the transfer
      // produced while the pitch still showed the man who was sold.
      if (typeof saveDraftState === 'function') saveDraftState();
      janReveal(plan, finish);
    });
    return true;
  }

  global.janRunWindow = janRunWindow;
  global.janEligible = janEligible;
  global.janPlan     = janPlan;
  global.janApply    = janApply;
  global.janRevert   = janRevert;
  global.janAsk      = janAsk;
  global.janReveal   = janReveal;
})(typeof window !== 'undefined' ? window : globalThis);
