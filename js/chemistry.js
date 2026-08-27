// ─── Chemistry: the men who really played together ────────────────────────────
//
// Until now the draft had one right answer — take the highest rating that fits.
// Chemistry gives the knowledge of Israeli football something to buy: two
// players who spent years side by side at the same club lift each other, so the
// 84 who stood next to your centre-back for eight seasons can be worth more than
// a stranger on 87.
//
// The pairs are real (js/chem-data.js, mined from our own squads and the real
// title tables) and the rules are deliberately tight:
//   · a player's STRONGEST link pays in full: +1, +2 or +3
//   · his SECOND link pays a quarter of its tier
//   · a third link pays nothing
// Eleven men from one dynasty squad — the most a drafter can stack — gain about
// three rating points each. A normally drafted XI finds a link 17% of the time.

const CHEM_SECOND = 0.25;      // what a player's second link is worth

// What a tier is actually worth in rating points. The tier is the STRENGTH of
// the record (how long they played together, what they won); this is the price
// list. Keep the two apart: the tier is a fact about them, the bonus is a
// balance decision, and it has now been made twice — halved before release
// because a squad stitched together out of famous duos was walking to the
// title, and trimmed again after the first live day, when chemistry and the
// finishers together were worth +2.45 attack to a peak-mode XI and pushed
// hundred-goal seasons from 26% of the top bracket to 44%.
const CHEM_BONUS = { 1: 0.4, 2: 0.7, 3: 1 };
function chemBonusOf(tier) { return CHEM_BONUS[tier] ?? 0; }
// "+1" and "+1.5", never "+1.0"
function chemFmt(n) { return (Math.round(n * 10) / 10).toString(); }
let _chemOff = false;          // used to measure the XI as if there were no links

function chemNorm(s) {
  return String(s ?? '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[׳’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function chemKey(a, b) { return [chemNorm(a), chemNorm(b)].sort().join('|'); }

// [tier, seasons, titles] for a pair, or null
function chemPair(a, b) {
  if (typeof CHEM_PAIRS === 'undefined') return null;
  return CHEM_PAIRS[chemKey(a, b)] || null;
}
function chemTier(a, b) { const p = chemPair(a, b); return p ? p[0] : 0; }

/* ── links inside an XI ───────────────────────────────────────────────────── */
// Returns, per slot index, the links that slot's player has with the rest of the
// XI — strongest first. Cached against the picks themselves, because the rating
// helpers ask for this on every redraw.
let _chemCache = { sig: null, links: null };

function chemLinks(picks) {
  const list = picks || (typeof state !== 'undefined' ? state.picks : null);
  if (!Array.isArray(list)) return {};
  const sig = list.map(p => (p && p.player ? chemNorm(p.player.name) : '')).join('|');
  if (_chemCache.sig === sig) return _chemCache.links;

  const links = {};
  for (let i = 0; i < list.length; i++) {
    if (!list[i] || !list[i].player) continue;
    for (let j = i + 1; j < list.length; j++) {
      if (!list[j] || !list[j].player) continue;
      const pair = chemPair(list[i].player.name, list[j].player.name);
      if (!pair) continue;
      (links[i] = links[i] || []).push({ with: j, name: list[j].player.name, tier: pair[0], seasons: pair[1], titles: pair[2] });
      (links[j] = links[j] || []).push({ with: i, name: list[i].player.name, tier: pair[0], seasons: pair[1], titles: pair[2] });
    }
  }
  Object.keys(links).forEach(k => links[k].sort((a, b) => b.tier - a.tier));
  _chemCache = { sig, links };
  return links;
}

// What slot `idx` gains: its best link in full, its second at a quarter.
function chemBonusAt(idx, picks) {
  if (_chemOff) return 0;
  const l = chemLinks(picks)[idx];
  if (!l || !l.length) return 0;
  return chemBonusOf(l[0].tier) + (l[1] ? chemBonusOf(l[1].tier) * CHEM_SECOND : 0);
}

// Every link in the XI, once each — for the summary line under the pitch.
function chemLinkList(picks) {
  const links = chemLinks(picks);
  const seen = new Set(), out = [];
  Object.keys(links).forEach(i => {
    links[i].forEach(l => {
      const key = [i, l.with].sort((a, b) => a - b).join('-');
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ a: +i, b: l.with, tier: l.tier, seasons: l.seasons, titles: l.titles });
    });
  });
  return out.sort((x, y) => y.tier - x.tier);
}

