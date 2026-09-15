// The ✅/🗑️ taps, answered the moment they happen.
//
// Until now a tap did nothing on its own: Telegram queued it, and it was only
// acted on the next time challenge_engine.js ran getUpdates. That job asks for
// every ten minutes and GitHub actually delivers every 3–11 hours, so pressing
// approve produced no answer for most of a day — and a tap could expire unseen
// entirely, because Telegram discards an unread update after 24 hours.
//
// A webhook inverts it. Telegram calls us, once, immediately. There is no queue
// to fall behind, no offset for two jobs to race over, and nothing to expire.
//
// Where the secrets come from: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// injected into every Edge Function automatically. The bot token, the chat id
// and the shared webhook secret are read from engine_state, which is RLS-locked
// to service_role and the owner's own login — see telegram-webhook-setup.yml for
// why they are placed there rather than in Supabase's secret store.

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

async function sb(method: string, pathq: string, body?: unknown, extra?: Record<string, string>) {
  const res = await fetch(`${SB_URL}/rest/v1/${pathq}`, {
    method,
    headers: { ...sbHeaders, ...(extra || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`supabase ${res.status}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

async function stateGet(key: string): Promise<string | null> {
  const r = await sb('GET', `engine_state?key=eq.${encodeURIComponent(key)}&select=value`);
  return r && r[0] ? r[0].value : null;
}

async function stateSet(key: string, value: string) {
  await sb('POST', 'engine_state', { key, value: String(value) },
    { Prefer: 'resolution=merge-duplicates' });
}

async function tg(token: string, method: string, payload: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// Telegram retries anything that is not a 2xx, and a retry of an approval would
// be harmless but noisy. So every path below answers 200 — the interesting
// outcomes go to the logs and to the chat, never to the status code.
const ok = () => new Response('ok', { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  // A real function secret wins if one was ever set with `supabase secrets set`;
  // engine_state is the fallback that lets the whole thing be configured from
  // CI, where the bot token actually lives. Upgrading later needs no code change.
  const envFirst = (name: string, key: string) =>
    Deno.env.get(name) ? Promise.resolve(Deno.env.get(name)!) : stateGet(key);

  let secret: string | null, token: string | null, chatId: string | null;
  try {
    [secret, token, chatId] = await Promise.all([
      envFirst('TELEGRAM_WEBHOOK_SECRET', 'tg_webhook_secret'),
      envFirst('TELEGRAM_CHAL_BOT_TOKEN', 'tg_chal_bot_token'),
      envFirst('TELEGRAM_CHAT_ID', 'tg_chat_id'),
    ]);
  } catch (e) {
    console.log(`tap: cannot reach engine_state — ${e instanceof Error ? e.message : e}`);
    return ok();
  }

  // The only thing standing between this URL and the open internet. Telegram
  // echoes the secret we registered with setWebhook on every call; nobody else
  // knows it. A 401 here is deliberate: it is not a Telegram request, so there
  // is no retry to suppress.
  const sent = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!secret || !sent || sent !== secret) {
    console.log('tap: rejected — bad or missing secret token');
    return new Response('forbidden', { status: 401 });
  }
  if (!token) { console.log('tap: no bot token in engine_state'); return ok(); }

  let update: Record<string, any>;
  try { update = await req.json(); } catch { console.log('tap: body was not json'); return ok(); }

  const cq = update.callback_query;
  // Nothing is allowed to vanish without a line. A tap that produces no answer
  // and no log entry is indistinguishable from a tap that never happened, which
  // is exactly the hole the polling version spent a day in.
  if (!cq) {
    const kinds = Object.keys(update).filter(k => k !== 'update_id').join(',');
    console.log(`tap: update ${update.update_id} is not a tap (${kinds}) — skipped`);
    return ok();
  }
  if (!cq.data) { console.log(`tap: tap ${update.update_id} carried no data — skipped`); return ok(); }

  const [action, period, key] = String(cq.data).split(':');

  if (action === 'ping') {                       // the connectivity test button
    console.log(`tap: PING from ${cq.from && cq.from.username} — the webhook is live`);
    await tg(token, 'answerCallbackQuery',
      { callback_query_id: cq.id, text: '✅ הגיע מיידית! הוובהוק עובד' });
    if (chatId) {
      await tg(token, 'sendMessage',
        { chat_id: chatId, text: '✅ הבדיקה עברה — הלחיצה הגיעה לבוט מיידית, דרך הוובהוק.' });
    }
    return ok();
  }

  if (action !== 'ca' && action !== 'cr') {
    console.log(`tap: UNRECOGNISED data "${cq.data}" from message ${cq.message && cq.message.message_id}`);
    await tg(token, 'answerCallbackQuery',
      { callback_query_id: cq.id, text: 'הכפתור הזה לא מוכר לי' });
    return ok();
  }

  let msg = 'הצעה לא נמצאה (אולי כבר טופלה)';
  try {
    const raw = await stateGet(`chal_pending|${period}|${key}`);
    if (!raw) {
      const all = await sb('GET', 'engine_state?key=like.chal_pending*&select=key,value');
      const live = (all || []).filter((r: any) => r.value).map((r: any) => r.key).join(', ')
        || 'אין אף הצעה פתוחה';
      console.log(`tap: nothing pending for ${period}|${key}. currently open: ${live}`);
    } else if (action === 'ca') {
      const s = JSON.parse(raw);
      delete s.note; delete s.score; delete s.message_id;
      await sb('POST', 'challenge_overrides',
        { period, challenge_key: key, settings: s },
        { Prefer: 'resolution=merge-duplicates' });
      msg = `✅ נשמר: ${period} ${key}`;
      await stateSet(`chal_pending|${period}|${key}`, '');
    } else {
      msg = `🗑️ נדחה: ${period} ${key}`;
      try { await stateSet(`chal_rejected|${period}|${key}`, JSON.parse(raw).label || ''); } catch { /* label is optional */ }
      await stateSet(`chal_pending|${period}|${key}`, '');
    }
  } catch (e) {
    // The tap DID arrive; say so honestly rather than leaving the spinner up.
    msg = 'שגיאה בשמירה — נסה שוב';
    console.log(`tap: ${cq.data} failed — ${e instanceof Error ? e.message : e}`);
  }

  console.log(`tap: ${cq.data} → ${msg}`);
  await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id, text: msg });
  if (chatId) await tg(token, 'sendMessage', { chat_id: chatId, text: msg });
  return ok();
});
