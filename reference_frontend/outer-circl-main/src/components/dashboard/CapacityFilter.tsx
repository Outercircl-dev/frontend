
import React from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type CapacityFilterType = 'all' | 'available' | 'full';

interface CapacityFilterProps {
  selected: CapacityFilterType;
  onChange: (filter: CapacityFilterType) => void;
}

const getCapacityLabel = (filter: CapacityFilterType) => {
  switch (filter) {
    case 'all':
      return 'All Capacity';
    case 'available':
      return 'Available';
    case 'full':
      return 'Full';
    default:
      return 'Capacity';
  }
};

const CapacityFilter: React.FC<CapacityFilterProps> = ({ selected, onChange }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 whitespace-nowrap bg-gray-50 hover:bg-gray-100"
        >
          <Users className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
          {getCapacityLabel(selected)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-40 bg-white z-50" 
        align="start"
      >
        <DropdownMenuRadioGroup value={selected} onValueChange={onChange}>
          <DropdownMenuRadioItem value="all" className="text-xs sm:text-sm">
            All Capacity
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="available" className="text-xs sm:text-sm">
            Available
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="full" className="text-xs sm:text-sm">
            Full
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CapacityFilter;
