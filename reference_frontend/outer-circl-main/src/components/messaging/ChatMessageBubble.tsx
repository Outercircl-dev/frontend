import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, MessageSquare, Users } from 'lucide-react';

interface ChatMessageBubbleProps {
  id: string;
  type: 'welcome' | 'reminder' | 'chat' | 'post-activity';
  content: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  timestamp: string;
  isRead?: boolean;
  eventTitle?: string;
  isOwn?: boolean;
  onClick?: () => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  content,
  sender,
  timestamp,
  isRead = false,
  eventTitle,
  isOwn = false,
  type,
  onClick
}) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'welcome': return <Users className="h-3 w-3" />;
      case 'reminder': return <Clock className="h-3 w-3" />;
      case 'post-activity': return <CheckCircle2 className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'welcome': return 'text-blue-500';
      case 'reminder': return 'text-amber-500';
      case 'post-activity': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div 
      className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {!isOwn && sender && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={sender.avatar_url} />
          <AvatarFallback className="text-xs">
            {sender.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && sender && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">
              {sender.name}
            </span>
            <div className={`${getTypeColor()}`}>
              {getTypeIcon()}
            </div>
          </div>
        )}
        
        {eventTitle && (
          <Badge variant="secondary" className="mb-2 text-xs">
            📅 {eventTitle}
          </Badge>
        )}
        
        <div 
          className={`
            px-4 py-2 rounded-2xl shadow-sm relative
            ${isOwn 
              ? 'bg-primary text-primary-foreground rounded-br-md' 
              : 'bg-muted text-foreground rounded-bl-md'
            }
            ${!isRead && !isOwn ? 'ring-2 ring-primary/20' : ''}
          `}
        >
          <p className="text-sm leading-relaxed break-words">
            {content}
          </p>
        </div>
        
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
          </span>
          {isOwn && (
            <div className={`${isRead ? 'text-primary' : 'text-muted-foreground'}`}>
              <CheckCircle2 className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};