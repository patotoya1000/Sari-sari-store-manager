import { state } from '../state.js';
import { peso } from '../utils/format.js';
import { escapeHTML, toast } from '../utils/dom.js';
import { findProductByBarcode, performQuickDeduct, reloadAll } from '../services/data.js';
import { openOverlay, closeOverlay } from '../nav.js';
import { openProductForm, prefillNewProductBarcode } from './inventory.js';
import { openAuditSheet, renderRecentAudits } from './audit.js';
import { isNative, isScanSupported, ensurePermission, scanOnce } from '../native/barcode.js';
import { tapLight, tapMedium } from '../native/haptics.js';

let quickDeductTargetId = null;

export function renderScanner() {
  document.getElementById('scanManualInput').value = '';
  clearScanResult();
  renderRecentAudits('scanRecentAudits', 5);

  // Only offer the live-scan button where it could actually work — otherwise
  // lead straight to manual entry instead of a button that will just fail.
  const native = isNative();
  document.getElementById('btnStartScan').style.display = native ? 'block' : 'none';
  document.getElementById('scanUnsupportedNote').style.display = native ? 'none' : 'block';
}

function clearScanResult() {
  document.getElementById('scanResult').innerHTML = '';
}

async function handleScannedCode(code) {
  if (!code) return;
  const product = findProductByBarcode(code);
  if (product) {
    tapMedium();
    state.lastScannedProduct = product;
    renderFoundProduct(product);
  } else {
    renderNotFound(code);
  }
}

function renderFoundProduct(product) {
  const el = document.getElementById('scanResult');
  el.innerHTML = `
    <div class="scan-result">
      <div class="sr-name">${escapeHTML(product.name)}</div>
      <div class="sr-sub">${product.quantity} in stock · ${peso(product.sellingPrice)}</div>
      <div class="scan-actions">
        <button class="btn btn-ghost" type="button" id="scanActionDeduct">Quick deduct</button>
        <button class="btn btn-ghost" type="button" id="scanActionAudit">Stock audit</button>
        <button class="btn btn-primary full" type="button" id="scanActionView">View / edit product</button>
      </div>
    </div>`;

  document.getElementById('scanActionDeduct').addEventListener('click', () => openQuickDeductSheet(product));
  document.getElementById('scanActionAudit').addEventListener('click', () => openAuditSheet(product, renderScanner));
  document.getElementById('scanActionView').addEventListener('click', () => openProductForm(product));
}

function renderNotFound(code) {
  const el = document.getElementById('scanResult');
  el.innerHTML = `
    <div class="scan-result">
      <div class="sr-name">No product matches this barcode</div>
      <div class="sr-sub mono">${escapeHTML(code)}</div>
      <div class="scan-actions">
        <button class="btn btn-primary full" type="button" id="scanActionAddNew">Add as a new product</button>
      </div>
    </div>`;
  document.getElementById('scanActionAddNew').addEventListener('click', () => prefillNewProductBarcode(code));
}

function openQuickDeductSheet(product) {
  quickDeductTargetId = product.id;
  document.getElementById('qdProductLabel').textContent = `${product.name} — currently ${product.quantity} in stock`;
  document.getElementById('qdQty').value = 1;
  document.getElementById('qdReason').value = '';
  openOverlay('overlayQuickDeduct');
}

export function wireScanner() {
  document.getElementById('btnStartScan').addEventListener('click', async () => {
    try {
      const supported = await isScanSupported();
      if (!supported) { toast("Live scanning isn't supported on this device — use manual entry below."); return; }
      const granted = await ensurePermission();
      if (!granted) { toast('Camera permission is needed to scan.'); return; }
      const code = await scanOnce();
      if (code) await handleScannedCode(code);
    } catch (err) {
      console.error(err);
      toast('Scanning failed — try manual entry below.');
    }
  });

  document.getElementById('btnManualLookup').addEventListener('click', () => {
    const code = document.getElementById('scanManualInput').value.trim();
    if (!code) { toast('Enter a barcode first.'); return; }
    handleScannedCode(code);
  });

  document.getElementById('btnConfirmQuickDeduct').addEventListener('click', async () => {
    const qty = parseInt(document.getElementById('qdQty').value, 10);
    const reason = document.getElementById('qdReason').value.trim();
    const result = await performQuickDeduct(quickDeductTargetId, qty, reason);
    if (!result.ok) { toast(result.message); return; }
    await reloadAll();
    closeOverlay('overlayQuickDeduct');
    tapLight();
    toast('Stock deducted');
    clearScanResult();
  });
}
