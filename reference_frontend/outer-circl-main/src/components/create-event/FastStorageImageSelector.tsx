import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Image, Loader2, Search, Grid, List, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface StorageImage {
  name: string;
  url: string;
  category?: string;
  isPopular?: boolean;
}

interface FastStorageImageSelectorProps {
  onImageSelected: (imageUrl: string) => void;
  onClose: () => void;
  activityCategory?: string;
}

const FastStorageImageSelector: React.FC<FastStorageImageSelectorProps> = ({
  onImageSelected,
  onClose,
  activityCategory
}) => {
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const IMAGES_PER_PAGE = 24;

  // Extract categories from folder structure
  const categories = useMemo(() => {
    const cats = new Set(['all']);
    images.forEach(image => {
      const filename = image.name;
      if (filename.startsWith('Sports & Fitness/')) cats.add('sports');
      if (filename.startsWith('Social/')) cats.add('social');
      if (filename.startsWith('Outdoors/')) cats.add('outdoors');
      if (filename.startsWith('Arts/')) cats.add('creative');
    });
    return Array.from(cats);
  }, [images]);

  // Filter images based on search and category
  const filteredImages = useMemo(() => {
    let filtered = images;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(image => 
        image.name.toLowerCase().includes(selectedCategory)
      );
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(image => 
        image.name.toLowerCase().includes(search)
      );
    }

    // Prioritize activity category match if provided
    if (activityCategory && selectedCategory === 'all' && !searchTerm) {
      const categoryMatches = filtered.filter(image => 
        image.name.toLowerCase().includes(activityCategory.toLowerCase())
      );
      const others = filtered.filter(image => 
        !image.name.toLowerCase().includes(activityCategory.toLowerCase())
      );
      filtered = [...categoryMatches, ...others];
    }

    return filtered;
  }, [images, searchTerm, selectedCategory, activityCategory]);

  // Paginated display
  const displayedImages = useMemo(() => {
    return filteredImages.slice(0, page * IMAGES_PER_PAGE);
  }, [filteredImages, page]);

  // Load images from storage
  const fetchStorageImages = useCallback(async () => {
    try {
      console.log('🔍 Fetching images from storage...');
      
      const { data: files, error } = await supabase.storage
        .from('activitystockimages')
        .list('', {
          limit: 1000,
          offset: 0,
        });

      if (error) {
        console.error('❌ Error fetching storage images:', error);
        toast.error('Failed to load images');
        return;
      }

      if (files && files.length > 0) {
        const imageFiles = files.filter(file => 
          file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i)
        );

        const imageUrls = imageFiles.map(file => {
          const { data } = supabase.storage
            .from('activitystockimages')
            .getPublicUrl(file.name);
          
          return {
            name: file.name,
            url: data.publicUrl,
            category: extractCategory(file.name)
          };
        });

        setImages(imageUrls);
        console.log('✅ Loaded', imageUrls.length, 'images');
      } else {
        setImages([]);
      }
    } catch (error) {
      console.error('💥 Error loading images:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  }, []);

  // Extract category from filename - prioritize folder path
  const extractCategory = (filename: string): string => {
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
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedImages.length < filteredImages.length) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayedImages.length, filteredImages.length]);

  // Load recently used images from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentlyUsedImages');
    if (recent) {
      setRecentlyUsed(JSON.parse(recent).slice(0, 6));
    }
  }, []);

  useEffect(() => {
    fetchStorageImages();
  }, [fetchStorageImages]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading images...</span>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <Image className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-medium mb-2">No images available</h3>
        <p className="text-muted-foreground">
          Stock images will appear here when they're uploaded
        </p>
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
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "secondary"}
            className={`cursor-pointer rounded-full transition-all capitalize ${
              selectedCategory === category 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/20'
            }`}
            onClick={() => {
              setSelectedCategory(category);
              setPage(1);
            }}
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
        {displayedImages.map((image, index) => (
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
                loading={index < 12 ? "eager" : "lazy"}
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

      {/* Infinite scroll trigger */}
      {displayedImages.length < filteredImages.length && (
        <div ref={observerTarget} className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Results info */}
      <div className="text-center text-sm text-muted-foreground">
        Showing {displayedImages.length} of {filteredImages.length} images
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

export default FastStorageImageSelector;