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
// crowdSlug חייב להסכים עם slugFor ב-scripts/player_pages.js תו בתו, כי הוא
// בונה קישור אל תיקייה שהמחולל כבר יצר. הגרסה הראשונה נבנתה מ-crowdKey, ש-
// **מאחד ושומר** גרשים בעוד המחולל **מוחק** אותם: 475 מתוך 2,724 השמות קיבלו
// slug אחר, וכל אחד מהם 404 קשה. השמות כאן הם השמות האמיתיים שנפלו.
is(ctx.crowdSlug('אלון מזרחי'), 'אלון-מזרחי', 'slug joins with a hyphen');
is(ctx.crowdSlug("ויקטור פאצ'ו"), 'ויקטור-פאצו',  'slug drops the geresh, like slugFor');
is(ctx.crowdSlug("מתי חג'ג'"),   'מתי-חגג',      'slug drops every geresh in the name');
is(ctx.crowdSlug("ז'אן טלסניקוב"), 'זאן-טלסניקוב', 'slug drops a leading geresh');
is(ctx.crowdSlug('זוראן צ׳מפרה'), 'זוראן-צמפרה',  'slug drops U+05F3 too');
// ואלה השניים שמוכיחים למה אסור להרכיב את crowdSlug מ-crowdKey: crowdKey היה
// מקפל backtick וגרש מתולתל לגרש ישר, ואז שלב המחיקה היה מעלים אותם — בעוד
// שבדיסק הם קיימים, כי slugFor מעולם לא איחד.
is(ctx.crowdSlug('ג`בייר בושנאק'), 'ג`בייר-בושנאק', 'slug KEEPS a backtick');
is(ctx.crowdSlug('אנדרה ז’ראלדש'), 'אנדרה-ז’ראלדש', 'slug KEEPS a curly quote');
// crowdKey הוא מפתח המסד, לא כתובת, והוא לא זז: הגרש נשאר בו, מאוחד.
is(ctx.crowdKey("ויקטור פאצ'ו"), "ויקטור פאצ'ו", 'crowdKey still keeps the geresh');

// ── מצב התצוגה ────────────────────────────────────────────────────────────
// הסף הוא 5. מתחת לזה לא מוצג מספר — רק מונה, שגם משמש כתמריץ.
is(ctx.crowdDisplay(null),                    { state: 'empty',   left: 5 },  'no rows at all → empty');
is(ctx.crowdDisplay({ n: 0 }),                { state: 'empty',   left: 5 },  'zero votes → empty');
is(ctx.crowdDisplay({ n: 3 }),                { state: 'few',     left: 2 },  'three votes → two to go');
is(ctx.crowdDisplay({ n: 4, avg_trimmed: null }), { state: 'few', left: 1 },  'four votes → one to go');
is(ctx.crowdDisplay({ n: 5, avg_trimmed: 82 }),
                                              { state: 'shown', n: 5, avg: 82 }, 'five votes → shown');
// המסד לא אמור להחזיר את זה לעולם — crowd_trimmed_avg מחזיר NULL אם ורק אם
// n < 5. הבדיקה קיימת כי ההחלטה מה ניתן להציג היא של הפונקציה הזאת, ואסור לה
// להיות נכונה רק כל עוד אינווריאנט מרוחק מחזיק. בלי השומר מופיעה המילה "null"
// במקום שבו אמור להופיע דירוג.
is(ctx.crowdDisplay({ n: 7, avg_trimmed: null }), { state: 'few', left: 1 },
   'a count with no average is never shown');

process.exit(failed ? 1 : 0);
