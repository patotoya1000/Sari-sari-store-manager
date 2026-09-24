// services/data.js — every read/write to the store goes through here. No DOM, no Capacitor.
// The one rule that matters, unchanged since Phase 1: product.quantity only ever changes
// inside a function here that also writes a matching InventoryMovement record.

import { state, DEFAULT_CATEGORIES } from '../state.js';
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
  state.stockAudits = (await getAll("stockAudits")).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function categoryName(id) {
  const c = state.categories.find(c => c.id === id);
  return c ? c.name : "Uncategorized";
}

export function productName(id) {
  const p = state.products.find(p => p.id === id);
  return p ? p.name : "(deleted product)";
}

export function findProductByBarcode(barcode) {
  const code = (barcode || '').trim();
  if (!code) return null;
  return state.products.find(p => (p.barcode || '').trim() === code) || null;
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

async function recordSaleLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, message: 'Sale is empty.' };
  }

  // Validate the complete sale before writing anything. This prevents a partial
  // sale when one scanned item is out of stock.
  for (const line of lines) {
    const qty = Number(line.qty);
    const product = state.products.find(pr => pr.id === line.productId);
    if (!product || !Number.isInteger(qty) || qty <= 0) {
      return { ok: false, message: `Invalid sale item: ${line.name || 'Unknown product'}.` };
    }
    if (product.quantity < qty) {
      return { ok: false, message: `Not enough stock for ${line.name}.` };
    }
  }

  const saleId = uid();
  const total = lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unitPrice), 0);
  await put("sales", { id: saleId, date: new Date().toISOString(), total });

  for (const line of lines) {
    await put("saleItems", {
      id: uid(), saleId, productId: line.productId,
      quantity: Number(line.qty),
      unitPrice: Number(line.unitPrice),
      subtotal: Number(line.qty) * Number(line.unitPrice)
    });
    const product = state.products.find(pr => pr.id === line.productId);
    product.quantity -= Number(line.qty);
    await put("products", product);
    await recordMovement({
      productId: line.productId,
      quantityChange: -Number(line.qty),
      type: "sale",
      reason: "Sold in transaction",
      referenceId: saleId
    });
  }

  return { ok: true, total, saleId };
}

export async function trySale() {
  if (state.cart.length === 0) return { ok: false, message: 'Cart is empty.' };
  const result = await recordSaleLines(state.cart);
  if (result.ok) state.cart = [];
  return result;
}

// --- Shared cart helpers ---------------------------------------------------
// One cart (state.cart) for the whole app now. Both the Sales tab (search +
// scan) and the Scan tab (scan-only entry) call these same functions, so
// "add this product" and "bump this line's quantity" only have one
// implementation each — no risk of the two screens drifting out of sync.

// Adds `qty` more of `product` to the cart (or starts a new line), capped at
// available stock. Same rule whether the product came from a search tap or
// a barcode scan: scanning/tapping the same product again just increases
// that line's quantity instead of creating a duplicate row.
export function addProductToCart(product, qty = 1) {
  if (!product) return { ok: false, message: 'Product not found.' };
  if (product.quantity <= 0) return { ok: false, message: `${product.name} is out of stock.` };
  const line = state.cart.find(l => l.productId === product.id);
  const currentQty = line ? line.qty : 0;
  if (currentQty + qty > product.quantity) {
    return { ok: false, message: 'Not enough stock to add more.' };
  }
  if (line) {
    line.qty += qty;
  } else {
    state.cart.push({ productId: product.id, name: product.name, qty, unitPrice: product.sellingPrice });
  }
  return { ok: true };
}

// Used by the cart line +/- stepper. Removes the line if it would drop to
// zero or below; refuses to go over available stock.
export function changeCartLineQty(index, delta) {
  const line = state.cart[index];
  if (!line) return { ok: false, message: 'Item not found in cart.' };
  const newQty = line.qty + delta;
  if (newQty <= 0) {
    state.cart.splice(index, 1);
    return { ok: true, removed: true };
  }
  const product = state.products.find(p => p.id === line.productId);
  if (product && newQty > product.quantity) {
    return { ok: false, message: 'Not enough stock to add more.' };
  }
  line.qty = newQty;
  return { ok: true };
}

export function removeCartLine(index) {
  state.cart.splice(index, 1);
}

export function cartTotal() {
  return state.cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

// --- Phase 2 -------------------------------------------------------------

// Quick Stock Deduction: a fast, scan-triggered removal of stock that isn't a sale
// (samples given away, spillage caught in the moment, etc). Always needs a reason.
export async function performQuickDeduct(productId, qty, reason) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return { ok: false, message: 'Product not found.' };
  if (!qty || qty <= 0) return { ok: false, message: 'Enter a quantity greater than zero.' };
  if (qty > product.quantity) return { ok: false, message: 'Not enough stock to deduct that much.' };

  product.quantity -= qty;
  await put("products", product);
  await recordMovement({
    productId, quantityChange: -qty, type: "quick_deduct",
    reason: reason || "Quick deduction via scan"
  });
  return { ok: true };
}

// Stock Audit: compares the system's quantity against a physical count, logs the
// comparison as its own StockAudit record (kept even when there's no difference,
// so "we checked this and it was fine" is provable), and only writes a movement
// when there's an actual difference to correct.
export async function performStockAudit(productId, physicalCount, reason, notes) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return { ok: false, message: 'Product not found.' };
  if (physicalCount == null || isNaN(physicalCount) || physicalCount < 0) {
    return { ok: false, message: 'Enter a valid physical count.' };
  }

  const systemQuantity = product.quantity;
  const difference = physicalCount - systemQuantity;

  const audit = {
    id: uid(),
    date: new Date().toISOString(),
    productId,
    systemQuantity,
    physicalQuantity: physicalCount,
    difference,
    reason: difference !== 0 ? (reason || null) : null,
    notes: notes || null
  };
  await put("stockAudits", audit);

  if (difference !== 0) {
    product.quantity = physicalCount;
    await put("products", product);
    await recordMovement({
      productId,
      quantityChange: difference,
      type: "stock_audit",
      reason: reason ? `Audit: ${reason}${notes ? ' — ' + notes : ''}` : 'Stock audit adjustment',
      referenceId: audit.id
    });
  }

  return { ok: true, difference };
}