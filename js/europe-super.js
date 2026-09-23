// The UEFA Super Cup.
//
// Lift the Champions League or the Europa League and the summer is not over:
// one more night, against whoever won the OTHER one. The Conference League is
// not invited, exactly as in reality.
//
// It hangs off the end of the European campaign rather than the start of the
// next season, for one structural reason: a new season deletes the campaign
// (js/game.js clears d.europe), and the campaign is where the XI that won the
// trophy is frozen. So the Super Cup is played by the side that earned it, on
// the same screen, straight after the trophy. That also makes it open to every
// mode that plays Europe — the draft and the career alike. In a career it lands
// on the same season row as the trophy that bought the ticket.
//
// One match, neutral ground, and no extra time: level after ninety goes
// straight to penalties, the modern format. The European night applies — this
// is a final, and the opponent is by definition one of the best in Europe.

const EU_USC = {
  name: 'הסופר-קאפ האירופי',
  short: 'סופר-קאפ',
  trophy: 'זוכת הסופר-קאפ האירופי',
};

// Who may play it: a won campaign, in a competition UEFA actually sends to
// the Super Cup.
function euUscEligible(c) {
  return !!c && c.result === 'won' && (c.tier === 'ucl' || c.tier === 'uel');
}

function euUscView(c) { return !!c && typeof c.view === 'string' && c.view.indexOf('usc-') === 0; }

// The other competition's winner. We do not simulate the other bracket, so its
// winner is drawn from the top pot of its field — the clubs that win these.
function euUscBegin(c) {
  if (!c.usc) {
    const from = c.tier === 'ucl' ? 'uel' : 'ucl';
    const beaten = new Set(c.ties.map(t => t.club.name));
    const pot = EU_TIERS[from].pots[0].filter(x => !beaten.has(x.name));
    const club = pot[Math.floor(Math.random() * pot.length)];
    c.usc = {
      kind: 'usc', from, club: { ...club }, lines: euLines(club.ovr),
      legs: [], oneLeg: true, round: EU_USC.short, roundLong: EU_USC.name,
    };
  }
  c.view = 'usc-pre';
  euSave(c);
}

// Played once and kept, so a refresh mid-match replays the same ninety minutes.
function euUscPlay(c) {
  const t = c.usc;
  if (t.legs.length) return t.legs[0];

  const opp = { name: t.club.name, ovr: t.club.ovr, ...t.lines };
  const me = euNightLines(euMe(c), t.club.ovr, c.caps);
  const leg = euSimMatch(me, opp, null);
  leg.leg = 1;
  try { simulatePlayerStats([leg]); } catch (e) { leg.scorers = leg.scorers || []; }
  leg.events = euLegEvents(leg, t.club.name);
  t.legs.push(leg);

  t.pens = null;
  if (leg.gf === leg.ga) {
    const mine = 3 + (Math.random() < 0.5 ? 1 : 0);
    t.pens = { gf: mine, ga: mine === 4 ? 3 : 4 };
  }
  t.agg = { gf: leg.gf, ga: leg.ga };
  t.won = t.pens ? t.pens.gf > t.pens.ga : leg.gf > leg.ga;

  // The sandbox forces results the same way the campaign does — by mirroring.
  const want = typeof euForcedOutcome === 'function' ? euForcedOutcome('final') : null;
  if (want && (want === 'W') !== t.won) euMirrorTie(t);

  if (!c.sandbox && typeof crRecordSuperCup === 'function' && state && state.career &&
      typeof crHasRun === 'function' && crHasRun()) {
    crRecordSuperCup(state.career.year, t.won);
  }
  euSave(c);
  return leg;
}

