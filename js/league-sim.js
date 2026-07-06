// ─── Shared league simulation (async "leagues with friends") ───────────────────
// When a league is complete, every member watches the SAME deterministic Ligat
// Ha'al season: the members' drafted teams are inserted alongside the AI teams
// and play a full double round-robin against each other and the AI. The seed is
// derived from the league code, so the fixtures, scores and scorers are identical
// for everyone and every re-run. Then a members-only table ranks the friends.

const LG_GOAL_W = { ST: 10, CF: 9, RW: 6, LW: 6, CAM: 6, RM: 4, LM: 4, CM: 3, CDM: 1, RB: 1, LB: 1, CB: 1, GK: 0 };

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
function lgPoisson(lambda, rng) {         // Knuth — deterministic given rng
  const L = Math.exp(-lambda); let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return Math.min(k - 1, 7);
}
function lgWeightedIdx(weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(rng() * weights.length);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}
function lgScorers(team, goals, rng) {
  if (!team.players || !team.players.length || goals === 0) return [];
  const weights = team.players.map(p => LG_GOAL_W[p.pos] ?? LG_GOAL_W[p.position] ?? 1);
  const out = [];
  for (let g = 0; g < goals; g++) {
    const idx = lgWeightedIdx(weights, rng);
    out.push({ n: playerShortName(team.players[idx].name), min: 1 + Math.floor(rng() * 90) });
  }
  return out.sort((a, b) => a.min - b.min);
}
function lgSimMatch(oa, ob, rng) {
  const ea = Math.max(0.15, 1.35 + (oa - ob) / 18 + 0.15);  // +home advantage
  const eb = Math.max(0.15, 1.30 + (ob - oa) / 18);
  return [lgPoisson(ea, rng), lgPoisson(eb, rng)];
}

// Build the full season table. members = [{ username, ovr, players }].
function simulateLeagueSeason(code, members) {
  const rng = mulberry32(lgSimSeed(code));
  const teams = members.map((m, i) => ({
    id: 'm' + i, isMember: true, username: m.username || 'אנונימי',
    name: 'הקבוצה של ' + (m.username || 'אנונימי'),
    ovr: m.ovr || lgAvgOvr(m.players), players: m.players || [],
    w: 0, d: 0, l: 0, gf: 0, ga: 0, fixtures: [],
  }));
  // pad with AI teams so there's always a real league context
  const aiCount = Math.max(3, Math.min(IL_TEAMS_SIM.length, 14 - teams.length));
  IL_TEAMS_SIM.slice(0, aiCount).forEach((t, i) => teams.push({
    id: 'a' + i, isMember: false, name: t.name, ovr: t.ovr, players: null,
    w: 0, d: 0, l: 0, gf: 0, ga: 0, fixtures: [],
  }));

  const bump = (t, o) => { if (o === 'W') t.w++; else if (o === 'D') t.d++; else t.l++; };
  const play = (h, a) => {
    const [gh, ga] = lgSimMatch(teams[h].ovr, teams[a].ovr, rng);
    const oH = gh > ga ? 'W' : gh < ga ? 'L' : 'D';
    const oA = oH === 'W' ? 'L' : oH === 'L' ? 'W' : 'D';
    teams[h].gf += gh; teams[h].ga += ga; bump(teams[h], oH);
    teams[a].gf += ga; teams[a].ga += gh; bump(teams[a], oA);
    teams[h].fixtures.push({ opp: teams[a].name, home: true,  gf: gh, ga: ga, outcome: oH, scorers: lgScorers(teams[h], gh, rng) });
    teams[a].fixtures.push({ opp: teams[h].name, home: false, gf: ga, ga: gh, outcome: oA, scorers: lgScorers(teams[a], ga, rng) });
  };
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++) { play(i, j); play(j, i); }

  teams.forEach(t => { t.pts = t.w * 3 + t.d; t.gd = t.gf - t.ga; });
  teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  teams.forEach((t, i) => t.rank = i + 1);
  return teams;
}

