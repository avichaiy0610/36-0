// Gauntlet run: one squad, eight fights, one life.
//
// The map itself lives in gauntlet-map.js (fixed clubs, fixed positions). This
// file owns the run — where you are, who you drafted, and what happened — and
// the fight, which is a single match on the V2 engine rather than a season.

const GT_KEY = '36-0-gauntlet';

function gtBlank() {
  return { v: 1, at: 0, formationId: null, picks: null, log: [], over: false };
}
let _gtRun = null;
function gtRun() {
  if (_gtRun) return _gtRun;
  try {
    const raw = JSON.parse(localStorage.getItem(GT_KEY));
    if (raw && raw.v === 1) return (_gtRun = raw);
  } catch (e) { /* corrupt save — start clean */ }
  return (_gtRun = gtBlank());
}
function gtSave() {
  try { localStorage.setItem(GT_KEY, JSON.stringify(gtRun())); } catch (e) {}
}
function gtReset() { _gtRun = gtBlank(); gtSave(); }

/* ── the squad carries across fights ──────────────────────────────────────── */
// Stored the way the draft save stores it — squad id + player name — so a
// refresh can rebuild the exact XI from the data instead of trusting a copy.
function gtStoreSquad() {
  const run = gtRun();
  run.formationId = state.formationId;
  run.picks = state.picks.map(p => p ? { squadId: p.squad.id, name: p.player.name } : null);
  gtSave();
}
function gtRestoreSquad() {
  const run = gtRun();
  if (!run.picks || !FORMATIONS[run.formationId]) return false;
  const bySquad = new Map(SQUADS.map(s => [s.id, s]));
  const picks = run.picks.map(p => {
    if (!p) return null;
    const squad = bySquad.get(p.squadId);
    const player = squad && squad.players.find(x => x.name === p.name);
    return squad && player ? { player, squad } : null;
  });
  if (run.picks.some((p, i) => p && !picks[i])) return false;   // data moved under us
  state.formationId = run.formationId;
  state.slots = FORMATIONS[run.formationId].slots;
  state.picks = picks;
  return true;
}

/* ── starting a fight ─────────────────────────────────────────────────────── */
function gtNodeAt(row, node) {
  const r = GM_RUN[row];
  return r && r.kind === 'fight' ? r.nodes[node] : null;
}

// Clicking a ground on the current row. The first fight drafts an XI; later
// fights reuse the one you already have.
function gtChoose(row, node) {
  const run = gtRun();
  if (run.over || row !== run.at) return;
  const opp = gtNodeAt(row, node);
  if (!opp) return;
  state.gauntlet = { row, node };

  if (gtRestoreSquad()) { gtFight(); return; }

  // a fresh run: draft the XI that will carry the whole gauntlet
  state.leagueCode = null; state.duelCode = null;
  state.challenge = null; state.challengeDeck = null; state.challengeReqs = null;
  state.difficulty = 'normal';
  state.showRatings = true;
  state.draftMode = 'squad-first';
  state.peakMode = false;                       // peak is bought in the shop, not free
  state.eraMin = chalYearMin ? chalYearMin() : 1999;
  state.eraMax = chalYearMax ? chalYearMax() : LATEST_SEASON_YEAR;
  state.oppSeason = null; state.oppSeasonChoice = 'latest';
  state.leagueFormat = 'modern';
  state.formationId = state.formationId || '4-3-3';
  beginDraftWithState();
}

/* ── the fight ────────────────────────────────────────────────────────────── */
// A single match, not a season: the opponent is a real club-season squad, read
// through the same line-ratings helper the league opponents use.
function gtOpponent(node) {
  const sq = SQUADS.find(s => s.teamId === node.teamId && s.season === node.season);
  const name = (TEAMS[node.teamId] || {}).name || node.teamId;
  if (!sq) return { name, ovr: node.ovr, atk: node.ovr, mid: node.ovr, def: node.ovr, gk: node.ovr };
  const lines = simLineRatingsForSquad(sq.players, node.ovr);
  return { name, teamId: node.teamId, season: node.season, ovr: node.ovr, ...lines };
}

