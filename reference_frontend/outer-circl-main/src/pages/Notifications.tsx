
import React from 'react';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Bell, UserPlus, MessageSquare, CalendarCheck, Check, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSafeNavigate } from '@/components/SafeNavigationWrapper';
import { supabase } from '@/integrations/supabase/client';
import { useSafeMessaging } from '@/contexts/SafeMessagingContext';
import { useProfilePrivacy } from '@/hooks/useProfilePrivacy';
import { NotificationItem } from '@/components/NotificationItem';
import EnhancedNotificationItem from '@/components/notifications/EnhancedNotificationItem';
import { toast } from 'sonner';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const Notifications = () => {
  const navigate = useSafeNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let mounted = true;
    
    const checkAuthStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setIsLoggedIn(!!user);
        setCurrentUser(user);
        
        if (!user) {
          navigate('/auth');
        }
      }
    };

    checkAuthStatus();

    // Check for navigation state (e.g., from friend request notification)
    const state = window.history.state?.usr;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        const isAuthenticated = !!session?.user;
        setIsLoggedIn(isAuthenticated);
        setCurrentUser(session?.user || null);
        
        if (!isAuthenticated) {
          navigate('/auth');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Use unified messaging system
  const {
    notifications: unifiedNotifications,
    loading: messagingLoading,
    unreadCounts,
    markAsRead: markMessageAsRead,
    markAllAsRead: markAllMessagesAsRead,
  } = useSafeMessaging();

  // Transform unified notifications to match legacy interface
  const notifications = unifiedNotifications;
  const loading = messagingLoading;
  const unreadCount = unreadCounts.notifications;

  // Pagination state (client-side for now)
  const [currentPage, setCurrentPage] = React.useState(0);
  const pageSize = 10;
  const totalCount = notifications.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPreviousPage = currentPage > 0;

  const paginatedNotifications = notifications.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  const previousPage = () => setCurrentPage(prev => Math.max(prev - 1, 0));
  const goToPage = (page: number) => setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));

  // Adapt unified messaging methods
  const markAsRead = async (notificationId: string) => {
    await markMessageAsRead(notificationId, 'notification');
  };

  const markAllAsRead = async () => {
    await markAllMessagesAsRead();
  };

  // Soft delete via user_deleted_notifications table
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_deleted_notifications')
        .insert({
          user_id: currentUser.id,
          notification_id: notificationId
        });

      if (error) throw error;
      toast.success('Notification deleted');
      // Refresh would happen via real-time subscription
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Archive notification
  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      toast.success('Notification archived');
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  const { respondToFriendRequest } = useProfilePrivacy(currentUser?.id);

  if (!isLoggedIn || !currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isLoggedIn={isLoggedIn} username={currentUser?.user_metadata?.name || "User"} />
      
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Bell className="h-6 w-6 mr-2" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              onClick={markAllAsRead}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
        
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notifications Center</CardTitle>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="friends">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Friends
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="events">
                  <CalendarCheck className="h-4 w-4 mr-1" />
                  Activities
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* All Notifications */}
            <TabsContent value="all" className="p-0">
              {loading ? (
                <div className="p-6 text-center">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                  <p className="text-gray-500">You'll see friend requests, messages, and activity updates here when they arrive.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <EnhancedNotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onArchive={archiveNotification}
                        currentUserId={currentUser?.id}
                      />
                    ))}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="p-6 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-muted-foreground">
                          Showing page {currentPage + 1} of {totalPages} ({totalCount} total)
                        </p>
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={previousPage}
                              className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {(() => {
                            const startPage = Math.max(0, currentPage - 2);
                            const endPage = Math.min(totalPages - 1, startPage + 4);
                            const adjustedStartPage = Math.max(0, endPage - 4);
                            
                            return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, i) => {
                              const pageNumber = adjustedStartPage + i;
                              return (
                                <PaginationItem key={pageNumber}>
                                  <PaginationLink
                                    onClick={() => goToPage(pageNumber)}
                                    isActive={pageNumber === currentPage}
                                    className="cursor-pointer"
                                  >
                                    {pageNumber + 1}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            });
                          })()}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={nextPage}
                              className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            {/* Friend Requests */}
            <TabsContent value="friends" className="p-0">
              {notifications.filter(n => n.notification_type === 'friend_request').length === 0 ? (
                <div className="p-6 text-center">
                  <UserPlus className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No friend requests</h3>
                  <p className="text-gray-500">Friend requests will appear here when you receive them.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter(n => n.notification_type === 'friend_request')
                    .slice(0, 10)
                    .map((notification) => (
                        <EnhancedNotificationItem
                          key={notification.id}
                          notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onArchive={archiveNotification}
                        currentUserId={currentUser?.id}
                      />
                    ))}
                </div>
              )}
            </TabsContent>
            
            
            {/* Messages */}
            <TabsContent value="messages" className="p-0">
              {notifications.filter(n => n.notification_type === 'message').length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No new messages</h3>
                  <p className="text-gray-500">Message notifications will appear here when you receive them.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter(n => n.notification_type === 'message')
                    .slice(0, 10)
                    .map((notification) => (
                        <EnhancedNotificationItem
                          key={notification.id}
                          notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onArchive={archiveNotification}
                        currentUserId={currentUser?.id}
                      />
                    ))}
                </div>
              )}
            </TabsContent>
            
            {/* Event Updates */}
            <TabsContent value="events" className="p-0">
              {paginatedNotifications.filter(n => n.notification_type === 'event' || n.notification_type === 'event_reminder' || n.notification_type === 'reminder').length === 0 ? (
                <div className="p-6 text-center">
                  <CalendarCheck className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activity updates</h3>
                  <p className="text-gray-500">Updates about your activities will appear here.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {paginatedNotifications
                    .filter(n => n.notification_type === 'event' || n.notification_type === 'event_reminder' || n.notification_type === 'reminder')
                    .map((notification) => (
                        <EnhancedNotificationItem
                          key={notification.id}
                          notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onArchive={archiveNotification}
                        currentUserId={currentUser?.id}
                      />
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
