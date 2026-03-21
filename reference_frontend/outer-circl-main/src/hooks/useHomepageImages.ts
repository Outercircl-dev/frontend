import { useState, useEffect } from 'react';
import { useStockImages } from './useStockImages';
import { HOMEPAGE_IMAGES, IMAGE_ALT_TEXTS } from '@/utils/imageMapping';

interface HomepageImage {
  url: string;
  prompt: string;
}

interface HomepageImages {
  howItWorks: {
    foodExperience: HomepageImage | null;
    hikingActivity: HomepageImage | null;
    friendsMeeting: HomepageImage | null;
    groupActivity: HomepageImage | null;
  };
  saveIdeas: {
    outdoorActivities: HomepageImage | null;
    cookingClasses: HomepageImage | null;
    gardeningMeetup: HomepageImage | null;
    socialGaming: HomepageImage | null;
  };
}

// Enhanced fallback images using stock images as primary, with original URLs as backup
const FALLBACK_IMAGES = {
  howItWorks: {
    foodExperience: { url: HOMEPAGE_IMAGES.HOW_IT_WORKS.FOOD_EXPERIENCE, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.FOOD_EXPERIENCE },
    hikingActivity: { url: HOMEPAGE_IMAGES.HOW_IT_WORKS.HIKING_ACTIVITY, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.HIKING_ACTIVITY },
    friendsMeeting: { url: HOMEPAGE_IMAGES.HOW_IT_WORKS.FRIENDS_MEETING, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.FRIENDS_MEETING },
    groupActivity: { url: HOMEPAGE_IMAGES.HOW_IT_WORKS.GROUP_ACTIVITY, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.GROUP_ACTIVITY }
  },
  saveIdeas: {
    outdoorActivities: { url: HOMEPAGE_IMAGES.SAVE_IDEAS.OUTDOOR_ACTIVITIES, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.OUTDOOR_ACTIVITIES },
    cookingClasses: { url: HOMEPAGE_IMAGES.SAVE_IDEAS.COOKING_CLASSES, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.COOKING_CLASSES },
    gardeningMeetup: { url: HOMEPAGE_IMAGES.SAVE_IDEAS.GARDENING_MEETUP, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.GARDENING_MEETUP },
    socialGaming: { url: HOMEPAGE_IMAGES.SAVE_IDEAS.SOCIAL_GAMING, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.SOCIAL_GAMING }
  }
};

export const useHomepageImages = () => {
  const { images: stockImages, isLoading: stockLoading } = useStockImages();
  const [images, setImages] = useState<HomepageImages>(FALLBACK_IMAGES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Combine stock images with fallbacks
    if (!stockLoading) {
      setImages({
        howItWorks: {
          foodExperience: stockImages.howItWorks.foodExperience 
            ? { url: stockImages.howItWorks.foodExperience, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.FOOD_EXPERIENCE }
            : FALLBACK_IMAGES.howItWorks.foodExperience,
          hikingActivity: stockImages.howItWorks.hikingActivity
            ? { url: stockImages.howItWorks.hikingActivity, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.HIKING_ACTIVITY }
            : FALLBACK_IMAGES.howItWorks.hikingActivity,
          friendsMeeting: stockImages.howItWorks.friendsMeeting
            ? { url: stockImages.howItWorks.friendsMeeting, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.FRIENDS_MEETING }
            : FALLBACK_IMAGES.howItWorks.friendsMeeting,
          groupActivity: stockImages.howItWorks.groupActivity
            ? { url: stockImages.howItWorks.groupActivity, prompt: IMAGE_ALT_TEXTS.HOW_IT_WORKS.GROUP_ACTIVITY }
            : FALLBACK_IMAGES.howItWorks.groupActivity
        },
        saveIdeas: {
          outdoorActivities: stockImages.saveIdeas.outdoorActivities
            ? { url: stockImages.saveIdeas.outdoorActivities, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.OUTDOOR_ACTIVITIES }
            : FALLBACK_IMAGES.saveIdeas.outdoorActivities,
          cookingClasses: stockImages.saveIdeas.cookingClasses
            ? { url: stockImages.saveIdeas.cookingClasses, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.COOKING_CLASSES }
            : FALLBACK_IMAGES.saveIdeas.cookingClasses,
          gardeningMeetup: stockImages.saveIdeas.gardeningMeetup
            ? { url: stockImages.saveIdeas.gardeningMeetup, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.GARDENING_MEETUP }
            : FALLBACK_IMAGES.saveIdeas.gardeningMeetup,
          socialGaming: stockImages.saveIdeas.socialGaming
            ? { url: stockImages.saveIdeas.socialGaming, prompt: IMAGE_ALT_TEXTS.SAVE_IDEAS.SOCIAL_GAMING }
            : FALLBACK_IMAGES.saveIdeas.socialGaming
        }
      });
      setIsLoading(false);
    }
  }, [stockImages, stockLoading]);

  return {
    images,
    isLoading
  };
};