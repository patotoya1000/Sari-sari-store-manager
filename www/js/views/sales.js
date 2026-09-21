import { state } from '../state.js';
import { peso } from '../utils/format.js';
import { escapeHTML, toast } from '../utils/dom.js';
import { trySale, reloadAll } from '../services/data.js';
import { tapLight } from '../native/haptics.js';

export function renderSaleSearch() {
  document.getElementById('saleSearch').value = '';
  document.getElementById('saleProductResults').innerHTML = '';
  renderCart();
}

export function renderCart() {
  const el = document.getElementById('cartLines');
  if (state.cart.length === 0) {
    el.innerHTML = '<div class="empty">No items yet — search above to add one.</div>';
  } else {
    el.innerHTML = state.cart.map((l, i) => `
      <div class="cart-line">
        <div>
          <div class="cl-name">${escapeHTML(l.name)}</div>
          <div class="rc-sub mono">${l.qty} × ${peso(l.unitPrice)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="mono">${peso(l.qty * l.unitPrice)}</span>
          <button class="cl-x" data-idx="${i}" type="button">✕</button>
        </div>
      </div>`).join('');
    el.querySelectorAll('.cl-x').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cart.splice(Number(btn.dataset.idx), 1);
        renderCart();
      });
    });
  }
  const total = state.cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  document.getElementById('cartTotal').textContent = peso(total);
}

function addToCart(productId) {
  const p = state.products.find(pr => pr.id === productId);
  if (!p) return;
  if (p.quantity <= 0) { toast(`${p.name} is out of stock.`); return; }
  const line = state.cart.find(l => l.productId === productId);
  if (line) {
    if (line.qty + 1 > p.quantity) { toast('Not enough stock to add more.'); return; }
    line.qty += 1;
  } else {
    state.cart.push({ productId, name: p.name, qty: 1, unitPrice: p.sellingPrice });
  }
  document.getElementById('saleSearch').value = '';
  document.getElementById('saleProductResults').innerHTML = '';
  renderCart();
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
      row.addEventListener('click', () => addToCart(row.dataset.add));
    });
  });

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
