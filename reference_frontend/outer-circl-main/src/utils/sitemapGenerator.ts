/**
 * Dynamic sitemap generation utility for build-time or server-side generation
 */

import { generateSitemapXML, staticPages, type SitemapUrl } from './dynamicSitemap';

// Function to generate event URLs (would be called during build or server-side)
export const generateEventUrls = async (): Promise<SitemapUrl[]> => {
  // In a real implementation, this would fetch from your database
  // For now, return a template structure
  return [
    // Example event URLs - in production these would be fetched from Supabase
    // {
    //   loc: '/event/example-event-id',
    //   lastmod: new Date().toISOString().split('T')[0],
    //   changefreq: 'weekly',
    //   priority: 0.8,
    //   images: [{
    //     loc: '/event-images/example-event.jpg',
    //     caption: 'Example event image',
    //     title: 'Example Event'
    //   }]
    // }
  ];
};

// Function to generate profile URLs
export const generateProfileUrls = async (): Promise<SitemapUrl[]> => {
  // In a real implementation, this would fetch public profiles from your database
  return [
    // Example structure - would be populated from database
    // {
    //   loc: '/profile/user-id',
    //   lastmod: new Date().toISOString().split('T')[0],
    //   changefreq: 'weekly',
    //   priority: 0.6
    // }
  ];
};

// Function to generate category URLs
export const generateCategoryUrls = (): SitemapUrl[] => {
  const categories = [
    'outdoor-adventures',
    'fitness-sports',
    'food-drink',
    'arts-culture',
    'social-networking',
    'learning-development',
    'wellness-mindfulness',
    'family-kids',
    'professional-networking',
    'volunteer-community'
  ];

  return categories.map(category => ({
    loc: `/dashboard?category=${category}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily' as const,
    priority: 0.7
  }));
};

// Main function to generate complete sitemap
export const generateCompleteSitemap = async (): Promise<string> => {
  const allUrls: SitemapUrl[] = [...staticPages];
  
  // Add category URLs
  allUrls.push(...generateCategoryUrls());
  
  // Add dynamic URLs
  const eventUrls = await generateEventUrls();
  const profileUrls = await generateProfileUrls();
  
  allUrls.push(...eventUrls);
  allUrls.push(...profileUrls);
  
  return generateSitemapXML(allUrls);
};

// Function to generate specific sitemaps (for sitemap index)
export const generateSitemapsByType = async () => {
  const staticSitemap = generateSitemapXML(staticPages);
  const categorySitemap = generateSitemapXML(generateCategoryUrls());
  const eventSitemap = generateSitemapXML(await generateEventUrls());
  const profileSitemap = generateSitemapXML(await generateProfileUrls());
  
  return {
    static: staticSitemap,
    categories: categorySitemap,
    events: eventSitemap,
    profiles: profileSitemap
  };
};

export default {
  generateCompleteSitemap,
  generateSitemapsByType,
  generateEventUrls,
  generateProfileUrls,
  generateCategoryUrls
};