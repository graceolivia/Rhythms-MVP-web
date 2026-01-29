const STORAGE_PREFIX = 'rhythm_';
const INSTALL_KEY = `${STORAGE_PREFIX}installed`;
const SKIP_SEED_DATA_KEY = `${STORAGE_PREFIX}skip_seed_data_once`;

/**
 * Save data to localStorage with automatic JSON serialization
 */
export function saveToStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

/**
 * Load data from localStorage with automatic JSON parsing
 * Returns defaultValue if key doesn't exist or parsing fails
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Remove a key from localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error);
  }
}

/**
 * Check if this is a fresh install (no data has been saved yet)
 */
export function isFreshInstall(): boolean {
  return localStorage.getItem(INSTALL_KEY) === null;
}

/**
 * Mark the app as installed (call after onboarding completes)
 */
export function markAsInstalled(): void {
  localStorage.setItem(INSTALL_KEY, new Date().toISOString());
}

/**
 * Clear all app data from localStorage
 */
export function clearAllStorage(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Skip loading seed data on the next app boot only.
 */
export function setSkipSeedDataOnce(): void {
  localStorage.setItem(SKIP_SEED_DATA_KEY, '1');
}

/**
 * Check and consume the seed data skip flag.
 */
export function consumeSkipSeedDataOnce(): boolean {
  const value = localStorage.getItem(SKIP_SEED_DATA_KEY);
  if (value != null) {
    localStorage.removeItem(SKIP_SEED_DATA_KEY);
  }
  return value === '1';
}
