// ─── What the club leaves behind: a team photo and a back page ────────────────
// Two artefacts produced at the end of a season, both built out of the club
// identity in js/club.js and the season already sitting in window._lastSeason.
//
// Neither of them is a new mode and neither touches a rating. They exist because
// a crest with nothing to appear on is a form the player filled in once — the
// photo is what makes the kit a kit, and the back page is what makes a 3rd-place
// finish feel like it happened somewhere.
//
// Both render as ordinary DOM and are turned into a PNG by the html2canvas
// loader game.js already carries for the share card, so there is one image path
// on the site rather than three.

function cmEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function cmSeason() { return window._lastSeason || null; }

function cmClub() {
  return clubGet() || { ...CLUB_DEFAULT, name: 'הקבוצה שלי' };
}

// A career names its own club and that name outranks the global one — the same
// precedence myTeamName() applies, kept here so the photo of a dynasty season
// carries the dynasty's name.
function cmClubName() {
  try {
    if (typeof state !== 'undefined' && state && state.career && typeof crRun === 'function') {
      const n = String(crRun().clubName || '').trim();
      if (n) return n;
    }
  } catch (e) { /* no career module */ }
  const c = clubGet();
  return (c && String(c.name || '').trim()) || 'הקבוצה שלי';
}

function cmPlace(rank, n) {
  if (rank === 1) return 'אלופי הליגה';
  if (rank === 2) return 'סגני האלופה';
  if (rank === 3) return 'מקום שלישי';
  return `מקום ${rank} מתוך ${n}`;
}

/* ── the team photo ─────────────────────────────────────────────────────────
   The classic arrangement: six standing, five crouching. Sorting by the slot's
   pitch y puts the keeper and the defence in the back row and the attack in the
   front one without anybody having to write the order down — and the keeper is
   then moved to the MIDDLE of the back row, because that is where he stands in
   every team photo ever taken. */
function cmPhotoRows() {
  const slots = (typeof state !== 'undefined' && state.slots) || [];
  const picks = (typeof state !== 'undefined' && state.picks) || [];
  const nums  = clubNumbersFor(slots, picks);

  const men = [];
  slots.forEach((s, i) => {
    const p = picks[i];
    if (!p || !p.player) return;
    men.push({
      name: (typeof playerShortName === 'function') ? playerShortName(p.player.name) : p.player.name,
      num: nums[i], y: s.y, pos: s.pos,
    });
  });
  if (!men.length) return null;

  men.sort((a, b) => b.y - a.y);            // own goal first → keeper, then defence
  const back = men.slice(0, Math.min(6, men.length));
  const front = men.slice(back.length);

  const gk = back.findIndex(m => m.pos === 'GK');
  if (gk >= 0) {
    const [keeper] = back.splice(gk, 1);
    back.splice(Math.floor(back.length / 2), 0, keeper);
  }
  return { back, front };
}

function cmManHTML(club, m, size) {
  return `<div class="cm-man">
    ${clubShirtSVG(club, size, m.num)}
    <div class="cm-man-name">${cmEsc(m.name)}</div>
  </div>`;
}

function clubTeamPhotoHTML() {
  const s = cmSeason(), club = cmClub(), rows = cmPhotoRows();
  if (!rows) return null;
  const pts = s ? s.wins * 3 + s.draws : 0;
  const sub = s ? `${cmPlace(s.myRank, s.n)} · ${s.wins}-${s.draws}-${s.losses} · ${pts} נק׳` : '';
  const season = (typeof state !== 'undefined' && state.oppSeason && typeof yearToSeason === 'function')
    ? yearToSeason(state.oppSeason) : '';

  return `<div class="cm-photo" id="cm-photo-el" dir="rtl">
    <div class="cm-ph-head">
      <div class="cm-ph-crest">${clubCrestSVG(club, 52)}</div>
      <div class="cm-ph-titles">
        <div class="cm-ph-name">${cmEsc(cmClubName())}</div>
        <div class="cm-ph-city">${cmEsc([club.city, season].filter(Boolean).join(' · ') || 'תמונת הקבוצה')}</div>
      </div>
    </div>
    <div class="cm-ph-pitch">
      <div class="cm-row cm-row-back">${rows.back.map(m => cmManHTML(club, m, 54)).join('')}</div>
      <div class="cm-row cm-row-front">${rows.front.map(m => cmManHTML(club, m, 54)).join('')}</div>
    </div>
    <div class="cm-ph-foot">
      <span class="cm-ph-sub">${cmEsc(sub)}</span>
      <span class="cm-ph-brand" dir="ltr">36-0.co.il</span>
    </div>
  </div>`;
}

