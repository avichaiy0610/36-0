// Gauntlet relics.
//
// A relic bends one rule for as long as you hold it. You hold five; a sixth
// forces a choice. Everything here is data plus three places the run reads it:
// per-player rating (gtOvrAt), per-line rating (gtLineMods), and the odd flag
// the fight asks about (home ground, penalties, extra time).
//
// The catalogue is ours, not goat-lab's — see docs/RELICS.md.

const GT_SLOTS = 5;

const GT_RELICS = [
  /* ── the match ─────────────────────────────────────────────────────────── */
  { id: 'home-crowd', icon: '🏟', name: 'קהל ביתי', rarity: 'common',
    desc: 'כל משחק במסע משוחק כמשחק בית - יתרון הביתיות תמיד שלך.' },
  { id: 'concrete', icon: '🚌', name: 'להחנות את האוטובוס', rarity: 'common',
    desc: 'המגנים והשוער מתחזקים ב-3, החלוצים נחלשים ב-1.' },
  { id: 'counter', icon: '⚡', name: 'קונטרה', rarity: 'common',
    desc: 'מול יריבה שחזקה ממך ב-3 דירוג ומעלה, כל הקבוצה שלך מתחזקת ב-2.' },
  { id: 'gloves', icon: '🧤', name: 'כפפות זהב', rarity: 'common',
    desc: 'השוער שלך מתחזק ב-4.' },
  { id: 'stoppage', icon: '🕰', name: 'תוספת זמן', rarity: 'uncommon',
    desc: 'אם אתה בפיגור בשער אחד בסוף 90 הדקות, יש 20% שתבקיע שער שוויון ברגע האחרון.' },
  { id: 'cool-head', icon: '🥅', name: 'קור רוח', rarity: 'uncommon',
    desc: 'ניצחון ב70% מהמקרים בהם המשחק מגיע לפנדלים' },
  { id: 'fresh-legs', icon: '⏳', name: 'רגליים טריות', rarity: 'uncommon',
    desc: 'אם הקרב נגרר להארכה, כל הקבוצה שלך מתחזקת ב-3 דירוג באותו משחק.' },
  { id: 'hot-foot', icon: '🔥', name: 'רגל חמה', rarity: 'uncommon',
    desc: 'מי שכבש לך במשחק הקודם מתחזק ב-1 במשחק הבא.' },
  { id: 'captain', icon: '👑', name: 'סרט הקפטן', rarity: 'rare',
    desc: 'השחקן הכי טוב בהרכב מתחזק ב-5, וכל השאר נחלשים ב-1.' },
  { id: 'evil-eye', icon: '🧿', name: 'עין הרע', rarity: 'rare',
    desc: 'בכל משחק היריבה מפסידה את השחקן הכי טוב שלה - הוא לא משחק בכלל.' },
  { id: 'boss-crowd', icon: '🔔', name: 'מאני טיים', rarity: 'rare',
    desc: 'יש סיכוי גבוה ב8% שתבקיע שער במחצית או בהארכה' },
  { id: 'second-chance', icon: '♻️', name: 'הזדמנות שנייה', rarity: 'epic',
    desc: 'חד פעמי: הפסד מתבטל, והקרב מוכרע בפנדלים במקום.' },

  /* ── הסגל ──────────────────────────────────────────────────────────────── */
  { id: 'israel-trail', icon: '🌀', name: 'הנוסע בזמן', rarity: 'uncommon',
    desc: 'אם 11 השחקנים שלך מגיעים מ-11 עונות שונות, כל הקבוצה מתחזקת ב-2.' },
  { id: 'millennium', icon: '🏛', name: 'דור המילניום', rarity: 'uncommon',
    desc: 'כל שחקן שנבחר מעונות 1999/00 עד 2005/06 מתחזק ב-2.' },
  { id: 'duo', icon: '🧬', name: 'צמד מוכר', rarity: 'uncommon',
    desc: 'שני שחקנים שנבחרו מאותה קבוצה ומאותה עונה מתחזקים ב-3 כל אחד.' },
  { id: 'pride', icon: '🇮🇱', name: 'גאוות יחידה', rarity: 'uncommon',
    desc: 'כל שחקן ישראלי בהרכב מתחזק ב-1.' },
  { id: 'legionnaire', icon: '✈️', name: 'שחקן זר', rarity: 'uncommon',
    desc: 'כל שחקן זר מתחזק ב-3, וכל ישראלי נחלש ב-1.' },
  { id: 'babel', icon: '🌍', name: 'מגדל בבל', rarity: 'rare',
    desc: 'אם יש בהרכב שחקנים מ-6 לאומים שונים ומעלה, כל הקבוצה מתחזקת ב-2.' },

  /* ── מסלול וכלכלה ──────────────────────────────────────────────────────── */
  { id: 'scout', icon: '🔍', name: 'סקאוט', rarity: 'common',
    desc: 'לפני שבוחרים יריבה לשחק מולה רואים כמה היריבות חזקות בהתקפה, בקישור, בהגנה ובשוער.' },
  { id: 'grass-money', icon: '💰', name: 'כסף מהמדשאה', rarity: 'common',
    desc: 'כל ניצחון מקנה 25% יותר מטבעות.' },
  { id: 'agent-friend', icon: '🤝', name: 'חבר של הסוכן', rarity: 'uncommon',
    desc: 'המוצרים בחנות זולים ב-20%.' },
  { id: 'greased-wheel', icon: '🎰', name: 'גלגל משומן', rarity: 'rare',
    desc: 'בהגרלת השלל אחרי ניצחון הגלגל עוצר על שני שחקנים, ואתה בוחר מי מהם מצטרף.' },
  { id: 'watchlist', icon: '📋', name: 'רשימת מעקב', rarity: 'uncommon',
    desc: 'הגרלת השלל תציע רק את 6 השחקנים הטובים של הקבוצה שהבסת.' },
];

