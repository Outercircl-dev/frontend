import { useState, useEffect } from 'react';
import { getUserMediaFromSupabase, UserMedia } from '@/utils/supabaseMediaStorage';
import { supabase } from '@/integrations/supabase/client';

export const useUserMedia = (userId?: string) => {
  const [media, setMedia] = useState<UserMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userMedia = await getUserMediaFromSupabase(userId);
      setMedia(userMedia);
    } catch (err) {
      console.error('Error fetching user media:', err);
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const addMedia = (newMedia: UserMedia) => {
    setMedia(prevMedia => [newMedia, ...prevMedia]);
  };

  const removeMedia = (mediaId: string) => {
    setMedia(prevMedia => prevMedia.filter(item => item.id !== mediaId));
  };

  const updateMedia = (updatedMedia: UserMedia) => {
    setMedia(prevMedia => 
      prevMedia.map(item => 
        item.id === updatedMedia.id ? updatedMedia : item
      )
    );
  };

  useEffect(() => {
    fetchMedia();
  }, [userId]);

  return {
    media,
    loading,
    error,
    fetchMedia,
    addMedia,
    removeMedia,
    updateMedia
  };
};