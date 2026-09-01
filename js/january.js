/* ── חלון ההעברות של ינואר ────────────────────────────────────────────────────
 *
 * Half the season plays out on screen, and then it stops. Where you stand goes
 * up — record, points, goal difference, the pace you are on — and there are two
 * doors: keep this eleven, or gamble on one move.
 *
 * Take the gamble and deadline day runs its course. A scenario is drawn, you
 * confirm blind, a wheel decides which club and season the replacement comes
 * out of, and the deal is done. The rest of the fixtures are then played against
 * the team you have, not the one you drafted.
 *
 * Two rules make it a gamble rather than a menu:
 *   · you commit before you see the offer, and
 *   · there is no undo.
 *
 * How a refresh cannot be used to grind an outcome: both continuations are
 * simulated up front from the SAME seed, so the fixture order and the whole
 * first half are identical in each, and they diverge only where the squad
 * changes. The season is saved before the question is asked, so reloading
 * restores the one you already had — reloading counts as sticking.
 *
 * Where it does NOT fire: the daily challenge and the leagues, where everyone
 * plays identical conditions and a drawn scenario would break the comparison
 * the boards depend on; the gauntlet, which has its own run rules; the career,
 * which already has a window between seasons; and the salary cap, whose whole
 * subject is a budget a free transfer would insult.
 */
