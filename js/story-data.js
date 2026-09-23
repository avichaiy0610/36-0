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
  rivalMarkup: 1.5,       // a club that finished above you will not strengthen you cheaply
  keyMarkup: 1.3,         // one of the selling club's own three best
  repPremium: 1.25,       // last season's top scorers / assisters, summer only
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
    // Hidden until phase 3: with its real squad this is an 85% title before a
    // single transfer (measured 2026-09-23), so the market can only make it
    // easier. The owner rejected an opening debt as unreal; the planned answer is
    // rivals who use the market too. Kept here because the tests exercise it.
    hidden: true,
    teamId: 'hapoel-beersheba',
    season: '2015/16',
    title: '40 שנה אחרי',
    level: 'normal',
    budget: 800,
    intro: 'הפועל באר שבע לא זכתה באליפות מאז 1976. על הנייר זה הסגל הכי חזק בליגה, ' +
           'אבל מכבי תל אביב צמודה אליו והקופה כמעט ריקה.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'beatPoints', label: 'יותר נקודות מהעונה האמיתית' },
      { type: 'keepCore', label: 'בלי למכור אף שחקן מההרכב הפותח האמיתי' },
    ],
  },
  {
    id: 'ks-2011',
    teamId: 'ironi-ks',
    season: '2011/12',
    title: 'הנס מהצפון',
    level: 'hard',
    budget: 3500,
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
    // Measured 2026-09-23 on the Israeli price scale, 2000 runs at 3,500 (story_calibrate.js,
    // bot pays asking prices and sells by best bid):
    //   ⭐ 21.4%   ⭐⭐ 6.8%   ⭐⭐⭐ 4.7%   — inside the 'hard' bands of spec §7.
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 5, label: 'אליפות בפער של 5 נקודות לפחות' },
      { type: 'maxBuys', n: 4, label: 'עם 4 רכישות לכל היותר בכל העונה' },
    ],
  },
];
