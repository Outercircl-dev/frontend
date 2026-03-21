import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StorageImage {
  name: string;
  url: string;
}

interface StorageImageSelectorProps {
  onImageSelected: (imageUrl: string) => void;
  onClose: () => void;
}

const StorageImageSelector: React.FC<StorageImageSelectorProps> = ({
  onImageSelected,
  onClose
}) => {
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    fetchStorageImages();
  }, []);

  const fetchStorageImages = async () => {
    try {
      console.log('🔍 Fetching images from activitystockimages bucket...');
      
      const { data: files, error } = await supabase.storage
        .from('activitystockimages')
        .list('', {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error('❌ Error fetching storage images:', error);
        toast.error(`Failed to load stock images: ${error.message}`);
        return;
      }

      console.log('📂 Found files:', files?.length || 0);

      if (files && files.length > 0) {
        const imageFiles = files.filter(file => 
          file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i)
        );

        console.log('🖼️ Image files found:', imageFiles.length);

        if (imageFiles.length === 0) {
          console.log('⚠️ No image files found in bucket');
          setImages([]);
          return;
        }

        const imageUrls = await Promise.all(
          imageFiles.map(async (file) => {
            const { data } = supabase.storage
              .from('activitystockimages')
              .getPublicUrl(file.name);
            
            console.log('🔗 Generated URL for', file.name, ':', data.publicUrl);
            
            return {
              name: file.name,
              url: data.publicUrl
            };
          })
        );

        console.log('✅ Successfully loaded', imageUrls.length, 'stock images');
        setImages(imageUrls);
      } else {
        console.log('📭 No files found in bucket');
        setImages([]);
      }
    } catch (error) {
      console.error('💥 Unexpected error:', error);
      toast.error(`Unexpected error loading images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleConfirmSelection = () => {
    if (selectedImage) {
      onImageSelected(selectedImage);
      onClose();
      toast.success('Stock image selected!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        <span className="ml-2 text-muted-foreground">Loading stock images...</span>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <Image className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-medium mb-2">No stock images available</h3>
        <p className="text-muted-foreground">
          Stock images will appear here when they're uploaded to the system
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
        {images.map((image) => (
          <div 
            key={image.name}
            onClick={() => handleImageSelect(image.url)}
            className={`cursor-pointer group relative rounded-lg overflow-hidden border-2 transition-all ${
              selectedImage === image.url 
                ? 'border-pink-500 ring-2 ring-pink-200' 
                : 'border-gray-200 hover:border-pink-300'
            }`}
          >
            <AspectRatio ratio={4/3}>
              <img 
                src={image.url} 
                alt={image.name.replace(/\.[^/.]+$/, "")}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </AspectRatio>
            
            {selectedImage === image.url && (
              <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                <div className="bg-pink-500 text-white rounded-full p-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Use This Image
          </Button>
        </div>
      )}
    </div>
  );
};

export default StorageImageSelector;