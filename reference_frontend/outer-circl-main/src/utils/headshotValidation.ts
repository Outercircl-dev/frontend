// Simple headshot validation without heavy AI dependencies
export const validateHeadshot = async (file: File): Promise<{ isValid: boolean; message: string }> => {
  try {
    // Basic file validation
    if (!file.type.startsWith('image/')) {
      return { isValid: false, message: 'Please upload an image file.' };
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return { isValid: false, message: 'Image file must be smaller than 5MB.' };
    }

    // Create image element for dimension checks
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Basic dimension check
    if (img.width < 200 || img.height < 200) {
      URL.revokeObjectURL(imageUrl);
      return { isValid: false, message: 'Image must be at least 200x200 pixels for clear headshot quality.' };
    }

    // Check aspect ratio (reasonable for headshots)
    const aspectRatio = img.width / img.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      URL.revokeObjectURL(imageUrl);
      return { isValid: false, message: 'Please upload a photo with a reasonable aspect ratio for a headshot.' };
    }

    URL.revokeObjectURL(imageUrl);
    return { isValid: true, message: 'Photo looks good! Ready to upload.' };

  } catch (error) {
    console.error('Error validating headshot:', error);
    return { 
      isValid: false, 
      message: 'Unable to validate photo. Please try again or contact support if the issue persists.' 
    };
  }
};

export const loadImageFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};