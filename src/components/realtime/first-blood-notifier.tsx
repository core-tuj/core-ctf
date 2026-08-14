'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  FirstBloodToastStack,
  type FirstBloodNotice,
} from '@/components/realtime/first-blood-toast';
import { createClient } from '@/lib/supabase/client';
import type { FirstBloodEntry, Solve } from '@/types/database';

const VISIBLE_MS = 9000;
const MAX_STACK = 3;

/**
 * Notifikasi first blood global.
 *
 * Payload Realtime hanya berisi baris `solves` — id challenge dan id user, tanpa
 * nama. Karena itu setiap event diikuti satu query ke view `first_blood_feed`
 * untuk mengambil nama yang layak ditampilkan.
 *
 * Kenapa `challenges` tidak ikut dipublikasikan ke Realtime supaya judulnya
 * langsung terkirim: payload Realtime membawa seluruh kolom baris, jadi
 * `flag_hash` akan bocor ke semua subscriber. Satu query tambahan jauh lebih
 * murah daripada itu.
 */
export function FirstBloodNotifier({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [notices, setNotices] = useState<FirstBloodNotice[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((key: string) => {
    setNotices((current) => current.filter((notice) => notice.key !== key));
    const timer = timers.current.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(key);
    }
  }, []);

  useEffect(() => {
    const pending = timers.current;

    // Gagal menyiapkan Realtime tidak boleh menjatuhkan seluruh layout —
    // komponen ini terpasang di setiap halaman yang butuh login.
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel('first-blood')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'solves',
          filter: 'is_first_blood=eq.true',
        },
        async (payload) => {
          const solve = payload.new as Solve;

          const { data } = await supabase
            .from('first_blood_feed')
            .select('*')
            .eq('solve_id', solve.id)
            .single<FirstBloodEntry>();

          if (!data) return;

          const notice: FirstBloodNotice = {
            key: data.solve_id,
            challengeTitle: data.challenge_title,
            actor: data.team_name ?? data.user_name,
            points: data.points_awarded,
            isMe: data.user_id === currentUserId,
          };

          setNotices((current) =>
            [
              notice,
              ...current.filter((item) => item.key !== notice.key),
            ].slice(0, MAX_STACK)
          );

          pending.set(
            notice.key,
            setTimeout(() => dismiss(notice.key), VISIBLE_MS)
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

  return <FirstBloodToastStack notices={notices} onDismiss={dismiss} />;
}
