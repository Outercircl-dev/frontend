
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users } from 'lucide-react';

interface UserActionsProps {
  isFriend: boolean;
  isPendingFriend: boolean;
  onAddFriend: () => void;
  onMessage: () => void;
}

const UserActions: React.FC<UserActionsProps> = ({ 
  isFriend, 
  isPendingFriend, 
  onAddFriend, 
  onMessage 
}) => {
  return (
    <div className="flex justify-center gap-4 p-6 pt-0">
      {isFriend ? (
        <Button variant="outline" onClick={onMessage} className="flex-1">
          <MessageCircle className="mr-2 h-4 w-4" />
          Message
        </Button>
      ) : (
        <Button 
          onClick={onAddFriend} 
          disabled={isPendingFriend}
          className={`flex-1 ${!isPendingFriend ? 'bg-brand-purple hover:bg-brand-light-purple' : ''}`}
        >
          <Users className="mr-2 h-4 w-4" />
          {isPendingFriend ? 'Request Sent' : 'Add Friend'}
        </Button>
      )}
    </div>
  );
};

export default UserActions;
