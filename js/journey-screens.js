// The journey's decisions are visible before a player is placed on the pitch.
function journeyEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function journeyCrest(squad, small = false) {
  const team = getTeam(squad.teamId);
  return `<span class="jr-crest${small ? ' jr-crest-small' : ''}" style="--jr-club:${team.primaryColor}"><span>${journeyEsc(team.name.slice(0, 1))}</span><img src="crests/${journeyEsc(squad.teamId)}.png" alt="" onload="this.previousElementSibling.hidden=true" onerror="this.remove()"></span>`;
}
function journeyFact(squad) {
  if (typeof JOURNEY_FACTS === 'undefined') return '';
  const row = JOURNEY_FACTS[squad.id];
  if (!row) return '';
  if (row.pos === 1) return '🏆 עונת אליפות';
  return `בעונה הזאת: מקום ${row.pos} בליגה · ${row.pts} נקודות${row.half ? ' (אחרי חציית הנקודות)' : ''}`;
}
function journeyRouteHTML(j, full = false) {
  const steps = j.path || [];
  const pending = j.phase === 'pick' ? journeyEngine().squad(j.visited[j.visited.length - 1]) : null;
  let html = steps.map((step, i) => {
    const squad = journeyEngine().squad(step.squadId);
    if (!squad) return '';
    return `<li class="jr-stop${step.arrival === 'break' ? ' jr-stop-break' : ''}">
      <span class="jr-stop-num">${String(i + 1).padStart(2, '0')}</span>${journeyCrest(squad, true)}
      <div><b>${journeyEsc(getTeam(squad.teamId).name)}</b><span dir="ltr">${journeyEsc(squad.season)}</span></div>
      <strong>${journeyEsc(step.name)}</strong>${step.arrival === 'break' ? '<em>שבירת שרשרת</em>' : ''}</li>`;
  }).join('');
  if (pending) html += `<li class="jr-stop jr-stop-current"><span class="jr-stop-num">${String(steps.length + 1).padStart(2, '0')}</span>
    ${journeyCrest(pending, true)}<div><b>${journeyEsc(getTeam(pending.teamId).name)}</b><span dir="ltr">${journeyEsc(pending.season)}</span></div><strong>התחנה שלך עכשיו</strong></li>`;
  if (!full && steps.length < 10) html += `<li class="jr-stop jr-stop-future"><span class="jr-future-icon">✧</span><b>הדרך עוד פתוחה</b><span>הבחירה הבאה שלך תצייר אותה</span></li>`;
  return `<ol class="jr-route${full ? ' jr-route-full' : ''}" aria-label="תחנות המסע">${html}</ol>`;
}
function journeyStatsHTML(j) {
  const squads = j.path.map(p => journeyEngine().squad(p.squadId)).filter(Boolean);
  const years = squads.map(s => parseInt(s.season, 10));
  const clubs = new Set(squads.map(s => s.teamId)).size;
  const span = years.length ? Math.max(...years) - Math.min(...years) + 1 : 0;
  return `<div class="jr-stats"><div><b>${j.path.length}<small>/11</small></b><span>שחקנים נבחרו</span></div>
    <div><b>${clubs}</b><span>מועדונים במסלול</span></div><div><b>${span}</b><span>שנים של כדורגל</span></div>
    <div><b>${j.broken ? 'נוצלה' : 'נותרה'}</b><span>שבירת שרשרת</span></div></div>`;
}
function journeySavedDraft() {
  try { const d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY)); return d && d.journey && d.journey.v === 1 ? d : null; }
  catch (e) { return null; }
}
function journeyShowHub() {
  showScreen('journey');
  const saved = journeySavedDraft();
  const box = document.getElementById('journey-root');
  box.innerHTML = `<div class="jr-top"><button class="back-btn" id="jr-back">→ למצבים</button><span class="jr-kicker">דראפט עם דרך משלו</span></div>
    <div class="jr-hero"><div class="jr-compass" aria-hidden="true">✧</div><span class="jr-eyebrow">27 עונות. אלפי שחקנים. מסלול אחד שלך.</span>
      <h1>מסע ה־<span>11</span></h1><p>אתה לא רק בוחר שחקן.<br>אתה בוחר לאן המשחק הולך.</p>
      <div class="jr-hero-trail" aria-hidden="true"><span>מועדון</span><i>←</i><span>שחקן</span><i>←</i><span>תחנה חדשה</span><i>←</i><span>הרכב שלך</span></div></div>
    ${saved ? `<div class="jr-resume"><div><b>המסע שלך מחכה</b><span>${saved.journey.path.length} מתוך 11 שחקנים · ${journeyLevel(saved.journey).label} · ${saved.season ? 'העונה כבר שוחקה' : saved.journey.phase === 'travel' ? 'בוחרים את התחנה הבאה' : 'ממשיכים מאותה נקודה'}</span></div><button class="btn-primary" id="jr-resume">המשך מסע ←</button></div>` : ''}
    <div class="jr-rules"><div><span>01</span><h3>בחר שחקן</h3><p>מתחילים בסגל מועדון־עונה אקראי. קח ממנו שחקן לעמדה פנויה.</p></div>
      <div><span>02</span><h3>לך בעקבותיו</h3><p>הסגלים האחרים בקריירה שלו פותחים לך תחנות חדשות. אפשר לנוע גם אחורה בזמן.</p></div>
      <div><span>03</span><h3>צא לעונה</h3><p>11 שחקנים, 11 תחנות. ההרכב שבנית ממשיך לליגה, לגביע ולאירופה.</p></div></div>
    <div class="jr-start-panel"><div><span class="jr-eyebrow">לפני שיוצאים לדרך</span><h2>באיזה מערך יוצאים?</h2><p>העמדות ננעלות כשבוחרים שחקן. כל בחירה פתוחה משאירה דרך להשלמת הרכב.</p></div>
      <span class="jr-select-label" id="jr-level-label">רמת קושי</span>
      <div class="jr-levels" role="radiogroup" aria-labelledby="jr-level-label">${Object.entries(JOURNEY_LEVELS).filter(([, L]) => !L.hidden).map(([k, L]) =>
        `<button type="button" class="jr-level${k === 'normal' ? ' selected' : ''}" role="radio" aria-checked="${k === 'normal'}" data-jr-level="${k}"><b>${L.label}</b><span>${journeyLevelBlurb(L)}</span></button>`).join('')}</div>
      <label class="jr-select-label" for="jr-formation">מערך ההרכב</label><select id="jr-formation" class="jr-select">${Object.keys(FORMATIONS).map(k => `<option value="${journeyEsc(k)}"${k === '4-3-3' ? ' selected' : ''}>${journeyEsc(FORMATIONS[k].label)}</option>`).join('')}</select>
      <button class="btn-primary btn-full" id="jr-start">${saved ? 'צא למסע חדש' : 'צא למסע'} ←</button>
      <p class="jr-footnote">סגל ושחקן לא חוזרים במסע. שבירת שרשרת אחת מאפשרת לבחור דרך חדשה. ההרכב נשמר לאורך העונה, בלי חלון ינואר.</p></div>
      <section class="jr-ach-section" data-journey-achievements>${journeyAchievementsHTML()}</section>`;
  if (typeof track === 'function') track('open', 'journey');
  box.querySelector('#jr-back').onclick = () => { startGame(); };
  box.querySelectorAll('[data-jr-level]').forEach(button => {
    button.onclick = () => box.querySelectorAll('[data-jr-level]').forEach(b => {
      b.classList.toggle('selected', b === button); b.setAttribute('aria-checked', String(b === button));
    });
  });
  const resume = box.querySelector('#jr-resume');
  if (resume) resume.onclick = () => {
    if (!restoreDraftState()) {
      const note = document.createElement('p'); note.className = 'jr-warning';
      note.textContent = 'השמירה אינה תואמת לנתונים הנוכחיים. אפשר לצאת למסע חדש.';
      resume.disabled = true; resume.after(note);
    }
  };
  box.querySelector('#jr-start').onclick = () => {
    if (saved && !confirm('להחליף את המסע השמור במסע חדש?')) return;
    const button = box.querySelector('#jr-start');
    button.disabled = true; button.textContent = 'פותח את הדרך…';
    const f = box.querySelector('#jr-formation').value;
    const level = box.querySelector('[data-jr-level].selected')?.dataset.jrLevel || 'normal';
    setTimeout(() => journeyStart(f, level), 30);
  };
}
function journeyLevelBlurb(L) {
  return [L.clubLimit === 1 ? 'כל מועדון פעם אחת' : 'מועדון עד פעמיים',
    L.doors ? L.doors + ' תחנות מוגרלות' : 'כל התחנות פתוחות',
    L.ratings ? 'עם דירוגים' : 'בלי דירוגים'].join(' · ');
}
function journeyDestinationHTML(squad, breaking) {
  const j = state.journey;
  const available = squad.players.filter(p => !state.usedPlayerKeys.has(p.name) &&
    emptySlotIndices().some(i => playerFitsSlot(p, slotFitPos(state.slots[i]))))
    // Without ratings the preview must not rank them either.
    .sort((a, b) => state.showRatings ? b.ovr - a.ovr : (a.name < b.name ? -1 : 1)).slice(0, 3);
  const previous = j.path.length ? journeyEngine().squad(j.path[j.path.length - 1].squadId) : state.currentSquad;
  const delta = previous ? parseInt(squad.season, 10) - parseInt(previous.season, 10) : 0;
  return `<button class="jr-destination" data-jr-dest="${journeyEsc(squad.id)}" data-jr-break="${breaking ? '1' : '0'}">
    <span class="jr-dest-top">${journeyCrest(squad)}<span><b>${journeyEsc(getTeam(squad.teamId).name)}</b><strong dir="ltr">${journeyEsc(squad.season)}</strong></span><em>${delta === 0 ? 'אותה עונה' : delta > 0 ? '+' + delta + ' שנים' : Math.abs(delta) + ' שנים אחורה'}</em></span>
    <span class="jr-dest-fact">${journeyEsc(journeyFact(squad) || 'תחנה חדשה בכדורגל הישראלי')}</span>
    <span class="jr-dest-players">${available.map(p => `<span>${state.showRatings ? `<b>${p.ovr}</b> ` : ''}${journeyEsc(p.name)} <small>${journeyEsc(POS_HE[p.position] || p.position)}</small></span>`).join('')}</span>
    <span class="jr-dest-bottom">${breaking ? 'לשבור את השרשרת ולהגיע לכאן' : 'המשך לתחנה הזאת'} <b>←</b></span></button>`;
}
function journeyShowTravel(escaping = false, showAll = false) {
  const j = state.journey;
  if (!j || j.phase !== 'travel') return;
  const last = j.path[j.path.length - 1];
  const destinations = escaping ? journeyPrepareEscape() : journeyDestinations();
  showScreen('journey');
  const box = document.getElementById('journey-root');
  box.innerHTML = `<div class="jr-top"><button class="back-btn" id="jr-pause">→ שמור וצא</button><span class="jr-kicker">מסע ה־11 · ${journeyLevel(j).label} · תחנה ${j.path.length + 1}</span></div>
    <div class="jr-travel-title"><span class="jr-eyebrow">${escaping ? 'פעם אחת. דרך חדשה.' : 'הבחירה שלך פתחה את הדרך'}</span>
      <h1>${escaping ? 'שוברים את השרשרת?' : 'לאן ' + journeyEsc(last.name) + ' לוקח אותך?'}</h1>
      <p>${escaping ? 'בחר אחת משלוש התחנות. השבירה תיחשב רק כשתיכנס לתחנה; אפשר גם לחזור למסלול.' : (journeyLevel(j).doors ? 'הוגרלו עד ' + journeyLevel(j).doors + ' תחנות מתוך הקריירה שלו. ההגרלה נשמרת, ושבירת השרשרת פותחת שלוש אחרות.' : 'אלה הסגלים האחרים שלו שמהם אפשר להמשיך ולהשלים את ההרכב.')}</p></div>
    ${journeyStatsHTML(j)}<details class="jr-route-details"${j.path.length < 4 ? ' open' : ''}><summary>הדרך שעשית עד כאן <span>${j.path.length} תחנות</span></summary>${journeyRouteHTML(j)}</details>
    <div class="jr-choice-head"><div><h2>${escaping ? 'שלוש דלתות חדשות' : 'בחר את התחנה הבאה'}</h2><p>${emptySlotIndices().map(i => state.slots[i].label).map(journeyEsc).join(' · ')}</p></div>
      ${escaping ? '<button class="jr-outline" id="jr-cancel-escape">חזור למסלול</button>' : !j.broken ? '<button class="jr-outline jr-break-btn" id="jr-escape">✂ שבירת שרשרת · נותרה 1</button>' : '<span class="jr-spent">שבירת השרשרת נוצלה</span>'}</div>
    ${destinations.length ? `<div class="jr-dest-grid">${(showAll ? destinations : destinations.slice(0, 6)).map(s => journeyDestinationHTML(s, escaping)).join('')}</div>` :
      '<div class="jr-empty"><b>מכאן צריך לפתוח דרך חדשה</b><p>אין המשך מתאים בקריירה הזאת לעמדות שנותרו. שבירת השרשרת שלך שמורה בדיוק לרגע כזה.</p></div>'}
    ${!showAll && destinations.length > 6 ? `<button class="jr-outline jr-show-all" id="jr-all">הצג את כל ${destinations.length} התחנות</button>` : ''}`;
  box.querySelector('#jr-pause').onclick = journeyPause;
  box.querySelector('#jr-escape')?.addEventListener('click', () => journeyShowTravel(true));
  box.querySelector('#jr-cancel-escape')?.addEventListener('click', () => journeyShowTravel(false));
  box.querySelector('#jr-all')?.addEventListener('click', () => journeyShowTravel(escaping, true));
  box.querySelectorAll('[data-jr-dest]').forEach(button => {
    button.onclick = () => journeyEnter(button.dataset.jrDest, button.dataset.jrBreak === '1');
  });
}
function journeyRenderDraft() {
  const j = state.journey;
  if (!j) return;
  const route = document.getElementById('journey-draft-route');
  route.hidden = false;
  route.innerHTML = `<div class="jr-draft-head"><span>🧭 מסע ה־11</span><b>תחנה ${j.path.length + 1} / 11</b></div>
    <details class="jr-route-details"><summary>המסלול שלך <span>${j.broken ? 'השבירה נוצלה' : 'שבירה אחת שמורה'}</span></summary>${journeyRouteHTML(j)}</details>`;
  const note = document.getElementById('journey-draft-note');
  note.hidden = false;
  note.innerHTML = `<span class="jr-eyebrow">${journeyEsc(journeyFact(state.currentSquad) || 'התחנה הנוכחית שלך')}</span><p>היעדים של כל שחקן מופיעים מתחת לשם שלו. בחר גם שחקן וגם דרך.${journeyLevel(j).doors ? ' אחרי הבחירה יוגרלו עד ' + journeyLevel(j).doors + ' מהם.' : ''}${journeyLevel(j).clubLimit === 1 ? ' כל מועדון נכנס למסע פעם אחת.' : ''}</p>`;
  const options = journeyOptions();
  const cards = [...document.querySelectorAll('#players-list .player-card')];
  cards.forEach(card => {
    const name = card.dataset.name;
    const option = options.find(p => p.name === name);
    const used = state.usedPlayerKeys.has(name);
    const span = document.createElement('span'); span.className = 'jr-player-links';
    if (used) span.textContent = 'כבר בהרכב שלך';
    else if (!option) span.textContent = 'אין עמדה עם המשך בטוח למסע';
    else if (j.path.length === 10) span.textContent = 'הבחירה שסוגרת את המסע';
    else {
      const clubs = [...new Set(option.links.map(s => getTeam(s.teamId).name))];
      span.textContent = clubs.length ? '↳ ' + clubs.slice(0, 3).join(' · ') + (clubs.length > 3 ? ' +' + (clubs.length - 3) : '') : '✂ ההמשך דורש שבירת שרשרת';
      span.title = clubs.join(' · ');
    }
    card.querySelector('.pc-name')?.appendChild(span);
  });
  const exit = document.getElementById('btn-draft-exit'); if (exit) exit.textContent = '← שמור מסע וצא';
  const restart = document.getElementById('btn-draft-restart'); if (restart) restart.textContent = '↩ מסע חדש';
}
function journeyShowComplete() {
  const j = state.journey;
  if (!j || j.path.length !== 11) return;
  journeyAwardAchievements(j);
  state.isAnimating = false;
  showScreen('journey');
  const box = document.getElementById('journey-root');
  box.innerHTML = `<div class="jr-top"><button class="back-btn" id="jr-pause">→ שמור וצא</button><span class="jr-kicker">מסע ה־11 · הרכב מוכן</span></div>
    <div class="jr-travel-title"><span class="jr-eyebrow">11 בחירות שהביאו אותך לכאן</span><h1>הדרך שלך. <span>ההרכב שלך.</span></h1><p>עכשיו נראה מה המסע הזה שווה על הדשא.</p></div>
    ${journeyStatsHTML(j)}<div class="jr-finish-grid"><div class="jr-route-card" id="jr-route-share"><div class="jr-card-title"><b>36–0 · מסע ה־11</b><span>${FORMATIONS[state.formationId].label} · דירוג ${teamOVR()}</span></div>${journeyRouteHTML(j, true)}</div>
      <div class="jr-finish-side"><div class="jr-overall"><span>דירוג ההרכב שלך</span><b>${teamOVR()}</b></div><p>המסלול מסתיים. העונה מתחילה.<br>ליגה, גביע והזדמנות להגיע לאירופה.</p><button class="btn-primary btn-full" id="jr-season">צא לעונה ←</button><button class="jr-outline btn-full" id="jr-share">↓ שמור תמונת מסלול</button><span id="jr-share-status" role="status"></span></div></div>
      <section class="jr-ach-section" data-journey-achievements>${journeyAchievementsHTML()}</section>`;
  box.querySelector('#jr-pause').onclick = journeyPause;
  box.querySelector('#jr-season').onclick = journeyPlaySeason;
  box.querySelector('#jr-share').onclick = journeyDownloadRoute;
}
async function journeyDownloadRoute() {
  const status = document.getElementById('jr-share-status');
  try {
    if (typeof html2canvas === 'undefined') await loadHtml2Canvas();
    const card = document.getElementById('jr-route-share');
    const canvas = await html2canvas(card, { backgroundColor: '#0d1117', scale: 2 });
    const a = document.createElement('a'); a.download = '36-0-journey.png'; a.href = canvas.toDataURL('image/png'); a.click();
    if (status) status.textContent = 'תמונת המסלול נשמרה';
    if (typeof track === 'function') track('share', 'journey', journeyLevelKey());
  } catch (e) { if (status) status.textContent = 'לא ניתן לשמור תמונה כרגע. נסה שוב.'; }
}
function journeyShareLine() {
  const j = state.journey;
  if (!j) return null;
  return '🧭 מסע ה־11\n' + j.path.map(p => {
    const s = journeyEngine().squad(p.squadId);
    return `${getTeam(s.teamId).name} ${s.season} · ${p.name}`;
  }).join('\n');
}
function journeySyncSurfaces(screenId) {
  const j = state.journey;
  ['journey-draft-route', 'journey-draft-note', 'journey-pre-summary'].forEach(id => {
    const el = document.getElementById(id); if (el) el.hidden = !j;
  });
  if (!j) {
    const exit = document.getElementById('btn-draft-exit'); if (exit) exit.textContent = '← יציאה למסך הראשי';
    const restart = document.getElementById('btn-draft-restart'); if (restart) restart.textContent = '↩ התחל מחדש';
  }
  if (j && screenId === 'preseason') {
    const box = document.getElementById('journey-pre-summary');
    if (box) box.innerHTML = `<details class="jr-route-details"><summary>🧭 מסע ה־11 — הדרך להרכב שלך</summary>${journeyRouteHTML(j, true)}</details>`;
  }
  const results = document.querySelector('#screen-results .results-side');
  if (results) {
    let box = document.getElementById('journey-result-summary');
    if (!box) { box = document.createElement('div'); box.id = 'journey-result-summary'; results.prepend(box); }
    box.hidden = !j;
    if (j && screenId === 'results') box.innerHTML = `<details class="jr-route-details"><summary>🧭 מסע ה־11 — המסלול שלך</summary>${journeyRouteHTML(j, true)}</details>`;
  }
}
