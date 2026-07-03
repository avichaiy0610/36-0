// Best-effort client error reporting. Captures uncaught errors and rejected
// promises and stores them in the client_errors table for later inspection via
// the Supabase dashboard. Silent, rate-limited, and never throws itself.
(function () {
  let sent = 0;
  const MAX_PER_SESSION = 10;
  const seen = new Set();

  async function report(message, source, stack) {
    try {
      if (sent >= MAX_PER_SESSION) return;
      const key = (message || '') + '|' + (source || '');
      if (seen.has(key)) return;          // don't spam duplicates
      seen.add(key);
      sent++;
      if (typeof _supabase === 'undefined') return;
      let user_id = null;
      try { user_id = (await _supabase.auth.getSession()).data.session?.user?.id ?? null; } catch (e) {}
      await _supabase.from('client_errors').insert({
        user_id,
        message: String(message ?? '').slice(0, 2000),
        source: String(source ?? '').slice(0, 300),
        stack: String(stack ?? '').slice(0, 8000),
        user_agent: navigator.userAgent.slice(0, 400),
        url: location.href.slice(0, 400),
      });
    } catch (e) { /* logging must never break the app */ }
  }

  window.addEventListener('error', e => {
    report(e.message, (e.filename || '') + ':' + (e.lineno || ''), e.error?.stack);
  });
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    report(r?.message || String(r), 'unhandledrejection', r?.stack);
  });
})();
