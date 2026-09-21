import { openDB } from './db.js';
import { ensureSeed, reloadAll } from './data.js';
import { navigate as navigateTo, openOverlay, closeOverlay } from './nav.js';

import { renderDashboard } from './views/dashboard.js';
import { renderInventory, wireInventory } from './views/inventory.js';
import { renderCategories, wireCategoryForm } from './views/categories.js';
import { renderSaleSearch, wireSales } from './views/sales.js';
import { renderLedger, wireLedgerFilters } from './views/ledger.js';

const renderers = {
  dashboard: renderDashboard,
  inventory: renderInventory,
  categories: renderCategories,
  sales: renderSaleSearch,
  ledger: renderLedger
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

    navigate('dashboard');
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML =
      '<div class="empty">This browser could not open local storage, so the app cannot save data here. Try a different browser.</div>';
  }
})();
