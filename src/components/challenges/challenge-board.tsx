'use client';

import { useMemo, useState } from 'react';
import { ChallengeCard } from '@/components/challenges/challenge-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { ChallengeBoardItem, ChallengeCategory } from '@/types/database';

type Filter = ChallengeCategory | 'all';

export function ChallengeBoard({
  challenges,
}: {
  challenges: ChallengeBoardItem[];
}) {
  const [filter, setFilter] = useState<Filter>('all');

  // Hanya tampilkan tab kategori yang benar-benar punya challenge, supaya
  // pemain tidak mengklik tab kosong.
  const categories = useMemo(() => {
    const counts = new Map<ChallengeCategory, number>();
    for (const challenge of challenges) {
      counts.set(challenge.category, (counts.get(challenge.category) ?? 0) + 1);
    }
    return CATEGORY_ORDER.filter((category) => counts.has(category)).map(
      (category) => ({ category, count: counts.get(category) ?? 0 })
    );
  }, [challenges]);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? challenges
        : challenges.filter((challenge) => challenge.category === filter),
    [challenges, filter]
  );

  if (challenges.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm">Belum ada challenge aktif</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Admin mempublikasikan soal dengan mengaktifkan{' '}
          <code className="font-mono">is_active</code>.
        </p>
      </div>
    );
  }

  return (
    <Tabs
      value={filter}
      onValueChange={(value) => setFilter(value as Filter)}
    >
      <TabsList>
        <TabsTrigger value="all">
          Semua
          <span className="tabular opacity-60">{challenges.length}</span>
        </TabsTrigger>

        {categories.map(({ category, count }) => {
          const meta = CATEGORY_META[category];
          return (
            <TabsTrigger key={category} value={category}>
              <span
                className={`h-1.5 w-1.5 rounded-sm ${meta.accent}`}
                aria-hidden="true"
              />
              {meta.label}
              <span className="tabular opacity-60">{count}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Grid di luar TabsContent: filter hanya mengubah daftar, bukan
          mengganti panel. */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visible.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>
    </Tabs>
  );
}
