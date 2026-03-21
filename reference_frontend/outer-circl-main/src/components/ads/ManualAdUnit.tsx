import React, { useEffect } from 'react';
import { useMembership } from '@/components/OptimizedProviders';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface ManualAdUnitProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
}

const ManualAdUnit: React.FC<ManualAdUnitProps> = ({
  slot,
  format = 'auto',
  style = {},
  className = '',
  responsive = true
}) => {
  const { showAds, membershipTier } = useMembership();

  useEffect(() => {
    if (!showAds) {
      console.log(`🚫 Manual Ad[${slot}]: Premium user, not loading ads`);
      return;
    }

    if (!slot || slot.includes('1234567890') || slot.includes('test')) {
      console.warn(`⚠️ Manual Ad[${slot}]: Using test slot ID - won't show real ads`);
      return;
    }

    console.log(`📢 Manual Ad[${slot}]: Loading for standard user`);

    // Initialize adsbygoogle if not present
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }

    // Push ad request
    try {
      window.adsbygoogle.push({});
      console.log(`✅ Manual Ad[${slot}]: Request sent`);
    } catch (error) {
      console.error(`❌ Manual Ad[${slot}]: Failed to load`, error);
    }
  }, [showAds, slot, membershipTier]);

  // Don't render anything for premium users
  if (!showAds) {
    return null;
  }

  const defaultStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: format === 'rectangle' ? '250px' : format === 'horizontal' ? '90px' : 'auto',
    ...style
  };

  return (
    <div className={`adsense-container ${className}`} style={{ textAlign: 'center', margin: '0' }}>
      <ins
        className="adsbygoogle"
        style={defaultStyle}
        data-ad-client="ca-pub-2506170791039308"
        data-ad-slot={slot}
        data-ad-format={responsive ? 'auto' : format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

export default ManualAdUnit;