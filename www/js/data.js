// data.js — all reads/writes to the store go through here. No DOM code in this file.
// The one rule that matters: product.quantity is only ever changed by a function
// in here that also writes a matching InventoryMovement record.

import { state, DEFAULT_CATEGORIES } from './state.js';
import { getAll, getOne, put, del, uid } from './db.js';

export async function ensureSeed() {
  const cats = await getAll("categories");
  if (cats.length === 0) {
    for (const name of DEFAULT_CATEGORIES) {
      await put("categories", { id: uid(), name });
    }
  }
  const meta = await getOne("meta", "store");
  if (!meta) {
    await put("meta", { key: "store", name: "My Sari-Sari Store" });
  }
}

export async function reloadAll() {
  state.products = await getAll("products");
  state.categories = await getAll("categories");
  state.sales = await getAll("sales");
  state.saleItems = await getAll("saleItems");
  state.movements = (await getAll("movements")).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function categoryName(id) {
  const c = state.categories.find(c => c.id === id);
  return c ? c.name : "Uncategorized";
}

export function productName(id) {
  const p = state.products.find(p => p.id === id);
  return p ? p.name : "(deleted product)";
}

export async function recordMovement({ productId, quantityChange, type, reason, referenceId }) {
  const mv = {
    id: uid(),
    productId,
    quantityChange,
    type,
    reason: reason || null,
    timestamp: new Date().toISOString(),
    referenceId: referenceId || null
  };
  await put("movements", mv);
  return mv;
}

export async function saveProduct(data, isNew) {
  const product = {
    id: data.id || uid(),
    barcode: data.barcode || "",
    name: data.name,
    categoryId: data.categoryId,
    costPrice: Number(data.costPrice) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    quantity: Number(data.quantity) || 0,
    lowStockThreshold: Number(data.lowStockThreshold) || 0,
    expirationDate: data.expirationDate || null
  };

  if (isNew) {
    await put("products", product);
    if (product.quantity > 0) {
      await recordMovement({
        productId: product.id,
        quantityChange: product.quantity,
        type: "initial_stock",
        reason: "Initial stock on product creation",
        referenceId: null
      });
    }
  } else {
    // Quantity is never set from the edit form — it only moves via recordMovement.
    const existing = state.products.find(p => p.id === product.id);
    product.quantity = existing ? existing.quantity : product.quantity;
    await put("products", product);
  }
  return product;
}

export async function deleteProduct(id) {
  await del("products", id);
}

export async function applyAdjustment(productId, qtyChange, type, reason) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return { ok: false, message: 'Product not found.' };

  const newQty = product.quantity + qtyChange;
  if (newQty < 0) {
    return { ok: false, message: "That would make stock negative — check the amount." };
  }
  product.quantity = newQty;
  await put("products", product);
  await recordMovement({ productId, quantityChange: qtyChange, type, reason });
  return { ok: true };
}

export async function trySale() {
  if (state.cart.length === 0) return { ok: false, message: 'Cart is empty.' };

  for (const line of state.cart) {
    const p = state.products.find(pr => pr.id === line.productId);
    if (!p || p.quantity < line.qty) {
      return { ok: false, message: `Not enough stock for ${line.name}.` };
    }
  }

  const saleId = uid();
  const total = state.cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  await put("sales", { id: saleId, date: new Date().toISOString(), total });

  for (const line of state.cart) {
    await put("saleItems", {
      id: uid(), saleId, productId: line.productId,
      quantity: line.qty, unitPrice: line.unitPrice, subtotal: line.qty * line.unitPrice
    });
    const product = state.products.find(pr => pr.id === line.productId);
    product.quantity -= line.qty;
    await put("products", product);
    await recordMovement({
      productId: line.productId,
      quantityChange: -line.qty,
      type: "sale",
      reason: "Sold in transaction",
      referenceId: saleId
    });
  }

  state.cart = [];
  return { ok: true, total };
}
