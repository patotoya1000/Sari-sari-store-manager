import { state } from '../state.js';
import { peso } from '../utils/format.js';
import { escapeHTML, toast } from '../utils/dom.js';
import { trySale, reloadAll, addProductToCart, changeCartLineQty, removeCartLine, cartTotal, findProductByBarcode } from '../services/data.js';
import { tapLight, tapMedium } from '../native/haptics.js';
import { icon } from '../utils/icons.js';
import { isNative, isScanSupported, ensurePermission, scanOnce } from '../native/barcode.js';
import { prefillNewProductBarcode } from './inventory.js';

export function renderSaleSearch() {
  document.getElementById('saleSearch').value = '';
  document.getElementById('saleProductResults').innerHTML = '';
  const btnScan = document.getElementById('btnSaleScan');
  if (btnScan) btnScan.style.display = isNative() ? 'inline-flex' : 'none';
  renderCart();
}

// Shared cart renderer — also used by the Scan tab's cart panel, so both
// screens always show the exact same cart with the exact same behavior.
export function renderCartInto(linesElId, totalElId) {
  const el = document.getElementById(linesElId);
  const totalEl = document.getElementById(totalElId);
  if (!el || !totalEl) return;

  if (state.cart.length === 0) {
    el.innerHTML = '<div class="empty">No items yet — search or scan above to add one.</div>';
  } else {
    el.innerHTML = state.cart.map((l, i) => `
      <div class="cart-line">
        <div>
          <div class="cl-name">${escapeHTML(l.name)}</div>
          <div class="rc-sub mono">${peso(l.unitPrice)} each</div>
        </div>
        <div class="cl-controls">
          <div class="qty-stepper">
            <button class="qty-btn" data-dec="${i}" type="button" aria-label="Decrease quantity">${icon('minus')}</button>
            <span class="qty-val mono">${l.qty}</span>
            <button class="qty-btn" data-inc="${i}" type="button" aria-label="Increase quantity">${icon('plus')}</button>
          </div>
          <span class="mono cl-amt">${peso(l.qty * l.unitPrice)}</span>
          <button class="cl-x" data-remove="${i}" type="button" aria-label="Remove item">${icon('close')}</button>
        </div>
      </div>`).join('');

    el.querySelectorAll('[data-dec]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = changeCartLineQty(Number(btn.dataset.dec), -1);
        if (!result.ok) { toast(result.message); return; }
        tapLight();
        renderCartInto(linesElId, totalElId);
      });
    });
    el.querySelectorAll('[data-inc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = changeCartLineQty(Number(btn.dataset.inc), 1);
        if (!result.ok) { toast(result.message); return; }
        tapLight();
        renderCartInto(linesElId, totalElId);
      });
    });
    el.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        removeCartLine(Number(btn.dataset.remove));
        renderCartInto(linesElId, totalElId);
      });
    });
  }
  totalEl.textContent = peso(cartTotal());
}

export function renderCart() {
  renderCartInto('cartLines', 'cartTotal');
}

// Shared by search-tap-to-add and barcode scan/lookup: same stock rules
// either way, and scanning/tapping a product already in the cart just
// bumps that line's quantity instead of adding a duplicate row.
export function addToCart(product) {
  const result = addProductToCart(product, 1);
  if (!result.ok) { toast(result.message); return false; }
  document.getElementById('saleSearch').value = '';
  document.getElementById('saleProductResults').innerHTML = '';
  renderCart();
  return true;
}

async function handleSaleBarcode(code) {
  if (!code) return;
  const product = findProductByBarcode(code);
  if (!product) {
    toast('No product matches that barcode.');
    prefillNewProductBarcode(code);
    return;
  }
  tapMedium();
  if (addToCart(product)) toast(`${product.name} added — ${state.cart.find(l => l.productId === product.id).qty} in cart`);
}

// onSaleComplete lets app.js decide what happens after a sale (navigate to dashboard)
// without this file needing to import nav.js itself.
export function wireSales(onSaleComplete) {
  document.getElementById('saleSearch').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const el = document.getElementById('saleProductResults');
    if (!q) { el.innerHTML = ''; return; }
    const matches = state.products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 8);
    if (matches.length === 0) { el.innerHTML = '<div class="empty">No matching products.</div>'; return; }
    el.innerHTML = matches.map(p => `
      <div class="row-card" data-add="${p.id}">
        <div class="rc-main">
          <div class="rc-title">${escapeHTML(p.name)}</div>
          <div class="rc-sub">${p.quantity} in stock · ${peso(p.sellingPrice)}</div>
        </div>
        <div class="rc-right"><button class="btn btn-ghost" type="button">Add</button></div>
      </div>`).join('');
    el.querySelectorAll('[data-add]').forEach(row => {
      row.addEventListener('click', () => {
        const p = state.products.find(pr => pr.id === row.dataset.add);
        if (p) addToCart(p);
      });
    });
  });

  const btnScan = document.getElementById('btnSaleScan');
  if (btnScan) {
    btnScan.addEventListener('click', async () => {
      try {
        const supported = await isScanSupported();
        if (!supported) { toast("Live scanning isn't supported on this device."); return; }
        const granted = await ensurePermission();
        if (!granted) { toast('Camera permission is needed to scan.'); return; }
        const code = await scanOnce();
        if (code) await handleSaleBarcode(code);
      } catch (err) {
        console.error(err);
        toast('Scanning failed — try searching instead.');
      }
    });
  }

  document.getElementById('btnConfirmSale').addEventListener('click', async () => {
    const result = await trySale();
    if (!result.ok) { toast(result.message); return; }
    await reloadAll();
    renderCart();
    tapLight();
    toast(`Sale recorded — ${peso(result.total)}`);
    onSaleComplete();
  });
}