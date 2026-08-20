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
