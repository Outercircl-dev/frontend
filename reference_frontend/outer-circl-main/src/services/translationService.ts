import { supabase } from '@/integrations/supabase/client';

// Translation cache to avoid repeated database calls
const translationCache = new Map<string, Map<string, string>>();
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface TranslationKey {
  id: string;
  key_name: string;
  category: string;
  description?: string;
}

export interface Translation {
  id: string;
  translation_key_id: string;
  language_code: string;
  translated_text: string;
}

class TranslationService {
  private fallbackTranslations: Map<string, string> = new Map([
    // Fallback translations for when database is unavailable
    ['common.loading', 'Loading...'],
    ['common.save', 'Save'],
    ['common.cancel', 'Cancel'],
    ['nav.dashboard', 'Dashboard'],
    ['nav.create', 'Create'],
    ['nav.settings', 'Settings'],
    ['dashboard.title', 'Find Your Next Activity'],
    ['dashboard.searchPlaceholder', 'Search activities...'],
    ['settings.language', 'Language'],
    ['settings.country', 'Country/Region'],
    ['settings.saved', 'Settings saved successfully'],
  ]);

  /**
   * Load all translations for a specific language from the database
   */
  async loadTranslations(languageCode: string): Promise<Map<string, string>> {
    try {
      console.log(`Loading translations for language: ${languageCode}`);
      
      // Always get fallback translations first
      const fallbackTranslations = this.getFallbackTranslations(languageCode);
      
      // Check cache first
      const now = Date.now();
      if (translationCache.has(languageCode) && (now - cacheTimestamp) < CACHE_DURATION) {
        const cachedTranslations = translationCache.get(languageCode)!;
        // Merge cached with fallbacks to ensure we have all common UI elements
        const mergedCache = new Map([...fallbackTranslations, ...cachedTranslations]);
        console.log(`Using cached translations for ${languageCode}: ${mergedCache.size} entries`);
        return mergedCache;
      }

      const { data: translations, error } = await supabase
        .from('translations')
        .select(`
          translated_text,
          translation_keys!inner (
            key_name
          )
        `)
        .eq('language_code', languageCode);

      if (error) {
        console.error('Error loading translations:', error);
        console.log(`Using fallback translations for ${languageCode}: ${fallbackTranslations.size} entries`);
        return fallbackTranslations;
      }

      const translationMap = new Map<string, string>();
      
      translations?.forEach((translation: any) => {
        const keyName = translation.translation_keys?.key_name;
        if (keyName) {
          translationMap.set(keyName, translation.translated_text);
        }
      });

      // Always merge with fallbacks to ensure complete coverage
      const mergedTranslations = new Map([...fallbackTranslations, ...translationMap]);

      // Update cache with merged translations
      translationCache.set(languageCode, mergedTranslations);
      cacheTimestamp = now;

      console.log(`Loaded ${translations?.length || 0} DB translations + ${fallbackTranslations.size} fallbacks for ${languageCode} = ${mergedTranslations.size} total`);
      return mergedTranslations;
    } catch (error) {
      console.error('Translation service error:', error);
      const fallbackTranslations = this.getFallbackTranslations(languageCode);
      console.log(`Using fallback translations due to error: ${fallbackTranslations.size} entries`);
      return fallbackTranslations;
    }
  }

  /**
   * Get a specific translation by key
   */
  async getTranslation(key: string, languageCode: string = 'en'): Promise<string> {
    const translations = await this.loadTranslations(languageCode);
    return translations.get(key) || this.fallbackTranslations.get(key) || key;
  }

  /**
   * Get multiple translations at once
   */
  async getTranslations(keys: string[], languageCode: string = 'en'): Promise<Record<string, string>> {
    const translations = await this.loadTranslations(languageCode);
    const result: Record<string, string> = {};
    
    keys.forEach(key => {
      result[key] = translations.get(key) || this.fallbackTranslations.get(key) || key;
    });

    return result;
  }

