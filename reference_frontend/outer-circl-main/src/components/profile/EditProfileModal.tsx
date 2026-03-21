
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import ProfileImageUpload from './ProfileImageUpload';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileData: any;
  onProfileUpdate: (updatedProfile: any) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  open,
  onOpenChange,
  profileData,
  onProfileUpdate
}) => {
  console.log('🏗️ EditProfileModal rendering with open:', open, 'profileData:', profileData?.name);
  const [formData, setFormData] = useState({
    name: profileData?.name || '',
    username: profileData?.username || '',
    location: profileData?.location || '',
    bio: profileData?.bio || '',
    occupation: profileData?.occupation || '',
    education_level: profileData?.education_level || '',
    gender: profileData?.gender || ''
  });

  // State for sensitive data (managed separately for security)
  const [sensitiveData, setSensitiveData] = useState({
    email: '',
    phone: '',
    birth_month: '',
    birth_year: ''
  });

  const [avatarUrl, setAvatarUrl] = useState(profileData?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Load sensitive data when modal opens
  useEffect(() => {
    if (open && profileData?.id) {
      loadSensitiveData();
    }
  }, [open, profileData?.id]);

  const loadSensitiveData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles_sensitive')
        .select('email, phone, birth_month, birth_year')
        .eq('id', profileData.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading sensitive data:', error);
        return;
      }

      if (data) {
        setSensitiveData({
          email: data.email || '',
          phone: data.phone || '',
          birth_month: data.birth_month?.toString() || '',
          birth_year: data.birth_year?.toString() || ''
        });
      }
    } catch (error) {
      console.error('Error loading sensitive data:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear username error when user starts typing
    if (field === 'username') {
      setUsernameError('');
    }
  };

  const handleSensitiveInputChange = (field: string, value: string) => {
    setSensitiveData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === profileData?.username) {
      setUsernameError('');
      return true;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase.rpc('check_username_available', {
        username_to_check: username,
        current_user_id: profileData?.id
      });

      if (error) throw error;

      if (!data) {
        setUsernameError('This username is already taken');
        return false;
      }

      setUsernameError('');
      return true;
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username availability');
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameBlur = () => {
    if (formData.username) {
      checkUsernameAvailability(formData.username);
    }
  };

  const handleSave = async () => {
    console.log('🚀 handleSave function called! Current state:', {
      saving,
      usernameError,
      checkingUsername,
      profileData: !!profileData,
      formData,
      sensitiveData
    });
    
    // Add immediate error boundary
    try {
      setSaving(true);
      console.log('🔄 Setting saving to true');

    } catch (immediateError) {
      console.error('❌ Immediate error in handleSave:', immediateError);
      setSaving(false);
      return;
    }

    try {
      // Validate required data
      if (!profileData?.id) {
        console.error('❌ Profile ID is missing');
        toast.error('Profile ID is missing. Please try refreshing the page.');
        setSaving(false);
        return;
      }

      console.log('✅ Profile ID found:', profileData.id);

      // Check username availability one more time before saving
      if (formData.username && formData.username !== profileData?.username) {
        console.log('🔍 Checking username availability for:', formData.username);
        const isAvailable = await checkUsernameAvailability(formData.username);
        if (!isAvailable) {
          console.error('❌ Username not available');
          setSaving(false);
          return;
        }
        console.log('✅ Username is available');
      }

      // Prepare public profile data (non-sensitive)
      const publicUpdateData = {
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        location: formData.location,
        occupation: formData.occupation,
        education_level: formData.education_level,
        gender: formData.gender,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };

      // Prepare sensitive data update
      const sensitiveUpdateData = {
        email: sensitiveData.email,
        phone: sensitiveData.phone,
        birth_month: sensitiveData.birth_month ? parseInt(sensitiveData.birth_month) : null,
        birth_year: sensitiveData.birth_year ? parseInt(sensitiveData.birth_year) : null
      };

      console.log('📝 Updating public profile data:', publicUpdateData);
      
      // Update public profile data
      const { data, error } = await supabase
        .from('profiles')
        .update(publicUpdateData)
        .eq('id', profileData.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Profile update failed:', error);
        throw error;
      }
      
      console.log('✅ Profile updated successfully:', data);

      // Update sensitive data separately
      const { error: sensitiveError } = await supabase
        .from('profiles_sensitive')
        .upsert({
          id: profileData.id,
          ...sensitiveUpdateData,
          last_security_check: new Date().toISOString()
        });

      if (sensitiveError) {
        console.error('❌ Sensitive data update failed:', sensitiveError);
        throw sensitiveError;
      }

      // Update local state
      onProfileUpdate(data);
      onOpenChange(false);
      toast.success('Profile updated successfully!');

    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      if (error.code === '23505' && error.constraint === 'profiles_username_unique') {
        setUsernameError('This username is already taken');
        toast.error('Username is already taken');
      } else {
        toast.error('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border-0 shadow-2xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent text-center">
            Edit Your Profile
          </DialogTitle>
          <p className="text-gray-600 text-center mt-2">Make your profile shine and connect with others</p>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Profile Picture Section */}
          <ProfileImageUpload
            currentAvatarUrl={avatarUrl}
            onAvatarUpdate={setAvatarUrl}
          />

          {/* Basic Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></span>
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username *</Label>
                <div className="relative">
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                    onBlur={handleUsernameBlur}
                    placeholder="Choose a unique username"
                    className={`rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200 ${usernameError ? 'border-red-300' : ''}`}
                    required
                  />
                  {checkingUsername && (
                    <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-gray-400" />
                  )}
                </div>
                {usernameError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {usernameError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={sensitiveData.email}
                  onChange={(e) => handleSensitiveInputChange('email', e.target.value)}
                  placeholder="your@email.com"
                  className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={sensitiveData.phone}
                  onChange={(e) => handleSensitiveInputChange('phone', e.target.value)}
                  placeholder="Phone number"
                  className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                />
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
              <Input
                id="location"
                name="location"
                autoComplete="address-level2"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Country"
                className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
              />
            </div>

            <div className="space-y-2 mt-6">
              <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200 resize-none"
              />
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-gradient-to-b from-purple-500 to-blue-600 rounded-full"></span>
              Personal Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Birth Month</Label>
                <Select value={sensitiveData.birth_month} onValueChange={(value) => handleSensitiveInputChange('birth_month', value)}>
                  <SelectTrigger className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Birth Year</Label>
                <Select value={sensitiveData.birth_year} onValueChange={(value) => handleSensitiveInputChange('birth_year', value)}>
                  <SelectTrigger className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-gradient-to-b from-blue-500 to-teal-600 rounded-full"></span>
              Professional Info
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-sm font-medium text-gray-700">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                  placeholder="Your job title"
                  className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Education Level</Label>
                <Select value={formData.education_level} onValueChange={(value) => handleInputChange('education_level', value)}>
                  <SelectTrigger className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200">
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="high-school">High School</SelectItem>
                    <SelectItem value="associate">Associate Degree</SelectItem>
                    <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                    <SelectItem value="master">Master's Degree</SelectItem>
                    <SelectItem value="doctorate">Doctorate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="px-8 py-3 rounded-full border-gray-200 hover:border-gray-300 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                console.log('💾 Save button clicked! Button state:', {
                  saving,
                  usernameError,
                  checkingUsername,
                  isDisabled: saving || !!usernameError || checkingUsername,
                  event: e
                });
                console.log('🔍 Current form data:', formData);
                console.log('🔍 Current sensitive data:', sensitiveData);
                handleSave();
              }}
              disabled={saving || !!usernameError || checkingUsername}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
