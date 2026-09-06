// ─── בונה כדורגלן — המסך ───────────────────────────────────────────────────────
//
// Pick a role, then six spins. The roulette runs through the hundred best
// players this project has and stops on one of them; you take ONE of his six
// attributes, and that slot closes for good.
//
// The first version of this screen showed the whole squad — twenty-six rows and
// a hundred and eighty numbers at once — and it was wrong for the obvious
// reason: a wall of a table is not a draw. One name at a time, arriving, is.

const PB_KEY = '36-0-pb';
const PB_ROUNDS = 6;
const PB_POOL = 100;            // "the hundred best we have"

let pb = null;                  // the live build, or null
let _pbSpin = null;             // the running spin's timer, so it can be cancelled

function pbEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── what the shelf shows ─────────────────────────────────────────────────── */
function pbLoad() {
  try { return JSON.parse(localStorage.getItem(PB_KEY)) || {}; } catch (e) { return {}; }
}
function pbSave(o) {
  try { localStorage.setItem(PB_KEY, JSON.stringify(o)); } catch (e) { /* private mode */ }
}
function pbShelfLine() {
  const s = pbLoad();
  return s.best ? `הקריירה הטובה שלך: ${s.best} נקודות מורשת` : '';
}

/* ── the hundred ──────────────────────────────────────────────────────────── */
// One entry per PLAYER, at the season he was best — not the hundred best
// player-seasons, which would be six men's careers over and over. Built once.
let _pbPool = null;
function pbPool() {
  if (_pbPool) return _pbPool;
  const best = new Map();
  SQUADS.forEach(sq => {
    sq.players.forEach((p, i) => {
      const k = typeof mgNorm === 'function' ? mgNorm(p.name) : p.name;
      const cur = best.get(k);
      if (!cur || p.ovr > cur.ovr) {
        best.set(k, {
          name: p.name, ovr: p.ovr, pos: p.position,
          squadId: sq.id, idx: i, season: sq.season, teamId: sq.teamId,
        });
      }
    });
  });
  return (_pbPool = [...best.values()]
    .filter(e => attrsOf(e.squadId, e.idx))       // no row, no place in the pool
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, PB_POOL));
}

function pbDrawPlayer() {
  const pool = pbPool().filter(e => !pb.used.has(e.squadId + '|' + e.idx));
  const from = pool.length ? pool : pbPool();
  return from[Math.floor(Math.random() * from.length)];
}

/* ── open ─────────────────────────────────────────────────────────────────── */
function pbOpen() {
  if (typeof track === 'function') track('open', 'minigame', 'builder');
  if (_pbSpin) { clearTimeout(_pbSpin); _pbSpin = null; }
  pb = null;
  pbRenderRoles();
}

function pbRenderRoles() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const roles = ['fw', 'w', 'cm', 'df', 'gk'];
  const blurb = {
    fw: 'בעיטה היא שליש מהערך שלו, ואחריה מהירות. תבנה מבקיע.',
    w:  'מהירות וכדרור לפני הכול. הכי מהיר, הכי חמקמק.',
    cm: 'מסירה מובילה, וכדרור אחריה. מי שמריץ את המשחק.',
    df: 'הגנה כמעט חצי, ופיזיות אחריה. קיר.',
    gk: 'הגנה ופיזיות כמעט לבד. בעיטה וכדרור לא רלוונטיים לו.',
  };
  box.innerHTML = `
    ${mgBackBar('בונה כדורגלן')}
    <p class="page-note">שישה סיבובים. בכל אחד הרולטה עוצרת על אחד ממאה השחקנים
       הטובים בליגה, ואתה לוקח ממנו <b>נתון אחד</b>. בסוף — חמש־עשרה עונות.</p>
    <p class="pb-role-q">מה אתה בונה?</p>
    <div class="pb-roles">
      ${roles.map(r => `
        <button class="pb-role" data-role="${r}">
          <span class="pb-role-name">${pbEsc(ATTR_ROLE[r].name)}</span>
          <span class="pb-role-sub">${pbEsc(blurb[r])}</span>
        </button>`).join('')}
    </div>`;
  mgWireBack();
  box.querySelectorAll('.pb-role').forEach(b => {
    b.onclick = () => pbStart(b.dataset.role);
  });
}

function pbStart(role) {
  pb = {
    role,
    slots: {},                       // key → { value, from, why, season }
    open: attrSlots(),
    round: 0,
    used: new Set(),
    rerolled: false,
    player: null,
    spinning: false,
  };
  pbNextRound();
}

function pbNextRound() {
  pb.round++;
  pb.rerolled = false;
  pbSpin();
}

/* ── the spin ─────────────────────────────────────────────────────────────── */
// Names go past fast and then slower, and the one that is showing when it stops
// is the one you get. The landing is decided UP FRONT rather than by wherever
// the animation happens to end — an animation that decides the outcome is an
// animation that can be interrupted into deciding a different one.
function pbSpin() {
  const landed = pbDrawPlayer();
  pb.player = null;
  pb.spinning = true;
  pbRenderRound();

  const pool = pbPool();
  const face = document.getElementById('pb-face');
  if (!face) { pbLand(landed); return; }

  // ~24 frames, each a little slower than the last: 28ms out to 190ms.
  let i = 0;
  const FRAMES = 24;
  const step = () => {
    if (!pb || !pb.spinning) return;
    if (i >= FRAMES) { pbLand(landed); return; }
    const p = pool[Math.floor(Math.random() * pool.length)];
    face.innerHTML = pbFaceHTML(p, true);
    const t = i / FRAMES;
    i++;
    _pbSpin = setTimeout(step, 28 + Math.round(162 * t * t));
  };
  step();
}

function pbLand(p) {
  _pbSpin = null;
  if (!pb) return;
  pb.spinning = false;
  pb.player = p;
  pb.used.add(p.squadId + '|' + p.idx);
  pbRenderRound();
}

function pbFaceHTML(p, blurred) {
  const club = (TEAMS[p.teamId] || {}).name || p.teamId;
  return `
    <div class="pb-face-name${blurred ? ' pb-blur' : ''}">${pbEsc(p.name)}</div>
    <div class="pb-face-club${blurred ? ' pb-blur' : ''}">${pbEsc(club)} · ${pbEsc(p.season)}</div>
    <div class="pb-face-ovr${blurred ? ' pb-blur' : ''}">${p.ovr}</div>`;
}

/* ── a round ──────────────────────────────────────────────────────────────── */
function pbRenderRound() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const p = pb.player;

  box.innerHTML = `
    ${mgBackBar('בונה כדורגלן')}
    <div class="pb-head">
      <span class="pb-round">סיבוב ${pb.round} מתוך ${PB_ROUNDS}</span>
      <span class="pb-role-tag">${pbEsc(ATTR_ROLE[pb.role].name)}</span>
    </div>
    ${pbSlotsHTML()}
    <div class="pb-reel${pb.spinning ? ' spinning' : ''}">
      <div class="pb-reel-face" id="pb-face">
        ${p ? pbFaceHTML(p, false) : '<div class="pb-face-name pb-blur">···</div>'}
      </div>
    </div>
    <div class="pb-picks" id="pb-picks">${p ? pbPicksHTML(p) : ''}</div>
    <p class="pb-foot" id="pb-why">${pb.spinning ? 'הרולטה מסתובבת…' : 'קח נתון אחד ממנו.'}</p>
    <div class="pb-actions">
      ${!pb.spinning && !pb.rerolled
        ? '<button class="pb-reroll" id="pb-reroll">🎲 סובב שוב</button>' : ''}
    </div>`;
  mgWireBack();

  const reroll = document.getElementById('pb-reroll');
  if (reroll) reroll.onclick = () => { pb.rerolled = true; pbSpin(); };

  box.querySelectorAll('.pb-take').forEach(btn => {
    const k = btn.dataset.k;
    const show = () => {
      const why = attrWhy(p.squadId, p.idx, k, p.season, p.teamId);
      const el = document.getElementById('pb-why');
      if (el) el.textContent = why ? `${ATTR_NAME[k]} — ${why}` : `${ATTR_NAME[k]} ${attrsOf(p.squadId, p.idx)[k]}`;
    };
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('focus', show);
    btn.onclick = () => pbTake(k);
  });
}

function pbPicksHTML(p) {
  const a = attrsOf(p.squadId, p.idx);
  if (!a) return '';
  return ATTR_KEYS.map(k => {
    const taken = !pb.open.includes(k);
    return `<button class="pb-take${taken ? ' taken' : ''}" data-k="${k}" ${taken ? 'disabled' : ''}>
      <span class="pb-take-name">${pbEsc(ATTR_NAME[k])}</span>
      <span class="pb-take-val">${a[k]}</span>
      ${taken ? '<span class="pb-take-x">נלקח</span>' : ''}
    </button>`;
  }).join('');
}