  /**
   * Update user's language preference in the database
   */
  async updateUserLanguage(languageCode: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profile_privacy_settings')
        .upsert({
          user_id: user.id,
          ui_language: languageCode,
          profile_visibility: 'public',
          allow_friend_requests: true,
          message_privacy: 'followers',
          email_notifications: true,
          push_notifications: true,
          event_messages: true,
          ad_personalization: true,
          personalization_opt: 'full'
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating user language:', error);
        return false;
      }

      // Clear cache to force reload
      translationCache.clear();
      return true;
    } catch (error) {
      console.error('Error updating user language:', error);
      return false;
    }
  }

  /**
   * Update user's country preference in the database
   */
  async updateUserCountry(countryCode: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profile_privacy_settings')
        .upsert({
          user_id: user.id,
          country_code: countryCode,
          profile_visibility: 'public',
          allow_friend_requests: true,
          message_privacy: 'followers',
          email_notifications: true,
          push_notifications: true,
          event_messages: true,
          ad_personalization: true,
          personalization_opt: 'full'
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating user country:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user country:', error);
      return false;
    }
  }

  /**
   * Get user's saved language and country preferences
   */
  async getUserPreferences(): Promise<{ language: string; country: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { language: 'en', country: 'US' };

      const { data, error } = await supabase
        .from('profile_privacy_settings')
        .select('ui_language, country_code')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return { language: 'en', country: 'US' };
      }

      return {
        language: data.ui_language || 'en',
        country: data.country_code || 'US'
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return { language: 'en', country: 'US' };
    }
  }

