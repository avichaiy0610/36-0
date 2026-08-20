// Gauntlet run: one squad, eight fights, one life.
//
// The map itself lives in gauntlet-map.js (fixed clubs, fixed positions). This
// file owns the run — where you are, who you drafted, and what happened — and
// the fight, which is a single match on the V2 engine rather than a season.

const GT_KEY = '36-0-gauntlet';

function gtBlank() {
  return { v: 2, at: 0, started: false, locked: null, formationId: null, picks: null,
           log: [], over: false,
           coins: 0, relics: [], boosts: {}, peaks: [], effects: {}, hotFoot: null };
}
let _gtRun = null;
function gtRun() {
  if (_gtRun) return _gtRun;
  try {
    const raw = JSON.parse(localStorage.getItem(GT_KEY));
    // a v1 save predates coins and relics; it is still a real run, so it keeps
    // its progress and simply starts the economy at zero
    if (raw && raw.v === 1) return (_gtRun = { ...gtBlank(), ...raw, v: 2 });
    if (raw && raw.v === 2) return (_gtRun = raw);
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
  if (run.over) return;
  // A road already taken cannot be swapped: if a fight was entered and left
  // unfinished (a refresh mid-draft), you go back to that same opponent.
  if (run.locked && run.locked.row === run.at) { row = run.locked.row; node = run.locked.node; }
  else if (row !== run.at) return;
  const opp = gtNodeAt(row, node);
  if (!opp) return;
  run.locked = { row, node };
  gtSave();
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
  // עין הרע takes their best player off the teamsheet, which costs them both the
  // line he anchored and a point off the headline rating.
  let players = sq.players;
  let ovr = node.ovr;
  if (typeof gtHas === 'function' && gtHas('evil-eye')) {
    const best = players.reduce((a, b) => (b.ovr > a.ovr ? b : a));
    players = players.filter(p => p !== best);
    ovr -= 1;
  }
  const lines = simLineRatingsForSquad(players, ovr);
  return { name, teamId: node.teamId, season: node.season, ovr, ...lines };
}

// 90 minutes, then extra time, then a shootout. Penalties stay near-random by
// design until players carry detailed ratings — a relic can tilt them, nothing
// in the squad can. `me` arrives unmodified: relics are priced per period, so
// extra time can be worth more than the ninety that preceded it.
function gtPlayMatch(meBase, opp, ctx) {
  const home = gtForceHome() ? true : Math.random() < 0.5;
  const me = gtLineMods(meBase, opp, ctx);
  let ninety = simulateMatchV2(me, opp, home);
  let stoppage = false;

  // דקה 90+3: one goal down at the whistle is not the same as beaten
  if (ninety.outcome === 'L' && ninety.ga - ninety.gf === 1 && Math.random() < gtStoppageChance()) {
    ninety = { outcome: 'D', gf: ninety.gf + 1, ga: ninety.ga };
    stoppage = true;
  }
  if (ninety.outcome !== 'D') return { ...ninety, home, stoppage, decidedBy: 'זמן רגיל' };

  const et = simulateMatchV2(gtLineMods(meBase, opp, { ...ctx, extraTime: true }), opp, home);
  if (et.outcome !== 'D') {
    return { outcome: et.outcome, gf: ninety.gf + et.gf, ga: ninety.ga + et.ga,
             home, stoppage, decidedBy: 'הארכה' };
  }
  const won = Math.random() < gtPensChance();
  return { outcome: won ? 'W' : 'L', gf: ninety.gf + et.gf, ga: ninety.ga + et.ga,
           home, stoppage, decidedBy: 'פנדלים', pens: true };
}

/* ── the purse ────────────────────────────────────────────────────────────── */
// A win over an 88 is worth more than a win over a 79, and a hammering is worth
// more than surviving a shootout. Interest pays on what you walked in holding.
function gtCoinsForWin(node, res) {
  const base = 30 + Math.max(0, node.ovr - 76) * 4 + Math.max(0, res.gf - res.ga) * 5;
  const elite = node.elite ? 20 : 0;
  const interest = gtInterest(gtRun().coins || 0);
  return { win: Math.round((base + elite) * gtCoinMultiplier()), interest };
}

/* ── the match as it happens ──────────────────────────────────────────────── */
// Goals need minutes and scorers, not just a scoreline. Scorers are drawn with
// the same position weights the season simulation uses, so a centre-back
// scoring stays as rare here as it is there.
function gtPickScorer(candidates) {
  const weights = candidates.map(c => GOAL_W[c.pos] ?? 0.5);
  const idx = pickWeightedIdx(weights);
  return idx >= 0 ? candidates[idx] : null;
}
function gtMyScorers() {
  return state.picks.map((p, i) => p && { name: p.player.name, pos: state.slots[i].pos }).filter(Boolean);
}
function gtTheirScorers(node) {
  const sq = SQUADS.find(s => s.teamId === node.teamId && s.season === node.season);
  if (!sq) return [{ name: (TEAMS[node.teamId] || {}).name || 'היריבה', pos: 'ST' }];
  return [...sq.players].sort((a, b) => b.ovr - a.ovr).slice(0, 16)
    .map(p => ({ name: p.name, pos: p.position }));
}
function gtTimeline(res, node) {
  const mine = gtMyScorers(), theirs = gtTheirScorers(node);
  const last = res.decidedBy === 'זמן רגיל' ? 90 : 120;
  const events = [];
  const minutes = new Set();
  const minute = () => {
    let m;
    do { m = 1 + Math.floor(Math.random() * last); } while (minutes.has(m));
    minutes.add(m);
    return m;
  };
  for (let i = 0; i < res.gf; i++) {
    const s = gtPickScorer(mine);
    events.push({ min: minute(), side: 'me', name: s ? playerShortName(s.name) : '',
                  full: s ? s.name : null });
  }
  for (let i = 0; i < res.ga; i++) {
    const s = gtPickScorer(theirs);
    events.push({ min: minute(), side: 'them', name: s ? playerShortName(s.name) : '' });
  }
  events.sort((a, b) => a.min - b.min);
  return { events, last };
}

function gtFight() {
  const run = gtRun();
  const { row, node } = state.gauntlet || {};
  const nodeData = gtNodeAt(row, node);
  if (!nodeData) { showGauntlet(); return; }

  gtStoreSquad();
  gtInvalidateDeltas();
  const me = gtMyRatings();
  const opp = gtOpponent(nodeData);
  const res = gtPlayMatch(me, opp, { boss: !!GM_RUN[row].boss, node: nodeData });

  // הזדמנות שנייה turns one defeat into a shootout; the insurance policy is the
  // blunter instrument behind it, and simply refuses to let the run end.
  if (res.outcome === 'L' && gtHas('second-chance') && !run.effects.usedSecondChance) {
    run.effects.usedSecondChance = true;
    res.outcome = Math.random() < gtPensChance() ? 'W' : 'L';
    res.decidedBy = 'פנדלים';
    res.rescued = 'second-chance';
  }
  if (res.outcome === 'L' && run.effects.insurance) {
    run.effects.insurance = false;
    res.insured = true;
  }

  const timeline = gtTimeline(res, nodeData);
  run.log.push({ row, teamId: nodeData.teamId, season: nodeData.season,
                 ovr: nodeData.ovr, gf: res.gf, ga: res.ga, outcome: res.outcome });
  run.locked = null;                    // the road is done, the next one opens

  if (res.outcome === 'W') {
    const purse = gtCoinsForWin(nodeData, res);
    res.purse = purse;
    run.coins = (run.coins || 0) + purse.win + purse.interest;
    const scorer = timeline.events.filter(e => e.side === 'me').pop();
    run.hotFoot = scorer ? scorer.full : null;      // רגל חמה remembers him
    run.at = row + 1;                               // a shop row is a stop, not scenery
  } else if (res.insured) {
    run.log.pop();                                  // the policy buys the fight back
  } else {
    run.over = true;
  }
  gtSave();
  state.gauntlet = null;
  gtPlayLive(nodeData, opp, res, me, timeline);
}

/* ── live playback ────────────────────────────────────────────────────────── */
// The match is played out on a clock instead of being handed over as a final
// score: goals arrive when they were scored, and you can skip to the whistle.
let _gtTimer = null;
function gtPlayLive(nodeData, opp, res, me, timeline) {
  showScreen('gauntlet-fight');
  const back = document.getElementById('gt-fight-back');
  if (back) back.onclick = () => { gtStopClock(); showGauntlet(); };
  const el = document.getElementById('gt-fight-body');
  if (!el) return;

  const { events, last } = timeline || gtTimeline(res, nodeData);
  const club = (TEAMS[nodeData.teamId] || {}).name || nodeData.teamId;
  el.innerHTML = `
    <div class="gt-live">
      <div class="gt-live-top">
        <span class="gt-live-side">ההרכב שלך<b>${me.ovr}</b></span>
        <!-- The page is RTL, so the flex row puts YOUR side on the right and the
             opponent on the left. The scoreline is dir="ltr", so its first child
             renders leftmost — the opponent's goals must come first, or your own
             score ends up printed beside their name. -->
        <span class="gt-live-score" dir="ltr"><span id="gt-sc-them">0</span> – <span id="gt-sc-me">0</span></span>
        <span class="gt-live-side">${club} ${nodeData.season}<b>${nodeData.ovr}</b></span>
      </div>
      <div class="gt-clock"><span id="gt-min">0</span>'</div>
      <div class="gt-bar"><span id="gt-bar-fill"></span></div>
      <div class="gt-feed" id="gt-feed"></div>
      <button class="btn-secondary btn-full" id="gt-skip">⏩ דלג לסיום</button>
    </div>
    <div id="gt-after"></div>`;

  let min = 0, gf = 0, ga = 0, i = 0;
  const feed = document.getElementById('gt-feed');
  const paint = () => {
    document.getElementById('gt-min').textContent = min;
    document.getElementById('gt-sc-me').textContent = gf;
    document.getElementById('gt-sc-them').textContent = ga;
    document.getElementById('gt-bar-fill').style.width = Math.round((min / last) * 100) + '%';
  };
  const emit = ev => {
    if (ev.side === 'me') gf++; else ga++;
    const row = document.createElement('div');
    row.className = 'gt-ev ' + ev.side;
    row.innerHTML = `<span class="gt-ev-min">${ev.min}'</span>
      <span class="gt-ev-txt">⚽ ${ev.name}</span>
      <span class="gt-ev-score" dir="ltr">${ev.side === 'me' ? gf : ga}</span>`;
    feed.prepend(row);
  };
  const finish = () => {
    gtStopClock();
    min = last; gf = res.gf; ga = res.ga; paint();
    const skip = document.getElementById('gt-skip');
    if (skip) skip.style.display = 'none';
    gtShowResult(nodeData, opp, res, me, document.getElementById('gt-after'));
  };
  const step = () => {
    min++;
    while (i < events.length && events[i].min <= min) emit(events[i++]);
    paint();
    if (min >= last) finish();
  };
  _gtTimer = setInterval(step, 45);
  const skip = document.getElementById('gt-skip');
  if (skip) skip.onclick = () => { while (i < events.length) emit(events[i++]); finish(); };
}
function gtStopClock() { if (_gtTimer) { clearInterval(_gtTimer); _gtTimer = null; } }

/* ── result screen ────────────────────────────────────────────────────────── */
function gtShowResult(nodeData, opp, res, me, target) {
  const run = gtRun();
  const won = res.outcome === 'W';
  const cleared = run.log.filter(l => l.outcome === 'W').length;
  const el = target || document.getElementById('gt-fight-body');
  if (!el) return;

  const notes = [];
  if (res.stoppage) notes.push('🕰 שער שוויון בדקה 90+3');
  if (res.rescued === 'second-chance') notes.push('♻️ הזדמנות שנייה — ההפסד הפך לפנדלים');
  if (res.purse) {
    notes.push(`🪙 ‎+${res.purse.win} על הניצחון` +
      (res.purse.interest ? ` · ‎+${res.purse.interest} ריבית` : ''));
  }

  el.innerHTML = `
    <div class="gt-res ${won ? 'win' : res.insured ? 'saved' : 'loss'}">
      <div class="gt-res-title">${won ? '✅ ניצחת' : res.insured ? '🛡 הפוליסה נכנסה לפעולה' : '❌ הפסדת'}</div>
      <div class="gt-res-sub">הוכרע ב${res.decidedBy} · ${res.home ? 'בבית' : 'בחוץ'}</div>
    </div>
    ${notes.length ? `<div class="gt-res-notes">${notes.map(n => `<span>${n}</span>`).join('')}</div>` : ''}
    ${won
      ? `<p class="page-note">עברת ${cleared} מתוך 8. הדרך צפונה נפתחה.</p>
         <button class="btn-primary btn-full" id="gt-continue">← המשך במפה</button>`
      : res.insured
        ? `<p class="page-note">הפסדת, אבל הביטוח שילם: הריצה ממשיכה והקרב הזה משוחק מחדש.</p>
           <button class="btn-primary btn-full" id="gt-continue">← חזרה לקרב</button>`
        : `<p class="page-note">הריצה נגמרה אחרי ${cleared} ניצחונות.</p>
           <button class="btn-primary btn-full" id="gt-restart">🔁 ריצה חדשה</button>`}
    <button class="btn-secondary btn-full" id="gt-tomap">🗺 חזרה למפה</button>
  `;
  // a win first offers the spoils; the map waits until that is settled
  if (won) gtOfferSpoils(nodeData, el);
  const cont = document.getElementById('gt-continue');
  if (cont) cont.onclick = () => showGauntlet();
  const again = document.getElementById('gt-restart');
  if (again) again.onclick = () => { gtReset(); showGauntlet(); };
  const toMap = document.getElementById('gt-tomap');
  if (toMap) toMap.onclick = () => showGauntlet();
}
