import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/components/optimization/UltraMinimalProviders';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessagingCache } from '@/services/MessagingCache';
import { MessageQueue } from '@/services/MessageQueue';
import { RealtimeConnectionManager } from '@/utils/realtimeConnectionManager';
import { realtimeManager } from '@/services/RealtimeSubscriptionManager';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Unified interfaces for all messaging types
export interface UnifiedMessage {
  id: string;
  type: 'direct' | 'event' | 'welcome' | 'reminder' | 'system';
  sender_id: string;
  recipient_id?: string;
  event_id?: string;
  content: string;
  read_at?: string;
  created_at: string;
  metadata?: any;
  // Joined data for performance
  sender?: {
    name: string;
    username: string;
    avatar_url?: string;
  };
  event?: {
    title: string;
    date: string;
    time?: string;
  };
}

export interface UnifiedNotification {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  notification_type: 'event' | 'event_reminder' | 'friend_request' | 'message' | 'system' | 'reminder';
  read_at: string | null;
  created_at: string;
  metadata?: any;
}

// Unified messaging hook to replace all specialized hooks
export const useUnifiedMessaging = () => {
  const { user, setUnreadNotifications } = useAppContext();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Early return safety: Don't process if user not ready
  const isUserReady = Boolean(user?.id);

  // Unified cache instance
  const cache = useMemo(() => MessagingCache.getInstance(), []);
  const messageQueue = useMemo(() => MessageQueue.getInstance(), []);

  // Unified state management
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    notifications: 0,
    total: 0
  });

  // Performance-optimized data fetching with intelligent caching
  const fetchData = useCallback(async (
    type: 'messages' | 'notifications' | 'both' = 'both',
    options: { 
      useCache?: boolean;
      limit?: number;
      eventId?: string;
      conversationType?: 'direct' | 'activity' | 'all';
    } = {}
  ) => {
    if (!user?.id) return;

    const { useCache = true, limit, eventId, conversationType = 'all' } = options;
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cacheKey = `${type}-${user.id}-${eventId || 'all'}-${conversationType}`;
      
      if (useCache) {
        const cached = cache.get<{
          messages?: UnifiedMessage[];
          notifications?: UnifiedNotification[];
        }>(cacheKey);
        
        if (cached) {
          if (type === 'messages' || type === 'both') {
            setMessages(cached.messages || []);
            setUnreadCounts(prev => ({ 
              ...prev, 
              messages: cached.messages?.filter(m => !m.read_at).length || 0 
            }));
          }
          if (type === 'notifications' || type === 'both') {
            setNotifications(cached.notifications || []);
            const unreadNotifications = cached.notifications?.filter(n => !n.read_at).length || 0;
            setUnreadCounts(prev => ({ 
              ...prev, 
              notifications: unreadNotifications 
            }));
            setUnreadNotifications(unreadNotifications);
          }
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data with optimized queries
      const fetchedData: any = {};
      const fetchLimit = limit || (isMobile ? 20 : 50);

      if (type === 'messages' || type === 'both') {
        let query = supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(name, username, avatar_url),
            event:events(title, date, time)
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(fetchLimit);

        // Filter by conversation type
        if (conversationType === 'direct') {
          query = query.eq('message_type', 'direct');
        } else if (conversationType === 'activity') {
          query = query.eq('message_type', 'event');
        }

        // Filter by specific event
        if (eventId) {
          query = query.eq('event_id', eventId);
        }

        const { data: messagesData, error: messagesError } = await query;
        if (messagesError) throw messagesError;
        fetchedData.messages = messagesData || [];
      }

      if (type === 'notifications' || type === 'both') {
        // Fetch more notifications with pagination support
        const notificationsLimit = Math.max(fetchLimit, 100); // Ensure we get plenty of notifications
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(notificationsLimit);
        
        if (notificationsError) throw notificationsError;
        fetchedData.notifications = notificationsData || [];
      }

      // Update cache
      cache.set(cacheKey, fetchedData, ['user', user.id, eventId].filter(Boolean));

      // Update state
      if (fetchedData.messages) {
        setMessages(fetchedData.messages);
        setUnreadCounts(prev => ({ 
          ...prev, 
          messages: fetchedData.messages.filter((m: UnifiedMessage) => !m.read_at).length 
        }));
      }

      if (fetchedData.notifications) {
        setNotifications(fetchedData.notifications);
        const unreadNotifications = fetchedData.notifications.filter((n: UnifiedNotification) => !n.read_at).length;
        setUnreadCounts(prev => ({ 
          ...prev, 
          notifications: unreadNotifications,
          total: prev.messages + unreadNotifications
        }));
        setUnreadNotifications(unreadNotifications);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isMobile, cache, setUnreadNotifications]);

  // Update unread counts based on current state and user capability to mark messages as read
  const updateUnreadCounts = useCallback(() => {
    if (!user?.id) return;
    
    const unreadMessages = messages.filter(m => !m.read_at && (
      (m.recipient_id === user.id && m.type === 'direct') || // Direct messages to user
      (m.type === 'event' && m.event_id) // Event messages where user can participate
    )).length;
    
    const unreadNotifs = notifications.filter(n => !n.read_at && n.user_id === user.id).length;
    
    setUnreadCounts({
      messages: unreadMessages,
      notifications: unreadNotifs,
      total: unreadMessages + unreadNotifs
    });
    
    setUnreadNotifications(unreadNotifs);
  }, [messages, notifications, user?.id, setUnreadNotifications]);

  // Update counts whenever messages or notifications change
  useEffect(() => {
    updateUnreadCounts();
  }, [updateUnreadCounts]);

  // Optimized message sending with queue system
  const sendMessage = useCallback(async (
    content: string,
    options: {
      recipientId?: string;
      eventId?: string;
      type?: 'direct' | 'event' | 'welcome' | 'reminder';
      metadata?: any;
    }
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    const message = {
      id: crypto.randomUUID(),
      sender_id: user.id,
      content,
      message_type: options.type || 'direct',
      recipient_id: options.recipientId,
      event_id: options.eventId,
      metadata: options.metadata,
      created_at: new Date().toISOString()
    };

    try {
      // Add to queue for immediate UI update
      messageQueue.add(message);
      
      // Optimistic update
      const optimisticMessage: UnifiedMessage = {
        ...message,
        type: options.type || 'direct',
        sender: {
          name: 'You',
          username: 'you',
          avatar_url: user.user_metadata?.avatar_url
        }
      };

      setMessages(prev => [optimisticMessage, ...prev]);

      // Send to database
      const { error } = await supabase
        .from('messages')
        .insert(message);

      if (error) throw error;

      // Invalidate relevant caches
      cache.invalidateByDependency(`user-${user.id}`);
      if (options.eventId) {
        cache.invalidateByDependency(`event-${options.eventId}`);
      }

      return { success: true, messageId: message.id };

    } catch (err: any) {
      // Remove from queue and optimistic update on failure
      messageQueue.remove(message.id);
      setMessages(prev => prev.filter(m => m.id !== message.id));
      throw err;
    }
  }, [user, messageQueue, cache]);

  // Simplified mark as read - handle all message types uniformly
  const markAsRead = useCallback(async (
    ids: string[],
    type: 'messages' | 'notifications' = 'messages'
  ) => {
    if (!ids.length || !user?.id) return;

    console.log(`[markAsRead] Marking ${ids.length} ${type} as read:`, ids);

    try {
      // Optimistic update
      if (type === 'messages') {
        setMessages(prev => prev.map(m => 
          ids.includes(m.id) 
            ? { ...m, read_at: new Date().toISOString() }
            : m
        ));
        setUnreadCounts(prev => ({ 
          ...prev, 
          messages: Math.max(0, prev.messages - ids.length),
          total: Math.max(0, prev.total - ids.length)
        }));
      } else {
        setNotifications(prev => prev.map(n => 
          ids.includes(n.id) 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        ));
        const reduction = ids.length;
        setUnreadCounts(prev => {
          const newNotifications = Math.max(0, prev.notifications - reduction);
          setUnreadNotifications(newNotifications);
          return { 
            ...prev, 
            notifications: newNotifications,
            total: prev.messages + newNotifications
          };
        });
      }

      if (type === 'messages') {
        // Simplified approach: Try to update all messages directly
        // First try standard update for all messages
        const { error: updateError } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', ids);

        if (updateError) {
          console.log('[markAsRead] Standard update failed, trying RPC for each message:', updateError);
          
          // If standard update fails, try RPC for each message
          for (const messageId of ids) {
            try {
              const { error: rpcError } = await supabase
                .rpc('mark_event_message_as_read', { p_message_id: messageId });
              
              if (rpcError) {
                console.error(`[markAsRead] RPC failed for message ${messageId}:`, rpcError);
              } else {
                console.log(`[markAsRead] Successfully marked message ${messageId} as read via RPC`);
              }
            } catch (rpcErr) {
              console.error(`[markAsRead] RPC error for message ${messageId}:`, rpcErr);
            }
          }
        } else {
          console.log(`[markAsRead] Successfully marked ${ids.length} messages as read via standard update`);
        }
      } else {
        // Handle notifications
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', ids)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('[markAsRead] Notifications error:', error);
          throw error;
        }
      }

      // Invalidate cache after successful update
      cache.invalidateByDependency(`user-${user?.id}`);
      
      console.log(`[markAsRead] Successfully processed all ${ids.length} ${type}`);

    } catch (err: any) {
      console.error('Error marking as read:', err);
      // Revert optimistic update on failure
      fetchData(type, { useCache: false });
    }
  }, [user?.id, cache, fetchData, setUnreadNotifications]);

  // Helper functions for message transformation
  const transformToUnifiedMessage = useCallback((msg: any): UnifiedMessage => ({
    id: msg.id,
    type: msg.message_type === 'event' ? 'event' : 'direct',
    sender_id: msg.sender_id,
    recipient_id: msg.recipient_id,
    event_id: msg.event_id,
    content: msg.content,
    read_at: msg.read_at,
    created_at: msg.created_at,
    metadata: msg.metadata,
    sender: msg.sender,
    event: msg.event
  }), []);

  const transformToUnifiedNotification = useCallback((notif: any): UnifiedNotification => ({
    id: notif.id,
    user_id: notif.user_id,
    title: notif.title,
    content: notif.content,
    notification_type: notif.notification_type || 'system',
    read_at: notif.read_at || null,
    created_at: notif.created_at,
    metadata: notif.metadata
  }), []);

  // Use refs to track subscriptions across re-renders (prevents double subscription in Strict Mode)
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const notificationsChannelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionStateRef = useRef<{
    messages: 'idle' | 'subscribing' | 'subscribed' | 'error';
    notifications: 'idle' | 'subscribing' | 'subscribed' | 'error';
  }>({
    messages: 'idle',
    notifications: 'idle'
  });
  const retryTimeoutsRef = useRef<{
    messages?: NodeJS.Timeout;
    notifications?: NodeJS.Timeout;
  }>({});

  // CRITICAL: Use singleton manager to prevent duplicate subscriptions
  useEffect(() => {
    if (!isUserReady || !user?.id) {
      console.log('👤 No user ready for realtime subscriptions');
      return;
    }

    console.log('🔗 Setting up realtime via singleton manager for user:', user.id.substring(0, 8));
    
    // Stable channel names
    const messagesChannelName = `messages:${user.id}`;
    const notificationsChannelName = `notifications:${user.id}`;
    
    // Check if already connected
    if (realtimeManager.isConnected(messagesChannelName) && realtimeManager.isConnected(notificationsChannelName)) {
      console.log('✅ Already connected via manager, skipping');
      return;
    }
    
    // Initial data fetch
    fetchData('both');

    // Subscribe using singleton manager
    const unsubscribeMessages = realtimeManager.subscribe(messagesChannelName, {
      event: '*',
      schema: 'public',
      table: 'messages',
      onData: (payload) => {
        console.log('📨 Message event via manager:', payload);

        // Filter messages relevant to current user
        const messageData = payload.new || payload.old;
        const isRelevant = messageData && typeof messageData === 'object' && (
          (messageData as any).sender_id === user.id || 
          (messageData as any).recipient_id === user.id ||
          ((messageData as any).event_id && (messageData as any).message_type === 'event')
        );
        
        if (!isRelevant) return;
        
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new as any;
          if (!messageQueue.has(newMessage.id)) {
            const unifiedMsg = transformToUnifiedMessage(newMessage);
            
            setMessages(current => {
              const exists = current.find(m => m.id === unifiedMsg.id);
              if (exists) return current;
              
              return [unifiedMsg, ...current].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            });
            
            if (newMessage.recipient_id === user.id && !newMessage.read_at) {
              setUnreadCounts(prev => ({ 
                ...prev, 
                messages: prev.messages + 1,
                total: prev.total + 1
              }));
            }
          }
          
          // Targeted invalidation instead of clearing entire cache
          cache.invalidateByDependency(user.id);
        } else if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new as any;
          const unifiedMsg = transformToUnifiedMessage(updatedMessage);
          
          setMessages(current => current.map(m => m.id === unifiedMsg.id ? unifiedMsg : m));
          // Targeted invalidation instead of clearing entire cache
          cache.invalidateByDependency(user.id);
        }
      },
      onError: (error) => {
        console.error('❌ Messages subscription error:', error);
        setError('Messaging temporarily unavailable');
      }
    });

    const unsubscribeNotifications = realtimeManager.subscribe(notificationsChannelName, {
      event: '*',
      schema: 'public',
      table: 'notifications',
      onData: (payload) => {
        console.log('🔔 Notification event via manager:', payload);
        // Filter notifications for current user
        const notificationData = payload.new || payload.old;
        const isForUser = notificationData && typeof notificationData === 'object' && (notificationData as any).user_id === user.id;
        
        if (!isForUser) return;
        
        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new as any;
          const unifiedNotif = transformToUnifiedNotification(newNotification);
          
          setNotifications(current => {
            const exists = current.find(n => n.id === unifiedNotif.id);
            if (exists) return current;
            
            return [unifiedNotif, ...current].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
          
          setUnreadCounts(prev => {
            const newCount = prev.notifications + 1;
            setUnreadNotifications(newCount);
            return {
              ...prev,
              notifications: newCount,
              total: prev.messages + newCount
            };
          });
          
          // Targeted invalidation instead of clearing entire cache
          cache.invalidateByDependency(user.id);
        } else if (payload.eventType === 'UPDATE') {
          const updatedNotification = payload.new as any;
          const unifiedNotif = transformToUnifiedNotification(updatedNotification);
          
          setNotifications(current => current.map(n => n.id === unifiedNotif.id ? unifiedNotif : n));
          // Targeted invalidation instead of clearing entire cache
          cache.invalidateByDependency(user.id);
        }
      },
      onError: (error) => {
        console.error('❌ Notifications subscription error:', error);
        // Non-fatal, notifications still work without realtime
      }
    });

    // Cleanup - delegate to manager
    return () => {
      console.log('🧹 Cleaning up realtime via manager');
      unsubscribeMessages();
      unsubscribeNotifications();
      console.log('✅ Realtime cleanup complete');
    };
  }, [user?.id, isUserReady, fetchData, messageQueue, cache, setUnreadNotifications, transformToUnifiedMessage, transformToUnifiedNotification]);

  return {
    // Data
    messages,
    notifications, 
    unreadCounts,
    loading,
    error,

    // Actions
    fetchData,
    sendMessage,
    markAsRead,
    markAllAsRead: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      console.log('🔄 Mark all as read started for user:', user.id);
      
      // Get all unread messages for the current user
      const unreadMessages = messages.filter(m => !m.read_at && (
        (m.recipient_id === user.id && m.type === 'direct') || 
        (m.type === 'event' && m.event_id)
      ));
      
      const unreadMessageIds = unreadMessages.map(m => m.id);
      const unreadNotificationIds = notifications
        .filter(n => !n.read_at && n.user_id === user.id)
        .map(n => n.id);
      
      console.log(`📊 Marking ${unreadMessageIds.length} messages, ${unreadNotificationIds.length} notifications`);
      
      try {
        // Use batch function for messages if available
        if (unreadMessageIds.length > 0) {
          try {
            const { data, error } = await supabase.rpc('mark_messages_as_read_batch', {
              p_message_ids: unreadMessageIds,
              p_user_id: user.id
            });
            
            if (error) {
              console.warn('Batch function failed, falling back to individual:', error);
              await markAsRead(unreadMessageIds, 'messages');
            } else {
              console.log(`✅ Batch marked ${data?.[0]?.marked_count || 0} messages`);
              // Optimistic update
              setMessages(prev => prev.map(m => 
                unreadMessageIds.includes(m.id) 
                  ? { ...m, read_at: new Date().toISOString() }
                  : m
              ));
              setUnreadCounts(prev => ({ 
                ...prev, 
                messages: Math.max(0, prev.messages - unreadMessageIds.length),
                total: Math.max(0, prev.total - unreadMessageIds.length)
              }));
            }
          } catch (err) {
            console.error('Batch mark error:', err);
            await markAsRead(unreadMessageIds, 'messages');
          }
        }
        
        // Mark notifications
        if (unreadNotificationIds.length > 0) {
          await markAsRead(unreadNotificationIds, 'notifications');
        }
        
        // Invalidate cache and refresh
        cache.invalidateByDependency(`user-${user.id}`);
        await fetchData('both', { useCache: false });
        
        console.log('✅ Mark all as read completed');
      } catch (err) {
        console.error('Error in markAllAsRead:', err);
        throw err;
      }
    },

    // Utilities
    refreshCache: () => fetchData('both', { useCache: false }),
    clearCache: () => cache.clear(),
    
    // Filtering helpers
    getEventMessages: (eventId: string) => 
      messages.filter(m => m.event_id === eventId),
    getDirectMessages: () => 
      messages.filter(m => m.type === 'direct'),
    getUnreadMessages: () => 
      messages.filter(m => !m.read_at && (
        (m.recipient_id === user?.id && m.type === 'direct') || // Direct messages to user
        (m.type === 'event' && m.event_id) // Event messages where user can participate
      ))
  };
};