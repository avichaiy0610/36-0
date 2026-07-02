// Applies UI text overrides from the site_texts table (managed via admin.html).
// Fails silently — if the table is missing or the network is down, the site
// simply shows its built-in texts.
async function applySiteTexts() {
  try {
    const { data, error } = await _supabase.from('site_texts').select('selector, value');
    if (error || !data) return;
    data.forEach(row => {
      try {
        document.querySelectorAll(row.selector).forEach(el => { el.textContent = row.value; });
      } catch (e) { /* bad selector — skip */ }
    });
  } catch (e) { /* offline / table missing */ }
}

document.addEventListener('DOMContentLoaded', applySiteTexts);
