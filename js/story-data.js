/* ── מצב סיפור: the chapters ──────────────────────────────────────────────────
 *
 * Data only: what a chapter IS, never how it plays. See
 * docs/superpowers/specs/2026-09-23-story-mode-design.md.
 *
 * `budget` is millions of ₪ and is SET BY scripts/sim/story_calibrate.js, never
 * by feel — the owner's one standing rule for this mode is that it has to be
 * hard, and a number chosen by eye is a number nobody measured.
 *
 * The real finish is deliberately NOT written here. It is read from
 * LEAGUE_TABLES (storyReal), so the "you vs. reality" line can never disagree
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
    teamId: 'hapoel-beersheba',
    season: '2015/16',
    title: '40 שנה אחרי',
    level: 'normal',
    budget: 8,
    intro: 'הפועל באר שבע לא זכתה באליפות מאז 1976. על הנייר זה הסגל הכי חזק בליגה, ' +
           'אבל מכבי תל אביב צמודה אליו והקופה כמעט ריקה. כל שקל שתוציא על חלוץ ' +
           'הוא שקל שלא יחזור.',
    stars: [
      { type: 'rank', max: 1, label: 'אליפות' },
      { type: 'beatPoints', label: 'יותר נקודות מהעונה האמיתית' },
      { type: 'profit', label: 'לסיים עם תקציב שלא ירד מהפתיחה' },
    ],
  },
];