// The achievement. Sent when the result SCREEN arrives, not when the match is
// simulated — a toast during the live clock would give the score away. Once per
// Super Cup, because the server counts it.
async function euUscSubmit(c) {
  const t = c.usc;
  if (!t || !t.legs.length || t.submitted || c.sandbox) return;
  t.submitted = true;
  euSave(c);
  if (typeof track === 'function') track('finish', 'europe', t.won ? 'super-won' : 'super-lost');
  if (!t.won || typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
  try {
    const r = await _supabase.rpc('submit_super_cup', { p: { won: true, tier: c.tier } });
    const got = (r && r.data && r.data.achievements) || [];
    if (got.length && typeof showAchievementToasts === 'function') showAchievementToasts(got);
  } catch (e) {}
}

/* ── screens ──────────────────────────────────────────────────────────────── */
function euUscPreHTML(c) {
  const t = c.usc;
  return `
    <div class="eu-card eu-usc-pre">
      <div class="eu-usc-art">${typeof trophySVG === 'function' ? trophySVG('usc', { size: 64 }) : '🏆'}</div>
      <div class="eu-trophy-t">${EU_USC.name}</div>
      <div class="eu-usc-vs">
        <span class="eu-side">${euMyCrest(true)} ${myTeamName(euText('eu-you', 'ההרכב שלי'))}
          <i>${euTier(c).trophy}</i></span>
        <b>${euText('eu-vs', 'מול')}</b>
        <span class="eu-side">${euBigCrest(t.club.id, t.club.flag, t.club.name)} ${t.club.name}
          <i>${EU_TIERS[t.from].trophy}</i></span>
      </div>
      <p class="eu-note">${euText('eu-usc-rules',
        'משחק אחד, מגרש ניטרלי. תיקו אחרי 90 דקות - ישר לפנדלים, בלי הארכה.')}</p>
    </div>`;
}

function euUscEndHTML(c) {
  const t = c.usc, leg = t.legs[0];
  // The shootout names its winner outright. "ליון 1-1 בפנדלים 4-3" put the word
  // beside the opponent and read as THEIR shootout, on a night you had won it.
  const hi = t.pens ? Math.max(t.pens.gf, t.pens.ga) : 0, lo = t.pens ? Math.min(t.pens.gf, t.pens.ga) : 0;
  const pens = t.pens ? `<p class="eu-note">${t.won ? euText('eu-usc-pens-won', 'ניצחת בפנדלים')
    : `${t.club.name} ${euText('eu-usc-pens-lost', 'ניצחה בפנדלים')}`} <bdi dir="ltr">${hi}-${lo}</bdi></p>` : '';
  const scorers = (leg.scorers || []).map(s => `${s.n} ${s.min}'`).join(' · ');
  const art = typeof trophySVG === 'function' ? trophySVG('usc', { size: 72, muted: !t.won }) : '🏆';
  return `
    <div class="eu-card ${t.won ? 'eu-trophy' : 'lost'}">
      <div class="eu-usc-art">${art}</div>
      <div class="eu-trophy-t">${t.won ? EU_USC.trophy : euText('eu-usc-lost', 'הסופר-קאפ נשאר אצלם')}</div>
      <!-- RTL row: your side on the right. The score is dir=ltr, so its first
           number is leftmost and must be the OPPONENT's, beside their name. -->
      <div class="eu-usc-vs">
        <span class="eu-side">${euMyCrest(true)} ${myTeamName(euText('eu-you', 'ההרכב שלי'))}</span>
        <b class="eu-usc-sc" dir="ltr">${leg.ga} – ${leg.gf}</b>
        <span class="eu-side">${euBigCrest(t.club.id, t.club.flag, t.club.name)} ${t.club.name}</span>
      </div>
      ${pens}
      ${scorers ? `<p class="eu-note">⚽ ${scorers}</p>` : ''}
      <p class="eu-note">${t.won
        ? euText('eu-usc-won-sub', 'שני גביעים אירופיים בקיץ אחד. אין הרבה קבוצות בעולם שיכולות להגיד את זה.')
        : euText('eu-usc-lost-sub', 'הגביע האירופי שלך לא הולך לשום מקום. רק הלילה הזה.')}</p>
    </div>`;
}

// Called from euRender for every usc-* view. Same frame, same single button.
function euUscRender(c, body) {
  let html = '', cta = '', onNext = null;

  if (c.view === 'usc-live') {
    const leg = euUscPlay(c);
    html = euLiveHTML(c, c.usc, leg);
    body.innerHTML = euShell(c, html, euCta(euText('eu-skip', '⏩ דלג לסוף המשחק'), 'eu-skip')) + euAdminBlock();
    euWireCommon(body, c);
    const skip = euPlayClock(leg, () => {
      const btn = document.getElementById('eu-skip');
      if (!btn) return;
      btn.textContent = c.usc.pens ? euText('eu-usc-to-pens', 'לפנדלים →')
                                   : euText('eu-see-agg', 'לתוצאה →');
      btn.onclick = () => { c.view = 'usc-end'; euSave(c); euRender(); };
    });
    const btn = document.getElementById('eu-skip');
    if (btn) btn.onclick = () => skip();
    return;
  }

  if (c.view === 'usc-pre') {
    html = euUscPreHTML(c);
    cta = euCta(euText('eu-usc-kickoff', 'לשריקת הפתיחה →'));
    onNext = () => { c.view = 'usc-live'; euSave(c); euRender(); };
  } else {
    euUscSubmit(c);
    html = euUscEndHTML(c);
    cta = euCta(euText('eu-back', '← חזרה לתוצאות העונה'));
    onNext = euLeave;
  }
  body.innerHTML = euShell(c, html, cta) + euAdminBlock();
  euWireCommon(body, c);
  const next = document.getElementById('eu-next');
  if (next && onNext) next.onclick = onNext;
}
