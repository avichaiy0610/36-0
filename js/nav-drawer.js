// The phone nav: one drawer instead of a strip that could not hold it.
//
// The gauntlet reached 11% of visitors while every other mode in the bar reached
// 24-28%. Its nav button is the ONLY way into the mode anywhere in the app, and
// on a 390px phone it sat more than a full screen past the right edge of a
// horizontally-scrolling strip. Shortening the strip could not fix it: five
// modes do not fit in the ~262px a phone leaves once the logo, the menu button
// and the login button are pinned. A drawer has no fold to fall past.
//
// Nothing here builds a menu. `.nav-actions` already holds every button; below
// 620px CSS turns that same element into the drawer, and this file only opens
// and closes it. No duplicated ids, no second set of listeners, and auth.js goes
// on driving #nav-user and #nav-login exactly as before.
(function () {
  const MOBILE = '(max-width: 620px)';
  let lastFocus = null;

  const el = id => document.getElementById(id);
  const isMobile = () => window.matchMedia(MOBILE).matches;
  const isOpen = () => {
    const a = el('nav-actions');
    return !!a && a.classList.contains('nav-open');
  };

  function setOpen(open) {
    const drawer = el('nav-actions');
    const bd     = el('nav-bd');
    const burger = el('nav-burger');
    if (!drawer || !burger) return;

    drawer.classList.toggle('nav-open', open);
    if (bd) bd.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    // The page behind a drawer must not scroll under the finger.
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      lastFocus = document.activeElement;
      // the first thing worth reaching, not whatever happens to be first in DOM
      const first = drawer.querySelector('.nav-btn:not([style*="display: none"])');
      if (first) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    } else if (lastFocus && document.contains(lastFocus)) {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) { lastFocus.focus(); }
      lastFocus = null;
    }
  }

  function close() { if (isOpen()) setOpen(false); }

  function init() {
    const burger = el('nav-burger');
    const drawer = el('nav-actions');
    const bd     = el('nav-bd');
    if (!burger || !drawer) return;

    burger.addEventListener('click', e => {
      e.stopPropagation();
      setOpen(!isOpen());
    });
    if (bd) bd.addEventListener('click', close);

    // Choosing anything closes the drawer — every row here navigates. The theme
    // controls are the exception: they are settings, and closing the drawer on
    // every tap would make the colour picker unusable.
    drawer.addEventListener('click', e => {
      if (!isOpen()) return;
      if (e.target.closest('#theme-panel')) return;
      if (e.target.closest('.nav-btn')) close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    // Rotating to landscape, or a tablet crossing the breakpoint, must not leave
    // a half-drawer pinned over the page.
    const mq = window.matchMedia(MOBILE);
    const onChange = () => { if (!isMobile()) close(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ── the gauntlet card on the welcome screen ────────────────────────────────
     Its subtitle is the run itself. A vertical card has room to say where you
     are, which the nav button never could — and where you are is the reason to
     tap it. Signed out included: the run lives in localStorage and needs no
     account. */
  function fillGauntletCard() {
    const card = el('btn-gauntlet-card');
    const sub  = el('gt-card-sub');
    if (!card) return;
    card.onclick = () => { if (typeof showGauntlet === 'function') showGauntlet(); };
    if (!sub || typeof gtRun !== 'function') return;

    let run = null;
    try { run = gtRun(); } catch (e) { return; }   // a card never breaks the page
    if (!run) return;

    const started = typeof gtRunStarted === 'function' ? gtRunStarted(run) : !!run.started;
    if (run.over)        sub.textContent = 'הריצה הקודמת נגמרה — התחל ריצה חדשה';
    else if (started)    sub.textContent = 'הריצה שלך ממשיכה · תחנה ' + ((run.at | 0) + 1);
    // else: the default written in the HTML, which describes the mode
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    // after the gauntlet's own scripts have defined gtRun()
    setTimeout(fillGauntletCard, 300);
  });
})();
