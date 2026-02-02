/**
 * Haptic Button Component
 *
 * Enhanced button with automatic haptic feedback
 */

import { forwardRef } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  hapticsLight,
  hapticsMedium,
  hapticsSuccess,
  hapticsError,
  hapticsWarning,
  type HapticFeedbackType,
} from '@/lib/mobile';

interface HapticButtonProps extends ButtonProps {
  hapticType?: HapticFeedbackType;
  hapticOnClick?: boolean;
}

export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticType = 'light', hapticOnClick = true, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hapticOnClick) {
        switch (hapticType) {
          case 'light':
            hapticsLight();
            break;
          case 'medium':
            hapticsMedium();
            break;
          case 'success':
            hapticsSuccess();
            break;
          case 'error':
            hapticsError();
            break;
          case 'warning':
            hapticsWarning();
            break;
        }
      }

      onClick?.(e);
    };

    return <Button ref={ref} onClick={handleClick} {...props} />;
  }
);

HapticButton.displayName = 'HapticButton';

/**
 * Preset haptic buttons for common actions
 */
export const HapticSuccessButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <HapticButton ref={ref} hapticType="success" {...props} />;
  }
);
HapticSuccessButton.displayName = 'HapticSuccessButton';

export const HapticErrorButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <HapticButton ref={ref} hapticType="error" variant="destructive" {...props} />;
  }
);
HapticErrorButton.displayName = 'HapticErrorButton';

export const HapticWarningButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <HapticButton ref={ref} hapticType="warning" {...props} />;
  }
);
HapticWarningButton.displayName = 'HapticWarningButton';
