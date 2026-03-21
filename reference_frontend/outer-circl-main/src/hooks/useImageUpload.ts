import { useState } from 'react';
import { uploadAvatar, uploadBanner, validateImageFile } from '@/utils/imageUpload';
import { toast } from 'sonner';

interface UseImageUploadProps {
  userId: string;
  onSuccess?: (url: string) => void;
}

export const useImageUpload = ({ userId, onSuccess }: UseImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (file: File, type: 'avatar' | 'banner') => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    uploadImage(file, type);
  };

  const uploadImage = async (file: File, type: 'avatar' | 'banner') => {
    setUploading(true);
    
    try {
      const result = type === 'avatar' 
        ? await uploadAvatar(file, userId)
        : await uploadBanner(file, userId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${type === 'avatar' ? 'Profile' : 'Banner'} image updated successfully!`);
        onSuccess?.(result.url);
      }
    } catch (error) {
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = (type: 'avatar' | 'banner') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleFileSelect(file, type);
      }
    };
    input.click();
  };

  return {
    uploading,
    triggerFileInput,
    handleFileSelect
  };
};