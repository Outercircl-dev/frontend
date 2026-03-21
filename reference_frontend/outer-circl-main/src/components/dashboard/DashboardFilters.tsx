  
import React from 'react';
import DateFilterToggle from './DateFilterToggle';
import CategoryFilter from './CategoryFilter';
import CapacityFilter, { CapacityFilterType } from './CapacityFilter';
import { Button } from '@/components/ui/button';
import { Users, X, Plus } from 'lucide-react';
import { getAllCategoryIds, getCategoryLabel, CATEGORY_OPTIONS } from '@/utils/categories';

interface DashboardFiltersProps {
  dateFilter: string | null;
  setDateFilter: (filter: string | null) => void;
  categoryFilters: string[];
  setCategoryFilters: (filters: string[]) => void;
  capacityFilter: CapacityFilterType;
  setCapacityFilter: (filter: CapacityFilterType) => void;
  showFriendsActivities: boolean;
  setShowFriendsActivities: (show: boolean) => void;
  
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  dateFilter,
  setDateFilter,
  categoryFilters,
  setCategoryFilters,
  capacityFilter,
  setCapacityFilter,
  showFriendsActivities,
  setShowFriendsActivities
}) => {

  const handleCategoryToggle = (category: string) => {
    const newFilters = categoryFilters.includes(category) 
      ? categoryFilters.filter(cat => cat !== category) 
      : [...categoryFilters, category];
    setCategoryFilters(newFilters);
  };
  
  const clearCategoryFilters = () => {
    setCategoryFilters([]);
  };

  const clearAllFilters = () => {
    setDateFilter(null);
    setCategoryFilters([]);
    setCapacityFilter('all');
    setShowFriendsActivities(false);
  };

  const hasActiveFilters = dateFilter || categoryFilters.length > 0 || capacityFilter !== 'all' || showFriendsActivities;

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <CategoryFilter
          categories={CATEGORY_OPTIONS}
          selectedCategories={categoryFilters}
          onToggleCategory={handleCategoryToggle}
          onClearCategories={clearCategoryFilters}
        />
        
        <DateFilterToggle
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          filterValue="today"
          label="Today"
        />
        <DateFilterToggle
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          filterValue="tomorrow"
          label="Tomorrow"
        />
        <DateFilterToggle
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          filterValue="upcoming"
          label="Upcoming"
        />
        
        {/* Friends Activities Filter */}
        <Button
          variant={showFriendsActivities ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFriendsActivities(!showFriendsActivities)}
          className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 whitespace-nowrap ${showFriendsActivities ? 'bg-[#E60023] hover:bg-[#D50C22]' : 'bg-gray-50 hover:bg-gray-100'}`}
        >
          <Users className="h-3 sm:h-4 w-3 sm:w-4" />
          <span className="hidden sm:inline">Friends' Activities</span>
          <span className="sm:hidden">Friends</span>
        </Button>
        
        <CapacityFilter 
          selected={capacityFilter}
          onChange={setCapacityFilter}
        />
        
        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear all filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardFilters;