// 90 minutes, then extra time, then a coin-flip shootout — penalties are pure
// luck by design until players carry detailed ratings.
function gtPlayMatch(me, opp) {
  const home = Math.random() < 0.5;
  const ninety = simulateMatchV2(me, opp, home);
  if (ninety.outcome !== 'D') return { ...ninety, home, decidedBy: 'זמן רגיל' };

  const et = simulateMatchV2(me, opp, home);
  if (et.outcome !== 'D') {
    return { outcome: et.outcome, gf: ninety.gf + et.gf, ga: ninety.ga + et.ga,
             home, decidedBy: 'הארכה' };
  }
  const won = Math.random() < 0.5;
  return { outcome: won ? 'W' : 'L', gf: ninety.gf + et.gf, ga: ninety.ga + et.ga,
           home, decidedBy: 'פנדלים', pens: true };
}

function gtFight() {
  const run = gtRun();
  const { row, node } = state.gauntlet || {};
  const nodeData = gtNodeAt(row, node);
  if (!nodeData) { showGauntlet(); return; }

  gtStoreSquad();
  const me = myLineRatings();
  const opp = gtOpponent(nodeData);
  const res = gtPlayMatch(me, opp);

  run.log.push({ row, teamId: nodeData.teamId, season: nodeData.season,
                 ovr: nodeData.ovr, gf: res.gf, ga: res.ga, outcome: res.outcome });
  if (res.outcome === 'W') {
    run.at = row + 1;
    while (GM_RUN[run.at] && GM_RUN[run.at].kind === 'shop') run.at++;   // shops are scenery for now
  } else {
    run.over = true;
  }
  gtSave();
  state.gauntlet = null;
  gtShowResult(nodeData, opp, res, me);
}

/* ── result screen ────────────────────────────────────────────────────────── */
function gtShowResult(nodeData, opp, res, me) {
  showScreen('gauntlet-fight');
  const back = document.getElementById('gt-fight-back');
  if (back) back.onclick = () => showGauntlet();
  const run = gtRun();
  const won = res.outcome === 'W';
  const cleared = run.log.filter(l => l.outcome === 'W').length;
  const el = document.getElementById('gt-fight-body');
  if (!el) return;

  el.innerHTML = `
    <div class="gt-res ${won ? 'win' : 'loss'}">
      <div class="gt-res-title">${won ? '✅ ניצחת' : '❌ הפסדת'}</div>
      <div class="gt-res-teams">
        <span class="gt-res-side">ההרכב שלך <b>${me.ovr}</b></span>
        <span class="gt-res-score" dir="ltr">${res.gf} – ${res.ga}</span>
        <span class="gt-res-side">${opp.name} ${nodeData.season} <b>${nodeData.ovr}</b></span>
      </div>
      <div class="gt-res-sub">הוכרע ב${res.decidedBy} · ${res.home ? 'בבית' : 'בחוץ'}</div>
    </div>
    ${won
      ? `<p class="page-note">עברת ${cleared} מתוך 8. הדרך צפונה נפתחה.</p>
         <button class="btn-primary btn-full" id="gt-continue">← המשך במפה</button>`
      : `<p class="page-note">הריצה נגמרה אחרי ${cleared} ניצחונות. חיים אחד, זוכר?</p>
         <button class="btn-primary btn-full" id="gt-restart">🔁 ריצה חדשה</button>`}
    <button class="btn-secondary btn-full" id="gt-tomap">🗺 חזרה למפה</button>
  `;
  const cont = document.getElementById('gt-continue');
  if (cont) cont.onclick = () => showGauntlet();
  const again = document.getElementById('gt-restart');
  if (again) again.onclick = () => { gtReset(); showGauntlet(); };
  const toMap = document.getElementById('gt-tomap');
  if (toMap) toMap.onclick = () => showGauntlet();
}
