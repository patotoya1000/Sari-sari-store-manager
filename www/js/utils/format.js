// utils/format.js — pure formatting functions. No DOM access in this file.

export function peso(n) {
  const v = Number(n) || 0;
  return "₱" + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ", " +
         d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns the human-readable greeting only. The matching icon is provided by
// greetingIconForNow(), keeping presentation markup out of this pure utility.
export function greetingForNow(date = new Date()) {
  const h = new Date(date).getHours();
  if (h < 11) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Centralized mapping used by the dashboard's local SVG icon system.
export function greetingIconForNow(date = new Date()) {
  const h = new Date(date).getHours();
  if (h < 11) return "sun";
  if (h < 18) return "sun";
  return "moon";
}
