#!/usr/bin/env node
// ─── דירוגי קהל מאושרים → js/data.js ────────────────────────────────────────
//
// אותו דפוס שבו כימיה, תגיות ותכונות כבר נשלחות: דאטה נוצרת מחוץ לזמן ריצה.
// הסימולציה נשארת דטרמיניסטית ואופליין, ואין מצב שכשל רשת מזיז איזון או לוחות.
//
// זה הקובץ היחיד בפיצ'ר הזה שמשנה את מה שהמשחק משחק בו. כל השאר הוא תיבת
// הצעות. לכן הוא שמרן עד כדי טרחנות: מסרב יותר משהוא כותב.
//
//   node scripts/apply_crowd_ratings.js            # מראה מה ישתנה, לא נוגע בקובץ
//   node scripts/apply_crowd_ratings.js --write    # כותב באמת
//   node scripts/apply_crowd_ratings.js --selftest # בודק את מנוע העריכה, בלי מסד
//
// דגלים נוספים:
//   --fix-all-peaks   מתקן peak_ovr גם לשחקנים שלא נגענו בהם (ראה למטה)
//
// דורש SUPABASE_URL ו-SUPABASE_SERVICE_KEY בסביבה — פרט ל---selftest, שרץ
// מנותק לגמרי.

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const vm   = require('vm');

const ARGV      = process.argv.slice(2);
const WRITE     = ARGV.includes('--write');
const SELFTEST  = ARGV.includes('--selftest');
const ALL_PEAKS = ARGV.includes('--fix-all-peaks');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'js', 'data.js');
const LOG  = path.join(ROOT, 'crowd_ratings_log.csv');

