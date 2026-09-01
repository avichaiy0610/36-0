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
  // Shared by all three competitions, so nothing here may name one of them —
  // the screens compose "גמר " + the competition you are actually in.
  { id: 'final', round: 'הגמר',            roundLong: 'הגמר',
    pots: [0], seedPots: [0], oneLeg: true },
];

// Which table places continue, and to what.
const EU_BANDS = [
  { max: 8,  id: 'r16',    label: '🏆 עלית ישירות לשמינית הגמר',  note: 'שמונה הראשונות עוקפות את הפלייאוף.' },
  { max: 24, id: 'po',     label: '✅ עלית לפלייאוף הנוקאאוט',      note: 'מקומות 9-24 משחקים סיבוב נוסף על מקום בשמינית.' },
  { max: 36, id: 'out',    label: '❌ סיימת מחוץ לתמונה',           note: 'מקומות 25-36 נגמרו להם באירופה.' },
];

/* ── the other two competitions ───────────────────────────────────────────────
   The Europa League and the Conference League, as fields of 35 clubs each in
   the same shape as EU_POTS. Ratings are set against the same anchor everything
   else is: a good draft lands at 85-88 and a perfect one at 91.

     ליגת האלופות  84-99  — you are an outsider, and the trophy is 1:1,293
     הליגה האירופית 78-93  — an outsider, but not a hopeless one
     קונפרנס ליג    78-94  — a genuine contender, and not the favourite

   That last line is the whole reason these exist. The Conference is the first
   European competition an Israeli XI can actually win, and it is where most
   players will see a European trophy at all.

   A club may appear in more than one competition's field — Ajax and Fenerbahçe
   really do move between them season to season — and nothing breaks, because the
   draw already refuses anyone you have knocked out on the way. */

const EU_POTS_UEL = [
  [ // pot 1 — 89-93
    { id: 'eu-roma', name: 'רומא', flag: '🇮🇹', ovr: 96 },
    { id: 'eu-villarreal', name: 'ויאריאל', flag: '🇪🇸', ovr: 95 },
    { id: 'eu-betis', name: 'ריאל בטיס', flag: '🇪🇸', ovr: 94 },
    { id: 'eu-lyon', name: 'ליון', flag: '🇫🇷', ovr: 94 },
    { id: 'eu-fener', name: "פנרבחצ'ה", flag: '🇹🇷', ovr: 93 },
    { id: 'eu-ajax', name: 'אייאקס', flag: '🇳🇱', ovr: 93 },
    { id: 'eu-sociedad', name: 'ריאל סוסיאדד', flag: '🇪🇸', ovr: 93 },
    { id: 'eu-braga', name: 'בראגה', flag: '🇵🇹', ovr: 92 },
    { id: 'eu-rangers', name: "ריינג'רס", flag: '🏴', ovr: 92 },
  ],
  [ // pot 2 — 85-88
    { id: 'eu-galatasaray', name: 'גלאטסראיי', flag: '🇹🇷', ovr: 92 },
    { id: 'eu-nice', name: 'ניס', flag: '🇫🇷', ovr: 91 },
    { id: 'eu-hoffenheim', name: 'הופנהיים', flag: '🇩🇪', ovr: 90 },
    { id: 'eu-unionsg', name: "יוניון סן ז'ילואז", flag: '🇧🇪', ovr: 90 },
    { id: 'eu-slavia', name: 'סלביה פראג', flag: '🇨🇿', ovr: 90 },
    { id: 'eu-ferencvaros', name: 'פרנצווארוש', flag: '🇭🇺', ovr: 89 },
    { id: 'eu-paok', name: 'פאוק סלוניקי', flag: '🇬🇷', ovr: 89 },
    { id: 'eu-az', name: 'אלקמאר', flag: '🇳🇱', ovr: 89 },
    { id: 'eu-anderlecht', name: 'אנדרלכט', flag: '🇧🇪', ovr: 89 },
  ],
  [ // pot 3 — 82-84
    { id: 'eu-twente', name: 'טוונטה', flag: '🇳🇱', ovr: 88 },
    { id: 'eu-midtjylland', name: 'מידטיולנד', flag: '🇩🇰', ovr: 88 },
    { id: 'eu-plzen', name: 'ויקטוריה פלזן', flag: '🇨🇿', ovr: 87 },
    { id: 'eu-bodo', name: 'בודו/גלימט', flag: '🇳🇴', ovr: 87 },
    { id: 'eu-malmo', name: 'מאלמו', flag: '🇸🇪', ovr: 87 },
    { id: 'eu-lask', name: 'לאסק לינץ', flag: '🇦🇹', ovr: 86 },
    { id: 'eu-qarabag', name: 'קרבאח', flag: '🇦🇿', ovr: 86 },
    { id: 'eu-ludogorets', name: 'לודוגורץ', flag: '🇧🇬', ovr: 86 },
    { id: 'eu-besiktas', name: "בשיקטאש", flag: '🇹🇷', ovr: 88 },
  ],
  [ // pot 4 — 78-81. Your own pot, and the only place the table is winnable.
    { id: 'eu-elfsborg', name: 'אלפסבורג', flag: '🇸🇪', ovr: 86 },
    { id: 'eu-nicosia', name: 'אפולון לימסול', flag: '🇨🇾', ovr: 85 },
    { id: 'eu-rfs', name: 'ריגה', flag: '🇱🇻', ovr: 84 },
    { id: 'eu-backa', name: 'טי.אס.סי בקה טופולה', flag: '🇷🇸', ovr: 84 },
    { id: 'eu-aek-larnaca', name: 'איי.אי.קיי לרנקה', flag: '🇨🇾', ovr: 85 },
    { id: 'eu-slovacko', name: 'סלובאצקו', flag: '🇨🇿', ovr: 83 },
    { id: 'eu-petrocub', name: 'פטרוקוב', flag: '🇲🇩', ovr: 83 },
    { id: 'eu-noah', name: 'נוח ירוואן', flag: '🇦🇲', ovr: 83 },
  ],
];

