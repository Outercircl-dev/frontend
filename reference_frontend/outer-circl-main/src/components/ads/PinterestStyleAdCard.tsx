import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMembership } from '@/components/OptimizedProviders';

interface PinterestStyleAdCardProps {
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
  fallbackContent?: React.ReactNode;
  showFallback?: boolean;
  size?: 'small' | 'medium' | 'large'; // Add size prop for backward compatibility
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const PinterestStyleAdCard: React.FC<PinterestStyleAdCardProps> = ({
  slot = "1234567890", // Test slot ID
  format = "auto",
  className = "",
  fallbackContent,
  showFallback = false,
  size = "medium" // Add size handling
}) => {
  const { showAds } = useMembership();
  const adRef = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const pushRef = useRef(false);

  // Don't render ads for premium users
  if (!showAds) {
    return null;
  }

  useEffect(() => {
    if (!adRef.current || pushRef.current) return;

    const loadAd = () => {
      try {
        // Initialize adsbygoogle if not present
        if (!window.adsbygoogle) {
          window.adsbygoogle = [];
        }

        // Push the ad configuration
        window.adsbygoogle.push({});
        pushRef.current = true;

        console.log(`📢 Pinterest Ad: Loaded slot ${slot}`);

        // Monitor ad loading
        const checkAdLoad = () => {
          const adElement = adRef.current;
          if (adElement) {
            const hasContent = adElement.children.length > 0 || 
                             adElement.innerHTML.trim().length > 0;
            const hasHeight = adElement.offsetHeight > 0;
            
            if (hasContent && hasHeight) {
              setAdLoaded(true);
              console.log(`✅ Pinterest Ad: Content loaded for slot ${slot}`);
            }
          }
        };

        // Check after delays
        setTimeout(checkAdLoad, 1000);
        setTimeout(checkAdLoad, 3000);
        setTimeout(() => {
          if (!adLoaded) {
            console.log(`⚠️ Pinterest Ad: No content after 5s for slot ${slot}`);
            setAdError(true);
          }
        }, 5000);

      } catch (error) {
        console.error(`❌ Pinterest Ad Error for slot ${slot}:`, error);
        setAdError(true);
      }
    };

    // Load ad when component mounts
    const timer = setTimeout(loadAd, 100);
    return () => clearTimeout(timer);
  }, [slot, adLoaded]);

  // Show fallback content if needed
  if (showFallback || adError) {
    return fallbackContent || (
      <Card className={`pinterest-card-hover mobile-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 ${className}`}>
        <div className="p-6 text-center">
          <div className="mb-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Discover Premium
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-2">
            Upgrade to Premium
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enjoy an ad-free experience with exclusive features
          </p>
          <div className="text-xs text-primary font-medium">
            Learn More →
          </div>
        </div>
      </Card>
    );
  }

  // Get responsive ad dimensions
  const getAdDimensions = () => {
    // Handle size prop for backward compatibility
    if (size) {
      switch (size) {
        case 'small':
          return { width: '250', height: '150' };
        case 'large':
          return { width: '350', height: '300' };
        default: // medium
          return { width: '300', height: '250' };
      }
    }
    
    // Handle format prop
    switch (format) {
      case 'rectangle':
        return { width: '300', height: '250' };
      case 'horizontal':
        return { width: '728', height: '90' };
      case 'vertical':
        return { width: '160', height: '600' };
      default:
        return { width: 'auto', height: 'auto' };
    }
  };

  const { width, height } = getAdDimensions();

  return (
    <Card className={`pinterest-card-hover mobile-card overflow-hidden ${className}`}>
      <div className="relative">
        {/* Subtle sponsored label */}
        <Badge 
          variant="secondary" 
          className="absolute top-2 right-2 z-10 text-xs bg-muted/80 text-muted-foreground border-0"
        >
          Sponsored
        </Badge>
        
        {/* Ad container with Pinterest styling */}
        <div className="p-2">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{
              display: format === 'auto' ? 'block' : 'inline-block',
              width: width,
              height: height,
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: 'calc(var(--radius) - 2px)',
              minHeight: format === 'auto' ? '200px' : undefined
            }}
            data-ad-client="ca-pub-2506170791039308"
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={format === 'auto' ? 'true' : 'false'}
          />
        </div>
      </div>
    </Card>
  );
};

export default PinterestStyleAdCard;