import React, { useState, useEffect } from 'react';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  saveData: boolean;
}

interface ConnectionAwareLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minLoadTime?: number;
}

export const ConnectionAwareLoader: React.FC<ConnectionAwareLoaderProps> = ({
  children,
  fallback,
  minLoadTime = 0
}) => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Check connection type
    const connection = (navigator as any).connection;
    if (connection) {
      const info: ConnectionInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        saveData: connection.saveData
      };
      setConnectionInfo(info);
      
      // Determine if connection is slow
      const slow = info.effectiveType === 'slow-2g' || 
                   info.effectiveType === '2g' || 
                   info.saveData ||
                   info.downlink < 1.5;
      setIsSlowConnection(slow);
    }
  }, []);

  return (
    <div data-connection-type={connectionInfo?.effectiveType}>
      {children}
    </div>
  );
};

// Hook for connection-aware optimizations
export const useConnectionAware = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      const updateConnection = () => {
        setConnectionInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          saveData: connection.saveData
        });
      };

      updateConnection();
      connection.addEventListener('change', updateConnection);

      return () => {
        connection.removeEventListener('change', updateConnection);
      };
    }
  }, []);

  const isSlowConnection = connectionInfo && (
    connectionInfo.effectiveType === 'slow-2g' ||
    connectionInfo.effectiveType === '2g' ||
    connectionInfo.saveData ||
    connectionInfo.downlink < 1.5
  );

  const getImageQuality = () => {
    if (!connectionInfo) return 0.8;
    
    if (isSlowConnection) return 0.4;
    if (connectionInfo.effectiveType === '3g') return 0.6;
    return 0.8;
  };

  const shouldReduceAnimations = () => {
    return isSlowConnection || connectionInfo?.saveData;
  };

  const getOptimalPageSize = (baseSize: number) => {
    if (isSlowConnection) return Math.max(5, Math.floor(baseSize * 0.5));
    if (connectionInfo?.effectiveType === '3g') return Math.floor(baseSize * 0.75);
    return baseSize;
  };

  return {
    connectionInfo,
    isSlowConnection: !!isSlowConnection,
    getImageQuality,
    shouldReduceAnimations,
    getOptimalPageSize
  };
};