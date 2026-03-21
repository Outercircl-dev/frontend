import React from 'react';
import { useSafeMessaging } from '@/contexts/SafeMessagingContext';
import { useAppContext } from '@/components/optimization/UltraMinimalProviders';
import { ThreadedMessageList } from './ThreadedMessageList';
import { MessageComposer } from './MessageComposer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Bell } from 'lucide-react';

/**
 * Complete messaging panel integrating all Phase 3 components
 * Drop-in replacement for legacy messaging UI
 */
export const MessagingPanel: React.FC = () => {
  const { user } = useAppContext();
  const { 
    messages, 
    notifications, 
    unreadCounts, 
    loading, 
    sendMessage,
    fetchData 
  } = useSafeMessaging();

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Please sign in to view messages
      </div>
    );
  }

  const handleSendMessage = async (content: string) => {
    await sendMessage(content, { type: 'direct' });
  };

  const handleLoadMore = () => {
    fetchData('messages', { useCache: false });
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="messages" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
            {unreadCounts.messages > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {unreadCounts.messages}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCounts.notifications > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {unreadCounts.notifications}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="flex-1 flex flex-col mt-0">
          <div className="flex-1 overflow-hidden">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <ThreadedMessageList
                messages={messages}
                currentUserId={user.id}
                onLoadMore={handleLoadMore}
                hasMore={false}
              />
            )}
          </div>
          <MessageComposer onSend={handleSendMessage} disabled={loading} />
        </TabsContent>

        <TabsContent value="notifications" className="flex-1 overflow-hidden mt-0">
          <div className="p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <h4 className="font-semibold text-sm">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{notification.content}</p>
                  <span className="text-xs text-muted-foreground mt-2 block">
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