function pbSlotsHTML() {
  return `<div class="pb-slots">
    ${ATTR_KEYS.map(k => {
      const s = pb.slots[k];
      return `<div class="pb-slot${s ? ' filled' : ''}">
        <span class="pb-slot-name">${pbEsc(ATTR_NAME[k])}</span>
        <span class="pb-slot-val">${s ? s.value : '—'}</span>
        ${s ? `<span class="pb-slot-from">${pbEsc(s.from)}</span>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function pbTake(key) {
  const p = pb.player;
  if (!p || pb.spinning || !pb.open.includes(key)) return;
  const a = attrsOf(p.squadId, p.idx);
  if (!a || typeof a[key] !== 'number') return;
  pb.slots[key] = {
    value: a[key],
    from: p.name,
    why: attrWhy(p.squadId, p.idx, key, p.season, p.teamId),
    season: p.season,
  };
  pb.open = pb.open.filter(k => k !== key);
  if (pb.round >= PB_ROUNDS || !pb.open.length) pbFinish();
  else pbNextRound();
}

/* ── the career ───────────────────────────────────────────────────────────── */
function pbFinish() {
  const attrs = {};
  ATTR_KEYS.forEach(k => { attrs[k] = pb.slots[k] ? pb.slots[k].value : 45; });

  const seed = (Date.now() ^ (attrs.sho * 7919 + attrs.def * 104729)) >>> 0;
  const run = pbSimCareer({ role: pb.role, attrs }, seed);
  run.slots = pb.slots;

  const st = pbLoad();
  if (!st.best || run.legacy > st.best) { st.best = run.legacy; st.bestRole = pb.role; }
  st.played = (st.played || 0) + 1;
  pbSave(st);

  if (typeof track === 'function') track('finish', 'minigame', 'builder');
  pbRenderCareer(run);
  pbSubmit(run);
}

// Fire-and-forget. A career is worth reading whether or not anyone is signed in,
// so nothing on the result screen waits for this and nothing breaks without it.
async function pbSubmit(run) {
  if (typeof _supabase === 'undefined' || !_supabase) return;
  if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
  try {
    const t = run.totals;
    const { data } = await _supabase.rpc('submit_builder_run', {
      p: {
        role: run.role, peak: run.peak, legacy: run.legacy,
        apps: t.apps, goals: t.goals, assists: t.assists, clean: t.cs,
        titles: t.titles, boots: t.boots, poty: t.poty, seed: run.seed,
      },
    });
    if (data && data.achievements && typeof showAchievementToasts === 'function') {
      showAchievementToasts(data.achievements);
    }
  } catch (e) { /* the career still happened */ }
}

// Hebrew counts one differently from many, and a zero is not worth a word at
// all — the first build read "0 אליפויות" and "1 אליפויות", both wrong.
function pbCount(n, one, many) {
  if (!n) return '';
  return `<span>${n === 1 ? one : n + ' ' + many}</span>`;
}

function pbRenderCareer(run) {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const t = run.totals;
  const gk = run.role === 'gk';

  const rows = run.seasons.map(s => `
    <tr class="${s.lost ? 'pb-lost' : ''}${s.abroad ? ' pb-abroad' : ''}">
      <td>${s.age}</td>
      <td class="pb-cl">${pbEsc(s.club)}</td>
      <td>${s.ovr}</td>
      <td>${s.apps}</td>
      <td>${gk ? s.cs : s.goals}</td>
      ${gk ? '' : `<td>${s.assists}</td>`}
      <td class="pb-hon">${s.champion ? '🏆' : ''}${s.goldenBoot ? '👑' : ''}${s.goldenGlove ? '🧤' : ''}${s.poty ? '🏅' : ''}${s.lost ? '🤕' : ''}</td>
    </tr>`).join('');

  box.innerHTML = `
    ${mgBackBar('בונה כדורגלן')}
    <div class="pb-verdict">
      <div class="pb-legacy">${run.legacy}</div>
      <div class="pb-legacy-label">נקודות מורשת</div>
      <div class="pb-peak">${pbEsc(ATTR_ROLE[run.role].name)} · שיא ${run.peak}</div>
    </div>
    <div class="pb-totals">
      ${pbCount(t.apps, 'הופעה אחת', 'הופעות')}
      ${gk ? pbCount(t.cs, 'שער נקי אחד', 'שערים נקיים')
           : pbCount(t.goals, 'שער אחד', 'שערים') + pbCount(t.assists, 'בישול אחד', 'בישולים')}
      ${pbCount(t.titles, 'אליפות אחת', 'אליפויות')}
      ${pbCount(t.boots, gk ? 'כפפת זהב אחת' : 'נעל זהב אחת', gk ? 'כפפות זהב' : 'נעלי זהב')}
      ${pbCount(t.poty, 'כדורגלן העונה', 'פעמים כדורגלן העונה')}
      ${pbCount(t.caps, 'משחק נבחרת אחד', 'משחקי נבחרת')}
    </div>
    <div class="pb-tablewrap">
      <table class="pb-table pb-career">
        <thead><tr><th>גיל</th><th>מועדון</th><th>דירוג</th><th>הופעות</th>
          <th>${gk ? 'נקיים' : 'שערים'}</th>${gk ? '' : '<th>בישולים</th>'}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="pb-built">
      <p class="pb-built-h">איך הוא נבנה</p>
      ${ATTR_KEYS.map(k => {
        const s = run.slots[k];
        if (!s) return '';
        return `<div class="pb-built-row">
          <span class="pb-built-k">${pbEsc(ATTR_NAME[k])} ${s.value}</span>
          <span class="pb-built-v">${pbEsc(s.from)} · ${pbEsc(s.season)}</span>
          ${s.why ? `<span class="pb-built-w">${pbEsc(s.why)}</span>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="pb-again">
      <button class="btn-primary" id="pb-again">עוד קריירה</button>
    </div>`;
  mgWireBack();
  const again = document.getElementById('pb-again');
  if (again) again.onclick = pbOpen;
}
