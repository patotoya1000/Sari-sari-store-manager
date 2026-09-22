# Sari-Sari Store Manager — Build Audit

Tracks what's actually implemented against the proposal, so progress is verifiable at a glance. Updated each time we add or change something.

**Stack decisions locked in:**
- Web layer: vanilla HTML/CSS/JS, IndexedDB for storage, no bundler (native plugins accessed via the global `Capacitor.Plugins` bridge rather than npm imports — see "Native plugin access" below).
- Shell: wrapped in **Capacitor for a native Android build** (`android/` + `www/` project).
- Barcode scanning: **@capacitor-mlkit/barcode-scanning** (Google ML Kit) — you'll need to `npm install` it; see "What you need to run locally."
- Haptics + local notifications wired in using the already-installed `@capacitor/haptics` and `@capacitor/local-notifications`.
- File export/import (Phase 3 + 4): **@capacitor/filesystem** + **@capacitor/share** — also need `npm install`; see "What you need to run locally."
- Restore for JSON backups uses the plain HTML `<input type="file">` element — Android's WebView opens the native file picker for this automatically, so no extra file-picker plugin was needed.

---

## Phase 1 — Core

| # | Feature | Status |
|---|---|---|
| 1 | Dashboard overview | ✅ Done |
| 2 | Product CRUD | ✅ Done |
| 3 | Categories | ✅ Done |
| 4 | Sales recording | ✅ Done |
| 5 | Automatic stock deduction | ✅ Done (via the ledger) |
| 6 | Inventory movement ledger | ✅ Done |
| 7 | Low-stock indicator | ✅ Done |
| 8 | Expiration indicator | ✅ Done (basic — folded into Dashboard/Inventory) |

## Phase 2 — Smart Inventory

| # | Feature (from proposal) | Status | Notes |
|---|---|---|---|
| 9 | Live camera barcode scanning | ✅ Done | Via `@capacitor-mlkit/barcode-scanning`'s ready-made full-screen `scan()` UI. Falls back to manual barcode entry automatically outside the native app. |
| 10 | Unknown-product registration flow | ✅ Done | Scan result "not found" → **Add as a new product**, opens the product form with the barcode pre-filled |
| 11 | Quick Stock Deduction | ✅ Done | Scan a known product → **Quick deduct** → quantity + required reason → writes a `quick_deduct` movement |
| 12 | Stock Audit module | ✅ Done | Reachable from a scan result **or** from a product's edit form → **Stock audit**. Compares system quantity vs. physical count, requires a reason when they differ, saves a `StockAudit` record, and — only if there's a real difference — writes a `stock_audit` movement |
| 13 | Audit history | ✅ Done | "Recent stock audits" list on the Scan tab + a Ledger filter + the full aggregate summary in Reports → Stock audit (Phase 3) |
| — | Haptic feedback | ✅ Done (added) | Light tap on sale confirm, stock audit save, quick deduct; medium tap on a successful scan match |
| — | Low-stock / expiring push notification | ✅ Done (added) | One native notification per app launch, summarizing counts |

## Phase 3 — Reports & Export

| # | Feature (from proposal) | Status | Notes |
|---|---|---|---|
| 14 | Sales report (daily/weekly/monthly/overall) | ✅ Done | Period chips: Today / Last 7 days / Last 30 days / All time (rolling windows, not calendar weeks/months) |
| 15 | Inventory report | ✅ Done | Current snapshot: products tracked, units in stock, stock value at cost vs. selling price, low-stock list, expiring-soon list |
| 16 | Audit report | ✅ Done | Matches the proposal's "Stock Audit Summary" shape — Checked / Increased / Decreased / No Difference |
| 17 | Word export | ✅ Done (with a caveat) | HTML document wrapped in Word's recognized namespace hints, saved as `.doc`. Opens fine in Word/LibreOffice/Google Docs (one-time "format doesn't match extension?" prompt is expected) — not a real OOXML `.docx`; see Known gaps |

## Phase 4 — Data Protection & Settings (this build)

