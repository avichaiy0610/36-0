// The European field — clubs only, no logic.
//
// Split out of js/europe.js when the campaign became a step sequence with a
// knockout bracket: the engine has to stay loadable in Node so the odds can keep
// being measured against the real sim, and data with no dependencies is the
// easiest half to lift out.
//
// ── Ratings, which are the whole design ──────────────────────────────────────
// A PERFECT draft — the best legal player at every slot, across every season in
// the data — rates 91 (92 in peak mode). A normal good draft lands at 85-88.
// The pots are set against that number, not against it being close:
//
//   pot 1  96-99   pot 2  93-99   pot 3  89-90   pot 4  84-91
//
// Eleven clubs sit at 99 — eight clear of anything Israeli football has ever
// assembled. That gap is the design, not an accident of tuning: see
// docs/EUROPE.md for what it costs a squad at each rating.
//
// The pots are the DRAW (two clubs from each), not a difficulty ladder: the
// ratings were set club by club, so pot 2 holds three 99s and pot 4 holds a 91.
// Nothing in the code assumes pot number tracks strength.

/* ── the qualifying clubs ─────────────────────────────────────────────────────
   The four qualifying opponents are not invented. docs/EUROPE_OPPONENTS.md counts
   every tie Israeli champions played from 2000/01 to 2026/27, and these are the
   clubs that keep turning up in each round — Salzburg most of all, three times in
   the play-off, more than anyone. They also exist in js/gauntlet-europe.js as
   GM_EU with the same ratings; the gauntlet keeps its own copy because it stores
   line ratings inside a run. Change a rating in one place, change it in both. */

// Three candidates per round, one drawn per campaign, so the same season is not
// the same summer twice. Each round holds one club easier and one harder than
// the anchor, which is what makes the draw worth caring about: a 79 in the first
// round can end a run that a 75 would have waved through.
//
// `round` is the chip on the tie header, where space is short. `roundLong` is
// the form a sentence needs: "נעצרת בסיבוב המוקדמות השלישי", not "נעצרת במוקדמות 3".
const EU_ROUNDS = [
  { id: 'q1', round: 'מוקדמות 1', roundLong: 'סיבוב המוקדמות הראשון', clubs: [
    { id: 'eu-kalju',  name: 'נומה קאליו',   country: 'אסטוניה', flag: '🇪🇪', ovr: 77,
      desc: 'אלופת אסטוניה. הסיבוב שישראלית מגיעה אליו רק כשהמקדם נמוך - ובכל ארבע הפעמים היריבה הייתה אחרת.' },
    { id: 'eu-flora',  name: 'פלורה טאלין',  country: 'אסטוניה', flag: '🇪🇪', ovr: 75,
      desc: 'הפועל באר שבע עברה אותה ב-2018/19. הסיבוב הראשון שלה, וגם שלך.' },
    { id: 'eu-kairat', name: 'קייראט אלמאטי', country: 'קזחסטן', flag: '🇰🇿', ovr: 79,
      desc: 'אלופת קזחסטן שהדיחה את מכבי חיפה ב-2021/22. הסיבוב הראשון לא תמיד קל.' },
  ]},
  { id: 'q2', round: 'מוקדמות 2', roundLong: 'סיבוב המוקדמות השני', clubs: [
    { id: 'eu-sheriff', name: 'שריף טירספול', country: 'מולדובה', flag: '🇲🇩', ovr: 84,
      desc: 'היריבה החוזרת ביותר של הסיבוב השני: פעמיים מול ישראליות, ושתי הפעמים הן עברו.' },
    { id: 'eu-zilina',  name: 'ז\'ילינה',      country: 'סלובקיה', flag: '🇸🇰', ovr: 81,
      desc: 'נפגשה פעמיים בסיבוב הזה - מכבי ת"א ב-2003/04 ועירוני קריית שמונה ב-2012/13.' },
    { id: 'eu-copenhagen', name: 'קופנהגן',   country: 'דנמרק',  flag: '🇩🇰', ovr: 87,
      desc: 'בית"ר ירושלים נתקלה בה ב-2007/08. גדולה מדי לסיבוב השני, וזה בדיוק העניין.' },
  ]},
  { id: 'q3', round: 'מוקדמות 3', roundLong: 'סיבוב המוקדמות השלישי', clubs: [
    { id: 'eu-zvezda',  name: 'הכוכב האדום בלגרד', country: 'סרביה',   flag: '🇷🇸', ovr: 87,
      desc: 'מכבי חיפה הדיחה אותה ב-2022/23 ועלתה לשלב הבתים. מרקאנה הסרבית לא מוחלת פעמיים.' },
    { id: 'eu-maribor', name: 'מריבור',            country: 'סלובניה', flag: '🇸🇮', ovr: 85,
      desc: 'שלושה מפגשים מול ישראליות - יותר מכל מועדון חוץ מזלצבורג.' },
    { id: 'eu-basel',   name: 'באזל',              country: 'שווייץ',  flag: '🇨🇭', ovr: 89,
      desc: 'מכבי ת"א עברה אותה ב-2015/16 בשערי חוץ. הסיבוב השלישי במיטבו הקשה.' },
  ]},
  // The play-off is where the Champions League colours arrive. It is the last
  // gate before the league phase, and the game says so with the whole screen.
  { id: 'po', round: 'פלייאוף', roundLong: 'שלב הפלייאוף', clubs: [
    { id: 'eu-salzburg', name: 'רד בול זלצבורג', country: 'אוסטריה', flag: '🇦🇹', ovr: 89,
      desc: 'הקיר של הפלייאוף: שלושה מפגשים מול ישראליות, יותר מכל מועדון אחר. מי שעובר אותה - בשלב הליגה.' },
    { id: 'eu-bate',     name: 'באט"ה בוריסוב',  country: 'בלארוס',  flag: '🇧🇾', ovr: 86,
      desc: 'עצרה את עירוני קריית שמונה ב-2012/13, במסע האירופי היחיד של המועדון.' },
    { id: 'eu-celtic',   name: 'סלטיק',          country: 'סקוטלנד', flag: '🏴', ovr: 91,
      desc: 'הפועל באר שבע נפלה מולה ב-2016/17. סלטיק פארק הוא לא מקום להתחיל בו קיץ.' },
  ]},
];

