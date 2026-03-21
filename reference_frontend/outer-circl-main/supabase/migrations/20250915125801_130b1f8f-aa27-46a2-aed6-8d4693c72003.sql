-- Add language and country preferences to profile privacy settings
ALTER TABLE public.profile_privacy_settings 
ADD COLUMN IF NOT EXISTS ui_language text DEFAULT 'en' CHECK (length(ui_language) <= 10),
ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'US' CHECK (length(country_code) = 2);

-- Create index for faster queries based on country
CREATE INDEX IF NOT EXISTS idx_profile_privacy_country ON public.profile_privacy_settings(country_code);
CREATE INDEX IF NOT EXISTS idx_profile_privacy_language ON public.profile_privacy_settings(ui_language);

-- Create translation keys table for dynamic content translation
CREATE TABLE IF NOT EXISTS public.translation_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create translations table
CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key_id uuid REFERENCES public.translation_keys(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(translation_key_id, language_code)
);

-- Enable RLS on translation tables
ALTER TABLE public.translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Create policies for translation tables (read-only for authenticated users)
CREATE POLICY "Anyone can read translation keys" ON public.translation_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read translations" ON public.translations FOR SELECT TO authenticated USING (true);

-- Only admins can manage translations
CREATE POLICY "Only admins can manage translation keys" ON public.translation_keys FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can manage translations" ON public.translations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert common translation keys for the application
INSERT INTO public.translation_keys (key_name, category, description) VALUES
('common.loading', 'common', 'Generic loading message'),
('common.save', 'common', 'Save button text'),
('common.cancel', 'common', 'Cancel button text'),
('common.edit', 'common', 'Edit button text'),
('common.delete', 'common', 'Delete button text'),
('common.confirm', 'common', 'Confirm button text'),
('common.error', 'common', 'Generic error message'),
('common.success', 'common', 'Generic success message'),

('nav.dashboard', 'navigation', 'Dashboard navigation link'),
('nav.create', 'navigation', 'Create activity navigation link'),
('nav.messages', 'navigation', 'Messages navigation link'),
('nav.notifications', 'navigation', 'Notifications navigation link'),
('nav.profile', 'navigation', 'Profile navigation link'),
('nav.settings', 'navigation', 'Settings navigation link'),

('dashboard.title', 'dashboard', 'Main dashboard title'),
('dashboard.searchPlaceholder', 'dashboard', 'Search input placeholder'),
('dashboard.noEvents', 'dashboard', 'No events found message'),
('dashboard.loadingActivities', 'dashboard', 'Loading activities message'),
('dashboard.searchResults', 'dashboard', 'Search results header'),

('events.create', 'events', 'Create event button'),
('events.join', 'events', 'Join event button'),
('events.leave', 'events', 'Leave event button'),
('events.save', 'events', 'Save event button'),
('events.participants', 'events', 'Participants label'),
('events.location', 'events', 'Location label'),
('events.date', 'events', 'Date label'),
('events.time', 'events', 'Time label'),
('events.description', 'events', 'Description label'),

('settings.language', 'settings', 'Language setting label'),
('settings.country', 'settings', 'Country setting label'),
('settings.notifications', 'settings', 'Notifications setting label'),
('settings.privacy', 'settings', 'Privacy setting label'),
('settings.saved', 'settings', 'Settings saved message'),

('profile.bio', 'profile', 'Bio section label'),
('profile.interests', 'profile', 'Interests section label'),
('profile.activities', 'profile', 'Activities section label'),
('profile.friends', 'profile', 'Friends section label'),

('messages.noConversations', 'messages', 'No conversations message'),
('messages.typeMessage', 'messages', 'Type message placeholder'),
('messages.sendMessage', 'messages', 'Send message button'),

('notifications.markAllRead', 'notifications', 'Mark all as read button'),
('notifications.noNotifications', 'notifications', 'No notifications message')
ON CONFLICT (key_name) DO NOTHING;

