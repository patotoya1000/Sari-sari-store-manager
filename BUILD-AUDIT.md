# Sari-Sari Store Manager — Build Audit

Tracks what's actually implemented against the proposal, so progress is verifiable at a glance. Updated each time we add or change something.

**Stack decisions locked in:**
- Web layer: vanilla HTML/CSS/JS, IndexedDB for storage, no bundler (native plugins accessed via the global `Capacitor.Plugins` bridge rather than npm imports — see "Native plugin access" below).
- Shell: wrapped in **Capacitor for a native Android build** (`android/` + `www/` project).
- Barcode scanning: **@capacitor-mlkit/barcode-scanning** (Google ML Kit) — you'll need to `npm install` it; see "What you need to run locally."
- Haptics + local notifications wired in using the already-installed `@capacitor/haptics` and `@capacitor/local-notifications`.
- File export (Phase 3): **@capacitor/filesystem** + **@capacitor/share** — also need `npm install`; see "What you need to run locally."

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

## Phase 2 — Smart Inventory (this build)

| # | Feature (from proposal) | Status | Notes |
|---|---|---|---|
| 9 | Live camera barcode scanning | ✅ Done | Via `@capacitor-mlkit/barcode-scanning`'s ready-made full-screen `scan()` UI. Falls back to manual barcode entry automatically outside the native app (e.g. testing in a desktop browser). |
| 10 | Unknown-product registration flow | ✅ Done | Scan result "not found" → **Add as a new product**, opens the product form with the barcode pre-filled |
| 11 | Quick Stock Deduction | ✅ Done | Scan a known product → **Quick deduct** → quantity + required reason → writes a `quick_deduct` movement |
| 12 | Stock Audit module | ✅ Done | Reachable from a scan result **or** from a product's edit form → **Stock audit**. Compares system quantity vs. a physical count, requires a reason when they differ, saves a `StockAudit` record, and — only if there's a real difference — writes a `stock_audit` movement that corrects the quantity |
| 13 | Audit history | ✅ Done (basic) | "Recent stock audits" list on the Scan tab (last 5) + a dedicated **Stock audits** / **Quick deducts** filter in the Ledger. Not yet a full audit-session summary screen (see Known gaps) |
| — | Haptic feedback | ✅ Done (added, not in original proposal) | Light tap on sale confirm, stock audit save, quick deduct; medium tap on a successful scan match |
| — | Low-stock / expiring push notification | ✅ Done (added, not in original proposal) | One native notification per app launch, summarizing counts — not one per item, and not re-checked mid-session (see Known gaps) |

## Phase 3 — Reports & Export (this build)

