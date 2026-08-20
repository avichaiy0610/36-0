// Gauntlet run: one squad, eight fights, one life.
//
// The map itself lives in gauntlet-map.js (fixed clubs, fixed positions). This
// file owns the run — where you are, who you drafted, and what happened — and
// the fight, which is a single match on the V2 engine rather than a season.
//
// The match is played in segments (half, half, extra time) instead of being
// handed over as a final score, because the halftime rescue is a decision taken
// *inside* it: at the break you can buy a second half, and the price is the
// spoils you would have won.

const GT_KEY = '36-0-gauntlet';
const GT_BEST_KEY = '36-0-gauntlet-best';

// Banners: finish the run and it starts again harder. Every opponent on the map
// is rated up by this much, which is enough to turn round 1 into a real fight.
const GT_BANNERS = [0, 2, 4, 6, 8, 10];
function gtBannerBoost(run) { return GT_BANNERS[(run || gtRun()).banner || 0] || 0; }
function gtBannerName(n) { return ['', 'באנר I', 'באנר II', 'באנר III', 'באנר IV', 'באנר V'][n] || ('באנר ' + n); }

// A blank run must be buildable without a run already existing, so nothing here
// may go through gtRun() — hence gtStartCoinsFor(id) rather than gtStartCoins().
function gtBlank(carry) {
  const c = carry || {};
  return { v: 2, at: 0, started: false, locked: null, formationId: null, picks: null,
           log: [], over: false, banner: c.banner || 0, managerId: c.managerId || null,
           modId: c.modId || null,
           coins: gtStartCoinsFor(c.managerId), relics: [], boosts: {}, peaks: [],
           effects: {}, hotFoot: null };
}
let _gtRun = null;
function gtRun() {
  if (_gtRun) return _gtRun;
  // Only the parse is guarded. Wrapping the run construction too would swallow a
  // real error and then retry it, which turns one bug into a frozen tab.
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(GT_KEY)); } catch (e) { raw = null; }
  if (raw && raw.v === 2) return (_gtRun = raw);
  // a v1 save predates coins and relics; it is still a real run, so it keeps its
  // progress and simply starts the economy at zero
  if (raw && raw.v === 1) return (_gtRun = { ...gtBlank(), ...raw, v: 2, coins: 0 });
  return (_gtRun = gtBlank());
}
function gtSave() {
  try { localStorage.setItem(GT_KEY, JSON.stringify(gtRun())); } catch (e) {}
}
// A reset keeps what belongs to the player rather than to the run: the banner
// he earned, and the manager he hired for it.
function gtReset(carry) {
  const old = gtRun();
  _gtRun = gtBlank(carry || { banner: old.banner, managerId: old.managerId });
  gtSave();
}

/* ── the record book ──────────────────────────────────────────────────────── */
function gtBest() {
  try { return JSON.parse(localStorage.getItem(GT_BEST_KEY)) || { depth: 0, banner: 0, cleared: false }; }
  catch (e) { return { depth: 0, banner: 0, cleared: false }; }
}
function gtRecordRun(run, cleared) {
  const best = gtBest();
  const depth = (run.log || []).filter(l => l.outcome === 'W').length;
  const better = depth > best.depth || (depth === best.depth && (run.banner || 0) > (best.banner || 0));
  if (!better && !(cleared && !best.cleared)) return best;
  const next = { depth: Math.max(depth, best.depth), banner: Math.max(run.banner || 0, best.banner || 0),
                 cleared: best.cleared || !!cleared, at: new Date().toISOString().slice(0, 10) };
  try { localStorage.setItem(GT_BEST_KEY, JSON.stringify(next)); } catch (e) {}
  return next;
}

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

/* ── the opponent ─────────────────────────────────────────────────────────── */
// A real club-season squad, read through the same line-ratings helper the league
// opponents use, then bent by whatever is in play: the banner level, the deal
// signed with a manager, and any relic that touches the other side.
function gtOpponent(node) {
  const run = gtRun();
  const sq = SQUADS.find(s => s.teamId === node.teamId && s.season === node.season);
  const name = (TEAMS[node.teamId] || {}).name || node.teamId;
  const lift = gtBannerBoost(run) + gtDealNum('oppOvr') + gtModNum('oppOvr');
  if (!sq) {
    const flat = node.ovr + lift;
    return { name, ovr: flat, atk: flat, mid: flat, def: flat, gk: flat };
  }
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
  const out = { name, teamId: node.teamId, season: node.season, ovr: ovr + lift };
  ['atk', 'mid', 'def', 'gk'].forEach(k => { out[k] = lines[k] + lift; });
  return out;
}

