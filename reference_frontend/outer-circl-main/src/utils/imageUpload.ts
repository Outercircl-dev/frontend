import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  url: string;
  error?: string;
}

/**
 * Upload an avatar image to Supabase storage
 */
export const uploadAvatar = async (file: File, userId: string): Promise<UploadResult> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

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
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return { url: publicUrl };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Failed to upload avatar' 
    };
  }
};

/**
 * Upload a banner image to Supabase storage
 */
export const uploadBanner = async (file: File, userId: string): Promise<UploadResult> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/banner.${fileExt}`;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(fileName, file, {
        upsert: true, // Replace existing file
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('banners')
      .getPublicUrl(fileName);

    // Update user profile with new banner URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ banner_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return { url: publicUrl };
  } catch (error) {
    console.error('Error uploading banner:', error);
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Failed to upload banner' 
    };
  }
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Please select a valid image file (JPEG, PNG, or WebP)' 
    };
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'Image file size must be less than 5MB' 
    };
  }

  return { valid: true };
};