// Persist the login across visits ("remember me"): the session is stored in
// localStorage and the access token is auto-refreshed, so a returning user
// stays signed in until they explicitly log out. (These are supabase-js
// defaults; set explicitly so behaviour can't drift and intent is clear.)
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // keep the default storageKey (sb-<ref>-auth-token) so existing sessions
    // stay valid — changing it would log everyone out
  },
});
