// What gets played, and what gets abandoned.
//
// One fire-and-forget call when a mode is opened and one when a run finishes.
// Nothing here is ever rendered, logged or read back by the site — the numbers
// exist so the next thing built is the thing people actually use. Anonymous by
// construction: a random id per browser, plus the account id when signed in,
// and nothing else. See supabase/migrations/20260824000001_usage_events.sql.
//
// Rules this file lives by: it never throws, never blocks, never writes to the
// console, and never delays a screen. A counter must not be able to break a
// game.
(function () {
  const CID_KEY = 't360_cid';
  let cid = null;

  function uuid() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) { /* fall through */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Stable per browser. In private mode localStorage can throw or forget — then
  // the id lives for this session only, which costs a little accuracy and
  // nothing else.
  function clientId() {
    if (cid) return cid;
    try {
      cid = localStorage.getItem(CID_KEY);
      if (!cid) { cid = uuid(); localStorage.setItem(CID_KEY, cid); }
    } catch (e) { cid = cid || uuid(); }
    return cid;
  }

  // An "open" is reach: how many people got as far as this mode TODAY. Counting
  // it more than once measures navigation, not reach — the gauntlet and the duel
  // bounce between their own screens constantly, and a phone discards and
  // reloads a tab all day, which is why one-per-page-load still over-counted by
  // a third. Volume is what `finish` is for.
  const OPEN_KEY = 't360_opened';
  function openedToday() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    let store = null;
    try { store = JSON.parse(localStorage.getItem(OPEN_KEY)); } catch (e) { store = null; }
    if (!store || store.day !== today) store = { day: today, keys: [] };
    return store;
  }
  function markOpened(store, key) {
    store.keys.push(key);
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(store)); } catch (e) {}
  }
  // Screens re-render and buttons get double-tapped: the same finish within two
  // seconds is the same finish.
  const recent = new Map();

  // track('open' | 'finish' | 'share', mode, detail?)
  window.track = function (event, mode, detail) {
    try {
      if (!mode || typeof _supabase === 'undefined' || !_supabase) return;
      const key = event + '|' + mode + '|' + (detail == null ? '' : detail);
      const now = Date.now();
      if (event === 'open') {
        const store = openedToday();
        if (store.keys.indexOf(key) !== -1) return;
        markOpened(store, key);
      }
      if (now - (recent.get(key) || 0) < 2000) return;
      recent.set(key, now);
      _supabase.rpc('track', {
        p: {
          client_id: clientId(),
          mode: String(mode),
          event: String(event),
          detail: detail == null ? null : String(detail).slice(0, 40),
        },
      }).then(() => {}, () => {});
    } catch (e) { /* a counter never breaks a game */ }
  };

  // Where people arrive from. Only a coarse category ever leaves the page —
  // never the referring URL — and it rides the same once-a-day rule, so it
  // counts people, not page loads. This is the only way to know whether the
  // 1,300 player pages bring anybody in.
  function entrySource() {
    let ref = '';
    try { ref = document.referrer || ''; } catch (e) { return null; }
    // No referrer IS a visit — a typed address, a bookmark, the installed app,
    // or a link opened from inside WhatsApp. Returning null here meant those
    // people produced no event at all unless they went on to open a mode, so
    // "אנשים ליום" was really "people who started something".
    if (!ref) return 'direct';
    let host = '', path = '';
    try {
      const u = new URL(ref);
      host = u.hostname.replace(/^www\./, '');
      path = u.pathname || '';
    } catch (e) { return null; }

    if (host === String(location.hostname).replace(/^www\./, '')) {
      if (path.indexOf('/player/') === 0)  return 'player-page';
      if (path.indexOf('/team/') === 0)    return 'team-page';
      if (path.indexOf('/players') === 0)  return 'players-index';
      return null;                               // moving around the site is not an arrival
    }
    if (/(^|\.)google\./.test(host))            return 'google';
    if (/(^|\.)bing\./.test(host))              return 'bing';
    if (/facebook|(^|\.)fb\./.test(host))       return 'facebook';
    if (/instagram/.test(host))                 return 'instagram';
    if (/whatsapp/.test(host))                  return 'whatsapp';
    if (/telegram|(^|\.)t\.me$/.test(host))     return 'telegram';
    if (/^t\.co$|twitter|^x\.com$/.test(host))  return 'x';
    if (/tiktok/.test(host))                    return 'tiktok';
    if (/reddit/.test(host))                    return 'reddit';
    return 'other';
  }

  try {
    const src = entrySource();
    if (src) setTimeout(function () { window.track('open', 'entry', src); }, 800);
  } catch (e) { /* never at the cost of the page */ }
})();
