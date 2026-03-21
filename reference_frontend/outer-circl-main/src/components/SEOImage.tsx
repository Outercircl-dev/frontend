import React from 'react';

/**
 * SEO-optimized image component with proper attributes for better indexing
 */

interface SEOImageProps {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  srcSet?: string;
  priority?: boolean;
  itemProp?: string;
  schema?: {
    '@type'?: 'ImageObject';
    contentUrl?: string;
    description?: string;
    name?: string;
    author?: string;
    copyrightHolder?: string;
    license?: string;
  };
}

export const SEOImage: React.FC<SEOImageProps> = ({
  src,
  alt,
  title,
  caption,
  width,
  height,
  className = '',
  loading = 'lazy',
  sizes,
  srcSet,
  priority = false,
  itemProp,
  schema
}) => {
  // Generate structured data for the image if schema is provided
  const imageStructuredData = schema ? {
    "@context": "https://schema.org",
    "@type": schema['@type'] || "ImageObject",
    "contentUrl": schema.contentUrl || src,
    "description": schema.description || alt,
    "name": schema.name || title || alt,
    ...(schema.author && { "author": schema.author }),
    ...(schema.copyrightHolder && { "copyrightHolder": schema.copyrightHolder }),
    ...(schema.license && { "license": schema.license })
  } : null;

  return (
    <figure className={`seo-image-container ${className}`} itemScope itemType="https://schema.org/ImageObject">
      {imageStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(imageStructuredData) }}
        />
      )}
      
      <img
        src={src}
        alt={alt}
        title={title}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        sizes={sizes}
        srcSet={srcSet}
        itemProp={itemProp || "contentUrl"}
        className="w-full h-auto"
        // Add performance hints for priority images
        {...(priority && {
          fetchPriority: 'high' as const,
          decoding: 'sync' as const
        })}
        // Add SEO-friendly attributes
        {...(width && height && {
          style: { aspectRatio: `${width}/${height}` }
        })}
      />
      
      {caption && (
        <figcaption className="text-sm text-muted-foreground mt-2" itemProp="caption">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

/**
 * Hook to generate responsive image sizes and srcSet
 */
export const useResponsiveImage = (
  baseSrc: string,
  breakpoints: { [key: string]: number } = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  }
) => {
  const generateSrcSet = () => {
    // For Supabase storage URLs, we can add transformation parameters
    if (baseSrc.includes('supabase.co')) {
      return Object.values(breakpoints)
        .map(width => `${baseSrc}?width=${width}&quality=80 ${width}w`)
        .join(', ');
    }
    
    // For other URLs, return the original
    return '';
  };

  const generateSizes = () => {
    const entries = Object.entries(breakpoints);
    return entries
      .map(([name, width], index) => {
        if (index === entries.length - 1) {
          return `${width}px`;
        }
        return `(max-width: ${width}px) ${width}px`;
      })
      .join(', ');
  };

  return {
    srcSet: generateSrcSet(),
    sizes: generateSizes()
  };
};

/**
 * Component for hero images with enhanced SEO
 */
export const SEOHeroImage: React.FC<SEOImageProps & {
  heroTitle?: string;
  heroDescription?: string;
}> = ({ heroTitle, heroDescription, ...props }) => {
  const { srcSet, sizes } = useResponsiveImage(props.src);
  
  return (
    <SEOImage
      {...props}
      srcSet={srcSet}
      sizes={sizes}
      priority={true}
      loading="eager"
      schema={{
        '@type': 'ImageObject',
        contentUrl: props.src,
        description: heroDescription || props.alt,
        name: heroTitle || props.title || props.alt,
        ...props.schema
      }}
    />
  );
};

export default SEOImage;