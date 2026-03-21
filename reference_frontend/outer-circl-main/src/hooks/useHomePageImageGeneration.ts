import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedImage {
  url: string;
  prompt: string;
}

interface ImageCategories {
  howItWorks: {
    foodExperience: GeneratedImage | null;
    hikingActivity: GeneratedImage | null;
    friendsMeeting: GeneratedImage | null;
    groupActivity: GeneratedImage | null;
  };
  saveIdeas: {
    outdoorActivities: GeneratedImage | null;
    cookingClasses: GeneratedImage | null;
    gardeningMeetup: GeneratedImage | null;
    socialGaming: GeneratedImage | null;
  };
}

const IMAGE_PROMPTS = {
  howItWorks: {
    foodExperience: "People searching and discovering outdoor yoga classes together, diverse group practicing yoga in a beautiful park setting, Pinterest aesthetic, natural lighting, community wellness activity",
    hikingActivity: "Friends searching for and joining a board games meetup, diverse group around a table playing board games in a cozy coffee shop, warm lighting, social gaming atmosphere",
    friendsMeeting: "People starting their own activity and others joining, diverse group organizing a community event together, collaborative planning, warm social atmosphere, Pinterest-style gathering",
    groupActivity: "New people discovering and joining an existing activity group, diverse friends welcoming newcomers to their hobby meetup, inclusive community vibe, cozy indoor setting"
  },
  saveIdeas: {
    outdoorActivities: "Outdoor adventure activities with friends, hiking or rock climbing, beautiful natural landscape, people enjoying nature together, inspirational outdoor scene",
    cookingClasses: "Professional cooking class with multiple people learning together, chef instructor, modern kitchen setting, people engaged in cooking",
    gardeningMeetup: "Community gardening group working together in a beautiful garden, people planting and tending to plants, social gardening activity, bright natural lighting",
    socialGaming: "Friends playing board games or card games together indoors, cozy setting, people laughing and having fun, warm social atmosphere"
  }
};

export const useHomePageImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<ImageCategories>({
    howItWorks: {
      foodExperience: null,
      hikingActivity: null,
      friendsMeeting: null,
      groupActivity: null,
    },
    saveIdeas: {
      outdoorActivities: null,
      cookingClasses: null,
      gardeningMeetup: null,
      socialGaming: null,
    }
  });

  // Load existing images from database on mount
  useEffect(() => {
    loadExistingImages();
  }, []);

  const loadExistingImages = useCallback(async () => {
    try {
      const { data: existingImages, error } = await supabase
        .from('homepage_images')
        .select('category, image_key, image_url, prompt');

      if (error) {
        console.error('Error loading existing images:', error);
        return;
      }

      if (existingImages && existingImages.length > 0) {
        const newImages: ImageCategories = {
          howItWorks: {
            foodExperience: null,
            hikingActivity: null,
            friendsMeeting: null,
            groupActivity: null,
          },
          saveIdeas: {
            outdoorActivities: null,
            cookingClasses: null,
            gardeningMeetup: null,
            socialGaming: null,
          }
        };

        existingImages.forEach((img) => {
          if (img.category in newImages && img.image_key in newImages[img.category as keyof ImageCategories]) {
            (newImages[img.category as keyof ImageCategories] as any)[img.image_key] = {
              url: img.image_url,
              prompt: img.prompt
            };
          }
        });

        setImages(newImages);
      }
    } catch (error) {
      console.error('Error in loadExistingImages:', error);
    }
  }, []);

  const saveImageToDatabase = useCallback(async (category: string, imageKey: string, imageUrl: string, prompt: string) => {
    try {
      const { error } = await supabase
        .from('homepage_images')
        .upsert({
          category,
          image_key: imageKey,
          image_url: imageUrl,
          prompt
        }, {
          onConflict: 'category,image_key'
        });

      if (error) {
        console.error('Error saving image to database:', error);
        toast.error('Failed to save image to database');
      }
    } catch (error) {
      console.error('Error in saveImageToDatabase:', error);
    }
  }, []);

  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    try {
      console.log('Generating image with prompt:', prompt);
      
      const { data, error } = await supabase.functions.invoke('generate-activity-image', {
        body: { prompt }
      });

      if (error) {
        console.error('Error generating image:', error);
        toast.error('Failed to generate image');
        return null;
      }

      if (data?.success && data?.imageUrl) {
        console.log('Image generated successfully');
        return data.imageUrl;
      } else {
        console.error('Invalid response from image generation:', data);
        toast.error('Invalid response from image generation service');
        return null;
      }
    } catch (error) {
      console.error('Error in generateImage:', error);
      toast.error('Failed to generate image');
      return null;
    }
  }, []);

  const generateAllImages = useCallback(async () => {
    setIsGenerating(true);
    toast.info('Generating homepage images... This may take a few minutes.');

    try {
      const newImages: ImageCategories = {
        howItWorks: {
          foodExperience: null,
          hikingActivity: null,
          friendsMeeting: null,
          groupActivity: null,
        },
        saveIdeas: {
          outdoorActivities: null,
          cookingClasses: null,
          gardeningMeetup: null,
          socialGaming: null,
        }
      };

      // Generate How It Works images
      const howItWorksPromises = Object.entries(IMAGE_PROMPTS.howItWorks).map(async ([key, prompt]) => {
        const imageUrl = await generateImage(prompt);
        if (imageUrl) {
          newImages.howItWorks[key as keyof typeof newImages.howItWorks] = {
            url: imageUrl,
            prompt
          };
          await saveImageToDatabase('howItWorks', key, imageUrl, prompt);
        }
      });

      // Generate Save Ideas images
      const saveIdeasPromises = Object.entries(IMAGE_PROMPTS.saveIdeas).map(async ([key, prompt]) => {
        const imageUrl = await generateImage(prompt);
        if (imageUrl) {
          newImages.saveIdeas[key as keyof typeof newImages.saveIdeas] = {
            url: imageUrl,
            prompt
          };
          await saveImageToDatabase('saveIdeas', key, imageUrl, prompt);
        }
      });

      await Promise.all([...howItWorksPromises, ...saveIdeasPromises]);

      setImages(newImages);
      toast.success('Homepage images generated successfully!');
    } catch (error) {
      console.error('Error generating all images:', error);
      toast.error('Failed to generate some images');
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage, saveImageToDatabase]);

  const generateSingleImage = useCallback(async (category: keyof ImageCategories, imageKey: string) => {
    setIsGenerating(true);
    
    try {
      const prompt = IMAGE_PROMPTS[category][imageKey as keyof typeof IMAGE_PROMPTS[typeof category]];
      const imageUrl = await generateImage(prompt);
      
      if (imageUrl) {
        setImages(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [imageKey]: {
              url: imageUrl,
              prompt
            }
          }
        }));
        await saveImageToDatabase(category, imageKey, imageUrl, prompt);
        toast.success('Image generated successfully!');
      }
    } catch (error) {
      console.error('Error generating single image:', error);
      toast.error('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage, saveImageToDatabase]);

  return {
    images,
    isGenerating,
    generateAllImages,
    generateSingleImage
  };
};