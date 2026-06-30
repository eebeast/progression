import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
type Size = 'default' | 'lg' | 'sm' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
  secondary: 'bg-muted text-foreground hover:bg-muted/70 active:bg-muted/60',
  ghost: 'bg-transparent text-foreground hover:bg-muted active:bg-muted/70',
  outline: 'border border-border bg-card text-foreground hover:bg-muted active:bg-muted/70',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80',
};

const sizes: Record<Size, string> = {
  default: 'h-12 px-5 text-base',
  lg: 'h-14 px-7 text-[17px]',
  sm: 'h-9 px-4 text-sm',
  icon: 'h-11 w-11',
};

/**
 * Radius grammar: high-emphasis filled actions (primary/destructive) and large
 * CTAs are full pills — the signature action shape. Subtle buttons get a 10px
 * radius; icon buttons stay round.
 */
function radiusFor(variant: Variant, size: Size): string {
  const filled = variant === 'primary' || variant === 'destructive';
  if (filled || size === 'lg' || size === 'icon') return 'rounded-full';
  return 'rounded-md';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold',
          'transition active:scale-[0.95] disabled:pointer-events-none disabled:opacity-50',
          radiusFor(variant, size),
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
