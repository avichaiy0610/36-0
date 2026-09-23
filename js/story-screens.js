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
  // Money is thousands of ₪: 2500 → "2.5 מיליון", 350 → "350 אלף". No shekel sign —
  // glued to a number it flips around it in RTL, and the screen says what it is in.
  const money = n => n >= 1000
    ? `<bdi dir="ltr">${String(Math.round(n / 10) / 100)}</bdi> מיליון`
    : `<bdi dir="ltr">${Math.round(n)}</bdi> אלף`;
  const num = n => `<bdi dir="ltr">${n}</bdi>`;
  // What you type is whole shekels, with separators: "1,500,000". The owner could
  // not tell what "1500" in a box marked "אלף" meant; nobody misreads a full sum.
  const shekels = k => (Math.round(k) * 1000).toLocaleString('en-US');
  const parseK = str => Math.round((Number(String(str).replace(/[^\d]/g, '')) || 0) / 1000);
  const amountBox = (attr, k) => `<span class="st-amtw"><input class="st-amt" ${attr} type="text"
    inputmode="numeric" dir="ltr" value="${shekels(k)}"><span class="st-unit">₪</span></span>`;
  // Keeps the box readable as you type, and says the sum back in words.
  function wireAmount(inp, sayEl) {
    const sync = () => {
      const k = parseK(inp.value);
      inp.value = k ? shekels(k) : '';
      if (sayEl) sayEl.innerHTML = k ? `ההצעה שלך: <b>${money(k)} ₪</b>` : '';
    };
    inp.addEventListener('input', () => {
      const k = parseK(inp.value);
      if (sayEl) sayEl.innerHTML = k ? `ההצעה שלך: <b>${money(k)} ₪</b>` : '';
    });
    inp.addEventListener('blur', sync);
    sync();
  }
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
.st-kick{color:var(--accent);margin:0 0 6px;font-weight:600}
.st-note{margin:0 0 10px;color:var(--dim);font-size:13px}
.st-group{margin:0 0 10px}
.st-gh{font-size:13px;color:var(--dim);margin:10px 0 5px}
.st-gh b{color:var(--text);font-size:14px}
.st-short{color:#f85149;font-weight:700}
.st-empty{color:var(--dim);font-size:13px;padding:4px 2px}
.st-tag{display:inline-block;font-size:11px;border:1px solid var(--border);border-radius:6px;
  padding:0 5px;margin-inline-start:4px;color:var(--accent)}
.st-bid{background:var(--surface);border:1px solid var(--accent);border-radius:9px;padding:9px 10px;font-size:14px}
.st-btns{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:7px}
.st-quick .st-b{font-size:12px;padding:5px 8px}
.st-talk{background:var(--panel);border:1px solid var(--border);border-top:none;
  border-radius:0 0 9px 9px;margin:-4px 0 0;padding:10px}
.st-say{font-size:14px;margin:0 0 4px}
.st-amt{width:96px;background:var(--surface);color:var(--text);border:1px solid var(--border);
  border-radius:8px;padding:7px;font-family:inherit;font-size:14px}
.st-unit{font-size:13px;color:var(--dim)}
.st-amtw{display:inline-flex;align-items:center;gap:5px}
.st-amt{width:130px}
.st-amtsay{font-size:13px;color:var(--dim);min-height:18px;margin-top:4px}
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
  // ctx: { run, ch, window: 'summer'|'jan', statOf(name) → stats|null, host, persist?, onDone,
  //        q, pos — the market filters; open — the player being negotiated; msg }
  //
  // Nothing here has a price tag. Buying is a negotiation with the selling club
  // (storyOffer); selling is putting a player on the market and answering the
  // bids that come (storyListPlayer / storyCourt). The squad is grouped by
  // position with a count against what the shape needs.
  function renderMarket(ctx) {
    const { run, ch } = ctx;
    const jan = ctx.window === 'jan';
    const keyOf = e => e.squad.id + '|' + e.player.name;
    const ownKeys = new Set(run.own.map(r => r.squadId + '|' + r.name));
    const mine = e => ownKeys.has(keyOf(e));
    // Your own players are priced by what they did (January); everyone else by name.
    const valueOf = e => jan
      ? (mine(e) ? storyJanValue(e.player, ctx.statOf(e.player.name)) : storyValueOfOvr(e.player.ovr))
      : storySummerValue(e.player, ch.season);
    const owned = storyOwned(run).sort((a, b) => b.player.ovr - a.player.ovr);

    // Clubs come for the men who are making news: January's performers, and in
    // summer the ones who arrived with last season's goals behind them.
    const courted = e => jan
      ? storyPerfBonus(e.player.position, ctx.statOf(e.player.name)) >= 3
      : storySummerValue(e.player, ch.season) > storyValueOfOvr(e.player.ovr);
    const fresh = storyCourt(run, ch, owned, valueOf, courted);
    if (fresh.length && ctx.persist) ctx.persist();

    const slots = formationSlots(run.formationId, run.tactic);
    const xiNames = new Set(storyBestXI(owned, slots).filter(Boolean).map(e => e.player.name));
    const needs = storyGroupNeeds(slots);
    const left = STORY_RULES.buys[ctx.window] - run.buys[ctx.window];
    const tactical = formationTactical(run.formationId);
    const bids = storyLiveOffers(run);

    // the market list: what you can afford first, then the best of what you cannot
    const q = (ctx.q || '').trim();
    const pos = ctx.pos || '';
    const askOf = e => storyAsk(run, ch, e, valueOf(e));
    const found = storyMarketPool(run, ch)
      .filter(e => (!q || e.player.name.includes(q) || clubName(e.squad.teamId).includes(q)) &&
                   (!pos || e.player.position === pos))
      .sort((a, b) => b.player.ovr - a.player.ovr);
    const fits = e => { const a = askOf(e); return !a.notForSale && a.ask <= run.budget; };
    const pool = [...found.filter(fits).slice(0, 25), ...found.filter(e => !fits(e)).slice(0, 15)];
    const positions = [...new Set(storyMarketPool(run, ch).map(e => e.player.position))].sort();

    const statLine = e => {
      const st = jan ? ctx.statOf(e.player.name) : null;
      return st ? ` · ${st.goals} ש׳ ${st.assists} ב׳${st.cs ? ` ${st.cs} נקיים` : ''}` : '';
    };
    const playerRow = (e, right) => `
      <div class="st-p${xiNames.has(e.player.name) ? ' xi' : ''}">
        <span class="o">${e.player.ovr}</span>
        <span class="n"><b>${esc(e.player.name)}</b><em>${esc(posHe(e.player.position))}${statLine(e)}</em></span>
        ${right}</div>`;

    // ── bids on your players
    const bidsHTML = bids.length ? `
      <div class="st-h">הצעות על השחקנים שלך</div>
      <div class="st-list">${bids.map(o => `
        <div class="st-bid">
          <div><b>${esc(storyBidderName(o.club))}</b> מציעה <b>${money(o.amount)} ₪</b> על ${esc(o.name)}
            ${o.unsolicited ? '<span class="st-tag">פנייה יזומה</span>' : ''}
            ${o.round ? `<span class="st-tag">נשארו ${STORY_RULES.bidRounds - o.round} בקשות</span>` : ''}</div>
          <div class="st-btns">
            <button class="st-b go" data-bid-ok="${esc(o.id)}">לקבל ${money(o.amount)} ₪</button>
            <button class="st-b" data-bid-no="${esc(o.id)}">לדחות</button>
          </div>
          <div class="st-btns">
            ${amountBox(`data-bid-amt="${esc(o.id)}"`, storyK(o.amount * 1.15))}
            <button class="st-b" data-bid-more="${esc(o.id)}">לבקש את הסכום</button>
          </div>
          <div class="st-amtsay" data-bid-say="${esc(o.id)}"></div></div>`).join('')}</div>` : '';

    // ── the squad, by position
    const squadHTML = STORY_GROUPS.map(g => {
      const inG = owned.filter(e => storyGroupOf(e.player.position) === g.id);
      const need = needs[g.id];
      const short = inG.length < need;
      return `<div class="st-group">
        <div class="st-gh"><b>${g.label}</b> <span>${inG.length} בסגל</span>
          ${need ? `<span class="${short ? 'st-short' : ''}">· המערך צריך ${need}</span>` : ''}</div>
        <div class="st-list">${inG.map(e => {
          const n = bids.filter(o => o.squadId === e.squad.id && o.name === e.player.name).length;
          return playerRow(e, n
            ? `<span class="st-tag">${n === 1 ? 'הצעה אחת' : n + ' הצעות'} ↑</span>`
            : `<button class="st-b" data-list="${esc(keyOf(e))}">להציע למכירה</button>`);
        }).join('') || '<div class="st-empty">אין</div>'}</div></div>`;
    }).join('');

    // ── the market, and the one negotiation that is open
    const talkHTML = e => {
      const t = storyTalk(run, ch, e, valueOf(e));
      const lastLine = ctx.talkMsg && ctx.open === keyOf(e) ? `<div class="st-say">${ctx.talkMsg}</div>` : '';
      if (t.nfs) return `<div class="st-talk"><div class="st-say">${esc(clubName(e.squad.teamId))}: "הוא לא למכירה. לא משנה כמה."</div></div>`;
      const roundsLeft = STORY_RULES.talkRounds - t.round;
      const dflt = storyK(t.ask * 0.85);
      return `<div class="st-talk">
        ${lastLine}
        <div class="st-say">${esc(clubName(e.squad.teamId))} ${t.round ? 'עומדת על' : 'מבקשת'} <b>${money(t.ask)} ₪</b>
          ${t.closed ? '' : `· נשארו ${roundsLeft} הצעות`}</div>
        ${t.closed && !t.lastCounter ? '' : `
        <div class="st-btns">
          ${t.closed ? '' : `${amountBox('id="st-amt"', dflt)}
          <button class="st-b go" data-offer="${esc(keyOf(e))}">להגיש הצעה</button>`}
          ${t.lastCounter ? `<button class="st-b go" data-take="${esc(keyOf(e))}">לקבל ${money(t.ask)} ₪</button>` : ''}
        </div>
        ${t.closed ? '' : `<div class="st-amtsay" id="st-amt-say"></div>
        <div class="st-btns st-quick">
          ${[0.7, 0.8, 0.9].map(f => `<button class="st-b" data-quick="${storyK(t.ask * f)}">${Math.round(f * 100)}% · ${money(storyK(t.ask * f))}</button>`).join('')}
        </div>`}`}
      </div>`;
    };
    const marketHTML = pool.map(e => {
      const a = askOf(e);
      const tags = [a.rival ? 'יריבה' : '', a.key ? 'שחקן מפתח' : '', a.notForSale ? 'לא למכירה' : '']
        .filter(Boolean).map(s => `<span class="st-tag">${s}</span>`).join('');
      const k = keyOf(e);
      const open = ctx.open === k;
      return `<div class="st-mkt">
        <div class="st-p">
          <span class="o">${e.player.ovr}</span>
          <span class="n"><b>${esc(e.player.name)}</b><em>${esc(posHe(e.player.position))} ·
            ${esc(clubName(e.squad.teamId))} ${tags}</em></span>
          <button class="st-b" data-talk="${esc(k)}"${a.notForSale || left <= 0 ? ' disabled' : ''}>
            ${open ? 'לסגור' : 'מו״מ'}</button>
        </div>${open ? talkHTML(e) : ''}</div>`;
    }).join('');

    ctx.host.innerHTML = `
      <p class="st-kick">${jan ? 'חלון ההעברות של ינואר' : 'חלון ההעברות של הקיץ'} · ${esc(clubName(ch.teamId))} ${esc(ch.season)}</p>
      ${jan ? `<p class="st-note">הערך של השחקנים שלך מתעדכן לפי מה שעשו בחצי העונה, ומי שהופיע מושך הצעות.</p>` : ''}
      <div class="st-bar">
        <div class="st-chip"><i>תקציב</i><b>${money(run.budget)} ₪</b></div>
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
      <div class="st-msg" id="st-msg">${ctx.msg || ''}</div>
      ${bidsHTML}
      <div class="st-h">הסגל שלך. ההרכב (במסגרת צהובה) נבחר אוטומטית מהטובים לכל עמדה</div>
      ${squadHTML}
      <div class="st-h">השוק. לחץ "מו״מ" כדי לפתוח משא ומתן עם המועדון</div>
      <div class="st-row">
        <input id="st-q" placeholder="חיפוש שחקן או מועדון" value="${esc(q)}">
        <select id="st-pos"><option value="">כל העמדות</option>${positions.map(p =>
          `<option value="${p}"${p === pos ? ' selected' : ''}>${esc(posHe(p))}</option>`).join('')}</select>
      </div>
      <div class="st-list">${marketHTML}</div>
      <button class="st-b go st-go" id="st-done">${jan ? 'להמשיך את העונה' : 'לפתיחת העונה'}</button>`;

    const redraw = extra => renderMarket({ ...ctx, ...extra });
    const saved = () => { if (ctx.persist) ctx.persist(); };
    const byKey = k => [...owned, ...pool].find(e => keyOf(e) === k);
    const $ = sel => ctx.host.querySelectorAll(sel);

    $('[data-list]').forEach(b => b.onclick = () => {
      const e = byKey(b.dataset.list);
      const made = storyListPlayer(run, ch, e, valueOf(e));
      saved();
      redraw({ msg: made.length
        ? `${esc(e.player.name)} בשוק: ${made.length === 1 ? 'הגיעה הצעה אחת' : `הגיעו ${made.length} הצעות`}`
        : `אף מועדון לא הציע על ${esc(e.player.name)}` });
    });
    $('[data-bid-ok]').forEach(b => b.onclick = () => {
      const o = bids.find(x => x.id === b.dataset.bidOk);
      const why = storyAcceptBid(run, o.id);
      saved();
      redraw({ msg: why ? esc(why) : `${esc(o.name)} נמכר ל${esc(storyBidderName(o.club))} ב-${money(o.amount)} ₪` });
    });
    $('[data-bid-no]').forEach(b => b.onclick = () => {
      storyRejectBid(run, b.dataset.bidNo);
      saved();
      redraw({ msg: 'ההצעה נדחתה' });
    });
    $('[data-bid-more]').forEach(b => b.onclick = () => {
      const o = bids.find(x => x.id === b.dataset.bidMore);
      const inp = ctx.host.querySelector(`[data-bid-amt="${o.id}"]`);
      const club = esc(storyBidderName(o.club));
      const r = storyPushBid(run, o.id, parseK(inp && inp.value));
      saved();
      redraw({ msg: r.kind === 'accept' ? `${club} הסכימה: ${esc(o.name)} נמכר ב-${money(r.amount)} ₪`
        : r.kind === 'counter' ? `${club}: "לא בסכום הזה. אנחנו מעלים ל-${money(r.amount)} ₪."`
        : r.kind === 'walk' ? `${club} ירדה מהעסקה`
        : esc(r.why) });
    });
    $('[data-talk]').forEach(b => b.onclick = () => {
      const k = b.dataset.talk;
      redraw({ open: ctx.open === k ? null : k, talkMsg: '', msg: '' });
    });
    $('[data-quick]').forEach(b => b.onclick = () => {
      const inp = document.getElementById('st-amt');
      if (inp) { inp.value = shekels(Number(b.dataset.quick)); inp.dispatchEvent(new Event('blur')); }
    });
    const amt = document.getElementById('st-amt');
    if (amt) wireAmount(amt, document.getElementById('st-amt-say'));
    $('[data-bid-amt]').forEach(inp => wireAmount(inp, ctx.host.querySelector(`[data-bid-say="${inp.dataset.bidAmt}"]`)));
    $('[data-offer]').forEach(b => b.onclick = () => {
      const e = byKey(b.dataset.offer);
      const amount = parseK(document.getElementById('st-amt').value);
      const r = storyOffer(run, ch, e, valueOf(e), amount);
      saved();
      const club = esc(clubName(e.squad.teamId));
      if (r.kind === 'accept') {
        redraw({ open: null, msg: `סגרנו! ${esc(e.player.name)} הצטרף ב-${money(r.price)} ₪` });
      } else if (r.kind === 'counter') {
        redraw({ talkMsg: `${club}: "בשביל ${money(r.counter)} ₪ הוא שלך."` });
      } else if (r.kind === 'reject') {
        redraw({ talkMsg: r.left > 0 ? `${club} דחתה את ההצעה.` : `${club} דחתה, והפסיקה לענות.` });
      } else {
        redraw({ talkMsg: esc(r.why) });
      }
    });
    $('[data-take]').forEach(b => b.onclick = () => {
      const e = byKey(b.dataset.take);
      const r = storyTakeCounter(run, ch, e, valueOf(e));
      saved();
      redraw(r.kind === 'accept'
        ? { open: null, msg: `סגרנו! ${esc(e.player.name)} הצטרף ב-${money(r.price)} ₪` }
        : { talkMsg: esc(r.why) });
    });
    document.getElementById('st-form').onchange = ev => {
      run.formationId = ev.target.value;
      if (!formationTactical(run.formationId)) run.tactic = 'bal';
      saved();
      redraw({ msg: '' });
    };
    document.getElementById('st-tac').onchange = ev => {
      run.tactic = ev.target.value;
      saved();
      redraw({ msg: '' });
    };
    const qEl = document.getElementById('st-q');
    qEl.onchange = () => redraw({ q: qEl.value, msg: '', open: null });
    document.getElementById('st-pos').onchange = ev => redraw({ pos: ev.target.value, msg: '', open: null });
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