// The rating a node advertises on the map — the banner is part of the map, not
// a surprise waiting inside the fight.
function gtShownOvr(node) { return node.ovr + gtBannerBoost() + gtDealNum('oppOvr') + gtModNum('oppOvr'); }

/* ── the purse ────────────────────────────────────────────────────────────── */
// A win over an 88 is worth more than a win over a 79, and a hammering is worth
// more than surviving a shootout. Interest pays on what you walked in holding.
function gtCoinsForWin(node, res) {
  const base = 30 + Math.max(0, gtShownOvr(node) - 76) * 4 + Math.max(0, res.gf - res.ga) * 5;
  const elite = node.elite ? 20 : 0;
  const interest = gtInterest(gtRun().coins || 0);
  return { win: Math.round((base + elite) * gtCoinMultiplier()), interest };
}

/* ── scorers ──────────────────────────────────────────────────────────────── */
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

/* ── the fight, played in segments ────────────────────────────────────────── */
// One live fight at a time, held here so the halftime panel can reach it.
let _gtF = null;

function gtFight() {
  const run = gtRun();
  const { row, node } = state.gauntlet || {};
  const nodeData = gtNodeAt(row, node);
  if (!nodeData) { showGauntlet(); return; }

  gtStoreSquad();
  gtInvalidateDeltas();
  _gtF = {
    row, node: nodeData,
    me: gtMyRatings(),
    opp: gtOpponent(nodeData),
    home: gtForceHome() ? true : Math.random() < 0.5,
    boss: !!GM_RUN[row].boss,
    gf: 0, ga: 0, boost: 0, forfeit: false, rescued: false, stoppage: false,
    events: [], minutes: new Set(), decidedBy: 'זמן רגיל',
    // A boss is not decided by ninety minutes of luck: two legs, aggregate score.
    leg: 1, legs: GM_RUN[row].boss ? 2 : 1, aggGf: 0, aggGa: 0,
  };
  // the first leg of a two-legged tie is away, so the decider is at home —
  // unless something already promised you home ground for everything
  if (_gtF.legs === 2 && !gtForceHome()) _gtF.home = false;
  state.gauntlet = null;
  gtRenderFight();
  gtSegment('h1');
}

// Half a match is the same model with half the chances: expected goals are
// scaled by the share of the game being played, and drawn by the same binomial
// the league uses, so a 45-minute period is not a different sport.
function gtSimSegment(share, ctx) {
  const f = _gtF;
  const me = gtLineMods(f.me, f.opp, ctx);
  if (f.boost) ['ovr', 'atk', 'mid', 'def', 'gk'].forEach(k => { me[k] += f.boost; });
  const a = simShrinkLines(me), b = simShrinkLines(f.opp);
  const mine = typeof gtXgMultiplier === 'function' ? gtXgMultiplier(ctx) : 1;
  return {
    gf: simDrawGoals(simExpectedGoals(a, b, f.home) * share * mine),
    ga: simDrawGoals(simExpectedGoals(b, a, !f.home) * share),
  };
}

function gtMinuteIn(from, to) {
  const f = _gtF;
  let m;
  do { m = from + 1 + Math.floor(Math.random() * (to - from)); } while (f.minutes.has(m));
  f.minutes.add(m);
  return m;
}
function gtAddGoals(n, side, from, to) {
  const f = _gtF;
  const pool = side === 'me' ? gtMyScorers() : gtTheirScorers(f.node);
  for (let i = 0; i < n; i++) {
    const s = gtPickScorer(pool);
    f.events.push({ min: gtMinuteIn(from, to), side, name: s ? playerShortName(s.name) : '', full: s ? s.name : null });
  }
  f.events.sort((a, b) => a.min - b.min);
}

