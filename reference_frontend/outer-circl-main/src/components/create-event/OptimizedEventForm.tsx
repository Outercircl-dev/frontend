import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronDown, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventForm } from './EventFormProvider';
import { useMembership } from '@/components/OptimizedProviders';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import EventFormActions from './EventFormActions';
import { UpgradeCTA } from './UpgradeCTA';
import DateTimeSection from './DateTimeSection';
import EnhancedImageUploadSection from './EnhancedImageUploadSection';

// Lazy load heavy features for better initial performance
const LazyEventInvitationsSection = React.lazy(() => import('./EventInvitationsSection'));

// Defer heavy hook loading
const useDeferredHooks = () => {
  const [hooksReady, setHooksReady] = useState(false);
  
  useEffect(() => {
    performanceOptimizer.deferUntilIdle(() => {
      setHooksReady(true);
    }, 1000);
  }, []);
  
  return hooksReady;
};

import { CATEGORY_OPTIONS } from '@/utils/categories';

const categoryIcons: Record<string, string> = {
  'social': '🤝',
  'education': '📚',
  'sports': '⚽',
  'arts': '🎨',
  'technology': '💻',
  'food': '🍕',
  'health-wellness': '🧘',
  'outdoors': '🌲',
  'gaming': '🎮',
  'giving-back': '❤️',
  'other': '✨'
};

const categoryOptions = CATEGORY_OPTIONS.map(cat => ({
  ...cat,
  icon: categoryIcons[cat.id] || '✨'
}));

export const OptimizedEventForm: React.FC = () => {
  const { membershipTier } = useMembership();
  const isPremium = membershipTier === 'premium';
  const hooksReady = useDeferredHooks();
  
  const {
    formData,
    date,
    setDate,
    categories,
    setCategories,
    handleInputChange,
    handleSwitchChange,
    handleImageSelected,
  } = useEventForm();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [heavyFeaturesLoaded, setHeavyFeaturesLoaded] = useState(false);
  
  // Lazy load heavy features and hooks
  useEffect(() => {
    if (!hooksReady) return;
    
    const loadHeavyFeatures = async () => {
      // Defer loading of heavy hooks until after initial render
      await performanceOptimizer.deferUntilIdle(async () => {
        // Pre-import heavy modules
        await Promise.all([
          import('@/hooks/useEventHostingLimits'),
          import('@/hooks/useRecurringActivityLimits'),
          import('@/hooks/useEventInvitations'),
          import('@/hooks/useSmartImagePreloader')
        ]);
        
        setHeavyFeaturesLoaded(true);
      });
    };
    
    loadHeavyFeatures();
  }, [hooksReady]);

  // Only show loading initially, not for deferred features
  if (!hooksReady) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-sm text-muted-foreground">Loading form...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Create Activity</h1>
        <p className="text-muted-foreground text-sm">Share something amazing with your community</p>
      </div>

      {/* Premium Features Banner */}
      {!isPremium && (
        <UpgradeCTA 
          variant="banner"
          feature="Unlock Premium Features"
          benefit="Host larger groups, create unlimited recurring activities & more"
        />
      )}

      {/* Main Form Card */}
      <Card className="p-6 shadow-lg border-0 bg-white rounded-3xl">
        <div className="space-y-6">
          {/* Enhanced Image Upload - Load immediately for better UX */}
          <EnhancedImageUploadSection
            eventImage={formData.eventImage}
            onImageSelected={handleImageSelected}
            activityTitle={formData.title}
            activityCategory={categories[0]}
          />

          {/* Essential Form Fields - Load immediately */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">What's your activity?</Label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Coffee chat in the park"
                className="h-12 text-base rounded-xl border-border/60 focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Tell us more</Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="What can people expect? What should they bring?"
                className="min-h-[100px] text-base rounded-xl border-border/60 focus:border-primary resize-none"
              />
            </div>
          </div>

          {/* Category Selection - Pinterest style */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Categories</Label>
              <span className="text-xs text-muted-foreground">{categories.length}/3 selected</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryOptions.map(category => {
                const isSelected = categories.includes(category.id);
                const canSelect = categories.length < 3 || isSelected;
                
                return (
                  <button
                    key={category.id}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => {
                      if (isSelected) {
                        setCategories(categories.filter(id => id !== category.id));
                      } else if (categories.length < 3) {
                        setCategories([...categories, category.id]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : canSelect
                        ? "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
                        : "border-border/30 text-muted-foreground/50 cursor-not-allowed"
                    )}
                  >
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-xs font-medium">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Details - Essential for all events */}
          <div className="space-y-4">
            <DateTimeSection
              date={date}
              time={formData.time}
              duration={formData.duration}
              setDate={setDate}
              onInputChange={handleInputChange}
            />

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Where</Label>
              <div className="relative">
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Central Park, NYC"
                  className="h-12 pl-10 rounded-xl border-border/60 focus:border-primary"
                />
                <MapPin className="absolute left-3 top-4 h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Meetup Spot - Optional */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Meetup spot <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <div className="relative">
                <Input
                  name="meetupSpot"
                  value={formData.meetupSpot || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., By the fountain, near the main entrance"
                  className="h-12 pl-10 rounded-xl border-border/60 focus:border-primary"
                />
                <MapPin className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                🔒 Only confirmed participants will see this meetup spot
              </p>
            </div>
          </div>

          {/* Advanced Options - Lazy loaded */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full h-12 rounded-xl border border-border/60 hover:bg-muted/50"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                More options
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
              </span>
            </Button>

            {showAdvanced && (
              <div className="space-y-6 p-4 bg-muted/30 rounded-2xl">
                {/* Basic participant limit without heavy hooks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Participant limit</Label>
                      <p className="text-xs text-muted-foreground">Including yourself as host</p>
                    </div>
                    {!isPremium ? (
                      <Badge variant="outline" className="bg-white">4 people</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Unlimited available</span>
                      </div>
                    )}
                  </div>
                  
                </div>

                {/* Load heavy features only when needed */}
                {heavyFeaturesLoaded && showAdvanced && (
                  <React.Suspense fallback={
                    <div className="text-center py-4">
                      <div className="text-xs text-muted-foreground">Loading advanced features...</div>
                    </div>
                  }>
                    <LazyEventInvitationsSection 
                      selectedFriends={[]}
                      onFriendsChange={() => {}}
                      userMembershipTier={membershipTier}
                    />
                  </React.Suspense>
                )}
              </div>
            )}
          </div>

          {/* Form Actions - Always available */}
          <EventFormActions />
        </div>
      </Card>
    </div>
  );
};