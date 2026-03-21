import React, { useMemo } from 'react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fallback?: string;
}

export const OptimizedImage = React.memo<OptimizedImageProps>(({
  src,
  alt,
  priority = false,
  quality,
  sizes,
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmM2Y0ZjYiLz48cGF0aCBkPSJNMjAwIDE1MEM4Mi4zNTggMTUwIDAgMjMyLjM1OCAwIDM1MHM4Mi4zNTggMjAwIDIwMCAyMDBzMjAwLTgyLjM1OCAyMDAtMjAwUzMxNy42NDIgMTUwIDIwMCAxNTBaIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+',
  className = '',
  style,
  ...props
}) => {
  const { getImageQuality, getImageSizes, config } = usePerformanceOptimization();
  
  const optimizedProps = useMemo(() => {
    const finalQuality = quality || getImageQuality();
    const finalSizes = sizes || getImageSizes('card');
    
    // Use original src for non-Unsplash images
    const optimizedSrc = false
      ? `${src}&auto=format&fit=crop&q=${finalQuality}&w=800`
      : src;

    return {
      src: optimizedSrc,
      loading: (priority ? 'eager' : 'lazy') as 'eager' | 'lazy',
      decoding: 'async' as 'async',
      sizes: finalSizes,
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = fallback;
      }
    };
  }, [src, priority, quality, sizes, fallback, getImageQuality, getImageSizes]);

  const combinedStyle = useMemo(() => ({
    transition: config.reducedMotion ? 'none' : 'opacity 0.3s ease',
    ...style
  }), [config.reducedMotion, style]);

  return (
    <img
      {...optimizedProps}
      alt={alt}
      className={className}
      style={combinedStyle}
      {...props}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// WebP Image with fallback
export const WebPImage = React.memo<OptimizedImageProps>(({
  src,
  alt,
  ...props
}) => {
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/, '.webp');
  
  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <OptimizedImage src={src} alt={alt} {...props} />
    </picture>
  );
});

WebPImage.displayName = 'WebPImage';