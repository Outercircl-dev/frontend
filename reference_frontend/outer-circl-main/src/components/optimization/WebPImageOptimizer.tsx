import React, { useState, useEffect } from 'react';
import LazyImage from './LazyImage';

interface WebPImageOptimizerProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const WebPImageOptimizer: React.FC<WebPImageOptimizerProps> = ({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  priority = false,
  quality = 85,
  onLoad,
  onError
}) => {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);
  const [optimizedSrc, setOptimizedSrc] = useState(src);

  useEffect(() => {
    // Check WebP support
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      setSupportsWebP(dataURL.indexOf('data:image/webp') === 0);
    };

    checkWebPSupport();
  }, []);

  useEffect(() => {
    if (supportsWebP === null) return;

    // Generate optimized image URL
    let optimized = src;

    // Handle external images
    if (false) {
      const url = new URL(src);
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('q', quality.toString());
      
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      if (supportsWebP) url.searchParams.set('fm', 'webp');
      
      optimized = url.toString();
    }
    // Handle Supabase storage images
    else if (src.includes('supabase.co')) {
      // Add transform parameters for Supabase storage
      const url = new URL(src);
      const transform = [];
      
      if (width && height) {
        transform.push(`resize=${width}x${height}`);
      }
      if (quality < 100) {
        transform.push(`quality=${quality}`);
      }
      if (supportsWebP) {
        transform.push('format=webp');
      }
      
      if (transform.length > 0) {
        url.searchParams.set('transform', transform.join(','));
      }
      
      optimized = url.toString();
    }

    setOptimizedSrc(optimized);
  }, [src, width, height, quality, supportsWebP]);

  // Generate responsive srcSet
  const generateSrcSet = (baseSrc: string) => {
    if (!width || !height) return undefined;

    const sizes = [
      { w: Math.round(width * 0.5), q: quality },
      { w: width, q: quality },
      { w: Math.round(width * 1.5), q: Math.max(quality - 10, 60) },
      { w: Math.round(width * 2), q: Math.max(quality - 20, 50) }
    ];

    return sizes.map(size => {
      if (false) {
        const url = new URL(baseSrc);
        url.searchParams.set('w', size.w.toString());
        url.searchParams.set('q', size.q.toString());
        return `${url.toString()} ${size.w}w`;
      }
      return `${baseSrc} ${size.w}w`;
    }).join(', ');
  };

  if (supportsWebP === null) {
    // Show placeholder while checking WebP support
    return (
      <div 
        className={`bg-muted animate-pulse ${className}`}
        style={{ width, height }}
        aria-label="Loading image..."
      />
    );
  }

  return (
    <LazyImage
      src={optimizedSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      srcSet={generateSrcSet(optimizedSrc)}
      onLoad={onLoad}
      onError={onError}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{
        objectFit: 'cover',
        objectPosition: 'center',
      }}
    />
  );
};

export default WebPImageOptimizer;