#!/usr/bin/env node
// ─── צמדים מאושרים → chemistry_duos.csv ─────────────────────────────────────
//
// אותו דפוס כמו scripts/apply_crowd_ratings.js: דאטה נוצרת מחוץ לזמן ריצה,
// והמשחק קורא קובץ סטטי. זה השער השני — הבעלים כבר אישר בדשבורד, וכאן הוא
// מחליט מתי זה באמת נכנס.
//
//   node scripts/apply_crowd_duos.js              # מראה מה ישתנה
//   node scripts/apply_crowd_duos.js --write      # כותב באמת
//   node scripts/apply_crowd_duos.js --selftest   # בודק את עצמו, בלי מסד
//
// אחרי --write צריך גם:  node scripts/build_chem_js.js
// בלי זה chemistry_duos.csv השתנה ו-js/chem-data.js לא, כלומר המשחק עוד לא
// מכיר את הצמד.
//
// דורש SUPABASE_URL ו-SUPABASE_SERVICE_KEY בסביבה (לא ל---selftest).

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const CSV  = path.join(ROOT, 'chemistry_duos.csv');
const LOG  = path.join(ROOT, 'crowd_duos_log.csv');

// אותו נרמול כמו crowdKey ב-js/crowd.js ו-norm ב-scripts/build_chem_js.js.
// שלושתם חייבים להסכים: המפתח שההצעה תויקה תחתיו הוא המפתח שהקובץ הזה מחפש.
const norm = s => String(s ?? '')
  .replace(/[‎‏‪-‮⁦-⁩]/g, '')
  .replace(/[׳’`´']/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

// זהה ל-tierOf ב-scripts/build_chemistry.js:109 ול-cdTierOf ב-js/crowd-admin.js.
// שלושה עותקים של אותו כלל זה אחד יותר מדי, אבל הם בשלוש סביבות ריצה שונות
// ואין ביניהן ייבוא. אם הכלל זז — לזוז בשלושתם.
function tierOf(seasons, titles) {
  if (seasons >= 7 || (seasons >= 4 && titles >= 2)) return 3;
  if (seasons >= 4 || (seasons >= 3 && titles >= 1)) return 2;
  return 1;
}

function loadData() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') +
                  ';this.SQUADS=SQUADS;this.TEAMS=TEAMS;', ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'league_tables.js'), 'utf8') +
                  ';this.LEAGUE_TABLES=LEAGUE_TABLES;', ctx);
  return ctx;
}

// כל השחקן-עונות של כל שם, לפי מפתח מנורמל.
function buildIndex(SQUADS) {
  const m = new Map();
  SQUADS.forEach(sq => sq.players.forEach(p => {
    const k = norm(p.name);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push({ id: sq.id, teamId: sq.teamId, season: sq.season,
                    pos: p.position, ovr: p.ovr, peak: p.peak_ovr || p.ovr,
                    raw: p.name });
  }));
  return m;
}

// עונות משותפות ואליפויות משותפות. צמד נספר פעם אחת לעונה גם אם שיחקו יחד
// בשני מועדונים — שני אנשים שהיו יחד בשתי קבוצות יש להם יותר היסטוריה, לא
// פחות, וזו בדיוק ההחלטה ש-build_chemistry.js כבר קיבל.
function together(idx, LEAGUE_TABLES, ka, kb) {
  const a = idx.get(ka) || [], b = idx.get(kb) || [];
  const bIds = new Set(b.map(x => x.id));
  const seasons = new Set(), clubs = new Set();
  let titles = 0;
  a.forEach(x => {
    if (!bIds.has(x.id)) return;
    seasons.add(x.season);
    clubs.add(x.teamId);
    const t = LEAGUE_TABLES[x.season];
    if (t && t[0] && t[0].teamId === x.teamId) titles++;
  });
  return { seasons: [...seasons].sort(), titles, clubs: [...clubs] };
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function readCsv() {
  const raw = fs.readFileSync(CSV, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(',');
  // מפתחות הצמדים שכבר בקובץ, בלי קשר ל-keep: שורה שנדחתה ידנית לא חוזרת
  // דרך הדלת האחורית של הצעת קהל.
  const have = new Set();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = lines[i].split(',');
    const a = norm(c[1]), b = norm(c[4]);
    if (a && b) have.add(a < b ? a + '|' + b : b + '|' + a);
  }
  return { raw, header, have };
}

/* ── הכרעה על צמד אחד ──────────────────────────────────────────────────────
   מחזיר שורת CSV מוכנה, או סיבת סירוב. הסירובים הם החלק החשוב:
   - שני אלה מעולם לא היו באותו סגל → זה לא צמד, ולא משנה כמה אנשים אמרו.
   - השם עמום (יושב בשני סגלים באותה עונה עם דירוג רחוק) → ייתכן שאלה שני
     אנשים שונים, ואי אפשר לדעת על מי הצביעו. אותה סיבה בדיוק שבגללה
     apply_crowd_ratings מסרב.
   - כבר בקובץ → אין מה לעשות. */
function decide(idx, LEAGUE_TABLES, TEAMS, have, pairKey) {
  /* מפתח שמתחיל ב-"-" הוא הצעה **להוריד** צמד קיים. "-" אינו תו חוקי בשם
     מנורמל, אז מפתח רגיל לא יכול להיראות ככה בטעות.
     הורדה לא מוסיפה שורה — היא הופכת keep ל-n בשורה שכבר בקובץ. הצמד נשאר
     עם ההיסטוריה שלו ו-build_chem_js.js פשוט לא יכניס אותו ל-chem-data.js;
     מחיקת השורה הייתה מוחקת גם את הראיות וגם את הדרך לחזור. */
  const isDrop = pairKey.charAt(0) === '-';
  const bare = isDrop ? pairKey.slice(1) : pairKey;

  const parts = bare.split('|');
  if (parts.length !== 2) return { ok: false, reason: 'bad_key' };
  const [ka, kb] = parts;

  if (isDrop) {
    if (!have.has(bare)) return { ok: false, reason: 'not_in_file' };
    return { ok: true, drop: true, bare };
  }

  if (have.has(bare)) return { ok: false, reason: 'already' };
  if (!idx.has(ka) || !idx.has(kb)) return { ok: false, reason: 'not_found' };

  for (const k of [ka, kb]) {
    const bySeason = new Map();
    idx.get(k).forEach(r => {
      if (!bySeason.has(r.season)) bySeason.set(r.season, []);
      bySeason.get(r.season).push(r.ovr);
    });
    for (const [, ovrs] of bySeason) {
      if (ovrs.length > 1 && Math.max(...ovrs) - Math.min(...ovrs) >= 10) {
        return { ok: false, reason: 'ambiguous', who: k };
      }
    }
  }

  const t = together(idx, LEAGUE_TABLES, ka, kb);
  if (!t.seasons.length) return { ok: false, reason: 'never_together' };

  const ra = idx.get(ka), rb = idx.get(kb);
  const peakA = Math.max(...ra.map(r => r.peak));
  const peakB = Math.max(...rb.map(r => r.peak));
  const tier = tierOf(t.seasons.length, t.titles);

  return {
    ok: true, tier,
    row: [
      'y',
      ra[0].raw, peakA, ra[0].pos,
      rb[0].raw, peakB, rb[0].pos,
      'CROWD',
      t.seasons.length, t.titles, tier, '+' + tier,
      t.clubs.map(id => (TEAMS[id] ? TEAMS[id].name : id)).join(' '),
      t.seasons.join(' '),
      'הצעת קהל',
    ],
  };
}

async function pending(URL, KEY) {
  const r = await fetch(
    `${URL}/rest/v1/duo_approvals?applied_at=is.null&select=pair_key,votes`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`REST ${r.status}`);
  return r.json();
}

async function markApplied(URL, KEY, keys) {
  const list = keys.map(k => `"${k.replace(/"/g, '""')}"`).join(',');
  const r = await fetch(`${URL}/rest/v1/duo_approvals?pair_key=in.(${encodeURIComponent(list)})`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`,
               'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ applied_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`PATCH ${r.status}`);
}

/* ── בדיקה עצמית ───────────────────────────────────────────────────────────
   רצה אופליין ולא נוגעת ב-chemistry_duos.csv: כל ההכרעות הן פונקציות טהורות
   מעל הדאטה האמיתית, אז אפשר לבדוק אותן בלי לכתוב כלום. */
function selftest() {
  const { SQUADS, TEAMS, LEAGUE_TABLES } = loadData();
  const idx = buildIndex(SQUADS);
  const { have } = readCsv();
  let failed = 0;
  const is = (actual, expected, what) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}` +
      (ok ? '' : `\n      got ${JSON.stringify(actual)}\n      want ${JSON.stringify(expected)}`));
  };
  const key = (a, b) => (norm(a) < norm(b) ? norm(a) + '|' + norm(b) : norm(b) + '|' + norm(a));

  is(tierOf(7, 0), 3, 'שבע עונות = דרגה 3');
  is(tierOf(4, 2), 3, 'ארבע עונות ושתי אליפויות = דרגה 3');
  is(tierOf(4, 0), 2, 'ארבע עונות בלי אליפות = דרגה 2');
  is(tierOf(3, 1), 2, 'שלוש עונות ואליפות = דרגה 2');
  is(tierOf(2, 0), 1, 'פחות מזה = דרגה 1');

  // צמד שכבר בקובץ
  const known = key('אלון חרזי', "ניר דוידוביץ'");
  is(decide(idx, LEAGUE_TABLES, TEAMS, have, known).reason, 'already',
     'צמד שכבר בקובץ נדחה');

  // שם עמום — יוסי אבוקסיס 1999/00 הוא 91 בבית"ר ו-68 בבני יהודה, כלומר
  // כמעט בוודאות שני אנשים שונים. השותף נבחר במכוון כמי שעוד לא בקובץ:
  // בדיקת "כבר בקובץ" רצה לפני בדיקת העמימות, אז צמד ששלח שם היה מדווח
  // already ולא בודק כלום.
  const amb = key('יוסי אבוקסיס', 'ויקטור פאצ\'ו');
  is(have.has(amb), false, 'הצמד לבדיקת העמימות באמת לא בקובץ');
  is(decide(idx, LEAGUE_TABLES, TEAMS, have, amb).reason, 'ambiguous',
     'שם עמום נדחה ולא נחתך לאחד משני האנשים');

  // שם שלא קיים
  is(decide(idx, LEAGUE_TABLES, TEAMS, have, key('שם בדוי לגמרי', 'אלון מזרחי')).reason,
     'not_found', 'שם שלא בדאטה נדחה');

  // מפתח פגום
  is(decide(idx, LEAGUE_TABLES, TEAMS, have, 'בלי מפריד').reason, 'bad_key',
     'מפתח בלי מפריד נדחה');

  // הקובץ לא זז
  const before = fs.readFileSync(CSV, 'utf8');
  decide(idx, LEAGUE_TABLES, TEAMS, have, known);
  is(fs.readFileSync(CSV, 'utf8') === before, true, 'chemistry_duos.csv לא נגע');


  // ── הצעה להוריד צמד ──────────────────────────────────────────────────────
  // מפתח עם "-" בהתחלה. "-" אינו תו חוקי בשם מנורמל, אז אין התנגשות אפשרית
  // עם הצעה רגילה — וזו בדיוק הבדיקה: ששני הסוגים לא מתבלבלים.
  const knownDrop = '-' + known;
  const dd = decide(idx, LEAGUE_TABLES, TEAMS, have, knownDrop);
  is(dd.ok, true, 'הצעה להוריד צמד שקיים בקובץ מתקבלת');
  is(dd.drop, true, 'והיא מסומנת כהורדה ולא כהוספה');
  is(dd.bare, known, 'והמפתח שנשלח להורדה הוא בלי הקידומת');

  // צמד שלא בקובץ — אין מה להוריד
  const ghost = '-' + key('אלון מזרחי', 'עבאס סואן');
  is(decide(idx, LEAGUE_TABLES, TEAMS, have, ghost).reason, 'not_in_file',
     'הצעה להוריד צמד שלא בקובץ נדחית');

  // והכיוון ההפוך: אותו מפתח בלי "-" הוא הצעה להוסיף, ומתנהג אחרת לגמרי
  is(decide(idx, LEAGUE_TABLES, TEAMS, have, known).reason, 'already',
     'אותו מפתח בלי הקידומת נקרא כהוספה ונדחה כי הוא כבר בקובץ');

  console.log(failed ? '\nנפלו ' + failed : '\nהכל עבר');
  process.exit(failed ? 1 : 0);
}

