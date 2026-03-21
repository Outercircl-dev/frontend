import { useState, useEffect, useCallback } from 'react';
import { translationService } from '@/services/translationService';

export const useTranslation = (language: string = 'en') => {
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let isMounted = true;

    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const translationMap = await translationService.loadTranslations(language);
        if (isMounted) {
          setTranslations(translationMap);
        }
      } catch (error) {
        console.error('Error loading translations:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, [language]);

  // Translation function
  const t = useCallback((key: string, fallback?: string): string => {
    return translations.get(key) || fallback || key;
  }, [translations]);

  // Get multiple translations
  const tMultiple = useCallback((keys: string[]): Record<string, string> => {
    const result: Record<string, string> = {};
    keys.forEach(key => {
      result[key] = translations.get(key) || key;
    });
    return result;
  }, [translations]);

  return {
    t,
    tMultiple,
    translations,
    isLoading
  };
};