| # | Feature (from proposal) | Status | Notes |
|---|---|---|---|
| 18 | JSON export | ✅ Done | Settings → **Export backup (JSON)**. Structure matches the proposal's recommended shape (`backupVersion`, `createdAt`, `store`, `categories`, `products`, `sales`, `saleItems`, `stockAudits`, `inventoryMovements`) |
| 19 | JSON import/restore | ✅ Done | Settings → pick a file → validated (JSON syntax, backup version, required collections, orphaned category references) → **preview shown** (counts + warnings) → explicit confirm → restore. Confirm is a native `confirm()` dialog plus a visually distinct "danger zone," and restore runs as **one atomic IndexedDB transaction** across every store — if anything fails partway, nothing is changed rather than being left half-restored |
| 20 | Backup validation | ✅ Done | JSON syntax, supported `backupVersion`, required collections present, product→category reference check (warns, doesn't block) |
| — | Settings screen | ✅ Done (added) | Reachable via the gear icon in the header (not a bottom tab — see design note below). Store name (editable, was hardcoded before), Appearance (dark mode), Backup, Restore |
| — | Dark mode | ✅ Done (added, not in original proposal) | Light/Dark toggle in Settings, persisted in IndexedDB, applied before the first screen paints on next launch. See "Dark mode" below for how the CSS is structured |

**Design note — why Settings isn't a bottom tab:** the tab bar was already at 6 tabs after Reports (Dashboard/Inventory/Scan/Sell/Ledger/Reports). A 7th tab on a 460px-wide screen starts to feel cramped, and Settings isn't a frequent action the way Scan/Sell are — so it's a gear icon in the header instead, consistent with most mobile apps.

**Backup is inside Settings, not a separate module/tab** — this matches the proposal's own Settings row ("Store information, categories, thresholds, **backup preferences**"), and keeps data-protection actions in one predictable place.

## Not yet started

Nothing from the original 4-phase plan remains. Everything in proposal §15 (Phases 1–4) is implemented. See "Known gaps" below for the honest caveats on what's implemented, and "Possible next steps" for polish ideas beyond the original scope.

## Data model

- `Product` — id, barcode, name, categoryId, costPrice, sellingPrice, quantity, lowStockThreshold, expirationDate
- `Category` — id, name
- `Sale` — id, date, total
- `SaleItem` — id, saleId, productId, quantity, unitPrice, subtotal
- `InventoryMovement` — id, productId, quantityChange, type (`initial_stock` / `sale` / `restock` / `manual_adjustment` / `stock_audit` / `quick_deduct`), reason, timestamp, referenceId
- `StockAudit` — id, date, productId, systemQuantity, physicalQuantity, difference, reason, notes
- `Settings` *(new in Phase 4)* — stored as two rows in the existing `meta` store: store name, theme preference. Deliberately minimal — no separate object store needed for two key/value pairs

## Native plugin access — how it's wired

This project has **no JS bundler**, so `import { X } from '@capacitor/...'` won't resolve in the WebView. Every native call goes through the global `window.Capacitor.Plugins` bridge instead, isolated to these files:

- `js/native/platform.js` — the one shared `isNative()` check every file below uses
- `js/native/barcode.js` — the only file that touches `@capacitor-mlkit/barcode-scanning`
- `js/native/haptics.js` — the only file that touches `@capacitor/haptics`
- `js/native/notifications.js` — the only file that touches `@capacitor/local-notifications`
- `js/native/files.js` — the only file that touches `@capacitor/filesystem` and `@capacitor/share`; used for report export (Phase 3) and backup export (Phase 4)

Restore doesn't need a native/*.js file at all — the plain `<input type="file">` element and its `File.text()` API work natively in the WebView with zero plugins.

Every view calls functions from the files above and never references `Capacitor` directly. If you add a bundler later (Vite, etc.), only these files need to change to real `import` statements.

All of them degrade gracefully outside the native app: scanning falls back to manual entry, haptics/notifications silently no-op, and file export falls back to a plain browser download.

## Dark mode — how the CSS is structured

Everything is token-driven from `css/tokens.css`. Most tokens (`--paper`, `--card`, `--ink`, `--ink-soft`, `--line`, `--rust`, `--ok-soft`, `--warn-soft`, `--input-bg`, ...) are redefined under `:root[data-theme="dark"]` and every component references only the tokens, never a hardcoded color — that discipline (already in place since Phase 2's CSS split) is what made adding a second theme a tokens-only change with no per-component rewrites, apart from two real bugs it surfaced:

- `header.top` and the highlighted dashboard stat card were hardcoded to `background: var(--ink)`, assuming `--ink` is always dark. Once `--ink` needed to flip to a light color for dark-mode text, that assumption broke. Fixed with dedicated `--panel-dark-bg` / `--panel-dark-text` tokens that intentionally do **not** flip with theme, so that "dark accent band" (from the proposal's own dashboard mockup) stays visually consistent in both themes.
- Form inputs and chips had a hardcoded `background:#fff`, which would've put dark text on a white box inside an otherwise dark screen. Swapped for a themed `--input-bg` token.

`js/theme.js` applies the theme (`data-theme` attribute on `<html>`); `js/services/settings.js` persists the choice; `js/app.js` applies the saved theme immediately after the DB opens, before the first screen renders, to minimize any flash.

## What you need to run locally

I can't run Android builds or `npx cap sync` from here — no Android SDK/Google Maven access in this environment.

```
npm install @capacitor-mlkit/barcode-scanning @capacitor/filesystem @capacitor/share
npx cap sync android
```

Then in `android/app/src/main/AndroidManifest.xml`, confirm the camera permission got added by the mlkit plugin's sync step (`<uses-permission android:name="android.permission.CAMERA" />`) — add it manually if it's missing. Build/run from Android Studio as usual. No extra plugin or manifest change is needed for the JSON restore file picker — it rides on the standard WebView file-input behavior.

## Known gaps / honest caveats

- No pagination or performance tuning — fine for a single store's catalog size.
- No authentication/multi-user concept — matches the proposal's single-owner-device assumption.
- Low-stock/expiring notification fires once per app launch, not re-checked live mid-session.
- Sales/audit report periods are rolling windows (last 7/30 days), not calendar weeks/months.
- Word export is HTML-in-a-`.doc`-wrapper, not a real `.docx` (see Phase 3 table).
- `@capacitor-mlkit/barcode-scanning`'s `scan()` uses the plugin's own full-screen camera UI, not a custom in-app view.
- **Restore is a full replace, not a merge** — by design, matching the proposal's flow, but worth restating plainly: confirming a restore discards whatever wasn't in the backup file.
- Dark mode was built and reasoned through carefully (see above), but hasn't been visually verified on an actual device/emulator from this environment — worth a quick look through every screen after your first build, in case a color pairing needs a small nudge.
- `Settings` isn't a real IndexedDB object store, just two keys in `meta` — fine for the two settings that exist now; if Settings grows substantially, it may be worth promoting to its own store.

## Possible next steps (beyond the original 4-phase plan)

- A true `.docx` export (needs the `docx` library, which needs a JS bundler — biggest architecture change on this list)
- Backup encryption/compression (proposal §12.4 flags this as a "later version" concern, not required now)
- Per-category default low-stock thresholds, editable from Settings
- A live-updating (not once-per-launch) low-stock notification