(function (global) {
  'use strict';

  /* ── when it fires ───────────────────────────────────────────────────────── */
  function janEligible() {
    if (typeof state === 'undefined' || !state) return false;
    if (state.januaryOn === false) return false;             // switched off in setup
    if (state.challenge || state.league || state.gauntlet) return false;
    if (state.salaryCap || state.career) return false;
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
  function clubName(id) {
    return (typeof TEAMS !== 'undefined' && TEAMS[id] && TEAMS[id].name) || id || '';
  }

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
      blurb: 'סוכן מציע שחקן שאף אחד לא שם לב אליו. אתה חותם עיוור, בלי לראות אותו משחק.',
      slot: weakestIdx,
      // Skewed high, but the bottom of the band is below what you already have:
      // most of the time this helps, and sometimes you paid for nothing.
      band: cur => [cur - 4, cur + 12],
    },
    {
      key: 'offer', weight: 22,
      title: 'הצעה מחו״ל',
      blurb: 'מועדון זר קונה את הכוכב שלך והוא רוצה ללכת. הכסף קונה מחליף — לא באותה רמה.',
      slot: strongestIdx,
      band: cur => [cur - 10, cur - 1],
    },
    {
      key: 'forced', weight: 15,
      title: 'מכירה כפויה',
      blurb: 'ההנהלה מוכרת מעל הראש שלך. שחקן אחד יוצא, מחליף אחד נכנס עיוור, ואין לך מה להגיד על זה.',
      slot: () => {
        const live = state.picks.map((p, i) => (p ? i : -1)).filter(i => i >= 0);
        return live[Math.floor(Math.random() * live.length)];
      },
      band: cur => [cur - 8, cur + 8],
    },
    {
      key: 'punt', weight: 25,
      title: 'הימור על נער',
      blurb: 'כישרון צעיר בלי עבר בליגה. או שהוא מתפוצץ, או שהוא לא.',
      slot: weakestIdx,
      band: cur => [cur - 9, cur + 16],
      // The name has to be true. Without this the draw was happy to hand you a
      // keeper in his best season and call him a prospect — the whole point is
      // a player the data itself says was not finished yet, so the season on
      // offer must sit well below his career peak.
      filter: c => (c.player.peak_ovr || 0) - c.player.ovr >= 5,
      // In peak mode every player IS finished, so the premise cannot hold and
      // the scenario steps aside rather than lying.
      unless: () => !!state.peakMode,
    },
  ];

  function drawScenario(exclude) {
    const live = SCENARIOS.filter(s =>
      !(s.unless && s.unless()) && !(exclude && exclude.has(s.key)));
    if (!live.length) return null;
    const total = live.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const s of live) { if ((r -= s.weight) <= 0) return s; }
    return live[0];
  }

  /* ── the plan ────────────────────────────────────────────────────────────── */
  // Everything the window will do, decided in one place and BEFORE either
  // continuation is simulated, so both branches are computed against a fixed
  // outcome. The player still sees nothing until they have committed.
  function janPlan() {
    // A scenario that cannot be honoured hands over to another one rather than
    // being honoured loosely. That is the difference between "no youngster was
    // available" and calling a keeper in his best season a youngster.
    const tried = new Set();
    let scenario, idx, incoming, cur;
    for (let attempt = 0; attempt < SCENARIOS.length; attempt++) {
      scenario = drawScenario(tried);
      if (!scenario) return null;
      tried.add(scenario.key);

      idx = scenario.slot();
      if (idx == null || idx < 0 || !state.picks[idx]) continue;
      cur = ovrOf(state.picks[idx].player);
      const [lo, hi] = scenario.band(cur);

      // Candidates that fit the slot, satisfy whatever the scenario claims about
      // them, and land in the band. The band is widened rather than abandoned if
      // nothing fits — a window that silently does nothing is worse than one
      // that offers a smaller swing. The scenario's own filter is NEVER relaxed.
      const pool = janPool().filter(c => janFits(c, idx) && (!scenario.filter || scenario.filter(c)));
      if (!pool.length) continue;
      let inBand = pool.filter(c => { const o = ovrOf(c.player); return o >= lo && o <= hi; });
      for (let grow = 3; !inBand.length && grow <= 15; grow += 3) {
        inBand = pool.filter(c => { const o = ovrOf(c.player); return o >= lo - grow && o <= hi + grow; });
      }
      if (!inBand.length) inBand = pool;
      incoming = inBand[Math.floor(Math.random() * inBand.length)];
      break;
    }
    if (!incoming) return null;
    const outgoing = state.picks[idx];
    return {
      key: scenario.key,
      title: scenario.title,
      blurb: scenario.blurb,
      idx,
      slotLabel: (state.slots[idx] && (state.slots[idx].label || state.slots[idx].pos)) || '',
      outName: outgoing.player.name,
      outOvr: cur,
      inName: incoming.player.name,
      inOvr: ovrOf(incoming.player),
      inClub: clubName(incoming.squad.teamId),
      inSeason: incoming.squad.season,
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

  /* ── preparing both futures ──────────────────────────────────────────────── */
  // Returns { stay, gamble, plan, played, firstHalf } or null when the window
  // does not apply. Both seasons come from ONE seed, so the fixture order and
  // the entire first half are identical in each and the table shown at the seam
  // is true of whichever door is opened.
  function janPrepare(simulate) {
    if (!janEligible()) return null;
    if (typeof withSeededRandom !== 'function') return null;

    const plan = janPlan();
    if (!plan) return null;

    // The post-transfer ratings, taken without leaving a trace: the squad is put
    // back immediately, so `stay` is simulated against the XI actually drafted.
    const teamBefore = (typeof teamOVR === 'function') ? teamOVR() : null;
    const meAfter = janApply(plan);
    const teamAfter = (typeof teamOVR === 'function') ? teamOVR() : null;
    janRevert(plan);
    if (!meAfter) return null;
    plan.teamBefore = teamBefore;
    plan.teamAfter  = teamAfter;

    const seed = (Math.random() * 4294967296) >>> 0;
    let firstHalf = null;
    const stay = withSeededRandom(seed, () => simulate(fh => { firstHalf = fh; return null; }));
    if (!firstHalf || !firstHalf.length) return null;      // a format with no seam
    const gamble = withSeededRandom(seed, () => simulate(() => meAfter));

    if (typeof track === 'function') track('open', 'january');
    return { stay, gamble, plan, firstHalf, played: firstHalf.length };
  }

  /* ── the screen ──────────────────────────────────────────────────────────── */
  function ensureStyle() {
    if (document.getElementById('jan-style')) return;
    const s = document.createElement('style');
    s.id = 'jan-style';
    s.textContent = `
.jan-wrap{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.74);backdrop-filter:blur(3px);padding:16px}
.jan-box{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);
  max-width:440px;width:100%;padding:22px;text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.55);
  animation:janIn .22s ease-out}
@keyframes janIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.jan-box.deadline{border-color:var(--accent)}
.jan-kicker{color:var(--accent);font-size:11.5px;letter-spacing:.1em;margin:0 0 7px;font-weight:600}
.jan-h{margin:0 0 14px;font-size:23px;color:var(--text)}
.jan-sub{margin:0 0 16px;color:var(--dim);font-size:14px;line-height:1.65}
.jan-stats{display:flex;gap:8px;margin:0 0 15px}
.jan-stat{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 4px}
.jan-stat i{display:block;font-style:normal;font-size:10.5px;letter-spacing:.07em;color:var(--dim);margin-bottom:3px}
.jan-stat b{display:block;font-size:19px;color:var(--text);font-weight:700}
.jan-btns{display:flex;flex-direction:column;gap:9px}
.jan-b{padding:12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);
  color:var(--text);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;width:100%}
.jan-b:hover{background:var(--hover)}
.jan-b.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.jan-b small{display:block;font-weight:400;font-size:12px;opacity:.85;margin-top:3px}
.jan-b[disabled]{opacity:.5;cursor:default}
.jan-phone{font-size:13.5px;color:var(--dim);margin:14px 0 0;min-height:20px}
.jan-dots::after{content:'';animation:janDots 1.2s steps(4,end) infinite}
@keyframes janDots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}
.jan-reel{display:flex;gap:10px;justify-content:center;margin:6px 0 16px}
.jan-cell{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:9px;
  padding:11px 6px;min-height:62px;display:flex;flex-direction:column;justify-content:center}
.jan-cell i{display:block;font-style:normal;font-size:10.5px;letter-spacing:.07em;color:var(--dim);margin-bottom:5px}
.jan-cell b{font-size:15px;color:var(--text);font-weight:700;line-height:1.25}
.jan-cell.spinning b{color:var(--dim)}
.jan-man{background:var(--surface);border:1px solid var(--border);border-radius:10px;
  padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:right}
.jan-man i{display:block;font-style:normal;font-size:10.5px;letter-spacing:.07em;color:var(--dim);margin-bottom:2px}
.jan-man b{display:block;font-size:15px;color:var(--text)}
.jan-man em{display:block;font-style:normal;font-size:11.5px;color:var(--dim);margin-top:2px}
.jan-man s{text-decoration:none;font-size:23px;font-weight:700;color:var(--dim)}
.jan-man.in{border-color:#3fb95066}
.jan-man.in s{color:#3fb950}
.jan-man.in.worse{border-color:#f8514966}
.jan-man.in.worse s{color:#f85149}
.jan-down-arrow{font-size:18px;color:var(--accent);margin:5px 0}
.jan-verdict{font-size:13.5px;margin:13px 0 16px}
.jan-up{color:#3fb950}.jan-down{color:#f85149}.jan-flat{color:var(--dim)}
#jan-skip{background:none;border:none;color:var(--accent);font-family:inherit;font-size:13.5px;
  font-weight:600;cursor:pointer;padding:6px 2px;display:block;margin:0 0 6px auto}
#jan-skip:hover{text-decoration:underline}
@media(max-width:420px){.jan-box{padding:17px}.jan-h{font-size:20px}.jan-stat b{font-size:17px}}
`;
    document.head.appendChild(s);
  }

  function close() {
    const w = document.querySelector('.jan-wrap');
    if (w) w.remove();
  }

  function frame(html, deadline) {
    ensureStyle();
    close();
    const w = document.createElement('div');
    w.className = 'jan-wrap';
    w.innerHTML = `<div class="jan-box${deadline ? ' deadline' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(w);
    return w;
  }

  /* ── the skip link ───────────────────────────────────────────────────────── */
  // "Straight to January" — the first half is scenery, and someone who has seen
  // it before should not have to sit through it to reach the decision.
  function janMountSkip(onSkip) {
    ensureStyle();
    const grid = document.getElementById('matches-grid');
    if (!grid || !grid.parentNode) return null;
    const b = document.createElement('button');
    b.id = 'jan-skip';
    b.type = 'button';
    b.textContent = 'דלג לינואר ←';
    b.onclick = onSkip;
    grid.parentNode.insertBefore(b, grid);
    return b;
  }

  /* ── step 1: halfway ─────────────────────────────────────────────────────── */
  function janHalfway(pair, tally, onChoice) {
    const { firstHalf, played } = pair;
    let gf = 0, ga = 0;
    firstHalf.forEach(m => { gf += m.gf; ga += m.ga; });
    const pts = tally.wins * 3 + tally.draws;
    const gd = gf - ga;
    // The pace, and nothing about how it ends: the second half is exactly what
    // is being decided, so projecting a finish here would spoil the run.
    const full = pair.stay.matches.length;
    const pace = Math.round(pts / played * full);

    frame(`
      <p class="jan-kicker">חלון ההעברות של ינואר</p>
      <h3 class="jan-h">חצי הדרך</h3>
      <div class="jan-stats">
        <div class="jan-stat"><i>מאזן</i><b dir="ltr">${tally.wins}-${tally.draws}-${tally.losses}</b></div>
        <div class="jan-stat"><i>נקודות</i><b dir="ltr">${pts}</b></div>
        <div class="jan-stat"><i>הפרש</i><b dir="ltr">${gd > 0 ? '+' : ''}${gd}</b></div>
      </div>
      <p class="jan-sub">${played} מחזורים, ${gf} שערים ו-${ga} ספיגות.
        בקצב הזה אתה בדרך ל-${pace} נקודות.<br>
        להישאר עם ההרכב, או להמר על מהלך אחד. אין חזרה.</p>
      <div class="jan-btns">
        <button class="jan-b go" id="jan-go">לצאת לשוק</button>
        <button class="jan-b" id="jan-stay">להישאר עם ההרכב</button>
      </div>`);
    document.getElementById('jan-go').onclick   = () => onChoice(true);
    document.getElementById('jan-stay').onclick = () => onChoice(false);
  }

  /* ── step 2: deadline day ────────────────────────────────────────────────── */
  // The beat between committing and learning what you committed to. It is the
  // whole reason the mode is a gamble, so it is given its own screen.
  function janDeadline(plan, onNext) {
    frame(`
      <p class="jan-kicker">יום ההעברות האחרון</p>
      <h3 class="jan-h" id="jan-dl-h">מרימים טלפונים<span class="jan-dots"></span></h3>
      <div class="jan-btns"><button class="jan-b go" id="jan-dl-go" disabled>רגע…</button></div>
      <p class="jan-phone" id="jan-dl-note"></p>`, true);
    setTimeout(() => {
      const h = document.getElementById('jan-dl-h');
      if (!h) return;                                  // window closed underneath us
      h.innerHTML = plan.title;
      document.getElementById('jan-dl-note').textContent = plan.blurb;
      const b = document.getElementById('jan-dl-go');
      b.disabled = false;
      b.textContent = 'לאשר את המהלך';
      b.onclick = onNext;
    }, 1400);
  }

  /* ── step 3: the wheel ───────────────────────────────────────────────────── */
  // Where the replacement comes from, decided in front of you. The outcome was
  // fixed before the question was asked — this shows it, it does not draw it.
  function janWheel(plan, onNext) {
    frame(`
      <p class="jan-kicker">${plan.title}</p>
      <h3 class="jan-h">נראה על מי נפל</h3>
      <div class="jan-reel">
        <div class="jan-cell spinning" id="jan-club"><i>מועדון</i><b>—</b></div>
        <div class="jan-cell spinning" id="jan-season"><i>עונה</i><b>—</b></div>
      </div>
      <div class="jan-btns"><button class="jan-b go" id="jan-spin">🎰 לסובב את הגלגל</button></div>`, true);

    document.getElementById('jan-spin').onclick = () => {
      const btn = document.getElementById('jan-spin');
      btn.disabled = true; btn.textContent = 'מסתובב…';
      const squads = (typeof getEraFilteredSquads === 'function') ? getEraFilteredSquads() : [];
      const clubEl = document.querySelector('#jan-club b');
      const seasEl = document.querySelector('#jan-season b');
      let n = 0;
      const spin = setInterval(() => {
        const sq = squads[Math.floor(Math.random() * squads.length)];
        if (sq) { clubEl.textContent = clubName(sq.teamId); seasEl.textContent = sq.season; }
        if (++n >= 16) {
          clearInterval(spin);
          clubEl.textContent = plan.inClub;
          seasEl.textContent = plan.inSeason;
          document.getElementById('jan-club').classList.remove('spinning');
          document.getElementById('jan-season').classList.remove('spinning');
          btn.disabled = false; btn.textContent = 'מי זה?';
          btn.onclick = onNext;
        }
      }, 70);
    };
  }

  /* ── step 4: done deal ───────────────────────────────────────────────────── */
  function janDone(plan, onDone) {
    const d = plan.inOvr - plan.outOvr;
    const td = (plan.teamBefore != null && plan.teamAfter != null)
      ? plan.teamAfter - plan.teamBefore : d;
    // Two different truths, and both are said: what happened in the position,
    // and what it did to the eleven. Quoting only the bigger of the two would be
    // flattering the transfer rather than reporting it.
    const posLine = d > 0 ? `הרווחת ${d} נקודות דירוג בעמדה הזאת`
      : d < 0 ? `ירדת ${Math.abs(d)} נקודות דירוג בעמדה הזאת`
        : 'אותו דירוג בדיוק בעמדה הזאת';
    const teamLine = (plan.teamBefore != null)
      ? ` · דירוג הקבוצה <span dir="ltr">${plan.teamBefore} → ${plan.teamAfter}</span>` : '';
    frame(`
      <p class="jan-kicker">עסקה סגורה${plan.slotLabel ? ' · ' + plan.slotLabel : ''}</p>
      <div class="jan-man"><span><i>יוצא</i><b>${plan.outName}</b></span><s dir="ltr">${plan.outOvr}</s></div>
      <div class="jan-down-arrow">↓</div>
      <div class="jan-man in${d < 0 ? ' worse' : ''}"><span><i>נכנס</i><b>${plan.inName}</b>
        <em>${plan.inClub} ${plan.inSeason}</em></span><s dir="ltr">${plan.inOvr}</s></div>
      <p class="jan-verdict ${td > 0 ? 'jan-up' : td < 0 ? 'jan-down' : 'jan-flat'}">${posLine}${teamLine}</p>
      <div class="jan-btns"><button class="jan-b go" id="jan-ok">להמשיך את העונה</button></div>`, true);
    document.getElementById('jan-ok').onclick = () => { close(); onDone(); };
  }

  /* ── the sequence ────────────────────────────────────────────────────────── */
  // Called by animateResults when the reveal reaches the seam. Hands back the
  // season that the rest of the run belongs to.
  function janOpen(pair, tally, onChosen) {
    janHalfway(pair, tally, (gambled) => {
      if (typeof track === 'function') track('finish', 'january', gambled ? 'gamble' : 'stay');
      if (!gambled) { close(); onChosen(pair.stay); return; }
      const plan = pair.plan;
      janDeadline(plan, () => janWheel(plan, () => janDone(plan, () => {
        // Commit for real only now, so the pitch, the player stats and the share
        // card show the man who actually played the second half.
        janApply(plan);
        if (typeof saveDraftState === 'function') saveDraftState();
        onChosen(pair.gamble);
      })));
    });
  }

  global.janEligible = janEligible;
  global.janPlan     = janPlan;
  global.janApply    = janApply;
  global.janRevert   = janRevert;
  global.janPrepare  = janPrepare;
  global.janMountSkip = janMountSkip;
  global.janOpen     = janOpen;
})(typeof window !== 'undefined' ? window : globalThis);
