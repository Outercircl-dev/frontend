
import { UserMedia } from "@/components/profile/PhotoUploadModal";

// Get user media from localStorage
export const getUserMedia = (): UserMedia[] => {
  const media = localStorage.getItem('userMedia');
  return media ? JSON.parse(media) : [];
};

// Get user photos only (for backward compatibility)
export const getUserPhotos = (): UserMedia[] => {
  return getUserMedia().filter(media => media.type === 'image');
};

// Add new media to storage
export const addUserMedia = (media: UserMedia): void => {
  const existingMedia = getUserMedia();
  localStorage.setItem('userMedia', JSON.stringify([media, ...existingMedia]));
};

// Add photo (for backward compatibility)
export const addUserPhoto = (photo: UserMedia): void => {
  addUserMedia({...photo, type: photo.type || 'image'});
};

// Remove media from storage
export const removeUserMedia = (mediaId: string): void => {
  const existingMedia = getUserMedia();
  const updatedMedia = existingMedia.filter(media => media.id !== mediaId);
  localStorage.setItem('userMedia', JSON.stringify(updatedMedia));
};

// Remove photo (for backward compatibility)
export const removeUserPhoto = removeUserMedia;

// Get media by type
export const getMediaByType = (type: 'image' | 'video' | 'gif'): UserMedia[] => {
  return getUserMedia().filter(media => media.type === type);
};

// Get all media for event creation
export const getMediaForEvents = (): UserMedia[] => {
  return getUserMedia();
};