/* ── the back page ──────────────────────────────────────────────────────────
   An Israeli sports back page. The headline is chosen from the season, not
   generated — a fixed set of lines that a real back page would actually run,
   because a template that says "מקום 7!" in 96px is not a headline. */
function cmHeadline(s) {
  if (!s) return { big: 'עונה', kick: '', tone: 'mid' };
  const { myRank, n, losses, wins } = s;
  if (myRank === 1 && losses === 0) return { big: 'בלתי מנוצחים', kick: 'עונה שלא תישכח', tone: 'gold' };
  if (myRank === 1)                 return { big: 'אלופים!',      kick: 'הצלחת האליפות חוזרת הביתה', tone: 'gold' };
  if (myRank === 2)                 return { big: 'כל כך קרוב',   kick: 'סגנים, ורק נקודות ספורות הפרידו', tone: 'good' };
  if (myRank === 3)                 return { big: 'על הפודיום',   kick: 'עונה שמסתיימת עם חיוך', tone: 'good' };
  if (myRank <= 4)                  return { big: 'אירופה!',      kick: 'הכרטיס נחתם במחזור האחרון', tone: 'good' };
  if (myRank > n - 2)               return { big: 'יורדים',       kick: 'עונה שנגמרה הרבה לפני הסוף', tone: 'bad' };
  if (myRank > n / 2)               return { big: 'עונה למחוק',   kick: `${losses} הפסדים, ושום דבר לחגוג`, tone: 'bad' };
  return { big: 'עונה של ביסוס', kick: `${wins} ניצחונות, ויש על מה לבנות`, tone: 'mid' };
}

function clubBackPageHTML() {
  const s = cmSeason(), club = cmClub();
  if (!s) return null;
  const h = cmHeadline(s);
  const pts = s.wins * 3 + s.draws;
  const ps = Array.isArray(s.ps) ? s.ps : [];
  const top = [...ps].sort((a, b) => b.goals - a.goals)[0];
  const asst = [...ps].sort((a, b) => b.assists - a.assists)[0];
  const table = Array.isArray(s.leagueTable) ? s.leagueTable.slice(0, 5) : [];

  const shortName = n => (typeof playerShortName === 'function') ? playerShortName(n) : n;

  return `<div class="cm-back cm-tone-${h.tone}" id="cm-back-el" dir="rtl">
    <div class="cm-bp-masthead">
      <span class="cm-bp-paper">הגב</span>
      <span class="cm-bp-strap">סיכום העונה · ${cmEsc(cmClubName())}</span>
      <span class="cm-bp-crest">${clubCrestSVG(club, 30)}</span>
    </div>

    <div class="cm-bp-kicker">${cmEsc(h.kick)}</div>
    <h1 class="cm-bp-head">${cmEsc(h.big)}</h1>

    <div class="cm-bp-body">
      <div class="cm-bp-lead">
        <div class="cm-bp-photo">${clubCrestSVG(club, 86)}</div>
        <div class="cm-bp-caption">${cmEsc(cmPlace(s.myRank, s.n))}${club.city ? ' · ' + cmEsc(club.city) : ''}</div>
      </div>
      <div class="cm-bp-side">
        <div class="cm-bp-strip">
          <div><b>${s.wins}</b><span>נ׳</span></div>
          <div><b>${s.draws}</b><span>ת׳</span></div>
          <div><b>${s.losses}</b><span>ה׳</span></div>
          <div><b>${pts}</b><span>נק׳</span></div>
        </div>
        <div class="cm-bp-line" dir="ltr">${s.gfTotal} : ${s.gaTotal}</div>
        ${top && top.goals ? `<div class="cm-bp-box">
          <div class="cm-bp-box-t">מלך השערים</div>
          <div class="cm-bp-box-v">${cmEsc(shortName(top.name))} <b>${top.goals}</b></div>
        </div>` : ''}
        ${asst && asst.assists ? `<div class="cm-bp-box">
          <div class="cm-bp-box-t">מלך הבישולים</div>
          <div class="cm-bp-box-v">${cmEsc(shortName(asst.name))} <b>${asst.assists}</b></div>
        </div>` : ''}
      </div>
    </div>

    ${table.length ? `<div class="cm-bp-table">
      <div class="cm-bp-table-t">בראש הטבלה</div>
      ${table.map((t, i) => `<div class="cm-bp-tr${t.us ? ' us' : ''}">
        <span class="cm-bp-pos">${i + 1}</span>
        <span class="cm-bp-team">${t.us ? cmEsc(cmClubName()) : cmEsc(t.name)}</span>
        <span class="cm-bp-pts">${t.pts}</span>
      </div>`).join('')}
    </div>` : ''}

    <div class="cm-bp-foot" dir="ltr">36-0.co.il</div>
  </div>`;
}

