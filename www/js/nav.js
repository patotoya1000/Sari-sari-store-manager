// nav.js — switches which .view is visible and toggles the bottom-sheet overlays.
// Deliberately knows nothing about what a "dashboard" or "scanner" view actually renders —
// that's supplied by app.js as a { viewName: renderFn } map, so this file never imports views.

export function openOverlay(id) {
  document.getElementById(id).classList.add('active');
}

export function closeOverlay(id) {
  document.getElementById(id).classList.remove('active');
}

export function navigate(name, renderers) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.nav === name));
  if (renderers[name]) renderers[name]();
  document.getElementById('main').scrollTop = 0;
}
