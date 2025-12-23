import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'compact' | 'full' | 'icon-only';
}

export function ProBadge({ className, size = 'sm', variant = 'compact' }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  const iconOnlySizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  if (variant === 'icon-only') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center font-bold rounded-md',
          'bg-gradient-to-r from-purple-600 to-emerald-600',
          'text-white',
          'relative',
          'pro-badge-neon',
          iconOnlySizeClasses[size],
          className
        )}
        data-testid="badge-pro-icon"
      >
        <Crown className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-bold rounded-md',
        'bg-gradient-to-r from-purple-600 to-emerald-600',
        'text-white',
        'relative',
        'pro-badge-neon',
        sizeClasses[size],
        className
      )}
      data-testid="badge-pro"
    >
      {variant === 'full' && <Crown className={iconSizes[size]} />}
      <span>PRO</span>
    </div>
  );
}
