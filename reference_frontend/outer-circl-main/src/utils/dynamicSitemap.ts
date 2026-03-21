/**
 * Dynamic sitemap generation utilities
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{
    loc: string;
    caption?: string;
    title?: string;
  }>;
}

export interface SitemapConfig {
  baseUrl: string;
  excludePatterns?: string[];
  includeImages?: boolean;
  defaultChangefreq?: SitemapUrl['changefreq'];
  defaultPriority?: number;
}

const defaultConfig: SitemapConfig = {
  baseUrl: 'https://outercircl.com',
  defaultChangefreq: 'weekly',
  defaultPriority: 0.5,
  includeImages: true,
  excludePatterns: [
    '/admin',
    '/auth',
    '/settings',
    '/messages',
    '/notifications',
    '*/edit',
    '*/delete'
  ]
};

// Static pages with their configurations
export const staticPages: SitemapUrl[] = [
  {
    loc: '/',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 1.0
  },
  {
    loc: '/membership',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/about-us',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/contact-us',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: '/help',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: '/privacy-policy',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'yearly',
    priority: 0.3
  },
  {
    loc: '/terms-of-service',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'yearly',
    priority: 0.3
  },
  {
    loc: '/community-guidelines',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'yearly',
    priority: 0.3
  }
];

export const generateSitemapXML = (urls: SitemapUrl[], config: SitemapConfig = defaultConfig): string => {
  const { baseUrl, includeImages } = config;
  
  const urlsXML = urls.map(url => {
    const fullUrl = url.loc.startsWith('http') ? url.loc : `${baseUrl}${url.loc}`;
    
    let urlXML = `  <url>
    <loc>${fullUrl}</loc>`;
    
    if (url.lastmod) {
      urlXML += `
    <lastmod>${url.lastmod}</lastmod>`;
    }
    
    if (url.changefreq) {
      urlXML += `
    <changefreq>${url.changefreq}</changefreq>`;
    }
    
    if (url.priority !== undefined) {
      urlXML += `
    <priority>${url.priority}</priority>`;
    }
    
    urlXML += `
    <mobile:mobile/>`;
    
    if (includeImages && url.images && url.images.length > 0) {
      url.images.forEach(image => {
        const imageUrl = image.loc.startsWith('http') ? image.loc : `${baseUrl}${image.loc}`;
        urlXML += `
    <image:image>
      <image:loc>${imageUrl}</image:loc>`;
        
        if (image.caption) {
          urlXML += `
      <image:caption>${escapeXML(image.caption)}</image:caption>`;
        }
        
        if (image.title) {
          urlXML += `
      <image:title>${escapeXML(image.title)}</image:title>`;
        }
        
        urlXML += `
    </image:image>`;
      });
    }
    
    urlXML += `
  </url>`;
    
    return urlXML;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXML}
</urlset>`;
};

export const generateSitemapIndex = (sitemaps: Array<{ loc: string; lastmod?: string }>): string => {
  const sitemapsXML = sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap.loc}</loc>
    ${sitemap.lastmod ? `<lastmod>${sitemap.lastmod}</lastmod>` : ''}
  </sitemap>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapsXML}
</sitemapindex>`;
};

// Utility to add dynamic URLs (events, profiles, etc.)
export const addDynamicUrls = async (
  baseUrls: SitemapUrl[],
  dynamicUrlGenerators: Array<() => Promise<SitemapUrl[]>>
): Promise<SitemapUrl[]> => {
  const allUrls = [...baseUrls];
  
  for (const generator of dynamicUrlGenerators) {
    try {
      const dynamicUrls = await generator();
      allUrls.push(...dynamicUrls);
    } catch (error) {
      console.error('Error generating dynamic URLs:', error);
    }
  }
  
  return allUrls;
};

// Helper function to escape XML characters
const escapeXML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export default {
  generateSitemapXML,
  generateSitemapIndex,
  addDynamicUrls,
  staticPages,
  defaultConfig
};