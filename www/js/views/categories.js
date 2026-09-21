import { state } from '../state.js';
import { escapeHTML } from '../utils/dom.js';
import { toast } from '../utils/dom.js';
import { reloadAll } from '../services/data.js';
import { put, uid } from '../services/db.js';

export function renderCategories() {
  const el = document.getElementById('catList');
  if (state.categories.length === 0) {
    el.innerHTML = '<div class="empty">No categories yet.</div>';
    return;
  }
  el.innerHTML = state.categories.map(c => {
    const count = state.products.filter(p => p.categoryId === c.id).length;
    return `<div class="row-card"><div class="rc-main"><div class="rc-title">${escapeHTML(c.name)}</div><div class="rc-sub">${count} product${count === 1 ? '' : 's'}</div></div></div>`;
  }).join('');
}

export function wireCategoryForm() {
  document.getElementById('btnAddCategory').addEventListener('click', async () => {
    const input = document.getElementById('newCatInput');
    const name = input.value.trim();
    if (!name) return;
    await put('categories', { id: uid(), name });
    input.value = '';
    await reloadAll();
    renderCategories();
    toast('Category added');
  });
}
