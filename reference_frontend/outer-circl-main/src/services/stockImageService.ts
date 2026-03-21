import { supabase } from '@/integrations/supabase/client';

/**
 * @deprecated This service is being phased out for homepage use.
 * 
 * IMPORTANT: For homepage sections, use static image mappings from '@/utils/imageMapping'
 * This service should only be used for:
 * - Dashboard activity creation (where users can wait for image loading)
 * - User-uploaded images
 * - Dynamic content that requires real-time image selection
 * 
 * Homepage sections now use static curated images for instant load times.
 * See: src/utils/imageMapping.ts and src/utils/activityImageMapping.ts
 */

// Enhanced activity category mappings with semantic keywords and weighted priorities
export const ACTIVITY_CATEGORIES = {
  // Outdoor & Adventure - High priority for nature/adventure activities
  outdoors: {
    keywords: ['hiking', 'camping', 'beach', 'mountain', 'trail', 'nature', 'adventure', 'scenic', 'park', 'forest', 'outdoor', 'walk', 'trek', 'explore'],
    priority: 3,
    semanticMatches: ['hike', 'climb', 'expedition', 'wilderness', 'countryside']
  },
  
  // Sports & Fitness - High priority for exercise and sports activities
  sports: {
    keywords: ['gym', 'workout', 'running', 'jogging', 'exercise', 'sports', 'yoga', 'fitness', 'training', 'cardio', 'strength', 'athletic', 'recreation', 'physical'],
    priority: 3,
    semanticMatches: ['jog', 'run', 'marathon', 'crossfit', 'pilates', 'aerobics', 'sport', 'athlete', 'game']
  },
  
  // Water activities - Very specific for water-based events
  water: {
    keywords: ['beach', 'swim', 'plunge', 'lake', 'ocean', 'water', 'surfing', 'kayaking', 'cold', 'ice', 'pool', 'aquatic'],
    priority: 4, // Higher priority for very specific activities like cold plunge
    semanticMatches: ['swimming', 'diving', 'surf', 'paddle', 'boat']
  },
  
  // Social & Community - High priority for group activities
  social: {
    keywords: ['meetup', 'friends', 'group', 'community', 'gathering', 'party', 'celebration', 'networking', 'social', 'meet'],
    priority: 2,
    semanticMatches: ['connect', 'mingle', 'socialize', 'hangout', 'get-together']
  },
  
  // Family & Kids - Very specific for family activities
  family: {
    keywords: ['kids', 'children', 'toddler', 'family', 'playground', 'parents', 'baby', 'child', 'infant', 'mom', 'dad'],
    priority: 4,
    semanticMatches: ['parenting', 'childcare', 'mommy', 'daddy', 'tots']
  },
  
  // Food & Dining - Specific for food-related activities
  food: {
    keywords: ['coffee', 'restaurant', 'cooking', 'dining', 'kitchen', 'meal', 'culinary', 'cafe', 'food', 'eat', 'drink', 'brew'],
    priority: 3,
    semanticMatches: ['cuisine', 'gastronomy', 'chef', 'recipe', 'baking']
  },
  
  // Creative & Arts - For creative workshops and activities
  creative: {
    keywords: ['art', 'craft', 'painting', 'music', 'dance', 'workshop', 'studio', 'creative', 'design', 'make', 'build'],
    priority: 2,
    semanticMatches: ['artistic', 'crafting', 'drawing', 'sculpture', 'pottery']
  },
  
  // Professional & Tech - For work-related meetups
  professional: {
    keywords: ['work', 'office', 'business', 'networking', 'code', 'tech', 'coworking', 'professional', 'career', 'startup'],
    priority: 3,
    semanticMatches: ['coding', 'programming', 'developer', 'entrepreneur', 'corporate']
  },
  
  // Learning & Education - For educational activities
  learning: {
    keywords: ['class', 'course', 'education', 'skill', 'workshop', 'training', 'learn', 'study', 'teach', 'lesson'],
    priority: 2,
    semanticMatches: ['educational', 'tutorial', 'instruction', 'academic', 'seminar']
  },
  
  // Gaming - For game-related activities
  gaming: {
    keywords: ['game', 'board', 'card', 'video', 'tournament', 'competition', 'gaming', 'play', 'chess', 'poker'],
    priority: 2,
    semanticMatches: ['gameplay', 'esports', 'tabletop', 'arcade', 'console']
  },
  
  // Cultural - For cultural events
  cultural: {
    keywords: ['museum', 'gallery', 'theater', 'concert', 'book', 'library', 'culture', 'history', 'exhibition'],
    priority: 2,
    semanticMatches: ['cultural', 'heritage', 'historic', 'literary', 'artistic']
  },
  
  // Wellness - For wellness and mindfulness activities
  wellness: {
    keywords: ['meditation', 'mindfulness', 'spa', 'therapy', 'relaxation', 'wellness', 'healing', 'spiritual', 'zen'],
    priority: 2,
    semanticMatches: ['therapeutic', 'holistic', 'mindful', 'peaceful', 'tranquil']
  }
} as const;

interface StockImage {
  name: string;
  url: string;
  category?: string;
  keywords?: string[];
}

interface CategorizedImages {
  outdoors: StockImage[];
  sports: StockImage[];
  social: StockImage[];
  creative: StockImage[];
  general: StockImage[];
}

class StockImageService {
  private images: StockImage[] = [];
  private categorizedImages: CategorizedImages = {
    outdoors: [],
    sports: [],
    social: [],
    creative: [],
    general: []
  };
  private isLoaded = false;

  async loadStockImages(): Promise<StockImage[]> {
    if (this.isLoaded && this.images.length > 0) {
      return this.images;
    }

    try {
      console.log('📸 Starting stock image load...');
      
      // Create timeout promise (3 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Stock image loading timed out')), 3000);
      });

      // Race between actual load and timeout
      const loadPromise = supabase.storage
        .from('activitystockimages')
        .list('', {
          limit: 100,
          offset: 0,
        });

      const { data: files, error } = await Promise.race([loadPromise, timeoutPromise]) as any;

      if (error) {
        console.warn('⚠️ Error fetching stock images (non-critical):', error);
        this.isLoaded = true; // Mark as loaded to prevent retry loops
        return [];
      }

      if (files) {
        const imageFiles = files.filter((file: any) => 
          file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i)
        );

        this.images = imageFiles.map((file: any) => {
          const { data } = supabase.storage
            .from('activitystockimages')
            .getPublicUrl(file.name);
          
          return {
            name: file.name,
            url: data.publicUrl,
            keywords: this.extractKeywordsFromFilename(file.name)
          };
        });

        // Categorize images
        this.categorizeImages();
        this.isLoaded = true;
        console.log(`✅ Loaded ${this.images.length} stock images successfully`);
        return this.images;
      }
    } catch (error) {
      console.warn('⚠️ Error loading stock images (with timeout, non-critical):', error);
      this.isLoaded = true; // Prevent infinite retry - graceful degradation
      return [];
    }

    this.isLoaded = true;
    return [];
  }

  private extractKeywordsFromFilename(filename: string): string[] {
    // Remove file extension and normalize
    const name = filename.toLowerCase().replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
    
    // Split by folder separator and extract all parts
    const parts = name.split('/');
    const folderName = parts.length > 1 ? parts[0] : '';
    const fileName = parts.length > 1 ? parts[parts.length - 1] : name;
    
    // Combine folder and file keywords
    const words = [folderName, ...fileName.split(/[-_\s]+/)]
      .filter(word => word.length > 2) // Remove very short words
      .map(word => word.trim());

    return words;
  }

  private categorizeImages(): void {
    // Reset categories
    Object.keys(this.categorizedImages).forEach(key => {
      this.categorizedImages[key as keyof CategorizedImages] = [];
    });

    this.images.forEach(image => {
      let categorized = false;
      
      // Prioritize folder-based categorization
      if (image.name.startsWith('Sports & Fitness/')) {
        this.categorizedImages.sports.push({ ...image, category: 'sports' });
        categorized = true;
      } else if (image.name.startsWith('Social/')) {
        this.categorizedImages.social.push({ ...image, category: 'social' });
        categorized = true;
      } else if (image.name.startsWith('Outdoors/')) {
        this.categorizedImages.outdoors.push({ ...image, category: 'outdoors' });
        categorized = true;
      } else if (image.name.startsWith('Arts/')) {
        this.categorizedImages.creative.push({ ...image, category: 'creative' });
        categorized = true;
      }
      
      // Fallback to keyword matching for uncategorized images
      if (!categorized) {
        const imageKeywords = image.keywords || [];
        const allText = [image.name.toLowerCase(), ...imageKeywords].join(' ');

        if (allText.includes('sport') || allText.includes('fitness') || allText.includes('gym')) {
          this.categorizedImages.sports.push({ ...image, category: 'sports' });
          categorized = true;
        } else if (allText.includes('social') || allText.includes('party')) {
          this.categorizedImages.social.push({ ...image, category: 'social' });
          categorized = true;
        } else if (allText.includes('outdoor') || allText.includes('nature') || allText.includes('hik')) {
          this.categorizedImages.outdoors.push({ ...image, category: 'outdoors' });
          categorized = true;
        } else if (allText.includes('art') || allText.includes('craft') || allText.includes('creative')) {
          this.categorizedImages.creative.push({ ...image, category: 'creative' });
          categorized = true;
        }
      }

      // If still not categorized, add to general
      if (!categorized) {
        this.categorizedImages.general.push({ ...image, category: 'general' });
      }
    });
  }

  async getImageByCategory(category: string, index: number = 0): Promise<string> {
    await this.loadStockImages();
    
    const categoryKey = category as keyof CategorizedImages;
    const categoryImages = this.categorizedImages[categoryKey] || this.categorizedImages.general;
    
    if (categoryImages.length === 0) {
      // Fallback to general images if category is empty
      if (this.categorizedImages.general.length > 0) {
        const fallbackIndex = index % this.categorizedImages.general.length;
        return this.categorizedImages.general[fallbackIndex].url;
      }
      return '';
    }
    
    const imageIndex = index % categoryImages.length;
    return categoryImages[imageIndex].url;
  }

  async getImageForActivity(activityTitle: string, activityDescription?: string, categories?: string[], usedImages?: Set<string>): Promise<string> {
    await this.loadStockImages();
    
    const searchText = [
      activityTitle.toLowerCase(),
      activityDescription?.toLowerCase() || '',
      ...(categories || [])
    ].join(' ');

    // Enhanced scoring system with weighted priorities and semantic matching
    const scoredImages = this.images.map(image => {
      // Skip if image already used (for diversity)
      if (usedImages?.has(image.url)) {
        return { image, score: -1 };
      }

      const imageKeywords = image.keywords || [];
      const allImageText = [image.name.toLowerCase(), ...imageKeywords].join(' ');
      
      let score = 0;
      let bestCategory = '';
      let bestPriority = 0;
      
      // Enhanced category matching with priorities and semantic understanding
      Object.entries(ACTIVITY_CATEGORIES).forEach(([category, categoryData]) => {
        const { keywords, priority, semanticMatches } = categoryData;
        let categoryScore = 0;
        
        // Direct keyword matches (highest weight)
        keywords.forEach(keyword => {
          if (searchText.includes(keyword) && allImageText.includes(keyword)) {
            categoryScore += 5 * priority;
          } else if (searchText.includes(keyword)) {
            categoryScore += 3 * priority;
          } else if (allImageText.includes(keyword)) {
            categoryScore += 2 * priority;
          }
        });
        
        // Semantic matches (medium weight)
        semanticMatches.forEach(semanticKeyword => {
          if (searchText.includes(semanticKeyword) && allImageText.includes(semanticKeyword)) {
            categoryScore += 4 * priority;
          } else if (searchText.includes(semanticKeyword)) {
            categoryScore += 2 * priority;
          }
        });
        
        if (categoryScore > score) {
          score = categoryScore;
          bestCategory = category;
          bestPriority = priority;
        }
      });
      
      // Bonus for exact title matches
      imageKeywords.forEach(keyword => {
        if (activityTitle.toLowerCase().includes(keyword)) {
          score += 10;
        }
      });
      
      // Activity-specific enhancements
      score += this.getActivitySpecificScore(activityTitle, allImageText);
      
      return { image, score, category: bestCategory, priority: bestPriority };
    });

    // Filter out used images and sort by score
    const availableImages = scoredImages.filter(item => item.score > 0);
    availableImages.sort((a, b) => {
      // Prioritize by score first, then by category priority
      if (b.score !== a.score) return b.score - a.score;
      return b.priority - a.priority;
    });
    
    if (availableImages.length > 0) {
      return availableImages[0].image.url;
    }

    // Intelligent fallback: try to match by category with unused images
    if (categories && categories.length > 0) {
      for (const category of categories) {
        const categoryImages = this.categorizedImages[category as keyof CategorizedImages] || [];
        const unusedCategoryImages = categoryImages.filter(img => !usedImages?.has(img.url));
        if (unusedCategoryImages.length > 0) {
          return unusedCategoryImages[0].url;
        }
      }
    }

    // Final fallback: unused general images
    const unusedGeneralImages = this.categorizedImages.general.filter(img => !usedImages?.has(img.url));
    if (unusedGeneralImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * unusedGeneralImages.length);
      return unusedGeneralImages[randomIndex].url;
    }

    // If all images are used, reset and use any image
    if (this.categorizedImages.general.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.categorizedImages.general.length);
      return this.categorizedImages.general[randomIndex].url;
    }

    return '';
  }

  // Activity-specific scoring enhancements
  private getActivitySpecificScore(title: string, imageText: string): number {
    const titleLower = title.toLowerCase();
    let bonus = 0;

    // Cold plunge specific
    if (titleLower.includes('cold') && titleLower.includes('plunge')) {
      if (imageText.includes('water') || imageText.includes('ice') || imageText.includes('cold')) {
        bonus += 15;
      }
    }

    // Coffee & code specific  
    if ((titleLower.includes('coffee') || titleLower.includes('cafe')) && titleLower.includes('code')) {
      if (imageText.includes('coffee') && (imageText.includes('laptop') || imageText.includes('work'))) {
        bonus += 15;
      }
    }

    // Toddler specific
    if (titleLower.includes('toddler') || titleLower.includes('kids')) {
      if (imageText.includes('child') || imageText.includes('playground') || imageText.includes('family')) {
        bonus += 15;
      }
    }

    // Running/jogging specific
    if (titleLower.includes('jog') || titleLower.includes('run') || titleLower.includes('5k') || titleLower.includes('3k')) {
      if (imageText.includes('running') || imageText.includes('jogging') || imageText.includes('track')) {
        bonus += 15;
      }
    }

    // Hiking specific
    if (titleLower.includes('hik')) {
      if (imageText.includes('mountain') || imageText.includes('trail') || imageText.includes('nature')) {
        bonus += 15;
      }
    }

    return bonus;
  }

  async getRandomImageByCategory(category: string): Promise<string> {
    await this.loadStockImages();
    
    const categoryKey = category as keyof CategorizedImages;
    const categoryImages = this.categorizedImages[categoryKey] || this.categorizedImages.general;
    
    if (categoryImages.length === 0) {
      return this.getRandomImageByCategory('general');
    }
    
    const randomIndex = Math.floor(Math.random() * categoryImages.length);
    return categoryImages[randomIndex].url;
  }

  async getAllCategorizedImages(): Promise<CategorizedImages> {
    await this.loadStockImages();
    return this.categorizedImages;
  }

  // Get images for homepage sections
  async getHomepageImages() {
    await this.loadStockImages();
    
    return {
      howItWorks: {
        foodExperience: await this.getImageByCategory('food', 0),
        hikingActivity: await this.getImageByCategory('outdoors', 0),
        friendsMeeting: await this.getImageByCategory('social', 0),
        groupActivity: await this.getImageByCategory('social', 1)
      },
      saveIdeas: {
        outdoorActivities: await this.getImageByCategory('outdoors', 1),
        cookingClasses: await this.getImageByCategory('food', 1),
        gardeningMeetup: await this.getImageByCategory('outdoors', 2),
        socialGaming: await this.getImageByCategory('gaming', 0)
      },
      features: {
        friendsLaughing: await this.getImageByCategory('social', 2),
        groupHiking: await this.getImageByCategory('outdoors', 3),
        friendsCafe: await this.getImageByCategory('food', 2),
        groupGames: await this.getImageByCategory('gaming', 1)
      }
    };
  }
}

// Export singleton instance
export const stockImageService = new StockImageService();

// Export helper functions
export const getStockImageForActivity = (title: string, description?: string, categories?: string[]) => 
  stockImageService.getImageForActivity(title, description, categories);

export const getStockImageByCategory = (category: string, index?: number) => 
  stockImageService.getImageByCategory(category, index);

export const getRandomStockImage = (category: string) => 
  stockImageService.getRandomImageByCategory(category);