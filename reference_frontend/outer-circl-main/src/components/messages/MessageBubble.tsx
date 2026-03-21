import React from 'react';
import { UnifiedMessage } from '@/hooks/useUnifiedMessaging';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: UnifiedMessage;
  isOwnMessage: boolean;
}

/**
 * Pinterest-style message bubble with smooth animations
 * Phase 3: Beautiful, responsive message display
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage
}) => {
  const isRead = Boolean(message.read_at);

  return (
    <div
      className={cn(
        "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
          "transition-all duration-200 hover:shadow-md",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        )}
      >
        <p className="text-sm leading-relaxed break-words">
          {message.content}
        </p>
        
        <div className={cn(
          "flex items-center gap-1.5 mt-1",
          isOwnMessage ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-xs",
            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          
          {isOwnMessage && (
            <span className="text-primary-foreground/70">
              {isRead ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
