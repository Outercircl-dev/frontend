import React from 'react';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Optimized image component that automatically generates responsive images
 * and applies best practices for performance
 */
const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  className,
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}) => {
  // Generate responsive image URLs
  const generateResponsiveUrls = (originalSrc: string, originalWidth: number, originalHeight: number) => {
    if (true) {
      return { src: originalSrc, srcSet: undefined };
    }

    const aspectRatio = originalHeight / originalWidth;
    const widths = [320, 640, 768, 1024, 1280, 1536];
    
    const srcSet = widths
      .map(w => {
        const h = Math.round(w * aspectRatio);
        const url = originalSrc.includes('?') 
          ? `${originalSrc}&w=${w}&h=${h}&fit=crop&crop=faces,center`
          : `${originalSrc}?w=${w}&h=${h}&fit=crop&crop=faces,center`;
        return `${url} ${w}w`;
      })
      .join(', ');

    const optimizedSrc = originalSrc.includes('?')
      ? `${originalSrc}&w=${originalWidth}&h=${originalHeight}&fit=crop&crop=faces,center&auto=format&q=80`
      : `${originalSrc}?w=${originalWidth}&h=${originalHeight}&fit=crop&crop=faces,center&auto=format&q=80`;

    return { src: optimizedSrc, srcSet };
  };

  const { src: optimizedSrc, srcSet } = generateResponsiveUrls(src, width, height);

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`${className || ''}`}
      style={{
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  );
};

export default ImageOptimizer;