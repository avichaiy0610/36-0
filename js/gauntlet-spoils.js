// Victory spoils — spin the beaten squad.
//
// You beat them, so their roster goes on the wheel, rated as they were that
// season. One stop, and then you either sign him (somebody has to make room in
// an eleven) or walk away with the squad you came with.

function gtSpoilCandidates(node) {
  const sq = SQUADS.find(s => s.teamId === node.teamId && s.season === node.season);
  if (!sq) return [];
  const mine = new Set(state.picks.filter(Boolean).map(p => p.player.name));
  return [...sq.players].sort((a, b) => b.ovr - a.ovr).slice(0, 14)
    .filter(p => !mine.has(p.name))
    .map(p => ({ ...p, squad: sq }));
}

function gtOfferSpoils(node, container) {
  const pool = gtSpoilCandidates(node);
  if (!pool.length) return;
  const box = document.createElement('div');
  box.className = 'gt-spoils';
  box.innerHTML = `
    <div class="gt-spoils-kicker">שלל הניצחון</div>
    <div class="gt-spoils-title">🎰 הגרלה מהסגל שהבסת</div>
    <p class="gt-spoils-sub">הסגל של ${(TEAMS[node.teamId] || {}).name || ''} ${node.season} על הגלגל, בדירוג של אותה עונה. עצירה אחת.</p>
    <div class="gt-reel-wrap"><div class="gt-reel-mark"></div><div class="gt-reel" id="gt-reel"></div></div>
    <button class="btn-primary btn-full" id="gt-spin">🎰 סובב</button>
    <div id="gt-sign"></div>`;
  // sits under the result card, above the buttons — the verdict reads first
  const after = container.querySelector('.gt-res');
  if (after && after.nextSibling) container.insertBefore(box, after.nextSibling);
  else container.prepend(box);

  const reel = box.querySelector('#gt-reel');
  const strip = pool.concat(pool, pool);            // long enough to slide past
  reel.innerHTML = strip.map(p => `
    <div class="gt-reel-card">
      <span class="gt-reel-ovr">${p.ovr}</span>
      <span class="gt-reel-name">${playerShortName(p.name)}</span>
      <span class="gt-reel-pos">${p.position}</span>
    </div>`).join('');

  const spin = box.querySelector('#gt-spin');
  spin.onclick = () => {
    spin.disabled = true;
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const idx = pool.length + pool.indexOf(winner);  // land inside the middle copy
    const card = reel.children[idx];
    const offset = card.offsetLeft - reel.clientWidth / 2 + card.clientWidth / 2;
    reel.scrollTo({ left: offset, behavior: 'smooth' });
    setTimeout(() => {
      [...reel.children].forEach(c => c.classList.remove('won'));
      card.classList.add('won');
      gtOfferSigning(winner, box.querySelector('#gt-sign'), box);
    }, 1200);
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
      const d = player.ovr - playerOVR(o.pick.player);
      return `<button class="gt-sign-opt" data-slot="${o.i}">
        <span>✂️ להוציא את ${playerShortName(o.pick.player.name)} · ${o.slot.pos} ${playerOVR(o.pick.player)}</span>
        <span class="gt-delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</span>
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
      gtStoreSquad();
      target.innerHTML = `<p class="gt-sign-done">✅ ${playerShortName(player.name)} נכנס במקום ${playerShortName(out.player.name)} · דירוג ההרכב: <b>${teamOVR()}</b></p>`;
      hideSpin();
    };
  });
  const pass = target.querySelector('#gt-pass');
  if (pass) pass.onclick = () => {
    target.innerHTML = `<p class="gt-sign-done">ויתרת על ${playerShortName(player.name)}. ההרכב נשאר כמו שהוא.</p>`;
    hideSpin();
  };
}
