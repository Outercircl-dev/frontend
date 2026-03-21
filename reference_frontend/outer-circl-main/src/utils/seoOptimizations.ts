/**
 * SEO Optimizations and validation utilities
 */

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: string;
}

export const validateSEO = (
  title: string,
  description: string,
  canonicalUrl: string
): SEOIssue[] => {
  const issues: SEOIssue[] = [];

  // Title validation
  if (title.length > 60) {
    issues.push({
      type: 'warning',
      message: `Title is ${title.length} characters (recommended max: 60)`,
      fix: 'Shorten the title to improve search result display'
    });
  }

  if (title.length < 30) {
    issues.push({
      type: 'warning',
      message: `Title is ${title.length} characters (recommended min: 30)`,
      fix: 'Consider adding more descriptive keywords to the title'
    });
  }

  // Description validation
  if (description.length > 160) {
    issues.push({
      type: 'warning',
      message: `Description is ${description.length} characters (recommended max: 160)`,
      fix: 'Shorten the description to improve search result display'
    });
  }

  if (description.length < 120) {
    issues.push({
      type: 'warning',
      message: `Description is ${description.length} characters (recommended min: 120)`,
      fix: 'Consider adding more details to the description'
    });
  }

  // Canonical URL validation
  if (!canonicalUrl.startsWith('https://outercircl.com')) {
    issues.push({
      type: 'error',
      message: 'Canonical URL should use the primary domain',
      fix: 'Ensure canonical URL starts with https://outercircl.com'
    });
  }

  return issues;
};

export const generateMetaKeywords = (category?: string, location?: string): string => {
  const baseKeywords = [
    'activity buddies',
    'local events',
    'community activities',
    'social meetups',
    'find friends',
    'activity partners'
  ];

  if (category) {
    baseKeywords.push(`${category} activities`, `${category} groups`);
  }

  if (location) {
    baseKeywords.push(`activities in ${location}`, `${location} events`);
  }

  return baseKeywords.join(', ');
};

export const optimizeImageAlt = (
  filename: string,
  context?: string
): string => {
  // Remove file extension and clean up
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const cleanName = baseName.replace(/[-_]/g, ' ');
  
  if (context) {
    return `${cleanName} - ${context}`;
  }
  
  return cleanName;
};

export const generateSocialMediaTags = (
  title: string,
  description: string,
  imageUrl: string,
  canonicalUrl: string
) => ({
  og: {
    type: 'website',
    title: title,
    description: description,
    image: imageUrl,
    url: canonicalUrl,
    site_name: 'outercircl'
  },
  twitter: {
    card: 'summary_large_image',
    title: title,
    description: description,
    image: imageUrl
  }
});

export default {
  validateSEO,
  generateMetaKeywords,
  optimizeImageAlt,
  generateSocialMediaTags
};