  /**
   * Fallback translations for when database is unavailable
   */
  private getFallbackTranslations(languageCode: string): Map<string, string> {
    const baseTranslations = new Map([
      // Navigation and common UI elements
      ['nav.home', 'Home'],
      ['nav.dashboard', 'Dashboard'],
      ['nav.profile', 'Profile'],
      ['nav.create', 'Create'],
      ['nav.createActivity', 'Create Activity'],
      ['nav.explore', 'Explore'],
      ['nav.settings', 'Settings'],
      ['nav.notifications', 'Notifications'],
      ['nav.messages', 'Messages'],
      ['nav.help', 'Help'],
      ['nav.logout', 'Logout'],
      ['nav.login', 'Login'],
      ['nav.signup', 'Sign Up'],
      
      // Common actions
      ['common.loading', 'Loading...'],
      ['common.save', 'Save'],
      ['common.cancel', 'Cancel'],
      ['common.edit', 'Edit'],
      ['common.delete', 'Delete'],
      ['common.back', 'Back'],
      ['common.next', 'Next'],
      ['common.submit', 'Submit'],
      ['common.search', 'Search'],
      ['common.filter', 'Filter'],
      ['common.view', 'View'],
      ['common.share', 'Share'],
      ['common.copy', 'Copy'],
      
      // Dashboard and activities
      ['dashboard.title', 'Find Your Next Activity'],
      ['dashboard.searchPlaceholder', 'Search activities...'],
      ['dashboard.createActivity', 'Create Activity'],
      ['dashboard.joinActivity', 'Join Activity'],
      
      // Settings
      ['settings.language', 'Language'],
      ['settings.country', 'Country/Region'],
      ['settings.saved', 'Settings saved successfully'],
      ['settings.privacy', 'Privacy Settings'],
      ['settings.account', 'Account Settings'],
      
      // Profile
      ['profile.editProfile', 'Edit Profile'],
      ['profile.viewProfile', 'View Profile'],
      ['profile.uploadPhoto', 'Upload Photo'],
      
      // Status messages
      ['status.success', 'Success'],
      ['status.error', 'Error'],
      ['status.warning', 'Warning'],
      ['status.info', 'Information']
    ]);

    if (languageCode === 'es') {
      return new Map([
        // Navigation
        ['nav.home', 'Inicio'],
        ['nav.dashboard', 'Panel'],
        ['nav.profile', 'Perfil'],
        ['nav.create', 'Crear'],
        ['nav.createActivity', 'Crear Actividad'],
        ['nav.explore', 'Explorar'],
        ['nav.settings', 'Configuración'],
        ['nav.notifications', 'Notificaciones'],
        ['nav.messages', 'Mensajes'],
        ['nav.help', 'Ayuda'],
        ['nav.logout', 'Cerrar sesión'],
        ['nav.login', 'Iniciar sesión'],
        ['nav.signup', 'Registrarse'],
        
        // Common actions
        ['common.loading', 'Cargando...'],
        ['common.save', 'Guardar'],
        ['common.cancel', 'Cancelar'],
        ['common.edit', 'Editar'],
        ['common.delete', 'Eliminar'],
        ['common.back', 'Atrás'],
        ['common.next', 'Siguiente'],
        ['common.submit', 'Enviar'],
        ['common.search', 'Buscar'],
        ['common.filter', 'Filtrar'],
        ['common.view', 'Ver'],
        ['common.share', 'Compartir'],
        ['common.copy', 'Copiar'],
        
        // Dashboard
        ['dashboard.title', 'Encuentra tu Próxima Actividad'],
        ['dashboard.searchPlaceholder', 'Buscar actividades...'],
        ['dashboard.createActivity', 'Crear Actividad'],
        ['dashboard.joinActivity', 'Unirse a Actividad'],
        
        // Settings
        ['settings.language', 'Idioma'],
        ['settings.country', 'País/Región'],
        ['settings.saved', 'Configuración guardada exitosamente'],
        ['settings.privacy', 'Configuración de Privacidad'],
        ['settings.account', 'Configuración de Cuenta'],
        
        // Profile
        ['profile.editProfile', 'Editar Perfil'],
        ['profile.viewProfile', 'Ver Perfil'],
        ['profile.uploadPhoto', 'Subir Foto'],
        
        // Status
        ['status.success', 'Éxito'],
        ['status.error', 'Error'],
        ['status.warning', 'Advertencia'],
        ['status.info', 'Información']
      ]);
    } else if (languageCode === 'fr') {
      return new Map([
        // Navigation
        ['nav.home', 'Accueil'],
        ['nav.dashboard', 'Tableau de bord'],
        ['nav.profile', 'Profil'],
        ['nav.create', 'Créer'],
        ['nav.createActivity', 'Créer une Activité'],
        ['nav.explore', 'Explorer'],
        ['nav.settings', 'Paramètres'],
        ['nav.notifications', 'Notifications'],
        ['nav.messages', 'Messages'],
        ['nav.help', 'Aide'],
        ['nav.logout', 'Déconnexion'],
        ['nav.login', 'Connexion'],
        ['nav.signup', 'S\'inscrire'],
        
        // Common actions
        ['common.loading', 'Chargement...'],
        ['common.save', 'Enregistrer'],
        ['common.cancel', 'Annuler'],
        ['common.edit', 'Modifier'],
        ['common.delete', 'Supprimer'],
        ['common.back', 'Retour'],
        ['common.next', 'Suivant'],
        ['common.submit', 'Soumettre'],
        ['common.search', 'Rechercher'],
        ['common.filter', 'Filtrer'],
        ['common.view', 'Voir'],
        ['common.share', 'Partager'],
        ['common.copy', 'Copier'],
        
        // Dashboard
        ['dashboard.title', 'Trouvez votre Prochaine Activité'],
        ['dashboard.searchPlaceholder', 'Rechercher des activités...'],
        ['dashboard.createActivity', 'Créer une Activité'],
        ['dashboard.joinActivity', 'Rejoindre une Activité'],
        
        // Settings
        ['settings.language', 'Langue'],
        ['settings.country', 'Pays/Région'],
        ['settings.saved', 'Paramètres enregistrés avec succès'],
        ['settings.privacy', 'Paramètres de Confidentialité'],
        ['settings.account', 'Paramètres du Compte'],
        
        // Profile
        ['profile.editProfile', 'Modifier le Profil'],
        ['profile.viewProfile', 'Voir le Profil'],
        ['profile.uploadPhoto', 'Téléverser une Photo'],
        
        // Status
        ['status.success', 'Succès'],
        ['status.error', 'Erreur'],
        ['status.warning', 'Avertissement'],
        ['status.info', 'Information']
      ]);
    } else if (languageCode === 'en-GB') {
      // British English - same as American English for most UI elements
      return baseTranslations;
    }
    
    // Default to English (en or any other language code)
    return baseTranslations;
  }

  /**
   * Clear the translation cache (useful for language switches)
   */
  clearCache(): void {
    translationCache.clear();
    cacheTimestamp = 0;
  }
}

export const translationService = new TranslationService();