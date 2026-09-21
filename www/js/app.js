import { openDB } from './services/db.js';
import { ensureSeed, reloadAll } from './services/data.js';
import { navigate as navigateTo, openOverlay, closeOverlay } from './nav.js';

import { renderDashboard, countLowStock, countExpiringSoon } from './views/dashboard.js';
import { renderInventory, wireInventory } from './views/inventory.js';
import { renderCategories, wireCategoryForm } from './views/categories.js';
import { renderSaleSearch, wireSales } from './views/sales.js';
import { renderLedger, wireLedgerFilters } from './views/ledger.js';
import { renderScanner, wireScanner } from './views/scanner.js';
import { wireAuditSheet } from './views/audit.js';

import { ensurePermission as ensureNotificationPermission, notifyNow } from './native/notifications.js';

const renderers = {
  dashboard: renderDashboard,
  inventory: renderInventory,
  categories: renderCategories,
  sales: renderSaleSearch,
  ledger: renderLedger,
  scanner: renderScanner
};

function navigate(name) {
  navigateTo(name, renderers);
}

function wireNav() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.nav));
  });
}

function wireOverlays() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
  });
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if (e.target === ov) closeOverlay(ov.id); });
  });
}

// Fires at most once per app launch, summarizing everything that needs attention
// rather than one notification per product — avoids spamming the tray.
async function checkLowStockOnce() {
  const low = countLowStock();
  const expiring = countExpiringSoon();
  if (low === 0 && expiring === 0) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const parts = [];
  if (low > 0) parts.push(`${low} item${low === 1 ? '' : 's'} low on stock`);
  if (expiring > 0) parts.push(`${expiring} item${expiring === 1 ? '' : 's'} expiring within 7 days`);
  await notifyNow('Store check-in', parts.join(' · '));
}

(async function init() {
  try {
    await openDB();
    await ensureSeed();
    await reloadAll();

    wireNav();
    wireOverlays();
    wireInventory();
    wireCategoryForm();
    wireSales(() => navigate('dashboard'));
    wireLedgerFilters();
    wireScanner();
    wireAuditSheet();

    navigate('dashboard');
    checkLowStockOnce();
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML =
      '<div class="empty">This browser could not open local storage, so the app cannot save data here. Try a different browser.</div>';
  }
})();
