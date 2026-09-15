// דירוגי הקהל והצמדים — הלחיצה נענית ברגע שהיא קורית.
//
// זו העתקה מכוונת של supabase/functions/challenge-tap, לא הרחבה שלה. הסיבה
// היא מגבלה של טלגרם: לבוט אחד יש **וובהוק אחד**. הגרסה הראשונה של זה נדחפה
// לתוך challenge-tap בדיוק בגלל זה — וזו הייתה הסיבה הלא נכונה. הבעלים ביקש
// הפרדה, והוא צדק: ההקשות של האתגרים עובדות היום, ואין שום סיבה שקוד חדש של
// פיצ'ר אחר ייגע בקוד שנפרס ופועל.
//
// עם בוט שני הכל נפרד: טוקן משלו, כתובת משלה, סוד משלו, ותקלה כאן לא נוגעת
// באתגרים בכלל. המחיר היחיד הוא שתי הודעות משני בוטים באותה שיחה.
//
// ── מה הלחיצה עושה, ומה היא לא ────────────────────────────────────────────
// כלום כאן לא מחליט. scripts/crowd_telegram.js חישב את ההחלטה המלאה מראש
// ושמר אותה ב-engine_state; כאן רק מבצעים אותה.
//
// זה לא סידור אסתטי. ה-RPC-ים (approve_rating, publish_crowd, approve_duo)
// מגודרים ב-is_site_admin(), שבודק אימייל בתוך ה-JWT — ול-service_role, שזה
// מה שהפונקציה הזאת מחזיקה, אין אימייל. הרחבת השער הייתה נוגעת בפרימיטיב
// אבטחה שכל הסכימה נשענת עליו בשביל פיצ'ר אחד, אז במקום זה השולח — שרץ עם
// אותו מפתח ויכול לקרוא הכל — מאמת מראש, וכאן נשארת כתיבה אחת לטבלה.
// אותו דפוס בדיוק שבו challenge-tap כותב ל-challenge_overrides.

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

