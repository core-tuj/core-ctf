'use client';

import { useMemo, useState } from 'react';
import { Flag } from 'lucide-react';

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
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/20 py-16 text-center">
        <Flag className="h-8 w-8 text-primary/60" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Belum ada challenge aktif</p>
          <p className="text-sm text-muted-foreground">
            Admin dapat mempublikasikan challenge dengan mengaktifkan{' '}
            <code className="font-mono">is_active</code>.
          </p>
        </div>
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
          <span className="font-mono text-xs opacity-70">
            {challenges.length}
          </span>
        </TabsTrigger>

        {categories.map(({ category, count }) => {
          const meta = CATEGORY_META[category];
          const Icon = meta.icon;
          return (
            <TabsTrigger key={category} value={category}>
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
              <span className="font-mono text-xs opacity-70">{count}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Grid berada di luar TabsContent: filter hanya mengubah daftar,
          bukan mengganti panel, jadi animasi masuk kartu tetap konsisten. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((challenge, index) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            index={index}
          />
        ))}
      </div>
    </Tabs>
  );
}
