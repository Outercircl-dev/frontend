import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReminderMessage from './ReminderMessage';

interface MessageItemProps {
  message: {
    content: string;
    created_at: string;
    message_type?: string;
    sender_id?: string;
    user: {
      name: string;
      avatar: string;
    };
  };
  hostId?: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, hostId }) => {
  // Check if this is a system reminder message
  const isReminder = 
    message.message_type === 'event' && 
    message.sender_id === hostId &&
    (message.content.toLowerCase().includes('reminder') ||
     message.content.toLowerCase().includes('starting') ||
     message.content.toLowerCase().includes('tomorrow'));

  // Render system reminder with special styling
  if (isReminder) {
    return <ReminderMessage message={message} />;
  }

  // Render regular user message with Pinterest-style card
  return (
    <div className="flex gap-3 mb-4 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
        <AvatarImage src={message.user.avatar} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {message.user.name?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{message.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
};

export default MessageItem;
