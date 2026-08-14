'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { TeamActionResult } from '@/types/database';

export type TeamFormState = {
  error?: string;
  notice?: string;
};

/**
 * Keanggotaan tim mengubah header (nama tim), leaderboard, dan halaman tim itu
 * sendiri — jadi yang di-revalidate adalah seluruh layout, bukan satu route.
 */
function revalidateTeamViews() {
  revalidatePath('/', 'layout');
}

/**
 * Bungkus pemanggilan RPC tim.
 *
 * Fungsi database membedakan dua jenis kegagalan:
 *   - `{status:'error', message}` untuk kesalahan yang wajar (nama sudah
 *     dipakai, join code salah) — pesannya sudah ramah dan bisa ditampilkan;
 *   - exception untuk pelanggaran aturan (mis. ganti tim setelah punya solve),
 *     yang muncul sebagai `error.message` dari PostgREST.
 * Keduanya dikembalikan sebagai state, bukan dilempar, supaya form tidak
 * menjatuhkan halaman ke error boundary.
 */
async function callTeamRpc(
  // PromiseLike, bukan Promise: builder PostgREST adalah thenable, bukan
  // instance Promise sungguhan.
  run: (
    supabase: Awaited<ReturnType<typeof createClient>>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<TeamFormState> {
  try {
    const supabase = await createClient();
    const { data, error } = await run(supabase);

    if (error) return { error: error.message };

    const result = data as TeamActionResult;
    if (result?.status === 'error') return { error: result.message };

    revalidateTeamViews();
    return {};
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Terjadi kesalahan.',
    };
  }
}

export async function createTeamAction(
  _prevState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const name = String(formData.get('name') ?? '').trim();

  if (name.length < 2) {
    return { error: 'Nama tim minimal 2 karakter.' };
  }
  if (name.length > 40) {
    return { error: 'Nama tim maksimal 40 karakter.' };
  }

  return callTeamRpc((supabase) =>
    supabase.rpc('create_team', { p_name: name })
  );
}

export async function joinTeamAction(
  _prevState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const code = String(formData.get('join_code') ?? '')
    .trim()
    .toUpperCase();

  if (code.length !== 6) {
    return { error: 'Join code terdiri dari 6 karakter.' };
  }

  return callTeamRpc((supabase) =>
    supabase.rpc('join_team', { p_join_code: code })
  );
}

/** Tanpa parameter: useActionState boleh memanggil fungsi dengan arity lebih kecil. */
export async function leaveTeamAction(): Promise<TeamFormState> {
  return callTeamRpc((supabase) => supabase.rpc('leave_team', {}));
}
