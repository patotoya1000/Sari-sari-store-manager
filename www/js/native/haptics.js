// native/haptics.js — the ONLY file that touches the Haptics plugin. Every call is
// best-effort: if the plugin isn't there (running in a plain browser, permission
// issue, etc.) we just do nothing rather than let a vibration failure break a flow.

function getPlugin() {
  return window.Capacitor?.Plugins?.Haptics || null;
}

async function impact(style) {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.impact({ style });
  } catch (err) {
    console.warn('Haptics.impact failed', err);
  }
}

export const tapLight = () => impact('LIGHT');
export const tapMedium = () => impact('MEDIUM');
export const tapHeavy = () => impact('HEAVY');
