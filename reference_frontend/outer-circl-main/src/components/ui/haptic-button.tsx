import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useHapticFeedback } from '@/utils/hapticFeedback';

interface HapticButtonProps extends ButtonProps {
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'toggle';
}

/**
 * Enhanced button component with haptic feedback for mobile devices
 */
const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticType = 'light', onClick, children, ...props }, ref) => {
    const { triggerHaptic } = useHapticFeedback();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback
      triggerHaptic(hapticType);
      
      // Call original onClick handler
      if (onClick) {
        onClick(event);
      }
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

HapticButton.displayName = 'HapticButton';

export { HapticButton, type HapticButtonProps };