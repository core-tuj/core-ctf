import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/layout/page-header';
import { StatRow } from '@/components/ui/stat-row';
import { CATEGORY_META } from '@/lib/categories';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import type { ChallengeCategory } from '@/types/database';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profileResult, solvesResult, boardResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('solves').select('id, is_first_blood').eq('user_id', user.id),
    supabase
      .from('challenges_board')
      .select('id, title, category, static_score, solved_by_me')
      .eq('is_active', true),
  ]);

  const profile = profileResult.data;
  const solves = solvesResult.data ?? [];
  const board = boardResult.data ?? [];

  const solveCount = solves.length;
  const firstBloodCount = solves.filter((s) => s.is_first_blood).length;
  const remaining = board.filter((c) => !c.solved_by_me);

  // Per kategori: berapa yang sudah diselesaikan dari total yang tersedia
  const byCategory = new Map<
    ChallengeCategory,
    { solved: number; total: number }
  >();
  for (const challenge of board) {
    const entry = byCategory.get(challenge.category) ?? { solved: 0, total: 0 };
    entry.total += 1;
    if (challenge.solved_by_me) entry.solved += 1;
    byCategory.set(challenge.category, entry);
  }

  return (
    <>
      <PageHeader
        title={profile?.name ?? user.email ?? 'Dashboard'}
        description="Semua challenge selalu aktif. Kerjakan kapan pun, skor langsung masuk leaderboard."
      />

      <div className="space-y-8">
        <StatRow
          items={[
            { label: 'Skor', value: profile?.total_score ?? 0 },
            { label: 'Solve', value: solveCount },
            {
              label: 'First blood',
              value: firstBloodCount,
              tone: firstBloodCount > 0 ? 'blood' : undefined,
            },
            { label: 'Sisa soal', value: remaining.length },
          ]}
        />

        {byCategory.size > 0 ? (
          <section>
            <h2 className="label-micro mb-3">Progres per kategori</h2>
            <div className="divide-y divide-border rounded-md border border-border bg-surface">
              {[...byCategory.entries()].map(([category, entry]) => {
                const meta = CATEGORY_META[category];
                const percent = Math.round((entry.solved / entry.total) * 100);
                return (
                  <div
                    key={category}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-sm', meta.accent)}
                      aria-hidden="true"
                    />
                    <span className="w-24 shrink-0 font-mono text-xs uppercase tracking-[0.08em]">
                      {meta.label}
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className={cn('h-full', meta.accent)}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="tabular w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
                      {entry.solved}/{entry.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {remaining.length > 0 ? (
          <section>
            <h2 className="label-micro mb-3">Belum diselesaikan</h2>
            <ul className="divide-y divide-border rounded-md border border-border bg-surface">
              {remaining.slice(0, 6).map((challenge) => {
                const meta = CATEGORY_META[challenge.category];
                return (
                  <li key={challenge.id}>
                    <Link
                      href="/challenges"
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-raised"
                    >
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-sm',
                          meta.accent
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-sm">
                        {challenge.title}
                      </span>
                      <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
                        {challenge.static_score}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
