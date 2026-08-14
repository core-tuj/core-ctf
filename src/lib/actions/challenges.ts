'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { SubmitFlagResult, UnlockHintResult } from '@/types/database';

export type FlagFormState = {
  result?: SubmitFlagResult;
  /** Error transport/permission — bukan "flag salah". */
  error?: string;
};

export type HintRow = {
  hint_id: string;
  order_index: number;
  cost: number;
  unlocked: boolean;
  hint_text: string | null;
};

/**
 * Validasi flag.
 *
 * Dipilih Server Action, bukan API Route: tidak ada endpoint tambahan yang
 * harus diamankan sendiri, dan payload-nya tidak pernah menyentuh URL.
 *
 * Perbandingan flag TIDAK terjadi di sini — Server Action hanya meneruskan
 * plaintext ke RPC submit_flag(). Hash-nya tidak pernah keluar dari Postgres,
 * dan perhitungan poin, penalti hint, first blood, serta rate limit terjadi
 * atomik dalam satu transaksi database.
 */
export async function submitFlagAction(
  _prevState: FlagFormState,
  formData: FormData
): Promise<FlagFormState> {
  const challengeId = String(formData.get('challengeId') ?? '');
  const flag = String(formData.get('flag') ?? '').trim();

  if (!challengeId) {
    return { error: 'Challenge tidak dikenali.' };
  }
  if (!flag) {
    return { error: 'Flag tidak boleh kosong.' };
  }

  let result: SubmitFlagResult;
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('submit_flag', {
      p_challenge_id: challengeId,
      p_flag: flag,
    });

    if (error) return { error: error.message };
    result = data as SubmitFlagResult;
  } catch (cause) {
    // Kegagalan tak terduga (env belum di-set, jaringan putus) dikembalikan
    // sebagai state, bukan dilempar — kalau dilempar, seluruh halaman jatuh ke
    // error boundary dan jawaban yang sudah diketik ikut hilang.
    return { error: cause instanceof Error ? cause.message : 'Gagal submit.' };
  }

  if (result.status === 'correct') {
    // Skor, jumlah solve, dan status solved_by_me berubah di tiga halaman.
    revalidatePath('/challenges');
    revalidatePath('/dashboard');
    revalidatePath('/leaderboard');
  }

  return { result };
}

/**
 * Buka satu hint. Idempoten di sisi database: memanggil ulang tidak menambah
 * penalti, dan hint yang sudah dibuka rekan setim langsung terbaca gratis.
 */
export async function unlockHintAction(
  hintId: string
): Promise<{ result?: UnlockHintResult; error?: string }> {
  if (!hintId) return { error: 'Hint tidak dikenali.' };

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('unlock_hint', {
      p_hint_id: hintId,
    });

    if (error) return { error: error.message };

    return { result: data as UnlockHintResult };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal membuka hint.',
    };
  }
}

/**
 * State panel hint untuk satu challenge. Hint yang belum dibuka mengembalikan
 * hint_text = null, jadi teksnya tidak pernah ikut terkirim ke browser.
 */
export async function fetchMyHints(
  challengeId: string
): Promise<{ hints?: HintRow[]; error?: string }> {
  if (!challengeId) return { error: 'Challenge tidak dikenali.' };

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('my_hints', {
      p_challenge_id: challengeId,
    });

    if (error) return { error: error.message };

    return { hints: (data ?? []) as HintRow[] };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal memuat hint.',
    };
  }
}
