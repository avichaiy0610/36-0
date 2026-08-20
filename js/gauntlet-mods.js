// Run rules — one decision before the first fight, in force until the run ends.
//
// A relic is a gift: it only ever helps. A run rule is a bargain, and that is
// the point of it — every one of these costs you something real, so the choice
// is about which weakness you can live with rather than which bonus you like.
// Declining is a legitimate answer and always on the table.
//
// Wired keys (anything else is ignored):
//   atk / mid / def / gk   line deltas, all the time
//   allLines               added to every line
//   normalTime             extra delta during 90' and extra time only
//   oppOvr                 every opponent on the map rated up by this
//   startCoins             coins in the wallet on day one
//   coinMult               multiplier on victory money
//   relicDrop              added to the relic drop chance
//   pens                   shootout win probability (replaces the default)
//   noRescue               the halftime rescue is unavailable
//   noInsurance            the shop will not sell a policy
//   eraYear / eraUp / eraDown   season cutoff, and the deltas either side of it

const GT_MODS = [
  { id: 'total', icon: '⚔️', name: 'כדורגל טוטאלי',
    pro: 'החלוצים והקשרים שלך משחקים כאילו הם טובים ב-5 דירוג יותר',
    con: 'המגנים והשוער משחקים כאילו הם חלשים ב-5 דירוג',
    effects: { atk: 5, mid: 5, def: -5, gk: -5 } },

  { id: 'catenaccio', icon: '🧱', name: 'קטנאצ׳ו',
    pro: 'המגנים והשוער משחקים כאילו הם טובים ב-5 דירוג יותר',
    con: 'החלוצים והקשרים משחקים כאילו הם חלשים ב-5 דירוג',
    effects: { atk: -5, mid: -5, def: 5, gk: 5 } },

  { id: 'rich', icon: '💰', name: 'בעלים עשיר',
    pro: 'נכנסים לקרב הראשון עם 150 מטבעות בקופה',
    con: 'כל הקבוצות במפה מתחזקות ב-2 דירוג',
    effects: { startCoins: 150, oppOvr: 2 } },

  { id: 'noreturn', icon: '💀', name: 'אין דרך חזרה',
    pro: 'פי 1.6 מטבעות על כל ניצחון, ועוד 20% סיכוי שייפול קמע במקום שחקן',
    con: 'בלי רשת ביטחון: אי אפשר להתחזק במחצית כשמפגרים, ואי אפשר לקנות בחנות פוליסה שמבטלת הפסד',
    effects: { coinMult: 1.6, relicDrop: 0.2, noRescue: true, noInsurance: true } },

  { id: 'shootout', icon: '🎯', name: 'מכונת פנדלים',
    pro: 'קרב שמגיע לבעיטות 11 — אתה מנצח בו ב-85% מהמקרים במקום 50%',
    con: 'אבל ב-90 הדקות ובהארכה כל הקבוצה שלך חלשה ב-3 דירוג',
    effects: { pens: 0.85, normalTime: -3 } },

  { id: 'oldschool', icon: '🏛', name: 'דור אחד',
    pro: 'כל שחקן שנבחר מעונת 2005/06 ואחורה מתחזק ב-4 דירוג',
    con: 'כל שחקן מעונת 2006/07 והלאה נחלש ב-3 דירוג',
    effects: { eraYear: 2005, eraUp: 4, eraDown: -3 } },
];

/* ── reading the chosen rule ──────────────────────────────────────────────── */
// Same two forms as the manager helpers: by id for anyone building a run from
// nothing, off the run for everyone else. gtBlank() must use the by-id one.
function gtModById(id) { return id ? (GT_MODS.find(m => m.id === id) || null) : null; }
function gtMod() { return gtModById(gtRun().modId); }
function gtModFx() { return (gtMod() || {}).effects || {}; }
function gtModNum(key) { return Number(gtModFx()[key] || 0); }
function gtModFlag(key) { return !!gtModFx()[key]; }
function gtModStartCoins(id) { return Number(((gtModById(id) || {}).effects || {}).startCoins || 0); }

// A run rule is chosen once, before anything has happened. 'none' is a real
// answer and is stored as one, so the question is never asked twice.
function gtNeedsMod() {
  const run = gtRun();
  return !run.modId && !run.over && !run.at && !(run.log || []).length;
}

/* ── the picker ───────────────────────────────────────────────────────────── */
function gtModPickerHTML() {
  return `
    <div class="gt-opening">
      <div class="gt-opening-kicker">לפני שיוצאים לדרך</div>
      <div class="gt-opening-title">📜 בחר חוק מסע</div>
      <p class="gt-opening-sub">חוק אחד מששה, והוא בתוקף מהקרב הראשון ועד האחרון. לכל חוק יש צד שמרוויח וצד שמשלם — אין כאן מתנות. אפשר גם לוותר ולשחק בלי שום חוק.</p>
      <div class="gt-mod-grid">
        ${GT_MODS.map(m => `
          <button class="gt-mod" data-mod="${m.id}">
            <span class="gt-mod-ico">${m.icon}</span>
            <span class="gt-mod-name">${m.name}</span>
            <span class="gt-mod-pro">✔ ${gtNums(m.pro)}</span>
            <span class="gt-mod-con">✖ ${gtNums(m.con)}</span>
          </button>`).join('')}
      </div>
      <button class="btn-secondary btn-full" id="gt-mod-none">🚫 בלי חוק — יוצאים נקי</button>
    </div>`;
}

function gtWireModPicker(root, done) {
  const choose = id => {
    const run = gtRun();
    run.modId = id;
    run.coins = (run.coins || 0) + gtModStartCoins(id);
    gtSave();
    gtInvalidateDeltas();
    if (done) done();
  };
  root.querySelectorAll('.gt-mod[data-mod]').forEach(btn => {
    btn.onclick = () => choose(btn.dataset.mod);
  });
  const none = root.querySelector('#gt-mod-none');
  if (none) none.onclick = () => choose('none');
}

// The badge on the map, so the bargain you struck stays visible all run.
function gtModBadgeHTML() {
  const m = gtMod();
  if (!m) return '';
  return `<button class="gt-mod-badge" id="gt-mod-badge" title="${m.name}">${m.icon}</button>`;
}
function gtWireModBadge(root) {
  const badge = root.querySelector('#gt-mod-badge');
  const info = root.querySelector('#gt-relic-info');
  if (!badge || !info) return;
  badge.onclick = () => {
    const m = gtMod();
    if (!m) return;
    const open = info.dataset.open === 'mod';
    info.dataset.open = open ? '' : 'mod';
    info.innerHTML = open ? ''
      : `<b>${m.icon} ${m.name}</b> — <span class="gt-mod-pro">✔ ${gtNums(m.pro)}</span> ·
         <span class="gt-mod-con">✖ ${gtNums(m.con)}</span>`;
  };
}
