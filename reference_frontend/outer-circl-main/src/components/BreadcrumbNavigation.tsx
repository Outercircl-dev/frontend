import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  url: string;
  current?: boolean;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  className?: string;
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({ 
  items, 
  className = "" 
}) => {
  const location = useLocation();

  // Auto-generate breadcrumbs based on current path if no items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', url: '/' }
    ];

    const pathMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'profile': 'Profile',
      'create-activity': 'Create Activity',
      'create-event': 'Create Activity',
      'membership': 'Membership',
      'settings': 'Settings',
      'notifications': 'Notifications',
      'messages': 'Messages',
      'help': 'Help Center',
      'auth': 'Sign In',
      'event': 'Activity Details'
    };

    pathnames.forEach((name, index) => {
      const url = `/${pathnames.slice(0, index + 1).join('/')}`;
      const displayName = pathMap[name] || name.charAt(0).toUpperCase() + name.slice(1);
      
      breadcrumbs.push({
        name: displayName,
        url,
        current: index === pathnames.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for single items
  }

  return (
    <nav 
      className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => (
          <li key={item.url} className="flex items-center">
            {index === 0 && (
              <Home className="h-4 w-4 mr-1" aria-hidden="true" />
            )}
            
            {item.current ? (
              <span 
                className="font-medium text-foreground"
                aria-current="page"
              >
                {item.name}
              </span>
            ) : (
              <Link
                to={item.url}
                className="hover:text-foreground transition-colors"
              >
                {item.name}
              </Link>
            )}
            
            {index < breadcrumbItems.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default BreadcrumbNavigation;