/* ── מצב סיפור: the chapters ──────────────────────────────────────────────────
 *
 * Data only: what a chapter IS, never how it plays. See
 * docs/superpowers/specs/2026-09-23-story-mode-design.md.
 *
 * Money is in THOUSANDS of ₪ throughout (2500 = 2.5 מיליון). `budget` is SET BY scripts/sim/story_calibrate.js, never
 * by feel — the owner's one standing rule for this mode is that it has to be
 * hard, and a number chosen by eye is a number nobody measured.
 *
 * Stars are GRADED: ⭐⭐ counts only with ⭐, and ⭐⭐⭐ only with ⭐⭐.
 *
 * The real finish is deliberately NOT written here. It is read from the tables
 * (storyReal, via js/story-facts.js — regenerate it after adding a chapter), so the "you vs. reality" line can never disagree
 * with the table the rest of the site shows.
 */
const STORY_RULES = {
  sellRate: 0.85,         // the centre of what clubs bid for your players
  rivalMarkup: 1.25,      // a club that finished above you will not strengthen you cheaply
  keyMarkup: 1.15,        // one of the selling club's own three best
  repPremium: 1.15,       // last season's top scorers / assisters, summer only
  // No asking price above this, whatever stacks. The markups used to multiply:
  // a rival's best player with a reputation was asked at 6.1 million, against
  // the owner's ceiling of "about 2.5 million for the dearest player".
  maxAsk: 3000,
  bidRounds: 3,           // times you can name a price to a bidder before he walks
  buys: { summer: 4, jan: 2 },
  talkRounds: 3,          // offers per player per window before the club stops answering
  minSquad: 16,
};

// Rivalries: a player from the other side costs more, a club symbol of theirs
// will not come at all, and even an ordinary one may say no. City derbies plus
// the great inter-city rivalries. Pairs, order does not matter — edit freely.
const STORY_RIVALRIES = [
  ['maccabi-tlv', 'hapoel-tlv'],          // the Tel Aviv derby
  ['maccabi-haifa', 'hapoel-haifa'],      // the Haifa derby
  ['beitar-jerusalem', 'hapoel-jerusalem'],
  ['maccabi-pt', 'hapoel-pt'],            // Petah Tikva
  ['maccabi-tlv', 'maccabi-haifa'],
  ['maccabi-tlv', 'beitar-jerusalem'],
  ['hapoel-tlv', 'beitar-jerusalem'],
  ['hapoel-beersheba', 'maccabi-haifa'],
];
const STORY_RIVAL_RULES = {
  markup: 1.4,          // on top of everything else
  cap: 3500,            // a rival's man may pass the usual ceiling
  refuse: 0.3,          // chance an ordinary player will not cross over
  symbolSeasons: 5,     // seasons at the club, by our squads, that make a symbol
  symbolMarkup: 1.2,    // a symbol of a club that is NOT your rival: loyalty costs
};

// Thousands of ₪ by rating. Israeli football's own scale: the league's transfer
// record between two Israeli clubs is about €2M, and only ~40 deals in its whole
// history reached €1M (checked 2026-09-23 — ice.co.il, walla, Transfermarkt via
// asoccer). The owner set the ceiling: the dearest player in the league costs
// about 2.5 million. A step curve, like the salary cap's, so a price is a thing
// you can hold in your head.
const STORY_VALUE_TIERS = [
  { min: 88, v: 2500 },
  { min: 86, v: 1600 },
  { min: 84, v: 1000 },
  { min: 82, v: 600 },
  { min: 80, v: 350 },
  { min: 78, v: 180 },
  { min: 0,  v: 80 },
];

