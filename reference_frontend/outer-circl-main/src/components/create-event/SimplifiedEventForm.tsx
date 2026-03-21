import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Image, Repeat, Crown, Timer, ChevronDown, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEventForm } from './EventFormProvider';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useMembership } from '@/components/OptimizedProviders';
import { useEventHostingLimits } from '@/hooks/useEventHostingLimits';
import { useRecurringActivityLimits } from '@/hooks/useRecurringActivityLimits';
import EventFormActions from './EventFormActions';
import { UpgradeCTA } from './UpgradeCTA';
import EventInvitationsSection from './EventInvitationsSection';
import EnhancedImageUploadSection from './EnhancedImageUploadSection';
import DateTimeSection from './DateTimeSection';
import { useSmartImagePreloader } from '@/hooks/useSmartImagePreloader';

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

export const SimplifiedEventForm: React.FC = () => {
  const { membershipTier } = useMembership();
  const { canHostMore, isLoading: hostingLoading } = useEventHostingLimits();
  const { canCreateRecurring, monthlyRecurringLimit } = useRecurringActivityLimits();
  const { sendInvitations } = useEventInvitations();
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
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  
  // Smart image preloading based on activity context
  useSmartImagePreloader({
    activityTitle: formData.title,
    activityCategory: categories[0], // Use first category
    preloadPopular: true
  });
  

  if (hostingLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
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
          {/* Enhanced Image Upload with Smart Suggestions */}
          <EnhancedImageUploadSection
            eventImage={formData.eventImage}
            onImageSelected={handleImageSelected}
            activityTitle={formData.title}
            activityCategory={categories[0]}
          />

          {/* Title and Description */}
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

          {/* Quick Details */}
          <div className="space-y-4">
            {/* Date, Time, and Duration using DateTimeSection */}
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

          {/* Advanced Options Toggle */}
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
                {/* Participant Limit */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Participant limit</Label>
                      <p className="text-xs text-muted-foreground">Including yourself as host</p>
                    </div>
                    {isPremium ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.maxAttendees === null}
                          onCheckedChange={(checked) => 
                            handleSwitchChange('maxAttendees', checked ? null : '4')
                          }
                        />
                        <span className="text-xs text-muted-foreground">Unlimited</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-white">4 people</Badge>
                    )}
                  </div>
                  
                  {isPremium && formData.maxAttendees !== null && (
                    <div className="space-y-2">
                      <Label className="text-xs">Number of participants</Label>
                      <Input
                        type="number"
                        min="2"
                        max="1000"
                        value={formData.maxAttendees || ''}
                        onChange={handleInputChange}
                        name="maxAttendees"
                        placeholder="Enter participant limit"
                        className="h-9 rounded-lg"
                      />
                    </div>
                  )}
                  
                  {isPremium && formData.maxAttendees === null && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Crown className="h-4 w-4" />
                        <span className="font-medium">Enhanced Participant Management</span>
                      </div>
                      <p className="text-xs text-primary/70 mt-1">
                        Premium features for managing your activity participants
                      </p>
                    </div>
                  )}
                </div>

                {/* Recurring Activity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Recurring activity</Label>
                        {!isPremium && (
                          <Badge variant="secondary" className="text-xs">
                            {canCreateRecurring ? `${monthlyRecurringLimit} left` : 'Limit reached'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Automatically create future events</p>
                    </div>
                    <Switch
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) => handleSwitchChange('isRecurring', checked)}
                      disabled={!canCreateRecurring}
                    />
                  </div>

                  {formData.isRecurring && canCreateRecurring && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Repeat every</Label>
                        <Select 
                          value={formData.recurrencePattern} 
                          onValueChange={(value) => handleSwitchChange('recurrencePattern', value)}
                        >
                          <SelectTrigger className="h-9 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Week</SelectItem>
                            <SelectItem value="bi-weekly">2 Weeks</SelectItem>
                            <SelectItem value="monthly">Month</SelectItem>
                            {isPremium && (
                              <>
                                <SelectItem value="daily">Day</SelectItem>
                                <SelectItem value="quarterly">Quarter</SelectItem>
                                <SelectItem value="custom-weekly">Custom Weekly</SelectItem>
                                <SelectItem value="custom-monthly">Custom Monthly</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">End after</Label>
                        <Input
                          type="number"
                          min="1"
                          max={isPremium ? 100 : 10}
                          value={formData.recurrenceEndCount || ''}
                          onChange={handleInputChange}
                          name="recurrenceEndCount"
                          placeholder={`Up to ${isPremium ? 100 : 10}`}
                          className="h-9 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                  
                  {isPremium && formData.isRecurring && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Crown className="h-4 w-4" />
                        <span className="font-medium">Premium Features Active</span>
                      </div>
                      <p className="text-xs text-primary/70 mt-1">
                        Unlimited recurring activities • Custom patterns • Up to 100 occurrences
                      </p>
                    </div>
                  )}
                  
                  {!isPremium && !canCreateRecurring && (
                    <UpgradeCTA 
                      variant="card"
                      feature="Unlimited Recurring Activities"
                      benefit="Create as many recurring activities as you want with Premium"
                      className="mt-3"
                    />
                  )}
                </div>

                {/* Gender Preference */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Gender preference</Label>
                        {!isPremium && (
                          <Badge variant="secondary" className="text-xs">Premium</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isPremium ? "Restrict who can join this activity" : "Set gender preferences for your activities"}
                      </p>
                    </div>
                  </div>
                  
                  {isPremium ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Select preference</Label>
                      <Select 
                        value={formData.genderPreference} 
                        onValueChange={(value) => handleSwitchChange('genderPreference', value)}
                      >
                        <SelectTrigger className="h-9 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference">No Preference</SelectItem>
                          <SelectItem value="male">Men Only</SelectItem>
                          <SelectItem value="female">Women Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Select preference</Label>
                      <div className="relative">
                        <Select disabled>
                          <SelectTrigger className="h-9 rounded-lg opacity-50 cursor-not-allowed">
                            <SelectValue placeholder="No Preference" />
                          </SelectTrigger>
                        </Select>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Badge variant="outline" className="bg-white text-xs">
                            Premium Feature
                          </Badge>
                        </div>
                      </div>
                      <UpgradeCTA 
                        variant="inline"
                        feature="Set gender preferences"
                        benefit="Create gender-specific activities"
                        className="justify-start"
                      />
                    </div>
                  )}
                </div>

                {/* Event Invitations Section */}
                <EventInvitationsSection
                  selectedFriends={selectedFriends}
                  onFriendsChange={setSelectedFriends}
                  userMembershipTier={membershipTier}
                />

                {isPremium ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Approval required</Label>
                        <p className="text-xs text-muted-foreground">Review participants before they join</p>
                      </div>
                      <Switch
                        checked={formData.approvalRequired}
                        onCheckedChange={(checked) => handleSwitchChange('approvalRequired', checked)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between opacity-60">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Approval required</Label>
                        <p className="text-xs text-muted-foreground">Review participants before they join</p>
                      </div>
                      <Crown className="h-4 w-4 text-primary" />
                    </div>
                    <UpgradeCTA 
                      variant="inline"
                      feature="Control who joins your activities"
                      benefit=""
                      className="justify-start"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <EventFormActions selectedFriends={selectedFriends} />
    </div>
  );
};

export default SimplifiedEventForm;