const GT_RARITY_W = { common: 5, uncommon: 3, rare: 1.4, epic: 0.5 };
const GT_RARITY_HE = { common: 'נפוץ', uncommon: 'לא שכיח', rare: 'נדיר', epic: 'נדיר מאוד' };

function gtRelic(id) { return GT_RELICS.find(r => r.id === id) || null; }
// A signature relic is held without occupying a slot, so every check has to go
// through here rather than reading run.relics directly.
function gtHas(id) {
  if ((gtRun().relics || []).includes(id)) return true;
  return typeof gtSignatureId === 'function' && gtSignatureId() === id;
}
function gtRelicsHeld() { return (gtRun().relics || []).map(gtRelic).filter(Boolean); }

// Draws one you do not already hold. Nothing is ever offered twice in a run —
// a duplicate would read as a dud, and stacking is not a mechanic here.
function gtDrawRelic() {
  const pool = GT_RELICS.filter(r => !gtHas(r.id) && !r.signatureOnly);
  if (!pool.length) return null;
  const w = pool.map(r => GT_RARITY_W[r.rarity] ?? 1);
  const i = pickWeightedIdx(w);
  return pool[i >= 0 ? i : 0];
}

/* ── what a relic does to the XI ───────────────────────────────────────────── */
// One pass over the eleven, returning a name → delta map. Everything that can
// change a single player's rating lands here: shop upgrades, peak seasons, and
// the relics whose condition is about a player rather than a line.
function gtPlayerDeltas() {
  const run = gtRun();
  const picks = (state.picks || []).filter(Boolean);
  const d = new Map();
  const add = (name, n) => d.set(name, (d.get(name) || 0) + n);

  picks.forEach(p => {
    const boost = (run.boosts || {})[p.player.name];
    if (boost) add(p.player.name, boost);
  });

  if (gtHas('captain') && picks.length) {
    const best = picks.reduce((a, b) => (b.player.ovr > a.player.ovr ? b : a));
    picks.forEach(p => add(p.player.name, p === best ? 5 : -1));
  }
  if (gtHas('hot-foot') && run.hotFoot) add(run.hotFoot, 1);

  // דור אחד: one cutoff, a bonus on one side of it and a penalty on the other
  const fx = typeof gtModFx === 'function' ? gtModFx() : {};
  if (fx.eraYear) {
    picks.forEach(p => {
      const year = parseInt(p.squad.season, 10);
      add(p.player.name, year <= fx.eraYear ? (fx.eraUp || 0) : (fx.eraDown || 0));
    });
  }

  if (gtHas('millennium')) {
    picks.forEach(p => { if (parseInt(p.squad.season, 10) <= 2005) add(p.player.name, 2); });
  }
  if (gtHas('duo')) {
    const bySquad = new Map();
    picks.forEach(p => bySquad.set(p.squad.id, (bySquad.get(p.squad.id) || 0) + 1));
    picks.forEach(p => { if (bySquad.get(p.squad.id) > 1) add(p.player.name, 3); });
  }
  if (gtHas('pride') || gtHas('legionnaire')) {
    picks.forEach(p => {
      const isr = gtIsIsraeli(p.player.name);
      if (gtHas('pride') && isr) add(p.player.name, 1);
      if (gtHas('legionnaire')) add(p.player.name, isr ? -1 : 3);
    });
  }
  return d;
}

function gtIsIsraeli(name) {
  const nats = typeof playerNats === 'function' ? playerNats(name) : [];
  return nats.includes('ישראל');
}
function gtNatCount() {
  const set = new Set();
  (state.picks || []).filter(Boolean).forEach(p => {
    (typeof playerNats === 'function' ? playerNats(p.player.name) : []).forEach(n => set.add(n));
  });
  return set.size;
}

// The rating function the gauntlet hands to teamOVR/myLineRatings: base rating
// (peak season if the shop paid for it) plus whatever the deltas say.
function gtOvrAt(pick) {
  const run = gtRun();
  const peak = (run.peaks || []).includes(pick.player.name);
  const base = peak ? (pick.player.peak_ovr ?? pick.player.ovr) : pick.player.ovr;
  const d = _gtDeltas || (_gtDeltas = gtPlayerDeltas());
  return Math.max(40, Math.min(99, base + (d.get(pick.player.name) || 0)));
}
let _gtDeltas = null;
function gtInvalidateDeltas() { _gtDeltas = null; }

// The player's XI as the engine wants it, with every relic already priced in.
function gtMyRatings() {
  gtInvalidateDeltas();
  const me = myLineRatings(gtOvrAt);
  gtInvalidateDeltas();
  return me;
}

/* ── what a relic does to a fight ──────────────────────────────────────────── */
// Line-level effects, applied once the two sides are rated. `ctx` carries what
// the conditions ask about: the node being fought and which period it is.
function gtLineMods(me, opp, ctx) {
  const out = { ...me };
  const all = n => { out.atk += n; out.mid += n; out.def += n; out.gk += n; out.ovr += n; };

  // the run rule first: it is the frame the relics then bend
  const fx = typeof gtModFx === 'function' ? gtModFx() : {};
  ['atk', 'mid', 'def', 'gk'].forEach(k => { if (fx[k]) out[k] += fx[k]; });
  if (fx.allLines) all(fx.allLines);
  if (fx.normalTime) all(fx.normalTime);        // 90' and extra time, never the shootout
  if (fx.extraTime && ctx && ctx.extraTime) all(fx.extraTime);

  if (gtHas('concrete')) { out.def += 3; out.gk += 3; out.atk -= 1; }
  if (gtHas('gloves')) out.gk += 4;
  if (gtHas('counter') && opp.ovr - me.ovr >= 3) all(2);
  if (gtHas('fresh-legs') && ctx && ctx.extraTime) all(3);
  if (gtHas('israel-trail')) {
    const picks = (state.picks || []).filter(Boolean);
    const seasons = new Set(picks.map(p => p.squad.season));
    if (picks.length === 11 && seasons.size === 11) all(2);
  }
  if (gtHas('babel') && gtNatCount() >= 6) all(2);
  return out;
}

// מאני טיים does not make the team better, it makes the goals likelier: the
// expected-goals number itself is nudged, and only when the clock is late.
function gtXgMultiplier(ctx) {
  const late = ctx && (ctx.half === 2 || ctx.extraTime);
  return gtHas('boss-crowd') && late ? 1.08 : 1;
}

function gtForceHome() { return gtHas('home-crowd') || !!(gtRun().effects || {}).homeDeed; }
function gtPensChance() {
  const fromMod = typeof gtModNum === 'function' ? gtModNum('pens') : 0;
  return Math.max(fromMod, gtHas('cool-head') ? 0.70 : 0.50);
}
function gtStoppageChance() { return gtHas('stoppage') ? 0.20 : 0; }
function gtCoinMultiplier() {
  return (gtHas('grass-money') ? 1.25 : 1) * (gtDealNum('coinMult') || 1) * (gtModNum('coinMult') || 1);
}
function gtShopDiscount() { return gtHas('agent-friend') ? 0.8 : 1; }
function gtScouting() { return gtHas('scout') || !!(gtRun().effects || {}).scoutReport; }

/* ── holding, swapping, losing ─────────────────────────────────────────────── */
// Five slots. A sixth relic is not a gift — it is a decision, and the card that
// leaves is gone. Nothing is auto-discarded on the player's behalf.
// "+3" inside a Hebrew sentence comes out as "3+": the sign is a neutral
// character, so the RTL paragraph puts it on the wrong side of the digits. A
// left-to-right mark ahead of it is not enough once the run touches a full
// stop — isolating each number with <bdi> is, and it needs no invisible
// characters in the source strings.
// Only a real plus or a real minus sign (U+2212) counts. An ASCII hyphen in
// Hebrew is usually a maqaf — "ה-11", "ב-70%" — and isolating that turns it
// into "ה11-", which is how the light theme caught me.
function gtNums(text) {
  return String(text || '')
    .replace(/[‎‏]/g, '')
    .replace(/([+−]\d+%?)/g, '<bdi dir="ltr">$1</bdi>');
}

function gtRelicCardHTML(r, extra = '') {
  return `
    <div class="gt-relic-card ${r.rarity} ${extra}">
      <span class="gt-relic-ico">${r.icon}</span>
      <span class="gt-relic-name">${r.name}</span>
      <span class="gt-relic-rar">${GT_RARITY_HE[r.rarity]}</span>
      <span class="gt-relic-desc">${gtNums(r.desc)}</span>
    </div>`;
}

function gtGrantRelic(relic, target, done) {
  const run = gtRun();
  run.relics = run.relics || [];
  const finish = () => { gtSave(); gtInvalidateDeltas(); if (done) done(); };

  // Room for it is not a reason to take it: a relic can be a bad fit for the
  // squad you are carrying, so the offer is always an offer.
  if (run.relics.length < GT_SLOTS) {
    target.innerHTML = `
      <div class="gt-relic-got">
        <div class="gt-relic-got-t">🔮 קמע חדש</div>
        ${gtRelicCardHTML(relic, 'won')}
        <p class="gt-relic-slots">יש לך ${run.relics.length} מתוך ${GT_SLOTS} מקומות בשימוש.</p>
        <button class="btn-primary btn-full" id="gt-relic-take">✅ לקחת את ${relic.name}</button>
        <button class="btn-secondary btn-full" id="gt-relic-leave">🙅 לוותר עליו</button>
      </div>`;
    target.querySelector('#gt-relic-take').onclick = () => {
      run.relics.push(relic.id);
      target.innerHTML = `<p class="gt-sign-done">✅ ${relic.name} נכנס לתיק · ${run.relics.length}/${GT_SLOTS} מקומות בשימוש.</p>`;
      finish();
    };
    target.querySelector('#gt-relic-leave').onclick = () => {
      target.innerHTML = `<p class="gt-sign-done">ויתרת על ${relic.name}. הקמעות שלך נשארו כמו שהם.</p>`;
      finish();
    };
    return;
  }

  target.innerHTML = `
    <div class="gt-relic-got">
      <div class="gt-relic-got-t">🔮 ${relic.name} - אבל אין מקום</div>
      ${gtRelicCardHTML(relic, 'won')}
      <p class="gt-relic-swap-q">כל 5 המקומות תפוסים. על מי לוותר?</p>
      <div class="gt-relic-swap">
        ${run.relics.map((id, i) => {
          const held = gtRelic(id);
          return held ? `<button class="gt-relic-drop" data-i="${i}">${gtRelicCardHTML(held)}<span class="gt-relic-x">✂️ להחליף</span></button>` : '';
        }).join('')}
      </div>
      <button class="btn-secondary btn-full" id="gt-relic-skip">🙅 לוותר על ${relic.name}</button>
    </div>`;

  target.querySelectorAll('.gt-relic-drop').forEach(btn => {
    btn.onclick = () => {
      const i = +btn.dataset.i;
      const out = gtRelic(run.relics[i]);
      run.relics[i] = relic.id;
      target.innerHTML = `<p class="gt-sign-done">✅ ${relic.name} נכנס במקום ${out ? out.name : ''}.</p>`;
      finish();
    };
  });
  const skip = target.querySelector('#gt-relic-skip');
  if (skip) skip.onclick = () => {
    target.innerHTML = `<p class="gt-sign-done">ויתרת על ${relic.name}. הקמעות שלך נשארו כמו שהם.</p>`;
    finish();
  };
}

