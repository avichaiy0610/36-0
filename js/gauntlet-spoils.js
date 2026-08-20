// Victory spoils — spin the beaten squad, or spin for a relic.
//
// You beat them, so their roster goes on the wheel, rated as they were that
// season. One stop, and then you either sign him (somebody has to make room in
// an eleven) or walk away with the squad you came with. The ELITE road pays in
// relics far more often, which is the whole reason to take it.

function gtSpoilCandidates(node) {
  const sq = SQUADS.find(s => s.teamId === node.teamId && s.season === node.season);
  if (!sq) return [];
  const mine = new Set(state.picks.filter(Boolean).map(p => p.player.name));
  const depth = gtHas('watchlist') ? 6 : 14;      // רשימת מעקב narrows it to the stars
  return [...sq.players].sort((a, b) => b.ovr - a.ovr).slice(0, depth)
    .filter(p => !mine.has(p.name))
    .map(p => ({ ...p, squad: sq }));
}

function gtRelicsLeft() { return GT_RELICS.some(r => !gtHas(r.id) && !r.signatureOnly); }

// Relics are the reason to keep going, so they cannot be rare enough to miss in
// a whole run. Two in five wins on the normal road, three in four on ELITE — and
// a floor underneath: three wins with no relic and the next one is guaranteed,
// because a run that never shows you the mechanic may as well not have it.
function gtSpoilIsRelic(node) {
  if (!gtRelicsLeft()) return false;
  const run = gtRun();
  if ((run.dryWins || 0) >= 3) return true;
  const chance = (node.elite ? 0.75 : 0.42) + gtDealNum('relicDrop') + gtModNum('relicDrop');
  return Math.random() < chance;
}

function gtOfferSpoils(node, container) {
  const relicDraw = gtSpoilIsRelic(node);
  const run = gtRun();
  run.dryWins = relicDraw ? 0 : (run.dryWins || 0) + 1;
  gtSave();
  const pool = relicDraw ? [] : gtSpoilCandidates(node);
  if (!relicDraw && !pool.length) return;

  const box = document.createElement('div');
  box.className = 'gt-spoils';
  const club = (TEAMS[node.teamId] || {}).name || '';
  box.innerHTML = relicDraw
    ? `<div class="gt-spoils-kicker">שלל הניצחון</div>
       <div class="gt-spoils-title">🔮 קמע נפל מהשלל</div>
       <p class="gt-spoils-sub">${node.elite ? 'מסלול ELITE — הגלגל כאן נדיב בהרבה.' : 'הפעם לא שחקן: הגלגל עוצר על קמע.'}</p>
       <div id="gt-relic-reel"></div><div id="gt-relic-out"></div>`
    : `<div class="gt-spoils-kicker">שלל הניצחון</div>
       <div class="gt-spoils-title">🎰 הגרלה מהסגל שהבסת</div>
       <p class="gt-spoils-sub">הסגל של ${club} ${node.season} על הגלגל, בדירוג של אותה עונה.</p>
       <div class="gt-reel-wrap"><div class="gt-reel-mark"></div><div class="gt-reel" id="gt-reel"></div></div>
       <button class="btn-primary btn-full" id="gt-spin">🎰 סובב</button>
       <div id="gt-sign"></div>`;

  // sits under the result card, above the buttons — the verdict reads first
  const after = container.querySelector('.gt-res');
  if (after && after.nextSibling) container.insertBefore(box, after.nextSibling);
  else container.prepend(box);

  if (relicDraw) {
    gtSpinRelicReel(box.querySelector('#gt-relic-reel'), box.querySelector('#gt-relic-out'));
    return;
  }

  const reel = box.querySelector('#gt-reel');
  // long enough that a three-second spin is still moving when it starts to slow
  const strip = pool.concat(pool, pool, pool, pool, pool);
  reel.innerHTML = strip.map(p => `
    <div class="gt-reel-card">
      <span class="gt-reel-ovr">${p.ovr}</span>
      <span class="gt-reel-name">${playerShortName(p.name)}</span>
      <span class="gt-reel-pos">${p.position}</span>
    </div>`).join('');

  // Two stops instead of one: the greased wheel is permanent, the token is spent
  // here and now. Either way the player picks which of the two he wants.
  const token = !!(run.effects || {}).secondStop;
  const twice = (gtHas('greased-wheel') || token) && pool.length > 1;
  if (token && twice) { run.effects.secondStop = false; gtSave(); }

  const spin = box.querySelector('#gt-spin');
  spin.onclick = () => {
    spin.disabled = true;
    const winners = [];
    while (winners.length < (twice ? 2 : 1)) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (!winners.includes(w)) winners.push(w);
    }
    const land = winners.map(w => pool.length * 4 + pool.indexOf(w));
    [...reel.children].forEach(c => c.classList.remove('won'));
    gtAnimateReel(reel, land[0], () => {
      land.forEach(k => reel.children[k].classList.add('won'));
      spin.style.display = 'none';
      const target = box.querySelector('#gt-sign');
      if (winners.length === 1) { gtOfferSigning(winners[0], target, box); return; }
      target.innerHTML = `
        <p class="gt-sign-q">🎰 שתי עצירות — מי מהשניים?</p>
        ${winners.map((w, i) => `<button class="gt-sign-opt" data-w="${i}">
          <span>${w.name} · ${w.position}</span><span class="gt-delta up">${w.ovr}</span></button>`).join('')}`;
      target.querySelectorAll('.gt-sign-opt').forEach(b => {
        b.onclick = () => gtOfferSigning(winners[+b.dataset.w], target, box);
      });
    });
  };
}

