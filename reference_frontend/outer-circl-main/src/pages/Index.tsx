
import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/components/OptimizedProviders';
import Navbar from '@/components/Navbar';
import UnifiedSEO from '@/components/UnifiedSEO';
import PromoBanner from '@/components/PromoBanner';
import { LightweightErrorBoundary } from '@/components/optimization/LightweightErrorBoundary';
import MobileNavbarFallback from '@/components/MobileNavbarFallback';
import { EventData } from '@/components/ActivityCard';
import {
  HeroSection,
  HowItWorksSection,
  FeaturedEventsSection,
  FeaturesSection,
  Footer,
  SaveIdeasSection
} from '@/components/sections';
import { LazyFeaturedEvents } from '@/components/optimization/LazyFeaturedEvents';
import { StableMobileWrapper } from '@/components/mobile/StableMobileWrapper';
import { useStableMobile } from '@/hooks/useStableMobile';
import { HOMEPAGE_IMAGES } from '@/utils/imageMapping';
const Index: React.FC = () => {
  // Phase 1: Simplified - AppBootstrap guarantees context is ready
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [hasPageError, setHasPageError] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const isMobile = useStableMobile();

  // Featured events for homepage - uses static image mappings for instant load
  const featuredEvents: EventData[] = useMemo(() => [
    {
      id: 'sample-1',
      title: 'Salthill Cold Plunge',
      description: 'Join us for an invigorating cold water plunge at Salthill beach. Perfect for building mental resilience and connecting with like-minded people.',
      imageUrl: HOMEPAGE_IMAGES.COLD_PLUNGE,
      date: '2025-01-08',
      time: '08:00',
      location: 'Salthill Beach, Galway',
      categories: ['water', 'sports', 'outdoors'],
      isPinned: false,
      isAttending: false
    },
    {
      id: 'sample-2',
      title: 'Tuesday Toddler Meetup at Millennium Playground',
      description: 'Weekly gathering for parents and toddlers. Let the little ones play while parents connect and share parenting tips.',
      imageUrl: HOMEPAGE_IMAGES.TODDLER_MEETUP,
      date: '2025-01-07',
      time: '10:30',
      location: 'Millennium Playground, Galway',
      categories: ['family', 'social'],
      isPinned: false,
      isAttending: false
    },
    {
      id: 'sample-3',
      title: '3K Jog at Salthill Prom',
      description: 'Easy-paced 3km jog along the beautiful Salthill Promenade. All fitness levels welcome, perfect for beginners.',
      imageUrl: HOMEPAGE_IMAGES.JOGGING,
      date: '2025-01-06',
      time: '18:30',
      location: 'Salthill Promenade, Galway',
      categories: ['water', 'sports', 'outdoors'],
      isPinned: false,
      isAttending: false
    },
    {
      id: 'sample-4',
      title: 'Coffee & Code Meetup',
      description: 'Casual meetup for developers and tech enthusiasts. Bring your laptop and work on projects together.',
      imageUrl: HOMEPAGE_IMAGES.COFFEE_CODE,
      date: '2025-01-09',
      time: '14:00',
      location: 'The Huntsman Pub, Galway',
      categories: ['professional', 'social', 'food'],
      isPinned: false,
      isAttending: false
    },
    {
      id: 'sample-5',
      title: 'Weekend Hiking Group',
      description: 'Explore the beautiful trails around Galway. Moderate difficulty level, perfect for weekend warriors.',
      imageUrl: HOMEPAGE_IMAGES.HIKING,
      date: '2025-01-11',
      time: '09:00',
      location: 'Connemara National Park',
      categories: ['outdoors', 'sports'],
      isPinned: false,
      isAttending: false
    }
  ], []);

  // Function to scroll to the "How it works" section - memoized for stability
  const scrollToHowItWorks = useCallback(() => {
    const section = document.getElementById('how-it-works');
    section?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ALL EFFECTS AFTER HOOKS BUT BEFORE CONDITIONAL LOGIC
  // CRITICAL FIX: Redirect authenticated users to dashboard
  React.useEffect(() => {
    if (user && !redirecting) {
      console.log('✅ User authenticated, redirecting to dashboard');
      setRedirecting(true);
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, redirecting]);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setHasPageError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Show loading state during redirect
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your activities...</p>
        </div>
      </div>
    );
  }

  // Show homepage immediately - auth loads in background
  if (hasPageError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-primary mb-4">outercircl</h1>
          <p className="text-muted-foreground mb-4">Something went wrong loading the homepage.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <LightweightErrorBoundary>
        <UnifiedSEO
          title="outercircl - Find an activity friend near you"
          description="Join Outer Circle to find activity buddies and connect with your local community. Discover hiking groups, book clubs, sports teams, and more activities happening near you."
          keywords="activity buddies, local events, community, meetups, social activities, find friends, local groups, outdoor activities, sports clubs"
          canonicalUrl="https://outercircl.com/"
          type="website"
        />
      </LightweightErrorBoundary>
      
      <StableMobileWrapper>
        <div className="min-h-screen flex flex-col">
          <LightweightErrorBoundary fallback={
            <div className="bg-white border-b p-4">
              <h1 className="text-lg font-bold text-primary">outercircl</h1>
            </div>
          }>
            <PromoBanner />
            <Navbar isLoggedIn={false} />
          </LightweightErrorBoundary>
          
          <main className="flex-1">
            <LightweightErrorBoundary fallback={
              <div className="py-20 text-center bg-gray-50">
                <h1 className="text-4xl font-bold text-primary mb-4">outercircl</h1>
                <p className="text-muted-foreground">Find activity friends near you</p>
              </div>
            }>
              <HeroSection onHowItWorksClick={scrollToHowItWorks} />
            </LightweightErrorBoundary>
            
            <LazyFeaturedEvents featuredEvents={featuredEvents} />
            
            <div id="how-it-works">
              <LightweightErrorBoundary fallback={<div className="py-10"></div>}>
                <HowItWorksSection id="how-it-works" />
              </LightweightErrorBoundary>
            </div>
            
            <LightweightErrorBoundary fallback={<div className="py-10"></div>}>
              <SaveIdeasSection />
            </LightweightErrorBoundary>
            
            <LightweightErrorBoundary fallback={<div className="py-10"></div>}>
              <FeaturesSection />
            </LightweightErrorBoundary>
          </main>
          
          <LightweightErrorBoundary fallback={<div className="h-16 bg-muted"></div>}>
            <Footer />
          </LightweightErrorBoundary>
        </div>
      </StableMobileWrapper>
    </>
  );
};

export default Index;
