import { state } from '../state.js';
import { peso, fmtDateShort, startOfToday } from '../utils/format.js';
import { escapeHTML, toast } from '../utils/dom.js';
import { categoryName, saveProduct, deleteProduct, applyAdjustment, reloadAll } from '../services/data.js';
import { openOverlay, closeOverlay } from '../nav.js';
import { openAuditSheet } from './audit.js';

export function renderCategoryChips() {
  const el = document.getElementById('invCategoryFilter');
  const chips = ['<button class="chip ' + (state.invCategoryFilter === "all" ? "active" : "") + '" data-cat="all">All</button>']
    .concat(state.categories.map(c =>
      `<button class="chip ${state.invCategoryFilter === c.id ? "active" : ""}" data-cat="${c.id}">${escapeHTML(c.name)}</button>`
    ));
  el.innerHTML = chips.join('');
  el.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', () => {
      state.invCategoryFilter = ch.dataset.cat;
      renderInventory();
    });
  });
}

export function renderInventory() {
  renderCategoryChips();
  const q = (document.getElementById('invSearch').value || "").toLowerCase();
  let list = state.products.filter(p => {
    const matchesCat = state.invCategoryFilter === "all" || p.categoryId === state.invCategoryFilter;
    const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q);
    return matchesCat && matchesQ;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const el = document.getElementById('invList');
  if (list.length === 0) {
    el.innerHTML = '<div class="empty">No products found. Tap + to add one.</div>';
    return;
  }
  el.innerHTML = list.map(p => {
    const low = p.quantity <= p.lowStockThreshold;
    let badge = '';
    if (low) badge = '<span class="badge">Low stock</span>';
    if (p.expirationDate) {
      const days = Math.ceil((new Date(p.expirationDate) - startOfToday()) / 86400000);
      if (days <= 7 && days >= 0) badge += ` <span class="badge warn">Expires ${fmtDateShort(p.expirationDate)}</span>`;
      else if (days < 0) badge += ' <span class="badge">Expired</span>';
    }
    return `
      <div class="row-card" data-product="${p.id}">
        <div class="rc-main">
          <div class="rc-title">${escapeHTML(p.name)}</div>
          <div class="rc-sub">${escapeHTML(categoryName(p.categoryId))} · ${peso(p.sellingPrice)}</div>
          ${badge}
        </div>
        <div class="rc-right">
          <div class="rc-amt mono">${p.quantity}</div>
          <div class="rc-sub">in stock</div>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.row-card').forEach(row => {
    row.addEventListener('click', () => openProductActions(row.dataset.product));
  });
}

function openProductActions(productId) {
  const p = state.products.find(pr => pr.id === productId);
  if (!p) return;
  openProductForm(p);
}

function populateCategorySelect(selectEl, selectedId) {
  selectEl.innerHTML = state.categories.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  if (selectedId) selectEl.value = selectedId;
}

// `prefillBarcode` is set when this form was opened from the scanner after a
// barcode didn't match any product — see prefillNewProductBarcode() below.
export function openProductForm(product, prefillBarcode) {
  const form = document.getElementById('productForm');
  form.reset();
  populateCategorySelect(document.getElementById('pfCategory'), product ? product.categoryId : (state.categories[0] && state.categories[0].id));
  document.getElementById('productFormTitle').textContent = product ? 'Edit product' : 'Add product';
  document.getElementById('pfId').value = product ? product.id : '';
  document.getElementById('pfName').value = product ? product.name : '';
  document.getElementById('pfBarcode').value = product ? (product.barcode || '') : (prefillBarcode || '');
  document.getElementById('pfCost').value = product ? product.costPrice : '';
  document.getElementById('pfPrice').value = product ? product.sellingPrice : '';
  document.getElementById('pfQty').value = product ? product.quantity : 0;
  document.getElementById('pfQtyLabel').textContent = product ? 'Current quantity (use Adjust stock to change)' : 'Starting quantity';
  document.getElementById('pfQty').disabled = !!product;
  document.getElementById('pfThreshold').value = product ? product.lowStockThreshold : 5;
  document.getElementById('pfExpiry').value = product ? (product.expirationDate || '') : '';
  document.getElementById('btnDeleteProduct').style.display = product ? 'block' : 'none';

  // "Adjust stock" and "Stock audit" only make sense for products that already
  // exist — injected dynamically rather than hardcoded into the static form markup.
  let adjustBtn = document.getElementById('btnOpenAdjust');
  let auditBtn = document.getElementById('btnOpenAudit');
  if (product) {
    if (!adjustBtn) {
      adjustBtn = document.createElement('button');
      adjustBtn.type = 'button';
      adjustBtn.id = 'btnOpenAdjust';
      adjustBtn.className = 'btn btn-ghost btn-block';
      adjustBtn.style.marginTop = '6px';
      form.insertBefore(adjustBtn, document.getElementById('btnDeleteProduct'));
    }
    if (!auditBtn) {
      auditBtn = document.createElement('button');
      auditBtn.type = 'button';
      auditBtn.id = 'btnOpenAudit';
      auditBtn.className = 'btn btn-ghost btn-block';
      auditBtn.style.marginTop = '6px';
      form.insertBefore(auditBtn, document.getElementById('btnDeleteProduct'));
    }
    adjustBtn.textContent = 'Adjust stock (restock / correction)';
    adjustBtn.onclick = () => { closeOverlay('overlayProduct'); openAdjustSheet(product); };
    adjustBtn.style.display = 'block';

    auditBtn.textContent = 'Stock audit (compare physical count)';
    auditBtn.onclick = () => { closeOverlay('overlayProduct'); openAuditSheet(product, () => { renderInventory(); }); };
    auditBtn.style.display = 'block';
  } else {
    if (adjustBtn) adjustBtn.style.display = 'none';
    if (auditBtn) auditBtn.style.display = 'none';
  }

  document.getElementById('btnDeleteProduct').onclick = async () => {
    if (product && confirm(`Delete ${product.name}? This does not delete its ledger history.`)) {
      await deleteProduct(product.id);
      await reloadAll();
      closeOverlay('overlayProduct');
      renderInventory();
      toast('Product deleted');
    }
  };

  openOverlay('overlayProduct');
}

// Called by views/scanner.js when a scanned barcode matches no product.
export function prefillNewProductBarcode(barcode) {
  openProductForm(null, barcode);
}

let adjustTargetId = null;
function openAdjustSheet(product) {
  adjustTargetId = product.id;
  document.getElementById('adjustProductLabel').textContent = `${product.name} — currently ${product.quantity} in stock`;
  document.getElementById('adjQty').value = '';
  document.getElementById('adjReason').value = '';
  document.getElementById('adjType').value = 'restock';
  openOverlay('overlayAdjust');
}

export function wireInventory() {
  document.getElementById('btnAddProduct').addEventListener('click', () => openProductForm(null));
  document.getElementById('invSearch').addEventListener('input', renderInventory);

  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('pfId').value || null;
    const data = {
      id,
      name: document.getElementById('pfName').value.trim(),
      barcode: document.getElementById('pfBarcode').value.trim(),
      categoryId: document.getElementById('pfCategory').value,
      costPrice: document.getElementById('pfCost').value,
      sellingPrice: document.getElementById('pfPrice').value,
      quantity: document.getElementById('pfQty').value,
      lowStockThreshold: document.getElementById('pfThreshold').value,
      expirationDate: document.getElementById('pfExpiry').value || null
    };
    if (!data.name || !data.categoryId) { toast('Please fill in name and category.'); return; }
    await saveProduct(data, !id);
    await reloadAll();
    closeOverlay('overlayProduct');
    renderInventory();
    toast(id ? 'Product updated' : 'Product added');
  });

  document.getElementById('btnConfirmAdjust').addEventListener('click', async () => {
    const qty = parseInt(document.getElementById('adjQty').value, 10);
    const type = document.getElementById('adjType').value;
    const reason = document.getElementById('adjReason').value.trim();
    if (!qty) { toast('Enter a non-zero quantity.'); return; }
    if (type === 'restock' && qty < 0) { toast('Restocks should be a positive number.'); return; }
    const result = await applyAdjustment(adjustTargetId, qty, type, reason || (type === 'restock' ? 'Restock' : 'Manual correction'));
    if (!result.ok) { toast(result.message); return; }
    await reloadAll();
    closeOverlay('overlayAdjust');
    renderInventory();
    toast('Stock adjusted');
  });
}
