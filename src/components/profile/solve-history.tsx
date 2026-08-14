import { CATEGORY_META } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { ChallengeCategory } from '@/types/database';

export type SolveHistoryRow = {
  id: string;
  challenge_id: string;
  points_awarded: number;
  is_first_blood: boolean;
  created_at: string;
};

export type SolveHistoryChallenge = {
  id: string;
  title: string;
  category: ChallengeCategory;
};

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function SolveHistory({
  solves,
  challenges,
  emptyMessage = 'Belum ada challenge yang diselesaikan.',
}: {
  solves: SolveHistoryRow[];
  challenges: SolveHistoryChallenge[];
  emptyMessage?: string;
}) {
  const byId = new Map(challenges.map((challenge) => [challenge.id, challenge]));

  if (solves.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="label-micro py-2 pl-3 pr-2 text-left font-normal">
              Challenge
            </th>
            <th className="label-micro hidden px-2 py-2 text-left font-normal sm:table-cell">
              Waktu
            </th>
            <th className="label-micro w-16 py-2 pl-2 pr-3 text-right font-normal">
              Poin
            </th>
          </tr>
        </thead>
        <tbody>
          {solves.map((solve) => {
            const challenge = byId.get(solve.challenge_id);
            const meta = challenge ? CATEGORY_META[challenge.category] : null;

            return (
              <tr
                key={solve.id}
                className="border-b border-border last:border-b-0"
              >
                <td className="py-2 pl-3 pr-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {meta ? (
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-sm',
                          meta.accent
                        )}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="truncate font-mono text-[0.8125rem]">
                      {challenge?.title ?? 'Challenge tidak tersedia'}
                    </span>
                    {solve.is_first_blood ? (
                      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-destructive">
                        first blood
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="hidden px-2 py-2 font-mono text-[0.6875rem] text-muted-foreground sm:table-cell">
                  {dateFormat.format(new Date(solve.created_at))}
                </td>
                <td className="tabular py-2 pl-2 pr-3 text-right font-mono text-xs text-primary">
                  {solve.points_awarded}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
