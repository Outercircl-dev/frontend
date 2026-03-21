
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Lock } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  caption?: string;
  date?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  canView?: boolean;
  isFriend?: boolean;
  privacySetting?: 'public' | 'friends' | 'private';
  isCurrentUser?: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ 
  photos, 
  canView = true, 
  isFriend = false,
  privacySetting = 'public',
  isCurrentUser = false
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const openPhotoModal = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
  };
  
  const canViewPhotos = isCurrentUser || 
    privacySetting === 'public' || 
    (privacySetting === 'friends' && isFriend);

  if (!canViewPhotos) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lock className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">
          {privacySetting === 'friends' 
            ? "Only friends can view these photos" 
            : "This user's photos are private"}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {privacySetting === 'friends' 
            ? "You need to be friends with this user to see their photos" 
            : "The user has set their photos to private"}
        </p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No photos to display</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 masonry-grid">
        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className="relative rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
            onClick={() => openPhotoModal(photo)}
          >
            <img 
              src={photo.url} 
              alt={photo.caption || 'User photo'}
              className="w-full h-auto object-cover aspect-square object-center group-hover:scale-105 transition-transform duration-500"
            />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => closePhotoModal()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="relative">
            {selectedPhoto && (
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.caption || 'User photo'} 
                className="w-full h-auto"
              />
            )}
          </div>
          <div className="p-4">
            {selectedPhoto?.caption && (
              <DialogTitle className="text-lg mb-2">{selectedPhoto.caption}</DialogTitle>
            )}
            {selectedPhoto?.date && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1.5" />
                <span>{new Date(selectedPhoto.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGrid;
