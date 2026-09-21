import { state } from '../state.js';
import { peso, startOfToday, greetingForNow } from '../utils.js';
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

  const lowStock = state.products.filter(p => p.quantity <= p.lowStockThreshold);
  document.getElementById('statLowStock').textContent = lowStock.length;

  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const expiring = state.products.filter(p =>
    p.expirationDate && new Date(p.expirationDate) <= soon && new Date(p.expirationDate) >= startOfToday()
  );
  document.getElementById('statExpiring').textContent = expiring.length;

  const recentEl = document.getElementById('dashRecent');
  const recent = state.movements.slice(0, 6);
  if (recent.length === 0) {
    recentEl.innerHTML = '<div class="empty">No activity yet. Add a product or record a sale to get started.</div>';
  } else {
    recentEl.innerHTML = recent.map(mv => movementRowHTML(mv)).join('');
  }
}
