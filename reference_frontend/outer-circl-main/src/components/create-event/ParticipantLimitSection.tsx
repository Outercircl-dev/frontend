
import React from 'react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Users, ShieldCheck } from 'lucide-react';
import { useMembership } from '@/components/OptimizedProviders';
import { useEventForm } from './EventFormProvider';

const ParticipantLimitSection: React.FC = () => {
  const { membershipTier } = useMembership();
  const { formData, handleSwitchChange, handleInputChange } = useEventForm();
  const isPremium = membershipTier === 'premium';
  
  const maxAttendeesValue = parseInt(formData.maxAttendees);

  const handleMaxAttendeesChange = (value: string) => {
    const syntheticEvent = {
      target: { name: 'maxAttendees', value }
    } as React.ChangeEvent<HTMLSelectElement>;
    handleInputChange(syntheticEvent);
  };

  const handleSliderChange = (value: number[]) => {
    const attendeeLimit = value[0].toString();
    const syntheticEvent = {
      target: { name: 'maxAttendees', value: attendeeLimit }
    } as React.ChangeEvent<HTMLSelectElement>;
    handleInputChange(syntheticEvent);
  };

  return (
    <Card className="p-4 bg-gray-50 border-pink-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="maxAttendees" className="text-xs font-medium">
            Participant Limit
          </Label>
          {isPremium && (
            <div className="text-[10px] py-0.5 px-2 bg-pink-100 text-pink-600 rounded-full">
              Premium
            </div>
          )}
        </div>
        
        {isPremium ? (
          <div className="text-xs font-medium text-pink-600">
            {maxAttendeesValue === 50 ? 'Unlimited' : maxAttendeesValue} participants
          </div>
        ) : (
          <Select
            value={formData.maxAttendees}
            onValueChange={handleMaxAttendeesChange}
          >
            <SelectTrigger className="w-20 h-7 text-xs">
              <SelectValue placeholder="4" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      
      {isPremium && (
        <div className="py-2">
          <Slider 
            defaultValue={[maxAttendeesValue]} 
            max={50} 
            min={2} 
            step={1} 
            onValueChange={handleSliderChange} 
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>2</span>
            <span>Unlimited (50)</span>
          </div>
        </div>
      )}
      
      {isPremium ? (
        <div className="space-y-3 mt-3">
          <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
            <div>
              <Label htmlFor="approvalRequired" className="text-xs font-medium">
                Approve participants
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Review before they can join
              </p>
            </div>
            <Switch
              id="approvalRequired"
              checked={formData.approvalRequired}
              onCheckedChange={(checked) => handleSwitchChange('approvalRequired', checked)}
              className="scale-75 data-[state=checked]:bg-pink-600"
            />
          </div>
          
          <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
            <div>
              <Label htmlFor="autoConfirm" className="text-xs font-medium">
                Auto-confirm with 3+ participants
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Confirm when 3+ people join
              </p>
            </div>
            <Switch
              id="autoConfirm"
              checked={formData.autoConfirm}
              onCheckedChange={(checked) => handleSwitchChange('autoConfirm', checked)}
              className="scale-75 data-[state=checked]:bg-pink-600"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border border-pink-100">
            <Users className="h-3.5 w-3.5 text-pink-500" />
            <div>
              <p className="text-xs font-medium text-pink-600">Standard Limit: 4 participants</p>
              <p className="text-[10px] text-pink-500">
                Including you as the host
              </p>
            </div>
          </div>
          <Link to="/membership" className="flex items-center justify-center w-full bg-[#E60023] hover:bg-[#D50C22] text-white font-medium py-1.5 text-xs rounded-md transition-colors shadow-sm">
            <span className="mr-1">Upgrade to Premium</span>
            <ShieldCheck className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </Card>
  );
};

export default ParticipantLimitSection;
