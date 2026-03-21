
import React from 'react';
import { Star, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReliabilityStarsDisplayProps {
  rating: number;
  showTooltip?: boolean;
  size?: number;
  className?: string;
  compact?: boolean;
}

const ReliabilityStarsDisplay: React.FC<ReliabilityStarsDisplayProps> = ({ 
  rating, 
  showTooltip = true,
  size = 16,
  className = "",
  compact = false
}) => {
  const formattedRating = rating.toFixed(1);
  const filledStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  const ratingElement = (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center mr-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const isFilled = index < filledStars;
          const isHalf = index === filledStars && hasHalfStar;
          
          return (
            <div key={index} className="relative">
              <Star 
                className={`${isFilled || isHalf ? 'text-[#E60023] fill-[#E60023]' : 'text-gray-300'}`} 
                size={size} 
              />
              {isHalf && (
                <Star 
                  className="absolute top-0 left-0 text-[#E60023] fill-[#E60023]" 
                  size={size}
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                />
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <span className="text-sm font-medium text-gray-700">{formattedRating}</span>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info 
              className="ml-1 text-gray-400 hover:text-gray-600 cursor-help transition-colors" 
              size={12} 
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center space-y-2">
              <p className="font-semibold text-sm">Reliability Rating</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>This rating reflects how dependable this user is based on:</p>
                <ul className="text-left space-y-0.5 pl-2">
                  <li>• Showing up to activities they commit to</li>
                  <li>• Punctuality and preparedness</li>
                  <li>• Positive peer reviews from fellow participants</li>
                  <li>• Consistent engagement in group activities</li>
                </ul>
                <p className="pt-1 font-medium">Current: {formattedRating}/5.0 stars</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  if (!showTooltip) {
    return ratingElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {ratingElement}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">Reliability Rating</p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on activity attendance and peer reviews
            </p>
            <p className="text-xs mt-1 font-semibold">{formattedRating}/5.0</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ReliabilityStarsDisplay;
