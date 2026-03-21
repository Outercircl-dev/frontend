import React from 'react';
import ManualAdUnit from './ManualAdUnit';

interface SidebarAdProps {
  className?: string;
  slot?: string;
  debug?: boolean;
}

const SidebarAd: React.FC<SidebarAdProps> = ({ 
  className = '',
  slot = '', // Empty slot means auto ads will handle placement
  debug = false
}) => {
  // For mobile performance, show placeholder instead of ads during beta
  if (process.env.NODE_ENV === 'development' || !slot) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`} style={{ minHeight: '250px', width: '300px', maxWidth: '100%' }}>
        <span className="text-xs text-gray-400">Sidebar Ad</span>
      </div>
    );
  }

  return (
    <ManualAdUnit
      slot={slot}
      format="rectangle"
      className={`sidebar-ad ${className}`}
      style={{ 
        minHeight: '250px', 
        maxHeight: '300px',
        width: '300px',
        maxWidth: '100%'
      }}
      responsive={true}
    />
  );
};

export default SidebarAd;