
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Label } from '@/components/ui/label';
import { Shield, Users, Globe, Lock } from 'lucide-react';
import { useProfilePrivacy, PrivacySettings, ProfileVisibility } from '@/hooks/useProfilePrivacy';

interface PrivacySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  open,
  onOpenChange,
  userId
}) => {
  const { privacySettings, loading, updatePrivacySettings } = useProfilePrivacy(userId);

  const handleVisibilityChange = (visibility: ProfileVisibility) => {
    updatePrivacySettings({ profile_visibility: visibility });
  };


  if (loading || !privacySettings) {
    return null;
  }

  const visibilityOptions = [
    {
      value: 'public' as ProfileVisibility,
      label: 'Public',
      description: 'Anyone can view your profile',
      icon: Globe
    },
    {
      value: 'friends' as ProfileVisibility,
      label: 'Friends Only',
      description: 'Only your friends can view your profile',
      icon: Users
    },
    {
      value: 'private' as ProfileVisibility,
      label: 'Private',
      description: 'Only you can view your profile',
      icon: Lock
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-salmon" />
            Privacy Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Profile Visibility</Label>
            <Select
              value={privacySettings.profile_visibility}
              onValueChange={handleVisibilityChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-green-600" />
              <Label className="text-sm font-medium text-green-700">Friend Requests Always Enabled</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone can send you friend requests to help you connect and discover new activities together.
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full"
              variant="outline"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacySettingsModal;
