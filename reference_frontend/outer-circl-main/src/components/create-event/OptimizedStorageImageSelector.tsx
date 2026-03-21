import React from 'react';
import UltraFastImageSelector from './UltraFastImageSelector';

interface OptimizedStorageImageSelectorProps {
  onImageSelected: (imageUrl: string) => void;
  onClose: () => void;
  activityCategory?: string;
  activityTitle?: string;
}

const OptimizedStorageImageSelector: React.FC<OptimizedStorageImageSelectorProps> = ({
  onImageSelected,
  onClose,
  activityCategory,
}) => {
  // Simply delegate to the ultra-fast selector
  return (
    <UltraFastImageSelector 
      onImageSelected={onImageSelected}
      onClose={onClose}
      activityCategory={activityCategory}
    />
  );
};

export default OptimizedStorageImageSelector;