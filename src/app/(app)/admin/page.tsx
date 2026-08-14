import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus, TriangleAlert } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatRow } from '@/components/ui/stat-row';
import { CATEGORY_META } from '@/lib/categories';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Panel Admin',
};

/**
 * Akses dijaga middleware (role admin). Halaman ini tidak mengulang
 * pengecekan karena middleware sudah me-redirect non-admin ke /dashboard.
 */
export default async function AdminPage() {
  const supabase = await createClient();

  // Admin melihat draft juga: RLS `is_active or is_admin()` yang mengaturnya.
  const { data: challenges, error } = await supabase
    .from('challenges_board')
    .select('*')
    .order('is_active', { ascending: false })
    .order('category', { ascending: true })
    .order('static_score', { ascending: true });

  const list = challenges ?? [];
  const published = list.filter((item) => item.is_active).length;
  const totalSolves = list.reduce((sum, item) => sum + item.solve_count, 0);

  return (
    <>
      <PageHeader
        title="Panel Admin"
        description="Kelola challenge, hint, dan publikasinya."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/challenges/new">
              <Plus className="h-3.5 w-3.5" />
              Challenge baru
            </Link>
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Gagal memuat challenge</AlertTitle>
          <AlertDescription className="font-mono text-xs">
            {error.message}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <StatRow
            items={[
              { label: 'Total soal', value: list.length },
              { label: 'Terbit', value: published, tone: 'primary' },
              { label: 'Draft', value: list.length - published },
              { label: 'Total solve', value: totalSolves },
            ]}
          />

          {list.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm">Belum ada challenge</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mulai dengan menekan “Challenge baru”.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="label-micro py-2 pl-3 pr-2 text-left font-normal">
                      Challenge
                    </th>
                    <th className="label-micro hidden px-2 py-2 text-left font-normal sm:table-cell">
                      Status
                    </th>
                    <th className="label-micro hidden px-2 py-2 text-right font-normal sm:table-cell">
                      Hint
                    </th>
                    <th className="label-micro hidden px-2 py-2 text-right font-normal sm:table-cell">
                      Solve
                    </th>
                    <th className="label-micro w-16 py-2 pl-2 pr-3 text-right font-normal">
                      Poin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((challenge) => {
                    const meta = CATEGORY_META[challenge.category];
                    return (
                      <tr
                        key={challenge.id}
                        className="border-b border-border last:border-b-0 hover:bg-surface-raised"
                      >
                        <td className="py-0 pl-3 pr-2">
                          <Link
                            href={`/admin/challenges/${challenge.id}`}
                            className="flex min-w-0 items-center gap-2 py-2"
                          >
                            <span
                              className={cn(
                                'h-2 w-2 shrink-0 rounded-sm',
                                meta.accent
                              )}
                              aria-hidden="true"
                            />
                            <span className="truncate font-mono text-[0.8125rem]">
                              {challenge.title}
                            </span>
                            <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                              {meta.label}
                            </span>
                          </Link>
                        </td>

                        <td className="hidden whitespace-nowrap px-2 py-2 sm:table-cell">
                          <span
                            className={cn(
                              'font-mono text-[0.6rem] uppercase tracking-[0.1em]',
                              challenge.is_active
                                ? 'text-primary'
                                : 'text-muted-foreground/60'
                            )}
                          >
                            {challenge.is_active ? 'terbit' : 'draft'}
                          </span>
                          {!challenge.has_flag ? (
                            <span className="ml-1.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-destructive">
                              tanpa flag
                            </span>
                          ) : null}
                        </td>

                        <td className="tabular hidden px-2 py-2 text-right font-mono text-xs text-muted-foreground sm:table-cell">
                          {challenge.hint_count}
                        </td>

                        <td className="tabular hidden px-2 py-2 text-right font-mono text-xs text-muted-foreground sm:table-cell">
                          {challenge.solve_count}
                        </td>

                        <td className="tabular py-2 pl-2 pr-3 text-right font-mono text-xs text-primary">
                          {challenge.static_score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
