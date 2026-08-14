'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

import { ChallengeDialog } from '@/components/challenges/challenge-dialog';
import { CATEGORY_META } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { ChallengeBoardItem } from '@/types/database';

/**
 * Ubin padat, bukan kartu.
 *
 * Versi sebelumnya menaruh badge berikon, tiga metrik berikon, dan satu ikon
 * centang di setiap ubin — enam ikon per soal, dan pada grid 30 soal itu jadi
 * bidang ikon tanpa hierarki. Sekarang kategori diwakili satu titik warna,
 * metrik ditulis sebagai teks pendek, dan warna merah disisakan khusus untuk
 * first blood.
 */
export function ChallengeCard({ challenge }: { challenge: ChallengeBoardItem }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[challenge.category];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative flex w-full flex-col gap-2 rounded border border-border bg-surface p-3 text-left transition-colors',
          'hover:border-primary/50 hover:bg-surface-raised',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          challenge.solved_by_me && 'border-primary/35'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn('h-2 w-2 shrink-0 rounded-sm', meta.accent)}
              aria-hidden="true"
            />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
              {meta.label}
            </span>
          </span>

          <span className="tabular shrink-0 font-mono text-sm font-semibold text-primary">
            {challenge.static_score}
          </span>
        </div>

        <h3 className="font-mono text-[0.9375rem] font-medium leading-snug">
          {challenge.title}
        </h3>

        <div className="mt-auto flex items-center gap-2 font-mono text-[0.6875rem] text-muted-foreground">
          <span className="tabular">{challenge.solve_count} solve</span>
          {challenge.hint_count > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular">{challenge.hint_count} hint</span>
            </>
          ) : null}
          {challenge.first_blood_by ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-destructive">
                {challenge.first_blood_by}
              </span>
            </>
          ) : null}
        </div>

        {challenge.solved_by_me ? (
          <span className="absolute right-2.5 top-8 text-primary">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            <span className="sr-only">Sudah diselesaikan</span>
          </span>
        ) : null}
      </button>

      <ChallengeDialog
        challenge={challenge}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
