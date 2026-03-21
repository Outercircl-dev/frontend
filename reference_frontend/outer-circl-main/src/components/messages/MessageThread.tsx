import React from 'react';
import { UnifiedMessage } from '@/hooks/useUnifiedMessaging';
import { MessageBubble } from './MessageBubble';
import { ConversationHeader } from './ConversationHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  thread: {
    id: string;
    messages: UnifiedMessage[];
    lastMessage: UnifiedMessage;
    unreadCount: number;
  };
  currentUserId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Pinterest-style message thread with collapsible sections
 * Phase 3: Visual grouping and smart badges
 */
export const MessageThread: React.FC<MessageThreadProps> = ({
  thread,
  currentUserId,
  isExpanded,
  onToggle
}) => {
  const { messages, lastMessage, unreadCount } = thread;
  const displayMessages = isExpanded ? messages : [lastMessage];
  
  // Get conversation partner info
  const partner = lastMessage.sender_id === currentUserId 
    ? { id: lastMessage.recipient_id, name: 'User', avatar: undefined }
    : { id: lastMessage.sender_id, name: lastMessage.sender?.name || 'User', avatar: lastMessage.sender?.avatar_url };

  return (
    <div className={cn(
      "mb-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm",
      "transition-all duration-300 hover:shadow-lg hover:border-primary/20",
      unreadCount > 0 && "border-primary/40 bg-primary/5"
    )}>
      {/* Thread Header - Pinterest style */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-t-xl"
      >
        <Avatar className="h-10 w-10 ring-2 ring-background">
          <AvatarImage src={partner.avatar} alt={partner.name || 'User'} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {(partner.name || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {partner.name || 'Unknown User'}
            </h3>
            {unreadCount > 0 && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage.content}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(lastMessage.created_at).toLocaleDateString()}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Thread Messages - Collapsible */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3 border-t border-border">
          {displayMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.sender_id === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
