// Advanced image preloading service with intelligent caching
import { optimizedStockImageService } from './optimizedStockImageService';

interface PreloadedImage {
  url: string;
  timestamp: number;
  category?: string;
  priority: number;
}

class ImagePreloadService {
  private preloadedImages = new Map<string, PreloadedImage>();
  private preloadQueue: string[] = [];
  private isPreloading = false;
  private readonly MAX_PRELOAD_SIZE = 50;
  private readonly PRELOAD_TIMEOUT = 10000; // 10 seconds

  // Preload images based on user activity patterns
  async preloadByCategory(category: string, count: number = 10): Promise<void> {
    try {
      const images = await optimizedStockImageService.getBatchStockImages(
        Array.from({ length: count }, (_, i) => ({ 
          query: 'activity', 
          category 
        }))
      );

      images.forEach((url, index) => {
        if (url && !this.preloadedImages.has(url)) {
          this.addToPreloadQueue(url, category, count - index);
        }
      });

      this.processPreloadQueue();
    } catch (error) {
      console.warn('Failed to preload images by category:', error);
    }
  }

  // Preload images based on activity title
  async preloadByActivity(title: string, category?: string): Promise<void> {
    try {
      const images = await optimizedStockImageService.getBatchStockImages([
        { query: title, category },
        { query: title },
        { query: category || 'activity' }
      ]);

      images.forEach((url, index) => {
        if (url && !this.preloadedImages.has(url)) {
          this.addToPreloadQueue(url, category, 10 - index);
        }
      });

      this.processPreloadQueue();
    } catch (error) {
      console.warn('Failed to preload images by activity:', error);
    }
  }

  // Smart preloading based on popular categories
  async preloadPopularImages(): Promise<void> {
    const popularCategories = ['outdoors', 'sports', 'food', 'social'];
    
    for (const category of popularCategories) {
      await this.preloadByCategory(category, 5);
    }
  }

  private addToPreloadQueue(url: string, category?: string, priority: number = 1): void {
    if (this.preloadedImages.size >= this.MAX_PRELOAD_SIZE) {
      this.cleanupOldImages();
    }

    this.preloadedImages.set(url, {
      url,
      timestamp: Date.now(),
      category,
      priority
    });

    if (!this.preloadQueue.includes(url)) {
      this.preloadQueue.push(url);
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;

    // Sort by priority
    this.preloadQueue.sort((a, b) => {
      const priorityA = this.preloadedImages.get(a)?.priority || 0;
      const priorityB = this.preloadedImages.get(b)?.priority || 0;
      return priorityB - priorityA;
    });

    const batch = this.preloadQueue.splice(0, 5); // Process 5 at a time
    
    await Promise.allSettled(
      batch.map(url => this.preloadSingleImage(url))
    );

    this.isPreloading = false;

    // Process next batch if queue not empty
    if (this.preloadQueue.length > 0) {
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  private preloadSingleImage(url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        resolve();
      }, this.PRELOAD_TIMEOUT);

      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timeout);
        this.preloadedImages.delete(url);
        resolve();
      };

      img.src = url;
    });
  }

  private cleanupOldImages(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [url, image] of this.preloadedImages.entries()) {
      if (now - image.timestamp > maxAge) {
        this.preloadedImages.delete(url);
      }
    }

    // If still too many, remove lowest priority
    if (this.preloadedImages.size >= this.MAX_PRELOAD_SIZE) {
      const sorted = Array.from(this.preloadedImages.entries())
        .sort((a, b) => a[1].priority - b[1].priority);
      
      const toRemove = sorted.slice(0, 10);
      toRemove.forEach(([url]) => this.preloadedImages.delete(url));
    }
  }

  // Check if image is preloaded
  isImagePreloaded(url: string): boolean {
    return this.preloadedImages.has(url);
  }

  // Get preload stats
  getPreloadStats() {
    return {
      preloadedCount: this.preloadedImages.size,
      queueLength: this.preloadQueue.length,
      isPreloading: this.isPreloading
    };
  }

  // Clear all preloaded images
  clearPreloadedImages(): void {
    this.preloadedImages.clear();
    this.preloadQueue.length = 0;
    this.isPreloading = false;
  }
}

export const imagePreloadService = new ImagePreloadService();