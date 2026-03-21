import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventForm } from './EventFormProvider';
import { useMembership } from '@/components/OptimizedProviders';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import { getAdaptiveSettings, DEFERRED_FEATURES } from '@/utils/performanceConfig';
import EventFormActions from './EventFormActions';
import { UpgradeCTA } from './UpgradeCTA';
import DateTimeSection from './DateTimeSection';
import EnhancedImageUploadSection from './EnhancedImageUploadSection';

// Static category options - no need to memoize data
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

export const PerformanceOptimizedEventForm: React.FC = () => {
  const { membershipTier } = useMembership();
  const isPremium = membershipTier === 'premium';
  
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
  const [performanceFeatures, setPerformanceFeatures] = useState({
    heavyFeaturesReady: false,
    imagePreloaderReady: false,
    invitationSystemReady: false
  });

  // Get adaptive settings based on device/connection
  const adaptiveSettings = useMemo(() => getAdaptiveSettings(), []);

  // Staggered loading of heavy features based on performance budgets
  useEffect(() => {
    // Load heavy features in priority order with proper delays
    const loadFeatures = async () => {
      // Stage 1: Load heavy form features (after 1s)
      performanceOptimizer.deferUntilIdle(() => {
        setPerformanceFeatures(prev => ({ ...prev, heavyFeaturesReady: true }));
      }, DEFERRED_FEATURES.HEAVY_FORM_FEATURES);

      // Stage 2: Load image preloader (after 2s, if enabled)
      if (adaptiveSettings.enableImagePreloading) {
        performanceOptimizer.deferUntilIdle(() => {
          setPerformanceFeatures(prev => ({ ...prev, imagePreloaderReady: true }));
        }, DEFERRED_FEATURES.IMAGE_PRELOADER);
      }

      // Stage 3: Load invitation system (after 2.5s, if premium)
      if (isPremium) {
        performanceOptimizer.deferUntilIdle(() => {
          setPerformanceFeatures(prev => ({ ...prev, invitationSystemReady: true }));
        }, DEFERRED_FEATURES.INVITATION_SYSTEM);
      }
    };

    loadFeatures();
  }, [isPremium, adaptiveSettings]);

  // Memoized category selection for better performance
  const CategorySelection = React.memo(() => (
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
  ));

  // Loading skeleton for deferred features
  const FeatureSkeleton = () => (
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
      <div className="h-10 bg-gray-200 rounded animate-pulse" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Create Activity</h1>
        <p className="text-muted-foreground text-sm">Share something amazing with your community</p>
      </div>

      {/* Premium Features Banner - Load immediately */}
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
          {/* Enhanced Image Upload - Critical path, load immediately */}
          <EnhancedImageUploadSection
            eventImage={formData.eventImage}
            onImageSelected={handleImageSelected}
            activityTitle={formData.title}
            activityCategory={categories[0]}
          />

          {/* Essential Form Fields - Critical path */}
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

          {/* Category Selection - Memoized for performance */}
          <CategorySelection />

          {/* Essential Location/Time - Critical path */}
          <div className="space-y-4">
            <DateTimeSection
              date={date}
              time={formData.time}
              duration={formData.duration}
              setDate={setDate}
              onInputChange={handleInputChange}
            />

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

          {/* Advanced Options - Deferred loading */}
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
                {/* Basic participant limit - Load immediately */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Participant limit</Label>
                      <p className="text-xs text-muted-foreground">Including yourself as host</p>
                    </div>
                    {!isPremium ? (
                      <Badge variant="outline" className="bg-white">4 people</Badge>
                    ) : performanceFeatures.heavyFeaturesReady ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Unlimited available</span>
                      </div>
                    ) : (
                      <FeatureSkeleton />
                    )}
                  </div>
                  
                </div>

                {/* Heavy features - Load when ready */}
                {performanceFeatures.heavyFeaturesReady ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="text-sm text-primary">
                        ⚡ Advanced features loaded
                      </div>
                      <p className="text-xs text-primary/70 mt-1">
                        All features are now available for better performance
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-xs text-muted-foreground">Loading advanced features...</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions - Critical path, always available */}
          <EventFormActions />
        </div>
      </Card>
    </div>
  );
};