const STORY_CHAPTERS = [
  {
    id: 'b7-2015',
    // With its real squad B7 won 85% of titles before a single transfer, so its
    // rivals shop too (rivalBudget, js/story-market.js storyRivalShop) — the
    // owner turned down an opening debt as unreal.
    teamId: 'hapoel-beersheba',
    season: '2015/16',
    title: '40 שנה אחרי',
    level: 'easy',
    budget: 2000,
    rivalBudget: 3000,
    // One of the two easy chapters, on the owner's word ("שיהיו שניים קלים יחסית").
    // 800 runs at 2,000, 2026-09-23: title 97%; margin p50 10; points p75 99.
    intro: 'הפועל באר שבע לא זכתה באליפות מאז 1976. על הנייר זה הסגל הכי חזק בליגה, ' +
           'אבל מכבי תל אביב צמודה אליו, והיריבות קונות: מכבי ת"א, עירוני קריית שמונה ' +
           'ובית"ר ירושלים יחתימו אחרי שהחלון שלך ייסגר.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 10, label: 'אליפות בפער של 10 נקודות לפחות' },
      { type: 'points', min: 100, label: '100 נקודות' },
    ],
  },
  {
    id: 'ks-2011',
    teamId: 'ironi-ks',
    season: '2011/12',
    title: 'הנס מהצפון',
    level: 'hardest',
    budget: 3500,
    // After squad depth (substitutes + injuries, 2026-09-23) re-measured, 400-600 runs:
    //   3,500 → ⭐ 10.3%  ⭐⭐ 3.5%  ⭐⭐⭐ 2.3%. 20% would take 6 million — not this club.
    intro: 'עירוני קריית שמונה, מועדון מהקצה הצפוני של המדינה, עם הסגל הרביעי בכוחו בליגה. ' +
           'הפועל תל אביב, מכבי תל אביב ומכבי חיפה חזקות ממנה על הנייר, והקופה קטנה. ' +
           'במציאות היא זכתה באליפות הראשונה והיחידה בתולדותיה, בפער של 14 נקודות.',
    // ⭐⭐ and ⭐⭐⭐ chosen from measured title runs (story_calibrate --detail):
    // in the sim any KS title already beats the real 73 points, so "more points
    // than reality" separated nobody; the margin does. ⭐⭐⭐ is the miracle done
    // lean: no more than the summer's four signings, nothing in January. "Not from
    // the big four" was tried first and bound nobody (the rival markup already
    // sends the market elsewhere); a cap of 2 or 3 measured under the 2% floor.
    //
    // Measured 2026-09-23 on the Israeli price scale with the 3-million ask ceiling,
    // 1500 runs at 4,000 (story_calibrate.js; bot pays asking prices, sells by best bid):
    //   ⭐ 18.9%   ⭐⭐ 5.8%   ⭐⭐⭐ 2.7%
    // ⭐⭐ and ⭐⭐⭐ sit in the 'hard' bands of spec §7; ⭐ is a point under 20%.
    // It plateaus here: 4,000, 4,500 and 5,000 measure the same, because the
    // limit is now the six signings and who will sell, not the money.
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 5, label: 'אליפות בפער של 5 נקודות לפחות' },
      { type: 'maxBuys', n: 4, label: 'עם 4 רכישות לכל היותר בכל העונה' },
    ],
  },
  // ── the underdogs ─────────────────────────────────────────────────────────
  // Intros say only what our own tables say (finish, points, where the squad
  // ranked on paper); budgets are what a club that size could plausibly spend,
  // and the stars are chosen from measured runs (story_calibrate --detail).
  {
    id: 'netanya-2007',
    teamId: 'maccabi-netanya',
    season: '2007/08',
    title: 'הסוס השחור',
    level: 'hard',
    budget: 1500,
    // After squad depth (substitutes + injuries, 2026-09-23) re-measured, 400-600 runs:
    //   ⭐ 20.8%  ⭐⭐ 4.0%  ⭐⭐⭐ 2.5%, flat from 1,500 to 3,500.
    // 400 runs, 2026-09-23: ⭐ 40.3%  ⭐⭐ 9.5%  ⭐⭐⭐ 6.3% — flat from 1,000 up:
    // selling the bench pays for the signings, so money is not the limit here.
    intro: 'מכבי נתניה סיימה את 2007/08 במקום השני, עם הסגל הרביעי בכוחו בליגה של 12 קבוצות. ' +
           'בית"ר ירושלים, עם הסגל החזק ביותר, זכתה באליפות. להגיע לצמרת זה המינימום, ' +
           'והמציאות רף גבוה.',
    stars: [
      { type: 'rank', max: 3, label: 'לסיים בשלישייה הראשונה' },
      { type: 'rank', max: 2, label: 'מקום שני, כמו במציאות, או טוב ממנו' },
      { type: 'maxBuys', n: 4, label: 'עם 4 רכישות לכל היותר בכל העונה' },
    ],
  },
  {
    id: 'netanya-2015',
    teamId: 'maccabi-netanya',
    season: '2015/16',
    title: '12 נקודות',
    level: 'hard',
    budget: 1000,
    // Survival was the historical goal and it is no goal at all: the squad sat
    // just under the line (37% without a single move) and two signings clear it
    // 98% of the time. The 12 points were a collapse, not the squad's ceiling —
    // so the chapter asks for the opposite end of the table. Fewer signings and
    // a bigger squad floor, because a 32-man squad sold down to 16 funded
    // anything (measured 2026-09-23, story_calibrate --detail).
    rules: { buys: { summer: 2, jan: 1 }, minSquad: 24 },
    // 500 runs at 1,000: ⭐ 26.0%  ⭐⭐ 7.4%  ⭐⭐⭐ 6.0% ('hard'; ⭐⭐⭐ a point over).
    intro: 'מכבי נתניה סיימה את 2015/16 במקום האחרון, עם 12 נקודות בלבד, וירדה ליגה. ' +
           'על הנייר הסגל שלה לא היה הגרוע בליגה: שתי קבוצות היו חלשות ממנו. ' +
           'להישאר בליגה זה לא מספיק. המטרה: מתחתית הטבלה לחצי העליון שלה.',
    stars: [
      { type: 'rank', max: 7, label: 'לסיים בחצי העליון של הטבלה' },
      { type: 'rank', max: 6, label: 'להגיע לפלייאוף העליון' },
      { type: 'maxBuys', n: 2, label: 'עם 2 רכישות לכל היותר בכל העונה' },
    ],
  },
  {
    id: 'hj-1999',
    teamId: 'hapoel-jerusalem',
    season: '1999/00',
    title: 'להישאר בחיים',
    level: 'hardest',
    budget: 1200,
    // After squad depth (substitutes + injuries, 2026-09-23) re-measured, 400-600 runs:
    //   550 → 0.5%, 1,000 → 13%, 1,500 → 34%: a thin bench sinks this squad fastest.
    //   1,200 (800 runs): ⭐ 14.9%  ⭐⭐ 5.8%  ⭐⭐⭐ 2.0%, with ⭐⭐/⭐⭐⭐ at 10th and 9th.
    // 1200 runs, 2026-09-23: ⭐ 20.8%  ⭐⭐ 3.8%  ⭐⭐⭐ 1.2%. Steep: 500 → 6.6%,
    // 600 → 26%, one affordable signing apart. A signings cap bound nobody (2) or
    // everybody (1), so ⭐⭐⭐ is a finish instead.
    intro: 'הפועל ירושלים סיימה את 1999/00 במקום האחרון, עם 24 נקודות ב-39 משחקים, וירדה ליגה. ' +
           'זה הסגל החלש בליגה, בפער. באותה עונה ירדו שלוש קבוצות, כי הליגה הצטמצמה ל-12. ' +
           'הפרק הכי קשה במצב הסיפור.',
    stars: [
      { type: 'survive', label: 'להישאר בליגה' },
      { type: 'rank', max: 10, label: 'לסיים במקום 10 או גבוה ממנו' },
      { type: 'rank', max: 9, label: 'לסיים במקום 9 או גבוה ממנו' },
    ],
  },
  // ── the favourites: their rivals use the market too ──────────────────────
  {
    id: 'haifa-2020',
    teamId: 'maccabi-haifa',
    season: '2020/21',
    title: 'סוף העשור השחור',
    level: 'easy',
    budget: 3000,
    rivalBudget: 3000,
    // The other easy chapter. 800 runs at 2,000: title 96%; margin p50 11; points p90 101.
    intro: 'מכבי חיפה לא זכתה באליפות מאז 2010/11. ב-2020/21 היא סיימה ראשונה עם 79 נקודות, ' +
           '4 מעל מכבי תל אביב. על הנייר זה הסגל החזק בליגה, אבל הפעם גם היריבות קונות: ' +
           'מכבי ת"א, בית"ר ירושלים והפועל באר שבע יחתימו אחרי שהחלון שלך ייסגר.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 10, label: 'אליפות בפער של 10 נקודות לפחות' },
      { type: 'points', min: 100, label: '100 נקודות' },
    ],
  },
  // ── Europe ────────────────────────────────────────────────────────────────
  // The real campaigns, every opponent and score checked 2026-09-23 against
  // en.wikipedia ("Hapoel Tel Aviv F.C. in European football", "Maccabi Haifa
  // F.C. in European football", "2002 UEFA Cup final") and he.wikipedia (the two
  // clubs' pages). The order of legs is not claimed — `real` says home and away.
  // Ratings sit on js/europe-data.js's scale, where 99 is Europe's elite.
  {
    id: 'hta-2001',
    kind: 'europe',
    teamId: 'hapoel-tlv',
    season: '2001/02',
    comp: 'גביע אופ"א',
    title: 'הלילות של בלומפילד',
    level: 'hardest',
    budget: 1500,
    // 400 runs, 2026-09-23: ⭐ 13-16%  ⭐⭐ 5.5-8.5%  ⭐⭐⭐ 3-4.5%. Five ties to the
    // quarter-final, three of them near coin flips even with the European night —
    // the real run was that rare. Money barely moves it: 1,000 to 4,000 are within noise.
    intro: 'גביע אופ"א 2001/02. הפועל תל אביב הדיחה את צ\'לסי, את לוקומוטיב מוסקבה ואת פארמה, ' +
           'ונעצרה רק ברבע הגמר מול מילאן. הפעם אפשר להמשיך: אחרי מילאן מחכה דורטמונד, ' +
           'והגמר נערך באצטדיון של פיינורד ברוטרדם.',
    europe: {
      awayGoals: true,
      window: 'r4',                    // the winter break, before the last 16
      realOut: 'qf',
      realText: 'הודחה ברבע הגמר',
      rounds: [
        { id: 'q',   label: 'הסיבוב המוקדם', kind: 'tie', firstHome: true,
          club: { name: 'אררט ירוואן', flag: '🇦🇲', ovr: 74 }, real: 'בבית 3-0, בחוץ 2-0' },
        { id: 'r1',  label: 'הסיבוב הראשון', kind: 'tie', ko: true, firstHome: false,
          club: { name: 'גזיאנטפספור', flag: '🇹🇷', ovr: 81 }, real: 'בבית 1-0, בחוץ 1-1' },
        { id: 'r2',  label: 'הסיבוב השני', kind: 'tie', ko: true, firstHome: true,
          club: { name: 'צ\'לסי', crest: 'eu-chelsea', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ovr: 93 }, real: 'בבית 2-0, בחוץ 1-1' },
        { id: 'r3',  label: 'הסיבוב השלישי', kind: 'tie', ko: true, firstHome: false,
          club: { name: 'לוקומוטיב מוסקבה', flag: '🇷🇺', ovr: 89 }, real: 'בבית 2-1, בחוץ 1-0' },
        { id: 'r4',  label: 'שמינית הגמר', kind: 'tie', ko: true, firstHome: true,
          club: { name: 'פארמה', flag: '🇮🇹', ovr: 91 }, real: 'בבית 0-0, בחוץ 2-1' },
        { id: 'qf',  label: 'רבע הגמר', kind: 'tie', ko: true, firstHome: true,
          club: { name: 'מילאן', crest: 'eu-milan', flag: '🇮🇹', ovr: 96 }, real: 'בבית 1-0, בחוץ 0-2. ההדחה.' },
        { id: 'sf',  label: 'חצי הגמר', kind: 'tie', ko: true, firstHome: false,
          club: { name: 'בורוסיה דורטמונד', crest: 'eu-dortmund', flag: '🇩🇪', ovr: 94 }, real: 'במציאות דורטמונד הדיחה את מילאן' },
        { id: 'final', label: 'הגמר', kind: 'tie', ko: true, oneLeg: true, home: false,
          club: { name: 'פיינורד', crest: 'eu-feyenoord', flag: '🇳🇱', ovr: 90 }, real: 'במציאות פיינורד ניצחה את דורטמונד 3-2, בבית שלה' },
      ],
    },
    stars: [
      { type: 'euReach', round: 'qf', label: 'להגיע לרבע הגמר' },
      { type: 'euReach', round: 'sf', label: 'להגיע לחצי הגמר' },
      { type: 'euReach', round: 'final', label: 'להגיע לגמר' },
    ],
  },
  {
    id: 'haifa-2002',
    kind: 'europe',
    teamId: 'maccabi-haifa',
    season: '2002/03',
    comp: 'ליגת האלופות',
    title: 'הערב שבו מנצ\'סטר נפלה',
    level: 'hard',
    budget: 2000,
    // 800-1200 runs, 2026-09-23: ⭐ 33.0%  ⭐⭐ 4.8%  ⭐⭐⭐ 2.8%. No European night in a group.
    intro: 'ליגת האלופות 2002/03: הקבוצה הישראלית הראשונה בשלב הבתים. מכבי חיפה ניצחה ' +
           'את מנצ\'סטר יונייטד ואת אולימפיאקוס 0:3, וסיימה שלישית בבית עם לברקוזן. ' +
           'שלישית זה מה שהיה. שתיים הראשונות עולות.',
    europe: {
      awayGoals: true,
      window: 'group',                 // the deadline between the qualifiers and the group
      realOut: 'group',
      realText: 'סיימה שלישית בבית, 7 נקודות',
      rounds: [
        { id: 'q2', label: 'סיבוב המוקדמות השני', kind: 'tie', firstHome: true,
          club: { name: 'בלשינה בוברויסק', flag: '🇧🇾', ovr: 72 }, real: 'בבית 4-0, בחוץ 1-0' },
        { id: 'q3', label: 'סיבוב המוקדמות השלישי', kind: 'tie', firstHome: true,
          club: { name: 'שטורם גראץ', crest: 'eu-sturm', flag: '🇦🇹', ovr: 84 }, real: 'בבית 2-0, בחוץ 3-3' },
        { id: 'group', label: 'שלב הבתים', kind: 'group', advance: 2,
          clubs: [{ name: 'מנצ\'סטר יונייטד', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ovr: 97 },
                  { name: 'אולימפיאקוס', crest: 'eu-olympiacos', flag: '🇬🇷', ovr: 89 },
                  { name: 'באייר לברקוזן', crest: 'eu-leverkusen', flag: '🇩🇪', ovr: 94 }],
          fixtures: [[0, false], [1, true], [2, true], [2, false], [0, true], [1, false]],
          real: 'מנצ\'סטר: 2-5 בחוץ, 3-0 בבית · אולימפיאקוס: 3-0 בבית, 3-3 בחוץ · לברקוזן: 0-2 בבית, 1-2 בחוץ' },
      ],
    },
    stars: [
      { type: 'euGroupPos', max: 3, label: 'לסיים שלישית בבית, כמו במציאות' },
      { type: 'euGroupPos', max: 2, label: 'לעלות מהבית' },
      { type: 'euGroupPoints', min: 9, label: 'לעלות מהבית עם 9 נקודות ומעלה' },
    ],
  },
  {
    id: 'haifa-2009',
    kind: 'europe',
    teamId: 'maccabi-haifa',
    season: '2009/10',
    comp: 'ליגת האלופות',
    title: 'אפס ואפס',
    level: 'hardest',
    budget: 2500,
    // After squad depth (substitutes + injuries, 2026-09-23) re-measured, 400-600 runs:
    //   ⭐ 14%; 20% only at 6 million. ⭐⭐/⭐⭐⭐ lowered to 4 and 5 points:
    //   800 runs → ⭐ 12.5%  ⭐⭐ 6.4%  ⭐⭐⭐ 1.8%.
    // 1200 runs, 2026-09-23: ⭐ 23.9%  ⭐⭐ 7.3%  ⭐⭐⭐ 2.1%. "Score a goal" (48%) and "a point"
    // (42%) were measured first and were far too easy: the real zero was a freak.
    intro: 'ליגת האלופות 2009/10. מכבי חיפה עברה את גלנטורן, את אקטובה ואת זלצבורג, ' +
           'ובבית עם באיירן מינכן, יובנטוס ובורדו הפסידה בכל ששת המשחקים: ' +
           'אפס נקודות, אפס שערים. הפעם צריך יותר מנקודה של כבוד.',
    europe: {
      awayGoals: true,
      window: 'group',
      realOut: 'group',
      realText: '0 נקודות ו-0 שערים בשלב הבתים',
      rounds: [
        { id: 'q2', label: 'סיבוב המוקדמות השני', kind: 'tie', firstHome: true,
          club: { name: 'גלנטורן', flag: '🇬🇧', ovr: 70 }, real: 'בבית 6-0, בחוץ 4-0' },
        { id: 'q3', label: 'סיבוב המוקדמות השלישי', kind: 'tie', firstHome: false,
          club: { name: 'אקטובה', flag: '🇰🇿', ovr: 78 }, real: 'בחוץ 0-0, בבית 4-3' },
        { id: 'po', label: 'סיבוב הפלייאוף', kind: 'tie', firstHome: false,
          club: { name: 'רד בול זלצבורג', crest: 'eu-salzburg', flag: '🇦🇹', ovr: 86 }, real: 'בחוץ 2-1, בבית 3-0' },
        { id: 'group', label: 'שלב הבתים', kind: 'group', advance: 2,
          clubs: [{ name: 'באיירן מינכן', crest: 'eu-bayern', flag: '🇩🇪', ovr: 97 },
                  { name: 'יובנטוס', crest: 'eu-juventus', flag: '🇮🇹', ovr: 95 },
                  { name: 'בורדו', flag: '🇫🇷', ovr: 93 }],
          fixtures: [[0, true], [2, false], [1, false], [1, true], [0, false], [2, true]],
          real: 'באיירן: 0-3 בבית, 0-1 בחוץ · יובנטוס: 0-1 בחוץ, 0-1 בבית · בורדו: 0-1 בחוץ, 0-1 בבית' },
      ],
    },
    stars: [
      { type: 'euGroupPoints', min: 3, label: 'לנצח משחק בבית' },
      { type: 'euGroupPoints', min: 4, label: '4 נקודות בבית' },
      { type: 'euGroupPoints', min: 5, label: '5 נקודות בבית' },
    ],
  },
  // ── Maccabi Tel Aviv (the owner: "הגזמנו קצת עם מכבי חיפה") ────────────────
  {
    id: 'mta-2002',
    teamId: 'maccabi-tlv',
    season: '2002/03',
    title: 'על חוט השערה',
    level: 'hard',
    budget: 1000,
    // After squad depth (substitutes + injuries, 2026-09-23) re-measured, 400-600 runs:
    //   1,000 with 2+1 signings → ⭐ 22.8%  ⭐⭐ 3.8%  ⭐⭐⭐ 1.5%.
    // Measured 2026-09-23: with no market at all it is 24%; three signings took it
    // to 54%, one per window to 42% — the XI (84) is four points off Haifa (88),
    // so one good signing closes half the gap. Hence 'normal', one signing a
    // window, and the top star is winning it with the squad as it was.
    rules: { buys: { summer: 2, jan: 1 }, minSquad: 24 },
    // 800 runs at 500: ⭐ 41.9%  ⭐⭐ 12.3%  ⭐⭐⭐ 5.3%.
    intro: 'מכבי תל אביב זכתה באליפות 2002/03 בשוויון נקודות עם מכבי חיפה, 69 כל אחת, ' +
           'והפועל תל אביב שתי נקודות מאחור. על הנייר זה היה רק הסגל השלישי בליגה, ' +
           'אחרי חיפה והפועל. ניר קלינגר, בעונתו הראשונה כמאמן ראשי.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 5, label: 'אליפות בפער של 5 נקודות לפחות' },
      { type: 'maxBuys', n: 0, label: 'בלי אף רכישה: עם הסגל של אז' },
    ],
  },
  {
    id: 'mta-2004',
    kind: 'europe',
    teamId: 'maccabi-tlv',
    season: '2004/05',
    comp: 'ליגת האלופות',
    title: 'הלילה מול אייאקס',
    level: 'hard',
    budget: 2000,
    // 1000 runs, 2026-09-23: ⭐ 26.6%  ⭐⭐ 3.4%  ⭐⭐⭐ 1.9% ('hard', leaning harder). The real
    // 4 points came out at 1% — the 2004/05 squad finished 8th at home — so the real
    // tally is ⭐⭐, not ⭐.
    intro: 'ליגת האלופות 2004/05. מכבי תל אביב עברה את HJK הלסינקי ואת פאוק, ' +
           'ובבית עם יובנטוס, באיירן מינכן ואייאקס ניצחה את אייאקס 2-1 והוציאה 1-1 מיובנטוס. ' +
           '4 נקודות ומקום רביעי. מקום שלישי היה שולח אותה לגביע אופ"א.',
    europe: {
      awayGoals: true,
      window: 'group',
      realOut: 'group',
      realText: 'סיימה רביעית בבית, 4 נקודות',
      rounds: [
        { id: 'q2', label: 'סיבוב המוקדמות השני', kind: 'tie', firstHome: true,
          club: { name: 'HJK הלסינקי', crest: 'eu-hjk', flag: '🇫🇮', ovr: 74 }, real: 'בבית 1-0, בחוץ 0-0' },
        { id: 'q3', label: 'סיבוב המוקדמות השלישי', kind: 'tie', firstHome: true,
          club: { name: 'פאוק', crest: 'eu-paok', flag: '🇬🇷', ovr: 84 }, real: 'בבית 1-0, בחוץ 3-0' },
        { id: 'group', label: 'שלב הבתים', kind: 'group', advance: 2,
          clubs: [{ name: 'יובנטוס', crest: 'eu-juventus', flag: '🇮🇹', ovr: 97 },
                  { name: 'באיירן מינכן', crest: 'eu-bayern', flag: '🇩🇪', ovr: 96 },
                  { name: 'אייאקס', crest: 'eu-ajax', flag: '🇳🇱', ovr: 88 }],
          fixtures: [[2, true], [0, false], [1, true], [1, false], [2, false], [0, true]],
          real: 'יובנטוס: 1-1 בבית, 0-1 בחוץ · באיירן: 0-1 בבית, 1-5 בחוץ · אייאקס: 2-1 בבית, 0-3 בחוץ' },
      ],
    },
    stars: [
      { type: 'euGroupPoints', min: 1, label: 'לגרוף נקודה בבית' },
      { type: 'euGroupPoints', min: 4, label: '4 נקודות, כמו במציאות' },
      { type: 'euGroupPos', max: 3, label: 'מקום שלישי: כרטיס לגביע אופ"א' },
    ],
  },
];
