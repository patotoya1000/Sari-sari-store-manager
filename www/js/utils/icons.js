// utils/icons.js — small local SVG icon system. No external icon library or network dependency.

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path><path d="M9 21v-6h6v6"></path>',
  inventory: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path><path d="M8 5V3h8v2"></path><path d="M8 14h8"></path>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M7 12h10"></path><path d="M9 9v6"></path><path d="M15 9v6"></path>',
  cart: '<circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle><path d="M3 4h2l2.2 10.3a2 2 0 0 0 2 1.7h8.5a2 2 0 0 0 1.9-1.5L21 8H6"></path>',
  ledger: '<path d="M6 4h14v16H6a3 3 0 0 1 0-16Z"></path><path d="M6 4a3 3 0 0 0 0 16"></path><path d="M10 8h6"></path><path d="M10 12h6"></path>',
  reports: '<path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-7"></path><path d="M22 20H2"></path>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="m19.4 15 .1.1 1.5 1.2-1.8 3.1-1.8-.7a7.8 7.8 0 0 1-1.6.9L15.5 21h-3.6l-.3-1.4a7.8 7.8 0 0 1-1.6-.9l-1.8.7-1.8-3.1 1.5-1.2.1-.1a8 8 0 0 1 0-2l-.1-.1-1.5-1.2 1.8-3.1 1.8.7a7.8 7.8 0 0 1 1.6-.9l.3-1.4h3.6l.3 1.4a7.8 7.8 0 0 1 1.6.9l1.8-.7 1.8 3.1-1.5 1.2-.1.1a8 8 0 0 1 0 2Z"></path>',
  search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
  plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  close: '<path d="m6 6 12 12"></path><path d="m18 6-12 12"></path>',
  back: '<path d="m15 18-6-6 6-6"></path>',
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"></path>',
  download: '<path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>',
  trash: '<path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path>',
  check: '<path d="m5 12 4 4L19 6"></path>',
  barcode: '<path d="M4 5v14"></path><path d="M7 5v14"></path><path d="M10 5v14"></path><path d="M14 5v14"></path><path d="M17 5v14"></path><path d="M20 5v14"></path>'
};

export function icon(name, className = 'ui-icon') {
  const paths = PATHS[name];
  if (!paths) return '';
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.dataset.icon;
    const className = el.dataset.iconClass || 'ui-icon';
    const svg = icon(name, className);
    if (svg) el.innerHTML = svg;
  });
}
