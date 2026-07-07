/* ═══════════════════════════════════════════════════════════
   SpotLab — localStorage Persistence Layer
   ═══════════════════════════════════════════════════════════ */

import { STORAGE_KEYS } from '../utils/constants.js';

/**
 * Save data to localStorage
 */
export function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[Storage] Failed to save:', key, e);
  }
}

/**
 * Load data from localStorage
 */
export function load(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('[Storage] Failed to load:', key, e);
    return defaultValue;
  }
}

/**
 * Remove a key from localStorage
 */
export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[Storage] Failed to remove:', key, e);
  }
}

/**
 * Clear all SpotLab data from localStorage
 */
export function clearAll() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    remove(key);
  });
}

/**
 * Export all data as a JSON object
 */
export function exportData() {
  const data = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    data[name] = load(key);
  });
  data.exportedAt = new Date().toISOString();
  data.version = '1.0';
  return data;
}

/**
 * Import data from a JSON object
 */
export function importData(data) {
  if (!data || !data.version) {
    throw new Error('Invalid data format');
  }
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    if (data[name] !== undefined) {
      save(key, data[name]);
    }
  });
}
