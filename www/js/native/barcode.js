// native/barcode.js — the ONLY file in this app that touches the barcode-scanning plugin.
// Everything else (views/scanner.js included) calls the functions below and never
// references Capacitor or the plugin directly. If you swap scanner plugins later,
// this is the only file that changes.
//
// Uses the global `Capacitor.Plugins` bridge rather than `import { BarcodeScanner }
// from '@capacitor-mlkit/barcode-scanning'` because this project has no JS bundler
// yet, so bare npm-package imports won't resolve in the WebView. If you add a bundler
// (Vite, etc.) later, swap the two lines below for a real import — nothing else needs
// to change.

function getPlugin() {
  return window.Capacitor?.Plugins?.BarcodeScanner || null;
}

export function isNative() {
  return !!window.Capacitor?.isNativePlatform?.();
}

// Returns true/false. Never throws — if the plugin or platform isn't available,
// treat scanning as unsupported and let the caller fall back to manual entry.
export async function isScanSupported() {
  const plugin = getPlugin();
  if (!isNative() || !plugin) return false;
  try {
    const { supported } = await plugin.isSupported();
    return !!supported;
  } catch (err) {
    console.warn('BarcodeScanner.isSupported failed', err);
    return false;
  }
}

// Requests camera permission for scanning. Returns true/false; never throws.
export async function ensurePermission() {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.requestPermissions();
    return result?.camera === 'granted' || result?.camera === 'limited';
  } catch (err) {
    console.warn('BarcodeScanner.requestPermissions failed', err);
    return false;
  }
}

// Opens the plugin's ready-made full-screen scan UI and resolves with the raw
// decoded string, or null if the user cancelled. Throws only on a genuine plugin error.
export async function scanOnce() {
  const plugin = getPlugin();
  if (!plugin) throw new Error('Barcode scanning isn\'t available on this device.');
  const { barcodes } = await plugin.scan();
  if (!barcodes || barcodes.length === 0) return null;
  return barcodes[0].rawValue || barcodes[0].displayValue || null;
}
