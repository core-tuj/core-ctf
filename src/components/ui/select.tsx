import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Pembungkus `<select>` bawaan, bukan Radix Select.
 *
 * Di dalam form yang dikirim lewat Server Action, elemen native ikut terkirim
 * sebagai FormData tanpa hidden input tambahan, tetap berfungsi sebelum
 * hidrasi, dan memakai picker asli sistem di perangkat sentuh.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<'select'>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-9 w-full appearance-none rounded border border-border bg-background px-3 pr-8 text-sm',
        'focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground"
      aria-hidden="true"
    />
  </div>
));
Select.displayName = 'Select';

export { Select };
