import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.08em]',
  {
    variants: {
      variant: {
        default: 'border-primary/40 bg-primary/10 text-primary',
        secondary: 'border-border bg-surface-raised text-muted-foreground',
        destructive: 'border-destructive/50 bg-destructive/10 text-destructive',
        outline: 'border-border text-muted-foreground',
        blood: 'border-transparent bg-blood text-blood-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
