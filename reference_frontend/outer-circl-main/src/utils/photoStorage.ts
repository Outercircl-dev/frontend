
import { UserMedia, UserPhoto } from "@/components/profile/PhotoUploadModal";

// Storage key for user photos
const USER_PHOTOS_KEY = 'user_photos';

// Get all user photos from localStorage
export const getUserPhotos = (): UserMedia[] => {
  const photosJson = localStorage.getItem(USER_PHOTOS_KEY);
  return photosJson ? JSON.parse(photosJson) : [];
};

// Add a photo to user photos
export const addUserPhoto = (photo: UserMedia): void => {
  const photos = getUserPhotos();
  photos.unshift(photo); // Add to the beginning of the array
  localStorage.setItem(USER_PHOTOS_KEY, JSON.stringify(photos));
};

// Remove a photo by ID
export const removeUserPhoto = (photoId: string): void => {
  let photos = getUserPhotos();
  photos = photos.filter(photo => photo.id !== photoId);
  localStorage.setItem(USER_PHOTOS_KEY, JSON.stringify(photos));
};
