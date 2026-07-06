// ─── Shared league reveal (async "leagues with friends") ───────────────────────
// When a league is complete, each member watches the EXACT normal after-draft
// results page for their own team — same rules, playoff, tier and stats — only
// the league table also contains the friends' teams (instead of some AI teams).
// Everything is deterministic (seed derived from league code + username), so the
// season, scorers and the friends' points are identical for everyone and on every
// re-run. This reuses the real single-player engine via a seeded Math.random.

function lgSimSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}
function lgAvgOvr(players) {
  if (!players || !players.length) return 75;
  const top = [...players].sort((a, b) => (b.ovr || 0) - (a.ovr || 0)).slice(0, 11);
  return Math.round(top.reduce((s, p) => s + (p.ovr || 0), 0) / top.length);
}

// Run fn with Math.random replaced by a seeded generator, so the existing
// (Math.random-based) simulation becomes fully reproducible.
function withSeededRandom(seed, fn) {
  const orig = Math.random;
  Math.random = mulberry32(seed >>> 0 || 1);
  try { return fn(); } finally { Math.random = orig; }
}

// Rebuild the single-player `state` from a member's stored squad so the results
// screen (pitch, player stats, OVR card, tier) renders their team.
function lgReconstructState(players, formationLabel, settings) {
  const fKey = Object.keys(FORMATIONS).find(k => FORMATIONS[k].label === formationLabel) || '4-3-3';
  const slots = FORMATIONS[fKey].slots;
  const picks = slots.map(slot => {
    const pl = (players || []).find(p => p.slotId === slot.id);
    if (!pl) return null;
    const squad = SQUADS.find(s => s.teamId === pl.teamId && s.season === pl.season);
    const player = squad && squad.players.find(x => x.name === pl.name);
    return (squad && player) ? { player, squad } : null;
  });
  state.formationId = fKey;
  state.slots = slots;
  state.picks = picks;
  state.difficulty  = (settings && settings.difficulty) || 'normal';
  state.peakMode    = !!(settings && settings.peak_mode);
  state.showRatings = !settings || settings.ratings_visible !== false;
  state.eraMin = YEAR_MIN; state.eraMax = YEAR_MAX;
  state.leagueCode = null;
}

// A friend's full season, computed deterministically (real rules — 36/33 games).
function lgFriendRecord(code, m) {
  const ovr = m.ovr || lgAvgOvr(m.players);
  const rec = withSeededRandom(lgSimSeed(code + '|' + (m.username || '')), () => {
    const g = generateMatches(ovr);
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    g.matches.forEach(x => { if (x.outcome === 'W') w++; else if (x.outcome === 'D') d++; else l++; gf += x.gf; ga += x.ga; });
    return { w, d, l, gf, ga, inTopSix: g.inTopSix };
  });
  return { username: m.username, name: 'הקבוצה של ' + (m.username || 'אנונימי'),
           ovr, players: m.players || [], ...rec, pts: rec.w * 3 + rec.d };
}

// Replace AI rows in the 14-team table with the friends' teams (each in the
// bracket its season earned), then re-sort each bracket.
function lgInjectFriends(table, friends) {
  const champSlots = [], relegSlots = [];
  for (let i = 0; i < table.length; i++) { if (table[i].us) continue; (i < 6 ? champSlots : relegSlots).push(i); }
  friends.forEach(f => {
    const primary = f.inTopSix ? champSlots : relegSlots;
    const alt     = f.inTopSix ? relegSlots : champSlots;
    let idx = primary.shift(); if (idx === undefined) idx = alt.shift();
    if (idx === undefined) return;               // more friends than slots (huge league)
    table[idx] = { name: f.name, pts: f.pts, w: f.w, d: f.d, l: f.l, gf: f.gf, ga: f.ga, us: false, isFriend: true };
  });
  const bySort = (a, b) => b.pts - a.pts || (b.w - a.w) || ((b.gf - b.ga) - (a.gf - a.ga));
  return [...table.slice(0, 6).sort(bySort), ...table.slice(6).sort(bySort)];
}

