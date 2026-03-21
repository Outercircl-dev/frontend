import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/components/OptimizedProviders';
import { toast } from 'sonner';
import { RealtimeConnectionManager } from '@/utils/realtimeConnectionManager';

export interface EnhancedNotification {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  notification_type: string | null;
  read_at: string | null;
  created_at: string;
  metadata?: any;
}

/**
 * Enhanced notifications hook with real-time updates and better reliability
 * Ensures all notifications appear in navbar and handles email-to-app message duplicates
 */
export const useEnhancedNotifications = (pageSize: number = 10) => {
  const { user, setUnreadNotifications } = useAppContext();
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenNotificationId, setLastSeenNotificationId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch notifications with pagination
  const fetchNotifications = useCallback(async (page: number = 0) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadNotifications(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch user's deleted notifications first
      const { data: deletedNotificationsData } = await supabase
        .from('user_deleted_notifications')
        .select('notification_id')
        .eq('user_id', user.id);

      const deletedNotificationIds = new Set(
        deletedNotificationsData?.map(dn => dn.notification_id) || []
      );
      
      // Get total count first (excluding deleted and archived)
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('archived_at', null);

      const totalNotifications = (count || 0) - deletedNotificationIds.size;
      setTotalCount(totalNotifications);

      // Fetch paginated notifications (excluding archived)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      // Filter out deleted notifications
      const filteredNotifications = data?.filter(n => !deletedNotificationIds.has(n.id)) || [];
      
      setNotifications(filteredNotifications);
      setHasNextPage(totalNotifications > (page + 1) * pageSize);
      setCurrentPage(page);

      // For unread count, we need to fetch all unread notifications separately
      // (only on initial load or when page 0)
      if (page === 0) {
        const { data: unreadData } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .is('read_at', null)
          .is('archived_at', null);
        
        const unreadCount = unreadData?.filter(n => !deletedNotificationIds.has(n.id)).length || 0;
        setUnreadCount(unreadCount);
        setUnreadNotifications(unreadCount);
      }

      // Store the latest notification ID for comparison
      if (filteredNotifications && filteredNotifications.length > 0) {
        setLastSeenNotificationId(filteredNotifications[0].id);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user, setUnreadNotifications]);

  // Enhanced real-time subscription with better error handling
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadNotifications(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
    
    let mounted = true;
    
    // Set up real-time subscription with stable channel name (no timestamp/UUID)
    const channelName = `notifications:${user.id}`;
    
    const setupChannel = () => {
      const channel = supabase
        .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!mounted) return;
          
          const newNotification = payload.new as EnhancedNotification;
          
          // Only add if it's actually new (avoid duplicates)
          setNotifications(prev => {
            const exists = prev.some(n => n.id === newNotification.id);
            if (exists) return prev;
            
            return [newNotification, ...prev];
          });
          
          setUnreadCount(prev => {
            const newCount = prev + 1;
            setUnreadNotifications(newCount);
            
            // Show toast for important notifications
            if (newNotification.notification_type === 'event' || 
                newNotification.notification_type === 'message') {
              toast.success(newNotification.title, {
                description: newNotification.content || 'New notification received',
                action: {
                  label: 'View',
                  onClick: () => {
                    // Navigate based on notification type
                    if (newNotification.notification_type === 'event' && 
                        newNotification.metadata?.event_id) {
                      window.location.href = `/event/${newNotification.metadata.event_id}`;
                    } else {
                      window.location.href = '/notifications';
                    }
                  }
                }
              });
            }
            
            return newCount;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!mounted) return;
          
          const updatedNotification = payload.new as EnhancedNotification;
          setNotifications(prev => 
            prev.map(n => 
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
          
          // Update unread count if read status changed
          if (updatedNotification.read_at && !payload.old.read_at) {
            setUnreadCount(prev => {
              const newCount = Math.max(0, prev - 1);
              setUnreadNotifications(newCount);
              return newCount;
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (!mounted) return;
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Enhanced notifications subscription active');
          RealtimeConnectionManager.resetRetries(channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Enhanced notifications subscription error:', err);
          // Retry with exponential backoff
          RealtimeConnectionManager.handleChannelError(channelName, setupChannel);
        }
      });
      
      return channel;
    };
    
    const channel = setupChannel();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, setUnreadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      setUnreadNotifications(newCount);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadIds = notifications
        .filter(n => !n.read_at)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      setUnreadNotifications(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Force refresh notifications
  const refreshNotifications = useCallback(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Delete notification (hide from user's view)
  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_deleted_notifications')
        .insert({
          user_id: user.id,
          notification_id: notificationId
        });

      if (error) throw error;

      // Remove from current view
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update counts
      const wasUnread = notifications.find(n => n.id === notificationId && !n.read_at);
      if (wasUnread) {
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);
        setUnreadNotifications(newUnreadCount);
      }
      
      setTotalCount(prev => Math.max(0, prev - 1));
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Archive notification (soft archive)
  const archiveNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from current view
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update counts
      const wasUnread = notifications.find(n => n.id === notificationId && !n.read_at);
      if (wasUnread) {
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);
        setUnreadNotifications(newUnreadCount);
      }
      
      setTotalCount(prev => Math.max(0, prev - 1));
      
      toast.success('Notification archived');
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  // Navigation functions
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      const newPage = currentPage + 1;
      fetchNotifications(newPage);
    }
  }, [currentPage, hasNextPage, fetchNotifications]);

  const previousPage = useCallback(() => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      fetchNotifications(newPage);
    }
  }, [currentPage, fetchNotifications]);

  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page * pageSize < totalCount) {
      fetchNotifications(page);
    }
  }, [fetchNotifications, pageSize, totalCount]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    archiveNotification,
    refreshNotifications,
    lastSeenNotificationId,
    currentPage,
    hasNextPage,
    totalCount,
    nextPage,
    previousPage,
    goToPage,
    hasPreviousPage: currentPage > 0,
    totalPages: Math.ceil(totalCount / pageSize)
  };
};