import { rankFor } from '@/lib/ranks';
import { cn } from '@/lib/utils';

/** Lencana ringkas — dipakai di baris leaderboard dan daftar anggota. */
export function RankBadge({
  score,
  className,
  showNumeral = true,
}: {
  score: number;
  className?: string;
  showNumeral?: boolean;
}) {
  const { tier } = rankFor(score);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.08em]',
        tier.border,
        tier.bg,
        tier.text,
        className
      )}
    >
      {showNumeral ? <span className="opacity-70">{tier.numeral}</span> : null}
      {tier.name}
    </span>
  );
}

/** Panel besar dengan progres menuju tingkat berikutnya — untuk halaman profil. */
export function RankPanel({ score }: { score: number }) {
  const { tier, next, percent, remaining } = rankFor(score);

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-micro">Rank</p>
          <p
            className={cn(
              'font-mono text-2xl font-semibold leading-tight',
              tier.text
            )}
          >
            {tier.name}
          </p>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
            Tingkat {tier.numeral}
          </p>
        </div>

        <p className="tabular font-mono text-xs text-muted-foreground">
          {next ? (
            <>
              {remaining} poin lagi menuju{' '}
              <span className={next.text}>{next.name}</span>
            </>
          ) : (
            'Tingkat tertinggi'
          )}
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn('h-full transition-all', tier.dot)}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[0.6rem] text-muted-foreground">
        <span className="tabular">{tier.min}</span>
        <span className="tabular">{next ? next.min : score}</span>
      </div>
    </div>
  );
}
