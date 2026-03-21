// Enhanced activity-to-image mapping - Now using local Unsplash images
export const ACTIVITY_IMAGE_MAPPING = {
  // Water & Fitness Activities
  'cold plunge': '/images/cold-plunge-1.jpg',
  'ice bath': '/images/cold-plunge-1.jpg',
  'swimming': '/images/cold-plunge-1.jpg',
  'water': '/images/cold-plunge-1.jpg',
  
  'hiking': '/images/hiking-scenic-1.jpg',
  'mountain': '/images/hiking-1.jpg',
  'nature walk': '/images/outdoor-adventure-1.jpg',
  'promenade': '/images/outdoor-adventure-1.jpg',
  'outdoor': '/images/outdoor-adventure-1.jpg',
  
  'jogging': '/images/jogging-1.jpg',
  'running': '/images/jogging-1.jpg',
  'fitness': '/images/jogging-1.jpg',
  'workout': '/images/jogging-1.jpg',
  
  // Sports activities
  'tennis': '/images/outdoor-adventure-1.jpg',
  'tennis game': '/images/outdoor-adventure-1.jpg',
  'sport': '/images/outdoor-adventure-1.jpg',
  'sports': '/images/outdoor-adventure-1.jpg',
  
  'coffee': '/images/friends-cafe-1.jpg',
  'cafe': '/images/friends-cafe-1.jpg',
  'coding': '/images/coffee-code-1.jpg',
  'tech meetup': '/images/coffee-code-1.jpg',
  'tech': '/images/coffee-code-1.jpg',
  'code': '/images/coffee-code-1.jpg',
  
  'cooking': '/images/cooking-class-1.jpg',
  'food': '/images/food-dining-1.jpg',
  'dining': '/images/food-dining-1.jpg',
  'culinary': '/images/cooking-class-1.jpg',
  
  'toddler': '/images/family-meetup-1.jpg',
  'family': '/images/family-meetup-1.jpg',
  'kids': '/images/family-meetup-1.jpg',
  'children': '/images/family-meetup-1.jpg',
  'playground': '/images/family-meetup-1.jpg',
  
  'gaming': '/images/gaming-1.jpg',
  'board game': '/images/gaming-1.jpg',
  'social': '/images/friends-social-1.jpg',
  'meetup': '/images/friends-social-1.jpg',
  
  'gardening': '/images/gardening-1.jpg',
  'planting': '/images/gardening-1.jpg',
  
  'book club': '/images/friends-social-1.jpg',
  'reading': '/images/friends-social-1.jpg',
  
  'photography': '/images/outdoor-adventure-1.jpg',
  'art': '/images/friends-social-1.jpg',
  'creative': '/images/friends-social-1.jpg',
  
  'music': '/images/friends-social-1.jpg',
  'concert': '/images/friends-social-1.jpg',
} as const;

// Category-based fallback images - Local Unsplash curated
export const CATEGORY_IMAGE_MAPPING = {
  'sports': '/images/outdoor-adventure-1.jpg',
  'outdoor': '/images/outdoor-adventure-1.jpg',
  'social': '/images/friends-social-1.jpg',
  'food': '/images/food-dining-1.jpg',
  'creative': '/images/friends-social-1.jpg',
  'tech': '/images/coffee-code-1.jpg',
  'family': '/images/family-meetup-1.jpg',
} as const;

// Default fallback image - Local Unsplash
export const DEFAULT_ACTIVITY_IMAGE = '/images/group-activity-1.jpg';

/**
 * Get the most relevant image for an activity based on title and categories
 */
export function getRelevantActivityImage(title: string, categories: string[] = []): string {
  const lowerTitle = title.toLowerCase();
  
  // First, check for exact matches in activity mapping
  for (const [keyword, imageUrl] of Object.entries(ACTIVITY_IMAGE_MAPPING)) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return imageUrl;
    }
  }
  
  // Then check categories
  for (const category of categories) {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory in CATEGORY_IMAGE_MAPPING) {
      return CATEGORY_IMAGE_MAPPING[lowerCategory as keyof typeof CATEGORY_IMAGE_MAPPING];
    }
  }
  
  // Return default if no match found
  return DEFAULT_ACTIVITY_IMAGE;
}