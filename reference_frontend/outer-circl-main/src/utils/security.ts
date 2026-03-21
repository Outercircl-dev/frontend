/**
 * Client-side security utilities
 */

import DOMPurify from 'dompurify';

// Input validation utilities
export const validateInput = {
  /**
   * 🔒 SECURITY: Sanitizes text input using DOMPurify to prevent XSS attacks
   * DOMPurify is a proven XSS sanitizer that handles edge cases better than regex
   */
  sanitizeText: (input: string): string => {
    if (!input) return '';
    
    // Use DOMPurify with strict configuration (no HTML allowed)
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true, // Keep text content
    });
  },

  /**
   * Sanitizes HTML content while allowing safe formatting tags
   * Use this when you need to preserve some HTML formatting
   */
  sanitizeHtml: (input: string): string => {
    if (!input) return '';
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
    });
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Validate URL format
   */
  isValidUrl: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Validate file type for uploads
   */
  isValidImageType: (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return allowedTypes.includes(file.type);
  },

  /**
   * Validate file size (max 10MB)
   */
  isValidFileSize: (file: File, maxSizeMB: number = 10): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
};

// Content Security Policy helpers
export const csp = {
  /**
   * Generate a nonce for inline scripts
   */
  generateNonce: (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
};

// Enhanced rate limiting for client-side actions
export class ClientRateLimit {
  private actions = new Map<string, number[]>();
  private readonly MAX_STORED_ACTIONS = 100; // Prevent memory leaks
  
  /**
   * Check if action is rate limited
   * @param actionKey Unique identifier for the action
   * @param maxAttempts Maximum attempts allowed
   * @param windowMs Time window in milliseconds
   */
  isRateLimited(actionKey: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.actions.get(actionKey) || [];
    
    // Remove old attempts outside the time window
    const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      // Log rate limit violation for monitoring
      this.logRateLimitViolation(actionKey, maxAttempts, windowMs);
      return true;
    }
    
    // Record this attempt
    validAttempts.push(now);
    this.actions.set(actionKey, validAttempts);
    
    // Cleanup to prevent memory leaks
    this.cleanup();
    
    return false;
  }
  
  /**
   * Reset rate limit for an action
   */
  resetLimit(actionKey: string): void {
    this.actions.delete(actionKey);
  }

  /**
   * Log rate limit violations for security monitoring
   */
  private logRateLimitViolation(actionKey: string, maxAttempts: number, windowMs: number): void {
    console.warn('Rate limit violation detected:', {
      action: actionKey,
      maxAttempts,
      windowMs,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  private cleanup(): void {
    if (this.actions.size > this.MAX_STORED_ACTIONS) {
      const entries = Array.from(this.actions.entries());
      // Remove oldest 20% of entries
      const toRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.actions.delete(entries[i][0]);
      }
    }
  }
}

// Secure localStorage wrapper
export const secureStorage = {
  /**
   * Store data with encryption (basic obfuscation)
   */
  setItem: (key: string, value: any): void => {
    try {
      const serialized = JSON.stringify(value);
      const encoded = btoa(serialized);
      localStorage.setItem(`oc_${key}`, encoded);
    } catch (error) {
      console.warn('Failed to store item securely:', error);
    }
  },

  /**
   * Retrieve and decrypt data
   */
  getItem: <T>(key: string, defaultValue: T | null = null): T | null => {
    try {
      const encoded = localStorage.getItem(`oc_${key}`);
      if (!encoded) return defaultValue;
      
      const serialized = atob(encoded);
      return JSON.parse(serialized);
    } catch (error) {
      console.warn('Failed to retrieve item securely:', error);
      return defaultValue;
    }
  },

  /**
   * Remove item
   */
  removeItem: (key: string): void => {
    localStorage.removeItem(`oc_${key}`);
  },

  /**
   * Clear all app data
   */
  clear: (): void => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('oc_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Form security helpers
export const formSecurity = {
  /**
   * Add CSRF-like protection for forms
   */
  generateFormToken: (): string => {
    return crypto.randomUUID();
  },

  /**
   * Validate form submission timing (prevent automated submissions)
   */
  validateSubmissionTiming: (formStartTime: number, minTimeMs: number = 1000): boolean => {
    const submissionTime = Date.now() - formStartTime;
    return submissionTime >= minTimeMs;
  }
};

export default {
  validateInput,
  csp,
  ClientRateLimit,
  secureStorage,
  formSecurity
};