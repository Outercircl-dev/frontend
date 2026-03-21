
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CategoryOption, getCategoryLabel } from '@/utils/categories';

interface CategoryFilterProps {
  categories: CategoryOption[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onClearCategories: () => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategories,
  onToggleCategory,
  onClearCategories
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Mobile-friendly dropdown for category selection */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 whitespace-nowrap bg-gray-50 hover:bg-gray-100"
        >
            Categories
            {selectedCategories.length > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-xs"
              >
                {selectedCategories.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-56 max-h-64 overflow-y-auto bg-white z-50" 
          align="start"
        >
          {categories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category.id}
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={() => onToggleCategory(category.id)}
              className="text-xs sm:text-sm"
            >
              {category.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile-optimized selected categories display */}
      <div className="flex flex-wrap gap-1 sm:gap-2 max-w-full overflow-hidden">
        {selectedCategories.slice(0, 3).map((category) => (
          <Badge 
            key={category} 
            variant="secondary" 
            className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-1"
          >
            <span className="truncate max-w-[80px] sm:max-w-none">{getCategoryLabel(category)}</span>
            <button
              onClick={() => onToggleCategory(category)}
              className="ml-0.5 hover:bg-gray-300 rounded-full p-0.5"
            >
              <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </button>
          </Badge>
        ))}
        
        {selectedCategories.length > 3 && (
          <Badge variant="outline" className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">
            +{selectedCategories.length - 3} more
          </Badge>
        )}
      </div>

      {/* Clear all button - mobile optimized */}
      {selectedCategories.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCategories}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 p-1 sm:p-2 h-auto"
        >
          Clear all
        </Button>
      )}
    </div>
  );
};

export default CategoryFilter;
