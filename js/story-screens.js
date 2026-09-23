/* ── מצב סיפור: screens ───────────────────────────────────────────────────────
 *
 * Four things, all rendered into existing surfaces:
 *   · the hub — the chapter cards (screen-story)
 *   · the market — the same renderer for summer (screen-story) and January (an
 *     overlay over the reveal, the way js/january.js opens its window)
 *   · the verdict — a box on the results screen (#story-end-box)
 * Colours come from the app's tokens only. This is a #0d1117 app.
 */
(function (global) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // "3.6 מ׳" — the shekel sign glued to a number flips around it in RTL
  // ("מ׳3.6₪"), and a budget screen already says what currency it is in.
  const money = n => `<bdi dir="ltr">${String(Math.round(n * 10) / 10)}</bdi> מ׳`;
  const num = n => `<bdi dir="ltr">${n}</bdi>`;
  const clubName = id => (typeof TEAMS !== 'undefined' && TEAMS[id] && TEAMS[id].name) || id;
  const posHe = p => (typeof POS_HE !== 'undefined' && POS_HE[p]) || p;

  function ensureStyle() {
    if (document.getElementById('story-style')) return;
    const s = document.createElement('style');
    s.id = 'story-style';
    s.textContent = `
.st-cards{display:grid;gap:12px}
.st-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px;text-align:right;color:var(--text);font-family:inherit;cursor:pointer;width:100%}
.st-card:hover{background:var(--hover)}
.st-card h3{margin:0 0 4px;font-size:18px}
.st-card .st-meta{color:var(--dim);font-size:13px}
.st-stars{color:var(--accent);letter-spacing:2px;font-size:16px}
.st-stars .off{color:var(--border)}
.st-intro{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px;margin:0 0 14px;line-height:1.7}
.st-goals{margin:10px 0 0;padding:0;list-style:none;font-size:14px}
.st-goals li{margin:3px 0}
.st-bar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.st-chip{flex:1;min-width:92px;background:var(--surface);border:1px solid var(--border);
  border-radius:9px;padding:8px;text-align:center}
.st-chip i{display:block;font-style:normal;font-size:11px;color:var(--dim)}
.st-chip b{font-size:18px}
.st-row{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
.st-row select,.st-row input{flex:1;min-width:120px;background:var(--surface);color:var(--text);
  border:1px solid var(--border);border-radius:8px;padding:8px;font-family:inherit}
.st-h{font-size:14px;color:var(--dim);margin:14px 0 6px}
.st-list{display:flex;flex-direction:column;gap:6px}
.st-p{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);
  border-radius:9px;padding:8px 10px}
.st-p.xi{border-color:var(--accent)}
.st-p .n{flex:1;min-width:0}
.st-p .n b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-p .n em{font-style:normal;font-size:12px;color:var(--dim)}
.st-p .o{font-weight:700;font-size:17px;width:30px;text-align:center}
.st-b{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:8px;
  padding:7px 10px;font-family:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
.st-b:hover{background:var(--hover)}
.st-b.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700}
.st-b[disabled]{opacity:.45;cursor:default}
.st-msg{min-height:20px;color:var(--accent);font-size:13px;margin:6px 0}
.st-go{width:100%;padding:13px;font-size:16px;margin:14px 0 4px}
.st-wrap{position:fixed;inset:0;z-index:9000;overflow-y:auto;background:rgba(0,0,0,.78);padding:16px}
.st-box{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);
  max-width:560px;margin:0 auto;padding:18px}
.st-end{background:var(--surface);border:1px solid var(--accent);border-radius:var(--radius);
  padding:16px;margin:14px 0;text-align:center}
.st-end .st-stars{font-size:28px}
.st-vs{display:flex;gap:8px;margin:12px 0}
.st-vs div{flex:1;background:var(--panel);border:1px solid var(--border);border-radius:9px;padding:8px}
.st-vs i{display:block;font-style:normal;font-size:11px;color:var(--dim)}
`;
    document.head.appendChild(s);
  }

  function starsHTML(arr) {
    return `<span class="st-stars">${[0, 1, 2].map(i =>
      `<span class="${arr && arr[i] ? '' : 'off'}">★</span>`).join('')}</span>`;
  }
  function root() { return document.getElementById('story-root'); }

  /* ── the hub ─────────────────────────────────────────────────────────────── */
  function storyShowHub() {
    ensureStyle();
    showScreen('story');
    const back = document.getElementById('story-back');
    if (back) back.onclick = () => showScreen('setup');
    const best = storyBest();
    const run = storyRun();
    root().innerHTML = `
      <p class="st-meta" style="color:var(--dim);margin:0 0 14px">רגעים אמיתיים מתולדות ליגת העל.
        אתה המועדון, עם הסגל והקופה של אותה עונה. תגיע למטרה, ואז תנסה לעקוף את המציאות.</p>
      <div class="st-cards">${STORY_CHAPTERS.filter(ch => !ch.hidden).map(ch => {
        const real = storyReal(ch);
        const b = best[ch.id];
        const live = run && run.chapterId === ch.id && run.phase !== 'done';
        return `<button class="st-card" data-ch="${ch.id}">
          <h3>${esc(clubName(ch.teamId))} ${esc(ch.season)}: ${esc(ch.title)}</h3>
          <div class="st-meta">במציאות: מקום ${real ? real.pos : '?'}, ${real ? real.pts : '?'} נק׳
            ${b ? ` · השיא שלך: ${num(b.score)}` : ''}${live ? ' · <b style="color:var(--accent)">בתהליך</b>' : ''}</div>
          ${starsHTML(b && b.stars)}
        </button>`;
      }).join('')}</div>`;
    root().querySelectorAll('.st-card').forEach(el => {
      el.onclick = () => storyShowIntro(el.dataset.ch);
    });
  }

  function storyShowIntro(chId) {
    const ch = storyChapter(chId);
    const run = storyRun();
    const live = run && run.chapterId === ch.id && run.phase === 'summer';
    const real = storyReal(ch);
    root().innerHTML = `
      <div class="st-intro">
        <h3 style="margin:0 0 8px">${esc(clubName(ch.teamId))} ${esc(ch.season)}: ${esc(ch.title)}</h3>
        <p style="margin:0">${esc(ch.intro)}</p>
        <ul class="st-goals">${ch.stars.map((s, i) =>
          `<li>${'★'.repeat(i + 1)} ${esc(s.label)}${s.type === 'beatPoints' && real ? ` (${real.pts})` : ''}</li>`).join('')}</ul>
        <p class="st-meta" style="color:var(--dim);margin:10px 0 0">תקציב פתיחה: ${money(ch.budget)} ·
          עד ${STORY_RULES.buys.summer} רכישות בקיץ ו-${STORY_RULES.buys.jan} בינואר</p>
      </div>
      <button class="st-b go st-go" id="st-begin">${live ? 'להמשיך את הקיץ' : 'להתחיל את הפרק'}</button>
      <button class="st-b st-go" id="st-hub">חזרה לפרקים</button>`;
    document.getElementById('st-begin').onclick = () => live ? storyShowMarket('summer') : storyStart(ch.id);
    document.getElementById('st-hub').onclick = storyShowHub;
  }

  /* ── the market (both windows) ───────────────────────────────────────────── */
  // ctx: { run, ch, window: 'summer'|'jan', statOf(name) → stats|null, host, onDone }
  function renderMarket(ctx) {
    const { run, ch } = ctx;
    const jan = ctx.window === 'jan';
    const valueOf = e => jan
      ? (e.squad.teamId === ch.teamId || run.own.some(r => r.squadId === e.squad.id && r.name === e.player.name)
          ? storyJanValue(e.player, ctx.statOf(e.player.name))
          : storyValueOfOvr(e.player.ovr))
      : storySummerValue(e.player, ch.season);
    const xiNames = new Set(storyBestXI(storyOwned(run), formationSlots(run.formationId, run.tactic))
      .filter(Boolean).map(e => e.player.name));
    const owned = storyOwned(run).sort((a, b) => b.player.ovr - a.player.ovr);
    const q = (ctx.q || '').trim();
    const pos = ctx.pos || '';
    // What you can afford first, then the best of what you cannot. A plain top-40
    // by rating showed a small budget nothing but disabled buttons — the whole
    // list above the money, and no way to find the signing that fits it.
    const priceOf = e => storyBuyPrice(valueOf(e), storyIsRival(ch, e.squad.teamId));
    const found = storyMarketPool(run, ch)
      .filter(e => (!q || e.player.name.includes(q) || clubName(e.squad.teamId).includes(q)) &&
                   (!pos || e.player.position === pos))
      .sort((a, b) => b.player.ovr - a.player.ovr);
    const fits = e => priceOf(e) <= run.budget + 1e-9;
    const pool = [...found.filter(fits).slice(0, 25), ...found.filter(e => !fits(e)).slice(0, 15)];
    const left = STORY_RULES.buys[ctx.window] - run.buys[ctx.window];
    const tactical = formationTactical(run.formationId);
    const positions = [...new Set(storyMarketPool(run, ch).map(e => e.player.position))].sort();

    ctx.host.innerHTML = `
      <p class="jan-kicker" style="color:var(--accent);margin:0 0 6px;font-weight:600">
        ${jan ? 'חלון ההעברות של ינואר' : 'חלון ההעברות של הקיץ'} · ${esc(clubName(ch.teamId))} ${esc(ch.season)}</p>
      ${jan ? `<p style="margin:0 0 10px;color:var(--dim);font-size:13px">המחירים של השחקנים שלך
        מתעדכנים לפי מה שעשו בחצי העונה.</p>` : ''}
      <div class="st-bar">
        <div class="st-chip"><i>תקציב</i><b>${money(run.budget)}</b></div>
        <div class="st-chip"><i>רכישות שנשארו</i><b>${left}</b></div>
        <div class="st-chip"><i>סגל</i><b>${run.own.length}</b></div>
        <div class="st-chip"><i>דירוג ההרכב</i><b>${storyXiOvr(run)}</b></div>
      </div>
      <div class="st-row">
        <select id="st-form">${Object.keys(FORMATIONS).map(k =>
          `<option value="${k}"${k === run.formationId ? ' selected' : ''}>${esc(FORMATIONS[k].label)}</option>`).join('')}</select>
        <select id="st-tac"${tactical ? '' : ' disabled'}>${TACTIC_KEYS.map(k =>
          `<option value="${k}"${k === run.tactic ? ' selected' : ''}>${esc(TACTICS[k].label)}</option>`).join('')}</select>
      </div>
      <div class="st-msg" id="st-msg">${esc(ctx.msg || '')}</div>
      <div class="st-h">הסגל שלך. ההרכב (במסגרת צהובה) נבחר אוטומטית מהטובים לכל עמדה</div>
      <div class="st-list">${owned.map((e, i) => {
        const price = storySellPrice(valueOf(e));
        const st = jan ? ctx.statOf(e.player.name) : null;
        const line = st ? ` · ${st.goals} ש׳ ${st.assists} ב׳${st.cs ? ` ${st.cs} נקיים` : ''}` : '';
        return `<div class="st-p${xiNames.has(e.player.name) ? ' xi' : ''}">
          <span class="o">${e.player.ovr}</span>
          <span class="n"><b>${esc(e.player.name)}</b><em>${esc(posHe(e.player.position))}${line}</em></span>
          <button class="st-b" data-sell="${i}">מכור ${money(price)}</button></div>`;
      }).join('')}</div>
      <div class="st-h">השוק</div>
      <div class="st-row">
        <input id="st-q" placeholder="חיפוש שחקן או מועדון" value="${esc(q)}">
        <select id="st-pos"><option value="">כל העמדות</option>${positions.map(p =>
          `<option value="${p}"${p === pos ? ' selected' : ''}>${esc(posHe(p))}</option>`).join('')}</select>
      </div>
      <div class="st-list">${pool.map((e, i) => {
        const rival = storyIsRival(ch, e.squad.teamId);
        const price = storyBuyPrice(valueOf(e), rival);
        const can = left > 0 && price <= run.budget + 1e-9;
        return `<div class="st-p">
          <span class="o">${e.player.ovr}</span>
          <span class="n"><b>${esc(e.player.name)}</b><em>${esc(posHe(e.player.position))} ·
            ${esc(clubName(e.squad.teamId))}${rival ? ' · יריבה +50%' : ''}</em></span>
          <button class="st-b" data-buy="${i}"${can ? '' : ' disabled'}>קנה ${money(price)}</button></div>`;
      }).join('')}</div>
      <button class="st-b go st-go" id="st-done">${jan ? 'להמשיך את העונה' : 'לפתיחת העונה'}</button>`;

    const redraw = msg => renderMarket({ ...ctx, msg });
    ctx.host.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const e = owned[+b.dataset.sell];
      const why = storySell(run, e, storySellPrice(valueOf(e)));
      if (!why && ctx.persist) ctx.persist();
      redraw(why || `${e.player.name} נמכר`);
    });
    ctx.host.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const e = pool[+b.dataset.buy];
      const why = storyBuy(run, ch, e, storyBuyPrice(valueOf(e), storyIsRival(ch, e.squad.teamId)));
      if (!why && ctx.persist) ctx.persist();
      redraw(why || `${e.player.name} הצטרף`);
    });
    document.getElementById('st-form').onchange = ev => {
      run.formationId = ev.target.value;
      if (!formationTactical(run.formationId)) run.tactic = 'bal';
      if (ctx.persist) ctx.persist();
      redraw('');
    };
    document.getElementById('st-tac').onchange = ev => {
      run.tactic = ev.target.value;
      if (ctx.persist) ctx.persist();
      redraw('');
    };
    const qEl = document.getElementById('st-q');
    qEl.onchange = () => renderMarket({ ...ctx, q: qEl.value, msg: '' });
    document.getElementById('st-pos').onchange = ev => renderMarket({ ...ctx, pos: ev.target.value, msg: '' });
    document.getElementById('st-done').onclick = ctx.onDone;
  }

  function storyShowMarket() {
    ensureStyle();
    const run = storyRun();
    const ch = run && storyChapter(run.chapterId);
    if (!ch) { storyShowHub(); return; }
    showScreen('story');
    renderMarket({ run, ch, window: 'summer', statOf: () => null, host: root(),
                   persist: storySave, onDone: storyEnterSeason });
  }

  function storyShowJanuary(pair, tally, draft, onDone) {
    ensureStyle();
    const ch = storyChapter(draft.chapterId);
    const wrap = document.createElement('div');
    wrap.className = 'st-wrap';
    const pts = tally.wins * 3 + tally.draws;
    wrap.innerHTML = `<div class="st-box" role="dialog" aria-modal="true">
      <p style="margin:0 0 10px;color:var(--dim);font-size:13px">חצי הדרך:
        <b dir="ltr" style="color:var(--text)">${tally.wins}-${tally.draws}-${tally.losses}</b>,
        ${pts} נק׳ אחרי ${pair.played} מחזורים</p>
      <div id="st-jan"></div></div>`;
    document.body.appendChild(wrap);
    const statOf = name => pair.firstStats.find(s => s.name === name) || null;
    renderMarket({ run: draft, ch, window: 'jan', statOf, host: wrap.querySelector('#st-jan'),
                   onDone: () => { wrap.remove(); onDone(); } });
  }

  /* ── the verdict ─────────────────────────────────────────────────────────── */
  function storyRenderEnd(ch, r) {
    ensureStyle();
    const box = document.getElementById('story-end-box');
    if (!box || !r) return;
    const real = storyReal(ch);
    const best = storyBest()[ch.id];
    box.innerHTML = `<div class="st-end">
      <p style="margin:0 0 4px;color:var(--dim);font-size:13px">${esc(clubName(ch.teamId))} ${esc(ch.season)}: ${esc(ch.title)}</p>
      ${starsHTML(r.stars)}
      <ul class="st-goals" style="text-align:right">${ch.stars.map((s, i) => {
        // Graded: the first star missed is ❌, the ones after it are locked, not failed.
        const miss = r.stars.indexOf(false);
        const mark = r.stars[i] ? '✅' : (i === miss ? '❌' : '🔒');
        return `<li>${mark} ${esc(s.label)}</li>`;
      }).join('')}</ul>
      <div class="st-vs">
        <div><i>אתם</i><b>מקום ${r.rank} · ${num(r.points)} נק׳</b></div>
        <div><i>המציאות</i><b>מקום ${real ? real.pos : '?'} · ${real ? real.pts : '?'} נק׳</b></div>
      </div>
      <p style="margin:0 0 4px">תקציב בסוף: <b>${money(r.budget)}</b> (פתיחה: ${money(ch.budget)})</p>
      <p style="margin:0 0 12px">ניקוד: <b>${num(r.score)}</b>${best ? ` · השיא שלך: <b>${num(best.score)}</b>` : ''}</p>
      <div style="display:flex;gap:8px">
        <button class="st-b go" id="st-again" style="flex:1">לשחק שוב</button>
        <button class="st-b" id="st-chapters" style="flex:1">לפרקים</button>
      </div></div>`;
    document.getElementById('st-again').onclick = () => storyStart(ch.id);
    document.getElementById('st-chapters').onclick = storyExit;
  }

  // Any season that is NOT a chapter must not show the last chapter's verdict.
  function storyClearEnd() {
    const box = document.getElementById('story-end-box');
    if (box) box.innerHTML = '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('setup-story-card');
    if (card) card.addEventListener('click', storyShowHub);
  });

  Object.assign(global, { storyShowHub, storyShowIntro, storyShowMarket, storyShowJanuary,
                          storyRenderEnd, storyClearEnd });
})(typeof window !== 'undefined' ? window : globalThis);
