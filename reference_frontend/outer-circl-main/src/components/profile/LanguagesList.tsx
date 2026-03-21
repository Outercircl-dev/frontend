
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';

interface LanguagesListProps {
  languages: string[];
  className?: string;
  isCurrentUser: boolean;
}

const LanguagesList: React.FC<LanguagesListProps> = ({ 
  languages, 
  className = '',
  isCurrentUser
}) => {
  // Only show languages if it's the current user's own profile
  if (!isCurrentUser) return null;
  
  // Handle empty or null languages array
  if (!languages || languages.length === 0) {
    return (
      <div className={`mt-3 w-full ${className}`}>
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
          <div className="text-center">
            <Globe className="h-5 w-5 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">Add languages you speak</p>
            <p className="text-xs text-gray-500">
              Help others know what languages you're comfortable with
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`mt-3 w-full ${className}`}>
      <p className="text-sm font-medium text-center mb-2 text-gray-700">Languages</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {languages.map((language, index) => (
          <Badge 
            variant="outline" 
            key={index} 
            className="text-xs bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
          >
            {language}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default LanguagesList;
