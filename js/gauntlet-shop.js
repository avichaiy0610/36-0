// The travelling shop, which opens every three fights.
//
// Coins come out of victories and never survive a run, so the only question the
// shop asks is when to burn what you have. Note there are no coaches in 36-0 —
// nothing here buys a bench.

const GT_SHOP = [
  { id: 'training',     icon: '🏋️', name: 'מחנה אימונים', price: 40,
    desc: 'שחקן אחד לבחירתך מתחזק ב-2. אפשר לאמן את אותו שחקן עד תוספת של 4.' },
  { id: 'prime',        icon: '⚡',  name: 'מצב שיא', price: 55,
    desc: 'שחקן אחד לבחירתך מוחלף בגרסה של עונת השיא שלו - הדירוג הכי גבוה שהיה לו אי פעם.' },
  { id: 'agent-wheel',  icon: '🎡',  name: 'גלגל סוכנים', price: 50,
    desc: 'הסוכן מאתר את העמדה החלשה בהרכב ומגריל לה שלוש חלופות טובות יותר. אחת נכנסת.' },
  { id: 'relic-wheel',  icon: '🔮',  name: 'גלגל קמעות', price: 65,
    desc: 'סיבוב אחד על גלגל שכל הקלפים בו קמעות - קמע מובטח.' },
  { id: 'insurance',    icon: '🛡',  name: 'פוליסת ביטוח', price: 125, once: true,
    desc: 'פעם אחת: הפסד לא מסיים את המסע. המשחק פשוט משוחק מחדש מההתחלה.' },
  { id: 'second-stop',  icon: '🎰',  name: 'עצירה שנייה', price: 35, once: true,
    desc: 'בהגרלת השלל הבאה הגלגל עוצר על שני שחקנים, ואתה בוחר מי מהם מצטרף.' },
  { id: 'home-deed',    icon: '🏟',  name: 'שטר קהל בית', price: 45, once: true,
    desc: 'כל המשחקים שנשארו במסע ישוחקו בבית, עם יתרון הביתיות.' },
  { id: 'scout-report', icon: '📋',  name: 'דוח סקאוטים', price: 35, once: true,
    desc: 'עד סוף המסע תראה כמה חזקה כל יריבה בהתקפה, בקישור, בהגנה ובשוער לפני שבוחרים יריבה.' },
];

// Interest, the way goat-lab does it: a wallet you sat on pays you for sitting
// on it. Capped, so hoarding never beats buying.
function gtInterest(coins) { return Math.min(10, Math.floor(coins / 5)); }

function gtPrice(item) { return Math.round(item.price * gtShopDiscount()); }
function gtOwned(item) { return !!(gtRun().effects || {})[_gtEffKey(item.id)]; }
function _gtEffKey(id) {
  return { insurance: 'insurance', 'second-stop': 'secondStop',
           'home-deed': 'homeDeed', 'scout-report': 'scoutReport' }[id] || id;
}

function gtIsShopRow(at) { const r = GM_RUN[at]; return !!r && r.kind === 'shop'; }

function gtShopHTML() {
  const run = gtRun();
  const shopsPassed = GM_RUN.slice(0, run.at).filter(r => r.kind === 'shop').length;
  return `
    <div class="gt-shop">
      <div class="gt-shop-head">
        <span class="gt-shop-title">🛒 החנות הנודדת</span>
        <span class="gt-shop-wallet">🪙 <b id="gt-wallet">${run.coins || 0}</b></span>
      </div>
      <p class="gt-shop-note">🪙 <b>ריבית:</b> בכל ניצחון אתה מקבל מטבע נוסף על כל 5 מטבעות ששמורים אצלך, עד 10 נוספים. כלומר גם לא לבזבז זה משתלם.</p>
      <div class="gt-shop-grid" id="gt-shop-grid">
        ${GT_SHOP.filter(it => !(it.id === 'insurance' && gtModFlag('noInsurance'))).map(it => {
          const price = gtPrice(it);
          const owned = it.once && gtOwned(it);
          const poor = (run.coins || 0) < price;
          return `
          <button class="gt-item ${owned ? 'owned' : ''} ${poor && !owned ? 'poor' : ''}"
                  data-item="${it.id}" ${owned ? 'disabled' : ''}>
            <span class="gt-item-ico">${it.icon}</span>
            <span class="gt-item-name">${it.name}${it.once ? '<span class="gt-once">חד-פעמי</span>' : ''}</span>
            <span class="gt-item-desc">${gtNums(it.desc)}</span>
            <span class="gt-item-price">${owned ? '✅ נרכש' : '🪙 ' + price}</span>
          </button>`;
        }).join('')}
      </div>
      <div id="gt-shop-work"></div>
      <button class="btn-primary btn-full" id="gt-shop-leave">← יוצאים לדרך (חנות ${shopsPassed + 1} מתוך 2)</button>
    </div>`;
}

function gtWireShop(root) {
  const work = root.querySelector('#gt-shop-work');
  const leave = root.querySelector('#gt-shop-leave');
  if (leave) leave.onclick = () => {
    const run = gtRun();
    run.at++;
    gtSave();
    showGauntlet();
  };
  root.querySelectorAll('.gt-item[data-item]').forEach(btn => {
    btn.onclick = () => {
      const item = GT_SHOP.find(i => i.id === btn.dataset.item);
      const run = gtRun();
      if (!item || (item.once && gtOwned(item))) return;
      const price = gtPrice(item);
      if ((run.coins || 0) < price) {
        work.innerHTML = `<p class="gt-shop-poor">אין מספיק מטבעות ל${item.name} - חסרים ${price - (run.coins || 0)}.</p>`;
        return;
      }
      gtBuy(item, price, work);
    };
  });
}

// Payment happens only once the purchase actually resolves — a shop that takes
// the money and then finds nothing to do with it would be a bug the player pays
// for, so every branch below either charges and delivers, or does neither.
function gtCharge(price) {
  const run = gtRun();
  run.coins = (run.coins || 0) - price;
  gtSave();
  gtShopRepaint();
}

// Repaints prices and the wallet in place. Re-rendering the whole screen would
// wipe the panel that is telling the player what he just bought.
function gtShopRepaint() {
  const run = gtRun();
  document.querySelectorAll('#gt-wallet, .gt-coins b').forEach(el => { el.textContent = run.coins || 0; });
  document.querySelectorAll('.gt-item[data-item]').forEach(btn => {
    const item = GT_SHOP.find(i => i.id === btn.dataset.item);
    if (!item) return;
    const owned = item.once && gtOwned(item);
    btn.classList.toggle('owned', !!owned);
    btn.classList.toggle('poor', !owned && (run.coins || 0) < gtPrice(item));
    btn.disabled = !!owned;
    const price = btn.querySelector('.gt-item-price');
    if (price) price.innerHTML = owned ? '✅ נרכש' : '🪙 ' + gtPrice(item);
  });
}

function gtBuy(item, price, work) {
  const run = gtRun();
  const refresh = () => gtShopRepaint();

  if (item.id === 'training' || item.id === 'prime') {
    gtPickPlayerFor(item, price, work);
    return;
  }
  if (item.id === 'relic-wheel') {
    gtCharge(price);
    work.innerHTML = `<div class="gt-spoils"><div class="gt-spoils-title">🔮 גלגל הקמעות</div>
      <div id="gt-rbox"></div><div id="gt-rout"></div></div>`;
    gtSpinRelicReel(work.querySelector('#gt-rbox'), work.querySelector('#gt-rout'), refresh);
    return;
  }
  if (item.id === 'agent-wheel') {
    gtAgentWheel(price, work);
    return;
  }
  // the flag purchases: nothing to choose, they just start applying
  gtCharge(price);
  run.effects = run.effects || {};
  run.effects[_gtEffKey(item.id)] = true;
  gtSave();
  work.innerHTML = `<p class="gt-sign-done">✅ ${item.icon} ${item.name} - נרכש.</p>`;
  refresh();
}

/* ── upgrades that need a name on them ─────────────────────────────────────── */
function gtPickPlayerFor(item, price, work) {
  const run = gtRun();
  const picks = (state.picks || []).map((p, i) => ({ p, i })).filter(o => o.p);
  const eligible = picks.filter(o => item.id === 'training'
    ? ((run.boosts || {})[o.p.player.name] || 0) < 4
    : !(run.peaks || []).includes(o.p.player.name) &&
      (o.p.player.peak_ovr ?? o.p.player.ovr) > o.p.player.ovr);

  if (!eligible.length) {
    work.innerHTML = `<p class="gt-shop-poor">${item.id === 'training'
      ? 'כל השחקנים בהרכב כבר קיבלו את המקסימום.'
      : 'אין בהרכב שחקן שעונת השיא שלו טובה מהעונה שנבחרה.'}</p>`;
    return;
  }
  work.innerHTML = `
    <p class="gt-sign-q">${item.icon} ${item.name} - על מי?</p>
    ${eligible.map(o => {
      const cur = gtOvrAt(o.p);
      const after = item.id === 'training' ? cur + 2 : (o.p.player.peak_ovr ?? o.p.player.ovr);
      return `<button class="gt-sign-opt" data-i="${o.i}">
        <span>${playerShortName(o.p.player.name)} · ${state.slots[o.i].pos}</span>
        <span class="gt-delta up" dir="ltr">${cur} → ${after}</span>
      </button>`;
    }).join('')}
    <button class="btn-secondary btn-full" id="gt-buy-cancel">ביטול</button>`;

  work.querySelectorAll('.gt-sign-opt').forEach(btn => {
    btn.onclick = () => {
      const pick = state.picks[+btn.dataset.i];
      gtCharge(price);
      if (item.id === 'training') {
        run.boosts = run.boosts || {};
        run.boosts[pick.player.name] = (run.boosts[pick.player.name] || 0) + 2;
      } else {
        run.peaks = run.peaks || [];
        run.peaks.push(pick.player.name);
      }
      gtSave();
      gtInvalidateDeltas();
      work.innerHTML = `<p class="gt-sign-done">✅ ${playerShortName(pick.player.name)} - ${item.name}. דירוג ההרכב: <b>${teamOVR(gtOvrAt)}</b></p>`;
      gtShopRepaint();
    };
  });
  const cancel = work.querySelector('#gt-buy-cancel');
  if (cancel) cancel.onclick = () => { work.innerHTML = ''; };
}