// טלגרם חוזר על כל מה שאינו 2xx, וחזרה על אישור הייתה מייצרת רעש. אז כל מסלול
// כאן עונה 200 — מה שמעניין הולך ללוג ולצ'אט, אף פעם לא לקוד הסטטוס.
const ok = () => new Response('ok', { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const envFirst = (name: string, key: string) =>
    Deno.env.get(name) ? Promise.resolve(Deno.env.get(name)!) : stateGet(key);

  let secret: string | null, token: string | null, chatId: string | null;
  try {
    // מפתחות נפרדים לגמרי מאלה של האתגרים. אותה טבלה, שמות אחרים — כך
    // שהחלפת טוקן או סוד כאן לא יכולה להפיל את הבוט השני.
    [secret, token, chatId] = await Promise.all([
      envFirst('CROWD_WEBHOOK_SECRET', 'tg_crowd_webhook_secret'),
      envFirst('TELEGRAM_CROWD_BOT_TOKEN', 'tg_crowd_bot_token'),
      envFirst('TELEGRAM_CHAT_ID', 'tg_chat_id'),
    ]);
  } catch (e) {
    console.log(`crowd: cannot reach engine_state — ${e instanceof Error ? e.message : e}`);
    return ok();
  }

  const sent = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!secret || !sent || sent !== secret) {
    console.log('crowd: rejected — bad or missing secret token');
    return new Response('forbidden', { status: 401 });
  }
  if (!token) { console.log('crowd: no bot token in engine_state'); return ok(); }

  let update: Record<string, any>;
  try { update = await req.json(); } catch { console.log('crowd: body was not json'); return ok(); }

  const cq = update.callback_query;
  // שום דבר לא נעלם בלי שורה בלוג. לחיצה שלא מייצרת תשובה ולא מייצרת רשומה
  // אינה ניתנת להבחנה מלחיצה שלא קרתה.
  if (!cq) {
    const kinds = Object.keys(update).filter(k => k !== 'update_id').join(',');
    console.log(`crowd: update ${update.update_id} is not a tap (${kinds}) — skipped`);
    return ok();
  }
  if (!cq.data) { console.log(`crowd: tap ${update.update_id} carried no data`); return ok(); }

  const [action, id, verb] = String(cq.data).split(':');

  if (action === 'ping') {
    console.log(`crowd: PING from ${cq.from && cq.from.username} — the webhook is live`);
    await tg(token, 'answerCallbackQuery',
      { callback_query_id: cq.id, text: '✅ הגיע מיידית! הוובהוק של הקהל עובד' });
    if (chatId) {
      await tg(token, 'sendMessage',
        { chat_id: chatId, text: '✅ הבדיקה עברה — בוט הקהל מחובר.' });
    }
    return ok();
  }

  if (action !== 'cw') {
    console.log(`crowd: UNRECOGNISED data "${cq.data}"`);
    await tg(token, 'answerCallbackQuery',
      { callback_query_id: cq.id, text: 'הכפתור הזה לא מוכר לי' });
    return ok();
  }

  let msg = 'הפריט לא נמצא (אולי כבר טופל)';
  try {
    const raw = await stateGet(`crowd_pending|${id}`);
    if (!raw) {
      console.log(`crowd: nothing pending for ${id}`);
    } else {
      const p = JSON.parse(raw);

      if (p.t === 'r' && verb === 'a') {
        await sb('POST', 'rating_approvals',
          { player_key: p.k, season: p.s, old_ovr: p.old, new_ovr: p.avg, votes: p.n },
          { Prefer: 'resolution=merge-duplicates' });
        msg = `✅ ${p.k} ${p.s} → ${p.avg} · ממתין ל-apply_crowd_ratings`;

      } else if (p.t === 'r' && verb === 'p') {
        if (p.pub) {
          await sb('DELETE', `crowd_published?player_key=eq.${encodeURIComponent(p.k)}` +
                             `&season=eq.${encodeURIComponent(p.s)}`);
          msg = `🚫 ${p.k} ${p.s} הוסתר מהציבור`;
        } else {
          await sb('POST', 'crowd_published', { player_key: p.k, season: p.s },
            { Prefer: 'resolution=merge-duplicates' });
          msg = `👁 ${p.k} ${p.s} מוצג לציבור (${p.avg})`;
        }

      } else if (p.t === 'r') {
        await sb('POST', 'rating_dismissals',
          { player_key: p.k, season: p.s, at_votes: p.n },
          { Prefer: 'resolution=merge-duplicates' });
        msg = `🗑️ ${p.k} ${p.s} ירד מהתור`;

      } else if (p.t === 'd' && verb === 'a') {
        await sb('POST', 'duo_approvals', { pair_key: p.p, votes: p.n },
          { Prefer: 'resolution=merge-duplicates' });
        msg = `✅ ${String(p.p).replace('|', ' + ')} · ממתין ל-apply_crowd_duos`;

      } else if (p.t === 'd') {
        await sb('POST', 'duo_dismissals', { pair_key: p.p, at_votes: p.n },
          { Prefer: 'resolution=merge-duplicates' });
        msg = `🗑️ ${String(p.p).replace('|', ' + ')} ירד מהתור`;
      }

      // מחרוזת ריקה = טופל, וזה מה שהשולח בודק לפני שהוא שולח שוב. בלי
      // השורה הזאת הפריט היה נחסם לנצח אחרי הלחיצה הראשונה.
      //
      // פרסום הוא היוצא מן הכלל: הוא מצב הפיך ולא החלטה סופית, אז הפריט
      // נשאר פתוח כדי שאפשר יהיה להסתיר שוב מאותה הודעה.
      if (verb !== 'p') await stateSet(`crowd_pending|${id}`, '');
    }
  } catch (e) {
    msg = 'שגיאה בשמירה — נסה שוב';
    console.log(`crowd: ${cq.data} failed — ${e instanceof Error ? e.message : e}`);
  }

  console.log(`crowd: ${cq.data} → ${msg}`);
  // answerCallbackQuery חותך מעל ~200 תווים; שם שחקן בעברית מגיע לשם מהר.
  await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id, text: msg.slice(0, 190) });
  if (chatId) await tg(token, 'sendMessage', { chat_id: chatId, text: msg });
  return ok();
});