/* ── before you pick ──────────────────────────────────────────────────────── */
// The whole point is that a player must be able to SEE the link before choosing
// him. Given a candidate, this returns the best link he would form with the XI
// as it stands.
function chemPreview(player, picks) {
  const list = picks || (typeof state !== 'undefined' ? state.picks : null);
  if (!Array.isArray(list) || !player) return null;
  let best = null;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p || !p.player) continue;
    const pair = chemPair(player.name, p.player.name);
    if (!pair) continue;
    if (!best || pair[0] > best.tier) {
      best = { with: p.player.name, tier: pair[0], seasons: pair[1], titles: pair[2] };
    }
  }
  return best;
}

// "8 עונות יחד · 4 אליפויות"
function chemWhy(link) {
  if (!link) return '';
  const bits = [`${link.seasons} עונות יחד`];
  if (link.titles > 0) bits.push(`${link.titles} אליפויות`);
  return bits.join(' · ');
}

/* ── on the pitch ─────────────────────────────────────────────────────────── */
// Three different places build tokens (the draft pitch, the pre-season pitch and
// the results pitch), and each of them writes className from scratch. So the
// ring is painted in ONE place, called after any of them — otherwise it lights
// up and then vanishes the moment the next player is placed.
function chemPaintTokens(root) {
  const box = typeof root === 'string' ? document.getElementById(root) : root;
  if (!box) return;
  const links = chemLinks();
  const tokens = box.querySelectorAll('.slot-token');
  tokens.forEach(function (token, pos) {
    // the token knows which slot it is; DOM order is only the fallback
    const idx = token.dataset && token.dataset.idx != null ? +token.dataset.idx : pos;
    const l = (links[idx] || [])[0];
    token.classList.toggle('tok-chem', !!l);
    if (l) {
      const who = typeof playerShortName === 'function' ? playerShortName(l.name) : l.name;
      token.title = '🔗 צמד עם ' + who + ' · ' + chemWhy(l) + ' · +' + chemFmt(chemBonusOf(l.tier));
    } else if (token.title && token.title.indexOf('🔗') === 0) {
      token.title = '';
    }
    // the bonus, written where the rating is
    const badge = token.querySelector('.slot-ovr');
    if (badge) {
      const old = badge.querySelector('.slot-chem-plus');
      if (old) old.remove();
      const bonus = chemBonusAt(idx);
      if (bonus > 0) {
        const plus = document.createElement('span');
        plus.className = 'slot-chem-plus';
        plus.textContent = '+' + (Math.round(bonus * 10) / 10);
        badge.appendChild(plus);
      }
    }
  });
}

// What the links are actually worth to the squad's rating — the number on
// screen, not the sum of the individual bonuses (which is four times larger and
// means nothing to anybody).
function chemTeamDelta() {
  if (typeof teamOVR !== 'function') return 0;
  const withChem = teamOVR();
  _chemOff = true;
  const without = teamOVR();
  _chemOff = false;
  return withChem - without;
}

// "🔗 2 צמדים בהרכב · 86 → 88" — the line under the pitch.
function chemSummaryHTML(picks) {
  const list = chemLinkList(picks);
  if (!list.length) return '';
  const delta = chemTeamDelta();
  const names = list.slice(0, 3).map(function (l) {
    const p = (picks || state.picks);
    const a = typeof playerShortName === 'function' ? playerShortName(p[l.a].player.name) : p[l.a].player.name;
    const b = typeof playerShortName === 'function' ? playerShortName(p[l.b].player.name) : p[l.b].player.name;
    return a + ' + ' + b + ' (+' + chemFmt(chemBonusOf(l.tier)) + ')';
  }).join(' · ');
  const more = list.length > 3 ? ' ועוד ' + (list.length - 3) : '';
  const blind = (typeof state !== 'undefined') && state.showRatings === false;
  const rating = (delta > 0 && !blind)
    // dir="ltr" or the bidi algorithm lays the two numbers out right-to-left and
    // the arrow ends up pointing at the OLD rating — "87 → 88" reads as 88 → 87.
    ? ' · דירוג הקבוצה <b dir="ltr">' + (teamOVR() - delta) + ' → ' + teamOVR() + '</b>'
    : '';
  return '<div class="chem-summary">🔗 <b>' + list.length +
    (list.length === 1 ? ' צמד' : ' צמדים') + '</b> בהרכב' + rating +
    '<span class="chem-summary-names">' + names + more + '</span></div>';
}

function chemRenderSummary(elId, picks) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = chemSummaryHTML(picks);
}
