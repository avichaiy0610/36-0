// Europe sandbox — one account only, the same one the gauntlet sandbox uses.
//
// Reaching the league phase honestly is a ~3% run even with a perfect draft, so
// the interesting half of this mode is effectively untestable by playing it.
// This panel jumps straight there: pick the opponents, force the results, set
// the squad rating, and re-roll as often as you like.
//
// It cannot leak into anything that counts. A campaign built here is flagged,
// and euSubmit refuses to send a flagged campaign — a sandbox 👑 שמינית הגמר is
// not an achievement.

const EU_ADMIN_EMAIL = 'avichaiy0610@outlook.com';

function euIsAdmin() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return !!(u && u.email === EU_ADMIN_EMAIL);
}

// Forced settings for the NEXT campaign built. Deliberately not persisted: a
// refresh should hand you the honest game back.
let _euForce = { pick: [null, null, null, null], result: 'auto', ovr: null };

function euAdminHTML() {
  if (!euIsAdmin()) return '';
  const rounds = EU_ROUNDS.map((r, i) => `
    <div class="gt-admin-row">
      <label>${r.round}</label>
      <select class="gt-admin-in" data-eu-pick="${i}">
        <option value="">אקראי</option>
        ${r.clubs.map((c, k) => `<option value="${k}"${_euForce.pick[i] === k ? ' selected' : ''}>${c.name} ${c.ovr}</option>`).join('')}
      </select>
    </div>`).join('');

  return `
    <div class="gt-admin">
      <div class="gt-admin-t">🧪 סנדבוקס אירופה <span>רק לחשבון שלך · מסע מכאן לא נספר להישגים</span></div>
      ${rounds}
      <div class="gt-admin-row">
        <label>תוצאות</label>
        <select class="gt-admin-in" id="eu-force-res">
          <option value="auto">רגיל - לפי הסימולציה</option>
          <option value="W">נצח הכל - ישר לשלב הליגה</option>
          <option value="L1">הפסד בסיבוב הראשון</option>
          <option value="L4">הגע לפלייאוף והפסד בו</option>
        </select>
      </div>
      <div class="gt-admin-row">
        <label>דירוג ההרכב</label>
        <input class="gt-admin-in gt-admin-num" id="eu-force-ovr" type="number" min="60" max="99"
               placeholder="כמו שהוא" value="${_euForce.ovr ?? ''}">
        <button class="gt-admin-btn" id="eu-admin-fill">מלא הרכב</button>
      </div>
      <div class="gt-admin-row">
        <button class="gt-admin-btn" id="eu-admin-run">🎲 בנה מסע מחדש</button>
        <button class="gt-admin-btn" id="eu-admin-clear">נקה שמור</button>
      </div>
    </div>`;
}

function euWireAdmin(root) {
  if (!euIsAdmin() || !root) return;
  root.querySelectorAll('[data-eu-pick]').forEach(sel => {
    sel.onchange = () => {
      const i = +sel.dataset.euPick;
      _euForce.pick[i] = sel.value === '' ? null : +sel.value;
    };
  });
  const res = root.querySelector('#eu-force-res');
  if (res) { res.value = _euForce.result; res.onchange = () => (_euForce.result = res.value); }
  const ovr = root.querySelector('#eu-force-ovr');
  if (ovr) ovr.onchange = () => (_euForce.ovr = ovr.value === '' ? null : +ovr.value);

  const fill = root.querySelector('#eu-admin-fill');
  if (fill) fill.onclick = () => {
    const target = _euForce.ovr ?? 88;
    // the gauntlet sandbox already knows how to build an XI at a target rating
    if (typeof gtAdminFillSquad === 'function') gtAdminFillSquad(target);
    euRebuild();
  };
  const run = root.querySelector('#eu-admin-run');
  if (run) run.onclick = euRebuild;
  const clear = root.querySelector('#eu-admin-clear');
  if (clear) clear.onclick = () => { euClear(); euRebuild(); };
}

function euRebuild() {
  euClear();
  _euCampaign = euBuildCampaign();
  euSave(_euCampaign);
  euRender(false);
}

/* ── the hooks the sandbox needs from the real code ───────────────────────── */
// Which club a round draws. Returns null when nothing is forced, and the caller
// falls back to the honest random pick.
function euForcedClub(roundIdx) {
  if (!euIsAdmin()) return null;
  const k = _euForce.pick[roundIdx];
  return k == null ? null : EU_ROUNDS[roundIdx].clubs[k];
}

// Whether a tie's result is being dictated, and to what. 'auto' means play it.
function euForcedOutcome(roundIdx) {
  if (!euIsAdmin() || _euForce.result === 'auto') return null;
  if (_euForce.result === 'W')  return 'W';
  if (_euForce.result === 'L1') return roundIdx === 0 ? 'L' : 'W';
  if (_euForce.result === 'L4') return roundIdx === 3 ? 'L' : 'W';
  return null;
}

// A forced squad rating, applied on top of the real XI's line ratings so the
// shape of the team is kept and only its level moves.
function euForcedLines(me) {
  if (!euIsAdmin() || _euForce.ovr == null) return me;
  const d = _euForce.ovr - me.ovr;
  return { ovr: me.ovr + d, atk: me.atk + d, mid: me.mid + d, def: me.def + d, gk: me.gk + d };
}

function euSandboxActive() {
  return euIsAdmin() && (_euForce.result !== 'auto' || _euForce.ovr != null ||
                         _euForce.pick.some(p => p != null));
}
