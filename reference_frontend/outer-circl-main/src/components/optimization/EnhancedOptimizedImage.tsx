import React, { useState, useCallback } from 'react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

interface EnhancedOptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fallback?: string;
  retryCount?: number;
  showLoadingState?: boolean;
}

/**
 * Enhanced image component with retry logic, loading states, and better error handling
 */
export const EnhancedOptimizedImage = React.memo<EnhancedOptimizedImageProps>(({
  src,
  alt,
  priority = false,
  quality,
  sizes,
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmM2Y0ZjYiLz48cGF0aCBkPSJNMjAwIDE1MEM4Mi4zNTggMTUwIDAgMjMyLjM1OCAwIDM1MHM4Mi4zNTggMjAwIDIwMCAyMDBzMjAwLTgyLjM1OCAyMDAtMjAwUzMxNy42NDIgMTUwIDIwMCAxNTBaIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+',
  retryCount = 2,
  showLoadingState = true,
  className = '',
  style,
  ...props
}) => {
  const { getImageQuality, getImageSizes, config } = usePerformanceOptimization();
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    
    if (retryAttempts < retryCount && currentSrc !== fallback) {
      // Retry with the same image after a delay
      const retryDelay = Math.pow(2, retryAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        setRetryAttempts(prev => prev + 1);
        setIsLoading(true);
        setHasError(false);
        // Force reload by adding timestamp
        setCurrentSrc(`${src}?retry=${Date.now()}`);
      }, retryDelay);
    } else {
      // All retries exhausted, use fallback
      setHasError(true);
      e.currentTarget.src = fallback;
    }
  }, [currentSrc, fallback, retryAttempts, retryCount, src]);

  const finalQuality = quality || getImageQuality();
  const finalSizes = sizes || getImageSizes('card');

  const combinedStyle = {
    transition: config.reducedMotion ? 'none' : 'opacity 0.3s ease',
    opacity: isLoading && showLoadingState ? 0.7 : 1,
    ...style
  };

  const combinedClassName = `${className} ${isLoading && showLoadingState ? 'animate-pulse' : ''}`.trim();

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      sizes={finalSizes}
      onLoad={handleLoad}
      onError={handleError}
      className={combinedClassName}
      style={combinedStyle}
      {...props}
    />
  );
});

EnhancedOptimizedImage.displayName = 'EnhancedOptimizedImage';

export default EnhancedOptimizedImage;