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
    hidden: true,       // favourites wait for the owner's call: 97% titles even with rivals shopping
    // With its real squad B7 won 85% of titles before a single transfer, so its
    // rivals shop too (rivalBudget, js/story-market.js storyRivalShop) — the
    // owner turned down an opening debt as unreal.
    teamId: 'hapoel-beersheba',
    season: '2015/16',
    title: '40 שנה אחרי',
    level: 'normal',
    budget: 2000,
    rivalBudget: 3000,
    intro: 'הפועל באר שבע לא זכתה באליפות מאז 1976. על הנייר זה הסגל הכי חזק בליגה, ' +
           'אבל מכבי תל אביב צמודה אליו, והיריבות קונות: מכבי ת"א, עירוני קריית שמונה ' +
           'ובית"ר ירושלים יחתימו אחרי שהחלון שלך ייסגר.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 5, label: 'אליפות בפער של 5 נקודות לפחות' },
      { type: 'maxBuys', n: 4, label: 'עם 4 רכישות לכל היותר בכל העונה' },
    ],
  },
  {
    id: 'ks-2011',
    teamId: 'ironi-ks',
    season: '2011/12',
    title: 'הנס מהצפון',
    level: 'hard',
    budget: 2500,
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
    level: 'normal',
    budget: 1500,
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
    budget: 550,
    // 1200 runs, 2026-09-23: ⭐ 20.8%  ⭐⭐ 3.8%  ⭐⭐⭐ 1.2%. Steep: 500 → 6.6%,
    // 600 → 26%, one affordable signing apart. A signings cap bound nobody (2) or
    // everybody (1), so ⭐⭐⭐ is a finish instead.
    intro: 'הפועל ירושלים סיימה את 1999/00 במקום האחרון, עם 24 נקודות ב-39 משחקים, וירדה ליגה. ' +
           'זה הסגל החלש בליגה, בפער. באותה עונה ירדו שלוש קבוצות, כי הליגה הצטמצמה ל-12. ' +
           'הפרק הכי קשה במצב הסיפור.',
    stars: [
      { type: 'survive', label: 'להישאר בליגה' },
      { type: 'rank', max: 9, label: 'לסיים במקום 9 או גבוה ממנו' },
      { type: 'rank', max: 8, label: 'לסיים במקום 8 או גבוה ממנו' },
    ],
  },
  // ── the favourites: their rivals use the market too ──────────────────────
  {
    id: 'haifa-2020',
    hidden: true,       // same as b7-2015
    teamId: 'maccabi-haifa',
    season: '2020/21',
    title: 'סוף העשור השחור',
    level: 'normal',
    budget: 3000,
    rivalBudget: 3000,
    intro: 'מכבי חיפה לא זכתה באליפות מאז 2010/11. ב-2020/21 היא סיימה ראשונה עם 79 נקודות, ' +
           '4 מעל מכבי תל אביב. על הנייר זה הסגל החזק בליגה, אבל הפעם גם היריבות קונות: ' +
           'מכבי ת"א, בית"ר ירושלים והפועל באר שבע יחתימו אחרי שהחלון שלך ייסגר.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 5, label: 'אליפות בפער של 5 נקודות לפחות' },
      { type: 'maxBuys', n: 4, label: 'עם 4 רכישות לכל היותר בכל העונה' },
    ],
  },
];