// The phases of a fight, in order. Each one simulates its own goals, plays them
// out on the clock, and hands over to the next.
function gtSegment(phase) {
  const f = _gtF;
  if (phase === 'h1') {
    const r = gtSimSegment(0.5, { boss: f.boss, half: 1 });
    f.gf += r.gf; f.ga += r.ga;
    gtAddGoals(r.gf, 'me', 0, 45); gtAddGoals(r.ga, 'them', 0, 45);
    gtPlayTo(45, () => gtHalftime());
    return;
  }
  if (phase === 'h2') {
    const r = gtSimSegment(0.5, { boss: f.boss, half: 2 });
    f.gf += r.gf; f.ga += r.ga;
    gtAddGoals(r.gf, 'me', 45, 90); gtAddGoals(r.ga, 'them', 45, 90);
    gtPlayTo(90, () => {
      // דקה 90+3: one goal down at the whistle is not the same as beaten
      if (f.ga - f.gf === 1 && Math.random() < gtStoppageChance()) {
        f.gf += 1; f.stoppage = true;
        gtAddGoals(1, 'me', 88, 90);
        gtPaintScore();
      }
      if (f.leg < f.legs) return gtEndLeg();
      const me = f.aggGf + f.gf, them = f.aggGa + f.ga;
      if (me !== them) return gtFinish(me > them ? 'W' : 'L');
      f.decidedBy = f.legs > 1 ? 'הארכה במשחק הגומלין' : 'הארכה';
      gtSegment('et');
    });
    return;
  }
  if (phase === 'et') {
    const r = gtSimSegment(1 / 3, { boss: f.boss, extraTime: true });
    f.gf += r.gf; f.ga += r.ga;
    gtAddGoals(r.gf, 'me', 90, 120); gtAddGoals(r.ga, 'them', 90, 120);
    gtPlayTo(120, () => {
      const me = f.aggGf + f.gf, them = f.aggGa + f.ga;
      if (me !== them) return gtFinish(me > them ? 'W' : 'L');
      f.decidedBy = 'פנדלים';
      f.pens = true;
      gtFinish(Math.random() < gtPensChance() ? 'W' : 'L');
    });
  }
}

/* ── between the legs ─────────────────────────────────────────────────────── */
// The first leg ends, the aggregate opens, and the second leg starts from 0-0 at
// the other ground. The rescue resets with it: it is once per match, not once
// per tie, and forfeiting the spoils in the first leg still costs them.
function gtEndLeg() {
  const f = _gtF;
  f.aggGf += f.gf; f.aggGa += f.ga;
  const el = document.getElementById('gt-after');
  const lead = f.aggGf > f.aggGa ? 'אתה מוביל' : f.aggGf < f.aggGa ? 'אתה מפגר' : 'תיקו';
  el.innerHTML = `
    <div class="gt-half">
      <div class="gt-half-t">🔚 סוף המשחק הראשון · ${lead} במאזן</div>
      <p class="gt-half-p">מאזן: <b dir="ltr">${f.aggGa} – ${f.aggGf}</b>.
         משחק הגומלין ${f.home ? 'בחוץ' : 'בבית'} מכריע - תיקו במאזן הולך להארכה ולפנדלים.</p>
      <button class="btn-primary btn-full" id="gt-leg2">למשחק הגומלין ←</button>
    </div>`;
  document.getElementById('gt-leg2').onclick = () => {
    f.leg++;
    f.gf = 0; f.ga = 0; f.events = []; f.minutes = new Set(); f.shown = 0; f.min = 0;
    f.boost = 0; f.rescued = false;
    if (!gtForceHome()) f.home = !f.home;
    gtRenderFight();
    gtSegment('h1');
  };
}

/* ── the break ────────────────────────────────────────────────────────────── */
// Behind at the break, you can throw everything forward — and the price is the
// wheel you would have spun after the whistle. Winning is never free here.
function gtHalftime() {
  const f = _gtF;
  const el = document.getElementById('gt-after');
  // in a two-legged tie it is the aggregate that decides whether you are behind
  const me = f.aggGf + f.gf, them = f.aggGa + f.ga;
  const canRescue = me <= them && !f.rescued && !gtDealFlag('noRescue') && !gtModFlag('noRescue');
  if (!canRescue) { gtSegment('h2'); return; }

  el.innerHTML = `
    <div class="gt-half">
      <div class="gt-half-t">⏸ מחצית · ${me === them ? 'תיקו' : 'אתה מפגר'}${f.legs > 1 ? ' במאזן' : ''}</div>
      <p class="gt-half-p">אפשר לפרוק הכול על 45 הדקות הבאות: <b>כל הקבוצה שלך מתחזקת ב-5 דירוג</b>.
         המחיר: אם תנצח, <b>לא תהיה הגרלת שלל</b> בקרב הזה.</p>
      <button class="btn-primary btn-full" id="gt-rescue">🔥 הכול קדימה (ויתור על השלל)</button>
      <button class="btn-secondary btn-full" id="gt-nores">ממשיכים כרגיל ←</button>
    </div>`;
  document.getElementById('gt-rescue').onclick = () => {
    f.boost = 5; f.forfeit = true; f.rescued = true;
    el.innerHTML = '<p class="gt-half-note">🔥 יוצאים להתקפה מלאה - ויתרת על השלל של הקרב הזה.</p>';
    gtSegment('h2');
  };
  document.getElementById('gt-nores').onclick = () => { el.innerHTML = ''; gtSegment('h2'); };
}

