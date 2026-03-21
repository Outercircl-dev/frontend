import { useNavigate } from 'react-router-dom';
import { Notification } from './useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useNotificationNavigation = () => {
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: Notification) => {
    const { notification_type, metadata } = notification;

    try {
      switch (notification_type) {
        case 'friend_request':
          // Navigate directly to notifications page with friends tab active
          navigate('/notifications', { state: { activeTab: 'friends' } });
          break;

        case 'message':
          // Navigate to messages page with specific conversation
          if (metadata?.message_type === 'direct') {
            // Get current user ID
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) {
              toast.error('Authentication required');
              navigate('/login');
              return;
            }

            // Determine the conversation partner based on who sent/received the message
            let conversationPartnerId: string | null = null;
            
            // If current user is the recipient, conversation partner is the sender
            if (metadata?.recipient_id === currentUser.id && metadata?.sender_id) {
              conversationPartnerId = metadata.sender_id;
            }
            // If current user is the sender, conversation partner is the recipient  
            else if (metadata?.sender_id === currentUser.id && metadata?.recipient_id) {
              conversationPartnerId = metadata.recipient_id;
            }
            // Fallback: use sender_id if available
            else if (metadata?.sender_id) {
              conversationPartnerId = metadata.sender_id;
            }

            if (conversationPartnerId) {
              // Check if the conversation partner still exists
              const { data: partnerProfile } = await supabase
                .from('profiles')
                .select('id, name, username')
                .eq('id', conversationPartnerId)
                .maybeSingle();

              if (partnerProfile) {
                // Navigate directly to messages with conversation partner
                navigate(`/messages?conversation=${conversationPartnerId}`);
              } else {
                toast.error('This conversation is no longer available');
                navigate('/messages');
              }
            } else {
              toast.error('Unable to find conversation details');
              navigate('/messages');
            }
          } else if (metadata?.message_type === 'event' && metadata?.event_id) {
            // Check if event still exists
            const { data: event } = await supabase
              .from('events')
              .select('id, title, status')
              .eq('id', metadata.event_id)
              .maybeSingle();

            if (event && event.status === 'active') {
              navigate(`/event/${metadata.event_id}?tab=chat`);
            } else {
              toast.error('This activity is no longer available');
              navigate('/messages');
            }
          } else {
            // Fallback: navigate to general messages page
            navigate('/messages');
          }
          break;

        case 'event':
        case 'event_reminder':
          // Navigate to the specific event with reminder context
          if (metadata?.event_id) {
            // Check if event still exists
            const { data: event } = await supabase
              .from('events')
              .select('id, title, status')
              .eq('id', metadata.event_id)
              .maybeSingle();

            if (event && event.status === 'active') {
              const eventPath = `/event/${metadata.event_id}`;
              if (notification_type === 'event_reminder') {
                navigate(`${eventPath}?reminder=true`);
              } else {
                navigate(eventPath);
              }
            } else {
              toast.error('This activity no longer exists');
              navigate('/dashboard');
            }
          } else {
            // Try to extract event info from notification content
            // This is a fallback for older notifications without metadata
            navigate('/dashboard');
          }
          break;

        case 'rating_request':
          // Check if event still exists before showing rating
          if (metadata?.event_id) {
            const { data: event } = await supabase
              .from('events')
              .select('id, title, status')
              .eq('id', metadata.event_id)
              .maybeSingle();

            if (!event) {
              toast.error('This activity no longer exists');
            }
            // Stay on notifications page to show rating modal (or not if event doesn't exist)
          }
          break;

        default:
          // For unknown notification types, stay on notifications page
          break;
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      toast.error('Unable to navigate to this item');
    }
  };

  return {
    handleNotificationClick
  };
};