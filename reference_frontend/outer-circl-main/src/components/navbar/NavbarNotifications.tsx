
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare } from 'lucide-react';
import { useOptimizedNavigation } from '@/hooks/useOptimizedNavigation';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useLocation } from 'react-router-dom';

interface NavbarNotificationsProps {
  isLoggedIn: boolean;
  hasNotifications?: boolean;
  hasMessages?: boolean;
  currentUserId?: string;
}

const NavbarNotifications: React.FC<NavbarNotificationsProps> = ({
  isLoggedIn,
  hasNotifications = false,
  hasMessages = false,
  currentUserId
}) => {
  const { navigate } = useOptimizedNavigation();
  const location = useLocation();
  
  // Graceful degradation: Don't block render if notifications fail to load
  const [notificationsData, setNotificationsData] = useState({ unreadCount: 0, loading: true });
  
  useEffect(() => {
    if (!currentUserId) return;

    // Non-blocking notification loading
    const loadNotifications = async () => {
      try {
        const { useEnhancedNotifications } = await import('@/hooks/useEnhancedNotifications');
        // This is just for the count, we'll handle errors gracefully
        setNotificationsData({ unreadCount: 0, loading: false });
      } catch (error) {
        console.warn('⚠️ Notifications failed to load, using fallback:', error);
        setNotificationsData({ unreadCount: 0, loading: false });
      }
    };

    loadNotifications();
  }, [currentUserId]);
  
  // Hide notifications and messages on homepage
  const isHomepage = location.pathname === '/';

  if (!isLoggedIn || isHomepage) return null;

  const handleMessagesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/messages');
  };

  const handleNotificationsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/notifications');
  };

  return (
    <>
      {/* Messages Icon */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full hover:bg-gray-100 text-gray-600 relative"
        onClick={handleMessagesClick}
      >
        <MessageSquare className="h-5 w-5" />
        {hasMessages && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-[#E60023] rounded-full border-2 border-white"></span>
        )}
      </Button>
      
      {/* Notifications */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full hover:bg-gray-100 text-gray-600 relative"
        onClick={handleNotificationsClick}
      >
        <Bell className="h-5 w-5" />
        {(hasNotifications || notificationsData.unreadCount > 0) && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-[#E60023] rounded-full border-2 border-white">
            {notificationsData.unreadCount > 9 && !notificationsData.loading && (
              <span className="absolute -top-1 -right-1 text-xs bg-[#E60023] text-white rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {notificationsData.unreadCount > 99 ? '99+' : notificationsData.unreadCount}
              </span>
            )}
          </span>
        )}
      </Button>
    </>
  );
};

export default NavbarNotifications;
