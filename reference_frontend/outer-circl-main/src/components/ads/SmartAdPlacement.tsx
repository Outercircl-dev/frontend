import React, { useState, useEffect } from 'react';
import PinterestStyleAdCard from './PinterestStyleAdCard';
import AdFallbackCard from './AdFallbackCard';
import { useMembership } from '@/components/OptimizedProviders';

interface SmartAdPlacementProps {
  position: 'feed' | 'sidebar' | 'footer';
  index?: number;
  className?: string;
}

const SmartAdPlacement: React.FC<SmartAdPlacementProps> = ({
  position,
  index = 0,
  className = ""
}) => {
  const { showAds } = useMembership();
  const [showFallback, setShowFallback] = useState(false);
  const [adAttempts, setAdAttempts] = useState(0);

  // Don't render for premium users
  if (!showAds) return null;

  // Ad placement strategy based on position
  const getAdConfig = () => {
    switch (position) {
      case 'feed':
        // Every 5th item in the feed
        return {
          slot: `feed_${index}`,
          format: 'auto' as const,
          shouldShow: index % 5 === 4,
          fallbackVariant: index % 3 === 0 ? 'premium' : index % 3 === 1 ? 'feature' : 'community'
        };
      
      case 'sidebar':
        return {
          slot: `sidebar_${index}`,
          format: 'rectangle' as const,
          shouldShow: true,
          fallbackVariant: 'premium'
        };
      
      case 'footer':
        return {
          slot: `footer_${index}`,
          format: 'horizontal' as const,
          shouldShow: true,
          fallbackVariant: 'feature'
        };
      
      default:
        return {
          slot: `default_${index}`,
          format: 'auto' as const,
          shouldShow: true,
          fallbackVariant: 'premium'
        };
    }
  };

  const { slot, format, shouldShow, fallbackVariant } = getAdConfig();

  // Use fallback strategy if ad doesn't load
  useEffect(() => {
    if (!shouldShow) return;

    // Check if we should show fallback based on various factors
    const checkFallback = () => {
      const isLocalhost = window.location.hostname === 'localhost';
      const isLowTraffic = document.referrer === ''; // Simplified check
      const hasAdBlocker = window.navigator.userAgent.includes('AdBlock'); // Simplified check
      
      // Show fallback for development, low traffic, or ad blockers
      if (isLocalhost || isLowTraffic || hasAdBlocker || adAttempts > 2) {
        setShowFallback(true);
      }
    };

    // Wait a bit for ads to load, then check if we need fallback
    const timer = setTimeout(checkFallback, 3000);
    return () => clearTimeout(timer);
  }, [shouldShow, adAttempts]);

  // Handle ad load failures
  const handleAdError = () => {
    setAdAttempts(prev => prev + 1);
    if (adAttempts >= 1) {
      setShowFallback(true);
    }
  };

  if (!shouldShow) return null;

  return (
    <div className={`smart-ad-placement ${className}`}>
      {showFallback ? (
        <AdFallbackCard 
          variant={fallbackVariant as any}
          className="w-full"
        />
      ) : (
        <PinterestStyleAdCard
          slot={slot}
          format={format}
          className="w-full"
          showFallback={showFallback}
          fallbackContent={
            <AdFallbackCard 
              variant={fallbackVariant as any}
              className="w-full"
            />
          }
        />
      )}
    </div>
  );
};

export default SmartAdPlacement;