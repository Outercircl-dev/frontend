import React, { useMemo } from 'react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Message {
  id: string;
  type: 'welcome' | 'reminder' | 'chat' | 'post-activity';
  title: string;
  content: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  timestamp: string;
  isRead?: boolean;
  eventTitle?: string;
  event_id?: string;
}

interface TraditionalChatViewProps {
  messages: Message[];
  currentUserId?: string;
  onMessageClick?: (message: Message) => void;
  className?: string;
  selectedConversation?: string | null;
}

export const TraditionalChatView: React.FC<TraditionalChatViewProps> = ({
  messages,
  currentUserId,
  onMessageClick,
  className = '',
  selectedConversation
}) => {
  const organizedMessages = useMemo(() => {
    if (!messages.length) return [];
    
    // Sort messages by timestamp (oldest first for chat view)
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Group messages by date
    const grouped = sortedMessages.reduce((acc, message) => {
      const dateKey = new Date(message.timestamp).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(message);
      return acc;
    }, {} as Record<string, Message[]>);
    
    return Object.entries(grouped);
  }, [messages]);

  const isOwnMessage = (message: Message) => {
    return message.sender?.id === currentUserId;
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center h-full">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-2xl">💬</span>
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No messages yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {selectedConversation 
            ? "Start a conversation by sending a message below"
            : "Select a conversation or start a new one to see your messages"
          }
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="p-4 space-y-4">
        {organizedMessages.map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2">
                <Separator className="flex-1 max-w-20" />
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-full">
                  {new Date(dateKey).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: new Date(dateKey).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  })}
                </span>
                <Separator className="flex-1 max-w-20" />
              </div>
            </div>
            
            {/* Messages for this date */}
            <div className="space-y-1">
              {dayMessages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  id={message.id}
                  type={message.type}
                  content={message.content}
                  sender={message.sender}
                  timestamp={message.timestamp}
                  isRead={message.isRead}
                  eventTitle={message.eventTitle}
                  isOwn={isOwnMessage(message)}
                  onClick={() => onMessageClick?.(message)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};