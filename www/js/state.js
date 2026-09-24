// state.js — one shared, mutable state object. Views read from it; services/data.js writes to it.

export const state = {
  products: [],
  categories: [],
  sales: [],
  saleItems: [],
  movements: [],
  stockAudits: [],
  cart: [],                 // { productId, name, qty, unitPrice } — the ONE sale-in-progress cart,
                             // shared by the Sales tab (search/scan) and the Scan tab (scan-only entry)
  invCategoryFilter: "all",
  ledgerFilter: "all",
  lastScannedProduct: null  // product matched by the most recent scan/lookup, or null
};

export const DEFAULT_CATEGORIES = [
  "Beverages", "Snacks", "Canned Goods", "Instant Noodles", "Condiments",
  "Rice & Grains", "Toiletries", "Household", "Frozen Goods", "Other"
];

// Reasons offered in the Stock Audit sheet when the physical count differs from the system count.
export const AUDIT_REASONS = [
  "Damaged", "Expired/Spoiled", "Missing/Theft", "Counting error",
  "Received but not recorded", "Other"
];