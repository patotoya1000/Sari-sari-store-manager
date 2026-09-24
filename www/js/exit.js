/* exit.js — native Android back-button handling.
 * A single back press is consumed. Two presses within the double-tap window
 * open the exit confirmation modal. The native App plugin performs the actual
 * app exit after the user confirms.
 */
(() => {
  'use strict';

  const DOUBLE_BACK_WINDOW_MS = 550;
  let lastBackAt = 0;
  let resetTimer = null;
  let exitDialogOpen = false;

  const getAppPlugin = () => window.Capacitor?.Plugins?.App || null;

  const dialog = () => document.getElementById('exitAppModal');

  const closeExitDialog = () => {
    const modal = dialog();
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    exitDialogOpen = false;
  };

  const openExitDialog = () => {
    const modal = dialog();
    if (!modal) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    exitDialogOpen = true;

    const cancel = document.getElementById('btnCancelExit');
    cancel?.focus({ preventScroll: true });
  };

  const exitApp = async () => {
    const app = getAppPlugin();
    if (!app?.exitApp) {
      // Browser fallback: an actual browser tab cannot be programmatically
      // closed in a reliable/safe way. Keep the modal closed instead.
      closeExitDialog();
      return;
    }

    try {
      await app.exitApp();
    } catch (err) {
      console.warn('App.exitApp failed', err);
      closeExitDialog();
    }
  };

  const handleBack = () => {
    // If the exit confirmation is already visible, a back press dismisses it.
    if (exitDialogOpen) {
      closeExitDialog();
      return;
    }

    const now = Date.now();
    const isDoubleTap = now - lastBackAt <= DOUBLE_BACK_WINDOW_MS;
    lastBackAt = now;

    if (resetTimer) window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      lastBackAt = 0;
      resetTimer = null;
    }, DOUBLE_BACK_WINDOW_MS);

    if (isDoubleTap) {
      lastBackAt = 0;
      if (resetTimer) window.clearTimeout(resetTimer);
      resetTimer = null;
      openExitDialog();
    }
  };

  const wire = () => {
    const cancel = document.getElementById('btnCancelExit');
    const confirm = document.getElementById('btnConfirmExit');
    const modal = dialog();

    cancel?.addEventListener('click', closeExitDialog);
    confirm?.addEventListener('click', exitApp);

    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeExitDialog();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && exitDialogOpen) closeExitDialog();
    });

    const app = getAppPlugin();
    if (app?.addListener) {
      app.addListener('backButton', handleBack).catch?.((err) => {
        console.warn('Could not register Android back-button listener', err);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }
})();