/* ── showing them, and saving them ──────────────────────────────────────────── */

async function cmSaveNode(nodeId, filename, btn) {
  const orig = btn ? btn.textContent : '';
  if (btn) btn.textContent = '...מכין';
  try {
    // Reuse the share card's loader: one html2canvas on the site, loaded once.
    const ok = (typeof loadHtml2Canvas === 'function') ? await loadHtml2Canvas() : false;
    const node = document.getElementById(nodeId);
    if (!ok || !node) throw new Error('no renderer');
    const canvas = await html2canvas(node, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); if (btn) btn.textContent = '✓ שותף!'; setTimeout(() => btn && (btn.textContent = orig), 2000); return; }
      catch (e) { if (e?.name === 'AbortError') { if (btn) btn.textContent = orig; return; } }
    }
    if (typeof downloadBlobAs === 'function') downloadBlobAs(blob, filename);
    if (btn) { btn.textContent = '✓ נשמר'; setTimeout(() => btn.textContent = orig, 2000); }
  } catch (e) {
    if (btn) { btn.textContent = '⚠ שגיאה'; setTimeout(() => btn.textContent = orig, 2000); }
  }
}

function cmShow(html, nodeId, filename) {
  if (!html) return;
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay cm-modal';
  wrap.innerHTML = `<div class="cm-box">
      <button class="modal-close cm-x">✕</button>
      <div class="cm-scroll">${html}</div>
      <button class="btn-primary btn-full cm-save">⬇ שמור תמונה</button>
    </div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelector('.cm-x').onclick = close;
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('.cm-save').onclick = e => cmSaveNode(nodeId, filename, e.currentTarget);
}

function showTeamPhoto() { cmShow(clubTeamPhotoHTML(), 'cm-photo-el', '36-0-team.png'); }
function showBackPage()  { cmShow(clubBackPageHTML(),  'cm-back-el',  '36-0-backpage.png'); }

/* ── the two buttons on the results screen ──────────────────────────────────
   Hidden until a season actually exists, because both read window._lastSeason
   and an empty modal is worse than no button. fillResults() calls this. */
function cmSyncResultButtons() {
  const has = !!cmSeason();
  ['btn-team-photo', 'btn-back-page'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.style.display = has ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const p = document.getElementById('btn-team-photo');
  const b = document.getElementById('btn-back-page');
  if (p) p.addEventListener('click', showTeamPhoto);
  if (b) b.addEventListener('click', showBackPage);
  cmSyncResultButtons();
});
