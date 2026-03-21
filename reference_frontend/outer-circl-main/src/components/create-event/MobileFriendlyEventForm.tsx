import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MapPin, Clock, Calendar, Users, Repeat, ChevronDown, ChevronUp, Upload, Image, Camera, Sparkles, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventForm } from './EventFormProvider';
import { useMembership } from '@/components/OptimizedProviders';
import { useRecurringActivityLimits } from '@/hooks/useRecurringActivityLimits';
import EventFormActions from './EventFormActions';
import DateTimeSection from './DateTimeSection';
import { UpgradeCTA } from './UpgradeCTA';
import { toast } from 'sonner';
import LazyImage from '@/components/optimization/LazyImage';
import { getOutercircleDefaultImage } from '@/utils/defaultImages';
import UltraFastImageSelector from './UltraFastImageSelector';

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

export const MobileFriendlyEventForm: React.FC = () => {
  const { membershipTier } = useMembership();
  const { canCreateRecurring, recurringEventsThisMonth, monthlyRecurringLimit } = useRecurringActivityLimits();
  const isPremium = membershipTier === 'premium';
  
  const {
    formData,
    date,
    setDate,
    categories,
    setCategories,
    handleInputChange,
    handleSwitchChange,
    handlePatternChange,
    handleEndDateChange,
    handleImageSelected,
  } = useEventForm();

  const [showRecurring, setShowRecurring] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [openStockImagesDialog, setOpenStockImagesDialog] = useState(false);

  // Get default image
  const defaultImage = getOutercircleDefaultImage();
  const displayImage = formData.eventImage || defaultImage;

  // Simple form validation
  const isFormValid = () => {
    return formData.title && 
           formData.description && 
           date && 
           formData.time && 
           formData.location && 
           categories.length > 0;
  };

  // Handle image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Please upload an image under 10MB.');
      return;
    }
    
    toast.loading('Processing image...', { id: 'image-upload' });
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        handleImageSelected(event.target.result);
        setShowImageOptions(false);
        toast.success('✨ Image uploaded!', { id: 'image-upload' });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-center">Create Activity</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Share something fun with your community</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Image Upload - Medium Size */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-500" />
              <Label className="text-sm font-medium">Activity Image</Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowImageOptions(!showImageOptions)}
              className="p-1"
            >
              {showImageOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Medium image preview */}
          <div className="mb-3">
            <div className="w-64 h-48 mx-auto rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
              <LazyImage 
                key={displayImage}
                src={displayImage} 
                alt="Activity preview"
                className="w-full h-full object-cover"
              />
              {!formData.eventImage && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Camera className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">Default Image</p>
                    <p className="text-xs opacity-80">Tap to upload your own</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              {formData.eventImage ? 'Custom image selected' : 'Using default image'}
            </p>
          </div>

          {/* Image Upload Options */}
          {showImageOptions && (
            <div className="space-y-2 pt-3 mt-3 border-t">
              <label className="block">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center gap-2 h-9 text-sm"
                  onClick={() => document.getElementById('mobile-file-upload')?.click()}
                  type="button"
                >
                  <Upload className="h-4 w-4" /> Upload Photo
                </Button>
                <input 
                  id="mobile-file-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>

              <Button 
                variant="outline" 
                className="w-full flex items-center gap-2 h-9 text-sm"
                onClick={() => setOpenStockImagesDialog(true)}
                type="button"
              >
                <Image className="h-4 w-4" /> Browse Stock Images
              </Button>

              {formData.eventImage && (
                <Button 
                  variant="outline" 
                  className="w-full h-9 text-sm text-red-600 border-red-200"
                  onClick={() => {
                    handleImageSelected('');
                    toast.success('Reset to default image');
                  }}
                  type="button"
                >
                  Use Default Image
                </Button>
              )}
            </div>
          )}
        </Card>
        
        {/* Essential Info Card */}
        <Card className="p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Activity name *</Label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="What are you doing?"
                className="mt-1 h-11 text-base"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Description *</Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell people what to expect..."
                className="mt-1 min-h-[80px] text-base resize-none"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Location *</Label>
              <div className="relative mt-1">
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Where is it happening?"
                  className="pl-9 h-11 text-base"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Meetup spot <span className="text-gray-400">(optional)</span></Label>
              <div className="relative mt-1">
                <Input
                  name="meetupSpot"
                  value={formData.meetupSpot || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., By the fountain, near the main entrance"
                  className="pl-9 h-11 text-base"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                🔒 Only confirmed participants will see this specific meetup location
              </p>
            </div>
          </div>
        </Card>

        {/* Date & Time Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium">When *</Label>
          </div>
          <DateTimeSection
            date={date}
            time={formData.time}
            duration={formData.duration}
            setDate={setDate}
            onInputChange={handleInputChange}
          />
        </Card>

        {/* Category Card */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Category * (max 3)</Label>
            <span className="text-xs text-gray-500">{categories.length}/3</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
                    "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : canSelect
                      ? "border-gray-200 hover:border-gray-300 text-gray-600"
                      : "border-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <span className="text-base">{category.icon}</span>
                  <span className="truncate">{category.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Recurring Options */}
        {(isPremium || canCreateRecurring) && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-purple-500" />
                <Label className="text-sm font-medium">Make it recurring</Label>
                {!isPremium && (
                  <Badge variant="secondary" className="text-xs">
                    {recurringEventsThisMonth}/{monthlyRecurringLimit}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => {
                    handleSwitchChange('isRecurring', checked);
                    if (checked) setShowRecurring(true);
                  }}
                  disabled={!canCreateRecurring}
                />
                {formData.isRecurring && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecurring(!showRecurring)}
                    className="p-1"
                  >
                    {showRecurring ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>

            {formData.isRecurring && showRecurring && (
              <div className="mt-4 space-y-3 pt-3 border-t">
                <div>
                  <Label className="text-sm font-medium">Repeat pattern</Label>
                  <Select value={formData.recurrencePattern} onValueChange={handlePatternChange}>
                    <SelectTrigger className="mt-1 h-11">
                      <SelectValue placeholder="How often?" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly (every 2 weeks)</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      {isPremium && (
                        <SelectItem value="custom">Custom interval</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrencePattern === 'custom' && isPremium && (
                  <div>
                    <Label className="text-sm font-medium">Custom interval (days)</Label>
                    <Input
                      name="recurrenceInterval"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.recurrenceInterval}
                      onChange={handleInputChange}
                      className="mt-1 h-11"
                      placeholder="Days between events"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Max occurrences (optional)</Label>
                  <Input
                    name="recurrenceEndCount"
                    type="number"
                    min="1"
                    max={isPremium ? 100 : 10}
                    value={formData.recurrenceEndCount || ''}
                    onChange={handleInputChange}
                    className="mt-1 h-11"
                    placeholder={`Up to ${isPremium ? 100 : 10} events`}
                  />
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Upgrade prompt for recurring */}
        {!isPremium && !canCreateRecurring && (
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <div className="text-center space-y-2">
              <div className="text-purple-600 font-medium text-sm">
                You've used {recurringEventsThisMonth}/{monthlyRecurringLimit} recurring activities this month
              </div>
              <Button size="sm" variant="default" className="bg-purple-600 hover:bg-purple-700">
                Upgrade for Unlimited
              </Button>
            </div>
          </Card>
        )}

        {/* Premium Features Preview */}
        {!isPremium && (
          <div className="space-y-3">
            <UpgradeCTA 
              variant="banner"
              feature="Premium Features Coming Soon!"
              benefit="Advanced scheduling & more"
            />
          </div>
        )}

        {/* Form Status */}
        <div className="bg-white p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isFormValid() ? "bg-green-500" : "bg-orange-500"
            )} />
            <span className="text-sm text-gray-600">
              {isFormValid() ? "Ready to create!" : "Please fill all required fields (*)"}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <EventFormActions />

      {/* Stock Images Dialog */}
      <Dialog open={openStockImagesDialog} onOpenChange={setOpenStockImagesDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Browse Stock Images</DialogTitle>
            <DialogDescription>
              Select an image from our curated collection
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <UltraFastImageSelector
              onImageSelected={(imageUrl) => {
                handleImageSelected(imageUrl);
              }}
              onClose={() => {
                setOpenStockImagesDialog(false);
                setShowImageOptions(false);
              }}
              activityCategory={categories[0]}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileFriendlyEventForm;