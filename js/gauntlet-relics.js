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
  { id: 'home-crowd', icon: '🏟', name: 'קהל הבית', rarity: 'common',
    desc: 'כל קרב במסע משוחק כמשחק בית — יתרון הביתיות תמיד שלך.' },
  { id: 'concrete', icon: '🧱', name: 'בטון', rarity: 'common',
    desc: 'המגנים והשוער מתחזקים ב-3 דירוג, החלוצים נחלשים ב-1.' },
  { id: 'counter', icon: '⚡', name: 'קונטרה', rarity: 'common',
    desc: 'מול יריבה שחזקה ממך ב-3 דירוג ומעלה, כל הקבוצה שלך מתחזקת ב-2.' },
  { id: 'gloves', icon: '🧤', name: 'כפפות זהב', rarity: 'common',
    desc: 'השוער שלך מתחזק ב-4 דירוג.' },
  { id: 'stoppage', icon: '🕰', name: 'דקה 90+3', rarity: 'uncommon',
    desc: 'אם אתה מפגר בשער אחד בסוף 90 הדקות, יש 20% שייפול לך שער שוויון ברגע האחרון.' },
  { id: 'cool-head', icon: '🥅', name: 'קור רוח', rarity: 'uncommon',
    desc: 'קרב שמגיע לבעיטות 11 — אתה מנצח בו ב-70% מהמקרים במקום 50%.' },
  { id: 'fresh-legs', icon: '⏳', name: 'רגליים טריות', rarity: 'uncommon',
    desc: 'אם הקרב נגרר להארכה, כל הקבוצה שלך מתחזקת ב-3 דירוג — רק להארכה.' },
  { id: 'hot-foot', icon: '🔥', name: 'רגל חמה', rarity: 'uncommon',
    desc: 'מי שכבש לך בקרב הקודם מתחזק ב-3 דירוג בקרב הבא.' },
  { id: 'captain', icon: '👑', name: 'סרט הקפטן', rarity: 'rare',
    desc: 'השחקן הכי טוב בהרכב מתחזק ב-5 דירוג, וכל השאר נחלשים ב-1.' },
  { id: 'evil-eye', icon: '🧿', name: 'עין הרע', rarity: 'rare',
    desc: 'בכל קרב היריבה מפסידה את השחקן הכי טוב שלה — הוא לא עולה בכלל.' },
  { id: 'boss-crowd', icon: '🎺', name: 'חומת הקהל', rarity: 'rare',
    desc: 'בשני קרבות הבוס האחרונים כל הקבוצה שלך מתחזקת ב-4 דירוג.' },
  { id: 'second-chance', icon: '♻️', name: 'הזדמנות שנייה', rarity: 'epic',
    desc: 'פעם אחת במסע: הפסד מתבטל, והקרב מוכרע בבעיטות 11 במקום.' },

  /* ── הסגל ──────────────────────────────────────────────────────────────── */
  { id: 'israel-trail', icon: '🥾', name: 'שביל ישראל', rarity: 'uncommon',
    desc: 'אם 11 השחקנים שלך מגיעים מ-11 עונות שונות, כל הקבוצה מתחזקת ב-2 דירוג.' },
  { id: 'millennium', icon: '🏛', name: 'דור המילניום', rarity: 'uncommon',
    desc: 'כל שחקן שנבחר מעונות 1999/00 עד 2005/06 מתחזק ב-2 דירוג.' },
  { id: 'duo', icon: '🧬', name: 'צמד מוכר', rarity: 'uncommon',
    desc: 'שני שחקנים שנבחרו מאותה קבוצה ומאותה עונה מתחזקים ב-3 דירוג כל אחד.' },
  { id: 'pride', icon: '🇮🇱', name: 'גאוות יחידה', rarity: 'uncommon',
    desc: 'כל שחקן ישראלי בהרכב מתחזק ב-2 דירוג.' },
  { id: 'legionnaire', icon: '✈️', name: 'הלגיונר', rarity: 'uncommon',
    desc: 'כל שחקן חוץ מתחזק ב-3 דירוג, וכל ישראלי נחלש ב-1.' },
  { id: 'babel', icon: '🌍', name: 'מגדל בבל', rarity: 'rare',
    desc: 'אם יש בהרכב שחקנים מ-6 לאומים שונים ומעלה, כל הקבוצה מתחזקת ב-2 דירוג.' },

  /* ── מסלול וכלכלה ──────────────────────────────────────────────────────── */
  { id: 'scout', icon: '🔍', name: 'סקאוט', rarity: 'common',
    desc: 'לפני שבוחרים דרך רואים כמה חזקה כל יריבה בהתקפה, בקישור, בהגנה ובשוער.' },
  { id: 'grass-money', icon: '💰', name: 'כסף מהמדשאה', rarity: 'common',
    desc: 'כל ניצחון משלם 25% יותר מטבעות.' },
  { id: 'agent-friend', icon: '🤝', name: 'חבר של הסוכן', rarity: 'uncommon',
    desc: 'כל מה שקונים בחנות עולה 20% פחות.' },
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
  if (gtHas('hot-foot') && run.hotFoot) add(run.hotFoot, 3);

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
      if (gtHas('pride') && isr) add(p.player.name, 2);
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

  if (gtHas('concrete')) { out.def += 3; out.atk -= 1; }
  if (gtHas('gloves')) out.gk += 4;
  if (gtHas('counter') && opp.ovr - me.ovr >= 3) all(2);
  if (gtHas('boss-crowd') && ctx && ctx.boss) all(4);
  if (gtHas('fresh-legs') && ctx && ctx.extraTime) all(3);
  if (gtHas('israel-trail')) {
    const picks = (state.picks || []).filter(Boolean);
    const seasons = new Set(picks.map(p => p.squad.season));
    if (picks.length === 11 && seasons.size === 11) all(2);
  }
  if (gtHas('babel') && gtNatCount() >= 6) all(2);
  return out;
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

  if (run.relics.length < GT_SLOTS) {
    run.relics.push(relic.id);
    target.innerHTML = `
      <div class="gt-relic-got">
        <div class="gt-relic-got-t">🔮 קמע חדש</div>
        ${gtRelicCardHTML(relic, 'won')}
        <p class="gt-relic-slots">מקומות בשימוש: ${run.relics.length}/${GT_SLOTS}</p>
      </div>`;
    finish();
    return;
  }

  target.innerHTML = `
    <div class="gt-relic-got">
      <div class="gt-relic-got-t">🔮 ${relic.name} — אבל אין מקום</div>
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
// Every wheel in the gauntlet lands through here. The browser's smooth scroll
// was over in a blink and gave the draw away instantly; this runs for close to
// three seconds and spends the last one crawling, which is where the tension in
// a wheel actually lives. Card ticks past → slow → almost stops → one more.
const GT_SPIN_MS = 2900;

// Stepped on a timer rather than requestAnimationFrame, like the match clock:
// same 60fps in a real browser, and it still runs when the tab is driven by a
// headless virtual clock, where rAF simply never fires.
function gtAnimateReel(reel, targetIdx, done) {
  const card = reel.children[targetIdx];
  if (!card) { if (done) done(); return; }
  const from = reel.scrollLeft;
  const to = card.offsetLeft - reel.clientWidth / 2 + card.clientWidth / 2;
  const t0 = Date.now();
  // a quartic ease-out: most of the distance early, the last few cards slowly
  const ease = t => 1 - Math.pow(1 - t, 4);
  reel.classList.add('spinning');
  const timer = setInterval(() => {
    const t = Math.min(1, (Date.now() - t0) / GT_SPIN_MS);
    reel.scrollLeft = from + (to - from) * ease(t);
    if (t < 1) return;
    clearInterval(timer);
    reel.scrollLeft = to;
    reel.classList.remove('spinning');
    card.classList.add('won');
    // a beat after it stops, before the result is spelled out
    setTimeout(() => { if (done) done(); }, 550);
  }, 16);
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
  spin.onclick = () => {
    spin.disabled = true;
    const won = gtDrawRelic();
    gtAnimateReel(reel, pool.length * 4 + pool.indexOf(won), () => {
      spin.style.display = 'none';
      gtGrantRelic(won, target, onLanded);
    });
  };
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
  return `
    <div class="gt-bar-top">
      <div class="gt-coins">🪙 <b>${run.coins || 0}</b>${banner}${
        typeof gtModBadgeHTML === 'function' ? gtModBadgeHTML() : ''}</div>
      <div class="gt-slots">${slots.join('')}${sigSlot}</div>
    </div>
    <div class="gt-relic-info" id="gt-relic-info"></div>`;
}

function gtWireRelicBar(root) {
  if (typeof gtWireModBadge === 'function') gtWireModBadge(root);
  const info = root.querySelector('#gt-relic-info');
  root.querySelectorAll('.gt-slot.full[data-relic]').forEach(b => {
    b.onclick = () => {
      const r = gtRelic(b.dataset.relic);
      if (!r || !info) return;
      const open = info.dataset.open === r.id;
      info.dataset.open = open ? '' : r.id;
      info.innerHTML = open ? '' : `<b>${r.icon} ${r.name}</b> — ${gtNums(r.desc)}`;
    };
  });
}
