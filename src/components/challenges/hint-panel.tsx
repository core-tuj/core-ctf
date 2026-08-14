'use client';

import { useEffect, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, Unlock } from 'lucide-react';

import {
  fetchMyHints,
  unlockHintAction,
  type HintRow,
} from '@/lib/actions/challenges';
import { Button } from '@/components/ui/button';

export function HintPanel({
  challengeId,
  hintCount,
}: {
  challengeId: string;
  hintCount: number;
}) {
  const [hints, setHints] = useState<HintRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Dimuat saat panel ter-mount, yaitu ketika dialog challenge dibuka.
  // Memuat hint semua challenge di awal berarti satu RPC per challenge.
  useEffect(() => {
    let active = true;

    fetchMyHints(challengeId)
      .then((response) => {
        if (!active) return;
        if (response.error) setError(response.error);
        else setHints(response.hints ?? []);
      })
      .catch(() => {
        // Tanpa catch, kegagalan di sisi server meninggalkan panel berputar
        // selamanya dan memunculkan unhandled rejection di console.
        if (active) setError('Gagal memuat hint.');
      });

    return () => {
      active = false;
    };
  }, [challengeId]);

  function unlock(hintId: string) {
    setUnlockingId(hintId);

    startTransition(async () => {
      const response = await unlockHintAction(hintId);
      setUnlockingId(null);

      if (response.error) {
        setError(response.error);
        return;
      }

      const result = response.result;
      if (!result || result.status === 'not_found') {
        setError(result?.message ?? 'Hint tidak ditemukan.');
        return;
      }

      setHints((current) =>
        (current ?? []).map((hint) =>
          hint.hint_id === hintId
            ? { ...hint, unlocked: true, hint_text: result.hint_text }
            : hint
        )
      );
    });
  }

  if (hintCount === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="label-micro">Hint ({hintCount})</h3>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hints === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Memuat hint…
        </p>
      ) : (
        <ul className="space-y-2">
          {hints.map((hint) => (
            <li
              key={hint.hint_id}
              className="rounded border border-border bg-surface-raised px-3 py-2"
            >
              {hint.unlocked ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <Unlock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm">{hint.hint_text}</p>
                </motion.div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0" />
                    Hint #{hint.order_index}
                    {hint.cost > 0 ? (
                      <span className="font-mono text-xs text-destructive">
                        −{hint.cost} poin
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-primary">
                        gratis
                      </span>
                    )}
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={unlockingId === hint.hint_id}
                    onClick={() => unlock(hint.hint_id)}
                  >
                    {unlockingId === hint.hint_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                    Buka
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Biaya hint dipotong dari poin saat kamu berhasil submit flag, bukan dari
        skor yang sudah ada.
      </p>
    </section>
  );
}
