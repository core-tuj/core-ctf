'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Droplet, X } from 'lucide-react';

export type FirstBloodNotice = {
  key: string;
  challengeTitle: string;
  actor: string;
  points: number;
  isMe: boolean;
};

/**
 * Tampilan murni, tanpa Supabase — state-nya dikelola FirstBloodNotifier.
 * Dipisah supaya animasi dan layout bisa diperiksa tanpa koneksi Realtime.
 */
export function FirstBloodToastStack({
  notices,
  onDismiss,
}: {
  notices: FirstBloodNotice[];
  onDismiss: (key: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {notices.map((notice) => (
          <motion.div
            key={notice.key}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto relative overflow-hidden rounded-lg border border-destructive/60 bg-destructive/15 p-4 pr-10 shadow-glow-blood backdrop-blur-md"
          >
            <span
              className="absolute inset-y-0 left-0 w-1 bg-destructive"
              aria-hidden="true"
            />

            <div className="flex items-start gap-3">
              <Droplet className="mt-0.5 h-5 w-5 shrink-0 animate-blood-flash rounded-full text-destructive" />

              <div className="min-w-0 space-y-1">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-destructive text-glow-blood">
                  First Blood
                </p>
                <p className="text-sm leading-snug">
                  <span className="font-semibold">
                    {notice.isMe ? 'Kamu' : notice.actor}
                  </span>{' '}
                  menaklukkan{' '}
                  <span className="font-mono font-semibold">
                    {notice.challengeTitle}
                  </span>{' '}
                  duluan.
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  +{notice.points} poin
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(notice.key)}
              className="absolute right-3 top-3 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Tutup notifikasi</span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
