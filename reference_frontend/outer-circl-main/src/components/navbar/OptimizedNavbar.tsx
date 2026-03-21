import React, { useState, useEffect, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/components/OptimizedProviders';
import { useMembership } from '@/components/OptimizedProviders';
import { useSafeMessaging } from '@/contexts/SafeMessagingContext';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import NavbarLogo from '@/components/navbar/NavbarLogo';
import NavbarSearch from '@/components/navbar/NavbarSearch';

// Lazy load heavy navbar components for better performance
const NavbarNotifications = React.lazy(() => import('@/components/navbar/NavbarNotifications'));
const NavbarUserMenu = React.lazy(() => import('@/components/navbar/NavbarUserMenu'));
const NavbarCreateMenu = React.lazy(() => import('@/components/navbar/NavbarCreateMenu'));
const NavbarAuthButtons = React.lazy(() => import('@/components/navbar/NavbarAuthButtons'));

interface OptimizedNavbarProps {
  isLoggedIn?: boolean;
  username?: string;
  avatarUrl?: string;
}

const OptimizedNavbar: React.FC<OptimizedNavbarProps> = ({ 
  isLoggedIn: initialIsLoggedIn = false, 
  username = 'User', 
  avatarUrl 
}) => {
  // Safe navigation hooks with fallback
  let navigate, location;
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch (error) {
    console.warn('Router context not available in OptimizedNavbar:', error);
    // Fallback navigation function
    navigate = (to: string) => window.location.href = to;
    location = { pathname: window.location.pathname };
  }
  const { membershipTier } = useMembership();
  const { user, unreadNotifications } = useAppContext();
  const { unreadCounts } = useSafeMessaging();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showHeavyComponents, setShowHeavyComponents] = useState(false);

  // Use centralized auth state
  const isLoggedIn = !!user;
  const currentUser = user;

  const isHomepage = location.pathname === '/';
  const shouldShowUpgradeLink = !isLoggedIn || membershipTier === 'standard';
  const isDashboard = location.pathname.includes('/dashboard');
  const isProfilePage = location.pathname.includes('/profile');
  const shouldShowSearch = isDashboard || isProfilePage;

  // Defer heavy component loading to improve initial render performance
  useEffect(() => {
    const loadHeavyComponents = () => {
      setShowHeavyComponents(true);
    };

    // Use performance optimizer to defer non-critical components
    performanceOptimizer.deferUntilIdle(loadHeavyComponents, 2000);
  }, []);

  // Cache user profile and defer real-time subscriptions
  useEffect(() => {
    if (!currentUser?.id || !showHeavyComponents) return;

    const fetchUserProfile = async () => {
      try {
        // Try to get from cache first
        const cachedProfile = sessionStorage.getItem(`profile_${currentUser.id}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          if (Date.now() - parsed.timestamp < 300000) { // 5 minutes cache
            setUserProfile(parsed.data);
            return;
          }
        }

        // Only fetch if not cached or expired
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, username')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.warn('Profile fetch error (using fallback):', error);
          const fallback = {
            id: currentUser.id,
            name: currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || 'User',
            avatar_url: currentUser.user_metadata?.avatar_url || null,
            username: currentUser.user_metadata?.username || null
          };
          setUserProfile(fallback);
        } else {
          setUserProfile(profile);
          // Cache the result
          sessionStorage.setItem(`profile_${currentUser.id}`, JSON.stringify({
            data: profile,
            timestamp: Date.now()
          }));
        }

        // Set up real-time subscription after initial load (deferred)
        performanceOptimizer.deferUntilIdle(() => {
          const profileChannel = supabase
            .channel('profile-changes')
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${currentUser?.id}`
            }, (payload) => {
              setUserProfile(payload.new as any);
              // Invalidate cache
              sessionStorage.removeItem(`profile_${currentUser.id}`);
            })
            .subscribe();

          return () => supabase.removeChannel(profileChannel);
        });

      } catch (error) {
        console.warn('Profile loading error:', error);
      }
    };

    fetchUserProfile();
  }, [currentUser, showHeavyComponents]);

  const authLoading = false; // AppBootstrap guarantees initialization
  const displayUsername = currentUser?.user_metadata?.username ||
                         currentUser?.user_metadata?.name || 
                         username;

  const handleLogin = () => navigate('/auth?tab=login');
  const handleRegister = () => navigate('/membership');

  // Loading fallback component
  const NavbarSkeleton = () => (
    <div className="h-8 sm:h-9 w-16 sm:w-20 bg-gray-200 rounded animate-pulse" />
  );

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
            {/* Logo with search - always load immediately */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <NavbarLogo />
              
              <div className="flex-1 max-w-md hidden sm:block">
                <NavbarSearch shouldShowSearch={shouldShowSearch} />
              </div>
              
              <div className="sm:hidden">
                <NavbarSearch shouldShowSearch={shouldShowSearch} />
              </div>
            </div>
            
            {/* Right side components - lazy loaded for better performance */}
            <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
              {/* Upgrade link - lightweight, load immediately */}
              {!isHomepage && shouldShowUpgradeLink && (
                <Link 
                  to="/membership" 
                  className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-sm font-medium hidden md:block tap-target touch-manipulation"
                >
                  Upgrade
                </Link>
              )}
              
              {/* Heavy components - lazy loaded */}
              {showHeavyComponents ? (
                <Suspense fallback={<NavbarSkeleton />}>
                  <NavbarNotifications 
                    isLoggedIn={isLoggedIn}
                    hasNotifications={unreadNotifications > 0}
                    hasMessages={unreadCounts.messages > 0}
                    currentUserId={currentUser?.id}
                  />
                  
                  {isLoggedIn && !isHomepage && <NavbarCreateMenu />}
                </Suspense>
              ) : (
                <div className="flex space-x-2">
                  <NavbarSkeleton />
                  {isLoggedIn && <NavbarSkeleton />}
                </div>
              )}
              
              {/* Auth section */}
              <div className="flex space-x-1 sm:space-x-2">
                {authLoading ? (
                  <NavbarSkeleton />
                ) : showHeavyComponents ? (
                  <Suspense fallback={<NavbarSkeleton />}>
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
                  </Suspense>
                ) : (
                  <NavbarSkeleton />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default OptimizedNavbar;