// ── Complete-league landing: the "start simulation" entry point ──
function renderLeagueComplete(area, code, members, myName) {
  area.innerHTML = `
    <div class="lgsim-hero">
      <div class="lgsim-hero-title">🏆 כל השחקנים סיימו!</div>
      <div class="lgsim-hero-sub">הגיע הרגע — צפו בעונה המלאה של הליגה, כשכל הקבוצות משחקות אחת נגד השנייה.</div>
      <button class="btn-primary lgsim-start" id="lgsim-start">🎬 התחל סימולציה</button>
      <button class="lg-leave" id="lgsim-skip-table" style="margin-top:6px">דלג לטבלת הליגה ←</button>
    </div>`;
  document.getElementById('lgsim-start').onclick = () => runLeagueSimulation(code, members, myName);
  document.getElementById('lgsim-skip-table').onclick = () => renderLeagueMembersTable(area, code, members, myName);
}

// ── Full match-by-match reveal of the viewing member's season ──
function runLeagueSimulation(code, members, myName) {
  const area = document.getElementById('lg-table-area') || document.getElementById('leagues-content');
  const teams = simulateLeagueSeason(code, members);
  const me = teams.find(t => t.isMember && t.username === myName) || teams.find(t => t.isMember);
  const fixtures = me ? me.fixtures : [];

  area.innerHTML = `
    <div class="lgsim-reveal-head">⚽ העונה של ${lgEsc('הקבוצה של ' + (me ? me.username : myName))}</div>
    <div class="record-display lgsim-tally">
      <div class="rec-box wins"><div class="rec-num" id="lgs-w" dir="ltr">0</div><div class="rec-label">נצחונות</div></div>
      <div class="rec-box draws"><div class="rec-num" id="lgs-d" dir="ltr">0</div><div class="rec-label">תיקו</div></div>
      <div class="rec-box losses"><div class="rec-num" id="lgs-l" dir="ltr">0</div><div class="rec-label">הפסדים</div></div>
    </div>
    <button class="btn-skip-matches" id="lgs-skip" style="display:block">דלג ⏩</button>
    <div class="matches-grid" id="lgs-matches"></div>
    <div id="lgs-final"></div>`;

  const grid = document.getElementById('lgs-matches');
  const skip = document.getElementById('lgs-skip');
  let w = 0, d = 0, l = 0, idx = 0, timer = null;

  const rowFor = m => {
    const rc = m.outcome === 'W' ? 'win' : m.outcome === 'D' ? 'draw' : 'loss';
    const rl = m.outcome === 'W' ? 'נ' : m.outcome === 'D' ? 'ת' : 'ה';
    const sc = m.scorers && m.scorers.length
      ? `<div class="mr-scorers">⚽ ${m.scorers.map(s => `${lgEsc(s.n)} ${s.min}'`).join(' · ')}</div>` : '';
    const el = document.createElement('div');
    el.className = `match-row ${rc}`;
    el.innerHTML = `
      <div class="mr-main">
        <span class="mr-badge ${rc}">${rl}</span>
        <span class="mr-opponent">${lgEsc(m.opp)} <span class="mr-venue">${m.home ? '(ב)' : '(ח)'}</span></span>
        <span class="mr-score" dir="ltr">${m.gf}-${m.ga}</span>
      </div>${sc}`;
    return el;
  };
  const tally = m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; else l++;
    document.getElementById('lgs-w').textContent = w;
    document.getElementById('lgs-d').textContent = d;
    document.getElementById('lgs-l').textContent = l; };

  const finish = () => {
    clearTimeout(timer);
    for (; idx < fixtures.length; idx++) { grid.appendChild(rowFor(fixtures[idx])); tally(fixtures[idx]); }
    skip.style.display = 'none';
    renderLeagueFinal(document.getElementById('lgs-final'), code, members, myName, teams, me);
  };
  const step = () => {
    if (idx >= fixtures.length) return finish();
    grid.appendChild(rowFor(fixtures[idx])); tally(fixtures[idx]); idx++;
    timer = setTimeout(step, 90);
  };
  skip.onclick = finish;
  timer = setTimeout(step, 250);
}