/* ── the spin ─────────────────────────────────────────────────────────────── */
// Every wheel in the gauntlet turns here. It runs for a couple of seconds and
// settles on its own; the button is there for anyone who does not want to watch,
// and skipping only shortens the settle — it never changes what the wheel found.
const GT_SPIN_STEP = 15;      // px per tick — about 900px a second
const GT_FREE_MS = 1500;      // how long it turns before it starts settling
const GT_STOP_MS = 1600;      // the settle itself
const GT_SKIP_MS = 500;       // ...unless you skip, and then it is brisk
const GT_MIN_TRAVEL = 520;    // it must always run forwards into the card

function gtSpinReel(reel, poolLen, copies) {
  // This page is RTL, and an RTL scroller runs its scrollLeft from 0 down to
  // -(scrollWidth - clientWidth): pushing it positive just clamps at zero, which
  // is a wheel that never turns. So the direction is read off the element and
  // every step, wrap and target is expressed in it.
  const dir = getComputedStyle(reel).direction === 'rtl' ? -1 : 1;
  const one = reel.scrollWidth / copies;          // one full copy of the pool
  const ahead = (a, b) => (dir > 0 ? a >= b : a <= b);
  reel.classList.add('spinning');
  let timer = setInterval(() => {
    reel.scrollLeft += GT_SPIN_STEP * dir;
    // seamless loop: the strip is the same pool repeated, so stepping back one
    // copy is invisible
    if (Math.abs(reel.scrollLeft) > one * (copies - 2)) reel.scrollLeft -= one * dir;
  }, 16);

  return {
    stop(logicalIdx, done, ms) {
      if (timer) { clearInterval(timer); timer = null; }
      const settle = ms || GT_STOP_MS;
      const from = reel.scrollLeft;
      const posOf = el => el.offsetLeft - reel.clientWidth / 2 + el.clientWidth / 2;
      // land on whichever copy of that card is far enough ahead to look like a
      // wheel slowing down rather than a jump
      let card = null, to = 0;
      for (let k = 0; k < copies; k++) {
        const el = reel.children[poolLen * k + logicalIdx];
        if (!el) continue;
        const p = posOf(el);
        if (ahead(p, from + GT_MIN_TRAVEL * dir)) { card = el; to = p; break; }
      }
      if (!card) {                                  // nothing ahead: take the last one
        for (let k = copies - 1; k >= 0; k--) {
          const el = reel.children[poolLen * k + logicalIdx];
          if (el) { card = el; to = posOf(el); break; }
        }
      }
      if (!card) { reel.classList.remove('spinning'); if (done) done(); return; }

      const t0 = Date.now();
      const ease = t => 1 - Math.pow(1 - t, 4);     // long run, slow settle
      const tick = setInterval(() => {
        const t = Math.min(1, (Date.now() - t0) / settle);
        reel.scrollLeft = from + (to - from) * ease(t);
        if (t < 1) return;
        clearInterval(tick);
        reel.scrollLeft = to;
        reel.classList.remove('spinning');
        card.classList.add('won');
        setTimeout(() => { if (done) done(); }, 450);   // a beat before the verdict
      }, 16);
    },
  };
}

