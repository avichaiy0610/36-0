/* ── מצב סיפור: the chapters ──────────────────────────────────────────────────
 *
 * Data only: what a chapter IS, never how it plays. See
 * docs/superpowers/specs/2026-09-23-story-mode-design.md.
 *
 * `budget` is millions of ₪ and is SET BY scripts/sim/story_calibrate.js, never
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
  sellRate: 0.8,          // a sale fetches 80% of value — the friction that stops churn
  rivalMarkup: 1.5,       // a club that finished above you will not strengthen you cheaply
  repPremium: 1.25,       // last season's top scorers / assisters, summer only
  buys: { summer: 4, jan: 2 },
  minSquad: 16,
};

// ₪M by rating. A step curve, like the salary cap's (js/salary.js), because a
// price is something the player has to hold in their head while deciding.
const STORY_VALUE_TIERS = [
  { min: 88, v: 14 },
  { min: 86, v: 10 },
  { min: 84, v: 7 },
  { min: 82, v: 4.5 },
  { min: 80, v: 2.5 },
  { min: 78, v: 1.2 },
  { min: 0,  v: 0.5 },
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
    budget: 8,
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
    budget: 22,
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
    // Measured 2026-09-23, 4000 runs at budget 22 (story_calibrate.js):
    //   ⭐ 21.7%   ⭐⭐ 6.2%   ⭐⭐⭐ 4.2%   — inside the 'hard' bands of spec §7.
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'margin', min: 5, label: 'אליפות בפער של 5 נקודות לפחות' },
      { type: 'maxBuys', n: 4, label: 'עם 4 רכישות לכל היותר בכל העונה' },
    ],
  },
];