const EU_POTS_UECL = [
  [ // pot 1 — 92-94
    { id: 'eu-fiorentina', name: 'פיורנטינה', flag: '🇮🇹', ovr: 90 },
    { id: 'eu-rapid', name: 'ראפיד וינה', flag: '🇦🇹', ovr: 89 },
    { id: 'eu-legia', name: 'לגיה ורשה', flag: '🇵🇱', ovr: 89 },
    { id: 'eu-gent', name: 'חנט', flag: '🇧🇪', ovr: 88 },
    { id: 'eu-djurgarden', name: 'יורגורדן', flag: '🇸🇪', ovr: 88 },
    { id: 'eu-heidenheim', name: 'היידנהיים', flag: '🇩🇪', ovr: 88 },
  ],
  [ // pot 2 — 89-91
    { id: 'eu-jagiellonia', name: 'יאגיילוניה', flag: '🇵🇱', ovr: 87 },
    { id: 'eu-cercle', name: "סרקל ברוז'", flag: '🇧🇪', ovr: 86 },
    { id: 'eu-vikingur', name: 'ויקינגור', flag: '🇮🇸', ovr: 85 },
    { id: 'eu-panathinaikos', name: 'פנאתינייקוס', flag: '🇬🇷', ovr: 87 },
    { id: 'eu-lugano', name: 'לוגאנו', flag: '🇨🇭', ovr: 85 },
    { id: 'eu-hearts', name: 'הארטס', flag: '🏴', ovr: 86 },
  ],
  [ // pot 3 — 86-88
    { id: 'eu-shamrock', name: 'שמרוק רוברס', flag: '🇮🇪', ovr: 83 },
    { id: 'eu-mlada', name: 'מלאדה בולסלב', flag: '🇨🇿', ovr: 83 },
    { id: 'eu-astana', name: 'אסטנה', flag: '🇰🇿', ovr: 84 },
    { id: 'eu-borac', name: 'בוראץ באניה לוקה', flag: '🇧🇦', ovr: 82 },
    { id: 'eu-heerenveen', name: 'הרנפן', flag: '🇳🇱', ovr: 84 },
    { id: 'eu-brondby', name: 'ברונדבי', flag: '🇩🇰', ovr: 84 },
  ],
  [ // pot 4 — 83-85
    { id: 'eu-omonia', name: 'אומוניה ניקוסיה', flag: '🇨🇾', ovr: 81 },
    { id: 'eu-larne', name: 'לארן', flag: '🇬🇧', ovr: 79 },
    { id: 'eu-pafos', name: 'פאפוס', flag: '🇨🇾', ovr: 81 },
    { id: 'eu-celje', name: 'צלייה', flag: '🇸🇮', ovr: 80 },
    { id: 'eu-tns', name: 'ניו סיינטס', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', ovr: 79 },
    { id: 'eu-hjk', name: 'הלסינקי', flag: '🇫🇮', ovr: 80 },
  ],
  [ // pot 5 — 80-82
    { id: 'eu-molde', name: 'מולדה', flag: '🇳🇴', ovr: 78 },
    { id: 'eu-olimpija', name: 'אולימפיה לובליאנה', flag: '🇸🇮', ovr: 77 },
    { id: 'eu-milsami', name: 'מילסמי אורחיי', flag: '🇲🇩', ovr: 76 },
    { id: 'eu-vitoria', name: 'ויטוריה גימאראש', flag: '🇵🇹', ovr: 78 },
    { id: 'eu-panevezys', name: 'פנבז\'יס', flag: '🇱🇹', ovr: 76 },
    { id: 'eu-backatopola', name: 'ראדניצקי', flag: '🇷🇸', ovr: 77 },
  ],
  [ // pot 6 — 78-79. Your own pot; the sixth seat of it is you.
    { id: 'eu-dinamo-minsk', name: 'דינמו מינסק', flag: '🇧🇾', ovr: 75 },
    { id: 'eu-st-gallen', name: 'סנט גאלן', flag: '🇨🇭', ovr: 75 },
    { id: 'eu-backa', name: 'טי.אס.סי בקה טופולה', flag: '🇷🇸', ovr: 74 },
    { id: 'eu-shelbourne', name: 'שלבורן', flag: '🇮🇪', ovr: 74 },
    { id: 'eu-paksi', name: 'פאקש', flag: '🇭🇺', ovr: 74 },
  ],
];

/* ── the three competitions, as one table ─────────────────────────────────────
   Everything the engine needs to know about which competition it is running.
   Adding a fourth would be a row here, not a branch in the code.

   `matches` and `perPot` are the real formats: the Champions League and the
   Europa League play EIGHT, two from each of four pots; the Conference plays
   SIX, one from each of six. That difference is why a tier cannot just be a
   label — the draw itself is shaped differently.

   `qual` is the road in. The champion enters the Champions League play-off
   route and the cup winner enters the Europa League at the first round, so both
   play four; the Conference is entered a round later and plays three. Only the
   Champions League has hand-written opponents, because only there do we have a
   real record of who Israeli clubs actually met — the other two draw from their
   own field, inside a band that rises round by round. */
const EU_TIERS = {
  ucl: {
    id: 'ucl', name: 'ליגת האלופות', short: 'אלופות', trophy: 'אלופת אירופה',
    pots: EU_POTS, matches: 8, perPot: 2,
    rounds: EU_ROUNDS,                      // the curated ones, with their stories
    blueFrom: 'po',                         // where the colour arrives
  },
  uel: {
    id: 'uel', name: 'הליגה האירופית', short: 'אירופית', trophy: 'אלופת הליגה האירופית',
    pots: EU_POTS_UEL, matches: 8, perPot: 2,
    qual: [
      { id: 'q1', round: 'מוקדמות 1', roundLong: 'סיבוב המוקדמות הראשון', band: [78, 82] },
      { id: 'q2', round: 'מוקדמות 2', roundLong: 'סיבוב המוקדמות השני',   band: [82, 85] },
      { id: 'q3', round: 'מוקדמות 3', roundLong: 'סיבוב המוקדמות השלישי', band: [84, 88] },
      { id: 'po', round: 'פלייאוף',   roundLong: 'שלב הפלייאוף',          band: [87, 91] },
    ],
    blueFrom: 'po',
  },
  uecl: {
    id: 'uecl', name: 'קונפרנס ליג', short: 'קונפרנס', trophy: 'אלופת הקונפרנס ליג',
    pots: EU_POTS_UECL, matches: 6, perPot: 1,
    qual: [
      { id: 'q2', round: 'מוקדמות 2', roundLong: 'סיבוב המוקדמות השני',   band: [70, 75] },
      { id: 'q3', round: 'מוקדמות 3', roundLong: 'סיבוב המוקדמות השלישי', band: [74, 79] },
      { id: 'po', round: 'פלייאוף',   roundLong: 'שלב הפלייאוף',          band: [78, 84] },
    ],
    blueFrom: 'po',
  },
};

// Where a beaten side lands. Losing ANY qualifying round drops you one
// competition, into the round AFTER the one you just lost — the real ladder:
//
//   CL q1 → EL q2 · CL q2 → EL q3 · CL q3 → EL play-off · CL play-off → EL league
//   EL q1 → ECL q2 · EL q2 → ECL q3 · EL q3 → ECL play-off · EL play-off → ECL league
//
// One rule covers all eight, because the rounds are the same four ids in calendar
// order everywhere; the Conference simply has no q1, which is why it is entered a
// round later in the first place. Nothing falls out of the Conference.
const EU_PARACHUTE = { ucl: 'uel', uel: 'uecl', uecl: null };
const EU_ROUND_SEQ = ['q1', 'q2', 'q3', 'po'];

/* ── who you actually meet in qualifying ──────────────────────────────────────
   The clubs that really play the qualifying rounds of the Europa League and the
   Conference — not the ones in their league phases. Drawing from the league-phase
   pots put Roma in a first qualifying round, which is not a thing that happens.

   Three candidates a round, one drawn per campaign, exactly as the Champions
   League does it. The ratings are ours and are never shown: a cup opponent is
   four line ratings and a name, and the name is the part that matters. */
const EU_QUAL_CLUBS = {
  uel: {
    q1: [
      { id: 'eu-differdange', name: 'דיפרדנז', country: 'לוקסמבורג', flag: '🇱🇺', ovr: 79 },
      { id: 'eu-hibernians',  name: 'היברניאנס', country: 'מלטה',    flag: '🇲🇹', ovr: 78 },
      { id: 'eu-vllaznia',    name: 'ולאזניה',  country: 'אלבניה',   flag: '🇦🇱', ovr: 81 },
    ],
    q2: [
      { id: 'eu-paks',      name: 'פאקש',        country: 'הונגריה',  flag: '🇭🇺', ovr: 84 },
      { id: 'eu-ordabasy',  name: 'אורדבאסי',    country: 'קזחסטן',   flag: '🇰🇿', ovr: 83 },
      { id: 'eu-sabah',     name: 'סבאח באקו',   country: "אזרבייג'ן", flag: '🇦🇿', ovr: 85 },
    ],
    q3: [
      { id: 'eu-zrinjski',  name: 'זרינסקי מוסטאר', country: 'בוסניה', flag: '🇧🇦', ovr: 87 },
      { id: 'eu-levski',    name: 'לבסקי סופיה',    country: 'בולגריה', flag: '🇧🇬', ovr: 88 },
      { id: 'eu-pyunik',    name: 'פיוניק ירוואן',  country: 'ארמניה',  flag: '🇦🇲', ovr: 86 },
    ],
    po: [
      { id: 'eu-hajduk',   name: 'היידוק ספליט', country: 'קרואטיה', flag: '🇭🇷', ovr: 90 },
      { id: 'eu-rijeka',   name: 'ריאקה',        country: 'קרואטיה', flag: '🇭🇷', ovr: 89 },
      { id: 'eu-besiktas',name: 'בשיקטאש',      country: 'טורקיה',  flag: '🇹🇷', ovr: 92 },
    ],
  },
  uecl: {
    q2: [
      { id: 'eu-hamrun',   name: 'המרון ספרטנס', country: 'מלטה',     flag: '🇲🇹', ovr: 76 },
      { id: 'eu-sligo',    name: 'סלייגו רוברס', country: 'אירלנד',   flag: '🇮🇪', ovr: 77 },
      { id: 'eu-ararat',   name: 'אררט ארמניה',  country: 'ארמניה',   flag: '🇦🇲', ovr: 78 },
    ],
    q3: [
      { id: 'eu-vaduz',    name: 'ואדוץ',        country: 'ליכטנשטיין', flag: '🇱🇮', ovr: 80 },
      { id: 'eu-zira',     name: 'זירה',         country: "אזרבייג'ן",  flag: '🇦🇿', ovr: 82 },
      { id: 'eu-neman',    name: 'נמאן גרודנו',  country: 'בלארוס',     flag: '🇧🇾', ovr: 80 },
    ],
    po: [
      { id: 'eu-wisla',    name: 'ויסלה קרקוב',  country: 'פולין',   flag: '🇵🇱', ovr: 85 },
      { id: 'eu-sheriff', name: 'שריף טירספול', country: 'מולדובה', flag: '🇲🇩', ovr: 86 },
      { id: 'eu-astana',  name: 'אסטנה',        country: 'קזחסטן',  flag: '🇰🇿', ovr: 84 },
    ],
  },
};