/* ── the free-agent wheel ──────────────────────────────────────────────────── */
// It scouts your weakest slot, which is the point: you are not buying a star,
// you are buying a floor. Candidates are drawn from the whole database within
// reach of what you already have there.
function gtWeakestSlot() {
  let worst = -1, worstOvr = 999;
  (state.picks || []).forEach((p, i) => {
    if (!p) return;
    const o = gtOvrAt(p);
    if (o < worstOvr) { worstOvr = o; worst = i; }
  });
  return { i: worst, ovr: worstOvr };
}

function gtAgentPool(slotPos, floor) {
  const mine = new Set((state.picks || []).filter(Boolean).map(p => p.player.name));
  const out = [];
  for (const sq of SQUADS) {
    for (const pl of sq.players) {
      if (mine.has(pl.name)) continue;
      if (pl.ovr < floor + 1 || pl.ovr > floor + 7) continue;
      if (!playerFitsSlot(pl, slotPos)) continue;
      out.push({ ...pl, squad: sq });
    }
  }
  return out;
}

function gtAgentWheel(price, work) {
  const weak = gtWeakestSlot();
  if (weak.i < 0) return;
  const slotPos = state.slots[weak.i].pos;
  const pool = gtAgentPool(slotPos, weak.ovr);
  if (pool.length < 3) {
    work.innerHTML = `<p class="gt-shop-poor">הסוכן לא מצא אף חלופה ל${slotPos} מעל ${weak.ovr}.</p>`;
    return;
  }
  gtCharge(price);
  // three names, one stop — a wheel with the whole database on it would be
  // theatre without a decision behind it
  const shown = [];
  while (shown.length < 3) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!shown.some(s => s.name === c.name)) shown.push(c);
  }
  const strip = shown.concat(shown, shown, shown, shown, shown);
  work.innerHTML = `
    <div class="gt-spoils">
      <div class="gt-spoils-title">🎡 גלגל הסוכנים</div>
      <p class="gt-spoils-sub">העמדה החלשה שלך: ${slotPos} · ${playerShortName(state.picks[weak.i].player.name)} (${weak.ovr})</p>
      <div class="gt-reel-wrap"><div class="gt-reel-mark"></div>
        <div class="gt-reel" id="gt-areel">
          ${strip.map(p => `
            <div class="gt-reel-card">
              <span class="gt-reel-ovr">${p.ovr}</span>
              <span class="gt-reel-name">${playerShortName(p.name)}</span>
              <span class="gt-reel-pos">${p.position} · ${p.squad.season}</span>
            </div>`).join('')}
        </div>
      </div>
      <button class="btn-primary btn-full" id="gt-aspin">🎡 סובב</button>
      <div id="gt-aout"></div>
    </div>`;

  const reel = work.querySelector('#gt-areel');
  const spin = work.querySelector('#gt-aspin');
  let won = null;
  gtWireSpin(spin, reel, shown.length, 5,
    () => { won = shown[Math.floor(Math.random() * shown.length)]; return shown.indexOf(won); },
    () => {
      spin.style.display = 'none';
      const out = state.picks[weak.i];
      state.picks[weak.i] = { player: won, squad: won.squad };
      if (state.usedPlayerKeys) {
        state.usedPlayerKeys.delete(out.player.name);
        state.usedPlayerKeys.add(won.name);
      }
      const run = gtRun();
      run.signings = (run.signings || 0) + 1;   // a shop signing is still a signing
      gtStoreSquad();
      gtInvalidateDeltas();
      work.querySelector('#gt-aout').innerHTML =
        `<p class="gt-sign-done">✅ ${playerShortName(won.name)} נכנס במקום ${playerShortName(out.player.name)} · דירוג ההרכב: <b>${teamOVR(gtOvrAt)}</b></p>`;
    });
}