-- Insert English translations
INSERT INTO public.translations (translation_key_id, language_code, translated_text)
SELECT tk.id, 'en', 
  CASE tk.key_name
    WHEN 'common.loading' THEN 'Loading...'
    WHEN 'common.save' THEN 'Save'
    WHEN 'common.cancel' THEN 'Cancel'
    WHEN 'common.edit' THEN 'Edit'
    WHEN 'common.delete' THEN 'Delete'
    WHEN 'common.confirm' THEN 'Confirm'
    WHEN 'common.error' THEN 'An error occurred'
    WHEN 'common.success' THEN 'Success!'
    WHEN 'nav.dashboard' THEN 'Dashboard'
    WHEN 'nav.create' THEN 'Create'
    WHEN 'nav.messages' THEN 'Messages'
    WHEN 'nav.notifications' THEN 'Notifications'
    WHEN 'nav.profile' THEN 'Profile'
    WHEN 'nav.settings' THEN 'Settings'
    WHEN 'dashboard.title' THEN 'Find Your Next Activity'
    WHEN 'dashboard.searchPlaceholder' THEN 'Search activities...'
    WHEN 'dashboard.noEvents' THEN 'No activities found'
    WHEN 'dashboard.loadingActivities' THEN 'Loading activities...'
    WHEN 'dashboard.searchResults' THEN 'Search results for'
    WHEN 'events.create' THEN 'Create Activity'
    WHEN 'events.join' THEN 'Join'
    WHEN 'events.leave' THEN 'Leave'
    WHEN 'events.save' THEN 'Save Activity'
    WHEN 'events.participants' THEN 'Participants'
    WHEN 'events.location' THEN 'Location'
    WHEN 'events.date' THEN 'Date'
    WHEN 'events.time' THEN 'Time'
    WHEN 'events.description' THEN 'Description'
    WHEN 'settings.language' THEN 'Language'
    WHEN 'settings.country' THEN 'Country/Region'
    WHEN 'settings.notifications' THEN 'Notifications'
    WHEN 'settings.privacy' THEN 'Privacy'
    WHEN 'settings.saved' THEN 'Settings saved successfully'
    WHEN 'profile.bio' THEN 'Bio'
    WHEN 'profile.interests' THEN 'Interests'
    WHEN 'profile.activities' THEN 'Activities'
    WHEN 'profile.friends' THEN 'Friends'
    WHEN 'messages.noConversations' THEN 'No conversations yet'
    WHEN 'messages.typeMessage' THEN 'Type a message...'
    WHEN 'messages.sendMessage' THEN 'Send'
    WHEN 'notifications.markAllRead' THEN 'Mark all as read'
    WHEN 'notifications.noNotifications' THEN 'No new notifications'
  END
FROM public.translation_keys tk
WHERE NOT EXISTS (
  SELECT 1 FROM public.translations t 
  WHERE t.translation_key_id = tk.id AND t.language_code = 'en'
);

-- Insert Spanish translations
INSERT INTO public.translations (translation_key_id, language_code, translated_text)
SELECT tk.id, 'es', 
  CASE tk.key_name
    WHEN 'common.loading' THEN 'Cargando...'
    WHEN 'common.save' THEN 'Guardar'
    WHEN 'common.cancel' THEN 'Cancelar'
    WHEN 'common.edit' THEN 'Editar'
    WHEN 'common.delete' THEN 'Eliminar'
    WHEN 'common.confirm' THEN 'Confirmar'
    WHEN 'common.error' THEN 'Ocurrió un error'
    WHEN 'common.success' THEN '¡Éxito!'
    WHEN 'nav.dashboard' THEN 'Panel'
    WHEN 'nav.create' THEN 'Crear'
    WHEN 'nav.messages' THEN 'Mensajes'
    WHEN 'nav.notifications' THEN 'Notificaciones'
    WHEN 'nav.profile' THEN 'Perfil'
    WHEN 'nav.settings' THEN 'Configuración'
    WHEN 'dashboard.title' THEN 'Encuentra tu Próxima Actividad'
    WHEN 'dashboard.searchPlaceholder' THEN 'Buscar actividades...'
    WHEN 'dashboard.noEvents' THEN 'No se encontraron actividades'
    WHEN 'dashboard.loadingActivities' THEN 'Cargando actividades...'
    WHEN 'dashboard.searchResults' THEN 'Resultados de búsqueda para'
    WHEN 'events.create' THEN 'Crear Actividad'
    WHEN 'events.join' THEN 'Unirse'
    WHEN 'events.leave' THEN 'Salir'
    WHEN 'events.save' THEN 'Guardar Actividad'
    WHEN 'events.participants' THEN 'Participantes'
    WHEN 'events.location' THEN 'Ubicación'
    WHEN 'events.date' THEN 'Fecha'
    WHEN 'events.time' THEN 'Hora'
    WHEN 'events.description' THEN 'Descripción'
    WHEN 'settings.language' THEN 'Idioma'
    WHEN 'settings.country' THEN 'País/Región'
    WHEN 'settings.notifications' THEN 'Notificaciones'
    WHEN 'settings.privacy' THEN 'Privacidad'
    WHEN 'settings.saved' THEN 'Configuración guardada exitosamente'
    WHEN 'profile.bio' THEN 'Biografía'
    WHEN 'profile.interests' THEN 'Intereses'
    WHEN 'profile.activities' THEN 'Actividades'
    WHEN 'profile.friends' THEN 'Amigos'
    WHEN 'messages.noConversations' THEN 'Aún no hay conversaciones'
    WHEN 'messages.typeMessage' THEN 'Escribe un mensaje...'
    WHEN 'messages.sendMessage' THEN 'Enviar'
    WHEN 'notifications.markAllRead' THEN 'Marcar todas como leídas'
    WHEN 'notifications.noNotifications' THEN 'No hay nuevas notificaciones'
  END