// The main event: replay MY league season on the normal results screen.
function runLeagueSimulation(code, members, myName, settings) {
  const me = members.find(m => m.username === myName) || members[0];
  if (!me) return;
  const myOvr = me.ovr || lgAvgOvr(me.players);
  const friends = members.filter(m => m !== me).map(m => lgFriendRecord(code, m));

  lgReconstructState(me.players, me.formation, settings);
  let projected = 8;
  try { projected = calcPreseasonOdds(myOvr, 60).projectedFinish; } catch (e) {}

  const season = withSeededRandom(lgSimSeed(code + '|' + myName), () => {
    const g = generateMatches(myOvr);
    let w = 0, d = 0;
    g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    const l = g.matches.length - w - d;
    const table = lgInjectFriends(
      generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents), friends);
    return { ovr: myOvr, matches: g.matches, inTopSix: g.inTopSix,
             leagueTable: table, playerStats: simulatePlayerStats(g.matches), projectedFinish: projected };
  });

  window._presetSeason = season;
  window._leagueReviewMode = { code, members, myName, settings };
  showResults();
  setTimeout(() => addLeagueReviewBackButton(code, members, myName, settings), 60);
}

function addLeagueReviewBackButton(code, members, myName, settings) {
  document.getElementById('league-review-back')?.remove();
  const btn = document.createElement('button');
  btn.id = 'league-review-back';
  btn.className = 'league-review-back';
  btn.textContent = '→ לטבלת הליגה';
  btn.onclick = () => {
    btn.remove();
    window._leagueReviewMode = null;
    showLeagueMembersStandalone(code, members, myName, settings);
  };
  document.getElementById('screen-results')?.appendChild(btn);
}

// ── Completed-league landing ──
function renderLeagueComplete(area, code, members, myName, settings) {
  area.innerHTML = `
    <div class="lgsim-hero">
      <div class="lgsim-hero-title">🏆 כל השחקנים סיימו!</div>
      <div class="lgsim-hero-sub">צפה בעונה שלך בליגת העל — עם הקבוצות של החברים בטבלה, אותם חוקים בדיוק.</div>
      <button class="btn-primary lgsim-start" id="lgsim-start">🎬 התחל סימולציה</button>
      <button class="lg-leave" id="lgsim-skip-table" style="margin-top:6px">דלג לטבלת הליגה ←</button>
    </div>`;
  document.getElementById('lgsim-start').onclick = () => runLeagueSimulation(code, members, myName, settings);
  document.getElementById('lgsim-skip-table').onclick = () => renderLeagueMembersTable(area, code, members, myName, settings);
}

// ── Members-only "general" table (deterministic, re-runnable) ──
function showLeagueMembersStandalone(code, members, myName, settings) {
  showScreen('leagues');
  const box = document.getElementById('leagues-content');
  box.innerHTML = `
    <button class="back-btn lg-inner-back" id="lgm-back">→ הליגות שלי</button>
    <div class="lg-league-name">טבלת הליגה</div>
    <div id="lg-table-area"></div>`;
  document.getElementById('lgm-back').onclick = renderLeaguesHome;
  renderLeagueMembersTable(document.getElementById('lg-table-area'), code, members, myName, settings);
}

function renderLeagueMembersTable(area, code, members, myName, settings) {
  const recs = members.map(m => lgFriendRecord(code, m))
    .sort((a, b) => b.pts - a.pts || b.w - a.w || ((b.gf - b.ga) - (a.gf - a.ga)));
  const rows = recs.map((t, i) => {
    const isMe = t.username === myName;
    return `
      <div class="lb-row lg-clickable ${isMe ? 'lgsim-me' : ''}" data-u="${lgEsc(t.username)}">
        <span class="lb-rank ${i < 3 ? 'lb-rank-top' : ''}">${i + 1}</span>
        <span class="lb-name">הקבוצה של ${lgEsc(t.username)}${isMe ? ' (אתה)' : ''}</span>
        <span class="lb-stat">${t.pts} נק׳</span>
        <span class="lb-sub" dir="rtl">${t.w}נ ${t.d}ת ${t.l}ה · ${t.gf}:${t.ga}</span>
      </div>`;
  }).join('');
  area.innerHTML = `
    <div class="section-label">🏆 טבלת הליגה — הקבוצות של החברים</div>
    <div class="lb-table lg-table">${rows}</div>
    <p class="page-note" style="text-align:center;margin-top:8px">לחצו על קבוצה כדי לראות את ההרכב</p>
    <button class="btn-primary" id="lgs-rewatch" style="width:100%;margin-top:6px">🎬 צפה בסימולציה שלך שוב</button>`;
  area.querySelectorAll('.lb-row.lg-clickable').forEach(row => {
    const m = members.find(x => x.username === row.dataset.u);
    if (m && m.players && m.players.length)
      row.onclick = () => showLeagueSquad(m.players.map(p => ({ pos: p.pos, name: p.name, ovr: p.ovr })), 'הקבוצה של ' + m.username);
  });
  document.getElementById('lgs-rewatch').onclick = () => runLeagueSimulation(code, members, myName, settings);
}