// 35 clubs in four pots. The 36th seat in the table is yours, and it is in pot 4
// — which is where an Israeli champion actually lands.
const EU_POTS = [
  [ // pot 1 — 96-99. The clubs you are not supposed to take a point off.
    { id: 'eu-real', name: 'ריאל מדריד', flag: '🇪🇸', ovr: 99 },
    { id: 'eu-barca', name: 'ברצלונה', flag: '🇪🇸', ovr: 99 },
    { id: 'eu-mancity', name: "מנצ'סטר סיטי", flag: '🏴', ovr: 99 },
    { id: 'eu-bayern', name: 'באיירן מינכן', flag: '🇩🇪', ovr: 99 },
    { id: 'eu-liverpool', name: 'ליברפול', flag: '🏴', ovr: 99 },
    { id: 'eu-psg', name: "פריז סן ז'רמן", flag: '🇫🇷', ovr: 99 },
    { id: 'eu-inter', name: 'אינטר', flag: '🇮🇹', ovr: 99 },
    { id: 'eu-dortmund', name: 'בורוסיה דורטמונד', flag: '🇩🇪', ovr: 99 },
    { id: 'eu-leipzig', name: 'לייפציג', flag: '🇩🇪', ovr: 96 },
  ],
  [ // pot 2 — 93-99. Arsenal, Atlético and Juventus are rated with pot 1.
    { id: 'eu-arsenal', name: 'ארסנל', flag: '🏴', ovr: 99 },
    { id: 'eu-atletico', name: 'אתלטיקו מדריד', flag: '🇪🇸', ovr: 99 },
    { id: 'eu-leverkusen', name: 'באייר לוורקוזן', flag: '🇩🇪', ovr: 94 },
    { id: 'eu-juventus', name: 'יובנטוס', flag: '🇮🇹', ovr: 99 },
    { id: 'eu-milan', name: 'מילאן', flag: '🇮🇹', ovr: 94 },
    { id: 'eu-atalanta', name: 'אטלנטה', flag: '🇮🇹', ovr: 93 },
    { id: 'eu-benfica', name: 'בנפיקה', flag: '🇵🇹', ovr: 93 },
    { id: 'eu-porto', name: 'פורטו', flag: '🇵🇹', ovr: 93 },
    { id: 'eu-bilbao', name: 'אתלטיק בילבאו', flag: '🇪🇸', ovr: 93 },
  ],
  [ // pot 3 — 89-90. Olympiacos and Young Boys are here for a reason: both
    // knocked on Israeli doors in the real qualifying rounds.
    { id: 'eu-sporting', name: 'ספורטינג ליסבון', flag: '🇵🇹', ovr: 90 },
    { id: 'eu-feyenoord', name: 'פיינורד', flag: '🇳🇱', ovr: 90 },
    { id: 'eu-psv', name: 'PSV איינדהובן', flag: '🇳🇱', ovr: 90 },
    { id: 'eu-lille', name: 'ליל', flag: '🇫🇷', ovr: 90 },
    { id: 'eu-celtic', name: 'סלטיק', flag: '🏴', ovr: 89 },
    { id: 'eu-shakhtar', name: 'שחטאר דונייצק', flag: '🇺🇦', ovr: 89 },
    { id: 'eu-zagreb', name: 'דינמו זאגרב', flag: '🇭🇷', ovr: 89 },
    { id: 'eu-youngboys', name: 'יאנג בויז', flag: '🇨🇭', ovr: 89 },
    { id: 'eu-olympiacos', name: 'אולימפיאקוס', flag: '🇬🇷', ovr: 89 },
  ],
  [ // pot 4 — 84-91. Your own pot, and the only place the table is winnable —
    // though Aston Villa at 91 outrates everything in pot 3.
    { id: 'eu-villa', name: 'אסטון וילה', flag: '🏴', ovr: 91 },
    { id: 'eu-monaco', name: 'מונאקו', flag: '🇫🇷', ovr: 90 },
    { id: 'eu-stuttgart', name: 'שטוטגרט', flag: '🇩🇪', ovr: 88 },
    { id: 'eu-girona', name: "ג'ירונה", flag: '🇪🇸', ovr: 86 },
    { id: 'eu-sparta', name: 'ספרטה פראג', flag: '🇨🇿', ovr: 85 },
    { id: 'eu-brest', name: 'ברסט', flag: '🇫🇷', ovr: 85 },
    { id: 'eu-sturm', name: 'שטורם גראץ', flag: '🇦🇹', ovr: 84 },
    { id: 'eu-slovan', name: 'סלובאן ברטיסלבה', flag: '🇸🇰', ovr: 84 },
  ],
];