FROM public.translation_keys tk
WHERE NOT EXISTS (
  SELECT 1 FROM public.translations t 
  WHERE t.translation_key_id = tk.id AND t.language_code = 'es'
);

-- Insert French translations
INSERT INTO public.translations (translation_key_id, language_code, translated_text)
SELECT tk.id, 'fr', 
  CASE tk.key_name
    WHEN 'common.loading' THEN 'Chargement...'
    WHEN 'common.save' THEN 'Enregistrer'
    WHEN 'common.cancel' THEN 'Annuler'
    WHEN 'common.edit' THEN 'Modifier'
    WHEN 'common.delete' THEN 'Supprimer'
    WHEN 'common.confirm' THEN 'Confirmer'
    WHEN 'common.error' THEN 'Une erreur s''est produite'
    WHEN 'common.success' THEN 'Succès!'
    WHEN 'nav.dashboard' THEN 'Tableau de bord'
    WHEN 'nav.create' THEN 'Créer'
    WHEN 'nav.messages' THEN 'Messages'
    WHEN 'nav.notifications' THEN 'Notifications'
    WHEN 'nav.profile' THEN 'Profil'
    WHEN 'nav.settings' THEN 'Paramètres'
    WHEN 'dashboard.title' THEN 'Trouvez votre Prochaine Activité'
    WHEN 'dashboard.searchPlaceholder' THEN 'Rechercher des activités...'
    WHEN 'dashboard.noEvents' THEN 'Aucune activité trouvée'
    WHEN 'dashboard.loadingActivities' THEN 'Chargement des activités...'
    WHEN 'dashboard.searchResults' THEN 'Résultats de recherche pour'
    WHEN 'events.create' THEN 'Créer une Activité'
    WHEN 'events.join' THEN 'Rejoindre'
    WHEN 'events.leave' THEN 'Quitter'
    WHEN 'events.save' THEN 'Sauvegarder l''Activité'
    WHEN 'events.participants' THEN 'Participants'
    WHEN 'events.location' THEN 'Lieu'
    WHEN 'events.date' THEN 'Date'
    WHEN 'events.time' THEN 'Heure'
    WHEN 'events.description' THEN 'Description'
    WHEN 'settings.language' THEN 'Langue'
    WHEN 'settings.country' THEN 'Pays/Région'
    WHEN 'settings.notifications' THEN 'Notifications'
    WHEN 'settings.privacy' THEN 'Confidentialité'
    WHEN 'settings.saved' THEN 'Paramètres enregistrés avec succès'
    WHEN 'profile.bio' THEN 'Biographie'
    WHEN 'profile.interests' THEN 'Centres d''intérêt'
    WHEN 'profile.activities' THEN 'Activités'
    WHEN 'profile.friends' THEN 'Amis'
    WHEN 'messages.noConversations' THEN 'Aucune conversation pour le moment'
    WHEN 'messages.typeMessage' THEN 'Tapez un message...'
    WHEN 'messages.sendMessage' THEN 'Envoyer'
    WHEN 'notifications.markAllRead' THEN 'Tout marquer comme lu'
    WHEN 'notifications.noNotifications' THEN 'Aucune nouvelle notification'
  END
FROM public.translation_keys tk
WHERE NOT EXISTS (
  SELECT 1 FROM public.translations t 
  WHERE t.translation_key_id = tk.id AND t.language_code = 'fr'
);

-- Create function to get user's language preference
CREATE OR REPLACE FUNCTION get_user_language()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(ui_language, 'en')
    FROM public.profile_privacy_settings
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Create function to get user's country preference
CREATE OR REPLACE FUNCTION get_user_country()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(country_code, 'US')
    FROM public.profile_privacy_settings
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$;