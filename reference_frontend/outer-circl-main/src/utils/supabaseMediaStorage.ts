import { supabase } from '@/integrations/supabase/client';

export interface UserMedia {
  id: string;
  url: string;
  caption?: string;
  type: 'image' | 'video' | 'gif';
  timestamp: string;
  file_name?: string;
  file_size?: number;
}

export interface SupabaseUserMedia {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  media_type: 'image' | 'video' | 'gif';
  caption?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Upload media file to Supabase storage
 */
export const uploadMediaToSupabase = async (
  file: File, 
  userId: string, 
  caption?: string
): Promise<{ success: boolean; data?: UserMedia; error?: string }> => {
  try {
    // Validate file
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Determine media type
    let mediaType: 'image' | 'video' | 'gif' = 'image';
    if (file.type.includes('video')) {
      mediaType = 'video';
    } else if (file.type === 'image/gif') {
      mediaType = 'gif';
    }

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);

    // Save metadata to database
    const { data: metadataData, error: metadataError } = await supabase
      .from('user_media')
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        media_type: mediaType,
        caption: caption?.trim() || null,
        file_size: file.size
      })
      .select()
      .single();

    if (metadataError) {
      // If metadata insert fails, clean up the uploaded file
      await supabase.storage.from('user-media').remove([filePath]);
      throw metadataError;
    }

    const userMedia: UserMedia = {
      id: metadataData.id,
      url: publicUrl,
      caption: metadataData.caption || undefined,
      type: metadataData.media_type as 'image' | 'video' | 'gif',
      timestamp: metadataData.created_at,
      file_name: metadataData.file_name,
      file_size: metadataData.file_size || undefined
    };

    return { success: true, data: userMedia };
  } catch (error) {
    console.error('Error uploading media:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload media' 
    };
  }
};

/**
 * Get user media from Supabase
 */
export const getUserMediaFromSupabase = async (userId: string): Promise<UserMedia[]> => {
  try {
    const { data, error } = await supabase
      .from('user_media')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data.map((item): UserMedia => {
      const { data: { publicUrl } } = supabase.storage
        .from('user-media')
        .getPublicUrl(item.file_path);

      return {
        id: item.id,
        url: publicUrl,
        caption: item.caption || undefined,
        type: item.media_type as 'image' | 'video' | 'gif',
        timestamp: item.created_at,
        file_name: item.file_name,
        file_size: item.file_size || undefined
      };
    });
  } catch (error) {
    console.error('Error fetching user media:', error);
    return [];
  }
};

/**
 * Delete media from Supabase
 */
export const deleteMediaFromSupabase = async (mediaId: string): Promise<boolean> => {
  try {
    // Get media metadata first
    const { data: mediaData, error: fetchError } = await supabase
      .from('user_media')
      .select('file_path')
      .eq('id', mediaId)
      .single();

    if (fetchError || !mediaData) {
      throw fetchError || new Error('Media not found');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('user-media')
      .remove([mediaData.file_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with metadata deletion even if storage deletion fails
    }

    // Delete metadata from database
    const { error: dbError } = await supabase
      .from('user_media')
      .delete()
      .eq('id', mediaId);

    if (dbError) {
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Error deleting media:', error);
    return false;
  }
};

/**
 * Update media caption
 */
export const updateMediaCaption = async (mediaId: string, caption: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_media')
      .update({ caption: caption.trim() || null })
      .eq('id', mediaId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error updating media caption:', error);
    return false;
  }
};

/**
 * Validate media file
 */
export const validateMediaFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Please select a valid media file (JPEG, PNG, GIF, WebP, MP4, WebM, MOV, AVI)' 
    };
  }

  // Check file size (100MB limit)
  const maxSize = 100 * 1024 * 1024; // 100MB in bytes
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File size must be less than 100MB' 
    };
  }

  return { valid: true };
};

/**
 * Get media by type
 */
export const getMediaByType = (media: UserMedia[], type: 'image' | 'video' | 'gif'): UserMedia[] => {
  return media.filter(item => item.type === type);
};