/* ── ראשי ─────────────────────────────────────────────────────────────────── */
async function main() {
  const WRITE = process.argv.includes('--write');
  const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!URL || !KEY) {
    console.error('חסר SUPABASE_URL או SUPABASE_SERVICE_KEY');
    console.error('(לבדיקת מנוע ההכרעה בלי מסד: node scripts/apply_crowd_duos.js --selftest)');
    process.exit(1);
  }

  const rows = await pending(URL, KEY);
  if (!rows.length) { console.log('אין אישורים ממתינים.'); return; }

  const { SQUADS, TEAMS, LEAGUE_TABLES } = loadData();
  const idx = buildIndex(SQUADS);
  const { raw, header, have } = readCsv();

  const done = [], skipped = [], drops = [];
  const lines = [];
  for (const r of rows) {
    const d = decide(idx, LEAGUE_TABLES, TEAMS, have, r.pair_key);
    if (!d.ok) { skipped.push({ ...r, ...d }); continue; }
    if (d.drop) { drops.push({ ...r, bare: d.bare }); have.delete(d.bare); continue; }
    if (d.row.length !== header.length) {
      skipped.push({ ...r, reason: 'bad_shape' });
      continue;
    }
    lines.push(d.row.map(csvCell).join(','));
    have.add(r.pair_key);          // שני אישורים לאותו צמד באותה הרצה
    done.push({ ...r, tier: d.tier });
  }

  const why = {
    already: 'כבר בקובץ', not_found: 'שם לא נמצא בדאטה',
    not_in_file: 'הצמד הזה כבר לא בקובץ',
    never_together: 'מעולם לא היו באותו סגל', bad_key: 'מפתח פגום',
    bad_shape: 'מספר עמודות לא תואם', ambiguous: 'שם עמום — ייתכן שני אנשים',
  };
  console.log(`יתווספו ${done.length} · יורדו ${drops.length} · דולגו ${skipped.length}`);
  done.forEach(d => console.log(`  + ${d.pair_key}  דרגה ${d.tier}  (${d.votes} הציעו)`));
  drops.forEach(d => console.log(`  − ${d.bare}  (${d.votes} אמרו שזה לא צמד)`));
  skipped.forEach(s => console.log(`  ⚠ ${s.pair_key} — ${why[s.reason] || s.reason}`));

  if (!WRITE) { console.log('\nיבש. להרצה אמיתית: --write'); return; }
  if (!done.length && !drops.length) return;

  // ההורדות קודם: הן עורכות שורות שכבר בקובץ, וההוספות נכתבות בסופו.
  if (drops.length) {
    const dropSet = new Set(drops.map(d => d.bare));
    const cur = fs.readFileSync(CSV, 'utf8');
    const out = cur.split(/\r?\n/).map((ln, k) => {
      if (k === 0 || !ln.trim()) return ln;
      const c = ln.split(',');
      const a = norm(c[1]), b = norm(c[4]);
      const key = a < b ? a + '|' + b : b + '|' + a;
      if (!dropSet.has(key)) return ln;
      c[0] = 'n';                      // keep → n. השורה נשארת, הצמד יוצא.
      return c.join(',');
    });
    fs.writeFileSync(CSV, out.join('\n'));
  }

  if (lines.length) {
    const cur2 = fs.readFileSync(CSV, 'utf8');
    fs.appendFileSync(CSV, (cur2.endsWith('\n') ? '' : '\n') + lines.join('\n') + '\n');
  }
  const head = fs.existsSync(LOG) ? '' : 'when,pair,tier,votes\n';
  fs.appendFileSync(LOG, head + done.map(d =>
    `${new Date().toISOString()},"${d.pair_key}",${d.tier},${d.votes}`).join('\n') + '\n');
  await markApplied(URL, KEY, [...done, ...drops].map(d => d.pair_key));
  console.log(`\nנכתב ל-${CSV}.\nעכשיו: node scripts/build_chem_js.js`);
}

if (process.argv.includes('--selftest')) selftest();
else if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { norm, tierOf, together, buildIndex, decide, readCsv };
