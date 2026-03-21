import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateTimeSectionProps {
  date: Date | undefined;
  time: string;
  duration: string;
  setDate: (date: Date | undefined) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const DateTimeSection: React.FC<DateTimeSectionProps> = ({
  date,
  time,
  duration,
  setDate,
  onInputChange
}) => {
  // Generate time options (6:00 AM to 11:30 PM in 30-minute intervals)
  const timeOptions = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      timeOptions.push({ value: time12, label: time12 });
    }
  }

  // Duration options
  const durationOptions = [
    { value: '30 minutes', label: '30 minutes' },
    { value: '1 hour', label: '1 hour' },
    { value: '1.5 hours', label: '1.5 hours' },
    { value: '2 hours', label: '2 hours' },
    { value: '2.5 hours', label: '2.5 hours' },
    { value: '3 hours', label: '3 hours' },
    { value: '3.5 hours', label: '3.5 hours' },
    { value: '4 hours', label: '4 hours' },
    { value: '5 hours', label: '5 hours' },
    { value: '6 hours', label: '6 hours' },
    { value: '8 hours', label: '8 hours' },
    { value: 'All day', label: 'All day' },
  ];

  const handleTimeChange = (value: string) => {
    onInputChange({
      target: { name: 'time', value }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleDurationChange = (value: string) => {
    onInputChange({
      target: { name: 'duration', value }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Date picker - full width on mobile */}
      <div className="grid gap-1.5">
        <Label className="text-xs sm:text-sm">Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal h-9 sm:h-10 text-xs sm:text-sm",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-500" />
              {date ? format(date, "MMM d, yyyy") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-2 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Time and Duration - side by side on larger screens, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="time" className="text-xs sm:text-sm">Time *</Label>
          <div className="relative">
            <Select value={time} onValueChange={handleTimeChange}>
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm pl-8 sm:pl-9">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Clock className="absolute left-2 sm:left-2.5 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-500 pointer-events-none z-10" />
          </div>
        </div>
        
        <div className="grid gap-1.5">
          <Label htmlFor="duration" className="text-xs sm:text-sm">Duration *</Label>
          <div className="relative">
            <Select value={duration} onValueChange={handleDurationChange}>
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm pl-8 sm:pl-9">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Timer className="absolute left-2 sm:left-2.5 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-500 pointer-events-none z-10" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateTimeSection;