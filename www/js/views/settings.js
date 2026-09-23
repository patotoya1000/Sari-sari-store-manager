import { escapeHTML, toast } from '../utils/dom.js';
import { getStoreName, setStoreName, getTheme, setTheme } from '../services/settings.js';
import { buildBackup, validateBackup, restoreBackup } from '../services/backup.js';
import { saveAndShare } from '../native/files.js';
import { applyTheme } from '../theme.js';
import { icon } from '../utils/icons.js';

let pendingRestore = null; // validated backup data waiting on a confirm tap

export async function renderSettings() {
  const name = await getStoreName();
  document.getElementById('settingsStoreName').value = name;

  const theme = await getTheme();
  renderThemeChips(theme);

  clearRestorePreview();
}

function renderThemeChips(activeTheme) {
  const el = document.getElementById('themeChips');
  el.innerHTML = `
    <button class="theme-option ${activeTheme === 'light' ? 'active' : ''}" data-theme="light" aria-pressed="${activeTheme === 'light'}">
      <span class="theme-icon">${icon('sun')}</span>
      <span><strong>Light</strong><small>Bright appearance</small></span>
      ${activeTheme === 'light' ? `<span class="theme-check">${icon('check')}</span>` : ''}
    </button>
    <button class="theme-option ${activeTheme === 'dark' ? 'active' : ''}" data-theme="dark" aria-pressed="${activeTheme === 'dark'}">
      <span class="theme-icon">${icon('moon')}</span>
      <span><strong>Dark</strong><small>Low-light appearance</small></span>
      ${activeTheme === 'dark' ? `<span class="theme-check">${icon('check')}</span>` : ''}
    </button>`;
  el.querySelectorAll('.theme-option').forEach(ch => {
    ch.addEventListener('click', async () => {
      const theme = ch.dataset.theme;
      applyTheme(theme);          // instant visual feedback
      await setTheme(theme);      // then persist
      renderThemeChips(theme);
    });
  });
}

function clearRestorePreview() {
  pendingRestore = null;
  document.getElementById('restorePreview').innerHTML = '';
  document.getElementById('restorePreview').style.display = 'none';
  document.getElementById('restoreActions').style.display = 'none';
  document.getElementById('restoreFileInput').value = '';
}

function renderRestorePreview(result) {
  const previewEl = document.getElementById('restorePreview');
  const actionsEl = document.getElementById('restoreActions');

  if (!result.ok) {
    previewEl.innerHTML = `<div class="empty">${result.errors.map(escapeHTML).join('<br>')}</div>`;
    previewEl.style.display = 'block';
    actionsEl.style.display = 'none';
    pendingRestore = null;
    return;
  }

  const s = result.summary;
  const warningsHtml = result.warnings.length
    ? `<p style="color:var(--rust); font-size:12px; margin-top:8px;">${result.warnings.map(escapeHTML).join('<br>')}</p>`
    : '';

  previewEl.innerHTML = `
    <div class="row-card"><div class="rc-main"><div class="rc-title">Backup from</div></div><div class="rc-right"><div class="rc-amt mono">${s.createdAt ? escapeHTML(new Date(s.createdAt).toLocaleString('en-PH')) : 'Unknown'}</div></div></div>
    <div class="row-card"><div class="rc-main"><div class="rc-title">Store name</div></div><div class="rc-right"><div class="rc-amt mono">${escapeHTML(s.storeName || '—')}</div></div></div>
    <div class="row-card"><div class="rc-main"><div class="rc-title">Categories</div></div><div class="rc-right"><div class="rc-amt mono">${s.categories}</div></div></div>
    <div class="row-card"><div class="rc-main"><div class="rc-title">Products</div></div><div class="rc-right"><div class="rc-amt mono">${s.products}</div></div></div>
    <div class="row-card"><div class="rc-main"><div class="rc-title">Sales</div></div><div class="rc-right"><div class="rc-amt mono">${s.sales}</div></div></div>
    <div class="row-card"><div class="rc-main"><div class="rc-title">Stock audits</div></div><div class="rc-right"><div class="rc-amt mono">${s.stockAudits}</div></div></div>
    <div class="row-card"><div class="rc-main"><div class="rc-title">Inventory movements</div></div><div class="rc-right"><div class="rc-amt mono">${s.inventoryMovements}</div></div></div>
    ${warningsHtml}`;
  previewEl.style.display = 'block';
  actionsEl.style.display = 'block';
}

export function wireSettings() {
  document.getElementById('btnSaveStoreName').addEventListener('click', async () => {
    const input = document.getElementById('settingsStoreName');
    const saved = await setStoreName(input.value);
    input.value = saved;
    document.getElementById('storeNameDisplay').textContent = saved;
    toast('Store name saved');
  });

  document.getElementById('btnExportBackup').addEventListener('click', async () => {
    try {
      const storeName = document.getElementById('storeNameDisplay').textContent || 'Store';
      const backup = buildBackup(storeName);
      const filename = `sarisari-backup-${new Date().toISOString().slice(0, 10)}.json`;
      await saveAndShare(filename, JSON.stringify(backup, null, 2), 'application/json');
      toast('Backup ready to save or share');
    } catch (err) {
      console.error(err);
      toast('Could not create the backup.');
    }
  });

  document.getElementById('restoreFileInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = validateBackup(text);
      pendingRestore = result.ok ? result.data : null;
      renderRestorePreview(result);
    } catch (err) {
      console.error(err);
      toast('Could not read that file.');
    }
  });

  document.getElementById('btnCancelRestore').addEventListener('click', clearRestorePreview);

  document.getElementById('btnConfirmRestore').addEventListener('click', async () => {
    if (!pendingRestore) return;
    if (!confirm('This replaces all current products, categories, sales, and history with the backup. This cannot be undone. Continue?')) return;
    try {
      await restoreBackup(pendingRestore);
      clearRestorePreview();
      toast('Data restored from backup');
      await renderSettings();
    } catch (err) {
      console.error(err);
      toast('Restore failed — your current data was not changed.');
    }
  });
}