import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Image, Loader2, Search, Grid, List, Heart, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StorageImage {
  name: string;
  url: string;
  category: string;
}

interface OptimizedImageSelectorProps {
  onImageSelected: (imageUrl: string) => void;
  onClose: () => void;
  activityCategory?: string;
}

const IMAGES_PER_BATCH = 12;
const CATEGORIES = ['all', 'sports', 'social', 'outdoors', 'creative'];

const OptimizedImageSelector: React.FC<OptimizedImageSelectorProps> = ({
  onImageSelected,
  onClose,
  activityCategory
}) => {
  // State management
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Get category from filename - prioritize folder path
  const extractCategory = useCallback((filename: string): string => {
    // Check folder path first
    if (filename.startsWith('Sports & Fitness/')) return 'sports';
    if (filename.startsWith('Social/')) return 'social';
    if (filename.startsWith('Outdoors/')) return 'outdoors';
    if (filename.startsWith('Arts/')) return 'creative';
    
    // Fallback to filename keywords
    const lower = filename.toLowerCase();
    if (lower.includes('sports') || lower.includes('fitness')) return 'sports';
    if (lower.includes('social')) return 'social';
    if (lower.includes('outdoor') || lower.includes('nature')) return 'outdoors';
    if (lower.includes('art') || lower.includes('craft')) return 'creative';
    return 'general';
  }, []);

  // Filter files based on category and search
  const getFilteredFiles = useCallback((files: any[]) => {
    let filtered = files.filter(file => 
      file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i)
    );

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => {
        const category = extractCategory(file.name);
        return category === selectedCategory;
      });
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(search)
      );
    }

    // Prioritize activity category if provided
    if (activityCategory && selectedCategory === 'all' && !searchTerm) {
      const categoryMatches = filtered.filter(file => {
        const category = extractCategory(file.name);
        return category === activityCategory.toLowerCase();
      });
      const others = filtered.filter(file => {
        const category = extractCategory(file.name);
        return category !== activityCategory.toLowerCase();
      });
      filtered = [...categoryMatches, ...others];
    }

    return filtered;
  }, [selectedCategory, searchTerm, activityCategory, extractCategory]);

  // Fetch all files list once (for filtering purposes)
  const fetchAllFilesList = useCallback(async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from('activitystockimages')
        .list('', {
          limit: 1000, // Get all file names for filtering
          offset: 0,
        });

      if (error) {
        setError('Failed to load image list');
        console.error('❌ Error fetching file list:', error);
        return;
      }

      setAllFiles(files || []);
    } catch (error) {
      setError('Failed to load images');
      console.error('💥 Error loading file list:', error);
    }
  }, []);

  // Load batch of images
  const loadImageBatch = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setImages([]);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const filteredFiles = getFilteredFiles(allFiles);
      const startIndex = isInitial ? 0 : offset;
      const endIndex = startIndex + IMAGES_PER_BATCH;
      const batchFiles = filteredFiles.slice(startIndex, endIndex);

      if (batchFiles.length === 0) {
        setHasMore(false);
        return;
      }

      // Generate URLs for this batch
      const imageUrls = batchFiles.map(file => {
        const { data } = supabase.storage
          .from('activitystockimages')
          .getPublicUrl(file.name);
        
        return {
          name: file.name,
          url: data.publicUrl,
          category: extractCategory(file.name)
        };
      });

      if (isInitial) {
        setImages(imageUrls);
      } else {
        setImages(prev => [...prev, ...imageUrls]);
      }

      setOffset(endIndex);
      setHasMore(endIndex < filteredFiles.length);

      console.log(`✅ Loaded ${imageUrls.length} images (${startIndex + 1}-${endIndex} of ${filteredFiles.length})`);
    } catch (error) {
      setError('Failed to load images');
      console.error('💥 Error loading image batch:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [allFiles, offset, getFilteredFiles, extractCategory]);

  // Handle category or search changes
  useEffect(() => {
    if (allFiles.length > 0) {
      loadImageBatch(true);
    }
  }, [selectedCategory, searchTerm, allFiles.length]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadImageBatch(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadImageBatch]);

  // Load recently used images
  useEffect(() => {
    const recent = localStorage.getItem('recentlyUsedImages');
    if (recent) {
      setRecentlyUsed(JSON.parse(recent).slice(0, 6));
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchAllFilesList();
  }, [fetchAllFilesList]);

  // Load first batch when files list is ready
  useEffect(() => {
    if (allFiles.length > 0 && images.length === 0) {
      loadImageBatch(true);
    }
  }, [allFiles.length, images.length]);

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleConfirmSelection = () => {
    if (selectedImage) {
      // Save to recently used
      const recent = [selectedImage, ...recentlyUsed.filter(url => url !== selectedImage)].slice(0, 6);
      localStorage.setItem('recentlyUsedImages', JSON.stringify(recent));
      
      onImageSelected(selectedImage);
      onClose();
      toast.success('Image selected!');
    }
  };

  const ImageSkeleton = () => (
    <div className="space-y-3">
      <div className={`grid gap-3 ${
        gridSize === 'small' 
          ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' 
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
      }`}>
        {Array.from({ length: IMAGES_PER_BATCH }).map((_, index) => (
          <Skeleton 
            key={index}
            className={`w-full ${gridSize === 'small' ? 'aspect-square' : 'aspect-[4/3]'} rounded-xl`}
          />
        ))}
      </div>
    </div>
  );

  if (loading && images.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading images...</span>
        </div>
        <ImageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive/50 mb-4" />
        <h3 className="text-xl font-medium mb-2">Failed to load images</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (images.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <Image className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-medium mb-2">No images found</h3>
        <p className="text-muted-foreground">
          {searchTerm || selectedCategory !== 'all' 
            ? 'Try adjusting your search or category filter'
            : 'Stock images will appear here when they\'re uploaded'
          }
        </p>
        {(searchTerm || selectedCategory !== 'all') && (
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full border-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGridSize(gridSize === 'small' ? 'large' : 'small')}
            className="rounded-full"
          >
            {gridSize === 'small' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "secondary"}
            className={`cursor-pointer rounded-full transition-all capitalize ${
              selectedCategory === category 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/20'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Recently Used */}
      {recentlyUsed.length > 0 && selectedCategory === 'all' && !searchTerm && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            <span className="text-sm font-medium text-pink-700">Recently Used</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {recentlyUsed.map((url, index) => (
              <div
                key={`recent-${index}`}
                onClick={() => handleImageSelect(url)}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === url 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <AspectRatio ratio={1}>
                  <img 
                    src={url} 
                    alt="Recently used"
                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                </AspectRatio>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className={`grid gap-3 ${
        gridSize === 'small' 
          ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' 
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
      }`}>
        {images.map((image, index) => (
          <div 
            key={image.name}
            onClick={() => handleImageSelect(image.url)}
            className={`cursor-pointer group relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
              selectedImage === image.url 
                ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                : 'border-gray-200 hover:border-primary/50 hover:shadow-md'
            }`}
          >
            <AspectRatio ratio={gridSize === 'small' ? 1 : 4/3}>
              <img 
                src={image.url} 
                alt={image.name.replace(/\.[^/.]+$/, "")}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                loading={index < 6 ? "eager" : "lazy"}
                onError={(e) => {
                  console.warn('Image failed to load:', image.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </AspectRatio>
            
            {selectedImage === image.url && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {/* Category badge */}
            {image.category && image.category !== 'general' && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs opacity-80 backdrop-blur-sm">
                  {image.category}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading more...</span>
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !loadingMore && (
        <div ref={observerTarget} className="h-4" />
      )}

      {/* Results info */}
      <div className="text-center text-sm text-muted-foreground">
        {images.length > 0 && (
          <>
            Showing {images.length} image{images.length !== 1 ? 's' : ''}
            {hasMore && ' (scroll for more)'}
          </>
        )}
      </div>

      {/* Action buttons */}
      {selectedImage && (
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            className="bg-primary hover:bg-primary-hover text-primary-foreground rounded-full"
          >
            Use This Image
          </Button>
        </div>
      )}
    </div>
  );
};

export default OptimizedImageSelector;