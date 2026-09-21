// state.js — one shared, mutable state object. Views read from it; data.js writes to it.

export const state = {
  products: [],
  categories: [],
  sales: [],
  saleItems: [],
  movements: [],
  cart: [],              // { productId, name, qty, unitPrice }
  invCategoryFilter: "all",
  ledgerFilter: "all"
};

export const DEFAULT_CATEGORIES = [
  "Beverages", "Snacks", "Canned Goods", "Instant Noodles", "Condiments",
  "Rice & Grains", "Toiletries", "Household", "Frozen Goods", "Other"
];
