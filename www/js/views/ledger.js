import { state } from '../state.js';
import { fmtDateTime, } from '../utils/format.js';
import { escapeHTML } from '../utils/dom.js';
import { productName } from '../services/data.js';

export function movementTypeLabel(type) {
  return {
    initial_stock: 'New stock',
    sale: 'Sale',
    restock: 'Restock',
    manual_adjustment: 'Adjustment',
    stock_audit: 'Stock audit',
    quick_deduct: 'Quick deduct'
  }[type] || type;
}

// Exported because dashboard.js reuses it for the "recent activity" list.
export function movementRowHTML(mv) {
  const isPos = mv.quantityChange >= 0;
  return `
    <div class="row-card">
      <div class="rc-main">
        <div class="rc-title">${escapeHTML(productName(mv.productId))}</div>
        <div class="rc-sub">${movementTypeLabel(mv.type)}${mv.reason ? ' · ' + escapeHTML(mv.reason) : ''}</div>
        <div class="rc-sub">${fmtDateTime(mv.timestamp)}</div>
      </div>
      <div class="rc-right">
        <div class="rc-amt mono ${isPos ? 'mv-pos' : 'mv-neg'}">${isPos ? '+' : ''}${mv.quantityChange}</div>
      </div>
    </div>`;
}

export function renderLedger() {
  const list = state.movements.filter(mv => state.ledgerFilter === 'all' || mv.type === state.ledgerFilter);
  const el = document.getElementById('ledgerList');
  if (list.length === 0) {
    el.innerHTML = '<div class="empty">No movements recorded yet.</div>';
    return;
  }
  el.innerHTML = list.map(movementRowHTML).join('');
}

export function wireLedgerFilters() {
  document.querySelectorAll('#ledgerFilter .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      document.querySelectorAll('#ledgerFilter .chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      state.ledgerFilter = ch.dataset.type;
      renderLedger();
    });
  });
}
