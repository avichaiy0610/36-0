// Sandbox for the ordinary season — one account only.
//
// Testing an edge case in the normal mode means drafting eleven players by hand
// and watching a full season reveal, every single time. This panel builds the XI
// for you: pick a club and a season and take that squad's best eleven, or aim at
// a rating and let it assemble one, then jump straight to the results — or on to
// Europe.
//
// It is a visibility gate, not a lock: the check runs in the browser, so anyone
// determined can open the panel in devtools. That is fine. Nothing here writes
// to the leaderboard — a sandbox season is never submitted.

const SEASON_ADMIN_EMAIL = 'avichaiy0610@outlook.com';

function saIsAdmin() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return !!(u && u.email === SEASON_ADMIN_EMAIL);
}

// Marks the run so nothing it produces reaches the board.
let _saActive = false;
function saMark() { _saActive = true; }
function saSandboxSeason() { return _saActive; }

/* ── building an XI without drafting one ──────────────────────────────────── */
// Straight from one club-season: its best legal player for every slot. This is
// the case the honest draft can never give you — a whole team from one squad —
// and it is exactly what you want when checking "what does Maccabi Haifa 2001/02
// actually rate".
function saFillFromSquad(squadId) {
  const sq = SQUADS.find(s => s.id === squadId);
  if (!sq) return false;
  const slots = FORMATIONS[state.formationId || '4-3-3'].slots;
  state.formationId = state.formationId || '4-3-3';
  state.slots = slots;
  state.picks = new Array(slots.length).fill(null);
  const used = new Set();
  slots.forEach((slot, i) => {
    let best = null;
    for (const p of sq.players) {
      if (used.has(p.name) || !playerFitsSlot(p, slot.pos)) continue;
      if (!best || p.ovr > best.ovr) best = p;
    }
    // a club-season may simply not have a left-back; take the best man left
    if (!best) {
      for (const p of sq.players) {
        if (used.has(p.name)) continue;
        if (!best || p.ovr > best.ovr) best = p;
      }
    }
    if (best) { state.picks[i] = { player: best, squad: sq }; used.add(best.name); }
  });
  return state.picks.some(Boolean);
}

/* ── the panel ────────────────────────────────────────────────────────────── */
function saPanelHTML() {
  if (!saIsAdmin()) return '';
  // clubs that actually have squads, newest season first inside each
  const byTeam = new Map();
  SQUADS.forEach(s => {
    if (!byTeam.has(s.teamId)) byTeam.set(s.teamId, []);
    byTeam.get(s.teamId).push(s);
  });
  const clubs = [...byTeam.keys()]
    .sort((a, b) => ((TEAMS[a] || {}).name || a).localeCompare((TEAMS[b] || {}).name || b, 'he'));
  const options = clubs.map(id => {
    const list = byTeam.get(id).slice().sort((a, b) => parseInt(b.season) - parseInt(a.season));
    return `<optgroup label="${(TEAMS[id] || {}).name || id}">` +
      list.map(s => `<option value="${s.id}">${(TEAMS[id] || {}).name || id} ${s.season}</option>`).join('') +
      `</optgroup>`;
  }).join('');

  return `
    <div class="gt-admin sa-panel">
      <div class="gt-admin-t">🧪 סנדבוקס · דראפט רגיל <span>רק לחשבון שלך · עונה מכאן לא נשמרת ללוח</span></div>
      <div class="gt-admin-row">
        <label>קבוצה ועונה</label>
        <select class="gt-admin-in sa-select" id="sa-squad">${options}</select>
      </div>
      <div class="gt-admin-row">
        <button class="gt-admin-btn" id="sa-fill-squad">🏟 קח את ההרכב הזה</button>
      </div>
      <div class="gt-admin-row">
        <label>או לפי דירוג</label>
        <input class="gt-admin-in gt-admin-num" id="sa-ovr" type="number" min="60" max="99" value="85">
        <button class="gt-admin-btn" id="sa-fill-ovr">בנה הרכב</button>
      </div>
      <div class="gt-admin-row">
        <label>ואז</label>
        <button class="gt-admin-btn" id="sa-season">▶ שחק עונה</button>
        <button class="gt-admin-btn" id="sa-europe">🇪🇺 ישר לאירופה</button>
      </div>
      <p class="gt-admin-state" id="sa-state"></p>
    </div>`;
}

function saWire(root) {
  if (!saIsAdmin() || !root) return;
  const $ = id => root.querySelector('#' + id);
  const state_ = msg => { const el = $('sa-state'); if (el) el.textContent = msg; };
  const built = () => {
    const n = (state.picks || []).filter(Boolean).length;
    state_(n ? `הרכב מוכן: ${n} שחקנים · דירוג ${teamOVR()}` : 'לא הצלחתי לבנות הרכב');
    return n > 0;
  };

  const fillSquad = () => {
    saMark();
    const ok = saFillFromSquad($('sa-squad').value);
    if (!ok) return state_('לסגל הזה אין מספיק שחקנים');
    return built();
  };
  const fillOvr = () => {
    saMark();
    // the gauntlet sandbox already knows how to assemble an XI at a target
    if (typeof gtAdminFillSquad === 'function') gtAdminFillSquad(+$('sa-ovr').value || 85);
    return built();
  };
  if ($('sa-fill-squad')) $('sa-fill-squad').onclick = fillSquad;
  if ($('sa-fill-ovr')) $('sa-fill-ovr').onclick = fillOvr;

  if ($('sa-season')) $('sa-season').onclick = () => {
    if (!(state.picks || []).some(Boolean) && !fillSquad()) return;
    saMark();
    // a season the sandbox built is not a record, so nothing from it is sent
    window._resultSubmitted = true;
    if (typeof clearDraftState === 'function') clearDraftState();
    window._restoredSeason = null; window._presetSeason = null;
    showResults();
  };
  if ($('sa-europe')) $('sa-europe').onclick = () => {
    if (!(state.picks || []).some(Boolean) && !fillSquad()) return;
    saMark();
    if (typeof euClear === 'function') euClear();
    if (typeof _euCampaign !== 'undefined') _euCampaign = null;
    if (typeof euStart === 'function') euStart();
  };
}

// Hangs off the setup screen, which is the one every ordinary game starts from.
function saAttach() {
  const host = document.querySelector('#screen-setup .setup-inner');
  if (!host) return;
  document.getElementById('sa-panel-host')?.remove();
  const html = saPanelHTML();
  if (!html) return;
  const box = document.createElement('div');
  box.id = 'sa-panel-host';
  box.innerHTML = html;
  host.appendChild(box);
  saWire(box);
}
