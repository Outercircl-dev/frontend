import React, { useState } from 'react';
import { UserPlus, MessageSquare, CalendarCheck, CheckCircle, XCircle, Star, Clock, Trash2, Archive, MoreVertical, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EnhancedNotification } from '@/hooks/useEnhancedNotifications';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { useProfilePrivacy } from '@/hooks/useProfilePrivacy';
import { PostEventRatingModal } from '@/components/PostEventRatingModal';

interface EnhancedNotificationItemProps {
  notification: EnhancedNotification;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  currentUserId?: string;
}

const EnhancedNotificationItem: React.FC<EnhancedNotificationItemProps> = ({ 
  notification, 
  onMarkAsRead,
  onDelete,
  onArchive,
  currentUserId 
}) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const { handleNotificationClick } = useNotificationNavigation();
  const { respondToFriendRequest } = useProfilePrivacy(currentUserId);

  const getNotificationIcon = () => {
    switch (notification.notification_type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'event':
        return <CalendarCheck className="h-4 w-4 text-green-500" />;
      case 'event_reminder':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'rating_request':
        return <Star className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getNotificationPriority = () => {
    if (notification.notification_type === 'event_reminder' && notification.metadata?.reminder_type === '2h_final') {
      return 'high';
    }
    if (notification.notification_type === 'friend_request') {
      return 'medium';
    }
    return 'low';
  };

  const getPriorityBadge = () => {
    const priority = getNotificationPriority();
    if (priority === 'high') {
      return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
    }
    if (priority === 'medium') {
      return <Badge variant="secondary" className="text-xs">Action Required</Badge>;
    }
    return null;
  };

  const getContextualInfo = () => {
    const { metadata } = notification;
    
    if (notification.notification_type === 'event_reminder' && metadata?.has_preparation_tips) {
      return (
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          <AlertCircle className="h-3 w-3" />
          <span>Includes preparation tips and weather info</span>
        </div>
      );
    }
    
    if (notification.notification_type === 'event' && metadata?.event_id) {
      return (
        <div className="mt-2 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
          <MapPin className="h-3 w-3" />
          <span>Tap to view event details</span>
        </div>
      );
    }
    
    return null;
  };

  const handleClick = () => {
    if (!notification.read_at) {
      onMarkAsRead(notification.id);
    }
    handleNotificationClick(notification);
  };

  const handleFriendRequestResponse = async (action: 'accepted' | 'declined') => {
    if (notification.metadata?.friendship_id) {
      await respondToFriendRequest(notification.metadata.friendship_id, action);
      onMarkAsRead(notification.id);
    }
  };

  const showFriendRequestActions = () => {
    return notification.notification_type === 'friend_request' && 
           notification.title === 'New Friend Request' && 
           !notification.read_at;
  };

  const showRatingRequestActions = () => {
    return notification.notification_type === 'rating_request' && 
           !notification.read_at;
  };

  const handleRatingComplete = () => {
    onMarkAsRead(notification.id);
    setShowRatingModal(false);
  };

  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 transition-all duration-200 ${
        !notification.read_at 
          ? getNotificationPriority() === 'high'
            ? 'bg-red-50 border-l-red-400'
            : getNotificationPriority() === 'medium'
            ? 'bg-blue-50 border-l-blue-400' 
            : 'bg-blue-50 border-l-blue-200'
          : 'border-l-transparent'
      }`}
      onClick={!showFriendRequestActions() && !showRatingRequestActions() ? handleClick : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getNotificationIcon()}
            <h4 className="font-medium text-sm">{notification.title}</h4>
            {!notification.read_at && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
            {getPriorityBadge()}
          </div>
          
          {notification.content && (
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notification.content}</p>
          )}
          
          {getContextualInfo()}
          
          <p className="text-xs text-gray-400 mt-2">
            {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
          </p>
          
          {/* Friend Request Action Buttons */}
          {showFriendRequestActions() && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFriendRequestResponse('accepted');
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFriendRequestResponse('declined');
                }}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}

          {/* Rating Request Action Button */}
          {showRatingRequestActions() && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRatingModal(true);
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Star className="h-4 w-4 mr-1" />
                Rate Participants
              </Button>
            </div>
          )}
        </div>
        
        {/* Action Menu */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!notification.read_at && (
                <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={() => onArchive(notification.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(notification.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && notification.metadata?.event_id && (
        <PostEventRatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          eventId={notification.metadata.event_id}
          eventTitle={notification.metadata.event_title || 'Event'}
          onRatingComplete={handleRatingComplete}
        />
      )}
    </div>
  );
};

export default EnhancedNotificationItem;