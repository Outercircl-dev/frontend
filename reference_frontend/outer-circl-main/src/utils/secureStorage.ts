// Secure storage utility for encrypting sensitive data in localStorage
// Note: This is basic obfuscation, not true encryption for production use

class SecureStorage {
  private static readonly STORAGE_KEY_PREFIX = 'oc_secure_';
  private static readonly ENCRYPTION_KEY = 'outercircl_2025_secure_key';

  // Simple XOR cipher for basic obfuscation
  private static simpleEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(result); // Base64 encode
  }

  private static simpleDecrypt(encryptedText: string, key: string): string {
    try {
      const decoded = atob(encryptedText); // Base64 decode
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
          decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return result;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return '';
    }
  }

  static setSecureItem(key: string, value: any): void {
    try {
      const stringValue = JSON.stringify(value);
      const encrypted = this.simpleEncrypt(stringValue, this.ENCRYPTION_KEY);
      localStorage.setItem(this.STORAGE_KEY_PREFIX + key, encrypted);
    } catch (error) {
      console.error('Failed to set secure item:', error);
      // Fallback to regular storage
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  static getSecureItem<T>(key: string, defaultValue: T): T {
    try {
      const encryptedValue = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
      if (!encryptedValue) {
        // Try fallback to regular storage for backward compatibility
        const regularValue = localStorage.getItem(key);
        return regularValue ? JSON.parse(regularValue) : defaultValue;
      }

      const decrypted = this.simpleDecrypt(encryptedValue, this.ENCRYPTION_KEY);
      return decrypted ? JSON.parse(decrypted) : defaultValue;
    } catch (error) {
      console.error('Failed to get secure item:', error);
      return defaultValue;
    }
  }

  static removeSecureItem(key: string): void {
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + key);
    // Also remove regular storage for cleanup
    localStorage.removeItem(key);
  }

  static hasSecureItem(key: string): boolean {
    return localStorage.getItem(this.STORAGE_KEY_PREFIX + key) !== null ||
           localStorage.getItem(key) !== null;
  }

  // Migrate existing data to secure storage
  static migrateToSecure(key: string): void {
    const existingValue = localStorage.getItem(key);
    if (existingValue && !localStorage.getItem(this.STORAGE_KEY_PREFIX + key)) {
      try {
        const parsed = JSON.parse(existingValue);
        this.setSecureItem(key, parsed);
        localStorage.removeItem(key); // Remove old insecure version
      } catch (error) {
        console.error('Failed to migrate data to secure storage:', error);
      }
    }
  }
}

export default SecureStorage;