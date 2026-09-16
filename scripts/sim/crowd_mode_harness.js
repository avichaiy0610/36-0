// scripts/sim/crowd_mode_harness.js
// מוד הקהל — הבדיקה החשובה כאן היא מה שלא משתנה.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const R = f => fs.readFileSync(path.join(root, f), 'utf8');

const ctx = { console, window: {}, document: { addEventListener() {} } };
vm.createContext(ctx);
vm.runInContext(R('js/crowd.js'), ctx);
vm.runInContext(R('js/chem-data.js') + ';this.CHEM_PAIRS=CHEM_PAIRS;', ctx);
// const ברמה העליונה לא נצמד להקשר של vm — מתועד ב-.claude/skills/verify.
// המפות עצמן הן אותו אובייקט, אז שינוי דרך ctx נראה גם מבפנים.
vm.runInContext(R('js/crowd-overrides.js') +
  ';this.CROWD_OVR=CROWD_OVR;this.CROWD_DUOS=CROWD_DUOS;this.CROWD_DUOS_OFF=CROWD_DUOS_OFF;', ctx);
// chemistry.js touches the DOM at load in places; only the lookup half is needed
vm.runInContext(/function chemNorm[\s\S]*?\nfunction chemTier[^\n]*\n/.exec(R('js/chemistry.js'))[0], ctx);

let failed = 0;
function is(a, b, what) {
  const x = JSON.stringify(a), y = JSON.stringify(b), ok = x === y;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}` + (ok ? '' : `\n      got ${x}\n      want ${y}`));
}

// ── מוד כבוי: השכבה לא קיימת ─────────────────────────────────────────────
ctx.state = { crowdMode: false, peakMode: false };
is(ctx.crowdModeOn(), false, 'מוד כבוי');
is(ctx.crowdOvrFor('אלון מזרחי', '1999/00'), null, 'כבוי → אין דירוג קהל');
is(ctx.crowdDuoFor('אלון חרזי', "ניר דוידוביץ'"), undefined, 'כבוי → אין דעה על צמדים');

// ── מוד דלוק, אבל בלי שום דבר מאושר ──────────────────────────────────────
ctx.state = { crowdMode: true, peakMode: false };
is(ctx.crowdOvrFor('אלון מזרחי', '1999/00'), null,
   'דלוק ובלי אישורים → השחקן נשאר בדיוק כמו במשחק הראשי');
// והצמד הקיים ממשיך לעבוד דרך הרשימה הרגילה
is(ctx.chemTier('אלון חרזי', "ניר דוידוביץ'") > 0, true,
   'דלוק → צמד קיים במשחק הראשי עדיין נספר');

// ── עם אישורים ───────────────────────────────────────────────────────────
ctx.CROWD_OVR['אלון מזרחי|1999/00'] = 92;
is(ctx.crowdOvrFor('אלון מזרחי', '1999/00'), 92, 'שחקן שאושר מקבל את דירוג הקהל');
is(ctx.crowdOvrFor('אלון מזרחי', '2000/01'), null,
   'ועונה אחרת שלו לא נגעו בה — הדירוג הוא על שחקן-בעונה');
is(ctx.crowdOvrFor('אבי נמני', '1999/00'), null, 'ושחקן אחר לגמרי לא זז');

ctx.CROWD_DUOS_OFF.push(ctx.crowdKey('אלון חרזי') + '|' + ctx.crowdKey("ניר דוידוביץ'"));
is(ctx.crowdDuoFor('אלון חרזי', "ניר דוידוביץ'"), null, 'צמד שבוטל מוחזר כ-null');
is(ctx.crowdDuoFor("ניר דוידוביץ'", 'אלון חרזי'), null, 'ובאותה מידה מהכיוון ההפוך');

ctx.CROWD_DUOS['אבי נמני|ערן זהבי'] = [2, 4, 1];
is(ctx.crowdDuoFor('ערן זהבי', 'אבי נמני'), [2, 4, 1], 'צמד שנוסף מוחזר, ללא תלות בסדר');

// ── וחזרה לכבוי: הכל נעלם ────────────────────────────────────────────────
ctx.state.crowdMode = false;
is(ctx.crowdOvrFor('אלון מזרחי', '1999/00'), null, 'כיבוי מחזיר את המשחק הראשי כפי שהוא');
is(ctx.crowdDuoFor('אלון חרזי', "ניר דוידוביץ'"), undefined, 'וגם את הצמדים');

process.exit(failed ? 1 : 0);
