
import React from 'react';
import { useMembership } from '@/components/OptimizedProviders';
import { PinterestStyleAd } from '@/components/ads';

interface PinterestLayoutProps {
  children: React.ReactNode;
  className?: string;
  insertAdsEvery?: number; // Insert ads every N items
}

/**
 * A component that provides a Pinterest-style masonry layout with integrated ads
 */
const PinterestLayout: React.FC<PinterestLayoutProps> = ({ 
  children, 
  className = '',
  insertAdsEvery = 8 
}) => {
  const { showAds } = useMembership();
  
  // Convert children to array for easier manipulation
  const childrenArray = React.Children.toArray(children);
  
  // Insert ads at regular intervals for standard users
  const itemsWithAds: React.ReactNode[] = showAds 
    ? childrenArray.reduce<React.ReactNode[]>((acc, child, index) => {
        acc.push(child);
        
        // Insert ad after every insertAdsEvery items (but not after the last item)
        if ((index + 1) % insertAdsEvery === 0 && index < childrenArray.length - 1) {
          const adIndex = Math.floor((index + 1) / insertAdsEvery);
          const adSlots = [
            '1234567890',
            '2345678901', 
            '3456789012',
            '4567890123',
            '5678901234'
          ];
          const adSlot = adSlots[adIndex % adSlots.length];
          
          acc.push(
            <div key={`pinterest-ad-${adIndex}`} className="pinterest-ad-wrapper">
              <PinterestStyleAd 
                slot={adSlot}
                size={Math.random() > 0.5 ? 'medium' : 'small'}
                className="w-full"
              />
            </div>
          );
        }
        
        return acc;
      }, [])
    : childrenArray;

  return (
    <div className={`columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 ${className}`}>
      {itemsWithAds.map((item, index) => (
        <div key={index} className="break-inside-avoid mb-4">
          {item}
        </div>
      ))}
    </div>
  );
};

export default PinterestLayout;
