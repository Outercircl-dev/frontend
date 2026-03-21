
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface FriendRequest {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface FriendRequestCardProps {
  request: FriendRequest;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  onApprove,
  onDecline,
}) => {
  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={request.avatarUrl} />
          <AvatarFallback className="bg-brand-purple/20 text-brand-purple text-xs">
            {request.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{request.name}</p>
          <p className="text-xs text-muted-foreground">@{request.username}</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button 
          size="icon" 
          variant="outline"
          className="h-7 w-7 rounded-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
          onClick={() => onApprove(request.id)}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button 
          size="icon" 
          variant="outline"
          className="h-7 w-7 rounded-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          onClick={() => onDecline(request.id)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default FriendRequestCard;
