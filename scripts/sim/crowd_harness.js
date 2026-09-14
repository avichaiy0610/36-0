// scripts/sim/crowd_harness.js
// בדיקות ללוגיקה הטהורה של js/crowd.js. אין כאן framework — הקובץ מדפיס
// שורה לכל בדיקה ויוצא עם קוד 1 אם משהו נפל.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const ctx = { console, window: {}, document: { addEventListener() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'crowd.js'), 'utf8'), ctx);

let failed = 0;
function is(actual, expected, what) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${ok ? '' : `\n      got ${a}\n      want ${e}`}`);
}

// ── crowdKey חייב להסכים עם pcNorm בדיוק ──────────────────────────────────
// pcNorm מסיר סימני כיווניות, מאחד גרשים, מכווץ רווחים ומקצץ. שם שמנורמל
// אחרת ייצור מפתח שני לאותו אדם, וההצבעות ייחתכו לשניים בלי שאף אחד ישים לב.
is(ctx.crowdKey('יוסי אבוקסיס‎'), 'יוסי אבוקסיס', 'crowdKey strips the LRM');
is(ctx.crowdKey("ויקטור פאצ’ו"),  "ויקטור פאצ'ו",  'crowdKey unifies apostrophes');
is(ctx.crowdKey('  אלון   מזרחי  '),  'אלון מזרחי',    'crowdKey collapses spaces');

// ── מדף התגיות ────────────────────────────────────────────────────────────
is(ctx.crowdShelf('ST').map(t => t.key),
   ['set_piece','derby_king','leader','pace','magic','tough','big_games','unfulfilled','injuries','cult_hero'],
   'outfield shelf is the ten');
is(ctx.crowdShelf('GK').map(t => t.key),
   ['reflexes','derby_king','leader','distribution','sweeper','tough','big_games','unfulfilled','injuries','cult_hero'],
   'keeper shelf swaps three');
is(ctx.crowdShelf('GK').length, 10, 'keeper shelf is still ten');

// ── ה-slug ────────────────────────────────────────────────────────────────
// שלושה מקומות בונים ממנו קישור. מימוש אחד, ובדיקה אחת.
is(ctx.crowdSlug('אלון מזרחי'), 'אלון-מזרחי', 'slug joins with a hyphen');
is(ctx.crowdSlug("ויקטור פאצ’ו"), "ויקטור-פאצ'ו", 'slug normalises first');

// ── מצב התצוגה ────────────────────────────────────────────────────────────
// הסף הוא 5. מתחת לזה לא מוצג מספר — רק מונה, שגם משמש כתמריץ.
is(ctx.crowdDisplay(null),                    { state: 'empty',   left: 5 },  'no rows at all → empty');
is(ctx.crowdDisplay({ n: 0 }),                { state: 'empty',   left: 5 },  'zero votes → empty');
is(ctx.crowdDisplay({ n: 3 }),                { state: 'few',     left: 2 },  'three votes → two to go');
is(ctx.crowdDisplay({ n: 5, avg_trimmed: 82 }),
                                              { state: 'shown', n: 5, avg: 82 }, 'five votes → shown');

process.exit(failed ? 1 : 0);
