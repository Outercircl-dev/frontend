import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProfileBreadcrumbProps {
  isCurrentUserProfile: boolean;
  profileName?: string;
}

const ProfileBreadcrumb: React.FC<ProfileBreadcrumbProps> = ({
  isCurrentUserProfile,
  profileName
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          asChild
          className="text-gray-600 hover:text-brand-salmon hover:bg-white/60 backdrop-blur-sm transition-all duration-200"
        >
          <Link to="/dashboard" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium font-sans">
          {isCurrentUserProfile ? 'My Profile' : `${profileName}'s Profile`}
        </span>
      </div>
    </div>
  );
};

export default ProfileBreadcrumb;