// Wires a spin button to a reel. One press starts it; it then runs for a moment
// and settles by itself. While it is running the button becomes SKIP, which does
// the same landing in a hurry. `pick` is called once, when the settle begins.
function gtWireSpin(btn, reel, poolLen, copies, pick, done) {
  let spinner = null, landing = false, autoTimer = null;
  const land = ms => {
    if (landing) return;
    landing = true;
    clearTimeout(autoTimer);
    btn.disabled = true;
    btn.classList.remove('gt-stop-btn');
    btn.style.display = 'none';
    spinner.stop(pick(), done, ms);
  };
  btn.onclick = () => {
    if (!spinner) {
      spinner = gtSpinReel(reel, poolLen, copies);
      btn.textContent = '⏭ דלג';
      btn.classList.add('gt-stop-btn');
      autoTimer = setTimeout(() => land(GT_STOP_MS), GT_FREE_MS);
      return;
    }
    land(GT_SKIP_MS);
  };
}

// The relic reel: same theatre as the player wheel, different cards.
function gtSpinRelicReel(box, target, onLanded) {
  const pool = GT_RELICS.filter(r => !gtHas(r.id) && !r.signatureOnly);
  if (!pool.length) {
    target.innerHTML = `<p class="page-note">יש לך כבר את כל הקמעות במשחק.</p>`;
    return;
  }
  // six copies, landing in the fifth: the strip has to be long enough that a
  // three-second spin is still travelling when it starts to slow down
  const strip = pool.concat(pool, pool, pool, pool, pool);
  box.innerHTML = `
    <div class="gt-reel-wrap"><div class="gt-reel-mark"></div>
      <div class="gt-reel gt-reel-relics" id="gt-rreel">
        ${strip.map(r => `
          <div class="gt-reel-card gt-reel-relic ${r.rarity}">
            <span class="gt-reel-ovr">${r.icon}</span>
            <span class="gt-reel-name">${r.name}</span>
            <span class="gt-reel-pos">${GT_RARITY_HE[r.rarity]}</span>
          </div>`).join('')}
      </div>
    </div>
    <button class="btn-primary btn-full" id="gt-rspin">🔮 סובב</button>`;

  const reel = box.querySelector('#gt-rreel');
  const spin = box.querySelector('#gt-rspin');
  let won = null;
  gtWireSpin(spin, reel, pool.length, 5,
    () => { won = gtDrawRelic(); return pool.indexOf(won); },
    () => { spin.style.display = 'none'; gtGrantRelic(won, target, onLanded); });
}

// The number the player steers by: his XI as it will actually be fielded, with
// the run rule and the relics already in it. Without this a rule that lifts the
// attack by five changes nothing the player can see until the goals arrive.
// Priced against itself as the opponent, so the relics that ask "is he stronger
// than me?" stay quiet, and with no period, so extra-time effects stay out.
function gtSquadLines() {
  if (!state.picks || !state.picks.some(Boolean)) return null;
  const me = gtMyRatings();
  const mod = gtLineMods(me, me, {});
  // A rule that trades attack for defence leaves the headline where it was —
  // correct, but invisible. So the four lines are shown as well, and the
  // headline itself moves with the average of what the lines gained or lost.
  // The whole-team effects are already inside mod.ovr; subtracting that shift
  // out of the average keeps them from counting twice.
  const dLines = (['atk', 'mid', 'def', 'gk'].reduce((s, k) => s + (mod[k] - me[k]), 0)) / 4;
  const dAll = mod.ovr - me.ovr;
  return {
    ovr: Math.round(mod.ovr + (dLines - dAll)),
    atk: Math.round(mod.atk), mid: Math.round(mod.mid),
    def: Math.round(mod.def), gk: Math.round(mod.gk),
    base: Math.round(me.ovr),
  };
}
function gtSquadRating() { const l = gtSquadLines(); return l ? l.ovr : null; }

