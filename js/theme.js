// ─── Theme: dark/light mode + optional team accent colour ──────────────────────
// Two independent choices, both saved in localStorage:
//   mode: 'dark' (default) | 'light'
//   team: null (default gold accent) | teamId → the club's primary colour
// "Accent only": the team colour recolours buttons/highlights/borders/links;
// the background stays the mode's bg so it's always readable. The accent is
// nudged lighter (dark mode) or darker (light mode) so even bright team colours
// (Maccabi TA yellow) stay legible as text and give readable buttons.

const THEME_KEY = '36-0-theme';

function themeState() {
  try { return { mode: 'dark', team: null, ...JSON.parse(localStorage.getItem(THEME_KEY) || '{}') }; }
  catch (e) { return { mode: 'dark', team: null }; }
}
function themeSave(s) { try { localStorage.setItem(THEME_KEY, JSON.stringify(s)); } catch (e) {} }

// ── colour helpers ──
function thHexToRgb(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];   // #fff → #ffffff
  if (h.length < 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function thRgbToHex(r, g, b) {
  const c = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function thLum(hex) {
  const c = thHexToRgb(hex); if (!c) return 0.5;
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}
// mix a colour toward white (amt>0) or black (amt<0), amt 0..1
function thMix(hex, amt) {
  const c = thHexToRgb(hex); if (!c) return hex;
  const t = amt >= 0 ? 255 : 0, a = Math.abs(amt);
  return thRgbToHex(c.r + (t - c.r) * a, c.g + (t - c.g) * a, c.b + (t - c.b) * a);
}
// readable ink to put ON an accent fill (same rule as textColorFor)
function thInk(hex) { return thLum(hex) > 0.59 ? '#111' : '#fff'; }

// How much hue a colour carries, 0..255. Black, white and greys score 0.
function thChroma(hex) {
  const c = thHexToRgb(hex); if (!c) return 0;
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
}
// WCAG contrast ratio (1..21), so an ink choice can be checked rather than assumed.
function thRelLum(hex) {
  const c = thHexToRgb(hex); if (!c) return 0;
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function thContrast(a, b) {
  const l1 = thRelLum(a), l2 = thRelLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Nudge the team colour so it contrasts with the current mode's background.
function thAccentFor(hex, mode) {
  const L = thLum(hex);
  if (mode === 'light') {
    // needs to be dark enough to read as text on a light bg
    if (L > 0.62) return thMix(hex, -(L - 0.42));      // darken bright colours
    return hex;
  }
  // dark mode: needs to be bright enough on a dark bg
  if (L < 0.32) return thMix(hex, (0.5 - L));          // lighten very dark colours
  return hex;
}

// Which of the club's colours carries the accent in this mode, and what ink goes
// on top of it? Returns { accent, ink }.
//
// thAccentFor() lightens/darkens the colour so it stays legible against the
// background. For a hued colour that's harmless — a lightened Maccabi Haifa green
// still reads as green, a lightened Hapoel red still reads as red. But a
// black/white/grey primary has no hue to preserve, so the same nudge yields
// featureless grey and the club is gone: Beitar's #1A1A1A came out #757575.
// Those clubs are named by their OTHER colour (Beitar are yellow-and-black), so:
//   • nudge would wreck the primary (dark mode) → use the hued secondary as the fill.
//   • primary survives as-is (black on a light bg) → keep it, but write the club's
//     colour on it instead of plain white, i.e. black-and-gold.
function thTeamAccent(team, mode) {
  const p = team.primaryColor, s = team.secondaryColor;
  const nudged = thAccentFor(p, mode);
  const flat = thChroma(p) < 20;               // black/white/grey — no hue to keep
  const hued = s && thChroma(s) >= 20;
  if (!flat || !hued) return { accent: nudged, ink: thInk(nudged) };

  if (nudged.toLowerCase() !== String(p).toLowerCase()) {
    const a = thAccentFor(s, mode);
    return { accent: a, ink: thInk(a) };
  }
  return { accent: nudged, ink: thContrast(nudged, s) >= 4.5 ? s : thInk(nudged) };
}

function applyTheme() {
  const s = themeState();
  const root = document.documentElement;
  root.setAttribute('data-theme', s.mode === 'light' ? 'light' : 'dark');

  // team accent (or clear back to the CSS default gold)
  const team = s.team && typeof TEAMS !== 'undefined' ? TEAMS[s.team] : null;
  if (team && team.primaryColor) {
    const { accent, ink } = thTeamAccent(team, s.mode);
    const accent2 = thMix(accent, s.mode === 'light' ? -0.18 : -0.22);   // gradient depth
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent2', accent2);
    root.style.setProperty('--accent-ink', ink);
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent2');
    root.style.setProperty('--accent-ink', '#111');   // default gold → dark ink
  }

  // keep the mobile browser chrome colour in sync with the bg
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || '#0d1117';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', bg);
}

function setThemeMode(mode) { const s = themeState(); s.mode = mode; themeSave(s); applyTheme(); }
function setThemeTeam(teamId) { const s = themeState(); s.team = teamId || null; themeSave(s); applyTheme(); }

// apply as early as possible to avoid a flash of the wrong theme
applyTheme();

// ── the ⚙️ settings popover in the nav ──
function buildThemePanel() {
  const btn = document.getElementById('nav-theme');
  const panel = document.getElementById('theme-panel');
  if (!btn || !panel) return;

  const teamOptions = (typeof TEAMS !== 'undefined')
    ? Object.entries(TEAMS).sort((a, b) => a[1].name.localeCompare(b[1].name, 'he'))
    : [];
  const s = themeState();

  panel.innerHTML = `
    <div class="tp-row">
      <span class="tp-label">מצב תצוגה</span>
      <div class="tp-seg" id="tp-mode">
        <button data-mode="dark">🌙 כהה</button>
        <button data-mode="light">☀️ בהיר</button>
      </div>
    </div>
    <div class="tp-row">
      <span class="tp-label">צבע הקבוצה</span>
      <select class="tp-select" id="tp-team">
        <option value="">ברירת מחדל (זהב)</option>
        ${teamOptions.map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('')}
      </select>
    </div>
    <div class="tp-swatch" id="tp-swatch"></div>`;

  const syncUI = () => {
    const st = themeState();
    panel.querySelectorAll('#tp-mode button').forEach(b =>
      b.classList.toggle('on', b.dataset.mode === (st.mode || 'dark')));
    const sel = panel.querySelector('#tp-team');
    if (sel) sel.value = st.team || '';
    const sw = panel.querySelector('#tp-swatch');
    if (sw) {
      const css = getComputedStyle(document.documentElement);
      const accent = css.getPropertyValue('--accent').trim() || '#FFD700';
      sw.style.background = accent;
      sw.textContent = st.team && TEAMS[st.team] ? TEAMS[st.team].name : 'זהב';
      // read the ink applyTheme() decided, so the swatch shows the real pairing
      // (Beitar in light mode is black-on-gold ink, not the plain thInk() guess)
      sw.style.color = css.getPropertyValue('--accent-ink').trim() || thInk(accent);
    }
  };

  panel.querySelectorAll('#tp-mode button').forEach(b =>
    b.onclick = () => { setThemeMode(b.dataset.mode); syncUI(); });
  panel.querySelector('#tp-team').onchange = e => { setThemeTeam(e.target.value); syncUI(); };

  const toggle = (show) => {
    panel.style.display = (show ?? panel.style.display === 'none') ? 'block' : 'none';
    if (panel.style.display === 'block') syncUI();
  };
  btn.onclick = e => { e.stopPropagation(); toggle(); };
  document.addEventListener('click', e => {
    if (panel.style.display === 'block' && !panel.contains(e.target) && e.target !== btn) toggle(false);
  });
  syncUI();
}

document.addEventListener('DOMContentLoaded', () => { applyTheme(); buildThemePanel(); });
