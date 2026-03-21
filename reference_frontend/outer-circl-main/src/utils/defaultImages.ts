import { supabase } from '@/integrations/supabase/client';

let defaultImages: string[] = [];

// Get the outercircle logo from Supabase storage
const getOutercircleLogoUrl = () => {
  const { data } = supabase.storage
    .from('activitystockimages')
    .getPublicUrl('LogoAi-outer circl-Mockups5.jpg');
  return data.publicUrl;
};

// Outercircle logo as the primary default
export const OUTERCIRCLE_DEFAULT_IMAGE = getOutercircleLogoUrl();

export const loadDefaultImages = async (): Promise<string[]> => {
  if (defaultImages.length > 0) {
    return defaultImages;
  }

  try {
    const { data: files, error } = await supabase.storage
      .from('activitystockimages')
      .list('', {
        limit: 10,
        offset: 0,
      });

    if (error) {
      console.error('Error fetching default images:', error);
      return [];
    }

    if (files) {
      const imageFiles = files.filter(file => 
        file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i)
      );

      const imageUrls = imageFiles.map(file => {
        const { data } = supabase.storage
          .from('activitystockimages')
          .getPublicUrl(file.name);
        
        return data.publicUrl;
      });

      defaultImages = imageUrls;
      return imageUrls;
    }
  } catch (error) {
    console.error('Error loading default images:', error);
  }

  return [];
};

export const getRandomDefaultImage = async (): Promise<string> => {
  const images = await loadDefaultImages();
  
  if (images.length === 0) {
    return '';
  }

  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
};

export const getDefaultImageByCategory = async (category?: string): Promise<string> => {
  // Always return the outercircle logo as the primary default
  return OUTERCIRCLE_DEFAULT_IMAGE;
};

// Function to get the outercircle default image
export const getOutercircleDefaultImage = (): string => {
  return OUTERCIRCLE_DEFAULT_IMAGE;
};