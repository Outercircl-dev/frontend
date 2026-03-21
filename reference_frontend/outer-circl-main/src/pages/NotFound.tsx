
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search, Calendar } from 'lucide-react';
import UnifiedSEO from '@/components/UnifiedSEO';
import { PageLoadingIndicator } from '@/components/ui/loading-indicator';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Simulate brief loading to show loading indicator
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (isLoading) {
    return <PageLoadingIndicator text="Loading page..." />;
  }

  const quickActions = [
    { 
      label: 'Go Home', 
      path: '/', 
      icon: Home,
      variant: 'default' as const,
      description: 'Return to the homepage'
    },
    { 
      label: 'Explore Activities', 
      path: '/dashboard', 
      icon: Calendar,
      variant: 'outline' as const,
      description: 'Browse activities and events'
    },
    { 
      label: 'Create Activity', 
      path: '/create-event', 
      icon: Search,
      variant: 'outline' as const,
      description: 'Start hosting your own activity'
    }
  ];

  return (
    <>
      <UnifiedSEO
        title="Page Not Found"
        description="Sorry, the page you're looking for doesn't exist. Return to Outer Circle to find activity buddies and local events."
        keywords="404, page not found, error"
        noIndex={true}
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <div className="text-8xl font-bold text-gray-300 mb-4">404</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
            <p className="text-gray-600 mb-8">
              Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                onClick={() => navigate(action.path)}
                variant={action.variant}
                className="w-full justify-start text-left p-4 h-auto"
              >
                <action.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <div>
                  <div className="font-medium">{action.label}</div>
                  <div className="text-sm text-gray-500">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>

          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotFound;
