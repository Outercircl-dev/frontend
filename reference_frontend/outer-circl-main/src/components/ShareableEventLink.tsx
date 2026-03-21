import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Component that handles shareable event links with optimizations for logged-in users
 * Preloads event data and provides seamless navigation
 */
const ShareableEventLink: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleShareableLinkOptimization = async () => {
      if (!id) return;

      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // For logged-in users, preload event data for faster experience
          const { data: event, error } = await supabase
            .from('events')
            .select(`
              *,
              profiles!events_host_id_fkey(name, avatar_url)
            `)
            .eq('id', id)
            .single();

          if (error) {
            console.error('Error preloading event:', error);
            return;
          }

          // 🔒 SECURITY: Don't cache potentially sensitive event data in browser storage
          // Show welcome toast for shared link users
          if (event) {
            const referrer = document.referrer;
            if (referrer && !referrer.includes(window.location.host)) {
              toast.success(`Welcome! You've been invited to "${event.title}"`);
            }
          }
        } else {
          // For non-logged in users, show invitation message
          const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', id)
            .single();

          if (event) {
            toast.info(`Join "${event.title}" - Log in to participate!`);
          }
        }
      } catch (error) {
        console.error('Error optimizing shareable link:', error);
      }
    };

    handleShareableLinkOptimization();
  }, [id, navigate]);

  return null; // This is a utility component that doesn't render anything
};

export default ShareableEventLink;