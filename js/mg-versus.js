// ─── ⚖️ מי טוב יותר? ──────────────────────────────────────────────────────────
//
// Two cards, one call, and the run ends the first time you are wrong. The
// ratings are hidden until you choose, so the only thing you are playing with
// is what you remember about them.
//
// Every disagreement with the data is written down. That log is the raw
// material for crowdsourced ratings later — it stays on this device for now,
// because aggregating it needs a table nobody has asked for yet.

const MGV_KEY = '36-0-mg-versus';
const MGV_MIN_OVR = 74;     // below this nobody has an opinion
const MGV_MAX_GAP = 10;     // a bigger gap is not a question, it is a giveaway
const MGV_LOG_CAP = 200;

function mgvState() {
  return mgLoad(MGV_KEY, { best: 0, played: 0, correct: 0, log: [] });
}
function mgvSave(s) { mgSave(MGV_KEY, s); }

function mgVersusShelfLine() {
  const s = mgvState();
  if (!s.played) return '';
  return `🔥 שיא רצף ${s.best} · ${s.correct}/${s.played} פגיעות`;
}

/* ── the card pool ────────────────────────────────────────────────────────── */
let _mgvPool = null;
function mgvPool() {
  if (_mgvPool) return _mgvPool;
  const out = [];
  SQUADS.forEach(sq => sq.players.forEach(p => {
    if (p.ovr >= MGV_MIN_OVR) out.push({ name: p.name, key: mgNorm(p.name), pos: normalizePos(p.position),
                                         ovr: p.ovr, teamId: sq.teamId, season: sq.season });
  }));
  return (_mgvPool = out);
}

function mgvDraw() {
  const pool = mgvPool();
  for (let i = 0; i < 200; i++) {
    const a = pool[Math.floor(Math.random() * pool.length)];
    const b = pool[Math.floor(Math.random() * pool.length)];
    if (a.key === b.key) continue;
    const gap = Math.abs(a.ovr - b.ovr);
    if (gap < 1 || gap > MGV_MAX_GAP) continue;
    if (a.teamId === b.teamId && a.season === b.season) continue;   // same teamsheet is a trivia question, not a debate
    return [a, b];
  }
  return [pool[0], pool[1]];
}

/* ── the run ──────────────────────────────────────────────────────────────── */
let _mgvRun = null;

function mgVersusOpen() {
  _mgvRun = { streak: 0, pair: mgvDraw(), picked: null, over: false };
  mgvRender();
}

function mgvRender() {
  const run = _mgvRun;
  const box = document.getElementById('mg-content');
  if (!run || !box) return;
  const s = mgvState();
  const [a, b] = run.pair;
  const revealed = !!run.picked;

  const card = (p, side) => {
    const team = (typeof getTeam === 'function') ? getTeam(p.teamId) : { primaryColor: '#222', secondaryColor: '#fff', name: p.teamId };
    const chosen = run.picked === side;
    const right  = revealed && p.ovr === Math.max(a.ovr, b.ovr);
    return `
      <button class="mgv-card ${revealed ? 'revealed' : ''} ${chosen ? 'chosen' : ''} ${revealed ? (right ? 'right' : 'wrong') : ''}"
              data-side="${side}" style="--tc:${team.primaryColor};--ts:${team.secondaryColor}">
        <span class="mgv-badge">${mgBadge(p.teamId)}</span>
        <span class="mgv-name">${mgEsc(p.name)}</span>
        <span class="mgv-club">${mgEsc(mgClub(p.teamId))}</span>
        <span class="mgv-season" dir="ltr">${mgEsc(p.season)}</span>
        <span class="mgv-pos">${mgEsc(p.pos)}</span>
        <span class="mgv-ovr">${revealed ? p.ovr : '?'}</span>
      </button>`;
  };

  box.innerHTML = `
    ${mgBackBar('מי טוב יותר?')}
    <div class="mgv-scorebar">
      <span>רצף נוכחי: <strong>${run.streak}</strong></span>
      <span>שיא: <strong>${s.best}</strong></span>
    </div>
    <div class="mgv-question">${run.over ? '' : 'למי היה הדירוג הגבוה יותר בעונה הזאת?'}</div>
    <div class="mgv-cards">${card(a, 'a')}<span class="mgv-vs">VS</span>${card(b, 'b')}</div>
    <div id="mgv-verdict" class="mgv-verdict"></div>
    <div id="mgv-actions" class="mgv-actions"></div>`;

  mgWireBack();
  if (!revealed) {
    box.querySelectorAll('.mgv-card').forEach(el => { el.onclick = () => mgvPick(el.dataset.side); });
    return;
  }

  const [pa, pb] = run.pair;
  const winner = pa.ovr >= pb.ovr ? 'a' : 'b';
  const ok = run.picked === winner;
  const verdict = document.getElementById('mgv-verdict');
  verdict.className = 'mgv-verdict ' + (ok ? 'ok' : 'bad');
  verdict.innerHTML = ok
    ? `✅ נכון — רצף ${run.streak}`
    : `❌ הדירוגים אומרים ${mgEsc((winner === 'a' ? pa : pb).name)}. הרצף נעצר על ${run.streak}.`;

  const actions = document.getElementById('mgv-actions');
  actions.innerHTML = ok
    ? `<button class="btn-primary btn-full" id="mgv-next">הבא ←</button>`
    : `<button class="btn-primary btn-full" id="mgv-again">🔁 סיבוב חדש</button>
       <button class="btn-secondary btn-full" id="mgv-share">📋 שתף תוצאה</button>`;
  const next = document.getElementById('mgv-next');
  if (next) next.onclick = () => { run.pair = mgvDraw(); run.picked = null; mgvRender(); };
  const again = document.getElementById('mgv-again');
  if (again) again.onclick = mgVersusOpen;
  const share = document.getElementById('mgv-share');
  if (share) share.onclick = () => mgShareText(
    `⚖️ מי טוב יותר? — רצף של ${run.streak} ב-36-0\nהשיא שלי: ${mgvState().best}\n\nhttps://www.36-0.co.il/`, share);
}

function mgvPick(side) {
  const run = _mgvRun;
  if (!run || run.picked) return;
  run.picked = side;
  const [a, b] = run.pair;
  const winner = a.ovr >= b.ovr ? 'a' : 'b';
  const ok = side === winner;

  const s = mgvState();
  s.played++;
  if (ok) {
    s.correct++;
    run.streak++;
    s.best = Math.max(s.best, run.streak);
  } else {
    run.over = true;
    // Choosing the lower-rated card is an opinion about the ratings, not a
    // mistake — that is exactly the signal worth keeping.
    s.log.unshift({ a: a.name, aS: a.season, aO: a.ovr, b: b.name, bS: b.season, bO: b.ovr,
                    chose: side === 'a' ? a.name : b.name, at: new Date().toISOString().slice(0, 10) });
    s.log = s.log.slice(0, MGV_LOG_CAP);
  }
  mgvSave(s);
  mgvRender();
}
