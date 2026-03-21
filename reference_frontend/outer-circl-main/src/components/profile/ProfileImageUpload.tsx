
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';

interface ProfileImageUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (url: string) => void;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  currentAvatarUrl,
  onAvatarUpdate
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);

    try {
      // Create a preview URL immediately for better UX
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true, // Replace existing file
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(publicUrl);
      onAvatarUpdate(publicUrl);
      toast.success('Profile picture updated!');

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
      setPreviewUrl(currentAvatarUrl || '');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update user profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setPreviewUrl('');
      onAvatarUpdate('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-100">
      {/* Avatar Preview */}
      <div className="relative">
        <UserAvatar
          name="User"
          avatarUrl={previewUrl}
          size="lg"
          className="border-4 border-white shadow-xl ring-2 ring-pink-200"
        />
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {/* Hover overlay for existing image */}
        {previewUrl && !uploading && (
          <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer" onClick={handleButtonClick}>
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex-1 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Profile Picture</h3>
          <p className="text-sm text-gray-600">
            Show your personality with a great photo
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleButtonClick}
            disabled={uploading}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Camera className="h-4 w-4" />
            {previewUrl ? 'Change Photo' : 'Add Photo'}
          </Button>

          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveImage}
              disabled={uploading}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 rounded-full px-6 py-2 transition-all duration-200"
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Recommended: Square image, at least 400x400px (JPG, PNG, max 5MB)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ProfileImageUpload;
