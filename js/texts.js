// Applies UI text overrides from the site_texts table (managed via admin.html).
// Rows with a CSS selector replace element text (line breaks respected);
// rows with selector 'virtual' are looked up by code via siteText(key)
// (tier names, difficulty labels and other dynamic strings).
// Fails silently — if the table is missing or the network is down, the site
// simply shows its built-in texts.
const SITE_TEXTS = {};

function siteText(key, fallback) {
  return SITE_TEXTS[key] ?? fallback;
}

async function applySiteTexts() {
  try {
    const { data, error } = await _supabase.from('site_texts').select('key, selector, value');
    if (error || !data) return;
    data.forEach(row => {
      SITE_TEXTS[row.key] = row.value;
      if (!row.selector || row.selector === 'virtual') return;
      try {
        // innerText (not textContent) so line breaks typed in the admin panel
        // become real line breaks on the page
        document.querySelectorAll(row.selector).forEach(el => { el.innerText = row.value; });
      } catch (e) { /* bad selector — skip */ }
    });
  } catch (e) { /* offline / table missing */ }
}

document.addEventListener('DOMContentLoaded', applySiteTexts);

/* ── what the player's own side is called ─────────────────────────────────────
   In a plain draft it is "הקבוצה שלי" in the league table and "ההרכב שלי" in
   the cup and in Europe, and every screen used to write that out itself. A
   career gives the club a name the player TYPED, and because nothing outside
   career.js ever asked for it, ten seasons of a dynasty were still labelled
   "הקבוצה שלי" in the season table, on the cup bracket and in Europe. The name
   existed; it just had no way of reaching the screens that needed it.

   Each caller passes its own wording, so the two defaults stay different where
   they always were, and this decides only whether a career name replaces one.

   Gated on state.career and NOT on crHasRun(): a saved career sits in
   localStorage while you play a duel, a daily challenge or a mini-game, and
   none of those are your club. Every one of them nulls state.career explicitly,
   so the gate is exactly "am I playing a career season right now".

   The returned career name is HTML-escaped, because it is 24 characters the
   player typed and every caller interpolates it into a template literal —
   career.js has always run it through crEsc for the same reason. The fallback
   is handed back untouched: it is either a literal in the source or a string an
   admin set, and escaping it here would mangle a deliberate entity.

   A global club (js/club.js) is consulted SECOND, after the career. A dynasty is
   a club the player committed to for ten seasons and named at the start; letting
   a later global identity override it would rename a run halfway through. So the
   order is career → club → the caller's own wording, and a player who never made
   a club still reads exactly what he always did. */
function myTeamName(fallback) {
  try {
    if (typeof state !== 'undefined' && state && state.career && typeof crRun === 'function') {
      const name = String(crRun().clubName || '').trim();
      if (name) return (typeof crEsc === 'function') ? crEsc(name) : name;
    }
  } catch (e) { /* career module absent or storage unreadable — use the fallback */ }
  try {
    if (typeof clubNameRaw === 'function') {
      const name = clubNameRaw();
      if (name) return (typeof clEsc === 'function') ? clEsc(name) : name;
    }
  } catch (e) { /* club module absent or storage unreadable — use the fallback */ }
  return fallback;
}
