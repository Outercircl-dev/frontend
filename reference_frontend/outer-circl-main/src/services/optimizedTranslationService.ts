// Optimized translation service to reduce loading times
import { supabase } from '@/integrations/supabase/client';

// Global cache to prevent duplicate requests
const translationCache = new Map<string, Map<string, string>>();
const loadingPromises = new Map<string, Promise<Map<string, string>>>();

// Fallback translations for immediate loading
const fallbackTranslations = new Map([
  ['dashboard.title', 'Find Your Next Activity'],
  ['dashboard.subtitle', 'Connect with your community'],
  ['common.loading', 'Loading...'],
  ['common.save', 'Save'],
  ['common.cancel', 'Cancel'],
  ['common.delete', 'Delete'],
  ['common.edit', 'Edit'],
  ['common.create', 'Create'],
  ['common.join', 'Join'],
  ['common.leave', 'Leave'],
  ['nav.dashboard', 'Dashboard'],
  ['nav.create', 'Create Activity'],
  ['nav.profile', 'Profile'],
  ['nav.settings', 'Settings'],
  ['nav.logout', 'Logout'],
  ['event.join', 'Join Activity'],
  ['event.leave', 'Leave Activity'],
  ['event.save', 'Save'],
  ['event.saved', 'Saved'],
  ['event.attendees', 'attendees'],
  ['event.hosted_by', 'Hosted by'],
  ['filters.all', 'All'],
  ['filters.today', 'Today'],
  ['filters.tomorrow', 'Tomorrow'],
  ['filters.week', 'This Week'],
  ['filters.month', 'This Month'],
]);

export class OptimizedTranslationService {
  private retryCount = 0;
  private maxRetries = 2;

  async loadTranslations(languageCode: string = 'en'): Promise<Map<string, string>> {
    // Return cached if available
    if (translationCache.has(languageCode)) {
      console.log(`📦 Using cached translations for ${languageCode}`);
      return translationCache.get(languageCode)!;
    }

    // Return loading promise if already in progress
    if (loadingPromises.has(languageCode)) {
      console.log(`⏳ Waiting for existing translation load for ${languageCode}`);
      return loadingPromises.get(languageCode)!;
    }

    // Start new load
    const loadPromise = this.fetchTranslations(languageCode);
    loadingPromises.set(languageCode, loadPromise);
    
    try {
      const result = await loadPromise;
      translationCache.set(languageCode, result);
      return result;
    } finally {
      loadingPromises.delete(languageCode);
    }
  }

  private async fetchTranslations(languageCode: string): Promise<Map<string, string>> {
    try {
      console.log(`🌐 Loading translations for ${languageCode}...`);
      
      // Add timeout to prevent indefinite loading
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Translation timeout')), 3000)
      );

      const fetchPromise = supabase
        .from('translations')
        .select(`
          translation_keys(key_name),
          translated_text
        `)
        .eq('language_code', languageCode)
        .limit(100); // Limit to essential translations

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) throw error;

      // Transform to Map with fallbacks
      const translationMap = new Map(fallbackTranslations);
      
      if (data && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.translation_keys?.key_name && item.translated_text) {
            translationMap.set(item.translation_keys.key_name, item.translated_text);
          }
        });
      }

      console.log(`✅ Loaded ${translationMap.size} translations for ${languageCode}`);
      return translationMap;

    } catch (error) {
      console.warn(`⚠️ Translation loading failed for ${languageCode}:`, error);
      
      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying translation load (${this.retryCount}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        return this.fetchTranslations(languageCode);
      }

      // Return fallbacks on failure
      console.log(`📦 Using fallback translations for ${languageCode}`);
      return new Map(fallbackTranslations);
    }
  }

  // Clear cache (useful for language changes)
  clearCache(languageCode?: string) {
    if (languageCode) {
      translationCache.delete(languageCode);
      loadingPromises.delete(languageCode);
    } else {
      translationCache.clear();
      loadingPromises.clear();
    }
  }

  // Get cached translation without loading
  getCachedTranslation(key: string, languageCode: string = 'en'): string | null {
    const cached = translationCache.get(languageCode);
    return cached?.get(key) || fallbackTranslations.get(key) || null;
  }
}

// Singleton instance
export const optimizedTranslationService = new OptimizedTranslationService();