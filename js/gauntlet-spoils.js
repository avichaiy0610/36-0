// Victory spoils — one wheel, players and relics on it together.
//
// You beat them, so their roster goes on the wheel, rated as they were that
// season, mixed in with relics you do not hold yet. The ELITE road is why you
// took it: there the relics outnumber the players.

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

// How the wheel is stacked. On the normal road most cards are players; on the
// ELITE road the relics outnumber them, which is the whole reason to take it.
// The deal and the rule can tilt it further.
function gtSpoilMix(node) {
  const elite = gtIsElite(node);
  const tilt = gtDealNum('relicDrop') + gtModNum('relicDrop');   // 0.2 → two more
  return {
    players: elite ? 4 : 8,
    relics: Math.round((elite ? 6 : 3) + tilt * 10),
  };
}

function gtShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// The cards on the wheel: real players from the beaten squad, real relics from
// what is left in the game, shuffled together so the eye cannot count them.
function gtSpoilPool(node) {
  const mix = gtSpoilMix(node);
  const players = gtSpoilCandidates(node).slice(0, mix.players)
    .map(p => ({ kind: 'player', player: p }));
  const relics = gtShuffle(GT_RELICS.filter(r => !gtHas(r.id) && !r.signatureOnly))
    .slice(0, mix.relics).map(r => ({ kind: 'relic', relic: r }));
  return gtShuffle(players.concat(relics));
}

function gtSpoilCardHTML(c) {
  return c.kind === 'relic'
    ? `<div class="gt-reel-card gt-reel-relic ${c.relic.rarity}">
         <span class="gt-reel-ovr">${c.relic.icon}</span>
         <span class="gt-reel-name">${c.relic.name}</span>
         <span class="gt-reel-pos">${GT_RARITY_HE[c.relic.rarity]}</span>
       </div>`
    : `<div class="gt-reel-card">
         <span class="gt-reel-ovr">${c.player.ovr}</span>
         <span class="gt-reel-name">${playerShortName(c.player.name)}</span>
         <span class="gt-reel-pos">${c.player.position}</span>
       </div>`;
}

// A run that never shows you a relic may as well not have the mechanic, so
// three relic-less wins in a row and the next wheel is made to land on one.
function gtPickSpoil(pool) {
  const run = gtRun();
  const relics = pool.filter(c => c.kind === 'relic');
  if (run.forceSpoil) {                       // sandbox: pin the card type
    const want = pool.filter(c => c.kind === run.forceSpoil);
    delete run.forceSpoil;
    gtSave();
    if (want.length) return want[Math.floor(Math.random() * want.length)];
  }
  if ((run.dryWins || 0) >= 3 && relics.length) {
    return relics[Math.floor(Math.random() * relics.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function gtOfferSpoils(node, container) {
  const pool = gtSpoilPool(node);
  if (!pool.length) return;

  const box = document.createElement('div');
  box.className = 'gt-spoils';
  const club = (TEAMS[node.teamId] || {}).name || '';
  const relicCount = pool.filter(c => c.kind === 'relic').length;
  box.innerHTML = `
    <div class="gt-spoils-kicker">שלל הניצחון</div>
    <div class="gt-spoils-title">🎰 גלגל השלל</div>
    <p class="gt-spoils-sub">${gtIsElite(node)
      ? `מסלול ELITE - על הגלגל ${relicCount} קמעות מול ${pool.length - relicCount} שחקנים של ${club} ${node.season}.`
      : `שחקנים של ${club} ${node.season} בדירוג של אותה עונה, ובתוכם ${relicCount} קמעות.`}</p>
    <div class="gt-reel-wrap"><div class="gt-reel-mark"></div><div class="gt-reel" id="gt-reel"></div></div>
    <button class="btn-primary btn-full" id="gt-spin">🎰 סובב</button>
    <div id="gt-sign"></div>`;

  // sits under the result card, above the buttons — the verdict reads first
  const after = container.querySelector('.gt-res');
  if (after && after.nextSibling) container.insertBefore(box, after.nextSibling);
  else container.prepend(box);

  const reel = box.querySelector('#gt-reel');
  // long enough that a three-second spin is still moving when it starts to slow
  const strip = pool.concat(pool, pool, pool, pool, pool);
  reel.innerHTML = strip.map(gtSpoilCardHTML).join('');

  // Two stops instead of one: the greased wheel is permanent, the token is spent
  // here and now. Either way the player picks which of the two he wants.
  const run = gtRun();
  const token = !!(run.effects || {}).secondStop;
  const twice = (gtHas('greased-wheel') || token) && pool.length > 1;
  if (token && twice) { run.effects.secondStop = false; gtSave(); }

  const settle = (card, target) => {
    const r = gtRun();
    if (card.kind === 'relic') {
      r.dryWins = 0; gtSave();
      gtGrantRelic(card.relic, target);
    } else {
      r.dryWins = (r.dryWins || 0) + 1; gtSave();
      gtOfferSigning(card.player, target, box);
    }
  };

  const spin = box.querySelector('#gt-spin');
  spin.onclick = () => {
    spin.disabled = true;
    const winners = [];
    while (winners.length < (twice ? 2 : 1)) {
      const w = gtPickSpoil(pool);
      if (!winners.includes(w)) winners.push(w);
    }
    const land = winners.map(w => pool.length * 4 + pool.indexOf(w));
    [...reel.children].forEach(c => c.classList.remove('won'));
    gtAnimateReel(reel, land[0], () => {
      land.forEach(k => reel.children[k].classList.add('won'));
      spin.style.display = 'none';
      const target = box.querySelector('#gt-sign');
      if (winners.length === 1) return settle(winners[0], target);
      target.innerHTML = `
        <p class="gt-sign-q">🎰 שתי עצירות - מה לקחת?</p>
        ${winners.map((w, i) => `<button class="gt-sign-opt" data-w="${i}">
          <span>${w.kind === 'relic' ? w.relic.icon + ' ' + w.relic.name
                                     : w.player.name + ' · ' + w.player.position}</span>
          <span class="gt-delta up">${w.kind === 'relic' ? GT_RARITY_HE[w.relic.rarity] : w.player.ovr}</span>
        </button>`).join('')}`;
      target.querySelectorAll('.gt-sign-opt').forEach(b => {
        b.onclick = () => settle(winners[+b.dataset.w], target);
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
    target.innerHTML = `<p class="page-note">${playerShortName(player.name)} לא מתאים לאף עמדה בהרכב שלך - ההרכב נשאר כמו שהוא.</p>`;
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
