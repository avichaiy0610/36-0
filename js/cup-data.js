// גביע המדינה — the clubs from below the top flight.
//
// The cup's Ligat ha'Al entrants are not here: those come from the real squads
// of the chosen season, through simTeamsForSeason, with their real ratings. What
// this file holds is everything BELOW them, where we have no squads at all and
// do not need any — a cup opponent is four line ratings and a name.
//
// Real clubs, in their own names, because "קבוצה מליגה א'" is not a cup story
// and beating one is not an upset. Note how many of the second tier are missing
// from this list: Bnei Yehuda, Hapoel Kfar Saba, Hapoel Ra'anana, MS Ashdod,
// Hapoel Rishon LeZion, Maccabi Herzliya, Hapoel Acre, Maccabi Petah Tikva,
// Hapoel Hadera, Bnei Reineh and Hapoel Nof HaGalil all live in TEAMS already,
// because every one of them has spent time in the top flight. The cup draws them
// from there whenever the era makes it plausible, and only reaches this file for
// the clubs the top flight has never seen.
//
// Ratings, against a good draft at 85-88:
//   ליגה לאומית  68-74   — a bad night from a top-flight side loses to these
//   ליגה א'      60-66   — losing to one of these is a scandal, and it happens

const CUP_LEUMIT = [
  { id: 'cup-kfar-kasem',  name: 'מ.ס. כפר קאסם',        ovr: 73 },
  { id: 'cup-kiryat-yam',  name: 'מ.ס. קריית ים',        ovr: 69 },
  { id: 'cup-modiin',      name: 'עירוני מודיעין',       ovr: 71 },
  { id: 'cup-afula',       name: 'הפועל עפולה',          ovr: 70 },
  { id: 'cup-kfar-shalem', name: 'הפועל כפר שלם',        ovr: 72 },
  { id: 'cup-yafo',        name: 'מכבי יפו',             ovr: 68 },
  { id: 'cup-ahi-nazareth',name: 'מכבי אחי נצרת',        ovr: 71 },
  { id: 'cup-kiryat-gat',  name: 'מכבי קריית גת',        ovr: 70 },
  { id: 'cup-umm-al-fahm', name: 'הפועל אום אל פאחם',    ovr: 69 },
  { id: 'cup-ramat-hasharon', name: 'הפועל ניר רמת השרון', ovr: 68 },
];

const CUP_ALEF = [
  { id: 'cup-karmiel',     name: 'הפועל עירוני כרמיאל',  ovr: 64 },
  { id: 'cup-tamra',       name: 'מ.כ. צעירי טמרה',      ovr: 63 },
  { id: 'cup-tirat-carmel',name: 'הפועל טירת הכרמל',     ovr: 62 },
  { id: 'cup-neve-shaanan',name: 'מכבי נווה שאנן',       ovr: 61 },
  { id: 'cup-nesher',      name: 'עירוני נשר',           ovr: 63 },
  { id: 'cup-tira',        name: 'מ.ס. טירה',            ovr: 64 },
  { id: 'cup-beit-shean',  name: 'הפועל בית שאן',        ovr: 62 },
  { id: 'cup-migdal-haemek', name: 'הפועל מגדל העמק',    ovr: 61 },
  { id: 'cup-mk-jerusalem',name: 'מ.כ. ירושלים',         ovr: 65 },
  { id: 'cup-dimona',      name: 'מ.ס. דימונה',          ovr: 62 },
  { id: 'cup-baka',        name: 'הפועל באקה אל גרבייה', ovr: 63 },
  { id: 'cup-arabe',       name: 'הפועל עיוני עראבה',    ovr: 60 },
  { id: 'cup-maalot',      name: 'הפועל מעלות תרשיחא',   ovr: 61 },
  { id: 'cup-yeruham',     name: 'הפועל ירוחם',          ovr: 60 },
  { id: 'cup-sderot',      name: 'הפועל שדרות',          ovr: 62 },
  { id: 'cup-ofakim',      name: 'מ.ס. אופקים',          ovr: 60 },
];

// The five rounds the top flight actually plays. The cup runs to twelve rounds
// in reality; Ligat ha'Al enters at round eight, into a field of 32, and every
// tie from there is a SINGLE match — no second leg, extra time and penalties if
// it is level.
const CUP_ROUNDS = [
  { id: 'r32', teams: 32, round: 'שלב ה-32',    roundLong: 'שלב ה-32 של גביע המדינה' },
  { id: 'r16', teams: 16, round: 'שמינית הגמר', roundLong: 'שמינית גמר גביע המדינה' },
  { id: 'qf',  teams: 8,  round: 'רבע הגמר',    roundLong: 'רבע גמר גביע המדינה' },
  { id: 'sf',  teams: 4,  round: 'חצי הגמר',    roundLong: 'חצי גמר גביע המדינה' },
  { id: 'f',   teams: 2,  round: 'הגמר',        roundLong: 'גמר גביע המדינה' },
];

// Where each round interrupts the season, as a share of the league fixtures.
// This is the real calendar: the round of 32 in autumn, the last 16 either side
// of the winter window, and the final after the league has finished — which it
// must be, because Europe needs the league position AND the cup winner in the
// same breath. The January window sits at 0.5, so two rounds land before the
// decision and three after it.
const CUP_AT = [0.20, 0.42, 0.64, 0.80, 1.00];
