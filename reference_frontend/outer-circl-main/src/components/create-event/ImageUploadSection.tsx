
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Image, ImagePlus, Upload, Archive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import OptimizedStorageImageSelector from './OptimizedStorageImageSelector';
import { getOutercircleDefaultImage } from '@/utils/defaultImages';

interface UserMedia {
  id: string;
  file_path: string;
  file_name: string;
  caption?: string;
  created_at: string;
}


interface ImageUploadSectionProps {
  eventImage: string;
  onImageSelected: (imageUrl: string) => void;
}

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  eventImage,
  onImageSelected
}) => {
  const [openStockImagesDialog, setOpenStockImagesDialog] = useState(false);
  const [openUserPhotosDialog, setOpenUserPhotosDialog] = useState(false);
  const [userPhotos, setUserPhotos] = useState<UserMedia[]>([]);
  const [loadingUserPhotos, setLoadingUserPhotos] = useState(false);

  // Get the default outercircle logo
  const defaultImage = getOutercircleDefaultImage();
  
  // Show the default image if no event image is selected
  const displayImage = eventImage || defaultImage;

  // Load user photos from Supabase
  const fetchUserPhotos = async () => {
    if (!supabase) return;
    
    setLoadingUserPhotos(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_media')
        .select('id, file_path, file_name, caption, created_at')
        .eq('user_id', user.id)
        .eq('media_type', 'photo')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user photos:', error);
        return;
      }

      // Convert file_path to public URLs
      const photosWithUrls = await Promise.all(
        (data || []).map(async (photo) => {
          const { data: urlData } = supabase.storage
            .from('user-media')
            .getPublicUrl(photo.file_path);
          
          return {
            ...photo,
            url: urlData.publicUrl
          };
        })
      );

      setUserPhotos(photosWithUrls);
    } catch (error) {
      console.error('Error fetching user photos:', error);
    } finally {
      setLoadingUserPhotos(false);
    }
  };


  useEffect(() => {
    if (openUserPhotosDialog) {
      fetchUserPhotos();
    }
  }, [openUserPhotosDialog]);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Enhanced validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Please upload an image under 10MB.');
      return;
    }
    
    // Show loading toast
    toast.loading('Processing image...', { id: 'image-upload' });
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onImageSelected(event.target.result);
        toast.success('✨ Image uploaded successfully!', { id: 'image-upload' });
      } else {
        toast.error('Failed to process image', { id: 'image-upload' });
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file', { id: 'image-upload' });
    };
    reader.readAsDataURL(file);
  };

  const selectUserPhoto = (photo: UserMedia & { url: string }) => {
    onImageSelected(photo.url);
    setOpenUserPhotosDialog(false);
    toast.success('Your photo selected!');
  };


  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Event Image</Label>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Image preview with Pinterest-style rounded corners */}
        <div className="md:col-span-3">
          <Card className={`relative w-full overflow-hidden rounded-2xl border-2 ${eventImage ? 'border-pink-300' : 'border-dashed border-pink-300'} aspect-[5/3] flex items-center justify-center bg-pink-50 hover:bg-pink-100 transition-colors`}>
            <img 
              src={displayImage} 
              alt={eventImage ? "Event" : "Outercircle Default"} 
              className="w-full h-full object-cover"
            />
            {!eventImage && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="text-center p-6 text-white">
                  <p className="text-sm font-medium mb-2">Default Outercircle Image</p>
                  <p className="text-xs opacity-80">Upload your own or choose from stock images</p>
                </div>
              </div>
            )}
          </Card>
        </div>
        
        {/* Action buttons with Pinterest-style design */}
        <div className="md:col-span-2 flex flex-col gap-3">
          <label>
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2 border-pink-300 text-pink-600 hover:bg-pink-50 rounded-xl"
              onClick={() => document.getElementById('file-upload')?.click()}
              type="button"
            >
              <Upload className="h-4 w-4" /> Upload Image
            </Button>
            <Input 
              id="file-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>

          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 border-pink-300 text-pink-600 hover:bg-pink-50 rounded-xl"
            onClick={() => setOpenUserPhotosDialog(true)}
            type="button"
          >
            <Image className="h-4 w-4" /> My Photos
          </Button>

          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 rounded-xl"
            onClick={() => setOpenStockImagesDialog(true)}
            type="button"
          >
            <Archive className="h-4 w-4" /> Stock Images
          </Button>

          {!eventImage && (
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2 border-green-300 text-green-600 hover:bg-green-50 rounded-xl"
              onClick={() => onImageSelected(defaultImage)}
              type="button"
            >
              <ImagePlus className="h-4 w-4" /> Use Default Logo
            </Button>
          )}
          
          {eventImage && (
            <Button 
              variant="outline" 
              className="w-full border-pink-300 text-pink-600 hover:bg-pink-50 rounded-xl"
              onClick={() => onImageSelected('')}
              type="button"
            >
              Reset to Default
            </Button>
          )}
        </div>
      </div>

      {/* Stock Images Dialog */}
      <Dialog open={openStockImagesDialog} onOpenChange={setOpenStockImagesDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-blue-500" />
              Choose Stock Image
            </DialogTitle>
            <DialogDescription>
              Select from our collection of high-quality activity images
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <OptimizedStorageImageSelector 
              onImageSelected={(url) => {
                onImageSelected(url);
                setOpenStockImagesDialog(false);
              }}
              onClose={() => setOpenStockImagesDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* User Photos Dialog */}
      <Dialog open={openUserPhotosDialog} onOpenChange={setOpenUserPhotosDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Choose from your photos</DialogTitle>
            <DialogDescription>
              Select one of your uploaded photos for your activity
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingUserPhotos ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                <span className="ml-2 text-muted-foreground">Loading your photos...</span>
              </div>
            ) : userPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                {userPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    onClick={() => selectUserPhoto(photo as UserMedia & { url: string })}
                    className="cursor-pointer group relative"
                  >
                    <AspectRatio ratio={1/1} className="rounded-lg overflow-hidden border-2 hover:border-pink-500 transition-all">
                      <img 
                        src={(photo as any).url} 
                        alt={photo.caption || photo.file_name}
                        className="object-cover w-full h-full"
                      />
                    </AspectRatio>
                    <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <p className="text-white text-xs font-medium truncate">{photo.caption || photo.file_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium mb-2">No photos yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload photos in your profile page to use them for events
                </p>
                <Button 
                  onClick={() => {
                    setOpenUserPhotosDialog(false);
                    window.location.href = '/profile';
                  }}
                  className="bg-[#E60023] hover:bg-[#D50C22] text-white"
                >
                  Go to Profile
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ImageUploadSection;