| # | Feature (from proposal) | Status | Notes |
|---|---|---|---|
| 14 | Sales report (daily/weekly/monthly/overall) | ✅ Done | Period chips: Today / Last 7 days / Last 30 days / All time — rolling windows, not calendar weeks/months (simpler and unambiguous; see Known gaps). Shows total sales, transaction count, items sold, top 5 products by quantity |
| 15 | Inventory report | ✅ Done | Always a current snapshot (stock doesn't have a "period"): products tracked, units in stock, stock value at cost vs. selling price, low-stock list, expiring-soon list |
| 16 | Audit report | ✅ Done | Matches the proposal's exact "Stock Audit Summary" shape — Products Checked / Stock Increased / Stock Decreased / No Difference — for the selected period |
| 17 | Word export | ✅ Done (with a caveat) | Exports whichever report is on screen as an HTML document wrapped in Word's recognized namespace hints, saved with a `.doc` extension. Word/LibreOffice/Google Docs open it correctly, but it's HTML under the hood, not a real OOXML `.docx` — Word may show a one-time "format doesn't match extension, open anyway?" prompt. A true `.docx` would need the `docx` library, which needs a JS bundler this project doesn't have (see "Native plugin access" below) |

## Not yet started

| # | Feature | Phase |
|---|---|---|
| 18 | JSON backup/restore | 4 |
| 19 | Settings screen (store name is still hardcoded in seed data) | 4 |

## Data model

- `Product` — id, barcode, name, categoryId, costPrice, sellingPrice, quantity, lowStockThreshold, expirationDate
- `Category` — id, name
- `Sale` — id, date, total
- `SaleItem` — id, saleId, productId, quantity, unitPrice, subtotal
- `InventoryMovement` — id, productId, quantityChange, type (`initial_stock` / `sale` / `restock` / `manual_adjustment` / `stock_audit` / `quick_deduct`), reason, timestamp, referenceId
- `StockAudit` *(new in Phase 2)* — id, date, productId, systemQuantity, physicalQuantity, difference, reason, notes — kept even when `difference` is 0, so a clean audit is provable, not just inferred from the absence of a movement

Not yet implemented: `Settings` entity (beyond a single store-name key).

## Native plugin access — how it's wired

This project has **no JS bundler**, so `import { X } from '@capacitor/...'` won't resolve in the WebView. To avoid that, every native call goes through the global `window.Capacitor.Plugins` bridge instead, and it's isolated to exactly four files, plus one shared helper:

- `js/native/platform.js` — the one shared `isNative()` check every file below uses
- `js/native/barcode.js` — the only file that touches `@capacitor-mlkit/barcode-scanning`
- `js/native/haptics.js` — the only file that touches `@capacitor/haptics`
- `js/native/notifications.js` — the only file that touches `@capacitor/local-notifications`
- `js/native/files.js` *(new in Phase 3)* — the only file that touches `@capacitor/filesystem` and `@capacitor/share`; used for report export now, and will be reused for JSON backup/restore in Phase 4

Every view calls functions from these files and never references `Capacitor` directly. If you add a bundler later (Vite, etc.), only these files need to change to real `import` statements — nothing else in the app does.

All of them degrade gracefully: running in a plain browser (no native bridge) means scanning falls back to manual entry, haptics/notifications silently no-op, and report export falls back to a plain browser download instead of the native share sheet.

## What you need to run locally

I can't run Android builds or `npx cap sync` from here — no Android SDK/Google Maven access in this environment. To get everything through Phase 3 running on your machine:

```
npm install @capacitor-mlkit/barcode-scanning @capacitor/filesystem @capacitor/share
npx cap sync android
```

Then in `android/app/src/main/AndroidManifest.xml`, confirm the camera permission got added by the mlkit plugin's sync step (`<uses-permission android:name="android.permission.CAMERA" />`) — if it's missing, add it manually before building. Build/run from Android Studio as usual.

## Known gaps / things to decide before Phase 3

- No pagination or performance tuning — fine for a single store's catalog size.
- No authentication/multi-user concept — matches the proposal's single-owner-device assumption.
- Settings screen doesn't exist yet — store name can't be changed from the UI.
- Low-stock/expiring notification fires once per app launch and isn't re-checked as stock changes mid-session — good enough for "open the app, see what needs attention," not a live monitor.
- Audit history is a flat recent list + ledger filter on the Scan tab; the aggregate summary (checked / increased / decreased / no-difference) the proposal describes is now available in Reports → Stock audit, for whichever period you pick.
- Sales/audit report periods are rolling windows (last 7 / last 30 days), not calendar weeks or months — simpler to reason about, but "Last 7 days" won't line up with "this calendar week" if that's what you actually meant.
- Word export is HTML-in-a-.doc-wrapper, not a real .docx — see the Phase 3 table above.
- `@capacitor-mlkit/barcode-scanning`'s `scan()` uses the plugin's own ready-made full-screen camera UI rather than a custom in-app camera view — simpler and more reliable to ship, but you don't control its layout. Worth revisiting only if the ready-made UI turns out to be a problem in practice.

## Next up (Phase 4 — Data Protection)

- JSON export/import with validation and a restore preview before committing
- Backup versioning
- Settings screen (store name, at minimum — categories/thresholds could live there too)
- Optional: swap the Word export over to a real `.docx` if the HTML-wrapper caveat ever becomes a real problem