// אותו נרמול כמו crowdKey ב-js/crowd.js ו-pcNorm ב-js/player-card.js.
// שלושתם חייבים להסכים; אחרת ההצלבה מפספסת בדיוק את השמות עם גרש — ויש כאן
// מאות כאלה. אימות ההסכמה הזו רץ ב---selftest מול הקובץ האמיתי.
function norm(s) {
  return String(s ?? '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[׳’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// עונה מגיעה מהמסד ונכנסת לתוך RegExp. '1999/00' תמים, אבל ערך שנשתל בטבלה
// לא חייב להיות.
function reEsc(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

// ── קריאת המסד ──────────────────────────────────────────────────────────────

async function pending(URL, KEY) {
  const r = await fetch(
    `${URL}/rest/v1/rating_approvals?applied_at=is.null&select=id,player_key,season,old_ovr,new_ovr,votes`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`REST ${r.status}`);
  return r.json();
}

async function markApplied(URL, KEY, ids) {
  const r = await fetch(`${URL}/rest/v1/rating_approvals?id=in.(${ids.join(',')})`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`,
               'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ applied_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`PATCH ${r.status}`);
}

// ── עריכת data.js ────────────────────────────────────────────────────────────
// עורכים טקסט ולא AST: הקובץ נכתב ביד, והכתיבה מחדש שלו דרך מפרסר הייתה
// מוחקת הערות וסדר ששווים יותר מהנוחות.

// מזהה הסגל שמעל האינדקס הזה. חיפוש לאחור אחרי "id: '" — רגיש לרישיות, ולכן
// לא נתפס על "teamId: '".
function squadIdBefore(src, at) {
  const i = src.lastIndexOf("id: '", at);
  if (i < 0) return '?';
  const q = src.indexOf("'", i + 5);
  return q < 0 ? '?' : src.slice(i + 5, q);
}

// כל גושי ה-players של עונה נתונה.
function seasonBlocks(src, season) {
  const re = new RegExp(`season:\\s*'${reEsc(season)}',\\s*\\n\\s*players:\\s*\\[`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    const end = src.indexOf('\n    ],', start);
    if (end < 0) continue;              // גוש חסום — מדלגים ולא מנחשים
    out.push({ start, end, squadId: squadIdBefore(src, m.index) });
  }
  return out;
}

// כל השורות שמתאימות לשחקן-בעונה. מחזיר היסטים מוחלטים, כדי שהעריכה תהיה
// חיתוך-והדבקה של שורה אחת ולא בנייה מחדש של הקובץ.
function findRows(src, playerKey, season) {
  const rows = [];
  for (const b of seasonBlocks(src, season)) {
    let off = b.start;
    for (const line of src.slice(b.start, b.end).split('\n')) {
      const lineStart = off;
      off += line.length + 1;
      const nm = /name:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
      if (!nm) continue;
      if (norm(nm[1].replace(/\\'/g, "'")) !== playerKey) continue;
      const ov = /\bovr:\s*(\d+)/.exec(line);   // \b מונע תפיסה של peak_ovr
      if (!ov) continue;
      rows.push({
        squadId: b.squadId,
        start: lineStart,
        end: lineStart + line.length,
        line,
        raw: nm[1],
        pos: (/position:\s*'([^']*)'/.exec(line) || [])[1] || '?',
        ovr: +ov[1],
      });
    }
  }
  return rows;
}

// שינוי מוחל רק כשנמצאה בדיוק התאמה אחת. זה לא הידוק לשם הידוק:
//
// 469 שחקן-עונה מופיעים ביותר מסגל אחד — בדרך כלל אותו אדם שעבר קבוצה באמצע
// העונה, ושני המועדונים רושמים אותו. ב-130 מהם הדירוג שונה. בחמישה הפער הוא
// 10 ומעלה, ואלה כמעט בוודאות שני אנשים שונים עם אותו שם: 'יוסי אבוקסיס'
// ב-1999/00 הוא CDM 91 בבית"ר ו-CB 68 בבני יהודה, ומה שמפריד ביניהם ב-data.js
// הוא U+200E אחד בלתי נראה — שהנרמול, בצדק, מוחק.
//
// אישור מפתחו הוא (player_key, season) בלי מועדון. לשורות האלה הסקריפט פשוט
// *לא יכול לדעת* איזו שורה לערוך. ניחוש היה דורס דירוג של אדם אמיתי בציון
// קהל של זר. לכן: מדלגים, מדווחים בקול, ומשאירים את האישור לא-מוחל.
function applyOne(src, playerKey, season, newOvr) {
  if (!Number.isInteger(newOvr) || newOvr < 40 || newOvr > 99) {
    return { ok: false, reason: 'bad_ovr', why: `דירוג לא חוקי: ${newOvr}`, src, rows: [] };
  }
  const rows = findRows(src, playerKey, season);
  if (rows.length === 0) {
    return { ok: false, reason: 'not_found', why: 'לא נמצא באף סגל בעונה הזו', src, rows };
  }
  if (rows.length > 1) {
    return {
      ok: false, reason: 'ambiguous', src, rows,
      why: `השם מופיע ב-${rows.length} סגלים באותה עונה — אין במה להכריע`,
    };
  }
  const r = rows[0];
  const fixed = r.line.replace(/\bovr:\s*\d+/, `ovr: ${newOvr}`);
  if (fixed === r.line) {
    return { ok: false, reason: 'no_change', why: `כבר ${newOvr}`, src, rows };
  }
  return {
    ok: true, reason: 'applied', rows,
    src: src.slice(0, r.start) + fixed + src.slice(r.end),
    row: r, before: r.ovr, after: newOvr,
  };
}

// שמות שכמעט בוודאות מכסים שני אנשים שונים.
//
// 373 שמות חוזרים באותה עונה ביותר מסגל אחד, וברובם המכריע זה אותו אדם שעבר
// קבוצה באמצע העונה — אזהרה על כולם היא רעש. מה שכן חשוד הוא פער דירוג גדול
// באותה עונה: 'יוסי אבוקסיס' ב-1999/00 הוא 91 ו-68. minSpread=10 מוריד את
// הרשימה לחמישה, וחמישה זה מספר שאפשר להסתכל עליו.
//
// למה זה מודפס בכלל אם applyOne ממילא מסרב: fixPeaks מחשב שיא על *כל* השורות
// של אותו שם בכל העונות. אם השם מכסה שני אנשים, השיא של האחד ידלוף לשני גם
// כשהעונה שאושרה עצמה הייתה חד-משמעית לגמרי.
function namesakeKeys(src, minSpread = 10) {
  const perSeason = new Map();
  const re = /season:\s*'([^']*)',\s*\n\s*players:\s*\[/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    const end = src.indexOf('\n    ],', start);
    if (end < 0) continue;
    for (const line of src.slice(start, end).split('\n')) {
      const nm = /name:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
      if (!nm) continue;
      const ov = /\bovr:\s*(\d+)/.exec(line);
      if (!ov) continue;
      const key = norm(nm[1].replace(/\\'/g, "'"));
      const id = m[1] + '|' + key;
      if (!perSeason.has(id)) perSeason.set(id, { key, ovrs: [] });
      perSeason.get(id).ovrs.push(+ov[1]);
    }
  }
  const out = new Set();
  for (const { key, ovrs } of perSeason.values()) {
    if (ovrs.length < 2) continue;
    if (Math.max(...ovrs) - Math.min(...ovrs) >= minSpread) out.add(key);
  }
  return out;
}

// peak_ovr חייב להיות לפחות ה-ovr הגבוה ביותר של אותו אדם. דירוג שעלה מעל
// השיא הרשום הופך את השיא לשקר, והכרטיס מציג שני מספרים סותרים.
//
// onlyKeys מצמצם את זה לשחקנים שבאמת נגענו בהם. זה לא קישוט — ראה את ההערה
// ב-main. null = כל הקובץ.
function fixPeaks(src, onlyKeys) {
  const best = new Map();
  const line = /name:\s*'((?:[^'\\]|\\.)*)'[^\n]*?\bovr:\s*(\d+)/g;
  let m;
  while ((m = line.exec(src))) {
    const k = norm(m[1].replace(/\\'/g, "'"));
    best.set(k, Math.max(best.get(k) || 0, +m[2]));
  }
  const fixes = [], outOfScope = [];
  const out = src.replace(
    /(name:\s*'((?:[^'\\]|\\.)*)'[^\n]*?\bovr:\s*\d+[^\n]*?\bpeak_ovr:\s*)(\d+)/g,
    (all, head, rawName, peak, offset) => {
      const k = norm(rawName.replace(/\\'/g, "'"));
      const want = best.get(k) || +peak;
      if (want <= +peak) return all;
      const rec = { key: k, from: +peak, to: want, squadId: squadIdBefore(src, offset) };
      if (onlyKeys && !onlyKeys.has(k)) { outOfScope.push(rec); return all; }
      fixes.push(rec);
      return head + want;
    });
  return { src: out, fixes, outOfScope };
}

// ── מה שנבדק לפני שנוגעים בדיסק ─────────────────────────────────────────────
// data.js הוא 2MB שנכתבו ביד, וכל המשחק קורא אותו. עריכת טקסט שהשתבשה תיראה
// כמו קובץ תקין עד שמישהו יפתח את המשחק. לכן לפני כל כתיבה:
//   · מספר השורות זהה
//   · מספר השורות שהשתנו בין 1 לצפוי
//   · כל שורה שהשתנתה — השתנתה *רק* במספר של ovr או peak_ovr
//   · הקובץ עדיין מתקמפל (מתקמפל בלבד; אין הרצה)
function assertSafeEdit(before, after, maxLines) {
  const a = before.split('\n'), b = after.split('\n');
  if (a.length !== b.length) {
    throw new Error(`בדיקת בטיחות נכשלה: מספר השורות השתנה ${a.length} → ${b.length}`);
  }
  const diffs = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs.push(i);
  if (!diffs.length) throw new Error('בדיקת בטיחות נכשלה: שום שורה לא השתנתה');
  if (diffs.length > maxLines) {
    throw new Error(`בדיקת בטיחות נכשלה: השתנו ${diffs.length} שורות, צפויות לכל היותר ${maxLines}`);
  }
  const strip = s => s.replace(/\b(peak_ovr|ovr):\s*\d+/g, '$1:#');
  for (const i of diffs) {
    if (strip(a[i]) !== strip(b[i])) {
      throw new Error(`בדיקת בטיחות נכשלה: שורה ${i + 1} השתנתה מעבר לדירוג\n  לפני:  ${a[i]}\n  אחרי:  ${b[i]}`);
    }
  }
  new vm.Script(after, { filename: 'data.js' });   // תחביר בלבד, בלי הרצה
  return diffs.length;
}

// ── דיווח ───────────────────────────────────────────────────────────────────

function reportSkip(s) {
  if (s.reason === 'ambiguous') {
    console.log('');
    console.log(`  ⚠  ${s.player_key} · ${s.season} — ${s.why}`);
    s.rows.forEach(r => console.log(`       ${r.squadId}  ${r.pos}  ovr ${r.ovr}`));
    console.log('       האישור לא הוחל ונשאר ממתין. שני אלה עשויים להיות שני אנשים');
    console.log('       שונים עם אותו שם; רק אתה יכול להכריע. הכרעה = לערוך ידנית,');
    console.log('       ואז לסמן applied_at על השורה.');
  } else {
    console.log(`  דולג: ${s.player_key} · ${s.season} — ${s.why}`);
  }
}

// ── ה-selftest ──────────────────────────────────────────────────────────────
// מנוע העריכה הוא החלק המסוכן, והוא גם החלק היחיד שאפשר לבדוק בלי מסד. הוא
// רץ כאן מול js/data.js האמיתי, *בזיכרון בלבד* — הקובץ נקרא ולעולם לא נכתב.
// כתיבה אמיתית נבדקת על עותק ב-tmp, כדי שגם הנתיב שנוגע בדיסק יהיה מכוסה.
function selftest() {
  const orig = fs.readFileSync(DATA, 'utf8');
  let failed = 0;
  const ok = (cond, what, extra) => {
    if (!cond) failed++;
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}`);
    if (extra) console.log(`      ${extra}`);
  };

  console.log('── נרמול ──────────────────────────────────────────────────');
  ok(norm('יוסי אבוקסיס‎') === 'יוסי אבוקסיס', 'norm מוחק LRM');
  ok(norm("ויקטור פאצ’ו") === "ויקטור פאצ'ו", 'norm מאחד גרשים');
  ok(norm('  אלון   מזרחי  ') === 'אלון מזרחי', 'norm מכווץ רווחים');

  console.log('\n── עריכה רגילה: שורה אחת, מספר אחד ────────────────────────');
  const K = 'אלון מזרחי';
  const r1 = applyOne(orig, K, '1999/00', 92);
  ok(r1.ok, `${K} 1999/00 → 92 הוחל`, r1.ok ? '' : r1.why);
  if (r1.ok) {
    ok(r1.before === 88 && r1.after === 92, `88 → 92 (${r1.row.squadId})`);
    const changed = assertSafeEdit(orig, r1.src, 1);
    ok(changed === 1, `שורה אחת בדיוק השתנתה (${changed})`);
    const a = orig.split('\n'), b = r1.src.split('\n');
    const i = a.findIndex((l, j) => l !== b[j]);
    console.log(`      לפני:  ${a[i].trim()}`);
    console.log(`      אחרי:  ${b[i].trim()}`);
    const nums = l => (l.match(/\d+/g) || []).join(',');
    const na = nums(a[i]).split(','), nb = nums(b[i]).split(',');
    const moved = na.filter((v, j) => v !== nb[j]).length;
    ok(moved === 1, `מספר אחד בדיוק זז בשורה (${na.join('/')} → ${nb.join('/')})`);
  }

  console.log('\n── עמימות: הסירוב שכל הפיצ\'ר תלוי בו ──────────────────────');
  const r2 = applyOne(orig, 'יוסי אבוקסיס', '1999/00', 95);
  ok(!r2.ok && r2.reason === 'ambiguous', 'יוסי אבוקסיס 1999/00 נדחה כעמום',
     r2.ok ? 'הוחל! זה בדיוק מה שאסור' : r2.why);
  (r2.rows || []).forEach(r => console.log(`      ${r.squadId}  ${r.pos}  ovr ${r.ovr}`));
  ok(r2.src === orig, 'המקור לא זז בכלל בעקבות דחייה');
  const r2b = applyOne(orig, 'יוסי אבוקסיס', '2000/01', 95);
  ok(!r2b.ok && r2b.reason === 'ambiguous', 'וגם 2000/01 נדחה כעמום', r2b.why);

  console.log('\n── שם שלא קיים ────────────────────────────────────────────');
  const r3 = applyOne(orig, 'ג\'ורג\' וושינגטון', '1999/00', 80);
  ok(!r3.ok && r3.reason === 'not_found', 'שם בדוי נדחה כ-not_found', r3.why);
  ok(r3.reason !== 'ambiguous', 'not_found אינו מתבלבל עם ambiguous');

  console.log('\n── peak_ovr נגרר אחרי דירוג שעלה מעליו ─────────────────────');
  const r4 = applyOne(orig, K, '1999/00', 95);           // peak_ovr הרשום 93
  const p4 = fixPeaks(r4.src, new Set([K]));
  ok(p4.fixes.length > 0, `peak_ovr תוקן ב-${p4.fixes.length} שורות`);
  p4.fixes.slice(0, 3).forEach(f => console.log(`      ${f.key} ${f.squadId}: peak ${f.from} → ${f.to}`));
  ok(p4.fixes.every(f => f.to === 95 && f.key === K), 'כל התיקונים הם 95, ורק לשחקן שנגענו בו');
  const left = fixPeaks(p4.src, new Set([K])).fixes.length;
  ok(left === 0, `אחרי התיקון לא נשאר peak_ovr סותר לשחקן הזה (${left})`);
  const changed4 = assertSafeEdit(orig, p4.src, 1 + p4.fixes.length);
  ok(changed4 >= 2, `סה"כ ${changed4} שורות — הדירוג והשיאים`);

  console.log('\n── הבדיקה שלפני כתיבה באמת עוצרת ──────────────────────────');
  let caught = '';
  try { assertSafeEdit(orig, orig.replace("position: 'ST'", "position: 'GK'"), 5); }
  catch (e) { caught = e.message.split('\n')[0]; }
  ok(/מעבר לדירוג/.test(caught), 'שינוי שאינו דירוג נחסם', caught);
  caught = '';
  try { assertSafeEdit(orig, orig + '\n', 5); } catch (e) { caught = e.message; }
  ok(/מספר השורות/.test(caught), 'שינוי במספר השורות נחסם', caught);
  caught = '';
  try { assertSafeEdit(orig, p4.src, 1); } catch (e) { caught = e.message; }
  ok(/צפויות לכל היותר/.test(caught), 'יותר שורות מהצפוי נחסם', caught);
  // בדיקת התחביר היא רשת אחרונה: בדיקת השורות כבר חוסמת כל שינוי שאינו ספרה,
  // ולכן אי אפשר להגיע אליה דרך API רגיל. מה שכן נבדק — שעריכה תקינה עוברת
  // אותה, כלומר שהיא לא נכשלת בשווא על קובץ של 2MB.
  ok(assertSafeEdit(orig, r1.src, 1) === 1, 'עריכה תקינה עוברת גם את בדיקת התחביר');

  console.log('\n── גלאי השמות הכפולים ─────────────────────────────────────');
  const ns = namesakeKeys(orig);
  ok(ns.has('יוסי אבוקסיס'), 'יוסי אבוקסיס מזוהה כשם שחוזר באותה עונה');
  ok(ns.has('עומר פרץ'), 'וגם עומר פרץ — שהעונה שלו 2007/08 היא CM 64 מול ST 75');
  ok(!ns.has(K), `${K} חוזר באותה עונה אבל באותו דירוג — לא חשוד, ולא מדווח`);
  ok(namesakeKeys(orig, 1).size > ns.size,
     `הסף עובד: ${namesakeKeys(orig, 1).size} שמות חוזרים בסך הכל, ${ns.size} מהם חשודים`);
  console.log(`      החשודים: ${[...ns].join(' · ')}`);

  console.log('\n── נתיב הכתיבה, על עותק ב-tmp ─────────────────────────────');
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'crowd-')), 'data.js');
  fs.writeFileSync(tmp, p4.src);
  const back = fs.readFileSync(tmp, 'utf8');
  ok(back === p4.src, 'מה שנכתב הוא מה שנקרא בחזרה');
  ok(back !== orig, 'והוא באמת שונה מהמקור');
  ok(fs.readFileSync(DATA, 'utf8') === orig, 'js/data.js עצמו לא נגעו בו');
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });

  console.log('\n── מה fixPeaks היה עושה בלי הצמצום ────────────────────────');
  const wide = fixPeaks(orig, null);
  console.log(`      על data.js כמו שהוא, בלי שום אישור: ${wide.fixes.length} שורות peak_ovr`);
  console.log('      היו משתנות. הן לא קשורות לשום דבר שהקהל אישר, ולכן ברירת');
  console.log('      המחדל כאן מצמצמת ל---fix-all-peaks בלבד. ראה את הדוח.');

  console.log(`\n${failed ? `${failed} נכשלו` : 'הכל עבר'}`);
  return failed;
}

