/* Full-screen branded startup splash for the WebView layer. */
(() => {
  'use strict';

  const splash = document.getElementById('app-splash');
  if (!splash) return;

  let hidden = false;
  let minimumTimePassed = false;
  let pageReady = document.readyState === 'complete';

  const MINIMUM_DISPLAY_MS = 900;
  const MAXIMUM_DISPLAY_MS = 5000;
  const startedAt = Date.now();

  const hideSplash = () => {
    if (hidden || !minimumTimePassed || !pageReady) return;
    hidden = true;

    document.body.classList.remove('splash-active');
    splash.classList.add('is-hidden');

    window.setTimeout(() => {
      splash.remove();
    }, 400);
  };

  const tryHide = () => {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= MINIMUM_DISPLAY_MS) {
      minimumTimePassed = true;
      hideSplash();
    } else {
      window.setTimeout(tryHide, MINIMUM_DISPLAY_MS - elapsed);
    }
  };

  if (!pageReady) {
    window.addEventListener('load', () => {
      pageReady = true;
      tryHide();
    }, { once: true });
  }

  window.setTimeout(() => {
    minimumTimePassed = true;
    hideSplash();
  }, MINIMUM_DISPLAY_MS);

  // Never allow a failed initialization to leave the app permanently covered.
  window.setTimeout(() => {
    if (hidden) return;
    hidden = true;
    document.body.classList.remove('splash-active');
    splash.classList.add('is-hidden');
    window.setTimeout(() => splash.remove(), 400);
  }, MAXIMUM_DISPLAY_MS);

  // Handles cached/local launches where the load event has already fired.
  if (pageReady) tryHide();
})();
