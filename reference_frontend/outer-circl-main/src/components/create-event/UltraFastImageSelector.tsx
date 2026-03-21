import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Image, Search, Grid, List, Heart, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StorageImage {
  name: string;
  url: string;
  category: string;
}

interface UltraFastImageSelectorProps {
  onImageSelected: (imageUrl: string) => void;
  onClose: () => void;
  activityCategory?: string;
}

const IMAGES_PER_PAGE = 12;
const CATEGORIES = [
  { id: 'all', label: 'All', folder: '' },
  { id: 'sports', label: 'Sports & Fitness', folder: 'Sports & Fitness' },
  { id: 'social', label: 'Social', folder: 'Social' },
  { id: 'outdoors', label: 'Outdoors', folder: 'Outdoors' },
  { id: 'creative', label: 'Arts & Creative', folder: 'Arts' }
];

const UltraFastImageSelector: React.FC<UltraFastImageSelectorProps> = ({
  onImageSelected,
  onClose,
  activityCategory
}) => {
  // State management
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [error, setError] = useState<string>('');
  const [cache, setCache] = useState<Map<string, StorageImage[]>>(new Map());

  // Calculate pagination info
  const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);
  const hasMore = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  // Get category from filename - prioritize folder path
  const extractCategory = useCallback((filename: string): string => {
    // Check folder path first
    if (filename.startsWith('Sports & Fitness/')) return 'sports';
    if (filename.startsWith('Social/')) return 'social';
    if (filename.startsWith('Outdoors/')) return 'outdoors';
    if (filename.startsWith('Arts/')) return 'creative';
    
    // Fallback to filename keywords
    const lower = filename.toLowerCase();
    if (lower.includes('sports') || lower.includes('fitness') || lower.includes('gym') || lower.includes('workout')) return 'sports';
    if (lower.includes('social') || lower.includes('party') || lower.includes('event')) return 'social';
    if (lower.includes('outdoor') || lower.includes('nature') || lower.includes('hik')) return 'outdoors';
    if (lower.includes('art') || lower.includes('craft') || lower.includes('creative')) return 'creative';
    return 'general';
  }, []);

  // Build cache key for current filters
  const getCacheKey = useCallback(() => {
    return `${selectedCategory}-${searchTerm}-${currentPage}`;
  }, [selectedCategory, searchTerm, currentPage]);

  // Ultra-fast direct storage query with pagination
  const loadImagesPage = useCallback(async () => {
    const cacheKey = getCacheKey();
    
    // Check cache first
    if (cache.has(cacheKey)) {
      const cachedImages = cache.get(cacheKey)!;
      setImages(cachedImages);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const offset = (currentPage - 1) * IMAGES_PER_PAGE;
      const selectedCategoryData = CATEGORIES.find(cat => cat.id === selectedCategory);
      const folderPath = selectedCategoryData?.folder || '';

      // Query storage with pagination
      const { data: files, error } = await supabase.storage
        .from('activitystockimages')
        .list(folderPath, {
          limit: IMAGES_PER_PAGE,
          offset: offset,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        setError('Failed to load images');
        console.error('❌ Storage query error:', error);
        return;
      }

      // Filter valid image files
      let validFiles = (files || []).filter(file => 
        file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i)
      );

      // Apply search filter if needed
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        validFiles = validFiles.filter(file => 
          file.name.toLowerCase().includes(search)
        );
      }

      // Generate URLs for images
      const imageUrls: StorageImage[] = validFiles.map(file => {
        const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
        const { data } = supabase.storage
          .from('activitystockimages')
          .getPublicUrl(fullPath);
        
        return {
          name: file.name,
          url: data.publicUrl,
          category: folderPath || extractCategory(file.name)
        };
      });

      // Update state
      setImages(imageUrls);
      setTotalImages(validFiles.length + offset); // Approximate total

      // Cache the results
      const newCache = new Map(cache);
      newCache.set(cacheKey, imageUrls);
      setCache(newCache);

      console.log(`✅ Loaded page ${currentPage}: ${imageUrls.length} images in ${folderPath || 'root'}`);
    } catch (error) {
      setError('Failed to load images');
      console.error('💥 Error loading images:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory, searchTerm, cache, getCacheKey, extractCategory]);

  // Handle category change
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setImages([]);
    setTotalImages(0);
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    setImages([]);
    setTotalImages(0);
  }, []);

  // Navigation handlers
  const goToNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (hasPrevious) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Effects
  useEffect(() => {
    loadImagesPage();
  }, [loadImagesPage]);

  useEffect(() => {
    // Set initial category based on activity
    if (activityCategory && selectedCategory === 'all') {
      const matchingCategory = CATEGORIES.find(cat => 
        cat.id === activityCategory.toLowerCase()
      );
      if (matchingCategory) {
        setSelectedCategory(matchingCategory.id);
      }
    }
  }, [activityCategory, selectedCategory]);

  // Load recently used images
  useEffect(() => {
    const recent = localStorage.getItem('recentlyUsedImages');
    if (recent) {
      setRecentlyUsed(JSON.parse(recent).slice(0, 6));
    }
  }, []);

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleConfirmSelection = () => {
    if (selectedImage) {
      // Save to recently used
      const recent = [selectedImage, ...recentlyUsed.filter(url => url !== selectedImage)].slice(0, 6);
      localStorage.setItem('recentlyUsedImages', JSON.stringify(recent));
      
      onImageSelected(selectedImage);
      toast.success('✨ Image selected!');
      
      // Close dialog after a brief delay to ensure state updates complete
      setTimeout(() => {
        onClose();
      }, 100);
    }
  };

  const ImageSkeleton = () => (
    <div className={`grid gap-3 ${
      gridSize === 'small' 
        ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' 
        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    }`}>
      {Array.from({ length: IMAGES_PER_PAGE }).map((_, index) => (
        <Skeleton 
          key={index}
          className={`w-full ${gridSize === 'small' ? 'aspect-square' : 'aspect-[4/3]'} rounded-xl`}
        />
      ))}
    </div>
  );

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

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
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
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "secondary"}
            className={`cursor-pointer rounded-full transition-all capitalize ${
              selectedCategory === category.id 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/20'
            }`}
            onClick={() => handleCategoryChange(category.id)}
          >
            {category.label}
          </Badge>
        ))}
      </div>

      {/* Recently Used (only on first page, all categories, no search) */}
      {recentlyUsed.length > 0 && currentPage === 1 && selectedCategory === 'all' && !searchTerm && (
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

      {/* Page Navigation Info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {totalImages > 0 && (
            <>Page {currentPage} of {totalPages} • {images.length} images</>
          )}
        </div>
        
        {/* Navigation Buttons */}
        {(hasPrevious || hasMore) && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={!hasPrevious || loading}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={!hasMore || loading}
              className="rounded-full"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading page {currentPage}...</span>
          </div>
          <ImageSkeleton />
        </div>
      )}

      {/* Images Grid */}
      {!loading && images.length > 0 && (
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
      )}

      {/* Empty State */}
      {!loading && images.length === 0 && (
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
                setCurrentPage(1);
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

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

export default UltraFastImageSelector;