// One stand-by per pot. The league phase is 36 clubs and stays 36: a side you
// eliminated in qualifying is out of the competition, and somebody takes the
// seat. Today only Celtic can trigger this — she is the one club that sits in
// both a qualifying round and a pot — but the mechanism is general, because the
// day another overlap is added nobody will remember to re-check the count.
const EU_RESERVES = [
  [{ id: 'eu-chelsea', name: "צ'לסי", flag: '🏴', ovr: 97 },       { id: 'eu-newcastle', name: 'ניוקאסל', flag: '🏴', ovr: 96 }],
  [{ id: 'eu-napoli', name: 'נאפולי', flag: '🇮🇹', ovr: 93 },      { id: 'eu-marseille', name: 'מרסיי', flag: '🇫🇷', ovr: 93 }],
  [{ id: 'eu-galatasaray', name: 'גלאטסראיי', flag: '🇹🇷', ovr: 89 },   { id: 'eu-ajax', name: 'אייאקס', flag: '🇳🇱', ovr: 89 }],
  [{ id: 'eu-brugge', name: "קלאב ברוז'", flag: '🇧🇪', ovr: 85 },  { id: 'eu-rangers', name: "ריינג'רס", flag: '🏴', ovr: 85 }],
];

/* ── the knockout ladder ──────────────────────────────────────────────────────
   Where the campaign used to stop at a table position. Places 1-8 skip the
   play-off round, 9-24 play it, 25-36 go home — the real format since 2024.

   `seedPots` is which pots the opponent is drawn from when you finished top 8,
   `pots` when you did not. Finishing high buys a kinder last-16 draw and nothing
   else: from the quarter-final on it is pot 1 and pot 2 either way, because by
   then it is. */
const EU_KO = [
  { id: 'ko-po', round: 'פלייאוף נוקאאוט', roundLong: 'פלייאוף הנוקאאוט',
    pots: [2, 3], seedPots: null },              // seeded sides do not play it
  { id: 'r16',   round: 'שמינית הגמר',     roundLong: 'שמינית הגמר',
    pots: [1], seedPots: [2, 3] },
  { id: 'qf',    round: 'רבע הגמר',        roundLong: 'רבע הגמר',
    pots: [0, 1], seedPots: [0, 1] },
  { id: 'sf',    round: 'חצי הגמר',        roundLong: 'חצי הגמר',
    pots: [0], seedPots: [0] },
  // One match, on neutral ground, named after the site rather than a real stadium.
  { id: 'final', round: 'הגמר',            roundLong: 'גמר ליגת האלופות',
    pots: [0], seedPots: [0], oneLeg: true },
];

// Which table places continue, and to what.
const EU_BANDS = [
  { max: 8,  id: 'r16',    label: '🏆 עלית ישירות לשמינית הגמר',  note: 'שמונה הראשונות עוקפות את הפלייאוף.' },
  { max: 24, id: 'po',     label: '✅ עלית לפלייאוף הנוקאאוט',      note: 'מקומות 9-24 משחקים סיבוב נוסף על מקום בשמינית.' },
  { max: 36, id: 'out',    label: '❌ סיימת מחוץ לתמונה',           note: 'מקומות 25-36 נגמרו להם באירופה.' },
];
