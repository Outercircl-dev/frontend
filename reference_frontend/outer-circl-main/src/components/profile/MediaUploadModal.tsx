
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, X, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMediaToSupabase, UserMedia } from '@/utils/supabaseMediaStorage';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMediaUploaded?: (media: UserMedia) => void;
}

const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  open,
  onOpenChange,
  onMediaUploaded
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit for videos
        toast.error('File size must be less than 100MB');
        return;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/mov', 'video/avi'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid media file (JPEG, PNG, GIF, WebP, MP4, WebM, MOV, AVI)');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload media');
        return;
      }

      // Upload to Supabase
      const result = await uploadMediaToSupabase(selectedFile, user.id, caption);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to upload media');
        return;
      }

      if (result.data && onMediaUploaded) {
        onMediaUploaded(result.data);
      }

      toast.success('Media uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setCaption('');
      onOpenChange(false);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileTypeDisplay = () => {
    if (!selectedFile) return null;
    
    if (selectedFile.type.includes('video')) {
      return { icon: Video, label: 'Video', color: 'text-blue-600' };
    } else if (selectedFile.type === 'image/gif') {
      return { icon: ImageIcon, label: 'GIF', color: 'text-purple-600' };
    } else {
      return { icon: ImageIcon, label: 'Image', color: 'text-green-600' };
    }
  };

  const renderPreview = () => {
    if (!selectedFile) return null;

    if (selectedFile.type.includes('video')) {
      return (
        <video 
          src={URL.createObjectURL(selectedFile)} 
          className="w-full h-48 object-cover rounded-lg"
          controls
        />
      );
    } else {
      return (
        <img 
          src={URL.createObjectURL(selectedFile)} 
          alt="Preview" 
          className="w-full h-48 object-cover rounded-lg"
        />
      );
    }
  };

  const fileTypeDisplay = getFileTypeDisplay();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload Media
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!selectedFile ? (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload media</p>
                <p className="text-sm text-gray-500">
                  Images: PNG, JPG, GIF, WebP up to 100MB<br />
                  Videos: MP4, WebM, MOV, AVI up to 100MB
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                {renderPreview()}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* File type indicator */}
                {fileTypeDisplay && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <fileTypeDisplay.icon className={`h-3 w-3 ${fileTypeDisplay.color}`} />
                    <span>{fileTypeDisplay.label}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption for your media..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              {isUploading ? 'Uploading...' : 'Upload Media'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaUploadModal;
