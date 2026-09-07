// The front office: a manager you hire for the run, and the one signature relic
// that comes with him.
//
// THE CATALOGUE IS DELIBERATELY EMPTY. 36-0 has no manager data — no names, no
// careers, nothing to draw a face from — so nothing is offered to the player and
// every hook below reads as "no deal signed". Fill GT_MANAGERS and the whole
// mechanism turns on by itself: the picker appears before the first fight, the
// signature relic starts counting, and the deal starts biting.
//
// A manager is:
//
//   { id:   'arsonist',                       // stable key, stored in the save
//     name: 'המצית', icon: '🔥',
//     blurb:'שורף את הסגל כדי לחמם את הקופה.',
//     deal: {                                 // only these keys are wired:
//       startCoins: 100,                      //   coins in the wallet on day one
//       oppOvr: 1,                            //   every opponent rated up by this
//       coinMult: 1,                          //   multiplier on victory money
//       relicDrop: 0.1,                       //   added to the relic drop chance
//       noRescue: false,                      //   halftime rescue unavailable
//     },
//     signature: 'whistle' }                  // id of a relic in GT_RELICS,
//                                             // locked for the run, outside the
//                                             // five slots
//
// The signature id must exist in GT_RELICS. Give a manager a relic no ordinary
// draw can produce and it belongs in that catalogue too, flagged `signatureOnly`
// so gtDrawRelic never offers it — that flag is already respected.

const GT_MANAGERS = [];

// Everything here comes in two forms: one that takes the manager id, and one
// that reads it off the run. gtBlank() builds a run and therefore MUST use the
// by-id form — asking gtRun() for a run that is still being constructed sends it
// straight back into gtBlank(), which is a hang, not an error.
function gtManagerById(id) {
  return id ? (GT_MANAGERS.find(m => m.id === id) || null) : null;
}
function gtManager() { return gtManagerById(gtRun().managerId); }
function gtManagersEnabled() { return GT_MANAGERS.length > 0; }

// The signature relic is held, but never in a slot — that is the whole point of
// it, and every relic check goes through gtHas, so one line here is enough.
function gtSignatureId() {
  const m = gtManager();
  return m && m.signature ? m.signature : null;
}
function gtSignatureRelic() {
  const id = gtSignatureId();
  return id && typeof gtRelic === 'function' ? gtRelic(id) : null;
}

function gtDealOf(manager) { return (manager || {}).deal || {}; }
function gtDeal() { return gtDealOf(gtManager()); }
function gtDealNum(key) { return Number(gtDeal()[key] || 0); }
function gtDealFlag(key) { return !!gtDeal()[key]; }
// by id, because the only caller is the one building a run from nothing
function gtStartCoinsFor(id) { return Number(gtDealOf(gtManagerById(id)).startCoins || 0); }

