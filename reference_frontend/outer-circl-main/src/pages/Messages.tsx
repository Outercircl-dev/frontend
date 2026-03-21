
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import UnifiedSEO from '@/components/UnifiedSEO';
import Navbar from '@/components/Navbar';
import { PinterestMessagingView } from '@/components/messages/PinterestMessagingView';
import { MessagingViewSkeleton } from '@/components/ui/PinterestSkeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MessageSquare, MessageCircle, TestTube, Shield, CheckCheck } from 'lucide-react';
import MessageSearchModal from '@/components/profile/MessageSearchModal';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSafeMessaging as useMessaging } from '@/contexts/SafeMessagingContext';

import { useUserRole } from '@/hooks/useUserRole';
import { isDeveloperMode } from '@/utils/developerMode';

const Messages: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'direct' | 'activities'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  
  const { isAdmin } = useUserRole();
  const { unreadCounts, markAllAsRead, fetchData } = useMessaging();

  // Authentication check with memoization
  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user);
      setCurrentUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, [checkAuth]);

  // Handle conversation parameter from notifications
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    const recipient = searchParams.get('recipient');
    if (conversationId) {
      setSelectedConversation(conversationId);
    } else if (recipient) {
      setSelectedConversation(recipient);
    }
  }, [searchParams]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleStartConversation = useCallback((userId: string) => {
    setSelectedConversation(userId);
    setIsMessageModalOpen(false);
  }, []);

  const handleSendTestMessage = useCallback(async () => {
    console.log('Test message button clicked');
    setTesting(true);
    try {
      console.log('Calling send-test-pre-activity-message function...');
      const { data, error } = await supabase.functions.invoke('send-test-pre-activity-message', {
        body: {} // Will auto-find an event you're attending
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      console.log('Success response data:', data);
      
      toast.success(
        `Test message sent to ${data.messages_sent || data.participants_count || 0} participants for "${data.event?.title || 'Unknown Event'}"`
      );
    } catch (error: any) {
      console.error('Error sending test message:', error);
      toast.error(`Failed to send test message: ${error.message}`);
    } finally {
      setTesting(false);
    }
  }, []);

  // Memoized debug function
  const handleDebugMessages = useCallback(async () => {
    if (!currentUser) return;
    
    console.log('=== DEBUGGING MESSAGE ACCESS ===');
    console.log('Current user:', currentUser.id);
    
    try {
      // Test direct RPC call
      const { data: conversations, error: convError } = await supabase
        .rpc('get_user_conversations_secure', { 
          p_user_id: currentUser.id, 
          p_limit: 10 
        });
      
      console.log('RPC result:', { conversations, convError });
      
      // Test direct message query
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .limit(10);
        
      console.log('Direct messages query:', { messages: messages?.length, msgError });
      
      // Test event messages query
      const { data: eventMessages, error: eventError } = await supabase
        .from('messages')
        .select('*')
        .eq('message_type', 'event')
        .limit(10);
        
      console.log('Event messages query:', { eventMessages: eventMessages?.length, eventError });
      
      toast.success('Debug info logged to console');
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Debug failed - check console');
    }
  }, [currentUser]);

  // Mark all messages as read handler
  const handleMarkAllAsRead = useCallback(async () => {
    if (!currentUser) {
      toast.error('Please log in to mark messages as read');
      return;
    }

    console.log('🔄 Starting mark all as read process...');
    
    try {
      await markAllAsRead();
      
      // Force refresh the messages data to ensure UI updates
      await fetchData('both', { useCache: false });
      
      toast.success('All messages and notifications marked as read');
      console.log('✅ Mark all as read completed successfully');
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      toast.error('Failed to mark all messages as read. Please try again.');
    }
  }, [markAllAsRead, fetchData, currentUser]);
  
  return (
    <>
      <UnifiedSEO
        title="Messages"
        description="Stay connected with your activity buddies. Send direct messages and participate in activity group chats."
        keywords="messages, chat, direct messages, group chat, communication"
        canonicalUrl="https://outercircl.com/messages"
        noIndex={true}
      />
      <div className="min-h-screen bg-gray-50">
        <Navbar isLoggedIn={isLoggedIn} username={currentUser?.user_metadata?.name || "User"} />
        
        <div className="container mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
          {/* Developer/Admin Test Message System */}
          {isLoggedIn && isDeveloperMode(isAdmin) && (
            <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <h3 className="text-lg font-semibold text-orange-900 mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Test Messaging System
                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                  {isAdmin ? 'ADMIN' : 'DEV'}
                </span>
              </h3>
              <p className="text-orange-700 text-sm mb-4">
                Send a sample pre-activity message to all participants of an event you're attending
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={handleSendTestMessage}
                  disabled={testing}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {testing ? 'Sending Test Message...' : 'Send Test Message'}
                </Button>
                <Button 
                  onClick={handleDebugMessages}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  Debug Messages
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <h1 className="text-2xl font-bold">Messages</h1>
            
            <div className="flex w-full md:w-auto items-center gap-4">
              <Button 
                onClick={() => setIsMessageModalOpen(true)}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                New Message
              </Button>
              
              {(unreadCounts.messages > 0 || unreadCounts.notifications > 0) && (
                <Button 
                  onClick={handleMarkAllAsRead}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark All Read ({unreadCounts.total})
                </Button>
              )}
              
              <Tabs 
                defaultValue="all" 
                className="w-full md:w-auto" 
                onValueChange={(value) => setMessageFilter(value as 'all' | 'direct' | 'activities')}
              >
                <TabsList className="grid w-full grid-cols-3 bg-white">
                  <TabsTrigger value="all" className="data-[state=active]:bg-gray-100">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="direct" className="data-[state=active]:bg-gray-100">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Direct
                  </TabsTrigger>
                  <TabsTrigger value="activities" className="data-[state=active]:bg-gray-100">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Activities
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {isLoading ? (
            <MessagingViewSkeleton />
          ) : (
            <div className="h-[calc(100vh-16rem)] md:h-[calc(100vh-12rem)] pb-20 md:pb-0">
              <PinterestMessagingView 
                messageFilter={messageFilter} 
                currentUser={currentUser}
                selectedConversation={selectedConversation}
                onConversationChange={setSelectedConversation}
              />
            </div>
          )}
        </div>

        {/* Message Search Modal */}
        {currentUser && (
          <MessageSearchModal
            isOpen={isMessageModalOpen}
            onClose={() => setIsMessageModalOpen(false)}
            currentUserId={currentUser.id}
            onStartConversation={handleStartConversation}
          />
        )}
      </div>
    </>
  );
};

export default Messages;
