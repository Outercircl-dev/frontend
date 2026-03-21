/**
 * Haptic feedback utilities for enhanced mobile UX
 */

export interface HapticPattern {
  pattern?: number | number[];
  intensity?: 'light' | 'medium' | 'heavy';
}

class HapticFeedbackManager {
  private isSupported: boolean;
  private isEnabled: boolean;

  constructor() {
    this.isSupported = 'vibrate' in navigator;
    this.isEnabled = this.loadPreference();
  }

  /**
   * Check if haptic feedback is supported and enabled
   */
  get available(): boolean {
    return this.isSupported && this.isEnabled;
  }

  /**
   * Enable/disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('haptic-feedback-enabled', enabled.toString());
  }

  /**
   * Load user preference from localStorage
   */
  private loadPreference(): boolean {
    const stored = localStorage.getItem('haptic-feedback-enabled');
    return stored !== null ? stored === 'true' : true; // Default to enabled
  }

  /**
   * Provide subtle feedback for UI interactions
   */
  light(): void {
    if (!this.available) return;
    navigator.vibrate(10);
  }

  /**
   * Provide medium feedback for important actions
   */
  medium(): void {
    if (!this.available) return;
    navigator.vibrate(50);
  }

  /**
   * Provide strong feedback for critical actions
   */
  heavy(): void {
    if (!this.available) return;
    navigator.vibrate(100);
  }

  /**
   * Success feedback pattern
   */
  success(): void {
    if (!this.available) return;
    navigator.vibrate([50, 50, 50]);
  }

  /**
   * Error feedback pattern
   */
  error(): void {
    if (!this.available) return;
    navigator.vibrate([100, 50, 100]);
  }

  /**
   * Warning feedback pattern
   */
  warning(): void {
    if (!this.available) return;
    navigator.vibrate([75, 25, 75]);
  }

  /**
   * Custom vibration pattern
   */
  custom(pattern: number | number[]): void {
    if (!this.available) return;
    navigator.vibrate(pattern);
  }

  /**
   * Button press feedback
   */
  buttonPress(): void {
    this.light();
  }

  /**
   * Toggle switch feedback
   */
  toggle(): void {
    this.medium();
  }

  /**
   * Swipe action feedback
   */
  swipe(): void {
    this.light();
  }

  /**
   * Long press feedback
   */
  longPress(): void {
    this.medium();
  }

  /**
   * Pull-to-refresh feedback
   */
  pullToRefresh(): void {
    this.medium();
  }

  /**
   * Page navigation feedback
   */
  navigation(): void {
    this.light();
  }

  /**
   * Form submission feedback
   */
  formSubmit(): void {
    this.success();
  }

  /**
   * Notification feedback
   */
  notification(): void {
    this.medium();
  }
}

// Export singleton instance
export const hapticFeedback = new HapticFeedbackManager();

// React hook for haptic feedback
import { useCallback } from 'react';

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type: keyof Omit<HapticFeedbackManager, 'available' | 'setEnabled'>) => {
    (hapticFeedback[type as keyof HapticFeedbackManager] as Function)();
  }, []);

  return {
    haptic: hapticFeedback,
    triggerHaptic,
    isAvailable: hapticFeedback.available
  };
};