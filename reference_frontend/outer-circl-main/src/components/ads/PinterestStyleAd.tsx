import React from 'react';
import ManualAdUnit from './ManualAdUnit';

interface PinterestStyleAdProps {
  className?: string;
  slot?: string;
  size?: 'small' | 'medium' | 'large';
  debug?: boolean;
}

const PinterestStyleAd: React.FC<PinterestStyleAdProps> = ({ 
  className = '',
  slot = '', // Empty slot means auto ads will handle placement
  size = 'medium',
  debug = false
}) => {
  const getAdStyle = () => {
    switch (size) {
      case 'small':
        return {
          minHeight: '150px',
          maxHeight: '200px',
          borderRadius: '12px',
          overflow: 'hidden'
        };
      case 'large':
        return {
          minHeight: '350px',
          maxHeight: '400px',
          borderRadius: '16px',
          overflow: 'hidden'
        };
      default: // medium
        return {
          minHeight: '250px',
          maxHeight: '300px',
          borderRadius: '12px',
          overflow: 'hidden'
        };
    }
  };

  // Auto ads placement - no manual slot needed for auto ads
  return (
    <div className={`pinterest-ad bg-card border border-border shadow-sm hover:shadow-md transition-shadow rounded-xl overflow-hidden ${className}`}>
      <div 
        className="pinterest-auto-ad-space"
        style={{
          ...getAdStyle(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'hsl(var(--muted) / 0.5)',
          color: 'hsl(var(--muted-foreground))',
          fontSize: '12px',
          fontWeight: '500'
        }}
      >
        <div className="text-center">
          <div className="mb-2 opacity-60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto">
              <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 21l8-4.5L8 12v9z" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
          <span className="text-xs">Advertisement</span>
        </div>
      </div>
    </div>
  );
};

export default PinterestStyleAd;