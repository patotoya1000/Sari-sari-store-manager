// services/reports.js — read-only computations over state for the Reports screen.
// Same kind of "service" as data.js, just nothing here ever writes anything.
// No DOM, no Capacitor.

import { state } from '../state.js';
import { startOfToday } from '../utils/format.js';
import { productName } from './data.js';

export const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'all', label: 'All time' }
];

function periodStart(periodId) {
  if (periodId === 'today') return startOfToday();
  if (periodId === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); return d; }
  if (periodId === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); return d; }
  return null; // 'all'
}

function periodLabel(periodId) {
  return (PERIODS.find(p => p.id === periodId) || {}).label || periodId;
}

export function getSalesReport(periodId) {
  const start = periodStart(periodId);
  const sales = state.sales.filter(s => !start || new Date(s.date) >= start);
  const saleIds = new Set(sales.map(s => s.id));
  const items = state.saleItems.filter(it => saleIds.has(it.saleId));

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const itemsSold = items.reduce((sum, it) => sum + it.quantity, 0);

  const byProduct = new Map();
  for (const it of items) {
    const row = byProduct.get(it.productId) || { productId: it.productId, qty: 0, revenue: 0 };
    row.qty += it.quantity;
    row.revenue += it.subtotal;
    byProduct.set(it.productId, row);
  }
  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map(row => ({ ...row, name: productName(row.productId) }));

  return {
    periodId,
    periodLabel: periodLabel(periodId),
    transactionCount: sales.length,
    totalRevenue,
    itemsSold,
    topProducts
  };
}

// Always a current snapshot — stock doesn't have a "period," only a right-now state.
export function getInventoryReport() {
  const products = state.products;
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
  const totalCostValue = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);
  const totalSellingValue = products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
  const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold);

  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const today = startOfToday();
  const expiringSoon = products.filter(p =>
    p.expirationDate && new Date(p.expirationDate) <= soon && new Date(p.expirationDate) >= today
  );

  return { totalProducts: products.length, totalUnits, totalCostValue, totalSellingValue, lowStock, expiringSoon };
}

export function getAuditReport(periodId) {
  const start = periodStart(periodId);
  const audits = state.stockAudits.filter(a => !start || new Date(a.date) >= start);
  const increased = audits.filter(a => a.difference > 0).length;
  const decreased = audits.filter(a => a.difference < 0).length;
  const noDifference = audits.filter(a => a.difference === 0).length;

  return {
    periodId,
    periodLabel: periodLabel(periodId),
    checked: audits.length,
    increased,
    decreased,
    noDifference,
    entries: audits
  };
}
