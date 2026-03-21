
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, MessageCircle, Search, X, ChevronUp, ChevronDown, Send, Trash2, MoreVertical, MessageSquareOff, Trash } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DrawerContent, Drawer, DrawerTrigger } from '@/components/ui/drawer';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
}

interface ChatConversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isEvent?: boolean;
}

const MessagesPopupBar: React.FC = () => {
  const [messageFilter, setMessageFilter] = useState<'all' | 'direct' | 'activities'>('all');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [displayedConversations, setDisplayedConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Empty arrays for real data to be populated later
  const directConversations: ChatConversation[] = [];
  const eventDiscussions: ChatConversation[] = [];
  const chatMessages: Record<string, ChatMessage[]> = {};
  
  // Update displayed conversations based on filters
  useEffect(() => {
    let conversations: ChatConversation[] = [];
    
    if (messageFilter === 'all') {
      conversations = [...directConversations, ...eventDiscussions].sort((a, b) => {
        return a.timestamp < b.timestamp ? 1 : -1;
      });
    } else if (messageFilter === 'direct') {
      conversations = directConversations;
    } else if (messageFilter === 'activities') {
      conversations = eventDiscussions;
    }
    
    // Apply search filter if needed
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      conversations = conversations.filter(
        convo => convo.name.toLowerCase().includes(query) || 
                convo.lastMessage.toLowerCase().includes(query)
      );
    }
    
    setDisplayedConversations(conversations);
  }, [messageFilter, searchQuery]);
  
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;
    
    // In a real app, this would send the message to an API
    console.log('Sending message:', messageText, 'to chat:', selectedChat);
    setMessageText('');
  };

  const handleDeleteMessage = async (messageId: string, currentUserId?: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', currentUserId);

      if (error) {
        console.error('Error deleting message:', error);
        return;
      }

      // Note: In a real implementation, you'd want to update the local state
      // or refetch messages to reflect the deletion
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };
  
  const handleViewAllMessages = () => {
    navigate('/messages');
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Find the current conversation details  
  const currentConversation = [...directConversations, ...eventDiscussions].find(c => c.id === selectedChat);
  
  // Count total unread messages
  const totalUnread = [...directConversations, ...eventDiscussions].reduce(
    (sum, convo) => sum + convo.unread, 0
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const MessagePopupContent = () => (
    <div className={`h-[500px] flex flex-col bg-white ${isMobile ? 'rounded-t-lg' : 'rounded-lg shadow-xl border border-gray-200'}`}>
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="font-medium text-sm">Messages</h3>
          {selectedChat && (
            <>
              <span className="mx-2 text-gray-300">•</span>
              <span className="text-sm">{currentConversation?.name}</span>
            </>
          )}
        </div>
        {selectedChat && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setSelectedChat(null)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Back to messages</span>
          </Button>
        )}
      </div>
      
      {!selectedChat ? (
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-gray-100">
            <Tabs
              value={messageFilter}
              onValueChange={(val) => setMessageFilter(val as 'all' | 'direct' | 'activities')}
              className="w-full"
            >
              <TabsList className="w-full bg-gray-50">
                <TabsTrigger
                  value="all"
                  className="flex-1 data-[state=active]:bg-white"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="direct"
                  className="flex-1 data-[state=active]:bg-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chats
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="flex-1 data-[state=active]:bg-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Activities
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search conversations"
                className="pl-10 bg-gray-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {displayedConversations.length > 0 ? (
              displayedConversations.map(convo => (
                <div
                  key={convo.id}
                  className="p-3 flex items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedChat(convo.id)}
                >
                  {convo.isEvent ? (
                    <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
                      <img src={convo.avatar} alt={convo.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={convo.avatar} />
                      <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-sm truncate">{convo.name}</p>
                        {convo.isEvent && (
                          <span className="bg-gray-100 text-xs px-1.5 py-0.5 rounded-full">Activity</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{convo.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{convo.lastMessage}</p>
                  </div>
                  {convo.unread > 0 && (
                    <span className="ml-2 bg-[#E60023] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {convo.unread}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-500">Start chatting with activity participants!</p>
              </div>
            )}
          </div>
          
          <div className="p-3 mt-auto border-t border-gray-100">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleViewAllMessages}
            >
              View all messages
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
            {chatMessages[selectedChat]?.map((message) => (
              <div 
                key={message.id} 
                className={`mb-3 flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                {!message.isCurrentUser ? (
                  <Avatar className="h-8 w-8 mr-2 flex-shrink-0 mt-1">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8 ml-2 flex-shrink-0 mt-1 order-2">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[70%] ${message.isCurrentUser 
                  ? 'bg-[#E60023] text-white order-1 group relative' 
                  : 'bg-white border border-gray-200'} px-3 py-2 rounded-lg shadow-sm`}>
                  {!message.isCurrentUser && currentConversation?.isEvent && (
                    <p className="text-xs font-medium mb-1">{message.senderName}</p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs text-right mt-1 ${message.isCurrentUser ? 'text-white/70' : 'text-gray-400'}`}>
                    {message.timestamp}
                  </p>
                  {/* Delete button for current user's messages */}
                  {message.isCurrentUser && (
                    <button
                      onClick={() => handleDeleteMessage(message.id, message.senderId)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      title="Delete message"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-gray-100">
            <div className="flex">
              <Input 
                type="text" 
                placeholder="Type a message..." 
                className="flex-1"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button 
                className="ml-2 bg-[#E60023] hover:bg-[#D50C22]"
                size="icon"
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Mobile version uses a drawer from bottom
  if (isMobile) {
    return (
      <>
        <Drawer>
          <DrawerTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="fixed bottom-20 right-5 rounded-full h-14 w-14 bg-[#E60023] hover:bg-[#D50C22] text-white border-0 shadow-lg z-40"
            >
              <MessageSquare className="h-6 w-6" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-[#E60023] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-[#E60023]">
                  {totalUnread}
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh]">
            <MessagePopupContent />
          </DrawerContent>
        </Drawer>
      </>
    );
  }
  
  // Desktop version uses a popup button and sheet
  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            className="fixed bottom-5 right-5 rounded-full px-4 bg-[#E60023] hover:bg-[#D50C22] text-white border-0 shadow-lg z-40"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 bg-white text-[#E60023] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0">
          <MessagePopupContent />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MessagesPopupBar;
