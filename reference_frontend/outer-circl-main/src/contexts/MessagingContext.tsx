import React, { createContext, useContext, ReactNode } from 'react';
import { useUnifiedMessaging } from '@/hooks/useUnifiedMessaging';
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

interface MessagingProviderProps {
  children: ReactNode;
}

export const MessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const messagingData = useUnifiedMessaging();

  return (
    <MessagingContext.Provider value={messagingData}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};