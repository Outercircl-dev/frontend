
import React from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/components/OptimizedProviders';
import SearchPopover from '@/components/SearchPopover';

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoggedIn: boolean;
  onCreateEventClick: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  isLoggedIn,
  onCreateEventClick
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleCreateActivityClick = () => {
    if (!isLoggedIn) {
      navigate('/auth?tab=login&redirect=/create-event');
    } else {
      navigate('/create-event');
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Mobile-first responsive header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">{t('dashboard.title')}</h1>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-gray-600 transition-colors"
              >
                Clear search ×
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
