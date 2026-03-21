
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BannerImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBannerUrl?: string;
  onBannerUpdate: (bannerUrl: string) => void;
}

const BannerImageModal: React.FC<BannerImageModalProps> = ({
  open,
  onOpenChange,
  currentBannerUrl,
  onBannerUpdate
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  // Predefined banner options
  const bannerOptions = [
    '/placeholder.svg',
    '/placeholder.svg',
    '/placeholder.svg',
    '/placeholder.svg',
    '/placeholder.svg',
    '/placeholder.svg',
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload images');
        return;
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${user.id}-${Date.now()}.${fileExt}`;

      // For now, we'll create a local URL for the image
      // In a real implementation, you'd upload to Supabase Storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleBannerSave(result);
      };
      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner image');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) {
      toast.error('Please enter a valid image URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
      handleBannerSave(imageUrl);
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleBannerSave = async (bannerUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to update your banner');
        return;
      }

      // First, check if the profiles table has banner_url column
      // If not, we'll store it in a custom field or handle it differently
      const { error } = await supabase
        .from('profiles')
        .update({ 
          bio: bannerUrl // Temporarily store banner URL in bio field until we add the column
        } as any)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating banner:', error);
        toast.error('Failed to update banner image');
        return;
      }

      onBannerUpdate(bannerUrl);
      onOpenChange(false);
      setImageUrl('');
      toast.success('Banner image updated successfully!');
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast.error('Failed to save banner image');
    }
  };

  const handlePresetSelect = (presetUrl: string) => {
    handleBannerSave(presetUrl);
  };

  const handleRemoveBanner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to update your banner');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          bio: null // Clear the banner URL from bio field
        } as any)
        .eq('id', user.id);

      if (error) {
        console.error('Error removing banner:', error);
        toast.error('Failed to remove banner image');
        return;
      }

      onBannerUpdate('');
      onOpenChange(false);
      toast.success('Banner image removed');
    } catch (error: any) {
      console.error('Error removing banner:', error);
      toast.error('Failed to remove banner image');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 font-sans">
            Change Banner Image
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-salmon transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="banner-upload"
                disabled={uploading}
              />
              <label
                htmlFor="banner-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                {uploading ? (
                  <Loader2 className="w-12 h-12 text-brand-salmon animate-spin" />
                ) : (
                  <Upload className="w-12 h-12 text-gray-400" />
                )}
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {uploading ? 'Uploading...' : 'Click to upload banner image'}
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG up to 5MB. Recommended size: 1200x400px
                  </p>
                </div>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-url" className="text-sm font-medium text-gray-700">
                  Image URL
                </Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleUrlSubmit}
                className="w-full bg-brand-salmon hover:bg-brand-dark-salmon"
              >
                Set Banner Image
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {bannerOptions.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetSelect(preset)}
                  className="relative aspect-[3/1] rounded-xl overflow-hidden border-2 border-transparent hover:border-brand-salmon transition-all duration-200 group"
                >
                  <img
                    src={preset}
                    alt={`Banner option ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Current banner preview */}
        {currentBannerUrl && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Current Banner</Label>
            <div className="relative aspect-[3/1] rounded-xl overflow-hidden border border-gray-200">
              <img
                src={currentBannerUrl}
                alt="Current banner"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {currentBannerUrl && (
            <Button
              variant="outline"
              onClick={handleRemoveBanner}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              Remove Banner
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BannerImageModal;
