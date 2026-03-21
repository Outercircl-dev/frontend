
import React from 'react';
import { Toggle } from '@/components/ui/toggle';

interface DateFilterToggleProps {
  dateFilter: string | null;
  setDateFilter: (filter: string | null) => void;
  filterValue: string;
  label: string;
}

const DateFilterToggle: React.FC<DateFilterToggleProps> = ({
  dateFilter,
  setDateFilter,
  filterValue,
  label
}) => {
  return (
    <Toggle 
      variant="outline" 
      pressed={dateFilter === filterValue}
      onPressedChange={() => setDateFilter(dateFilter === filterValue ? null : filterValue)}
      className={`rounded-full text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap ${dateFilter === filterValue ? 'bg-[#E60023] text-white border-[#E60023]' : 'bg-gray-50 hover:bg-[#E60023]/10 hover:border-[#E60023] hover:text-[#E60023]'}`}
      aria-label={`Filter events for ${filterValue}`}
    >
      {label}
    </Toggle>
  );
};

export default DateFilterToggle;
