// Gauntlet sandbox — one account only.
//
// Edge cases in this mode are expensive to reach honestly: a two-legged boss tie
// that goes to penalties needs seven wins first, and a full relic shelf needs a
// dozen spins. This panel jumps straight to them.
//
// Two things keep it from leaking into the real game:
//   1. it is only drawn for the admin account, and
//   2. the moment anything here is used the run is flagged, and a flagged run is
//      never submitted to the board — a sandbox depth of 8 is not a record.

const GT_ADMIN_EMAIL = 'avichaiy0610@outlook.com';

function gtIsAdmin() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return !!(u && u.email === GT_ADMIN_EMAIL);
}

// Anything the panel touches marks the run. gtSubmitRun checks this.
function gtMarkSandbox() {
  const run = gtRun();
  if (!run.sandbox) { run.sandbox = true; gtSave(); }
}

/* ── filling a squad without drafting one ─────────────────────────────────── */
// Takes the best legal player for each slot, so the XI is strong and valid
// without sitting through the draft.
function gtAdminFillSquad(targetOvr) {
  const slots = FORMATIONS[state.formationId || '4-3-3'].slots;
  state.formationId = state.formationId || '4-3-3';
  state.slots = slots;
  state.picks = new Array(slots.length).fill(null);
  const used = new Set();
  slots.forEach((slot, i) => {
    let best = null, bestSq = null;
    for (const sq of SQUADS) {
      for (const pl of sq.players) {
        if (used.has(pl.name) || !playerFitsSlot(pl, slot.pos)) continue;
        // aim at a rating rather than the ceiling, so weak squads are reachable
        const score = -Math.abs(pl.ovr - targetOvr);
        if (!best || score > -Math.abs(best.ovr - targetOvr)) { best = pl; bestSq = sq; }
      }
    }
    if (best) { state.picks[i] = { player: best, squad: bestSq }; used.add(best.name); }
  });
  gtStoreSquad();
  gtInvalidateDeltas();
}

/* ── every crest, in both places it is drawn ──────────────────────────────── */
// A crest is drawn twice in this mode: as a marker on the map (on a light disc)
// and as a badge on a road card. A file can look fine in one and wrong in the
// other, so the gallery shows both, side by side, for every club in the data —
// and says out loud when a file is missing rather than quietly hiding it.
function gtAdminCrestsHTML() {
  const ids = Object.keys(TEAMS).sort();
  // The marker's glow reaches 1.9x its radius, so the viewBox has to be wide
  // enough to hold it — a tight box clips the glow into a square, which is what
  // the odd backing behind some badges was.
  const marker = (id, elite) => `
    <svg viewBox="0 0 60 60" class="ga-crest-map">
      ${gmCrestSVG(30, 30, id, { size: 1.2, state: 'next', elite })}
    </svg>`;
  const cells = ids.map(id => {
    const name = (TEAMS[id] || {}).name || id;
    return `
      <div class="ga-crest" data-id="${id}">
        <img class="gm-road-crest" src="crests/${id}.png" alt=""
             onerror="this.closest('.ga-crest').classList.add('missing')">
        ${marker(id, false)}
        ${marker(id, true)}
        <span class="ga-crest-cap">כרטיס</span>
        <span class="ga-crest-cap">רגיל</span>
        <span class="ga-crest-cap">ELITE</span>
        <span class="ga-crest-name">${name}</span>
        <span class="ga-crest-id" dir="ltr">${id}</span>
      </div>`;
  }).join('');
  return `
    <div class="gt-admin ga-gallery">
      <div class="gt-admin-t">🖼 כל הסמלים
        <span>${ids.length} מועדונים · כל אחד בשלוש התצוגות שבהן הוא מופיע במשחק</span></div>
      <div class="ga-crest-grid">${cells}</div>
      <button class="btn-secondary btn-full" id="ga-crests-back">← חזרה למפה</button>
    </div>`;
}

