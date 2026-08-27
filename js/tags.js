// ─── Tags: what a player actually did ─────────────────────────────────────────
//
// A rating says how good a man was. A tag says what he DID — finished a season
// as the league's top scorer, was voted Footballer of the Season, kept the
// tightest defence in the country. Every one of them comes from the real tables
// (js/tag-data.js), and none of them is an opinion or a coronation.
//
// What they change is deliberately narrow: WHO scores, not WHETHER you win.
// The season's result is decided by the line ratings before a single goal is
// handed out, so a striker's tags only tilt the share of his team's goals that
// end up next to his name. That makes the results screen tell a story and the
// golden-boot achievement reachable, at zero risk to the balance of the game.
//
// And a tag only fires where it makes sense: a top scorer played out of position
// at centre-back is just a centre-back.

// No position gate. A man who finished a season as the league's top scorer did
// it, and he keeps it wherever he lines up — a centre-back with a golden boot is
// a strange and wonderful thing, not a clerical error to be corrected away. What
// stops a defender from outscoring a striker is GOAL_W, the positional weight
// that was already doing that job; the gate on top of it only served to delete
// real careers from the card.
// The numbers are small on purpose. At +50% a golden boot did not tilt a season,
// it decided one — a squad of them scored at will. A tag should colour the story
// of a year, not win it, so the ceilings are 8% for the two crowns and 5% for
// the double-digit seasons.
// A tag is a tag. Winning it four times is a bigger story and the card says so,
// but it is not four times the effect — the number below is what it is worth,
// once, however many times he earned it. That keeps a fifteen-year career from
// compounding into a different game, and it is why none of these need a ceiling.
const TAG_DEFS = {
  golden_boot:   { icon: '👑', name: 'מלך שערים',       goal: 0.08 },
  ten_goals:     { icon: '⚽', name: 'מבקיע דו ספרתי',   goal: 0.05 },
  playmaker:     { icon: '🎯', name: 'מלך בישולים',     assist: 0.08 },
  ten_assists:   { icon: '🅰️', name: 'מבשל דו ספרתי',    assist: 0.05 },
  // A back four can hold three or four of these men at once, which is why a
  // defender's is small. There is only ever one keeper, so his is worth more.
  wall:          { icon: '🧱', name: 'הגנה איתנה', clean: 0.007 },
  gk_wall:       { icon: '🧤', name: 'שער נעול',   clean: 0.02 },
  poty:          { icon: '🏅', name: 'כדורגלן העונה' },
  // This one does not touch the player at all — it nudges the SIDE. A dressing
  // room of men who have won before finishes a little higher, which is the only
  // honest way to model it: a title is a threshold, not a slope. Measured, one
  // rating point is worth nothing to a mid-table squad, twenty-four percentage
  // points to one sitting exactly on the cusp, and nothing again to a squad that
  // already wins every year — so no fixed "+x% to win the league" could ever be
  // true. What the tag gives is a small, honest push; where a season is close it
  // decides some of them, and where it is not it changes nothing.
  serial_winner: { icon: '🏆', name: 'זוכה אליפויות', team: true },
  one_club:      { icon: '❤️', name: 'נאמן למועדון' },
  ironman:       { icon: '🗿', name: 'ותיק הליגה' },
  three_decades: { icon: '🕰', name: 'שלושה עשורים' },
  nomad:         { icon: '🎒', name: 'נדד בליגה' },
  prime90:       { icon: '🌟', name: 'דירוג 90+' },
};


function tagNorm(s) {
  return String(s ?? '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[׳’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// [{ key, icon, name, count, evidence, def }] — everything the player earned
function tagsOf(name) {
  if (typeof TAG_DATA === 'undefined') return [];
  const rows = TAG_DATA[tagNorm(name)];
  if (!rows) return [];
  return rows
    .map(([key, count, evidence]) => {
      const def = TAG_DEFS[key];
      return def ? { key, count, evidence, def, icon: def.icon, name: def.name } : null;
    })
    .filter(Boolean)
    .sort((a, b) => TAG_ORDER.indexOf(a.key) - TAG_ORDER.indexOf(b.key));
}

// the order they read best in: what he won, then what he did, then how long
const TAG_ORDER = ['poty', 'golden_boot', 'playmaker', 'ten_goals', 'ten_assists',
                   'gk_wall', 'wall', 'serial_winner', 'one_club', 'ironman',
                   'three_decades', 'nomad', 'prime90'];

// Does this tag change anything at all? Position no longer enters into it, so
// this is simply "does it carry an effect" — the honours and the long-service
// badges are story, the four that move goals and assists are not.
function tagFires(tag) {
  return !!(tag.def.goal || tag.def.assist || tag.def.clean || tag.def.team);
}

/* ── what they change ─────────────────────────────────────────────────────── */
// A multiplier on this player's share of the team's goals / assists. 1 = nothing.
// Two tags that describe the same season from two angles — a golden boot always
// scored ten as well — should not both be paid in full. The strongest counts
// whole and every one after it counts half, which brings a top scorer who also
// had double-digit years from 13.4% down to 10.5%.
function tagStack(values) {
  if (!values.length) return 1;
  const v = values.slice().sort((a, b) => b - a);
  return 1 + v[0] + v.slice(1).reduce((s, x) => s + x / 2, 0);
}

function tagGoalMult(name, slotPos) {
  return tagStack(tagsOf(name).filter(t => t.def.goal).map(t => t.def.goal));
}
// A defender's side of the same idea: how much likelier this man's team is to
// concede nothing. It multiplies the chance of a nil, not the defensive rating —
// see simDrawGoals for why those are different promises.
function tagCleanMult(name) {
  return tagStack(tagsOf(name).filter(t => t.def.clean).map(t => t.def.clean));
}

function tagAssistMult(name, slotPos) {
  return tagStack(tagsOf(name).filter(t => t.def.assist).map(t => t.def.assist));
}

/* ── how they read ────────────────────────────────────────────────────────── */
// The short strip for a player card: icons, with the strongest first.
//
// `liveOnly` keeps just the ones that would actually do something where he is
// standing. The draft list uses it: a fifteen-season winner carries seven or
// eight badges, and a row of trophies that change nothing drowns the two icons
// that do. The full set still belongs on his card and on the results screen.
function tagStripHTML(name, slotPos, max, liveOnly) {
  let list = tagsOf(name);
  if (liveOnly) list = list.filter(t => slotPos != null && tagFires(t, slotPos));
  if (!list.length) return '';
  const shown = list.slice(0, max || 4);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<span class="tag-strip">${shown.map(t => {
    const live = slotPos != null && tagFires(t, slotPos);
    const times = t.count > 1 && t.key !== 'prime90' ? `<span class="tag-x">×${t.count}</span>` : '';
    return `<span class="tag-chip${live ? ' tag-live' : ''}" title="${esc(t.name)}${t.count > 1 ? ' ×' + t.count : ''}${t.evidence ? ' — ' + esc(t.evidence) : ''}">${t.icon}${times}</span>`;
  }).join('')}</span>`;
}

// The full line, for the results screen: icon + name + evidence.
function tagListHTML(name) {
  const list = tagsOf(name);
  if (!list.length) return '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return list.map(t =>
    `<span class="tag-full" title="${esc(t.evidence)}">${t.icon} ${esc(t.name)}${t.count > 1 && t.key !== 'prime90' ? ' ×' + t.count : ''}</span>`
  ).join('');
}
