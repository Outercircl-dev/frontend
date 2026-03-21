
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Lock, Share, Plus, Play, Image as ImageIcon, Video, Upload } from 'lucide-react';
import { UserMedia } from '@/utils/supabaseMediaStorage';
import MediaUploadModal from '@/components/profile/MediaUploadModal';

interface MediaGridProps {
  media: UserMedia[];
  canView?: boolean;
  isFriend?: boolean;
  privacySetting?: 'public' | 'friends' | 'private';
  isCurrentUser?: boolean;
  onCreateActivity?: (mediaItem: UserMedia) => void;
  onShareWithFriends?: (mediaItem: UserMedia) => void;
  onMediaUploaded?: (mediaItem: UserMedia) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({ 
  media, 
  canView = true, 
  isFriend = false,
  privacySetting = 'public',
  isCurrentUser = false,
  onCreateActivity,
  onShareWithFriends,
  onMediaUploaded
}) => {
  const [selectedMedia, setSelectedMedia] = useState<UserMedia | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const openMediaModal = (mediaItem: UserMedia) => {
    setSelectedMedia(mediaItem);
  };

  const closeMediaModal = () => {
    setSelectedMedia(null);
  };
  
  const canViewMedia = isCurrentUser || 
    privacySetting === 'public' || 
    (privacySetting === 'friends' && isFriend);

  if (!canViewMedia) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lock className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">
          {privacySetting === 'friends' 
            ? "Only friends can view this media" 
            : "This user's media is private"}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {privacySetting === 'friends' 
            ? "You need to be friends with this user to see their media" 
            : "The user has set their media to private"}
        </p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-600 mb-2">No media yet</h3>
        <p className="text-gray-500">
          {isCurrentUser ? 'Start sharing your photos and videos!' : 'No media to display'}
        </p>
      </div>
    );
  }

  const renderMediaThumbnail = (mediaItem: UserMedia) => {
    if (mediaItem.type === 'image' || mediaItem.type === 'gif') {
      return (
        <img 
          src={mediaItem.url} 
          alt={mediaItem.caption || 'User media'}
          className="w-full h-full object-cover"
        />
      );
    } else if (mediaItem.type === 'video') {
      return (
        <div className="relative w-full h-full">
          <video 
            src={mediaItem.url}
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play className="h-8 w-8 text-white" />
          </div>
        </div>
      );
    }
  };

  const getMediaTypeIcon = (type: UserMedia['type']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'gif':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Upload Button for Current User */}
      {isCurrentUser && (
        <div className="mb-6">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {media.map((mediaItem) => (
          <div 
            key={mediaItem.id} 
            className="relative rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all group bg-white border border-gray-200"
            onClick={() => openMediaModal(mediaItem)}
          >
            <div className="aspect-square relative">
              {renderMediaThumbnail(mediaItem)}
              
              {/* Media type indicator */}
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                {getMediaTypeIcon(mediaItem.type)}
                <span className="capitalize">{mediaItem.type}</span>
              </div>

              {/* Action buttons overlay */}
              {isCurrentUser && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateActivity?.(mediaItem);
                    }}
                    className="bg-[#E60023] hover:bg-[#D50C22] text-white rounded-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Activity
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareWithFriends?.(mediaItem);
                    }}
                    className="bg-white/90 hover:bg-white text-gray-900 rounded-full"
                  >
                    <Share className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                </div>
              )}

              {/* Caption overlay */}
              {mediaItem.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm truncate">{mediaItem.caption}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      <MediaUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onMediaUploaded={(newMedia) => {
          onMediaUploaded?.(newMedia);
          setShowUploadModal(false);
        }}
      />

      {/* Media Detail Modal */}
      <Dialog open={!!selectedMedia} onOpenChange={() => closeMediaModal()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            {selectedMedia && (
              <div className="flex flex-col lg:flex-row">
                {/* Media Display */}
                <div className="lg:w-2/3 bg-black flex items-center justify-center">
                  {selectedMedia.type === 'video' ? (
                    <video 
                      src={selectedMedia.url} 
                      controls
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  ) : (
                    <img 
                      src={selectedMedia.url} 
                      alt={selectedMedia.caption || 'User media'} 
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )}
                </div>

                {/* Media Info Panel */}
                <div className="lg:w-1/3 p-6 bg-white">
                  <div className="space-y-4">
                    {selectedMedia.caption && (
                      <div>
                        <DialogTitle className="text-lg mb-2">{selectedMedia.caption}</DialogTitle>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1.5" />
                      <span>{new Date(selectedMedia.timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-500">
                      {getMediaTypeIcon(selectedMedia.type)}
                      <span className="ml-1.5 capitalize">{selectedMedia.type}</span>
                    </div>

                    {/* Action buttons for current user */}
                    {isCurrentUser && (
                      <div className="space-y-2 pt-4 border-t">
                        <Button
                          onClick={() => {
                            onCreateActivity?.(selectedMedia);
                            closeMediaModal();
                          }}
                          className="w-full bg-[#E60023] hover:bg-[#D50C22] text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Activity
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            onShareWithFriends?.(selectedMedia);
                            closeMediaModal();
                          }}
                          className="w-full"
                        >
                          <Share className="h-4 w-4 mr-2" />
                          Share with Friends
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaGrid;
