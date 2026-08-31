// "Install the game" — the home-screen app, without a store.
//
// Chrome dropped the service-worker requirement for installability, so the
// manifest alone already makes this installable; what was missing is that
// nobody knew. Android fires `beforeinstallprompt`, which we catch and hold so
// the offer appears where it belongs instead of as a browser bar nobody reads.
// iOS has no such event — Safari only installs through Share → Add to Home
// Screen — so there the card explains the two taps instead of performing them.
//
// It never appears for someone who already installed: an installed launch runs
// in standalone display mode, and asking those people to install is noise.
(function () {
  const KEY = 't360_install_dismissed';
  let deferred = null;

  const el = id => document.getElementById(id);
  function installed() {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.navigator.standalone === true) return true;   // iOS
    } catch (e) {}
    return false;
  }
  function dismissed() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function isIOS() {
    try {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS
    } catch (e) { return false; }
  }

  function hide() {
    const card = el('btn-install-card');
    if (card) card.style.display = 'none';
  }
  function show(mode) {
    if (installed() || dismissed()) return;
    const card = el('btn-install-card');
    const sub = el('install-sub');
    if (!card) return;
    if (mode === 'ios' && sub) {
      sub.textContent = 'שיתוף ⬆️ ← «הוסף למסך הבית» — והמשחק ייפתח כמו אפליקציה';
    }
    card.dataset.mode = mode;
    card.style.display = '';
    if (typeof track === 'function') track('open', 'install', mode);
  }

  // Android/desktop Chrome: hold the event, show our own card instead.
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    show('prompt');
  });

  window.addEventListener('appinstalled', () => {
    hide();
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    if (typeof track === 'function') track('finish', 'install', 'installed');
  });

  document.addEventListener('DOMContentLoaded', () => {
    const card = el('btn-install-card');
    const x = el('install-x');
    if (!card) return;

    card.addEventListener('click', async ev => {
      if (ev.target.closest('#install-x')) return;          // the ✕ is not the card
      if (card.dataset.mode !== 'prompt' || !deferred) return;  // iOS: the text IS the answer
      const p = deferred;
      deferred = null;
      try {
        p.prompt();
        const res = await p.userChoice;
        if (typeof track === 'function') track('finish', 'install', res && res.outcome);
        if (res && res.outcome === 'accepted') hide();
      } catch (e) { /* an install offer never breaks the page */ }
    });

    if (x) x.addEventListener('click', ev => {
      ev.stopPropagation();
      hide();
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      if (typeof track === 'function') track('finish', 'install', 'dismissed');
    });

    // iOS gets no event, so the card is offered on its own — but only to
    // someone who has actually played, because a first-time visitor being asked
    // to install a game he has not tried is the definition of a nag.
    if (isIOS() && !installed() && !dismissed()) {
      let played = 0;
      try { played = +(localStorage.getItem('t360_games') || 0); } catch (e) {}
      const seen = (function () {
        try { return !!localStorage.getItem('t360_opened'); } catch (e) { return false; }
      })();
      if (played > 0 || seen) show('ios');
    }
  });
})();
