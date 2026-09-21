import { state } from '../state.js';
import { peso, startOfToday, greetingForNow } from '../utils/format.js';
import { movementRowHTML } from './ledger.js';

export function renderDashboard() {
  document.getElementById('greetingText').textContent = greetingForNow();
  document.getElementById('todayDateLabel').textContent =
    new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  const today = startOfToday();
  const todaysSales = state.sales.filter(s => new Date(s.date) >= today);
  const todaysTotal = todaysSales.reduce((s, x) => s + x.total, 0);

  document.getElementById('statTodaySales').textContent = peso(todaysTotal);
  document.getElementById('statTodayTx').textContent = todaysSales.length;
  document.getElementById('statProducts').textContent = state.products.length;

  document.getElementById('statLowStock').textContent = countLowStock();
  document.getElementById('statExpiring').textContent = countExpiringSoon();

  const recentEl = document.getElementById('dashRecent');
  const recent = state.movements.slice(0, 6);
  if (recent.length === 0) {
    recentEl.innerHTML = '<div class="empty">No activity yet. Add a product or record a sale to get started.</div>';
  } else {
    recentEl.innerHTML = recent.map(mv => movementRowHTML(mv)).join('');
  }
}

// Exported so app.js can check these once at boot for the low-stock notification,
// without dashboard.js needing to know anything about notifications.
export function countLowStock() {
  return state.products.filter(p => p.quantity <= p.lowStockThreshold).length;
}

export function countExpiringSoon() {
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const today = startOfToday();
  return state.products.filter(p =>
    p.expirationDate && new Date(p.expirationDate) <= soon && new Date(p.expirationDate) >= today
  ).length;
}