/* ── hiring, when there is anyone to hire ─────────────────────────────────── */
function gtManagerPickerHTML() {
  if (!gtManagersEnabled()) return '';
  return `
    <div class="gt-office">
      <div class="gt-office-t">💼 חדר ההנהלה</div>
      <p class="gt-office-p">מנג'ר אחד לכל המסע, עם קמע חתימה שנעול עד הסוף ולא תופס מקום.</p>
      <div class="gt-office-grid">
        ${GT_MANAGERS.map(m => {
          const sig = typeof gtRelic === 'function' ? gtRelic(m.signature) : null;
          return `
          <button class="gt-gm" data-gm="${m.id}">
            <span class="gt-gm-ico">${m.icon || '💼'}</span>
            <span class="gt-gm-name">${m.name}</span>
            <span class="gt-gm-blurb">${m.blurb || ''}</span>
            ${sig ? `<span class="gt-gm-sig">${sig.icon} ${sig.name} - ${gtNums(sig.desc)}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>`;
}

function gtWireManagerPicker(root, done) {
  root.querySelectorAll('.gt-gm[data-gm]').forEach(btn => {
    btn.onclick = () => {
      const run = gtRun();
      run.managerId = btn.dataset.gm;
      run.coins = (run.coins || 0) + gtStartCoinsFor(run.managerId);
      gtSave();
      if (done) done();
    };
  });
}

/* ── the manager of a RUN ─────────────────────────────────────────────────────
 *
 * Separate from GT_MANAGERS above, which is a front-office deal and still empty.
 * This is the real thing: one of the 34 managers in js/coach-data.js, drawn
 * before the first fight and holding for the whole run.
 *
 * In the league a manager is a fair trade and moves no odds. Here he does not
 * even pretend to: his trophies are worth a flat rating bonus on every line, and
 * a legend is simply better than a journeyman. That is the owner's call, made
 * with the numbers in front of him, and the numbers are large — measured on the
 * real engine, one fight against an equal side:
 *
 *     bonus   per fight   eight in a row
 *      +0       54.1%          0.7%
 *      +1       59.8%          1.6%
 *      +3       70.4%          6.0%
 *      +5       79.0%         15.1%
 *
 * So the draw is worth more than any relic in the game, and a run's ceiling is
 * set before the first whistle. Deliberate: the gauntlet is a roguelike, the run
 * rules already swing it, and nobody has ever finished one.
 *
 * No era filter. The stations are club-seasons from across the whole history of
 * the league, so a run has no single year to be true to.
 */
const GT_COACH_OVR = { legend: 5, winner: 3, cup: 1, journeyman: 0 };

function gtCoach() { return gtRun().coach || null; }

// Every line, every fight, for the whole run.
function gtCoachBonus() {
  const c = gtCoach();
  return c ? (GT_COACH_OVR[c.tier] || 0) : 0;
}

// Drawn once, when the run rule has been settled and the road is about to open.
// Returns the record so the caller can announce it; null when there is nothing
// to draw or a manager is already in place.
function gtDrawCoach() {
  const run = gtRun();
  if (run.coach || typeof coachDraw !== 'function') return null;
  const c = coachDraw();                      // no year: the map spans every era
  if (!c) return null;
  run.coach = { name: c.name, style: c.style || '', arch: c.arch, tier: c.tier };
  gtSave();
  return run.coach;
}

// In the bar, beside the coins and the run rule.
function gtCoachBadgeHTML() {
  const c = gtCoach();
  if (!c) return '';
  const b = gtCoachBonus();
  return `<span class="gt-coach-tag" title="${c.style ? c.style.replace(/"/g, '') : ''}">🧑‍💼 ${c.name}${
    b ? ` <small dir="ltr">+${b}</small>` : ''}</span>`;
}

// The badge sits in the relic bar, which the shop must not re-render — that
// would wipe the panel telling the player what he just bought. Same trick the
// wallet uses: patch it where it stands.
function gtCoachBadgeRepaint() {
  document.querySelectorAll('.gt-coach-tag').forEach(el => { el.outerHTML = gtCoachBadgeHTML(); });
}

/* ── one swap free, the rest bought ───────────────────────────────────────────
 *
 * The draw is uniform over the 34 in coach-data.js — 2 legends, 15 winners, 3
 * cup men, 14 journeymen — so a blind re-draw is worth +1.71 on the lines. That
 * one number is what makes the offer a decision instead of a gift: off a
 * journeyman it is free money, off a winner it is a bad bet, and off a legend it
 * is vandalism. Which is why the card PRINTS the bonus. The league card does not,
 * and must not — there the manager is a fair trade and the number would only
 * invite a re-spin that isn't on offer. Here he is the largest edge in the mode.
 *
 * A swap is blind and it is final, both ways: what comes out is what you have.
 * Letting the player see the new man and keep the old one would price a +5 at
 * whatever the roll cost and make the draw itself meaningless.
 *
 * The first swap of a run is free, and it is the SAME swap wherever it is taken
 * — on the reveal card before the first fight, or later off the shop shelf at a
 * price of zero. That is deliberate: an offer that lives only on one screen is
 * an offer a refresh can eat. Every one after it costs GT_COACH_SWAP_PRICE, as
 * often as the wallet allows.
 */
const GT_COACH_SWAP_PRICE = 60;

function gtCoachSwapUsed()  { return !!gtRun().coachSwap; }
function gtCoachSwapPrice() { return gtCoachSwapUsed() ? GT_COACH_SWAP_PRICE : 0; }

// The man on the touchline is out of the pool: a swap that can hand you back the
// same name is not a swap. Returns null when there is nobody else to draw, which
// with 34 in the data is a guard for a future roster and not for today's.
function gtRedrawCoach() {
  const run = gtRun();
  if (typeof coachPool !== 'function') return null;
  const cur = run.coach ? run.coach.name : null;
  const pool = coachPool().filter(c => c.name !== cur);   // no year: every era
  if (!pool.length) return null;
  const c = pool[Math.floor(Math.random() * pool.length)];
  run.coach = { name: c.name, style: c.style || '', arch: c.arch, tier: c.tier };
  run.coachSwap = true;
  gtSave();
  return run.coach;
}

/* ── the reveal ───────────────────────────────────────────────────────────── */
// A beat before the name, so it lands as a draw and not as a form field. The
// league's own card does this; the gauntlet needs its own copy because it also
// runs on a swap, where the kicker is different.
function gtCoachSpin(kicker, done) {
  if (typeof coachFrame !== 'function') { done(); return; }
  coachFrame(`<p class="coach-kicker">${kicker}</p>
              <h3 class="coach-h">מדברים עם כמה שמות…</h3>
              <p class="coach-spin" id="gt-coach-spin">—</p>`);
  const el = document.getElementById('gt-coach-spin');
  const pool = typeof coachPool === 'function' ? coachPool() : [];
  let n = 0;
  const t = setInterval(() => {
    if (pool.length && el) el.textContent = pool[Math.floor(Math.random() * pool.length)].name;
    if (++n >= 9) { clearInterval(t); done(); }
  }, 90);
}

function gtCoachReveal(c, kicker, onDone, canSwap) {
  if (!c || typeof coachFrame !== 'function') { if (onDone) onDone(); return; }
  const b = GT_COACH_OVR[c.tier] || 0;
  coachFrame(`
    <p class="coach-kicker">${kicker}</p>
    <h3 class="coach-name">${c.name}</h3>
    <p class="gt-coach-worth"><b dir="ltr">+${b}</b> לכל הקווים, לכל המסע</p>
    <p class="coach-style">${c.style || ''}</p>
    <div class="coach-btns">
      <button class="coach-b go" id="gt-coach-go">להמשיך עם ${
        typeof coachFirstName === 'function' ? coachFirstName(c.name) : c.name} ←</button>
      ${canSwap ? `<button class="coach-b" id="gt-coach-swap">🔄 להחליף מאמן - חינם, פעם אחת</button>
                   <p class="gt-coach-warn">ההחלפה עיוורת וסופית: מי שיוצא, יוצא.</p>` : ''}
    </div>`, true);

  const go = document.getElementById('gt-coach-go');
  if (go) go.onclick = () => { coachClose(); if (onDone) onDone(); };

  const sw = document.getElementById('gt-coach-swap');
  if (sw) sw.onclick = () => {
    // Drawn and saved BEFORE the animation, not after: a refresh in the middle
    // of nine ticks of theatre must not hand back the man who already left.
    const next = gtRedrawCoach();
    if (!next) { sw.disabled = true; return; }
    gtCoachSpin('מחליפים מאמן', () => gtCoachReveal(next, 'המאמן החדש', onDone, false));
  };
}
