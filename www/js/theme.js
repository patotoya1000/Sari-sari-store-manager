// theme.js — the only file that touches the DOM for theming. Persistence lives
// in services/settings.js (getTheme/setTheme); this file just paints it.

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
}