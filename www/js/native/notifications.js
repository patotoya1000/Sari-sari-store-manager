// native/notifications.js — the ONLY file that touches the Local Notifications plugin.
// Best-effort throughout: a notification failing to schedule should never interrupt
// the actual inventory/sales flow.

function getPlugin() {
  return window.Capacitor?.Plugins?.LocalNotifications || null;
}

export async function ensurePermission() {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    const current = await plugin.checkPermissions();
    if (current?.display === 'granted') return true;
    const requested = await plugin.requestPermissions();
    return requested?.display === 'granted';
  } catch (err) {
    console.warn('LocalNotifications permission check failed', err);
    return false;
  }
}

// Fires one notification immediately (no `schedule` field = "now"). Caller decides
// title/body and is responsible for not calling this too often — this file doesn't
// debounce or dedupe on its own.
export async function notifyNow(title, body) {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.schedule({
      notifications: [{ id: Math.floor(Date.now() % 2147483647), title, body }]
    });
  } catch (err) {
    console.warn('LocalNotifications.schedule failed', err);
  }
}
