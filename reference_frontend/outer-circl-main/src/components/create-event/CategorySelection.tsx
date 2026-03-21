
import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Circle } from 'lucide-react';
import { CATEGORY_OPTIONS } from '@/utils/categories';

interface CategorySelectionProps {
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

const CategorySelection: React.FC<CategorySelectionProps> = ({
  categories,
  onCategoriesChange,
}) => {

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...categories, categoryId]);
    } else {
      onCategoriesChange(categories.filter(cat => cat !== categoryId));
    }
  };

  // Check if this will be a core activity (categories with 'social' typically are)
  const isCoreActivity = categories.includes('social') || categories.length === 1;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs sm:text-sm font-medium">Categories</Label>
        {isCoreActivity && (
          <div className="flex items-center gap-1 text-xs text-[#E60023]">
            <Circle className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-current" />
            <span className="text-xs">Core Activity</span>
          </div>
        )}
      </div>
      
      {/* Mobile-optimized grid - 1 column on mobile, 2 on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {CATEGORY_OPTIONS.map((option) => (
          <div key={option.id} className="flex items-center space-x-2 sm:space-x-3 p-1">
            <Checkbox
              id={option.id}
              checked={categories.includes(option.id)}
              onCheckedChange={(checked) => handleCategoryChange(option.id, checked as boolean)}
              className="h-4 w-4 sm:h-5 sm:w-5"
            />
            <Label
              htmlFor={option.id}
              className="text-xs sm:text-sm font-normal cursor-pointer flex-1 leading-4 sm:leading-5"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground leading-4">
        Select all categories that apply to your activity.
        {isCoreActivity && " This will be marked as an Outercircl Core activity for intimate connections."}
      </p>
    </div>
  );
};

export default CategorySelection;
