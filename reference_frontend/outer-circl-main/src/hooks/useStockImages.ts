import { useState, useEffect } from 'react';
import { stockImageService } from '@/services/stockImageService';

interface StockImages {
  howItWorks: {
    foodExperience: string | null;
    hikingActivity: string | null;
    friendsMeeting: string | null;
    groupActivity: string | null;
  };
  saveIdeas: {
    outdoorActivities: string | null;
    cookingClasses: string | null;
    gardeningMeetup: string | null;
    socialGaming: string | null;
  };
  features: {
    friendsLaughing: string | null;
    groupHiking: string | null;
    friendsCafe: string | null;
    groupGames: string | null;
  };
}

export const useStockImages = () => {
  const [images, setImages] = useState<StockImages>({
    howItWorks: {
      foodExperience: null,
      hikingActivity: null,
      friendsMeeting: null,
      groupActivity: null
    },
    saveIdeas: {
      outdoorActivities: null,
      cookingClasses: null,
      gardeningMeetup: null,
      socialGaming: null
    },
    features: {
      friendsLaughing: null,
      groupHiking: null,
      friendsCafe: null,
      groupGames: null
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      let timeoutId: NodeJS.Timeout | undefined;
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🎯 useStockImages: Starting image load with 5s timeout');
        
        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('⏰ Image loading timed out after 5s (non-critical)');
          setIsLoading(false);
          setError('Image loading timed out (using fallbacks)');
        }, 5000);
        
        const homepageImages = await stockImageService.getHomepageImages();
        
        // Clear timeout if we got here
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        
        setImages({
          howItWorks: {
            foodExperience: homepageImages.howItWorks.foodExperience || null,
            hikingActivity: homepageImages.howItWorks.hikingActivity || null,
            friendsMeeting: homepageImages.howItWorks.friendsMeeting || null,
            groupActivity: homepageImages.howItWorks.groupActivity || null
          },
          saveIdeas: {
            outdoorActivities: homepageImages.saveIdeas.outdoorActivities || null,
            cookingClasses: homepageImages.saveIdeas.cookingClasses || null,
            gardeningMeetup: homepageImages.saveIdeas.gardeningMeetup || null,
            socialGaming: homepageImages.saveIdeas.socialGaming || null
          },
          features: {
            friendsLaughing: homepageImages.features.friendsLaughing || null,
            groupHiking: homepageImages.features.groupHiking || null,
            friendsCafe: homepageImages.features.friendsCafe || null,
            groupGames: homepageImages.features.groupGames || null
          }
        });
        
        console.log('✅ useStockImages: Images loaded successfully');
      } catch (err) {
        console.warn('⚠️ Error loading stock images (non-critical):', err);
        setError('Failed to load images (using fallbacks)');
      } finally {
        // Always clear timeout and set loading to false
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setIsLoading(false);
      }
    };

    loadImages();
  }, []);

  const getImageForActivity = async (title: string, description?: string, categories?: string[]) => {
    try {
      return await stockImageService.getImageForActivity(title, description, categories);
    } catch (err) {
      console.error('Error getting image for activity:', err);
      return null;
    }
  };

  const getImageByCategory = async (category: string, index?: number) => {
    try {
      return await stockImageService.getImageByCategory(category, index);
    } catch (err) {
      console.error('Error getting image by category:', err);
      return null;
    }
  };

  return {
    images,
    isLoading,
    error,
    getImageForActivity,
    getImageByCategory
  };
};