/* ── live playback ────────────────────────────────────────────────────────── */
let _gtTimer = null;
function gtStopClock() { if (_gtTimer) { clearInterval(_gtTimer); _gtTimer = null; } }

function gtRenderFight() {
  const f = _gtF;
  showScreen('gauntlet-fight');
  const back = document.getElementById('gt-fight-back');
  if (back) back.onclick = () => { gtStopClock(); _gtF = null; showGauntlet(); };
  const el = document.getElementById('gt-fight-body');
  if (!el) return;
  const club = (TEAMS[f.node.teamId] || {}).name || f.node.teamId;
  el.innerHTML = `
    <div class="gt-live">
      <div class="gt-live-top">
        <span class="gt-live-side">ההרכב שלך<b>${f.me.ovr}</b></span>
        <!-- The page is RTL, so the flex row puts YOUR side on the right and the
             opponent on the left. The scoreline is dir="ltr", so its first child
             renders leftmost — the opponent's goals must come first, or your own
             score ends up printed beside their name. -->
        <span class="gt-live-score" dir="ltr"><span id="gt-sc-them">0</span> – <span id="gt-sc-me">0</span></span>
        <span class="gt-live-side">${club} ${f.node.season}<b>${Math.round(f.opp.ovr)}</b></span>
      </div>
      <div class="gt-clock"><span id="gt-min">0</span>'${f.home ? ' · בבית' : ' · בחוץ'}${
        f.legs > 1 ? ` · משחק ${f.leg} מתוך 2` : ''}${
        f.leg > 1 ? ` · מאזן <span dir="ltr">${f.aggGa}–${f.aggGf}</span>` : ''}</div>
      <div class="gt-bar"><span id="gt-bar-fill"></span></div>
      <div class="gt-feed" id="gt-feed"></div>
      <button class="btn-secondary btn-full" id="gt-skip">⏩ דלג לסוף הקטע</button>
    </div>
    <div id="gt-after"></div>`;
  f.shown = 0;                     // events already on the feed
  f.min = 0;
}

function gtPaintScore() {
  const f = _gtF;
  const on = f.events.filter(e => e.min <= f.min);
  const me = on.filter(e => e.side === 'me').length;
  const them = on.filter(e => e.side === 'them').length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('gt-min', f.min); set('gt-sc-me', me); set('gt-sc-them', them);
  const bar = document.getElementById('gt-bar-fill');
  if (bar) bar.style.width = Math.round((f.min / 120) * 100) + '%';
}

function gtPlayTo(target, done) {
  const f = _gtF;
  const feed = document.getElementById('gt-feed');
  const skip = document.getElementById('gt-skip');
  if (skip) { skip.style.display = ''; skip.onclick = () => { f.min = target; flush(); end(); }; }

  const flush = () => {
    while (f.shown < f.events.length && f.events[f.shown].min <= f.min) {
      const ev = f.events[f.shown++];
      const upto = f.events.slice(0, f.shown).filter(e => e.side === ev.side).length;
      const row = document.createElement('div');
      row.className = 'gt-ev ' + ev.side;
      row.innerHTML = `<span class="gt-ev-min">${ev.min}'</span>
        <span class="gt-ev-txt">⚽ ${ev.name}</span>
        <span class="gt-ev-score" dir="ltr">${upto}</span>`;
      if (feed) feed.prepend(row);
    }
    gtPaintScore();
  };
  const end = () => { gtStopClock(); if (skip) skip.style.display = 'none'; done(); };

  gtStopClock();
  _gtTimer = setInterval(() => {
    f.min++;
    flush();
    if (f.min >= target) end();
  }, 45);
}

