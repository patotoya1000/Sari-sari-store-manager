import { state, AUDIT_REASONS } from '../state.js';
import { escapeHTML, toast } from '../utils/dom.js';
import { fmtDateTime } from '../utils/format.js';
import { performStockAudit, reloadAll, productName } from '../services/data.js';
import { openOverlay, closeOverlay } from '../nav.js';
import { tapLight } from '../native/haptics.js';

let auditTargetId = null;
let onAuditDoneCallback = null;

// `onDone` lets the caller (inventory.js or scanner.js) decide what to refresh
// afterwards, without this file needing to import either of them.
export function openAuditSheet(product, onDone) {
  auditTargetId = product.id;
  onAuditDoneCallback = onDone || null;
  document.getElementById('auditProductLabel').textContent = product.name;
  document.getElementById('auditSystemQty').value = product.quantity;
  document.getElementById('auditPhysicalQty').value = '';
  document.getElementById('auditNotes').value = '';
  document.getElementById('auditDiffRow').style.display = 'none';
  document.getElementById('auditReasonField').style.display = 'none';
  document.getElementById('auditNotesField').style.display = 'none';
  openOverlay('overlayAudit');
}

function updateDiffPreview() {
  const systemQty = Number(document.getElementById('auditSystemQty').value) || 0;
  const raw = document.getElementById('auditPhysicalQty').value;
  const diffRow = document.getElementById('auditDiffRow');
  const reasonField = document.getElementById('auditReasonField');
  const notesField = document.getElementById('auditNotesField');

  if (raw === '') {
    diffRow.style.display = 'none';
    reasonField.style.display = 'none';
    notesField.style.display = 'none';
    return;
  }
  const physical = Number(raw);
  const diff = physical - systemQty;
  diffRow.style.display = 'flex';
  const diffEl = document.getElementById('auditDiffValue');
  diffEl.textContent = (diff > 0 ? '+' : '') + diff;
  diffEl.className = 'rc-amt mono diff-badge ' + (diff === 0 ? '' : diff > 0 ? 'mv-pos' : 'mv-neg');

  const showReason = diff !== 0;
  reasonField.style.display = showReason ? 'block' : 'none';
  notesField.style.display = showReason ? 'block' : 'none';
}

export function wireAuditSheet() {
  const reasonSelect = document.getElementById('auditReason');
  reasonSelect.innerHTML = AUDIT_REASONS.map(r => `<option value="${escapeHTML(r)}">${escapeHTML(r)}</option>`).join('');

  document.getElementById('auditPhysicalQty').addEventListener('input', updateDiffPreview);

  document.getElementById('btnConfirmAudit').addEventListener('click', async () => {
    const raw = document.getElementById('auditPhysicalQty').value;
    if (raw === '') { toast('Enter the physical count.'); return; }
    const physical = parseInt(raw, 10);
    const reason = document.getElementById('auditReason').value;
    const notes = document.getElementById('auditNotes').value.trim();

    const result = await performStockAudit(auditTargetId, physical, reason, notes);
    if (!result.ok) { toast(result.message); return; }

    await reloadAll();
    closeOverlay('overlayAudit');
    tapLight();
    toast(result.difference === 0
      ? 'Audit saved — no difference'
      : `Audit saved — ${result.difference > 0 ? '+' : ''}${result.difference} adjustment`);

    if (onAuditDoneCallback) onAuditDoneCallback();
  });
}

// Used on the Scan tab so audits are visible without having to go dig through the
// full ledger. `limit` keeps it to a short, glanceable list.
export function renderRecentAudits(containerId, limit = 5) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const list = state.stockAudits.slice(0, limit);
  if (list.length === 0) {
    el.innerHTML = '<div class="empty">No stock audits recorded yet.</div>';
    return;
  }
  el.innerHTML = list.map(a => {
    const diffClass = a.difference === 0 ? '' : a.difference > 0 ? 'mv-pos' : 'mv-neg';
    const diffText = a.difference === 0
      ? 'No difference'
      : `${a.difference > 0 ? '+' : ''}${a.difference} (${a.reason || 'no reason given'})`;
    return `
      <div class="row-card">
        <div class="rc-main">
          <div class="rc-title">${escapeHTML(productName(a.productId))}</div>
          <div class="rc-sub">System ${a.systemQuantity} → Physical ${a.physicalQuantity}</div>
          <div class="rc-sub">${fmtDateTime(a.date)}</div>
        </div>
        <div class="rc-right">
          <div class="rc-amt mono ${diffClass}">${diffText}</div>
        </div>
      </div>`;
  }).join('');
}
