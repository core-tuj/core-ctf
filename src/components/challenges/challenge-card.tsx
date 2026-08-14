'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Droplet, Lightbulb, Users } from 'lucide-react';

import { ChallengeDialog } from '@/components/challenges/challenge-dialog';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_META } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { ChallengeBoardItem } from '@/types/database';

export function ChallengeCard({
  challenge,
  index,
}: {
  challenge: ChallengeBoardItem;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[challenge.category];
  const Icon = meta.icon;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          // Stagger dibatasi supaya kartu ke-40 tidak menunggu 2 detik
          delay: Math.min(index, 8) * 0.04,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={cn(
          'group relative flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card/25 p-4 text-left backdrop-blur-sm transition-colors',
          'hover:border-primary/50 hover:bg-card/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          challenge.solved_by_me && 'border-primary/40'
        )}
      >
        {/* Garis warna kategori di tepi kiri */}
        <span
          className={cn('absolute inset-y-0 left-0 w-0.5', meta.accent)}
          aria-hidden="true"
        />

        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline" className={cn('gap-1', meta.badge)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>

          <span className="font-mono text-lg font-bold tabular-nums text-primary">
            {challenge.static_score}
          </span>
        </div>

        <h3 className="font-mono text-base font-semibold leading-tight">
          {challenge.title}
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {challenge.solve_count} solve
          </span>

          {challenge.hint_count > 0 ? (
            <span className="flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              {challenge.hint_count} hint
            </span>
          ) : null}

          {challenge.first_blood_by ? (
            <span className="flex items-center gap-1 text-destructive">
              <Droplet className="h-3 w-3" />
              {challenge.first_blood_by}
            </span>
          ) : null}
        </div>

        {challenge.solved_by_me ? (
          <span className="absolute right-3 top-12 text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <span className="sr-only">Sudah diselesaikan</span>
          </span>
        ) : null}
      </motion.button>

      <ChallengeDialog
        challenge={challenge}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