/* ── the whistle ──────────────────────────────────────────────────────────── */
function gtFinish(outcome) {
  const f = _gtF;
  const run = gtRun();
  const res = { outcome, gf: f.aggGf + f.gf, ga: f.aggGa + f.ga, home: f.home,
                decidedBy: f.decidedBy, pens: !!f.pens, stoppage: f.stoppage,
                forfeit: f.forfeit, twoLegs: f.legs > 1 };

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

  run.log.push({ row: f.row, teamId: f.node.teamId, season: f.node.season,
                 ovr: gtShownOvr(f.node), gf: res.gf, ga: res.ga, outcome: res.outcome });
  run.locked = null;                    // the road is done, the next one opens

  if (res.outcome === 'W') {
    const purse = gtCoinsForWin(f.node, res);
    res.purse = purse;
    run.coins = (run.coins || 0) + purse.win + purse.interest;
    const scorer = f.events.filter(e => e.side === 'me').pop();
    run.hotFoot = scorer ? scorer.full : null;      // רגל חמה remembers him
    run.at = f.row + 1;                             // a shop row is a stop, not scenery
    if (run.at >= GM_RUN.length) { gtRecordRun(run, true); gtSubmitRun(run, true); }
  } else if (res.insured) {
    run.log.pop();                                  // the policy buys the fight back
  } else {
    run.over = true;
    gtRecordRun(run, false);
    gtSubmitRun(run, false);
  }
  gtSave();
  gtShowResult(res);
}

/* ── sending a finished run to the board ──────────────────────────────────── */
// Called once per run, when it is over either way. Signed out, it does nothing
// and says nothing: the gauntlet is playable without an account, and the local
// record book already holds the run.
async function gtSubmitRun(run, cleared) {
  if (run.submitted) return;
  run.submitted = true;
  gtSave();
  if (typeof _supabase === 'undefined' || !_supabase) return;
  try {
    const { data: { user } = {} } = await _supabase.auth.getUser();
    if (!user) return;
    const wins = (run.log || []).filter(l => l.outcome === 'W');
    const eliteBeaten = wins.some(l => {
      const row = GM_RUN[l.row];
      const n = row && row.nodes && row.nodes.find(x => x.teamId === l.teamId && x.season === l.season);
      return !!(n && n.elite);
    });
    await _supabase.rpc('submit_gauntlet_run', {
      p: {
        depth: wins.length,
        cleared: !!cleared,
        banner: run.banner || 0,
        team_ovr: (state.picks && state.picks.some(Boolean)) ? teamOVR(gtOvrAt) : null,
        coins: run.coins || 0,
        signings: run.signings || 0,
        beat_elite: eliteBeaten,
        relics: run.relics || [],
        squad: run.picks || null,
        log: run.log || [],
      },
    });
  } catch (e) { /* the board is a nice-to-have; a run is never lost to it */ }
}

/* ── the end of the road ──────────────────────────────────────────────────── */
// Clearing the map does not finish the gauntlet, it raises it: you hang a banner
// and start again with every opponent rated up. The squad, the coins and the
// relics do not come with you — only the banner does.
function gtVictoryHTML() {
  const run = gtRun();
  const next = Math.min(GT_BANNERS.length - 1, (run.banner || 0) + 1);
  const held = gtRelicsHeld();
  const beaten = (run.log || []).filter(l => l.outcome === 'W');
  const toughest = beaten.reduce((a, b) => (!a || b.ovr > a.ovr ? b : a), null);
  return `
    <div class="gt-victory">
      <div class="gt-vic-kicker">${run.banner ? gtBannerName(run.banner) + ' הושלם' : 'המסע הושלם'}</div>
      <div class="gt-vic-title">🏆 עברת את כל שמונת הקרבות</div>
      <div class="gt-vic-stats">
        <div><b>${beaten.length}</b><span>ניצחונות</span></div>
        <div><b>${toughest ? toughest.ovr : '-'}</b><span>היריבה החזקה</span></div>
        <div><b>${run.coins || 0}</b><span>מטבעות שנשארו</span></div>
        <div><b>${held.length}</b><span>קמעות</span></div>
      </div>
      ${held.length ? `<div class="gt-vic-relics">${held.map(r => `<span title="${r.name}">${r.icon}</span>`).join('')}</div>` : ''}
      ${next > (run.banner || 0)
        ? `<p class="gt-vic-next">הריצה הבאה תהיה ב<b>${gtBannerName(next)}</b> - כל יריבה על המפה מתחזקת ב-${GT_BANNERS[next]}.</p>
           <button class="btn-primary btn-full" id="gt-banner-up">🏴 להניף באנר ולרוץ שוב</button>`
        : `<p class="gt-vic-next">סיימת את ${gtBannerName(run.banner)} - הרמה הגבוהה ביותר. אין מעל זה.</p>
           <button class="btn-primary btn-full" id="gt-banner-up">🔁 ריצה נוספת ב${gtBannerName(run.banner)}</button>`}
    </div>`;
}