// ── After the reveal: final position + the full league table ──
function renderLeagueFinal(host, code, members, myName, teams, me) {
  const total = teams.length;
  const posLine = me ? `סיימת במקום <b>${me.rank}</b> מתוך ${total} · ${me.pts} נק׳` : '';
  host.innerHTML = `
    <div class="lgsim-pos">${posLine}</div>
    <div class="section-label" style="margin-top:12px">טבלת ליגת העל המלאה</div>
    <div class="lb-table lg-table">${leagueFullTableRows(teams, me)}</div>
    <button class="btn-primary" id="lgs-to-members" style="width:100%;margin-top:10px">🏆 לטבלת הליגה של החברים ←</button>`;
  wireSquadClicks(host, teams);
  document.getElementById('lgs-to-members').onclick = () =>
    renderLeagueMembersTable(document.getElementById('lg-table-area') || document.getElementById('leagues-content'), code, members, myName);
}

function leagueFullTableRows(teams, me) {
  return teams.map(t => {
    const mine = me && t.id === me.id;
    return `
      <div class="lb-row ${t.isMember ? 'lgsim-member' : ''} ${mine ? 'lgsim-me' : ''} ${t.isMember ? 'lg-clickable' : ''}" data-id="${t.id}">
        <span class="lb-rank ${t.rank <= 3 ? 'lb-rank-top' : ''}">${t.rank}</span>
        <span class="lb-name">${lgEsc(t.name)}${mine ? ' (אתה)' : ''}</span>
        <span class="lb-stat">${t.pts}</span>
        <span class="lb-sub" dir="rtl">${t.w}נ ${t.d}ת ${t.l}ה · ${t.gf}:${t.ga}</span>
      </div>`;
  }).join('');
}

// ── Members-only "general" table (re-runs the sim identically) ──
function renderLeagueMembersTable(area, code, members, myName) {
  const teams = simulateLeagueSeason(code, members);
  const mine = teams.filter(t => t.isMember);
  mine.forEach((t, i) => t.memberRank = i + 1);
  const rows = mine.map(t => {
    const isMe = t.username === myName;
    return `
      <div class="lb-row lg-clickable lgsim-member ${isMe ? 'lgsim-me' : ''}" data-id="${t.id}">
        <span class="lb-rank ${t.memberRank <= 3 ? 'lb-rank-top' : ''}">${t.memberRank}</span>
        <span class="lb-name">${lgEsc(t.name)}${isMe ? ' (אתה)' : ''}</span>
        <span class="lb-stat">${t.pts} נק׳</span>
        <span class="lb-sub" dir="rtl">מקום ${t.rank} בליגה · ${t.w}נ ${t.d}ת ${t.l}ה</span>
      </div>`;
  }).join('');
  area.innerHTML = `
    <div class="section-label">🏆 טבלת הליגה — הקבוצות של החברים</div>
    <div class="lb-table lg-table">${rows}</div>
    <p class="page-note" style="text-align:center;margin-top:8px">לחצו על קבוצה כדי לראות את ההרכב</p>
    <button class="btn-primary" id="lgs-rewatch" style="width:100%;margin-top:6px">🎬 צפה בסימולציה שוב</button>`;
  wireSquadClicks(area, teams);
  document.getElementById('lgs-rewatch').onclick = () => runLeagueSimulation(code, members, myName);
}

function wireSquadClicks(scope, teams) {
  scope.querySelectorAll('.lb-row.lg-clickable').forEach(row => {
    const t = teams.find(x => x.id === row.dataset.id);
    if (!t || !t.players || !t.players.length) return;
    row.onclick = () => showLeagueSquad(
      t.players.map(p => ({ pos: p.pos, name: p.name, ovr: p.ovr })),
      lgEsc(t.name));
  });
}
