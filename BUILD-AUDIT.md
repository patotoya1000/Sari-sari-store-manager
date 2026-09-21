# Sari-Sari Store Manager — Build Audit

Tracks what's actually implemented against the proposal, so progress is verifiable at a glance. Updated each time we add or change something.

**Stack decisions locked in:** vanilla HTML/CSS/JS, IndexedDB for storage, live camera barcode scanning planned (via one small external decoder library, added when we build that phase).

---

## Phase 1 — Core (this build)

| # | Feature (from proposal) | Status | Notes |
|---|---|---|---|
| 1 | Dashboard overview | ✅ Done | Today's sales, transaction count, product count, low-stock count, expiring-soon count, recent ledger activity |
| 2 | Product CRUD | ✅ Done | Name, barcode field (manual entry for now), category, cost price, selling price, quantity, low-stock threshold, expiration date |
| 3 | Categories | ✅ Done | 10 default categories seeded (Beverages, Snacks, Canned Goods, Instant Noodles, Condiments, Rice & Grains, Toiletries, Household, Frozen Goods, Other) + custom category creation |
| 4 | Sales recording | ✅ Done | Multi-item cart, auto-computes totals, deducts stock on confirm, blocks overselling |
| 5 | Automatic stock deduction | ✅ Done | Happens via the ledger, not a direct edit — see #7 |
| 6 | Inventory movement ledger | ✅ Done (basic) | Every stock change (initial stock, sale, restock, manual correction) is an immutable, timestamped, traceable record. Filterable by type. Product quantity is never edited directly outside this system. |
| 7 | Low-stock indicator | ✅ Done | Badge on product rows + dashboard count |
| 8 | Expiration indicator | ✅ Done (basic) | Flags items expiring within 7 days or already expired — full "Alerts" module (proposal §6) not built as a separate screen yet |
| 9 | Barcode scanning | ⬜ Not started | Manual barcode text field exists on the product form so data is ready; live camera scan is Phase 2 |
| 10 | Unknown-product registration flow | ⬜ Not started | Depends on scanner (Phase 2) |
| 11 | Stock Audit module | ⬜ Not started | Phase 2, per proposal §9 |
| 12 | Reports (daily/weekly/monthly/overall) | ⬜ Not started | Phase 3 |
| 13 | Word export | ⬜ Not started | Phase 3 |
| 14 | JSON backup/restore | ⬜ Not started | Phase 4 |
| 15 | Settings screen | ⬜ Not started | Store name is currently hardcoded in seed data |

## Data model implemented so far

- `Product` — id, barcode, name, categoryId, costPrice, sellingPrice, quantity, lowStockThreshold, expirationDate
- `Category` — id, name
- `Sale` — id, date, total
- `SaleItem` — id, saleId, productId, quantity, unitPrice, subtotal
- `InventoryMovement` — id, productId, quantityChange, type, reason, timestamp, referenceId

Not yet implemented: `StockAudit` entity, `Settings` entity (beyond a single store-name key).

## Known gaps / things to decide before Phase 2

- Barcode field is free-text for now — no camera, no duplicate-barcode validation yet.
- No pagination or performance tuning done — fine for a single store's catalog size, would need revisiting at very large scale.
- No authentication/multi-user concept — matches the proposal, which assumes a single owner device.
- Settings screen doesn't exist yet, so store name can't be changed from the UI.

## Next up (Phase 2 — Smart Inventory)

- Live camera barcode scanner (needs one external decoding library)
- Unknown-product-found flow ("not registered — add it?")
- Stock Audit module (system count vs physical count, difference, reason, audit history)
- Full Alerts screen (currently folded into Dashboard/Inventory only)
