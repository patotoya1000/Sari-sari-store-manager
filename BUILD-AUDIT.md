# Sari-Sari Store Manager — Build Audit

Tracks what's actually implemented against the proposal, so progress is verifiable at a glance. Updated each time we add or change something.

**Stack decisions locked in:**
- Web layer: vanilla HTML/CSS/JS, IndexedDB for storage, no bundler (native plugins accessed via the global `Capacitor.Plugins` bridge rather than npm imports — see "Native plugin access" below).
- Shell: wrapped in **Capacitor for a native Android build** (`android/` + `www/` project).
- Barcode scanning: **@capacitor-mlkit/barcode-scanning** (Google ML Kit) — you'll need to `npm install` it; see "What you need to run locally."
- Haptics + local notifications wired in using the already-installed `@capacitor/haptics` and `@capacitor/local-notifications`.

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

## Not yet started

| # | Feature | Phase |
|---|---|---|
| 14 | Reports (daily/weekly/monthly/overall) | 3 |
| 15 | Word export | 3 |
| 16 | JSON backup/restore | 4 |
| 17 | Settings screen (store name is still hardcoded in seed data) | 4 |

## Data model

- `Product` — id, barcode, name, categoryId, costPrice, sellingPrice, quantity, lowStockThreshold, expirationDate
- `Category` — id, name
- `Sale` — id, date, total
- `SaleItem` — id, saleId, productId, quantity, unitPrice, subtotal
- `InventoryMovement` — id, productId, quantityChange, type (`initial_stock` / `sale` / `restock` / `manual_adjustment` / `stock_audit` / `quick_deduct`), reason, timestamp, referenceId
- `StockAudit` *(new in Phase 2)* — id, date, productId, systemQuantity, physicalQuantity, difference, reason, notes — kept even when `difference` is 0, so a clean audit is provable, not just inferred from the absence of a movement

Not yet implemented: `Settings` entity (beyond a single store-name key).

## Native plugin access — how it's wired

This project has **no JS bundler**, so `import { X } from '@capacitor/...'` won't resolve in the WebView. To avoid that, every native call goes through the global `window.Capacitor.Plugins` bridge instead, and it's isolated to exactly three files:

- `js/native/barcode.js` — the only file that touches `@capacitor-mlkit/barcode-scanning`
- `js/native/haptics.js` — the only file that touches `@capacitor/haptics`
- `js/native/notifications.js` — the only file that touches `@capacitor/local-notifications`

Every view calls functions from these three files and never references `Capacitor` directly. If you add a bundler later (Vite, etc.), only these three files need to change to real `import` statements — nothing else in the app does.

All three degrade gracefully: running in a plain browser (no native bridge) just means scanning falls back to manual entry, and haptics/notifications silently no-op instead of throwing.

## What you need to run locally

I can't run Android builds or `npx cap sync` from here — no Android SDK/Google Maven access in this environment. To get Phase 2 running on your machine:

```
npm install @capacitor-mlkit/barcode-scanning
npx cap sync android
```

Then in `android/app/src/main/AndroidManifest.xml`, confirm the camera permission got added by the plugin's sync step (`<uses-permission android:name="android.permission.CAMERA" />`) — if it's missing, add it manually before building. Build/run from Android Studio as usual.

## Known gaps / things to decide before Phase 3

- No pagination or performance tuning — fine for a single store's catalog size.
- No authentication/multi-user concept — matches the proposal's single-owner-device assumption.
- Settings screen doesn't exist yet — store name can't be changed from the UI.
- Low-stock/expiring notification fires once per app launch and isn't re-checked as stock changes mid-session — good enough for "open the app, see what needs attention," not a live monitor.
- Audit history is a flat recent list + ledger filter, not the aggregate summary (checked / increased / decreased / no-difference counts) the original proposal describes for a full audit session.
- `@capacitor-mlkit/barcode-scanning`'s `scan()` uses the plugin's own ready-made full-screen camera UI rather than a custom in-app camera view — simpler and more reliable to ship, but you don't control its layout. Worth revisiting only if the ready-made UI turns out to be a problem in practice.

## Next up (Phase 3 — Reports & Export)

- Daily/weekly/monthly/overall sales reports
- Word export
- Settings screen (store name, at minimum)
