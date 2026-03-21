import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronDown, ChevronUp, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import PostEventChatMessage from './PostEventChatMessage';
import { useMembership } from '@/components/OptimizedProviders';

interface ChatBarProps {
  onClose: () => void;
}

const ChatBar: React.FC<ChatBarProps> = ({ onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const { updateReliabilityStars } = useMembership();

  // Mock friends data
  const friends = [
    { id: '1', name: 'Emma Wilson', username: 'emmaw', avatarUrl: 'https://randomuser.me/api/portraits/women/12.jpg', isOnline: true, lastMessage: 'Hey, are you attending the event tomorrow?' },
    { id: '2', name: 'David Lee', username: 'davidl', avatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg', isOnline: false, lastMessage: 'Thanks for the invite!' },
    { id: '3', name: 'Sophie Miller', username: 'sophiem', avatarUrl: 'https://randomuser.me/api/portraits/women/32.jpg', isOnline: true, lastMessage: 'Did you see the new place that opened up?' },
  ];

  // Mock messages data
  const messages = [
    { id: '1', senderId: '1', text: 'Hey, are you attending the event tomorrow?', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: '2', senderId: 'current-user', text: 'Yes, I\'m planning to! Are you?', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
    { id: '3', senderId: '1', text: "Definitely! I heard it's going to be amazing.", timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
    { id: '4', senderId: 'current-user', text: 'Great! Let\'s meet there then.', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  ];

  // Mock completed event for rating
  const completedEvent = {
    id: 'event-1',
    title: 'Community Art Workshop',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
    imageUrl: '/placeholder.svg',
  };

  // Mock attendees for the event
  const eventAttendees = [
    { id: 'attendee-1', name: 'John Smith', avatarUrl: 'https://randomuser.me/api/portraits/men/34.jpg' },
    { id: 'attendee-2', name: 'Maya Rodriguez', avatarUrl: 'https://randomuser.me/api/portraits/women/41.jpg' },
    { id: 'attendee-3', name: 'Alex Johnson', avatarUrl: 'https://randomuser.me/api/portraits/men/59.jpg' },
    { id: 'attendee-4', name: 'Sarah Chen', avatarUrl: 'https://randomuser.me/api/portraits/women/62.jpg' },
    { id: 'attendee-5', name: 'Tom Wilson', avatarUrl: 'https://randomuser.me/api/portraits/men/76.jpg' },
  ];

  // Mock whether the event needs rating
  const [showPostEventMessage, setShowPostEventMessage] = useState(true);
  const [hasRatedEvent, setHasRatedEvent] = useState(false);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    // In a real app, this would send the message to the backend
    toast.success('Message sent!');
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const selectChat = (friendId: string) => {
    setSelectedChat(friendId);
    setIsCollapsed(false);
  };

  const handleRatingComplete = (eventId: string) => {
    // Calculate average rating to update current user's reliability stars (in a real app this would come from the server)
    // This is just a simulation for demo purposes
    const averageRating = 4.2; // Mock average rating
    
    // Update the user's reliability stars
    updateReliabilityStars(averageRating);
    
    setHasRatedEvent(true);
    setShowPostEventMessage(false);
  };

  // Find the current chat friend
  const currentFriend = friends.find(f => f.id === selectedChat);

  return (
    <div className={`fixed right-8 bg-card border shadow-lg rounded-t-lg w-[350px] z-50 transition-all duration-300 ${isCollapsed ? 'h-12' : 'h-[450px]'} ${window.innerWidth <= 768 ? 'bottom-20' : 'bottom-0'}`}>
      <div className="p-3 border-b flex items-center justify-between cursor-pointer" onClick={toggleCollapse}>
        <div className="flex items-center">
          <h3 className="font-medium">Chat</h3>
          {selectedChat && (
            <div className="flex items-center ml-2">
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-sm">{currentFriend?.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center">
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4 mr-1" />
          ) : (
            <ChevronDown className="h-4 w-4 mr-1" />
          )}
          <X className="h-4 w-4 ml-2 hover:text-destructive" onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} />
        </div>
      </div>

      {!isCollapsed && (
        <>
          {!selectedChat ? (
            <div className="h-full flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search friends..."
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Post-event rating message */}
              {showPostEventMessage && !hasRatedEvent && (
                <div className="px-3">
                  <PostEventChatMessage
                    event={completedEvent}
                    attendees={eventAttendees}
                    hostName="Event Host"
                    hostAvatar="https://randomuser.me/api/portraits/women/68.jpg"
                    onRatingComplete={handleRatingComplete}
                  />
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto">
                {friends.map(friend => (
                  <div 
                    key={friend.id} 
                    className="flex items-center px-3 py-2 hover:bg-muted/50 cursor-pointer"
                    onClick={() => selectChat(friend.id)}
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback className="bg-brand-purple/20 text-brand-purple">
                          {friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {friend.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"></span>
                      )}
                    </div>
                    <div className="ml-3 overflow-hidden flex-1">
                      <div className="flex justify-between items-baseline">
                        <p className="font-medium text-sm truncate">{friend.name}</p>
                        <p className="text-xs text-muted-foreground">Now</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{friend.lastMessage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-3">
                {messages.map(message => {
                  const isSelf = message.senderId === 'current-user';
                  return (
                    <div key={message.id} className={`flex mb-3 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      {!isSelf && (
                        <Avatar className="h-8 w-8 mr-2 mt-1">
                          <AvatarImage src={currentFriend?.avatarUrl} />
                          <AvatarFallback className="bg-brand-purple/20 text-brand-purple text-xs">
                            {currentFriend?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] ${isSelf ? 'bg-brand-purple text-white' : 'bg-muted'} rounded-lg px-3 py-2`}>
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs text-right mt-1 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t">
                <div className="flex">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                  />
                  <Button 
                    size="icon" 
                    className="ml-2 bg-brand-purple hover:bg-brand-light-purple"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChatBar;