/* ── the panel ────────────────────────────────────────────────────────────── */
function gtAdminHTML() {
  if (!gtIsAdmin()) return '';
  const run = gtRun();
  const rows = GM_RUN.map((r, i) =>
    `<option value="${i}" ${i === run.at ? 'selected' : ''}>${
      r.kind === 'shop' ? 'שורה ' + i + ' · חנות'
                        : 'שורה ' + i + ' · קרב ' + r.round + (r.boss ? ' (בוס)' : '')}</option>`).join('');
  const relics = GT_RELICS.map(r =>
    `<option value="${r.id}">${r.icon} ${r.name}</option>`).join('');
  const mods = GT_MODS.map(m => `<option value="${m.id}">${m.icon} ${m.name}</option>`).join('');

  return `
    <div class="gt-admin">
      <div class="gt-admin-t">🧪 ארגז חול <span>אדמין בלבד · ריצה מסומנת לא נשלחת ללוח</span></div>

      <div class="gt-admin-row">
        <label>קפיצה לשורה</label>
        <select id="ga-row">${rows}</select>
        <button class="gt-admin-btn" id="ga-goto">קפוץ</button>
      </div>

      <div class="gt-admin-row">
        <label>הרכב אוטומטי בדירוג</label>
        <input type="number" id="ga-ovr" value="83" min="60" max="95">
        <button class="gt-admin-btn" id="ga-fill">מלא</button>
      </div>

      <div class="gt-admin-row">
        <label>מטבעות</label>
        <input type="number" id="ga-coins" value="${run.coins || 0}" min="0">
        <button class="gt-admin-btn" id="ga-setcoins">קבע</button>
      </div>

      <div class="gt-admin-row">
        <label>קמע</label>
        <select id="ga-relic">${relics}</select>
        <button class="gt-admin-btn" id="ga-give">הוסף</button>
        <button class="gt-admin-btn" id="ga-fillrelics">מלא 5</button>
        <button class="gt-admin-btn" id="ga-clearrelics">נקה</button>
      </div>

      <div class="gt-admin-row">
        <label>קמע מסע</label>
        <select id="ga-mod"><option value="">— ללא —</option>${mods}</select>
        <button class="gt-admin-btn" id="ga-setmod">קבע</button>
      </div>

      <div class="gt-admin-row">
        <label>באנר</label>
        <select id="ga-banner">${GT_BANNERS.map((b, i) =>
          `<option value="${i}" ${i === (run.banner || 0) ? 'selected' : ''}>${i ? gtBannerName(i) + ' (+' + b + ')' : 'ללא'}</option>`).join('')}</select>
        <button class="gt-admin-btn" id="ga-setbanner">קבע</button>
      </div>

      <div class="gt-admin-row">
        <label>הקרב הבא</label>
        <button class="gt-admin-btn" id="ga-win">ניצחון מאולץ</button>
        <button class="gt-admin-btn" id="ga-lose">הפסד מאולץ</button>
        <button class="gt-admin-btn" id="ga-pens">תיקו → פנדלים</button>
        <button class="gt-admin-btn" id="ga-normal">בטל אילוץ</button>
      </div>

      <div class="gt-admin-row">
        <label>שלל הבא</label>
        <button class="gt-admin-btn" id="ga-relicdrop">קמע</button>
        <button class="gt-admin-btn" id="ga-playerdrop">שחקן</button>
      </div>

      <div class="gt-admin-row">
        <label>עוד</label>
        <button class="gt-admin-btn" id="ga-insurance">פוליסה</button>
        <button class="gt-admin-btn" id="ga-secondstop">עצירה שנייה</button>
        <button class="gt-admin-btn" id="ga-elite">הגרל ELITE מחדש</button>
        <button class="gt-admin-btn" id="ga-clearbest">אפס שיא</button>
        <button class="gt-admin-btn" id="ga-crests">🖼 כל הסמלים</button>
      </div>

      <div class="gt-admin-row">
        <label>אירופה</label>
        <input class="gt-admin-in gt-admin-num" id="ga-eu-ovr" type="number" min="60" max="99"
               placeholder="דירוג" value="88">
        <button class="gt-admin-btn" id="ga-europe">🇪🇺 קפוץ לאירופה</button>
      </div>

      <p class="gt-admin-state" id="ga-state"></p>
    </div>`;
}

