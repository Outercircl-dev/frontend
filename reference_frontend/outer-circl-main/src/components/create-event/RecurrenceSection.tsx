import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Crown, Repeat, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMembership } from '@/components/OptimizedProviders';
import { useRecurringActivityLimits } from '@/hooks/useRecurringActivityLimits';
import { FormData } from './EventFormProvider';

interface RecurrenceSectionProps {
  formData: FormData;
  onSwitchChange: (name: string, checked: boolean | string) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPatternChange: (value: string) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

const RecurrenceSection: React.FC<RecurrenceSectionProps> = ({
  formData,
  onSwitchChange,
  onInputChange,
  onPatternChange,
  onEndDateChange
}) => {
  const { membershipTier } = useMembership();
  const { recurringEventsThisMonth, monthlyRecurringLimit, canCreateRecurring } = useRecurringActivityLimits();
  const isPremium = membershipTier === 'premium';

  const getRecurrenceDescription = () => {
    if (!formData.isRecurring) return null;
    
    let description = '';
    switch (formData.recurrencePattern) {
      case 'weekly':
        description = 'Every week';
        break;
      case 'bi-weekly':
        description = 'Every 2 weeks';
        break;
      case 'monthly':
        description = 'Every month';
        break;
      case 'custom':
        description = `Every ${formData.recurrenceInterval} days`;
        break;
    }
    
    if (formData.recurrenceEndDate) {
      description += ` until ${format(formData.recurrenceEndDate, 'MMM dd, yyyy')}`;
    } else if (formData.recurrenceEndCount) {
      description += ` for ${formData.recurrenceEndCount} occurrences`;
    } else {
      description += ' (indefinitely)';
    }
    
    return description;
  };

  const handleRecurringToggle = (checked: boolean) => {
    onSwitchChange('isRecurring', checked);
    if (checked) {
      // Set recurring type based on membership
      onSwitchChange('recurringType', isPremium ? 'premium' : 'standard');
    }
  };

  const handlePatternChangeWithType = (value: string) => {
    onPatternChange(value);
    // Update recurring type if premium user selects custom
    if (isPremium && value === 'custom') {
      onSwitchChange('recurringType', 'premium');
    } else if (!isPremium) {
      onSwitchChange('recurringType', 'standard');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium text-foreground">Recurring Activity</Label>
          {!isPremium && (
            <Badge variant="secondary" className="bg-gradient-to-r from-accent/20 to-accent/30 text-accent-foreground border-accent/20">
              <Crown className="h-3 w-3 mr-1" />
              {canCreateRecurring ? 'Limited' : 'Upgrade Required'}
            </Badge>
          )}
        </div>
        
        <Switch
          checked={formData.isRecurring}
          onCheckedChange={handleRecurringToggle}
          disabled={!canCreateRecurring}
        />
      </div>

      {/* Usage Stats for Standard Users */}
      {!isPremium && (
        <div className="p-3 bg-gradient-to-br from-background to-accent/5 border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-accent/10 rounded-full">
              <Repeat className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Recurring Activities This Month</p>
                <Badge variant={canCreateRecurring ? "default" : "destructive"}>
                  {recurringEventsThisMonth} / {monthlyRecurringLimit}
                </Badge>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    canCreateRecurring ? "bg-primary" : "bg-destructive"
                  )}
                  style={{ 
                    width: `${Math.min((recurringEventsThisMonth / monthlyRecurringLimit) * 100, 100)}%` 
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {canCreateRecurring 
                    ? `${monthlyRecurringLimit - recurringEventsThisMonth} remaining`
                    : 'Monthly limit reached'
                  }
                </span>
                <span>Resets next month</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt for Standard Users */}
      {!isPremium && (
        <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Unlock Unlimited Recurring Activities</h4>
                <Button size="sm" variant="default" className="shrink-0">
                  Upgrade to Premium
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Premium members get unlimited recurring activities plus custom intervals and advanced scheduling.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Unlimited recurring events
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Custom repeat intervals
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Options */}
      {formData.isRecurring && canCreateRecurring && (
        <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-background border border-primary/20 rounded-lg">
          {/* Pattern Selection */}
          <div className="space-y-2">
            <Label htmlFor="recurrencePattern" className="text-sm font-medium">
              Repeat Pattern
              {!isPremium && (
                <span className="text-xs text-muted-foreground ml-2">(Standard options)</span>
              )}
            </Label>
            <Select value={formData.recurrencePattern} onValueChange={handlePatternChangeWithType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">
                  <div className="flex items-center gap-2">
                    <span>Weekly</span>
                    <span className="text-xs text-muted-foreground">(every 7 days)</span>
                  </div>
                </SelectItem>
                <SelectItem value="bi-weekly">
                  <div className="flex items-center gap-2">
                    <span>Bi-weekly</span>
                    <span className="text-xs text-muted-foreground">(every 14 days)</span>
                  </div>
                </SelectItem>
                <SelectItem value="monthly">
                  <div className="flex items-center gap-2">
                    <span>Monthly</span>
                    <span className="text-xs text-muted-foreground">(same date each month)</span>
                  </div>
                </SelectItem>
                {isPremium && (
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3 w-3 text-primary" />
                      <span>Custom interval</span>
                      <span className="text-xs text-muted-foreground">(premium)</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Interval (Premium Only) */}
          {formData.recurrencePattern === 'custom' && isPremium && (
            <div className="space-y-2 p-3 bg-gradient-to-br from-accent/10 to-background border border-accent/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <Label htmlFor="recurrenceInterval" className="text-sm font-medium">Custom Interval</Label>
              </div>
              <Input
                id="recurrenceInterval"
                name="recurrenceInterval"
                type="number"
                min="1"
                max="365"
                value={formData.recurrenceInterval}
                onChange={onInputChange}
                className="h-9"
                placeholder="Days between occurrences"
              />
              <p className="text-xs text-muted-foreground">
                Repeat every {formData.recurrenceInterval || 1} day{(formData.recurrenceInterval || 1) !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* End Conditions (Premium gets more options) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 justify-start text-left font-normal",
                      !formData.recurrenceEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.recurrenceEndDate ? (
                      format(formData.recurrenceEndDate, "PPP")
                    ) : (
                      <span>Select end date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.recurrenceEndDate}
                    onSelect={onEndDateChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Max Occurrences - Premium gets higher limits */}
            <div className="space-y-2">
              <Label htmlFor="recurrenceEndCount" className="text-sm font-medium">
                Max Occurrences (optional)
              </Label>
              <Input
                id="recurrenceEndCount"
                name="recurrenceEndCount"
                type="number"
                min="1"
                max={isPremium ? 100 : 10}
                value={formData.recurrenceEndCount || ''}
                onChange={onInputChange}
                className="h-9"
                placeholder={`Up to ${isPremium ? 100 : 10} events`}
              />
              <p className="text-xs text-muted-foreground">
                {isPremium ? 'Premium: Up to 100 occurrences' : 'Standard: Up to 10 occurrences'}
              </p>
            </div>
          </div>

          {/* Preview */}
          {getRecurrenceDescription() && (
            <div className="p-3 bg-background border border-border rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">Recurrence Preview:</p>
                  <p className="text-sm text-muted-foreground">{getRecurrenceDescription()}</p>
                  <p className="text-xs text-muted-foreground">
                    Future events will be automatically created up to 6 months in advance.
                    {!isPremium && ' Standard users get simplified scheduling options.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Limit Reached Notice */}
      {!canCreateRecurring && !isPremium && (
        <div className="p-4 bg-gradient-to-br from-destructive/5 to-background border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">Monthly Limit Reached</p>
              <p className="text-sm text-muted-foreground">
                You've created {recurringEventsThisMonth} of {monthlyRecurringLimit} recurring activities this month. 
                Your limit will reset on the 1st of next month.
              </p>
              <Button size="sm" variant="default" className="mt-2">
                Upgrade to Premium for Unlimited
                <Crown className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurrenceSection;