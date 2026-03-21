import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSafeMessaging as useMessaging } from '@/contexts/SafeMessagingContext';
import { TraditionalChatView } from '../messaging/TraditionalChatView';
import { ConversationList } from '../messaging/ConversationList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnifiedChatSectionProps {
  messageFilter?: 'all' | 'direct' | 'activities';
  currentUser?: any;
  selectedConversation?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
}

export const UnifiedChatSection: React.FC<UnifiedChatSectionProps> = ({ 
  messageFilter = 'all', 
  currentUser: propCurrentUser, 
  selectedConversation, 
  onConversationChange 
}) => {
  const [messageText, setMessageText] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(selectedConversation);
  const [authedUser, setAuthedUser] = useState<any>(propCurrentUser || null);

  // Ensure we have an authenticated user
  useEffect(() => {
    const init = async () => {
      if (!propCurrentUser) {
        const { data } = await supabase.auth.getUser();
        if (data?.user) setAuthedUser(data.user);
      } else {
        setAuthedUser(propCurrentUser);
      }
    };
    init();
  }, [propCurrentUser]);

  const currentUser = propCurrentUser || authedUser;

  // Helper functions converted to useCallback to fix initialization error
  const determineMessageType = useCallback((msg: any) => {
    if (!msg || !msg.content) return 'chat';
    if (msg.content.includes('Welcome')) return 'welcome';
    if (msg.content.includes('Reminder') || msg.content.includes('hours')) return 'reminder'; 
    if (msg.content.includes('Rating') || msg.content.includes('How was')) return 'post-activity';
    return 'chat';
  }, []);

  const generateMessageTitle = useCallback((msg: any) => {
    if (!msg) return 'New Message';
    if (msg.content?.includes('Welcome')) return 'Welcome Message';
    if (msg.content?.includes('24 hours')) return '24-Hour Reminder';
    if (msg.content?.includes('12 hours')) return '12-Hour Reminder';
    if (msg.content?.includes('2 hours')) return '2-Hour Final Reminder';
    if (msg.content?.includes('Rating')) return 'Rate Your Experience';
    return msg.sender?.name ? `Message from ${msg.sender.name}` : 'New Message';
  }, []);

  // Use unified messaging system
  const { 
    messages: unifiedMessages, 
    loading,
    fetchData,
    sendMessage,
    markAsRead
  } = useMessaging();

  // Transform messages to chat format
  const chatMessages = useMemo(() => {
    if (!unifiedMessages || !Array.isArray(unifiedMessages)) return [];
    
    return unifiedMessages.map(msg => {
      if (!msg) return null;
      
      return {
        id: msg.id,
        type: determineMessageType(msg) as 'welcome' | 'reminder' | 'chat' | 'post-activity',
        title: generateMessageTitle(msg),
        content: msg.content || '',
        sender: msg.sender ? {
          id: msg.sender_id,
          name: msg.sender.name,
          avatar_url: msg.sender.avatar_url
        } : undefined,
        timestamp: msg.created_at,
        isRead: !!msg.read_at,
        eventTitle: msg.event?.title,
        event_id: msg.event_id
      };
    }).filter(Boolean);
  }, [unifiedMessages, determineMessageType, generateMessageTitle]);

  // Filter messages based on current filter and conversation
  const filteredMessages = useMemo(() => {
    let filtered = chatMessages;

    // Filter by message type
    if (messageFilter === 'direct') {
      filtered = filtered.filter(msg => !msg.event_id);
    } else if (messageFilter === 'activities') {
      filtered = filtered.filter(msg => !!msg.event_id);
    }

    // Filter by selected conversation
    if (selectedChat) {
      if (selectedChat.startsWith('event_')) {
        const eventId = selectedChat.replace('event_', '');
        filtered = filtered.filter(msg => msg.event_id === eventId);
      } else {
        filtered = filtered.filter(msg => 
          !msg.event_id && 
          (msg.sender?.name === selectedChat)
        );
      }
    }

    return filtered;
  }, [chatMessages, messageFilter, selectedChat]);

  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    if (currentUser) {
      fetchData('both', { useCache: false });
    }
  }, [fetchData, currentUser, messageFilter, selectedChat]);

  // Handle selected conversation changes
  useEffect(() => {
    if (selectedConversation !== null) {
      setSelectedChat(selectedConversation);
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser?.id || !selectedChat) return;
    
    const tempMessageText = messageText;
    setMessageText('');
    
    try {
      if (selectedChat.startsWith('event_')) {
        const eventId = selectedChat.replace('event_', '');
        await sendMessage(tempMessageText, { 
          eventId,
          type: 'event' 
        });
      } else {
        await sendMessage(tempMessageText, { 
          recipientId: selectedChat,
          type: 'direct' 
        });
      }
      
      // Force refresh to ensure consistency across all users
      await fetchData('messages', { useCache: false });
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message text on error
      setMessageText(tempMessageText);
      toast.error('Failed to send message');
    }
  };

  const handleMessageClick = (message: any) => {
    // Mark as read if unread
    if (!message.isRead) {
      markAsRead(message.id, 'messages');
    }
    
    // Navigate to conversation if needed
    if (message.event_id && selectedChat !== `event_${message.event_id}`) {
      setSelectedChat(`event_${message.event_id}`);
      onConversationChange?.(`event_${message.event_id}`);
    } else if (!message.event_id && message.sender && selectedChat !== message.sender.id) {
      setSelectedChat(message.sender.id);
      onConversationChange?.(message.sender.id);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className={`
        ${selectedChat ? 'hidden lg:flex' : 'flex'} 
        flex-col w-full lg:w-80 border-r border-border/50 bg-muted/20
      `}>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Conversations
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {chatMessages.length} message{chatMessages.length !== 1 ? 's' : ''} total
          </p>
        </div>
        
        <ConversationList
          messages={unifiedMessages}
          selectedConversation={selectedChat}
          onConversationSelect={(conversationId) => {
            setSelectedChat(conversationId);
            onConversationChange?.(conversationId);
          }}
          onMarkAsRead={async (messageIds: string[]) => {
            try {
              await markAsRead(messageIds, 'messages');
            } catch (error) {
              console.error('Error marking conversation messages as read:', error);
            }
          }}
          className="flex-1"
          currentUserId={authedUser?.id}
          messageFilter={messageFilter}
        />
      </div>

      {/* Chat Area */}
      <div className={`
        ${selectedChat ? 'flex' : 'hidden lg:flex'} 
        flex-col flex-1 min-w-0
      `}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border/50 bg-background/50">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedChat(null);
                    onConversationChange?.(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to conversations</span>
                </Button>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {selectedChat.startsWith('event_') ? 'Activity Chat' : 'Direct Message'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0">
              <TraditionalChatView
                messages={filteredMessages}
                currentUserId={currentUser?.id}
                onMessageClick={handleMessageClick}
                selectedConversation={selectedChat}
                className="h-full"
              />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border/50 bg-background/50">
              <div className="flex gap-3">
                <Input
                  placeholder={`Send a ${selectedChat.startsWith('event_') ? 'group' : 'direct'} message...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Empty state when no conversation is selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 mx-auto">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Select a conversation
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};