function gtWireAdmin(root) {
  if (!gtIsAdmin()) return;
  const $ = id => root.querySelector('#' + id);
  const state_ = $('ga-state');
  const run = gtRun();
  const say = msg => {
    const r = gtRun();
    if (state_) {
      state_.textContent = msg + ' · שורה ' + r.at + ' · ' + (r.coins || 0) + ' מטבעות · ' +
        (r.relics || []).length + ' קמעות · אילוץ: ' + (r.force || 'אין');
    }
  };
  const after = msg => { gtMarkSandbox(); gtSave(); say(msg); };
  const redraw = msg => { gtMarkSandbox(); gtSave(); showGauntlet(); };

  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };

  on('ga-goto', () => {
    const r = gtRun();
    r.at = +$('ga-row').value;
    r.over = false;
    r.locked = null;
    if (!r.picks) gtAdminFillSquad(+$('ga-ovr').value || 83);
    redraw();
  });
  on('ga-fill', () => { gtAdminFillSquad(+$('ga-ovr').value || 83); redraw(); });
  on('ga-setcoins', () => { gtRun().coins = Math.max(0, +$('ga-coins').value || 0); redraw(); });

  on('ga-give', () => {
    const r = gtRun();
    r.relics = r.relics || [];
    const id = $('ga-relic').value;
    if (!r.relics.includes(id)) r.relics.push(id);
    gtInvalidateDeltas();
    redraw();
  });
  on('ga-fillrelics', () => {
    const r = gtRun();
    r.relics = GT_RELICS.slice(0, GT_SLOTS).map(x => x.id);
    gtInvalidateDeltas();
    redraw();
  });
  on('ga-clearrelics', () => { gtRun().relics = []; gtInvalidateDeltas(); redraw(); });
  on('ga-setmod', () => { gtRun().modId = $('ga-mod').value || 'none'; gtInvalidateDeltas(); redraw(); });
  on('ga-setbanner', () => { gtRun().banner = +$('ga-banner').value || 0; redraw(); });

  on('ga-win', () => { gtRun().force = 'W'; after('הקרב הבא: ניצחון'); });
  on('ga-lose', () => { gtRun().force = 'L'; after('הקרב הבא: הפסד'); });
  on('ga-pens', () => { gtRun().force = 'D'; after('הקרב הבא: תיקו והכרעה בפנדלים'); });
  on('ga-normal', () => { delete gtRun().force; after('אילוץ בוטל'); });

  on('ga-relicdrop', () => { gtRun().forceSpoil = 'relic'; after('השלל הבא: קמע'); });
  on('ga-playerdrop', () => { gtRun().forceSpoil = 'player'; after('השלל הבא: שחקן'); });

  on('ga-insurance', () => {
    const r = gtRun();
    r.effects = r.effects || {};
    r.effects.insurance = true;
    after('פוליסת ביטוח פעילה');
  });
  on('ga-secondstop', () => {
    const r = gtRun();
    r.effects = r.effects || {};
    r.effects.secondStop = true;
    after('אסימון עצירה שנייה פעיל');
  });
  on('ga-elite', () => { delete gtRun().elite; redraw(); });
  // Europe without a season: fill an XI at the asked-for rating and open the
  // campaign screen. Reaching it the honest way means drafting eleven players
  // and sitting through a full season reveal, every single time.
  on('ga-europe', () => {
    const target = +(document.getElementById('ga-eu-ovr') || {}).value || 88;
    gtAdminFillSquad(target);
    gtMarkSandbox();
    if (typeof euClear === 'function') euClear();
    if (typeof _euCampaign !== 'undefined') _euCampaign = null;
    if (typeof euStart === 'function') euStart();
  });

  on('ga-crests', () => {
    const map = document.getElementById('gauntlet-map');
    if (!map) return;
    map.innerHTML = gtAdminCrestsHTML();
    const missing = () => map.querySelectorAll('.ga-crest.missing').length;
    map.querySelector('#ga-crests-back').onclick = () => showGauntlet();
    // the error handlers fire as the images resolve, so count a beat later
    setTimeout(() => {
      const t = map.querySelector('.gt-admin-t span');
      if (t) t.textContent += missing() ? ` · חסרים ${missing()} קבצים` : ' · כל הקבצים נטענו';
    }, 900);
  });

  on('ga-clearbest', () => {
    try { localStorage.removeItem(GT_BEST_KEY); } catch (e) {}
    say('שיא אופס');
  });

  say('מוכן');
}
