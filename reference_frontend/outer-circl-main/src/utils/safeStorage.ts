/**
 * Safe Storage Wrapper
 * 
 * Provides localStorage/sessionStorage access with graceful fallback to in-memory storage
 * when storage is unavailable (e.g., Safari Private Mode, storage quota exceeded).
 * 
 * In Safari Private Mode, localStorage throws QuotaExceededError or SecurityError,
 * causing app crashes. This wrapper catches those errors and falls back to Map-based
 * memory storage, allowing the app to function (session-only, no persistence).
 */

class SafeStorage {
  private storage: Storage | Map<string, string>;
  private isStorageAvailable: boolean;
  private storageType: 'localStorage' | 'sessionStorage';

  constructor(storageType: 'localStorage' | 'sessionStorage') {
    this.storageType = storageType;
    this.isStorageAvailable = this.testStorage(storageType);
    
    if (this.isStorageAvailable) {
      this.storage = window[storageType];
    } else {
      this.storage = new Map<string, string>();
      console.warn(`${storageType} unavailable (Private Mode?). Using in-memory fallback.`);
    }
  }

  /**
   * Test if storage is available by attempting read/write operation
   */
  private testStorage(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const testKey = '__storage_test__';
      const storage = window[type];
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      // QuotaExceededError, SecurityError, or other DOMException
      return false;
    }
  }

  /**
   * Get item from storage
   * @returns string value or null if not found
   */
  getItem(key: string): string | null {
    try {
      if (this.storage instanceof Map) {
        return this.storage.get(key) || null;
      }
      return this.storage.getItem(key);
    } catch (e) {
      console.warn(`Failed to get item "${key}" from ${this.storageType}:`, e);
      return null;
    }
  }

  /**
   * Set item in storage
   * Silently fails if storage unavailable (graceful degradation)
   */
  setItem(key: string, value: string): void {
    try {
      if (this.storage instanceof Map) {
        this.storage.set(key, value);
      } else {
        this.storage.setItem(key, value);
      }
    } catch (e) {
      // Silently fail - app continues without persistence
      console.warn(`Failed to set item "${key}" in ${this.storageType}:`, e);
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    try {
      if (this.storage instanceof Map) {
        this.storage.delete(key);
      } else {
        this.storage.removeItem(key);
      }
    } catch (e) {
      console.warn(`Failed to remove item "${key}" from ${this.storageType}:`, e);
    }
  }

  /**
   * Clear all items from storage
   */
  clear(): void {
    try {
      if (this.storage instanceof Map) {
        this.storage.clear();
      } else {
        this.storage.clear();
      }
    } catch (e) {
      console.warn(`Failed to clear ${this.storageType}:`, e);
    }
  }

  /**
   * Check if native storage is available
   * @returns true if localStorage/sessionStorage works, false if using Map fallback
   */
  isAvailable(): boolean {
    return this.isStorageAvailable;
  }

  /**
   * Get number of items in storage
   */
  get length(): number {
    try {
      if (this.storage instanceof Map) {
        return this.storage.size;
      }
      return this.storage.length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Get key at index (for iteration)
   */
  key(index: number): string | null {
    try {
      if (this.storage instanceof Map) {
        const keys = Array.from(this.storage.keys());
        return keys[index] || null;
      }
      return this.storage.key(index);
    } catch (e) {
      return null;
    }
  }
}

// Export singleton instances
export const safeLocalStorage = new SafeStorage('localStorage');
export const safeSessionStorage = new SafeStorage('sessionStorage');
