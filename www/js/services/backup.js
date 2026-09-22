// services/backup.js — JSON backup build/validate/restore. No DOM, no Capacitor —
// views/settings.js handles the file picker and the confirm/preview UI; this
// file only knows about data.

import { state } from '../state.js';
import { restoreAll, put } from './db.js';
import { reloadAll } from './data.js';

export const BACKUP_VERSION = 1;

// Field names here intentionally match the proposal's recommended JSON structure
// (categories, products, sales, stockAudits, inventoryMovements, ...) even
// though our own IndexedDB store for movements is named "movements" — the
// backup is a portable format, not a dump of internal store names.
export function buildBackup(storeName) {
  return {
    backupVersion: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    store: { name: storeName },
    categories: state.categories,
    products: state.products,
    sales: state.sales,
    saleItems: state.saleItems,
    stockAudits: state.stockAudits,
    inventoryMovements: state.movements
  };
}

const REQUIRED_COLLECTIONS = ['categories', 'products', 'sales', 'saleItems', 'stockAudits', 'inventoryMovements'];

// Parses + checks a backup file's raw text. Never throws — always returns
// { ok, errors, warnings, data, summary }. Only `ok: true` results are safe to
// pass to restoreBackup().
export function validateBackup(rawText) {
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return { ok: false, errors: ['This file is not valid JSON.'], warnings: [], data: null, summary: null };
  }

  const errors = [];
  if (typeof data !== 'object' || data === null) {
    errors.push('Unexpected file contents.');
    return { ok: false, errors, warnings: [], data: null, summary: null };
  }
  if (data.backupVersion !== BACKUP_VERSION) {
    errors.push(`Unsupported backup version (${data.backupVersion ?? 'missing'}). This app supports version ${BACKUP_VERSION}.`);
  }
  for (const key of REQUIRED_COLLECTIONS) {
    if (!Array.isArray(data[key])) errors.push(`Missing or invalid "${key}" collection.`);
  }
  if (errors.length) return { ok: false, errors, warnings: [], data: null, summary: null };

  const warnings = [];
  const categoryIds = new Set(data.categories.map(c => c.id));
  const orphanProducts = data.products.filter(p => p.categoryId && !categoryIds.has(p.categoryId));
  if (orphanProducts.length) {
    warnings.push(`${orphanProducts.length} product(s) reference a category not present in this backup.`);
  }

  const summary = {
    createdAt: data.createdAt || null,
    storeName: data.store?.name || null,
    categories: data.categories.length,
    products: data.products.length,
    sales: data.sales.length,
    saleItems: data.saleItems.length,
    stockAudits: data.stockAudits.length,
    inventoryMovements: data.inventoryMovements.length
  };

  return { ok: true, errors: [], warnings, data, summary };
}

// Full replace, not a merge — the preview shown before this is called is what
// keeps that safe rather than silent, per the proposal's own restore flow.
// Runs as one atomic IndexedDB transaction (see db.restoreAll): either every
// store ends up matching the backup, or none of them change at all.
export async function restoreBackup(data) {
  await restoreAll({
    categories: data.categories,
    products: data.products,
    sales: data.sales,
    saleItems: data.saleItems,
    stockAudits: data.stockAudits,
    movements: data.inventoryMovements
  });

  if (data.store?.name) {
    await put('meta', { key: 'store', name: data.store.name });
  }

  await reloadAll();
}