// The eleven itself, folded away behind the rating: who is on the pitch, where,
// and what he is worth right now — the shop upgrades and the relics included, so
// a player who was trained or peaked reads at his current number, not his card.
function gtSquadPeekHTML() {
  const picks = state.picks || [];
  if (!picks.some(Boolean)) return '';
  const rows = picks.map((p, i) => {
    if (!p) return '';
    const boosted = gtOvrAt(p, i) !== p.player.ovr;
    return `
      <div class="gt-peek-row">
        <span class="gt-peek-pos">${state.slots[i].pos}</span>
        <span class="gt-peek-name">${playerShortName(p.player.name)}</span>
        <span class="gt-peek-club">${clubShortName((TEAMS[p.squad.teamId] || {}).name || '')} ${p.squad.season}</span>
        <span class="gt-peek-ovr ${boosted ? 'up' : ''}">${gtOvrAt(p, i)}</span>
      </div>`;
  }).join('');
  return `<div class="gt-peek" id="gt-squad-peek" hidden>${rows}</div>`;
}

/* ── the strip on the map ──────────────────────────────────────────────────── */
function gtRelicBarHTML() {
  const run = gtRun();
  const held = gtRelicsHeld();
  const slots = [];
  for (let i = 0; i < GT_SLOTS; i++) {
    const r = held[i];
    slots.push(r
      ? `<button class="gt-slot full ${r.rarity}" data-relic="${r.id}" title="${r.name}">${r.icon}</button>`
      : `<span class="gt-slot empty"></span>`);
  }
  // the signature relic sits outside the five, locked, and is drawn that way
  const sig = typeof gtSignatureRelic === 'function' ? gtSignatureRelic() : null;
  const sigSlot = sig
    ? `<button class="gt-slot full sig ${sig.rarity}" data-relic="${sig.id}" title="קמע חתימה">${sig.icon}</button>`
    : '';
  const banner = (run.banner || 0) ? `<span class="gt-banner-tag">🏴 ${gtBannerName(run.banner)}</span>` : '';
  const lines = gtSquadLines();
  return `
    <div class="gt-bar-top">
      <div class="gt-coins">🪙 <b>${run.coins || 0}</b>${banner}${
        typeof gtModBadgeHTML === 'function' ? gtModBadgeHTML() : ''}</div>
      ${lines ? `<button class="gt-squad-ovr" id="gt-squad-toggle" title="לראות את ההרכב">⚽ ההרכב שלך <b>${lines.ovr}</b> <span class="gt-peek-caret">▾</span></button>` : ''}
      <div class="gt-slots">${slots.join('')}${sigSlot}</div>
    </div>
    ${lines ? `<div class="gt-bar-lines" dir="ltr">
      <span>ATK <b>${lines.atk}</b></span><span>MID <b>${lines.mid}</b></span>
      <span>DEF <b>${lines.def}</b></span><span>GK <b>${lines.gk}</b></span></div>` : ''}
    ${gtSquadPeekHTML()}
    <div class="gt-relic-info" id="gt-relic-info"></div>`;
}

function gtWireRelicBar(root) {
  if (typeof gtWireModBadge === 'function') gtWireModBadge(root);
  const toggle = root.querySelector('#gt-squad-toggle');
  const peek = root.querySelector('#gt-squad-peek');
  if (toggle && peek) {
    toggle.onclick = () => {
      peek.hidden = !peek.hidden;
      const caret = toggle.querySelector('.gt-peek-caret');
      if (caret) caret.textContent = peek.hidden ? '▾' : '▴';
    };
  }
  const info = root.querySelector('#gt-relic-info');
  root.querySelectorAll('.gt-slot.full[data-relic]').forEach(b => {
    b.onclick = () => {
      const r = gtRelic(b.dataset.relic);
      if (!r || !info) return;
      const open = info.dataset.open === r.id;
      info.dataset.open = open ? '' : r.id;
      info.innerHTML = open ? '' : `<b>${r.icon} ${r.name}</b> - ${gtNums(r.desc)}`;
    };
  });
}
