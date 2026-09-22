// services/settings.js — reads/writes the handful of app-level settings kept
// in the `meta` store. Same rule as every other service: no DOM, no Capacitor.
// (Applying a theme to the page is a DOM concern — that lives in js/theme.js.)

import { getOne, put } from './db.js';

const STORE_META_KEY = 'store';
const THEME_META_KEY = 'theme';
export const DEFAULT_STORE_NAME = 'My Sari-Sari Store';

export async function getStoreName() {
  const meta = await getOne('meta', STORE_META_KEY);
  return meta?.name || DEFAULT_STORE_NAME;
}

export async function setStoreName(name) {
  const clean = (name || '').trim() || DEFAULT_STORE_NAME;
  await put('meta', { key: STORE_META_KEY, name: clean });
  return clean;
}

export async function getTheme() {
  const meta = await getOne('meta', THEME_META_KEY);
  return meta?.value === 'dark' ? 'dark' : 'light';
}

export async function setTheme(theme) {
  const clean = theme === 'dark' ? 'dark' : 'light';
  await put('meta', { key: THEME_META_KEY, value: clean });
  return clean;
}