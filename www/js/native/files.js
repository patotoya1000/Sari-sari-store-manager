// native/files.js — the ONLY file that touches the Filesystem and Share plugins.
// Used for exporting reports (Phase 3) and will be reused for JSON backup/restore
// (Phase 4). Everything else calls saveAndShare() and never references Capacitor.

import { isNative } from './platform.js';

function getFilesystem() {
  return window.Capacitor?.Plugins?.Filesystem || null;
}

function getShare() {
  return window.Capacitor?.Plugins?.Share || null;
}

// Writes `content` (a string) to a file named `filename` and opens the native
// share sheet so the person can save it to Drive, send it, print it, etc.
// Outside the native app (e.g. testing in a desktop browser) this falls back
// to a plain browser download instead.
export async function saveAndShare(filename, content, mimeType) {
  if (isNative()) {
    const fs = getFilesystem();
    if (!fs) throw new Error("Saving files isn't available on this device.");

    await fs.writeFile({
      path: filename,
      data: content,
      directory: 'CACHE',
      encoding: 'utf8'
    });
    const { uri } = await fs.getUri({ path: filename, directory: 'CACHE' });

    const share = getShare();
    if (share) {
      await share.share({ title: filename, url: uri });
    }
    return { ok: true, uri };
  }

  // Browser fallback — plain download.
  const blob = new Blob([content], { type: mimeType || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { ok: true };
}
