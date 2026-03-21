import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { generateBreadcrumbSchema, type BreadcrumbItem } from '../utils/seoSchemas';

/**
 * SEO-optimized breadcrumb component with structured data
 */

interface BreadcrumbSEOProps {
  items?: BreadcrumbItem[];
  showStructuredData?: boolean;
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
}

// Page title mappings for automatic breadcrumb generation
const pageTitleMap: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/create-activity': 'Create Activity',
  '/membership': 'Membership',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/help': 'Help Center',
  '/about-us': 'About Us',
  '/contact-us': 'Contact Us',
  '/privacy-policy': 'Privacy Policy',
  '/terms-of-service': 'Terms of Service',
  '/community-guidelines': 'Community Guidelines',
  '/auth': 'Sign In',
  '/reset-password': 'Reset Password',
  '/messages': 'Messages',
  '/notifications': 'Notifications'
};

export const BreadcrumbSEO: React.FC<BreadcrumbSEOProps> = ({
  items: customItems,
  showStructuredData = true,
  className = '',
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
  showHome = true
}) => {
  const location = useLocation();
  
  // Generate breadcrumbs automatically if not provided
  const generateAutoBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Add home if requested
    if (showHome) {
      breadcrumbs.push({
        name: 'Home',
        url: 'https://outercircl.com/',
        position: 1
      });
    }
    
    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const title = pageTitleMap[currentPath] || 
                   segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      breadcrumbs.push({
        name: title,
        url: `https://outercircl.com${currentPath}`,
        position: breadcrumbs.length + 1
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbItems = customItems || generateAutoBreadcrumbs();
  
  // Don't show breadcrumbs on home page unless there are custom items
  if (!customItems && (location.pathname === '/' || breadcrumbItems.length <= 1)) {
    return null;
  }
  
  // Note: Structured data now handled by UnifiedSEO to avoid duplication
  
  return (
    <>
      <nav
        aria-label="Breadcrumb" 
        className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}
        itemScope 
        itemType="https://schema.org/BreadcrumbList"
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isExternal = item.url.startsWith('http');
          const internalPath = isExternal ? item.url.replace('https://outercircl.com', '') : item.url;
          
          return (
            <React.Fragment key={item.url}>
              <div 
                itemScope 
                itemType="https://schema.org/ListItem"
                itemProp="itemListElement"
                className="flex items-center"
              >
                <meta itemProp="position" content={item.position.toString()} />
                
                {isLast ? (
                  <span 
                    className="text-foreground font-medium"
                    itemProp="name"
                    aria-current="page"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={internalPath}
                    className="hover:text-foreground transition-colors"
                    itemProp="item"
                  >
                    <span itemProp="name">{item.name}</span>
                  </Link>
                )}
                <meta itemProp="item" content={item.url} />
              </div>
              
              {!isLast && (
                <span className="flex items-center" aria-hidden="true">
                  {separator}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
};

/**
 * Hook to generate breadcrumbs for specific page types
 */
export const useBreadcrumbs = (pageType?: 'event' | 'profile' | 'custom', customData?: any) => {
  const location = useLocation();
  
  const generatePageSpecificBreadcrumbs = (): BreadcrumbItem[] => {
    const base: BreadcrumbItem[] = [
      { name: 'Home', url: 'https://outercircl.com/', position: 1 }
    ];
    
    switch (pageType) {
      case 'event':
        base.push(
          { name: 'Dashboard', url: 'https://outercircl.com/dashboard', position: 2 },
          { 
            name: customData?.eventName || 'Event Details', 
            url: `https://outercircl.com${location.pathname}`, 
            position: 3 
          }
        );
        break;
        
      case 'profile':
        base.push(
          { name: 'Dashboard', url: 'https://outercircl.com/dashboard', position: 2 },
          { 
            name: customData?.userName || 'Profile', 
            url: `https://outercircl.com${location.pathname}`, 
            position: 3 
          }
        );
        break;
        
      case 'custom':
        if (customData?.breadcrumbs) {
          return customData.breadcrumbs;
        }
        break;
        
      default:
        return [];
    }
    
    return base;
  };
  
  return generatePageSpecificBreadcrumbs();
};

export default BreadcrumbSEO;