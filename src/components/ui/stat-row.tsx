import { cn } from '@/lib/utils';

export type Stat = {
  label: string;
  value: string | number;
  tone?: 'blood' | 'primary';
};

/**
 * Satu baris angka dengan pemisah, bukan sederet kartu.
 *
 * Kartu memberi tiap angka bingkai, bayangan, dan padding sendiri — bobot
 * visual sebesar konten utama untuk data yang sebenarnya cuma ringkasan.
 */
export function StatRow({
  items,
  className,
}: {
  items: Stat[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 divide-border rounded-md border border-border bg-surface sm:divide-x',
        items.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <dt className="label-micro">{item.label}</dt>
          <dd
            className={cn(
              'tabular mt-1 font-mono text-2xl font-semibold',
              item.tone === 'blood' && 'text-destructive',
              item.tone === 'primary' && 'text-primary'
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
