import { optimizedStockImageService } from './optimizedStockImageService';

interface LoadingBatch {
  category: string;
  priority: 'high' | 'medium' | 'low';
  images: string[];
  loaded: boolean;
}

class ProgressiveImageLoader {
  private batches: LoadingBatch[] = [];
  private loadingQueue: LoadingBatch[] = [];
  private isLoading = false;
  private loadedImages = new Set<string>();
  private maxConcurrentLoads = 3;
  private activeLoads = 0;

  // Initialize with priority-based loading strategy
  async initializeLoading(activityTitle?: string, activityCategory?: string): Promise<string[]> {
    this.reset();
    
    // Define loading priority based on activity context
    const categories = this.getPrioritizedCategories(activityCategory);
    
    // Create batches with different priorities
    this.batches = categories.map((cat, index) => ({
      category: cat.name,
      priority: cat.priority,
      images: [],
      loaded: false
    }));

    // Load high priority images first (relevant category + general)
    const initialImages = await this.loadBatch('high', activityTitle, activityCategory);
    
    // Queue medium and low priority batches for background loading
    this.queueRemainingBatches(activityTitle);
    
    return initialImages;
  }

  private getPrioritizedCategories(activityCategory?: string) {
    const categories = [
      { name: 'general', priority: 'high' as const },
      { name: activityCategory || 'outdoors', priority: 'high' as const },
      { name: 'social', priority: 'medium' as const },
      { name: 'sports', priority: 'medium' as const },
      { name: 'food', priority: 'medium' as const },
      { name: 'creative', priority: 'low' as const },
      { name: 'learning', priority: 'low' as const },
      { name: 'entertainment', priority: 'low' as const }
    ];

    // Move activity category to front if specified
    if (activityCategory) {
      const categoryIndex = categories.findIndex(cat => cat.name === activityCategory);
      if (categoryIndex > 0) {
        const [category] = categories.splice(categoryIndex, 1);
        category.priority = 'high';
        categories.unshift(category);
      }
    }

    return categories;
  }

  private async loadBatch(priority: 'high' | 'medium' | 'low', activityTitle?: string, activityCategory?: string): Promise<string[]> {
    const relevantBatches = this.batches.filter(batch => 
      batch.priority === priority && !batch.loaded
    );

    if (relevantBatches.length === 0) return [];

    const loadPromises = relevantBatches.map(async (batch) => {
      try {
        // Load 8-12 images per batch for optimal performance
        const imageRequests = Array.from({ length: 10 }, () => ({
          query: activityTitle || batch.category,
          category: batch.category
        }));

        const batchImages = await optimizedStockImageService.getBatchStockImages(imageRequests);
        
        // Filter out duplicates and errors
        const uniqueImages = Array.from(new Set(batchImages.filter(Boolean)));
        
        batch.images = uniqueImages;
        batch.loaded = true;
        
        // Track loaded images to avoid duplicates
        uniqueImages.forEach(img => this.loadedImages.add(img));
        
        return uniqueImages;
      } catch (error) {
        console.warn(`Failed to load batch for category: ${batch.category}`, error);
        batch.loaded = true; // Mark as loaded to avoid retry
        return [];
      }
    });

    const results = await Promise.all(loadPromises);
    return results.flat();
  }

  private queueRemainingBatches(activityTitle?: string) {
    // Queue medium priority batches
    setTimeout(() => {
      this.loadBatch('medium', activityTitle);
    }, 1000);

    // Queue low priority batches
    setTimeout(() => {
      this.loadBatch('low', activityTitle);
    }, 3000);
  }

  // Get currently loaded images
  getAllLoadedImages(): string[] {
    return this.batches
      .filter(batch => batch.loaded)
      .flatMap(batch => batch.images);
  }

  // Get images by category
  getImagesByCategory(category: string): string[] {
    const batch = this.batches.find(batch => batch.category === category);
    return batch?.images || [];
  }

  // Check if more images are available
  hasMoreImages(category?: string): boolean {
    if (category) {
      const batch = this.batches.find(batch => batch.category === category);
      return batch ? !batch.loaded : false;
    }
    return this.batches.some(batch => !batch.loaded);
  }

  // Load more images for a specific category
  async loadMoreForCategory(category: string, activityTitle?: string): Promise<string[]> {
    const batch = this.batches.find(batch => batch.category === category);
    if (!batch || batch.loaded) return [];

    try {
      const imageRequests = Array.from({ length: 15 }, () => ({
        query: activityTitle || category,
        category: category
      }));

      const moreImages = await optimizedStockImageService.getBatchStockImages(imageRequests);
      const uniqueNewImages = moreImages.filter(img => img && !this.loadedImages.has(img));
      
      batch.images.push(...uniqueNewImages);
      batch.loaded = true;
      
      uniqueNewImages.forEach(img => this.loadedImages.add(img));
      
      return uniqueNewImages;
    } catch (error) {
      console.warn(`Failed to load more images for category: ${category}`, error);
      return [];
    }
  }

  // Get loading statistics
  getLoadingStats() {
    const totalBatches = this.batches.length;
    const loadedBatches = this.batches.filter(batch => batch.loaded).length;
    const totalImages = this.batches.reduce((sum, batch) => sum + batch.images.length, 0);
    
    return {
      batchesLoaded: loadedBatches,
      totalBatches,
      totalImages,
      loadingProgress: totalBatches > 0 ? (loadedBatches / totalBatches) * 100 : 0
    };
  }

  // Reset the loader
  private reset() {
    this.batches = [];
    this.loadingQueue = [];
    this.isLoading = false;
    this.loadedImages.clear();
    this.activeLoads = 0;
  }
}

export const progressiveImageLoader = new ProgressiveImageLoader();