'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  SolveToastStack,
  type SolveNotice,
} from '@/components/realtime/solve-toast';
import {
  playFirstBloodSound,
  playSolveSound,
  unlockAudio,
} from '@/lib/notification-sound';
import { createClient } from '@/lib/supabase/client';
import type { SolveFeedEntry, Solve } from '@/types/database';

const VISIBLE_MS = 7000;
const FIRST_BLOOD_VISIBLE_MS = 10000;
const MAX_STACK = 4;

/**
 * Notifikasi global untuk SETIAP solve, first blood mendapat perlakuan khusus.
 *
 * Payload Realtime hanya berisi baris `solves` — id, bukan nama. Karena itu
 * tiap event diikuti satu query ke view `solve_feed`.
 *
 * `challenges` sengaja tetap tidak dipublikasikan ke Realtime meski judulnya
 * dibutuhkan: payload Realtime membawa seluruh kolom baris, jadi `flag_hash`
 * akan bocor ke semua subscriber.
 */
export function SolveNotifier({ currentUserId }: { currentUserId: string }) {
  const [notices, setNotices] = useState<SolveNotice[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((key: string) => {
    setNotices((current) => current.filter((notice) => notice.key !== key));
    const timer = timers.current.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(key);
    }
  }, []);

  // Browser memblokir audio sampai ada interaksi. Satu listener sekali pakai
  // pada gesture pertama sudah cukup untuk membuka izinnya.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const pending = timers.current;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel('solve-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'solves' },
        async (payload) => {
          const solve = payload.new as Solve;

          const { data } = await supabase
            .from('solve_feed')
            .select('*')
            .eq('solve_id', solve.id)
            .single<SolveFeedEntry>();

          if (!data) return;

          const notice: SolveNotice = {
            key: data.solve_id,
            userId: data.user_id,
            actor: data.team_name ?? data.user_name,
            challengeTitle: data.challenge_title,
            category: data.challenge_category,
            points: data.points_awarded,
            isFirstBlood: data.is_first_blood,
            isMe: data.user_id === currentUserId,
          };

          setNotices((current) =>
            [
              notice,
              ...current.filter((item) => item.key !== notice.key),
            ].slice(0, MAX_STACK)
          );

          if (notice.isFirstBlood) playFirstBloodSound();
          else playSolveSound();

          pending.set(
            notice.key,
            setTimeout(
              () => dismiss(notice.key),
              notice.isFirstBlood ? FIRST_BLOOD_VISIBLE_MS : VISIBLE_MS
            )
          );
        }
      )
      .subscribe();

    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      supabase.removeChannel(channel);
    };
  }, [currentUserId, dismiss]);

  return <SolveToastStack notices={notices} onDismiss={dismiss} />;
}
