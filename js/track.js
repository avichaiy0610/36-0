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

  // Screens re-render, buttons get double-tapped: the same event within two
  // seconds is the same event.
  const recent = new Map();

  // track('open' | 'finish', mode, detail?)
  window.track = function (event, mode, detail) {
    try {
      if (!mode || typeof _supabase === 'undefined' || !_supabase) return;
      const key = event + '|' + mode + '|' + (detail == null ? '' : detail);
      const now = Date.now();
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
})();