function gtWireVictory(root) {
  const btn = root.querySelector('#gt-banner-up');
  if (!btn) return;
  btn.onclick = () => {
    const run = gtRun();
    const next = Math.min(GT_BANNERS.length - 1, (run.banner || 0) + 1);
    gtReset({ banner: next, managerId: run.managerId });
    showGauntlet();
  };
}

function gtShowResult(res) {
  const f = _gtF;
  const run = gtRun();
  const won = res.outcome === 'W';
  const cleared = run.log.filter(l => l.outcome === 'W').length;
  const el = document.getElementById('gt-fight-body');
  if (!el) return;
  const done = won && run.at >= GM_RUN.length;

  const notes = [];
  if (res.stoppage) notes.push('🕰 שער שוויון בדקה 90+4');
  if (res.rescued === 'second-chance') notes.push('♻️ הזדמנות שנייה - ההפסד הפך לפנדלים');
  if (res.forfeit && won) notes.push('🔥 חיזוק המחצית נלקח - אין שלל');
  if (res.purse) {
    notes.push(`🪙 ‎+${res.purse.win} על הניצחון` +
      (res.purse.interest ? ` · ‎+${res.purse.interest} ריבית` : ''));
  }

  el.innerHTML = `
    <div class="gt-res ${won ? 'win' : res.insured ? 'saved' : 'loss'}">
      <div class="gt-res-title">${won ? '✅ ניצחת' : res.insured ? '🛡 הפוליסה נכנסה לפעולה' : '❌ הפסדת'}</div>
      <div class="gt-res-sub">הוכרע ב${res.decidedBy} · ${res.twoLegs ? 'מאזן שני משחקים' : res.home ? 'בבית' : 'בחוץ'}</div>
    </div>
    ${notes.length ? `<div class="gt-res-notes">${notes.map(n => `<span>${n}</span>`).join('')}</div>` : ''}
    ${done
      ? `<p class="page-note">🏆 עברת את כל שמונת הקרבות.</p>
         <button class="btn-primary btn-full" id="gt-continue">← למסך הסיום</button>`
      : won
        ? `<p class="page-note">עברת ${cleared} מתוך 8. הדרך צפונה נפתחה.</p>
           <button class="btn-primary btn-full" id="gt-continue">← המשך במפה</button>`
        : res.insured
          ? `<p class="page-note">הפסדת, אבל הביטוח שילם: הריצה ממשיכה והקרב הזה משוחק מחדש.</p>
             <button class="btn-primary btn-full" id="gt-continue">← חזרה לקרב</button>`
          : `<p class="page-note">הריצה נגמרה אחרי ${cleared} ניצחונות.</p>
             <button class="btn-primary btn-full" id="gt-restart">🔁 ריצה חדשה</button>`}
    <button class="btn-secondary btn-full" id="gt-tomap">🗺 חזרה למפה</button>
  `;
  // a win offers the spoils — unless they were spent at halftime
  if (won && !res.forfeit && f) gtOfferSpoils(f.node, el);

  const cont = document.getElementById('gt-continue');
  if (cont) cont.onclick = () => { _gtF = null; showGauntlet(); };
  const again = document.getElementById('gt-restart');
  if (again) again.onclick = () => { _gtF = null; gtReset(); showGauntlet(); };
  const toMap = document.getElementById('gt-tomap');
  if (toMap) toMap.onclick = () => { _gtF = null; showGauntlet(); };
}