// ── ראשי ────────────────────────────────────────────────────────────────────

async function main() {
  if (SELFTEST) { process.exit(selftest() ? 1 : 0); }

  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!URL || !KEY) {
    console.error('חסר SUPABASE_URL או SUPABASE_SERVICE_KEY');
    console.error('(לבדיקת מנוע העריכה בלי מסד: node scripts/apply_crowd_ratings.js --selftest)');
    process.exit(1);
  }

  const rows = await pending(URL, KEY);
  if (!rows.length) { console.log('אין אישורים ממתינים.'); return; }

  const orig = fs.readFileSync(DATA, 'utf8');
  let src = orig;
  const done = [], notFound = [], ambiguous = [], other = [];

  for (const r of rows) {
    const key = norm(r.player_key);
    const res = applyOne(src, key, r.season, r.new_ovr);
    if (!res.ok) {
      const rec = { ...r, player_key: key, reason: res.reason, why: res.why, rows: res.rows };
      if (res.reason === 'ambiguous') ambiguous.push(rec);
      else if (res.reason === 'not_found') notFound.push(rec);
      else other.push(rec);
      continue;
    }
    src = res.src;
    done.push({ ...r, player_key: key, row: res.row, before: res.before });
  }

  // peak_ovr רק לשחקנים שבאמת ערכנו. הרצה על כל הקובץ הייתה מגלגלת פנימה 23
  // תיקוני שיא שאף אחד לא ביקש — חלקם בין שני אנשים שחולקים שם — ומדביקה אותם
  // לקומיט של "דירוגי קהל". מי שרוצה את הניקוי הרחב מקבל אותו במפורש.
  const keys = new Set(done.map(d => d.player_key));
  const peaks = fixPeaks(src, ALL_PEAKS ? null : keys);
  src = peaks.src;

  console.log(`הוחלו ${done.length} · דולגו ${notFound.length + ambiguous.length + other.length} · peak_ovr תוקן ב-${peaks.fixes.length}`);
  console.log(`  מתוך הדילוגים: ${ambiguous.length} עמומים · ${notFound.length} לא נמצאו` +
              (other.length ? ` · ${other.length} אחר` : ''));

  done.forEach(d => console.log(
    `  ${d.player_key} ${d.season} [${d.row.squadId}]: ${d.before} → ${d.new_ovr} (${d.votes} הצבעות)`));
  peaks.fixes.forEach(f => console.log(`  peak_ovr ${f.key} [${f.squadId}]: ${f.from} → ${f.to}`));
  if (peaks.outOfScope.length) {
    console.log(`  (${peaks.outOfScope.length} שורות peak_ovr לא-עקביות בקובץ שלא נגענו בהן — --fix-all-peaks)`);
  }
  const namesakes = namesakeKeys(orig);
  peaks.fixes.filter(f => namesakes.has(f.key))
    .map(f => f.key).filter((v, i, a) => a.indexOf(v) === i)
    .forEach(k => console.log(
      `  ⚠  peak_ovr של '${k}' חושב על כל השורות בשם הזה, והשם הזה חוזר פעמיים` +
      `\n     באותה עונה במקום אחר בקובץ — ייתכן ששני אנשים. שווה מבט.`));

  other.forEach(reportSkip);
  notFound.forEach(reportSkip);
  ambiguous.forEach(reportSkip);      // אחרונים בכוונה: זה מה שנשאר על המסך

  if (!WRITE) { console.log('\nיבש. להרצה אמיתית: --write'); return; }
  if (!done.length && !peaks.fixes.length) { console.log('\nאין מה לכתוב.'); return; }

  const changed = assertSafeEdit(orig, src, done.length + peaks.fixes.length);
  console.log(`\nבדיקת בטיחות עברה: ${changed} שורות, כולן דירוג בלבד, הקובץ מתקמפל.`);

  fs.writeFileSync(DATA, src);
  if (done.length) {
    const head = fs.existsSync(LOG) ? '' : 'when,player,season,old,new,votes\n';
    fs.appendFileSync(LOG, head + done.map(d =>
      `${new Date().toISOString()},"${d.player_key}",${d.season},${d.before},${d.new_ovr},${d.votes}`
    ).join('\n') + '\n');
    await markApplied(URL, KEY, done.map(d => d.id));
  }
  console.log(`נכתב ל-${DATA}. להריץ node scripts/stamp_assets.js ולקמט.`);
  if (ambiguous.length) {
    console.log(`${ambiguous.length} אישורים עמומים נשארו ממתינים בכוונה — הם עדיין בתור.`);
  }
}

module.exports = { norm, reEsc, squadIdBefore, seasonBlocks, findRows, applyOne, fixPeaks,
                   namesakeKeys, assertSafeEdit };

if (require.main === module) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
