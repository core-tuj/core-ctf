'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Droplet, X } from 'lucide-react';

import { CATEGORY_META } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { ChallengeCategory } from '@/types/database';

export type SolveNotice = {
  key: string;
  userId: string;
  actor: string;
  challengeTitle: string;
  category: ChallengeCategory;
  points: number;
  isFirstBlood: boolean;
  isMe: boolean;
};

/**
 * Tampilan murni — state-nya dikelola SolveNotifier. Dipisah supaya animasi
 * dan tata letak bisa diperiksa tanpa koneksi Realtime.
 */
export function SolveToastStack({
  notices,
  onDismiss,
}: {
  notices: SolveNotice[];
  onDismiss: (key: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(21rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {notices.map((notice) => {
          const meta = CATEGORY_META[notice.category];
          const blood = notice.isFirstBlood;

          return (
            <motion.div
              key={notice.key}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'pointer-events-auto relative overflow-hidden rounded-md border bg-surface p-3 pr-9',
                blood
                  ? 'border-destructive/60 shadow-glow-blood'
                  : 'border-border'
              )}
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-1',
                  blood ? 'bg-destructive' : meta.accent
                )}
                aria-hidden="true"
              />

              {blood ? (
                <p className="mb-1 flex items-center gap-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.15em] text-destructive text-glow-blood">
                  <Droplet className="h-3 w-3 animate-blood-flash rounded-full" />
                  First Blood
                </p>
              ) : (
                <p className="mb-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                  {meta.label} · solve
                </p>
              )}

              <p className="text-[0.8125rem] leading-snug">
                <Link
                  href={`/players/${notice.userId}`}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {notice.isMe ? 'Kamu' : notice.actor}
                </Link>{' '}
                menyelesaikan{' '}
                <span className="font-mono font-medium">
                  {notice.challengeTitle}
                </span>
              </p>

              <p className="tabular mt-0.5 font-mono text-[0.6875rem] text-primary">
                +{notice.points} poin
              </p>

              <button
                type="button"
                onClick={() => onDismiss(notice.key)}
                className="absolute right-2 top-2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Tutup notifikasi</span>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
