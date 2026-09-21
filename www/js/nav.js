// nav.js — switches which .view is visible and toggles the bottom-sheet overlays.

export function openOverlay(id) {
  document.getElementById(id).classList.add('active');
}

export function closeOverlay(id) {
  document.getElementById(id).classList.remove('active');
}

// `renderers` is a { viewName: renderFn } map supplied by app.js, so this
// module doesn't need to import every view module directly.
export function navigate(name, renderers) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.nav === name));
  if (renderers[name]) renderers[name]();
  document.getElementById('main').scrollTop = 0;
}
