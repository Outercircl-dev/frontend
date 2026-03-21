import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import LazyImage from '@/components/optimization/LazyImage';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Grid, List, X } from 'lucide-react';
import { performanceTracker } from '@/utils/performanceOptimizations';
import { debounce } from '@/utils/performance';

interface StorageImage {
  name: string;
  url: string;
  category?: string;
  isPopular?: boolean;
  dimensions?: { width: number; height: number };
}

interface UnifiedStorageImageSelectorProps {
  onImageSelected: (imageUrl: string) => void;
  onClose: () => void;
  activityCategory?: string;
  maxImages?: number;
  viewMode?: 'grid' | 'list';
}

const UnifiedStorageImageSelector: React.FC<UnifiedStorageImageSelectorProps> = ({
  onImageSelected,
  onClose,
  activityCategory,
  maxImages = 50,
  viewMode: initialViewMode = 'grid'
}) => {
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [error, setError] = useState<string | null>(null);

  const categories = ['all', 'sports', 'social', 'outdoors', 'creative'];

  // Optimized image fetching with caching
  const fetchImages = useCallback(async () => {
    performanceTracker.startTimer('fetch-storage-images');
    
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = `storage_images_${activityCategory || 'all'}`;
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000) {
        console.log('📦 Using cached storage images');
        setImages(JSON.parse(cached));
        setLoading(false);
        performanceTracker.endTimer('fetch-storage-images');
        return;
      }

      const { data: bucketFiles, error: listError } = await supabase.storage
        .from('event-images')
        .list('stock-images', {
          limit: maxImages,
          offset: 0
        });

      if (listError) throw listError;

      const imagePromises = bucketFiles?.map(async (file) => {
        const { data } = supabase.storage
          .from('event-images')
          .getPublicUrl(`stock-images/${file.name}`);
        
        return {
          name: file.name,
          url: data.publicUrl,
          category: extractCategoryFromName(file.name),
          isPopular: isPopularImage(file.name)
        };
      }) || [];

      const imageResults = await Promise.all(imagePromises);
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(imageResults));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      setImages(imageResults);
      
      // Pre-prioritize images based on activity category
      if (activityCategory) {
        const categoryImages = imageResults.filter(img => 
          img.category === activityCategory.toLowerCase()
        );
        setImages([...categoryImages, ...imageResults.filter(img => img.category !== activityCategory.toLowerCase())]);
        setSelectedCategory(activityCategory.toLowerCase());
      }

    } catch (error) {
      console.error('Error fetching images:', error);
      setError('Failed to load images. Please try again.');
    } finally {
      setLoading(false);
      performanceTracker.endTimer('fetch-storage-images');
    }
  }, [activityCategory, maxImages]);

  // Optimized search with debouncing
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
    }, 300),
    []
  );

  const filteredImages = useMemo(() => {
    let filtered = images;
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(img => img.category === selectedCategory);
    }
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(img => 
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (img.category && img.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sort by popularity and category relevance
    return filtered.sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      if (activityCategory) {
        if (a.category === activityCategory && b.category !== activityCategory) return -1;
        if (a.category !== activityCategory && b.category === activityCategory) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [images, selectedCategory, searchTerm, activityCategory]);

  // Helper functions - prioritize folder path
  const extractCategoryFromName = (filename: string): string => {
    // Check folder path first
    if (filename.startsWith('Sports & Fitness/')) return 'sports';
    if (filename.startsWith('Social/')) return 'social';
    if (filename.startsWith('Outdoors/')) return 'outdoors';
    if (filename.startsWith('Arts/')) return 'creative';
    
    // Fallback to filename keywords
    const name = filename.toLowerCase();
    if (name.includes('sport') || name.includes('fitness') || name.includes('gym') || name.includes('workout')) return 'sports';
    if (name.includes('social') || name.includes('party') || name.includes('meet')) return 'social';
    if (name.includes('outdoor') || name.includes('nature') || name.includes('hik')) return 'outdoors';
    if (name.includes('art') || name.includes('craft') || name.includes('creative')) return 'creative';
    return 'other';
  };

  const isPopularImage = (filename: string): boolean => {
    const popularKeywords = ['popular', 'featured', 'trending', 'top', 'best'];
    return popularKeywords.some(keyword => filename.toLowerCase().includes(keyword));
  };

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchImages} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            onChange={(e) => debouncedSearch(e.target.value)}
            className="flex-1"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? 'default' : 'secondary'}
            className="cursor-pointer capitalize"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Images Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredImages.map((image, index) => (
            <div
              key={image.name}
              className={`group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                selectedImage === image.url
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-transparent hover:border-primary/50'
              } ${viewMode === 'list' ? 'flex gap-4 p-4' : ''}`}
              onClick={() => setSelectedImage(image.url)}
            >
              <div className={viewMode === 'list' ? 'w-32 h-24 flex-shrink-0' : 'w-full'}>
                <AspectRatio ratio={viewMode === 'list' ? 4/3 : 4/3}>
                  <LazyImage
                    src={image.url}
                    alt={image.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    quality="medium"
                    progressive
                  />
                </AspectRatio>
              </div>
              
              {viewMode === 'list' && (
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{image.name.replace(/\.[^/.]+$/, "")}</h4>
                  {image.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {image.category}
                    </Badge>
                  )}
                  {image.isPopular && (
                    <Badge variant="default" className="mt-1 ml-2 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No images found matching your criteria.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="mt-2"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      {selectedImage && (
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={() => onImageSelected(selectedImage)} 
            className="flex-1"
          >
            Use This Image
          </Button>
        </div>
      )}
    </div>
  );
};

export default UnifiedStorageImageSelector;