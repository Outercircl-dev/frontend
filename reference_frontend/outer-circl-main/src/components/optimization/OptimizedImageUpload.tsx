import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';

interface OptimizedImageUploadProps {
  currentImage?: string;
  onImageSelected: (imageUrl: string) => void;
  onImageRemoved?: () => void;
  accept?: string;
  maxSizeMB?: number;
  aspectRatio?: string;
  placeholder?: string;
}

export const OptimizedImageUpload: React.FC<OptimizedImageUploadProps> = ({
  currentImage,
  onImageSelected,
  onImageRemoved,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSizeMB = 10,
  aspectRatio = 'aspect-[4/3]',
  placeholder = 'Upload an image'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const validateImage = (file: File): string | null => {
    // Check file type
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileType = file.type;
    
    if (!acceptedTypes.some(type => fileType.includes(type.replace('image/', '')))) {
      return `Please select a valid image file (${accept})`;
    }

    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `Image size must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  const processImageFile = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = async (file: File) => {
    // Validate the image
    const validationError = validateImage(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploading(true);
    
    try {
      toast.loading('Processing image...', { id: 'image-upload' });
      
      // Convert to data URL for preview and usage
      const dataUrl = await processImageFile(file);
      setPreviewUrl(dataUrl);
      
      // Call the callback with the processed image
      onImageSelected(dataUrl);
      toast.success('Image uploaded successfully!', { id: 'image-upload' });
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.', { id: 'image-upload' });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageRemoved?.();
  };

  const displayImage = previewUrl || currentImage;

  return (
    <div className="space-y-4">
      {displayImage ? (
        <div className={`${aspectRatio} relative rounded-lg overflow-hidden border-2 border-border group`}>
          <OptimizedImage
            src={displayImage}
            alt="Uploaded image"
            className="w-full h-full object-cover"
            priority={true}
          />
          
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={triggerFileInput}
              disabled={isUploading}
              className="bg-white/90 text-black hover:bg-white"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Replace
            </Button>
            
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemoveImage}
              disabled={isUploading}
              className="bg-red-500/90 hover:bg-red-500"
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className={`${aspectRatio} border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/50 hover:bg-muted`}
          onClick={triggerFileInput}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{placeholder}</p>
              <p className="text-xs text-muted-foreground">
                Max {maxSizeMB}MB • {accept.replace(/image\//g, '').toUpperCase()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};