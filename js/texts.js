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