// Signing keeps the XI at eleven, so a place has to be cleared. Only the slots
// this player can actually fill are offered — no goalkeeper at right back.
function gtOfferSigning(player, target, box) {
  const options = state.slots.map((slot, i) => ({ slot, i, pick: state.picks[i] }))
    .filter(o => o.pick && playerFitsSlot(player, o.slot.pos));
  const hideSpin = () => { const s = box.querySelector('#gt-spin'); if (s) s.style.display = 'none'; };

  if (!options.length) {
    target.innerHTML = `<p class="page-note">${playerShortName(player.name)} לא מתאים לאף עמדה בהרכב שלך — ההרכב נשאר כמו שהוא.</p>`;
    hideSpin();
    return;
  }
  target.innerHTML = `
    <p class="gt-sign-q">לצרף את <b>${player.name}</b> (${player.position} ${player.ovr})? מישהו צריך לפנות מקום:</p>
    ${options.map(o => {
      const d = player.ovr - gtOvrAt(o.pick, o.i);
      return `<button class="gt-sign-opt" data-slot="${o.i}">
        <span>✂️ להוציא את ${playerShortName(o.pick.player.name)} · ${o.slot.pos} ${gtOvrAt(o.pick, o.i)}</span>
        <span class="gt-delta ${d >= 0 ? 'up' : 'down'}" dir="ltr">${d >= 0 ? '+' : ''}${d}</span>
      </button>`;
    }).join('')}
    <button class="btn-secondary btn-full" id="gt-pass">🙅 ויתור, נשאר עם ההרכב שלי</button>`;

  target.querySelectorAll('.gt-sign-opt').forEach(btn => {
    btn.onclick = () => {
      const i = +btn.dataset.slot;
      const out = state.picks[i];
      state.picks[i] = { player, squad: player.squad };
      if (state.usedPlayerKeys) {
        state.usedPlayerKeys.delete(out.player.name);
        state.usedPlayerKeys.add(player.name);
      }
      // upgrades were bought for a man, not for a shirt: they leave with him
      const run = gtRun();
      run.signings = (run.signings || 0) + 1;
      if (run.boosts) delete run.boosts[out.player.name];
      if (run.peaks) run.peaks = run.peaks.filter(n => n !== out.player.name);
      gtStoreSquad();
      gtInvalidateDeltas();
      target.innerHTML = `<p class="gt-sign-done">✅ ${playerShortName(player.name)} נכנס במקום ${playerShortName(out.player.name)} · דירוג ההרכב: <b>${teamOVR(gtOvrAt)}</b></p>`;
      hideSpin();
    };
  });
  const pass = target.querySelector('#gt-pass');
  if (pass) pass.onclick = () => {
    target.innerHTML = `<p class="gt-sign-done">ויתרת על ${playerShortName(player.name)}. ההרכב נשאר כמו שהוא.</p>`;
    hideSpin();
  };
}
