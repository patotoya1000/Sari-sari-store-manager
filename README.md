# Tindahan — Sari-Sari Store Manager

An offline-first inventory, sales, and stock-audit manager for a sari-sari store, built as a native Android app with [Capacitor](https://capacitorjs.com/) wrapping a vanilla HTML/CSS/JS front end. No backend, no bundler — everything runs and stores data locally on the device.

For the detailed, phase-by-phase build history (what's implemented, what's stubbed, and every known gap), see **[www/BUILD-AUDIT.md](www/BUILD-AUDIT.md)**. This README is the "what is this and how do I run it" overview.

## Features

- **Dashboard** — today's sales, transaction count, low-stock and expiring-soon counts, recent activity
- **Inventory** — product CRUD (name, barcode, category, cost/selling price, quantity, low-stock threshold, expiration date), search, category filters
- **Categories** — default set + custom categories
- **Sales** — multi-item cart, auto stock deduction, overselling prevented
- **Inventory ledger** — every stock change (sale, restock, correction, audit, quick deduct) is an immutable, timestamped, traceable record. Product quantity is never edited directly — it only ever moves through this ledger.
- **Scan** — native camera barcode scanning (Google ML Kit), with manual entry as a fallback. A scanned barcode either matches a product (offering Quick Deduct / Stock Audit / View-Edit) or offers to register it as a new product.
- **Stock Audit** — compares system quantity against a physical count, requires a reason when they differ, keeps a full audit history
- **Reports** — Sales / Inventory / Stock Audit reports over Today / Last 7 days / Last 30 days / All time, exportable to Word
- **Settings** — store name, light/dark theme, JSON backup export, and restore-from-backup with a preview step before anything is overwritten
- **Haptics + notifications** — light tap on confirmed actions, one native low-stock/expiring notification per app launch

## Tech stack

- **Shell:** Capacitor (Android)
- **Front end:** vanilla HTML/CSS/JS — no framework, no bundler
- **Storage:** IndexedDB (on-device, offline-first)
- **Native plugins:** `@capacitor-mlkit/barcode-scanning`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/filesystem`, `@capacitor/share`

Because there's no bundler, native plugins aren't imported with `import { X } from '@capacitor/...'` (that syntax needs a bundler to resolve). Instead, every native call goes through the global `window.Capacitor.Plugins` bridge, and that access is deliberately isolated to five files under `js/native/` — nothing else in the app touches `Capacitor` directly. See "Architecture" below.

## Project structure

```
sari-sari-store-manager/
├── android/                  Capacitor's generated native Android project
├── www/                      the actual app — this is what runs in the WebView
│   ├── index.html
│   ├── BUILD-AUDIT.md        detailed build history, phase by phase
│   ├── css/
│   │   ├── tokens.css        design system — colors, spacing, the glassmorphism palette
│   │   ├── layout.css        structural chrome (frame, header, tab bar)
│   │   ├── components.css    buttons, cards, forms, sheets, chips, badges
│   │   └── styles.css        entry point — just @imports the three above
│   └── js/
│       ├── app.js            boot + top-level event wiring
│       ├── state.js          shared in-memory state + constants
│       ├── nav.js            view switching + modal overlays
│       ├── theme.js           applies the light/dark theme to the DOM
│       ├── services/          business logic — no DOM, no Capacitor
│       │   ├── db.js            IndexedDB access layer
│       │   ├── data.js          product/sale/ledger CRUD
│       │   ├── reports.js       read-only report calculations
│       │   ├── settings.js      store name + theme persistence
│       │   └── backup.js        JSON backup build/validate/restore
│       ├── native/             the ONLY files that touch Capacitor.Plugins
│       │   ├── platform.js      shared isNative() check
│       │   ├── barcode.js       @capacitor-mlkit/barcode-scanning
│       │   ├── haptics.js       @capacitor/haptics
│       │   ├── notifications.js @capacitor/local-notifications
│       │   └── files.js         @capacitor/filesystem + @capacitor/share
│       ├── utils/
│       │   ├── format.js        peso/date formatting
│       │   └── dom.js           escapeHTML, toast
│       └── views/              one file per screen — rendering + event wiring
│           ├── dashboard.js
│           ├── inventory.js
│           ├── categories.js
│           ├── sales.js
│           ├── ledger.js
│           ├── scanner.js
│           ├── audit.js
│           ├── reports.js
│           └── settings.js
└── node_modules/
```

## Getting started

```bash
npm install
npm install @capacitor-mlkit/barcode-scanning @capacitor/filesystem @capacitor/share
npx cap sync android
```

Then open `android/` in Android Studio and run it on a device or emulator as usual.

After syncing, confirm `android/app/src/main/AndroidManifest.xml` picked up the camera permission from the barcode plugin (`<uses-permission android:name="android.permission.CAMERA" />`) — add it by hand if it's missing.

No extra setup is needed for JSON restore — it uses the plain HTML `<input type="file">` element, which triggers Android's native file picker on its own.

## Architecture notes

- **`services/`** never touches the DOM or Capacitor — pure data/business logic. `data.js` enforces the one rule the whole app depends on: `product.quantity` only ever changes inside a function that also writes a matching ledger record.
- **`native/`** is the only place Capacitor plugins are referenced, via the global `Capacitor.Plugins` bridge rather than npm imports (no bundler, see above). Every one of these degrades gracefully outside the native app — e.g. scanning falls back to manual entry, haptics/notifications no-op instead of throwing.
- **`views/`** own one screen each: rendering + their own event wiring. They call into `services/` and `native/`, never into IndexedDB or Capacitor directly.
- **CSS is token-driven** — every color in `components.css`/`layout.css` is a `var(--token)` defined in `tokens.css`, including a full dark-mode override under `:root[data-theme="dark"]`. That discipline is what made both dark mode and the glassmorphism redesign a CSS-only change with zero HTML/JS edits.

## Data model

- `Product`, `Category`, `Sale`, `SaleItem` — standard inventory/POS entities
- `InventoryMovement` — the append-only ledger: every stock change, of any kind, with a type (`initial_stock` / `sale` / `restock` / `manual_adjustment` / `stock_audit` / `quick_deduct`), reason, and timestamp
- `StockAudit` — system count vs. physical count, kept even when there's no difference so a clean audit is provable
- Settings (store name, theme) live as two key/value rows in a `meta` store rather than a dedicated object store

## Known limitations

See **[www/BUILD-AUDIT.md](www/BUILD-AUDIT.md)** for the full, honest list. The short version:

- Word export is HTML wrapped to open as `.doc`, not a real OOXML `.docx`
- Report periods are rolling windows (last 7/30 days), not calendar weeks/months
- No pagination, no multi-user/auth — sized for one store, one device
- Low-stock/expiring notification fires once per app launch, not live mid-session
- The glassmorphism/dark-mode visuals were designed and validated for contrast/consistency but not yet seen rendered on an actual device