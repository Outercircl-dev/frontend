/**
 * Centralized Static Image Mapping for Homepage
 * 
 * This file contains all static image URLs used on the homepage.
 * Using static mappings ensures:
 * - Instant page load (no API calls to Supabase Storage)
 * - No loading timeouts or infinite loops
 * - Works offline with browser caching
 * - Better Core Web Vitals and SEO
 * 
 * Image Organization:
 * - Featured Events: 5 curated hero images for homepage carousel
 * - How It Works: 4 images showing different activity types
 * - Save Ideas: 4 images in Pinterest-style layout
 * - Features: 4 images for the community/chat section
 * 
 * Performance Notes:
 * - All images are preloaded using ImagePreloader component
 * - Uses WebP format when possible for better compression
 * - Lazy loads non-critical images below the fold
 */
export const HOMEPAGE_IMAGES = {
  // Featured events images - Local Unsplash curated photos
  COLD_PLUNGE: '/images/cold-plunge-1.jpg',
  TODDLER_MEETUP: '/images/family-meetup-1.jpg',
  JOGGING: '/images/jogging-1.jpg',
  COFFEE_CODE: '/images/coffee-code-1.jpg',
  HIKING: '/images/hiking-1.jpg',

  // How it works section images - Local Unsplash curated
  HOW_IT_WORKS: {
    FOOD_EXPERIENCE: '/images/food-dining-1.jpg',
    HIKING_ACTIVITY: '/images/hiking-scenic-1.jpg',
    FRIENDS_MEETING: '/images/friends-social-1.jpg',
    GROUP_ACTIVITY: '/images/group-activity-1.jpg'
  },

  // Save ideas section images - Local Unsplash curated
  SAVE_IDEAS: {
    OUTDOOR_ACTIVITIES: '/images/outdoor-adventure-1.jpg',
    COOKING_CLASSES: '/images/cooking-class-1.jpg',
    GARDENING_MEETUP: '/images/gardening-1.jpg',
    SOCIAL_GAMING: '/images/gaming-1.jpg'
  },

  // Features section images - Local Unsplash curated
  FEATURES: {
    FRIENDS_LAUGHING: '/images/friends-laughing-1.jpg',
    GROUP_HIKING: '/images/group-hiking-feature-1.jpg',
    FRIENDS_CAFE: '/images/friends-cafe-1.jpg',
    GROUP_GAMES: '/images/gaming-1.jpg'
  }
} as const;

// Alt text mapping for accessibility - Updated for actual Unsplash images
export const IMAGE_ALT_TEXTS = {
  COLD_PLUNGE: 'Person wading in cold ocean water at beach during sunrise or sunset for wellness activity',
  TODDLER_MEETUP: 'Young children playing outdoors in grassy field during family meetup activity',
  JOGGING: 'Runners jogging together on urban street in black and white photography showing fitness community',
  COFFEE_CODE: 'Laptop and coffee cup on wooden table at cafe for remote work and tech meetup',
  HIKING: 'Hikers exploring snowy mountain trails with dramatic peaks in background',

  HOW_IT_WORKS: {
    FOOD_EXPERIENCE: 'People enjoying food together at dining table with plates and drinks in warm social setting',
    HIKING_ACTIVITY: 'Majestic mountain landscape with dramatic sunlight rays breaking through clouds on hiking trail',
    FRIENDS_MEETING: 'Two women sitting at outdoor table having conversation and socializing at cafe',
    GROUP_ACTIVITY: 'Three women sitting together laughing and bonding during group social activity'
  },

  SAVE_IDEAS: {
    OUTDOOR_ACTIVITIES: 'Person walking on forest path surrounded by nature during outdoor adventure exploration',
    COOKING_CLASSES: 'Fresh ingredients and cooking preparation for culinary class and food learning experience',
    GARDENING_MEETUP: 'Hands holding green plant seedling for gardening and planting community activity',
    SOCIAL_GAMING: 'People playing video games together on TV screen during social gaming night'
  },

  FEATURES: {
    FRIENDS_LAUGHING: 'Group of friends laughing together outdoors showing genuine joy and friendship connection',
    GROUP_HIKING: 'Group of hikers walking together on snowy mountain trail during adventure activity',
    FRIENDS_CAFE: 'Friends meeting at cozy cafe with coffee cups for social connection and conversation',
    GROUP_GAMES: 'People playing video games together in living room during indoor group activity'
  }
} as const;