import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useUnifiedMessaging } from '@/hooks/useUnifiedMessaging';
import { useAppContext } from '@/components/optimization/UltraMinimalProviders';
import type { UnifiedMessage, UnifiedNotification } from '@/hooks/useUnifiedMessaging';

interface MessagingContextType {
  messages: UnifiedMessage[];
  notifications: UnifiedNotification[];
  unreadCounts: {
    messages: number;
    notifications: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, options: {
    recipientId?: string;
    eventId?: string;
    type?: 'direct' | 'event' | 'welcome' | 'reminder';
    metadata?: any;
  }) => Promise<{ success: boolean; messageId: string }>;
  markAsRead: (id: string | string[], type: 'message' | 'notification' | 'messages' | 'notifications') => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchData: (type?: 'messages' | 'notifications' | 'both', options?: { useCache?: boolean }) => Promise<void>;
  refreshCache: () => Promise<void>;
  clearCache: () => void;
  getEventMessages: (eventId: string) => UnifiedMessage[];
  getDirectMessages: () => UnifiedMessage[];
  getUnreadMessages: () => UnifiedMessage[];
}

const MessagingContext = createContext<MessagingContextType | null>(null);

interface SafeMessagingProviderProps {
  children: ReactNode;
  defer?: boolean; // Phase 3: Defer initialization
  deferMs?: number; // Phase 3: Delay in milliseconds
}

/**
 * CRITICAL: Non-blocking messaging provider for Pinterest-style architecture
 * Always renders children immediately, loads messaging in background
 */
const defaultMessagingValue: MessagingContextType = {
  messages: [],
  notifications: [],
  unreadCounts: { messages: 0, notifications: 0, total: 0 },
  loading: true,
  error: null,
  sendMessage: async () => ({ success: false, messageId: '' }),
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  fetchData: async () => {},
  refreshCache: async () => {},
  clearCache: () => {},
  getEventMessages: () => [],
  getDirectMessages: () => [],
  getUnreadMessages: () => [],
};

export const SafeMessagingProvider: React.FC<SafeMessagingProviderProps> = ({ 
  children, 
  defer = false, 
  deferMs = 2000 
}) => {
  const [isDeferred, setIsDeferred] = useState(defer);
  
  const appContext = useAppContext();
  const { user } = appContext;
  
  // Phase 3: Deferred initialization for faster TTI
  useEffect(() => {
    if (defer && user) {
      console.log(`⏱️ PHASE 3: Deferring messaging initialization for ${deferMs}ms`);
      const timer = setTimeout(() => {
        console.log('✅ PHASE 3: Activating messaging provider');
        setIsDeferred(false);
      }, deferMs);
      
      return () => clearTimeout(timer);
    }
  }, [defer, deferMs, user]);
  
  // CRITICAL: Always render children immediately - no blocking
  if (!user || isDeferred) {
    return (
      <MessagingContext.Provider value={defaultMessagingValue}>
        {children}
      </MessagingContext.Provider>
    );
  }
  
  // User available and not deferred - render with messaging
  return <AuthenticatedMessagingProvider userId={user.id}>{children}</AuthenticatedMessagingProvider>;
};

/**
 * Inner provider with error boundary to prevent messaging failures from breaking app
 */
const AuthenticatedMessagingProvider: React.FC<{ userId: string; children: ReactNode }> = ({ 
  userId, 
  children 
}) => {
  // Phase 8: Removed defensive React hooks check - AppBootstrap guarantees React is ready
  // This check was reactive (happened after crash), not preventive
  
  try {
    const messagingData = useUnifiedMessaging();
    
    // Only log on state changes, not every render
    useEffect(() => {
      console.log('📨 Messaging state:', {
        messagesCount: messagingData.messages.length,
        notificationsCount: messagingData.notifications.length,
        loading: messagingData.loading
      });
    }, [messagingData.messages.length, messagingData.notifications.length, messagingData.loading]);
    
    return (
      <MessagingContext.Provider value={messagingData}>
        {children}
      </MessagingContext.Provider>
    );
  } catch (error) {
    console.error('❌ Messaging initialization failed, using fallback:', error);
    // Graceful degradation - render children with default values
    return (
      <MessagingContext.Provider value={defaultMessagingValue}>
        {children}
      </MessagingContext.Provider>
    );
  }
};

export const useSafeMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (!context) {
    console.warn('useMessaging called outside provider context, using safe defaults');
    return {
      messages: [],
      notifications: [],
      unreadCounts: { messages: 0, notifications: 0, total: 0 },
      loading: false,
      error: null,
      sendMessage: async () => ({ success: false, messageId: '' }),
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      fetchData: async () => {},
      refreshCache: async () => {},
      clearCache: () => {},
      getEventMessages: () => [],
      getDirectMessages: () => [],
      getUnreadMessages: () => [],
    };
  }
  return context;
};
