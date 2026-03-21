import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Users, Calendar } from 'lucide-react';
import type { UnifiedMessage } from '@/hooks/useUnifiedMessaging';

interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'event';
  avatar?: string;
  lastMessage?: UnifiedMessage;
  unreadCount: number;
  eventTitle?: string;
}

interface ConversationListProps {
  messages: UnifiedMessage[];
  selectedConversation?: string | null;
  onConversationSelect: (conversationId: string) => void;
  onMarkAsRead?: (messageIds: string[]) => Promise<void>;
  className?: string;
  currentUserId?: string;
  messageFilter?: 'all' | 'direct' | 'activities';
}

export const ConversationList: React.FC<ConversationListProps> = ({
  messages,
  selectedConversation,
  onConversationSelect,
  onMarkAsRead,
  className = '',
  currentUserId,
  messageFilter = 'all'
}) => {
  const conversations = useMemo(() => {
    const convMap = new Map<string, Conversation>();
    
    // Filter messages by messageFilter first
    const filteredMessages = messages.filter(message => {
      if (messageFilter === 'direct') {
        return !message.event_id;
      } else if (messageFilter === 'activities') {
        return !!message.event_id;
      }
      return true; // 'all' - no filtering
    });
    
    filteredMessages.forEach(message => {
      let conversationId: string;
      let conversationName: string;
      let conversationType: 'direct' | 'event';
      let avatar: string | undefined;
      let eventTitle: string | undefined;
      
      if (message.event_id) {
        // Event-based conversation
        conversationId = `event_${message.event_id}`;
        conversationName = message.event?.title || 'Event Chat';
        conversationType = 'event';
        eventTitle = message.event?.title;
      } else if (message.sender) {
        // Direct conversation - determine conversation partner
        if (message.sender_id === currentUserId) {
          // I sent this message, conversation partner is the recipient
          // For now, use sender info as we don't have recipient details joined
          conversationId = message.recipient_id || `unknown_${message.id}`;
          conversationName = 'Direct Message'; // We'd need to fetch recipient info
          avatar = undefined;
        } else {
          // I received this message, conversation partner is the sender  
          conversationId = message.sender_id;
          conversationName = message.sender.name;
          avatar = message.sender.avatar_url;
        }
        conversationType = 'direct';
      } else {
        // System message
        conversationId = 'system';
        conversationName = 'System Messages';
        conversationType = 'direct';
      }
      
      if (!convMap.has(conversationId)) {
        convMap.set(conversationId, {
          id: conversationId,
          name: conversationName,
          type: conversationType,
          avatar,
          eventTitle,
          lastMessage: message,
          unreadCount: 0
        });
      }
      
      const conv = convMap.get(conversationId)!;
      
      // Update last message if this one is newer
      if (!conv.lastMessage || new Date(message.created_at) > new Date(conv.lastMessage.created_at)) {
        conv.lastMessage = message;
      }
      
      // Count unread messages
      if (!message.read_at) {
        conv.unreadCount++;
      }
    });
    
    // Convert to array and sort by last message timestamp
    return Array.from(convMap.values()).sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [messages, currentUserId, messageFilter]);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No conversations yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your conversations will appear here once you receive messages
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="p-2 space-y-1">
        {conversations.map((conversation) => {
          const isSelected = selectedConversation === conversation.id;
          
          return (
            <div
              key={conversation.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                hover:bg-muted/50 
                ${isSelected ? 'bg-primary/10 border border-primary/20' : ''}
              `}
              onClick={async () => {
                // Mark all unread messages in this conversation as read
                if (onMarkAsRead && conversation.unreadCount > 0) {
                  const conversationMessages = messages.filter(message => {
                    if (conversation.type === 'event') {
                      return message.event_id === conversation.id.replace('event_', '');
                    } else {
                      return message.sender_id === conversation.id || message.recipient_id === conversation.id;
                    }
                  });
                  
                  const unreadMessageIds = conversationMessages
                    .filter(msg => !msg.read_at)
                    .map(msg => msg.id);
                  
                  if (unreadMessageIds.length > 0) {
                    try {
                      await onMarkAsRead(unreadMessageIds);
                    } catch (error) {
                      console.error('Error marking messages as read:', error);
                    }
                  }
                }
                
                onConversationSelect(conversation.id);
              }}
            >
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-10 w-10">
                  {conversation.type === 'event' ? (
                    <AvatarFallback className="bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={conversation.avatar} />
                      <AvatarFallback>
                        {conversation.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                
                {conversation.type === 'event' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Users className="h-2 w-2 text-primary-foreground" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {conversation.name}
                  </h4>
                  {conversation.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                {conversation.eventTitle && conversation.type === 'event' && (
                  <p className="text-xs text-primary mb-1">📅 {conversation.eventTitle}</p>
                )}
                
                {conversation.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage.content.length > 50 
                      ? `${conversation.lastMessage.content.slice(0, 50)}...` 
                      : conversation.lastMessage.content
                    }
                  </p>
                )}
              </div>
              
              {/* Unread badge */}
              {conversation.unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};