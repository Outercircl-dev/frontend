import React from 'react';
import { MessageSquare, Clock, CheckCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageCardProps {
  id: string;
  type: 'welcome' | 'reminder' | 'chat' | 'post-activity';
  title: string;
  content: string;
  sender?: {
    name: string;
    avatar_url?: string;
  };
  timestamp: string;
  isRead?: boolean;
  eventTitle?: string;
  onClick?: () => void;
}

const getTypeConfig = (type: MessageCardProps['type']) => {
  switch (type) {
    case 'welcome':
      return {
        icon: Users,
        color: 'bg-gradient-to-br from-primary/20 to-primary-glow/10',
        badge: 'Welcome',
        badgeVariant: 'default' as const
      };
    case 'reminder':
      return {
        icon: Clock,
        color: 'bg-gradient-to-br from-accent/20 to-secondary/10',
        badge: 'Reminder',
        badgeVariant: 'secondary' as const
      };
    case 'chat':
      return {
        icon: MessageSquare,
        color: 'bg-gradient-to-br from-muted/50 to-background',
        badge: 'Message',
        badgeVariant: 'outline' as const
      };
    case 'post-activity':
      return {
        icon: CheckCircle,
        color: 'bg-gradient-to-br from-success/20 to-success-glow/10',
        badge: 'Follow-up',
        badgeVariant: 'destructive' as const
      };
  }
};

export const PinterestMessageCard: React.FC<MessageCardProps> = ({
  id,
  type,
  title,
  content,
  sender,
  timestamp,
  isRead = false,
  eventTitle,
  onClick
}) => {
  const config = getTypeConfig(type);
  const Icon = config.icon;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card 
      className={`
        group cursor-pointer transition-all duration-300 hover:scale-[1.02] 
        hover:shadow-elegant border-border/50 overflow-hidden
        ${config.color}
        ${!isRead ? 'ring-2 ring-primary/20' : ''}
      `}
      onClick={onClick}
    >
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/80 backdrop-blur-sm">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.badge}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTime(timestamp)}
          </span>
        </div>
        
        {eventTitle && (
          <div className="text-xs text-muted-foreground font-medium">
            📅 {eventTitle}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h4>
        
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {content.length > 150 ? `${content.slice(0, 150)}...` : content}
        </p>

        {sender && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Avatar className="h-6 w-6">
              <AvatarImage src={sender.avatar_url} />
              <AvatarFallback className="text-xs">
                {sender.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {sender.name}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};