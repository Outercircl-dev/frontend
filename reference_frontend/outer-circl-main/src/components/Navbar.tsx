// Updated navbar without separate Find Friends button
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/components/OptimizedProviders';
import { useAppContext } from '@/components/OptimizedProviders';
import { useSafeMessaging } from '@/contexts/SafeMessagingContext';
import { supabase } from '@/integrations/supabase/client';
import NavbarLogo from '@/components/navbar/NavbarLogo';
import NavbarSearch from '@/components/navbar/NavbarSearch';
import NavbarNotifications from '@/components/navbar/NavbarNotifications';
import NavbarAuthButtons from '@/components/navbar/NavbarAuthButtons';
import NavbarUserMenu from '@/components/navbar/NavbarUserMenu';
import NavbarCreateMenu from '@/components/navbar/NavbarCreateMenu';

interface NavbarProps {
  isLoggedIn?: boolean;
  username?: string;
  avatarUrl?: string;
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn: initialIsLoggedIn = false, username = 'User', avatarUrl }) => {
  // Safe router hook usage with fallback
  let navigate, location;
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch (error) {
    console.warn('Navbar: Router context not available, using fallbacks');
    navigate = (path: string) => { window.location.href = path; };
    location = { pathname: window.location.pathname } as any;
  }
  const { membershipTier } = useMembership();
  const { user, unreadNotifications } = useAppContext();
  const { unreadCounts } = useSafeMessaging();
  const [userProfile, setUserProfile] = useState<any>(null);

  // Use centralized auth state
  const isLoggedIn = !!user;
  const currentUser = user;

  // Messages are now handled by useOptimizedMessages hook
  
  const isHomepage = location.pathname === '/';
  const shouldShowUpgradeLink = !isLoggedIn || membershipTier === 'standard';
  const isDashboard = location.pathname.includes('/dashboard');
  const isProfilePage = location.pathname.includes('/profile');
  
  // Show search bar only on profile pages or dashboard
  const shouldShowSearch = isDashboard || isProfilePage;

  // Fetch user profile when user changes
  useEffect(() => {
    if (!currentUser?.id) {
      setUserProfile(null);
      return;
    }

    const userId = currentUser.id;
    
    const fetchUserProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to user metadata
          setUserProfile({
            id: userId,
            name: currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || 'User',
            avatar_url: currentUser.user_metadata?.avatar_url || null,
            username: currentUser.user_metadata?.username || null
          });
        } else {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Unexpected error fetching user profile:', error);
        // Fallback to user metadata
        setUserProfile({
          id: userId,
          name: currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || 'User',
          avatar_url: currentUser.user_metadata?.avatar_url || null,
          username: currentUser.user_metadata?.username || null
        });
      }
    };

    fetchUserProfile();

    // Set up real-time subscription for profile changes with unique channel name
    const channelName = `profile-changes-${userId}`;
    const profileChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('Profile updated:', payload.new);
          setUserProfile(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [currentUser?.id]);

  // Phase 1: AppBootstrap guarantees auth is established
  const authLoading = false;

  const handleLogin = () => {
    console.log('Navbar: Navigating to login');
    navigate('/auth?tab=login');
  };

  const handleRegister = () => {
    console.log('Navbar: Navigating to membership/register');
    // Always route to membership selection first
    navigate('/membership');
  };

  const displayUsername = currentUser?.user_metadata?.username || currentUser?.user_metadata?.name || username;

  return (
    <>
      {/* Beta Banner - only on homepage */}
      {isHomepage && (
        <div className="bg-[#E60023] text-white text-center py-1 text-xs font-medium">
          Beta Version - Sign up today for Premium Membership offers!
        </div>
      )}
      
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 safe-top">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* Logo with search */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <NavbarLogo />
            
            {/* Add search in navbar - responsive behavior */}
            <div className="flex-1 max-w-md hidden sm:block">
              <NavbarSearch shouldShowSearch={shouldShowSearch} />
            </div>
            
            {/* Mobile search icon - only show when search should be available */}
            <div className="sm:hidden">
              <NavbarSearch shouldShowSearch={shouldShowSearch} />
            </div>
          </div>
          
          {/* Notifications, Create menu and Auth buttons */}
          <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
            {/* Upgrade link - never show on homepage, only on other pages for non-premium users */}
            {!isHomepage && shouldShowUpgradeLink && location.pathname !== '/' && (
              <Link 
                to="/membership" 
                className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-sm font-medium hidden md:block tap-target touch-manipulation"
              >
                Upgrade
              </Link>
            )}
            
            <NavbarNotifications 
              isLoggedIn={isLoggedIn}
              hasNotifications={unreadNotifications > 0}
              hasMessages={unreadCounts.messages > 0}
              currentUserId={currentUser?.id}
            />
            
            {/* Create menu - positioned next to notifications (hidden on homepage) */}
            {isLoggedIn && !isHomepage && <NavbarCreateMenu />}
            
            {/* Auth buttons */}
            <div className="flex space-x-1 sm:space-x-2">
              {authLoading ? (
                <div className="h-8 sm:h-9 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <>
                  <NavbarAuthButtons 
                    isLoggedIn={isLoggedIn}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                  />
                  
                  <NavbarUserMenu 
                    isLoggedIn={isLoggedIn}
                    username={displayUsername}
                    avatarUrl={userProfile?.avatar_url}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </nav>
    </>
  );
};

export default Navbar;
