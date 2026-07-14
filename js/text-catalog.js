// Catalog of every editable UI text: where it lives and its default value.
// selector "virtual" = dynamic text looked up by code (siteText), not DOM.
const TEXT_CATALOG = [
 {
  "key": "nav-logo",
  "screen": "ניווט עליון",
  "label": "לוגו בפינה",
  "selector": ".nav-logo",
  "def": "36–0"
 },
 {
  "key": "nav-leaderboard",
  "screen": "ניווט עליון",
  "label": "כפתור לוח שיאים",
  "selector": "#nav-leaderboard",
  "def": "לוח שיאים"
 },
 {
  "key": "nav-achievements",
  "screen": "ניווט עליון",
  "label": "כפתור הישגים",
  "selector": "#nav-achievements",
  "def": "הישגים"
 },
 {
  "key": "nav-login",
  "screen": "ניווט עליון",
  "label": "כפתור התחבר",
  "selector": "#nav-login",
  "def": "התחבר"
 },
 {
  "key": "nav-logout",
  "screen": "ניווט עליון",
  "label": "כפתור יציאה",
  "selector": "#nav-logout",
  "def": "יציאה"
 },
 {
  "key": "auth-title",
  "screen": "חלון התחברות",
  "label": "כותרת החלון",
  "selector": "[data-txt=\"auth-title\"]",
  "def": "כניסה / הרשמה"
 },
 {
  "key": "auth-tab-login",
  "screen": "חלון התחברות",
  "label": "טאב כניסה",
  "selector": ".auth-tab[data-tab=\"login\"]",
  "def": "כניסה"
 },
 {
  "key": "auth-tab-register",
  "screen": "חלון התחברות",
  "label": "טאב הרשמה",
  "selector": ".auth-tab[data-tab=\"register\"]",
  "def": "הרשמה"
 },
 {
  "key": "auth-divider",
  "screen": "חלון התחברות",
  "label": "מפריד \"או\"",
  "selector": ".auth-divider",
  "def": "או"
 },
 {
  "key": "auth-submit-login",
  "screen": "חלון התחברות",
  "label": "כפתור כניסה",
  "selector": "#auth-submit-login",
  "def": "כניסה"
 },
 {
  "key": "auth-submit-register",
  "screen": "חלון התחברות",
  "label": "כפתור הרשמה",
  "selector": "#auth-submit-register",
  "def": "הרשמה"
 },
 {
  "key": "username-title",
  "screen": "חלון התחברות",
  "label": "כותרת בחירת שם",
  "selector": "[data-txt=\"username-title\"]",
  "def": "בחר שם משתמש"
 },
 {
  "key": "username-sub",
  "screen": "חלון התחברות",
  "label": "הסבר בחירת שם",
  "selector": "[data-txt=\"username-sub\"]",
  "def": "השם יוצג ב-Leaderboard"
 },
 {
  "key": "username-submit",
  "screen": "חלון התחברות",
  "label": "כפתור שמור שם",
  "selector": "#username-submit",
  "def": "שמור"
 },
 {
  "key": "welcome-logo-sub",
  "screen": "מסך פתיחה",
  "label": "כיתוב מתחת ללוגו",
  "selector": ".logo-sub",
  "def": "ליגת העל הישראלית"
 },
 {
  "key": "welcome-tagline",
  "screen": "מסך פתיחה",
  "label": "משפט ראשי",
  "selector": ".welcome-tagline",
  "def": "בנה את הרכב החלומות בליגת העל בכל הזמנים"
 },
 {
  "key": "welcome-sub",
  "screen": "מסך פתיחה",
  "label": "משפט משני",
  "selector": ".welcome-sub",
  "def": "בכל סיבוב מוגרלת קבוצה מכל הדורות — בחר שחקן לכל עמדה.\n11 שחקנים, 36 משחקים — האם תצליח 36–0?"
 },
 {
  "key": "btn-start",
  "screen": "מסך פתיחה",
  "label": "כפתור שחק עכשיו",
  "selector": "#btn-start",
  "def": "שחק עכשיו ⚽"
 },
 {
  "key": "setup-subtitle",
  "screen": "מסך הגדרות",
  "label": "כיתוב מתחת ללוגו",
  "selector": ".setup-subtitle",
  "def": "ליגת העל הישראלית"
 },
 {
  "key": "lbl-formation",
  "screen": "מסך הגדרות",
  "label": "כותרת: מערך",
  "selector": "[data-txt=\"lbl-formation\"]",
  "def": "מערך"
 },
 {
  "key": "lbl-difficulty",
  "screen": "מסך הגדרות",
  "label": "כותרת: קושי",
  "selector": "[data-txt=\"lbl-difficulty\"]",
  "def": "קושי"
 },
 {
  "key": "diff-easy",
  "screen": "מסך הגדרות",
  "label": "קושי קל — שם",
  "selector": "[data-txt=\"diff-easy\"]",
  "def": "קל"
 },
 {
  "key": "diff-easy-sub",
  "screen": "מסך הגדרות",
  "label": "קושי קל — תיאור",
  "selector": "[data-txt=\"diff-easy-sub\"]",
  "def": "3 החלפות זמינות"
 },
 {
  "key": "diff-normal",
  "screen": "מסך הגדרות",
  "label": "קושי רגיל — שם",
  "selector": "[data-txt=\"diff-normal\"]",
  "def": "רגיל"
 },
 {
  "key": "diff-normal-sub",
  "screen": "מסך הגדרות",
  "label": "קושי רגיל — תיאור",
  "selector": "[data-txt=\"diff-normal-sub\"]",
  "def": "החלפה אחת זמינה"
 },
 {
  "key": "diff-hard",
  "screen": "מסך הגדרות",
  "label": "קושי קשה — שם",
  "selector": "[data-txt=\"diff-hard\"]",
  "def": "קשה"
 },
 {
  "key": "diff-hard-sub",
  "screen": "מסך הגדרות",
  "label": "קושי קשה — תיאור",
  "selector": "[data-txt=\"diff-hard-sub\"]",
  "def": "ללא החלפות"
 },
 {
  "key": "lbl-ratings",
  "screen": "מסך הגדרות",
  "label": "כותרת: דירוגי שחקנים",
  "selector": "[data-txt=\"lbl-ratings\"]",
  "def": "דירוגי שחקנים"
 },
 {
  "key": "ratings-on",
  "screen": "מסך הגדרות",
  "label": "דירוגים גלויים — שם",
  "selector": "[data-txt=\"ratings-on\"]",
  "def": "גלויים"
 },
 {
  "key": "ratings-on-sub",
  "screen": "מסך הגדרות",
  "label": "דירוגים גלויים — תיאור",
  "selector": "[data-txt=\"ratings-on-sub\"]",
  "def": "דירוגי OVR מוצגים"
 },
 {
  "key": "ratings-off",
  "screen": "מסך הגדרות",
  "label": "דירוגים מוסתרים — שם",
  "selector": "[data-txt=\"ratings-off\"]",
  "def": "מוסתרים"
 },
 {
  "key": "ratings-off-sub",
  "screen": "מסך הגדרות",
  "label": "דירוגים מוסתרים — תיאור",
  "selector": "[data-txt=\"ratings-off-sub\"]",
  "def": "מצב עיוור — רק ידע"
 },
 {
  "key": "lbl-draftmode",
  "screen": "מסך הגדרות",
  "label": "כותרת: מצב דראפט",
  "selector": "[data-txt=\"lbl-draftmode\"]",
  "def": "מצב דראפט"
 },
 {
  "key": "mode-squad",
  "screen": "מסך הגדרות",
  "label": "סגל קודם — שם",
  "selector": "[data-txt=\"mode-squad\"]",
  "def": "סגל קודם"
 },
 {
  "key": "mode-squad-sub",
  "screen": "מסך הגדרות",
  "label": "סגל קודם — תיאור",
  "selector": "[data-txt=\"mode-squad-sub\"]",
  "def": "הגרל סגל, אז בחר שחקן"
 },
 {
  "key": "mode-pos",
  "screen": "מסך הגדרות",
  "label": "עמדה קודם — שם",
  "selector": "[data-txt=\"mode-pos\"]",
  "def": "עמדה קודם"
 },
 {
  "key": "mode-pos-sub",
  "screen": "מסך הגדרות",
  "label": "עמדה קודם — תיאור",
  "selector": "[data-txt=\"mode-pos-sub\"]",
  "def": "בחר עמדה, אז הגרל סגל"
 },
 {
  "key": "lbl-peak",
  "screen": "מסך הגדרות",
  "label": "כותרת: מצב שיא",
  "selector": "[data-txt=\"lbl-peak\"]",
  "def": "מצב שיא ⚡"
 },
 {
  "key": "peak-on",
  "screen": "מסך הגדרות",
  "label": "מצב שיא פעיל — שם",
  "selector": "[data-txt=\"peak-on\"]",
  "def": "פעיל"
 },
 {
  "key": "peak-on-sub",
  "screen": "מסך הגדרות",
  "label": "מצב שיא פעיל — תיאור",
  "selector": "[data-txt=\"peak-on-sub\"]",
  "def": "כל שחקן נמצא בשיא הקריירה"
 },
 {
  "key": "peak-off",
  "screen": "מסך הגדרות",
  "label": "מצב שיא כבוי — שם",
  "selector": "[data-txt=\"peak-off\"]",
  "def": "כבוי"
 },
 {
  "key": "peak-off-sub",
  "screen": "מסך הגדרות",
  "label": "מצב שיא כבוי — תיאור",
  "selector": "[data-txt=\"peak-off-sub\"]",
  "def": "דירוג אמיתי לפי עונה"
 },
 {
  "key": "lbl-era",
  "screen": "מסך הגדרות",
  "label": "כותרת: עידן",
  "selector": "[data-txt=\"lbl-era\"]",
  "def": "עידן"
 },
 {
  "key": "era-all",
  "screen": "מסך הגדרות",
  "label": "כפתור כל הזמנים",
  "selector": ".era-btn[data-era=\"all\"]",
  "def": "כל הזמנים"
 },
 {
  "key": "era-2000s",
  "screen": "מסך הגדרות",
  "label": "כפתור 2003+",
  "selector": ".era-btn[data-era=\"2000s\"]",
  "def": "2003+"
 },
 {
  "key": "era-2010s",
  "screen": "מסך הגדרות",
  "label": "כפתור 2010s+",
  "selector": ".era-btn[data-era=\"2010s\"]",
  "def": "2010s+"
 },
 {
  "key": "era-modern",
  "screen": "מסך הגדרות",
  "label": "כפתור מודרני",
  "selector": ".era-btn[data-era=\"modern\"]",
  "def": "מודרני (2016+)"
 },
 {
  "key": "era-note",
  "screen": "מסך הגדרות",
  "label": "הערה מתחת לסליידר",
  "selector": ".era-note",
  "def": "רק עונות בטווח זה ייגרלו במשחק"
 },
 {
  "key": "btn-start-draft",
  "screen": "מסך הגדרות",
  "label": "כפתור התחל דראפט",
  "selector": "#btn-start-draft",
  "def": "התחל דראפט ←"
 },
 {
  "key": "peak-banner",
  "screen": "מסך דראפט",
  "label": "באנר מצב שיא",
  "selector": "#peak-mode-banner",
  "def": "⚡ מצב שיא פעיל"
 },
 {
  "key": "btn-draft-restart",
  "screen": "מסך דראפט",
  "label": "כפתור התחל מחדש",
  "selector": "#btn-draft-restart",
  "def": "↩ התחל מחדש"
 },
 {
  "key": "pre-title",
  "screen": "מסך לפני העונה",
  "label": "כותרת: הרכב מוכן",
  "selector": ".pre-title",
  "def": "הרכב מוכן!"
 },
 {
  "key": "pre-sub",
  "screen": "מסך לפני העונה",
  "label": "משפט מתחת לכותרת",
  "selector": ".pre-sub",
  "def": "הנה מה שהמומחים אומרים על ה-XI שלך. סמלץ את העונה ונסה את הבלתי אפשרי."
 },
 {
  "key": "pre-odds-label",
  "screen": "מסך לפני העונה",
  "label": "כותרת הסיכויים",
  "selector": ".pre-odds-label",
  "def": "סיכויים לפני עונה"
 },
 {
  "key": "pre-odds-note",
  "screen": "מסך לפני העונה",
  "label": "הערת 300 סימולציות",
  "selector": ".pre-odds-note",
  "def": "מבוסס על 300 סימולציות"
 },
 {
  "key": "pre-key-finish",
  "screen": "מסך לפני העונה",
  "label": "תווית: צפי לסיום",
  "selector": "[data-txt=\"pre-key-finish\"]",
  "def": "צפי לסיום"
 },
 {
  "key": "pre-key-pts",
  "screen": "מסך לפני העונה",
  "label": "תווית: נקודות צפויות",
  "selector": "[data-txt=\"pre-key-pts\"]",
  "def": "נקודות צפויות"
 },
 {
  "key": "pre-signin-title",
  "screen": "מסך לפני העונה",
  "label": "קריאה להתחברות — כותרת",
  "selector": ".pre-signin-title",
  "def": "אל תאבד את העונה הזאת"
 },
 {
  "key": "pre-signin-sub",
  "screen": "מסך לפני העונה",
  "label": "קריאה להתחברות — תיאור",
  "selector": ".pre-signin-sub",
  "def": "התחבר כדי לשמור תוצאות ולהופיע ב-Leaderboard"
 },
 {
  "key": "pre-signin-btn",
  "screen": "מסך לפני העונה",
  "label": "כפתור התחבר",
  "selector": "#pre-signin-btn",
  "def": "התחבר"
 },
 {
  "key": "btn-simulate",
  "screen": "מסך לפני העונה",
  "label": "כפתור התחל סימולציה",
  "selector": "#btn-simulate",
  "def": "התחל סימולציה ←"
 },
 {
  "key": "btn-preseason-restart",
  "screen": "מסך לפני העונה",
  "label": "כפתור אפס דראפט",
  "selector": "#btn-preseason-restart",
  "def": "↩ אפס דראפט"
 },
 {
  "key": "ovr-total-label",
  "screen": "מסך תוצאות",
  "label": "תווית דירוג כולל",
  "selector": ".ovr-total-label",
  "def": "דירוג כולל"
 },
 {
  "key": "rec-wins",
  "screen": "מסך תוצאות",
  "label": "תווית ניצחונות",
  "selector": "[data-txt=\"rec-wins\"]",
  "def": "ניצחונות"
 },
 {
  "key": "rec-draws",
  "screen": "מסך תוצאות",
  "label": "תווית תיקו",
  "selector": "[data-txt=\"rec-draws\"]",
  "def": "תיקו"
 },
 {
  "key": "rec-losses",
  "screen": "מסך תוצאות",
  "label": "תווית הפסדים",
  "selector": "[data-txt=\"rec-losses\"]",
  "def": "הפסדים"
 },
 {
  "key": "rec-points",
  "screen": "מסך תוצאות",
  "label": "תווית נקודות",
  "selector": "[data-txt=\"rec-points\"]",
  "def": "נקודות"
 },
 {
  "key": "rec-gf",
  "screen": "מסך תוצאות",
  "label": "תווית שערים שנכבשו",
  "selector": "[data-txt=\"rec-gf\"]",
  "def": "שערים שנכבשו"
 },
 {
  "key": "rec-ga",
  "screen": "מסך תוצאות",
  "label": "תווית ספיגות",
  "selector": "[data-txt=\"rec-ga\"]",
  "def": "ספיגות"
 },
 {
  "key": "sec-awards",
  "screen": "מסך תוצאות",
  "label": "כותרת מצטייני העונה",
  "selector": "[data-txt=\"sec-awards\"]",
  "def": "מצטייני העונה"
 },
 {
  "key": "award-goals",
  "screen": "מסך תוצאות",
  "label": "מלך השערים",
  "selector": "[data-txt=\"award-goals\"]",
  "def": "מלך השערים"
 },
 {
  "key": "award-assists",
  "screen": "מסך תוצאות",
  "label": "מלך הבישולים",
  "selector": "[data-txt=\"award-assists\"]",
  "def": "מלך הבישולים"
 },
 {
  "key": "award-gk",
  "screen": "מסך תוצאות",
  "label": "כפפת הזהב",
  "selector": "[data-txt=\"award-gk\"]",
  "def": "כפפת הזהב"
 },
 {
  "key": "award-pots",
  "screen": "מסך תוצאות",
  "label": "שחקן העונה",
  "selector": "[data-txt=\"award-pots\"]",
  "def": "שחקן העונה"
 },
 {
  "key": "sec-stats",
  "screen": "מסך תוצאות",
  "label": "כותרת סטטיסטיקות שחקנים",
  "selector": "[data-txt=\"sec-stats\"]",
  "def": "סטטיסטיקות שחקנים"
 },
 {
  "key": "st-head-player",
  "screen": "מסך תוצאות",
  "label": "כותרת עמודה: שחקן",
  "selector": "[data-txt=\"st-head-player\"]",
  "def": "שחקן"
 },
 {
  "key": "st-head-goals",
  "screen": "מסך תוצאות",
  "label": "כותרת עמודה: שערים",
  "selector": "[data-txt=\"st-head-goals\"]",
  "def": "שערים"
 },
 {
  "key": "st-head-assists",
  "screen": "מסך תוצאות",
  "label": "כותרת עמודה: בישולים",
  "selector": "[data-txt=\"st-head-assists\"]",
  "def": "בישולים"
 },
 {
  "key": "st-head-cs",
  "screen": "מסך תוצאות",
  "label": "כותרת עמודה: שער נקי",
  "selector": "[data-txt=\"st-head-cs\"]",
  "def": "שער נקי"
 },
 {
  "key": "sec-season",
  "screen": "מסך תוצאות",
  "label": "כותרת נתוני העונה",
  "selector": "[data-txt=\"sec-season\"]",
  "def": "נתוני העונה"
 },
 {
  "key": "hl-streak",
  "screen": "מסך תוצאות",
  "label": "תווית רצף ניצחונות",
  "selector": "[data-txt=\"hl-streak\"]",
  "def": "רצף ניצחונות"
 },
 {
  "key": "hl-cs",
  "screen": "מסך תוצאות",
  "label": "תווית שערים נקיים",
  "selector": "[data-txt=\"hl-cs\"]",
  "def": "שערים נקיים"
 },
 {
  "key": "hl-bigwin",
  "screen": "מסך תוצאות",
  "label": "תווית הניצחון הגדול",
  "selector": "[data-txt=\"hl-bigwin\"]",
  "def": "הניצחון הגדול"
 },
 {
  "key": "lt-name",
  "screen": "מסך תוצאות",
  "label": "כותרת טבלה: קבוצה",
  "selector": ".lt-name",
  "def": "קבוצה"
 },
 {
  "key": "lt-pts",
  "screen": "מסך תוצאות",
  "label": "כותרת טבלה: נקודות",
  "selector": ".lt-pts",
  "def": "נק׳"
 },
 {
  "key": "btn-share",
  "screen": "מסך תוצאות",
  "label": "כפתור שתף תוצאה",
  "selector": "#btn-share",
  "def": "שתף תוצאה"
 },
 {
  "key": "btn-restart",
  "screen": "מסך תוצאות",
  "label": "כפתור משחק חדש",
  "selector": "#btn-restart",
  "def": "משחק חדש"
 },
 {
  "key": "sh-wa",
  "screen": "חלון שיתוף",
  "label": "כפתור WhatsApp",
  "selector": "#sh-wa",
  "def": "📱 WhatsApp"
 },
 {
  "key": "sh-copy",
  "screen": "חלון שיתוף",
  "label": "כפתור העתק",
  "selector": "#sh-copy",
  "def": "🔗 העתק"
 },
 {
  "key": "sh-save",
  "screen": "חלון שיתוף",
  "label": "כפתור שמור תמונה",
  "selector": "#sh-save",
  "def": "⬇ שמור תמונה"
 },
 {
  "key": "sh-close",
  "screen": "חלון שיתוף",
  "label": "כפתור סגור",
  "selector": "#sh-close",
  "def": "סגור"
 },
 {
  "key": "sc-footer",
  "screen": "חלון שיתוף",
  "label": "כתובת בתחתית כרטיס השיתוף",
  "selector": ".sc-footer",
  "def": "36-0.co.il"
 },
 {
  "key": "toast-label",
  "screen": "חלון שיתוף",
  "label": "הודעת הישג חדש",
  "selector": ".toast-label",
  "def": "הישג חדש!"
 },
 {
  "key": "page-achievements",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "כותרת עמוד הישגים",
  "selector": "[data-txt=\"page-achievements\"]",
  "def": "הישגים"
 },
 {
  "key": "page-leaderboard",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "כותרת עמוד לוח שיאים",
  "selector": "[data-txt=\"page-leaderboard\"]",
  "def": "לוח שיאים"
 },
 {
  "key": "lb-tab-ovr",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "טאב OVR",
  "selector": ".lb-tab[data-tab=\"ovr\"]",
  "def": "🏅 OVR"
 },
 {
  "key": "lb-tab-points",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "טאב נקודות",
  "selector": ".lb-tab[data-tab=\"points\"]",
  "def": "⚽ נקודות"
 },
 {
  "key": "lb-filter-all",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "סינון כל הזמנים",
  "selector": ".lb-filter[data-period=\"all\"]",
  "def": "כל הזמנים"
 },
 {
  "key": "lb-filter-month",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "סינון החודש",
  "selector": ".lb-filter[data-period=\"month\"]",
  "def": "החודש"
 },
 {
  "key": "lb-filter-week",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "סינון השבוע",
  "selector": ".lb-filter[data-period=\"week\"]",
  "def": "השבוע"
 },
 {
  "key": "achievements-back",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "כפתור חזרה (הישגים)",
  "selector": "#achievements-back",
  "def": "→ חזרה"
 },
 {
  "key": "leaderboard-back",
  "screen": "עמודי הישגים ולוח שיאים",
  "label": "כפתור חזרה (לוח שיאים)",
  "selector": "#leaderboard-back",
  "def": "→ חזרה"
 },
 {
  "key": "tier-perfect36-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"36–0 🏆\" — שם",
  "selector": "virtual",
  "def": "36–0 🏆"
 },
 {
  "key": "tier-perfect36-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"36–0 🏆\" — משפט",
  "selector": "virtual",
  "def": "הבלתי אפשרי הפך למציאות"
 },
 {
  "key": "tier-unbeaten-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"בלתי מנוצחים ✨\" — שם",
  "selector": "virtual",
  "def": "בלתי מנוצחים ✨"
 },
 {
  "key": "tier-unbeaten-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"בלתי מנוצחים ✨\" — משפט",
  "selector": "virtual",
  "def": "עונה שלמה ללא תבוסה"
 },
 {
  "key": "tier-champ-gap-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"אלופים בפער 🥇\" — שם",
  "selector": "virtual",
  "def": "אלופים בפער 🥇"
 },
 {
  "key": "tier-champ-gap-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"אלופים בפער 🥇\" — משפט",
  "selector": "virtual",
  "def": "שיא הליגה — תיתכן שושלת"
 },
 {
  "key": "tier-champ-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"אלופים 🏆\" — שם",
  "selector": "virtual",
  "def": "אלופים 🏆"
 },
 {
  "key": "tier-champ-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"אלופים 🏆\" — משפט",
  "selector": "virtual",
  "def": "זוכי ליגת העל"
 },
 {
  "key": "tier-runner-up-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"מקום שני 🥈\" — שם",
  "selector": "virtual",
  "def": "מקום שני 🥈"
 },
 {
  "key": "tier-runner-up-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"מקום שני 🥈\" — משפט",
  "selector": "virtual",
  "def": "עונה מבריקה — עד כמה היה קרוב?"
 },
 {
  "key": "tier-third-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"מקום שלישי 🥉\" — שם",
  "selector": "virtual",
  "def": "מקום שלישי 🥉"
 },
 {
  "key": "tier-third-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"מקום שלישי 🥉\" — משפט",
  "selector": "virtual",
  "def": "פלייאוף האליפות — הישג ראוי"
 },
 {
  "key": "tier-top6-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"שישייה עליונה\" — שם",
  "selector": "virtual",
  "def": "שישייה עליונה"
 },
 {
  "key": "tier-top6-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"שישייה עליונה\" — משפט",
  "selector": "virtual",
  "def": "פלייאוף האליפות"
 },
 {
  "key": "tier-bottom-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"פלייאוף תחתון\" — שם",
  "selector": "virtual",
  "def": "פלייאוף תחתון"
 },
 {
  "key": "tier-bottom-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"פלייאוף תחתון\" — משפט",
  "selector": "virtual",
  "def": "פלייאוף ההישרדות"
 },
 {
  "key": "tier-survivor-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"שורדים בליגה ⚠\" — שם",
  "selector": "virtual",
  "def": "שורדים בליגה ⚠"
 },
 {
  "key": "tier-survivor-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"שורדים בליגה ⚠\" — משפט",
  "selector": "virtual",
  "def": "מאבק הישרדות — ניצחון בשניות"
 },
 {
  "key": "tier-relegated-name",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"ירידת ליגה ⬇\" — שם",
  "selector": "virtual",
  "def": "ירידת ליגה ⬇"
 },
 {
  "key": "tier-relegated-sub",
  "screen": "דרגות סיום (טירים)",
  "label": "טיר \"ירידת ליגה ⬇\" — משפט",
  "selector": "virtual",
  "def": "ירידה לליגה הלאומית"
 },
 {
  "key": "label-diff-easy",
  "screen": "תוויות מצב (בתיבת הדרגה)",
  "label": "רמת קושי קל",
  "selector": "virtual",
  "def": "קל"
 },
 {
  "key": "label-diff-normal",
  "screen": "תוויות מצב (בתיבת הדרגה)",
  "label": "רמת קושי רגיל",
  "selector": "virtual",
  "def": "רגיל"
 },
 {
  "key": "label-diff-hard",
  "screen": "תוויות מצב (בתיבת הדרגה)",
  "label": "רמת קושי קשה",
  "selector": "virtual",
  "def": "קשה"
 },
 {
  "key": "label-peak-mode",
  "screen": "תוויות מצב (בתיבת הדרגה)",
  "label": "תווית מצב שיא",
  "selector": "virtual",
  "def": "⚡ מצב שיא"
 },
 {
  "key": "label-hidden-ratings",
  "screen": "תוויות מצב (בתיבת הדרגה)",
  "label": "תווית דירוגים מוסתרים",
  "selector": "virtual",
  "def": "🙈 דירוגים מוסתרים"
 },
 {
  "key": "proj-finished",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "תווית: סיום בפועל",
  "selector": "virtual",
  "def": "סיום בפועל"
 },
 {
  "key": "proj-projected",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "תווית: צפי לפני העונה",
  "selector": "virtual",
  "def": "צפי לפני העונה"
 },
 {
  "key": "verdict-over",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "שיפוט: מעל הציפיות",
  "selector": "virtual",
  "def": "מעל הציפיות 🔥"
 },
 {
  "key": "verdict-under",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "שיפוט: מתחת לציפיות",
  "selector": "virtual",
  "def": "מתחת לציפיות"
 },
 {
  "key": "verdict-exact",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "שיפוט: בדיוק כצפוי",
  "selector": "virtual",
  "def": "בדיוק כצפוי"
 },
 {
  "key": "qual-cat-atk",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "קטגוריה: התקפה",
  "selector": "virtual",
  "def": "התקפה"
 },
 {
  "key": "qual-cat-mid",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "קטגוריה: קישור",
  "selector": "virtual",
  "def": "קישור"
 },
 {
  "key": "qual-cat-def",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "קטגוריה: הגנה",
  "selector": "virtual",
  "def": "הגנה"
 },
 {
  "key": "qual-cat-gk",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "קטגוריה: שוער",
  "selector": "virtual",
  "def": "שוער"
 },
 {
  "key": "qual-elite",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "דירוג איכות: מעולה",
  "selector": "virtual",
  "def": "מעולה"
 },
 {
  "key": "qual-strong",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "דירוג איכות: חזק",
  "selector": "virtual",
  "def": "חזק"
 },
 {
  "key": "qual-good",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "דירוג איכות: טוב",
  "selector": "virtual",
  "def": "טוב"
 },
 {
  "key": "qual-average",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "דירוג איכות: בינוני",
  "selector": "virtual",
  "def": "בינוני"
 },
 {
  "key": "qual-weak",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "דירוג איכות: חלש",
  "selector": "virtual",
  "def": "חלש"
 },
 {
  "key": "qual-summary-tmpl",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "משפט סיכום איכותי (עם {best} ו-{worst})",
  "selector": "virtual",
  "def": "החוזק הגדול היה ה{best}, והחוליה החלשה — ה{worst}."
 },
 {
  "key": "story-perfect-title",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב עונה מושלמת — כותרת",
  "selector": "virtual",
  "def": "מושלם. בלתי אפשרי הפך למציאות. 🏆"
 },
 {
  "key": "story-perfect-body",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב עונה מושלמת — טקסט",
  "selector": "virtual",
  "def": "עונה בלי ולו נקודה אחת שאבדה. {wins} ניצחונות מתוך {wins}. אין על מה להתווכח — זו האלמותיות."
 },
 {
  "key": "story-champ-title",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב אלופים — כותרת",
  "selector": "virtual",
  "def": "אלופים! 🏆"
 },
 {
  "key": "story-champ-body",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב אלופים — טקסט",
  "selector": "virtual",
  "def": "הם המשיכו לדפוק בדלת, והפעם היא נפתחה. {pts} נקודות בקופה, {wins} ניצחונות, ואליפות שאף אחד לא יכול לקחת."
 },
 {
  "key": "story-top6-title",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב שישייה עליונה — כותרת",
  "selector": "virtual",
  "def": "עונה גדולה 🥈"
 },
 {
  "key": "story-top6-body",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב שישייה עליונה — טקסט",
  "selector": "virtual",
  "def": "מקום {rank} וכרטיס לפלייאוף האליפות. {pts} נקודות ועונה שכמעט נגעה בזהב — עד כמה זה היה קרוב?"
 },
 {
  "key": "story-mid-title",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב אמצע טבלה — כותרת",
  "selector": "virtual",
  "def": "עונה של ביסוס"
 },
 {
  "key": "story-mid-body",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב אמצע טבלה — טקסט",
  "selector": "virtual",
  "def": "מקום {rank}. לא הכל הלך חלק, אבל {wins} ניצחונות ו-{pts} נקודות מספרים על קבוצה עם אופי. יש על מה לבנות."
 },
 {
  "key": "story-releg-title",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב תחתית — כותרת",
  "selector": "virtual",
  "def": "עונה למחוק"
 },
 {
  "key": "story-releg-body",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "נרטיב תחתית — טקסט",
  "selector": "virtual",
  "def": "מקום {rank} וקרב הישרדות עד הסוף. {losses} הפסדים כואבים, אבל מכאן אפשר רק לעלות."
 },
 {
  "key": "story-scorer-tmpl",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "הערת מלך שערים (עם {name} ו-{goals})",
  "selector": "virtual",
  "def": "⚽ {name} הוביל את המתקפה עם {goals} שערים — פשוט לא הפסיק לכבוש."
 },
 {
  "key": "story-assist-tmpl",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "הערת מלך בישולים (עם {name} ו-{assists})",
  "selector": "virtual",
  "def": "🎯 {name} חילק את המשחק עם {assists} בישולים."
 },
 {
  "key": "btn-skip",
  "screen": "מסך תוצאות",
  "label": "כפתור: דלג על חשיפת המשחקים",
  "selector": "[data-txt=\"btn-skip\"]",
  "def": "דלג ⏩"
 },
 {
  "key": "placement-close",
  "screen": "סיכום עונה (מסך תוצאות)",
  "label": "כפתור סגירת פופ-אפ המקום",
  "selector": "virtual",
  "def": "לצפייה בתוצאות ←"
 },
 {
  "key": "share-title",
  "screen": "הודעת שיתוף (וואטסאפ/X)",
  "label": "שורת כותרת",
  "selector": "virtual",
  "def": "🇮🇱 36–0 | ליגת העל"
 },
 {
  "key": "share-line-formation",
  "screen": "הודעת שיתוף (וואטסאפ/X)",
  "label": "שורת מערך+דירוג (עם {formation} {ovr})",
  "selector": "virtual",
  "def": "מערך: {formation} | דירוג: {ovr}"
 },
 {
  "key": "share-line-record",
  "screen": "הודעת שיתוף (וואטסאפ/X)",
  "label": "שורת מאזן (עם {wins} {draws} {losses} {points})",
  "selector": "virtual",
  "def": "{wins}נ-{draws}ת-{losses}ה | {points} נקודות"
 },
 {
  "key": "share-footer",
  "screen": "הודעת שיתוף (וואטסאפ/X)",
  "label": "שורת סיום",
  "selector": "virtual",
  "def": "36-0.co.il"
 },
 { "key": "page-duel",         "screen": "דואל 1 על 1", "label": "כותרת המסך",            "selector": "#screen-duel .page-title", "def": "דואל 1 על 1" },
 { "key": "duel-quick-title",  "screen": "דואל 1 על 1", "label": "כותרת 'משחק מהיר'",      "selector": "virtual", "def": "⚡ משחק מהיר" },
 { "key": "duel-quick-note",   "screen": "דואל 1 על 1", "label": "תיאור 'משחק מהיר'",      "selector": "virtual", "def": "מצא יריב אקראי והתחל דואל תורות מיד." },
 { "key": "duel-quick-btn",    "screen": "דואל 1 על 1", "label": "כפתור 'חפש יריב'",       "selector": "virtual", "def": "חפש יריב" },
 { "key": "duel-create-title", "screen": "דואל 1 על 1", "label": "כותרת 'צור חדר'",        "selector": "virtual", "def": "🎮 צור חדר חדש" },
 { "key": "duel-create-note",  "screen": "דואל 1 על 1", "label": "תיאור 'צור חדר'",        "selector": "virtual", "def": "חדר פרטי — אתה קובע את ההגדרות, שלח את הקוד לחבר." },
 { "key": "duel-create-btn",   "screen": "דואל 1 על 1", "label": "כפתור 'צור חדר'",        "selector": "virtual", "def": "צור חדר" },
 { "key": "duel-join-title",   "screen": "דואל 1 על 1", "label": "כותרת 'הצטרף לחדר'",     "selector": "virtual", "def": "🔑 הצטרף לחדר" },
 { "key": "duel-join-btn",     "screen": "דואל 1 על 1", "label": "כפתור 'הצטרף'",          "selector": "virtual", "def": "הצטרף" },

 { "key": "nav-daily",           "screen": "אתגרים", "label": "כפתור ניווט 'אתגרים'",          "selector": "#nav-daily", "def": "🗓️ אתגרים" },
 { "key": "page-challenges",     "screen": "אתגרים", "label": "כותרת מסך האתגרים",             "selector": "#screen-daily .page-title", "def": "אתגרים" },
 { "key": "chal-avail-both",     "screen": "אתגרים", "label": "כרטיס פתיחה — שבועי+חודשי זמינים", "selector": "virtual", "def": "📅🏆 האתגר השבועי והחודשי זמינים!" },
 { "key": "chal-avail-weekly",   "screen": "אתגרים", "label": "כרטיס פתיחה — השבועי זמין",        "selector": "virtual", "def": "📅 האתגר השבועי זמין!" },
 { "key": "chal-avail-monthly",  "screen": "אתגרים", "label": "כרטיס פתיחה — החודשי זמין",        "selector": "virtual", "def": "🏆 האתגר החודשי זמין!" },
 { "key": "chal-label-daily",    "screen": "אתגרים", "label": "שם האתגר היומי",                "selector": "virtual", "def": "האתגר היומי" },
 { "key": "chal-label-weekly",   "screen": "אתגרים", "label": "שם האתגר השבועי",               "selector": "virtual", "def": "האתגר השבועי" },
 { "key": "chal-label-monthly",  "screen": "אתגרים", "label": "שם האתגר החודשי",               "selector": "virtual", "def": "האתגר החודשי" },
 { "key": "chal-hero-sub",       "screen": "אתגרים", "label": "משפט ההסבר מתחת לכותרת",        "selector": "virtual", "def": "כולם מקבלים את אותם תנאים ואת אותן הקבוצות בהגרלה — מי בונה את ההרכב הכי טוב?" },
 { "key": "chal-missions-title", "screen": "אתגרים", "label": "כותרת רשימת המשימות (מסך אתגר)", "selector": "virtual", "def": "🎯 המשימות" },
 { "key": "chal-missions-hint",  "screen": "אתגרים", "label": "הערה מתחת למשימות",             "selector": "virtual", "def": "רק הרכב שמשלים את כל המשימות נכנס לטבלה" },
 { "key": "chal-panel-title",    "screen": "אתגרים", "label": "כותרת המשימות (דראפט/פריסיזן)",  "selector": "virtual", "def": "🎯 משימות האתגר" },
 { "key": "chal-play",           "screen": "אתגרים", "label": "כפתור 'שחק את האתגר'",          "selector": "virtual", "def": "⚽ שחק את האתגר" },
 { "key": "chal-play-again",     "screen": "אתגרים", "label": "כפתור 'עוד ניסיון' (מסך אתגר)", "selector": "virtual", "def": "🔁 עוד ניסיון — נשמר הטוב ביותר" },
 { "key": "chal-countdown",      "screen": "אתגרים", "label": "ספירה לאחור ({left} = הזמן)",   "selector": "virtual", "def": "האתגר הבא בעוד {left}" },
 { "key": "chal-login-note",     "screen": "אתגרים", "label": "הערה למשתמש לא מחובר",          "selector": "virtual", "def": "אפשר לשחק בלי חשבון — אבל רק מחוברים נכנסים לטבלה." },
 { "key": "chal-board-title-daily",   "screen": "אתגרים", "label": "כותרת טבלה — יומי",       "selector": "virtual", "def": "טבלת היום" },
 { "key": "chal-board-title-weekly",  "screen": "אתגרים", "label": "כותרת טבלה — שבועי",      "selector": "virtual", "def": "טבלת השבוע" },
 { "key": "chal-board-title-monthly", "screen": "אתגרים", "label": "כותרת טבלה — חודשי",      "selector": "virtual", "def": "טבלת החודש" },
 { "key": "chal-board-empty",    "screen": "אתגרים", "label": "טבלה ריקה",                     "selector": "virtual", "def": "עוד אין תוצאות — היה הראשון! 🏁" },
 { "key": "chal-board-fail",     "screen": "אתגרים", "label": "שגיאת טעינת טבלה",              "selector": "virtual", "def": "טעינת הטבלה נכשלה" },
 { "key": "chal-mine-label",     "screen": "אתגרים", "label": "תווית 'התוצאה שלך'",            "selector": "virtual", "def": "התוצאה שלך:" },
 { "key": "chal-mine-none",      "screen": "אתגרים", "label": "'עוד לא שיחקת'",                "selector": "virtual", "def": "עוד לא שיחקת באתגר הזה" },
 { "key": "chal-pre-ok",         "screen": "אתגרים", "label": "פריסיזן — כל המשימות הושלמו",   "selector": "virtual", "def": "✓ כל המשימות הושלמו — התוצאה תיכנס לטבלת האתגר" },
 { "key": "chal-pre-bad",        "screen": "אתגרים", "label": "פריסיזן — משימות לא הושלמו",    "selector": "virtual", "def": "⚠ המשימות לא הושלמו — העונה תרוץ, אבל התוצאה לא תיכנס לטבלת האתגר" },
 { "key": "chal-result-unmet",   "screen": "אתגרים", "label": "תוצאות — משימות לא הושלמו",     "selector": "virtual", "def": "❌ המשימות לא הושלמו — התוצאה לא נכנסה לטבלת האתגר (נשמרה כמשחק רגיל)" },
 { "key": "chal-note-first",     "screen": "אתגרים", "label": "הודעת שמירה ראשונה",            "selector": "virtual", "def": "✓ התוצאה נשמרה לטבלת האתגר" },
 { "key": "chal-note-best",      "screen": "אתגרים", "label": "הודעת שיא חדש",                 "selector": "virtual", "def": "🔥 שיא חדש! התוצאה הטובה שלך נשמרה" },
 { "key": "chal-note-nobest",    "screen": "אתגרים", "label": "הודעת 'לא שיפרת' ({n} = ניסיון)", "selector": "virtual", "def": "לא שיפרת את השיא שלך (ניסיון {n})" },
 { "key": "chal-retry-btn",      "screen": "אתגרים", "label": "כפתור 'עוד ניסיון' (תוצאות)",   "selector": "virtual", "def": "🔁 עוד ניסיון ב{challenge}" },
 { "key": "chal-to-board-btn",   "screen": "אתגרים", "label": "כפתור 'לטבלת האתגר' (תוצאות)",  "selector": "virtual", "def": "📊 לטבלת האתגר" },
 { "key": "chal-mine-try",       "screen": "אתגרים", "label": "סימון ניסיון בודד",             "selector": "virtual", "def": "(ניסיון 1)" },
 { "key": "chal-mine-tries",     "screen": "אתגרים", "label": "סימון ניסיונות ({n} = מספר)",   "selector": "virtual", "def": "({n} ניסיונות)" },
 { "key": "chal-chip-ratings-on",  "screen": "אתגרים", "label": "צ'יפ דירוגים גלויים",         "selector": "virtual", "def": "דירוגים גלויים" },
 { "key": "chal-chip-ratings-off", "screen": "אתגרים", "label": "צ'יפ דירוגים מוסתרים",        "selector": "virtual", "def": "דירוגים מוסתרים" },
 { "key": "chal-chip-peak",      "screen": "אתגרים", "label": "צ'יפ מצב שיא",                  "selector": "virtual", "def": "מצב שיא" },
 { "key": "chal-era-all",        "screen": "אתגרים", "label": "עידן — כל הזמנים",              "selector": "virtual", "def": "כל הזמנים" },
 { "key": "chal-era-2003",       "screen": "אתגרים", "label": "עידן — 2003 והלאה",             "selector": "virtual", "def": "2003 והלאה" },
 { "key": "chal-era-2010",       "screen": "אתגרים", "label": "עידן — 2010 והלאה",             "selector": "virtual", "def": "2010 והלאה" },
 { "key": "chal-era-2016",       "screen": "אתגרים", "label": "עידן — מודרני",                 "selector": "virtual", "def": "מודרני (2016+)" },
 { "key": "chal-era-00s",        "screen": "אתגרים", "label": "עידן — שנות ה-2000",            "selector": "virtual", "def": "שנות ה-2000" },
 { "key": "chal-era-10s",        "screen": "אתגרים", "label": "עידן — העשור של 2010",          "selector": "virtual", "def": "העשור של 2010" },
 { "key": "chal-req-club-one",   "screen": "אתגרים — משימות", "label": "משימת מועדון (שחקן אחד, {club})",     "selector": "virtual", "def": "שחקן אחד לפחות מ{club}" },
 { "key": "chal-req-club-many",  "screen": "אתגרים — משימות", "label": "משימת מועדון ({n} שחקנים, {club})",   "selector": "virtual", "def": "לפחות {n} שחקנים מ{club}" },
 { "key": "chal-req-nat-one",    "screen": "אתגרים — משימות", "label": "משימת מדינה (שחקן אחד, {nat})",       "selector": "virtual", "def": "שחקן אחד לפחות מ{nat}" },
 { "key": "chal-req-nat-many",   "screen": "אתגרים — משימות", "label": "משימת מדינה ({n} שחקנים, {nat})",     "selector": "virtual", "def": "לפחות {n} שחקנים מ{nat}" },
 { "key": "chal-req-dual-suffix","screen": "אתגרים — משימות", "label": "תוספת אזרחות כפולה",                  "selector": "virtual", "def": "(כולל אזרחות שנייה)" },
 { "key": "chal-req-max-team-ovr",   "screen": "אתגרים — משימות", "label": "משימת דירוג הרכב מקס' ({x})",     "selector": "virtual", "def": "דירוג ההרכב הסופי — עד {x}" },
 { "key": "chal-req-max-player-ovr", "screen": "אתגרים — משימות", "label": "משימת בלי שחקנים מעל ({x})",      "selector": "virtual", "def": "בלי שחקנים עם דירוג מעל {x}" },
 { "key": "chal-req-min-low-ovr",    "screen": "אתגרים — משימות", "label": "משימת שחקנים בדירוג נמוך ({n},{x})", "selector": "virtual", "def": "לפחות {n} שחקנים עם דירוג {x} ומטה" },
 { "key": "chal-req-all-diff",       "screen": "אתגרים — משימות", "label": "משימת מועדונים שונים",            "selector": "virtual", "def": "כל השחקנים ממועדונים שונים" },
 { "key": "chal-req-era-before",     "screen": "אתגרים — משימות", "label": "משימת עונות ישנות ({n},{season})", "selector": "virtual", "def": "לפחות {n} שחקנים מעונות שלפני {season}" },
 { "key": "chal-req-era-after",      "screen": "אתגרים — משימות", "label": "משימת עונות חדשות ({n},{season})", "selector": "virtual", "def": "לפחות {n} שחקנים מעונת {season} ומעלה" }
];
