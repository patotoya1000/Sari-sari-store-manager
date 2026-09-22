import { peso } from '../utils/format.js';
import { escapeHTML, toast } from '../utils/dom.js';
import { getSalesReport, getInventoryReport, getAuditReport, PERIODS } from '../services/reports.js';
import { productName } from '../services/data.js';
import { saveAndShare } from '../native/files.js';

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'audit', label: 'Stock audit' }
];

let activeType = 'sales';    // 'sales' | 'inventory' | 'audit'
let activePeriod = 'today';  // ignored for 'inventory', which is always a snapshot

export function renderReports() {
  renderTypeChips();
  renderPeriodChips();
  renderActiveReport();
}

function renderTypeChips() {
  const el = document.getElementById('reportTypeChips');
  el.innerHTML = REPORT_TYPES.map(t =>
    `<button class="chip ${activeType === t.id ? 'active' : ''}" data-type="${t.id}">${t.label}</button>`
  ).join('');
  el.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', () => {
      activeType = ch.dataset.type;
      renderReports();
    });
  });
}

function renderPeriodChips() {
  const wrap = document.getElementById('reportPeriodWrap');
  if (activeType === 'inventory') { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  const el = document.getElementById('reportPeriodChips');
  el.innerHTML = PERIODS.map(p =>
    `<button class="chip ${activePeriod === p.id ? 'active' : ''}" data-period="${p.id}">${p.label}</button>`
  ).join('');
  el.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', () => {
      activePeriod = ch.dataset.period;
      renderActiveReport();
    });
  });
}

function renderActiveReport() {
  const el = document.getElementById('reportContent');
  if (activeType === 'sales') el.innerHTML = salesReportHTML(getSalesReport(activePeriod));
  else if (activeType === 'inventory') el.innerHTML = inventoryReportHTML(getInventoryReport());
  else el.innerHTML = auditReportHTML(getAuditReport(activePeriod));
}

function metricRow(rows) {
  return `<div class="stat-grid">${rows}</div>`;
}
function metric(value, label, wide) {
  return `<div class="stat${wide ? ' wide' : ''}"><div class="figure mono">${value}</div><div class="label">${label}</div></div>`;
}

function salesReportHTML(r) {
  const top = r.topProducts.length
    ? r.topProducts.map(p => `
        <div class="row-card">
          <div class="rc-main"><div class="rc-title">${escapeHTML(p.name)}</div><div class="rc-sub">${p.qty} sold</div></div>
          <div class="rc-right"><div class="rc-amt mono">${peso(p.revenue)}</div></div>
        </div>`).join('')
    : '<div class="empty">No sales in this period.</div>';

  return metricRow(
    metric(peso(r.totalRevenue), `Total sales — ${r.periodLabel}`, true) +
    metric(r.transactionCount, 'Transactions') +
    metric(r.itemsSold, 'Items sold')
  ) + `<div class="section-label">Top products</div>${top}`;
}

function inventoryReportHTML(r) {
  const lowList = r.lowStock.length
    ? r.lowStock.map(p => rowWithQty(p.name, p.quantity)).join('')
    : '<div class="empty">Nothing is low on stock.</div>';
  const expList = r.expiringSoon.length
    ? r.expiringSoon.map(p => rowWithQty(p.name, p.quantity)).join('')
    : '<div class="empty">Nothing expiring within 7 days.</div>';

  return metricRow(
    metric(r.totalProducts, 'Products tracked') +
    metric(r.totalUnits, 'Units in stock') +
    metric(peso(r.totalSellingValue), `Stock value at selling price (cost: ${peso(r.totalCostValue)})`, true)
  ) +
    `<div class="section-label">Low stock</div>${lowList}` +
    `<div class="section-label">Expiring within 7 days</div>${expList}`;
}

function rowWithQty(name, qty) {
  return `<div class="row-card"><div class="rc-main"><div class="rc-title">${escapeHTML(name)}</div></div><div class="rc-right"><div class="rc-amt mono">${qty}</div></div></div>`;
}

function auditReportHTML(r) {
  return metricRow(
    metric(r.checked, `Products checked — ${r.periodLabel}`, true) +
    metric(r.increased, 'Stock increased') +
    metric(r.decreased, 'Stock decreased') +
    metric(r.noDifference, 'No difference', true)
  );
}

