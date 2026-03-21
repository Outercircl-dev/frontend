import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Phone, Video, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ConversationHeaderProps {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  unreadCount?: number;
  onArchive?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
}

/**
 * Pinterest-style conversation header with actions
 * Phase 3: Rich header with status indicators
 */
export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  name,
  avatar,
  isOnline = false,
  unreadCount = 0,
  onArchive,
  onBlock,
  onReport
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="relative">
        <Avatar className="h-10 w-10 ring-2 ring-background">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {name[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-background" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground">{name}</h2>
          {unreadCount > 0 && (
            <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isOnline ? 'Active now' : 'Offline'}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Info className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onArchive && (
              <DropdownMenuItem onClick={onArchive}>
                Archive Conversation
              </DropdownMenuItem>
            )}
            {onBlock && (
              <DropdownMenuItem onClick={onBlock} className="text-destructive">
                Block User
              </DropdownMenuItem>
            )}
            {onReport && (
              <DropdownMenuItem onClick={onReport} className="text-destructive">
                Report User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