// --- Word export -----------------------------------------------------------
// This produces an HTML document wrapped in the Microsoft Office XML namespace
// hints Word recognizes, saved with a .doc extension. Word/LibreOffice/Google
// Docs all open it correctly, but it is genuinely HTML under the hood, not a
// real OOXML .docx. Word may show a one-time "this isn't the format the
// extension suggests, open anyway?" prompt — that's expected. A true .docx
// would need a library like `docx`, which needs a JS bundler this project
// doesn't have yet (see BUILD-AUDIT.md).
function wordEnvelope(title, bodyHtml) {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHTML(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body{ font-family:Calibri, Arial, sans-serif; color:#1F3A2E; }
  h1{ font-size:20px; margin-bottom:2px; }
  .muted{ color:#666; font-size:11px; margin-bottom:18px; }
  h2{ font-size:14px; margin-top:22px; border-bottom:1px solid #ccc; padding-bottom:4px; }
  table{ border-collapse:collapse; width:100%; margin-top:8px; }
  td,th{ border:1px solid #999; padding:6px 8px; font-size:12px; text-align:left; }
  th{ background:#EAF1E4; }
</style></head>
<body>${bodyHtml}</body></html>`;
}

function buildExportDocument() {
  const storeName = document.getElementById('storeNameDisplay').textContent || 'Store';
  const generated = new Date().toLocaleString('en-PH');
  let title, bodyHtml;

  if (activeType === 'sales') {
    const r = getSalesReport(activePeriod);
    title = `Sales Report - ${r.periodLabel}`;
    bodyHtml = `
      <h1>${escapeHTML(storeName)} — Sales Report</h1>
      <div class="muted">${escapeHTML(r.periodLabel)} · Generated ${escapeHTML(generated)}</div>
      <h2>Summary</h2>
      <table>
        <tr><th>Total sales</th><td>${peso(r.totalRevenue)}</td></tr>
        <tr><th>Transactions</th><td>${r.transactionCount}</td></tr>
        <tr><th>Items sold</th><td>${r.itemsSold}</td></tr>
      </table>
      <h2>Top products</h2>
      <table>
        <tr><th>Product</th><th>Quantity sold</th><th>Revenue</th></tr>
        ${r.topProducts.map(p => `<tr><td>${escapeHTML(p.name)}</td><td>${p.qty}</td><td>${peso(p.revenue)}</td></tr>`).join('')
          || '<tr><td colspan="3">No sales in this period.</td></tr>'}
      </table>`;
  } else if (activeType === 'inventory') {
    const r = getInventoryReport();
    title = `Inventory Report`;
    bodyHtml = `
      <h1>${escapeHTML(storeName)} — Inventory Report</h1>
      <div class="muted">Current snapshot · Generated ${escapeHTML(generated)}</div>
      <h2>Summary</h2>
      <table>
        <tr><th>Products tracked</th><td>${r.totalProducts}</td></tr>
        <tr><th>Units in stock</th><td>${r.totalUnits}</td></tr>
        <tr><th>Stock value (cost)</th><td>${peso(r.totalCostValue)}</td></tr>
        <tr><th>Stock value (selling price)</th><td>${peso(r.totalSellingValue)}</td></tr>
      </table>
      <h2>Low stock</h2>
      <table>
        <tr><th>Product</th><th>Quantity</th></tr>
        ${r.lowStock.map(p => `<tr><td>${escapeHTML(p.name)}</td><td>${p.quantity}</td></tr>`).join('')
          || '<tr><td colspan="2">Nothing is low on stock.</td></tr>'}
      </table>
      <h2>Expiring within 7 days</h2>
      <table>
        <tr><th>Product</th><th>Quantity</th><th>Expires</th></tr>
        ${r.expiringSoon.map(p => `<tr><td>${escapeHTML(p.name)}</td><td>${p.quantity}</td><td>${escapeHTML(p.expirationDate || '')}</td></tr>`).join('')
          || '<tr><td colspan="3">Nothing expiring within 7 days.</td></tr>'}
      </table>`;
  } else {
    const r = getAuditReport(activePeriod);
    title = `Stock Audit Report - ${r.periodLabel}`;
    bodyHtml = `
      <h1>${escapeHTML(storeName)} — Stock Audit Report</h1>
      <div class="muted">${escapeHTML(r.periodLabel)} · Generated ${escapeHTML(generated)}</div>
      <h2>Summary</h2>
      <table>
        <tr><th>Products checked</th><td>${r.checked}</td></tr>
        <tr><th>Stock increased</th><td>${r.increased}</td></tr>
        <tr><th>Stock decreased</th><td>${r.decreased}</td></tr>
        <tr><th>No difference</th><td>${r.noDifference}</td></tr>
      </table>
      <h2>Audit entries</h2>
      <table>
        <tr><th>Date</th><th>Product</th><th>System</th><th>Physical</th><th>Difference</th><th>Reason</th></tr>
        ${r.entries.map(a => `<tr><td>${escapeHTML(new Date(a.date).toLocaleDateString('en-PH'))}</td><td>${escapeHTML(productName(a.productId))}</td><td>${a.systemQuantity}</td><td>${a.physicalQuantity}</td><td>${a.difference > 0 ? '+' : ''}${a.difference}</td><td>${escapeHTML(a.reason || '—')}</td></tr>`).join('')
          || '<tr><td colspan="6">No audits in this period.</td></tr>'}
      </table>`;
  }

  const filename = `${title.replace(/[^a-z0-9]+/gi, '-')}.doc`;
  return { filename, html: wordEnvelope(title, bodyHtml) };
}

export function wireReports() {
  document.getElementById('btnExportReport').addEventListener('click', async () => {
    try {
      const { filename, html } = buildExportDocument();
      await saveAndShare(filename, html, 'application/msword');
      toast('Report ready to save or share');
    } catch (err) {
      console.error(err);
      toast('Could not export the report.');
    }
  });
}
