'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { CATEGORY_ORDER } from '@/lib/categories';
import type { ChallengeCategory } from '@/types/database';

export type AdminFormState = {
  error?: string;
  notice?: string;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function nullableText(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === '' ? null : value;
}

function isCategory(value: string): value is ChallengeCategory {
  return (CATEGORY_ORDER as string[]).includes(value);
}

/** Field yang sama-sama dipakai form buat dan form sunting. */
function readChallengeFields(formData: FormData) {
  const title = text(formData, 'title');
  const category = text(formData, 'category');
  const scoreRaw = text(formData, 'static_score');
  const score = Number.parseInt(scoreRaw, 10);

  if (title.length < 2) return { error: 'Judul minimal 2 karakter.' } as const;
  if (!isCategory(category)) return { error: 'Kategori tidak dikenal.' } as const;
  if (!Number.isFinite(score) || score < 0 || score > 10000) {
    return { error: 'Poin harus angka 0–10000.' } as const;
  }

  return {
    values: {
      title,
      category,
      static_score: score,
      description: text(formData, 'description'),
      author: nullableText(formData, 'author'),
      file_url: nullableText(formData, 'file_url'),
      connection_info: nullableText(formData, 'connection_info'),
      flag_format: text(formData, 'flag_format') || 'CTF{...}',
    },
  } as const;
}

function revalidateAdmin(challengeId?: string) {
  revalidatePath('/admin');
  revalidatePath('/challenges');
  if (challengeId) revalidatePath(`/admin/challenges/${challengeId}`);
}

export async function createChallengeAction(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const parsed = readChallengeFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const flag = text(formData, 'flag');
  const wantActive = formData.get('is_active') === 'on';

  if (wantActive && !flag) {
    return { error: 'Flag wajib diisi sebelum challenge dipublikasikan.' };
  }

  let newId: string;

  try {
    const supabase = await createClient();

    // Selalu dibuat sebagai draft dulu. Constraint
    // `challenges_active_requires_flag` menolak is_active=true tanpa flag,
    // dan flag baru bisa dipasang setelah barisnya punya id.
    const { data, error } = await supabase
      .from('challenges')
      .insert({ ...parsed.values, is_active: false })
      .select('id')
      .single();

    if (error) return { error: error.message };
    newId = data.id;

    if (flag) {
      const { error: flagError } = await supabase.rpc('admin_set_flag', {
        p_challenge_id: newId,
        p_flag: flag,
      });
      if (flagError) {
        return {
          error: `Challenge dibuat, tapi flag gagal dipasang: ${flagError.message}`,
        };
      }
    }

    if (wantActive) {
      const { error: publishError } = await supabase
        .from('challenges')
        .update({ is_active: true })
        .eq('id', newId);
      if (publishError) return { error: publishError.message };
    }
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal membuat challenge.',
    };
  }

  revalidateAdmin(newId);
  redirect(`/admin/challenges/${newId}?created=1`);
}

export async function updateChallengeAction(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const id = text(formData, 'id');
  if (!id) return { error: 'Challenge tidak dikenali.' };

  const parsed = readChallengeFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const flag = text(formData, 'flag');
  const wantActive = formData.get('is_active') === 'on';

  try {
    const supabase = await createClient();

    // Flag diganti lebih dulu supaya publish di langkah berikutnya tidak
    // tertolak constraint saat challenge sebelumnya belum punya flag.
    if (flag) {
      const { error: flagError } = await supabase.rpc('admin_set_flag', {
        p_challenge_id: id,
        p_flag: flag,
      });
      if (flagError) return { error: flagError.message };
    }

    const { error } = await supabase
      .from('challenges')
      .update({ ...parsed.values, is_active: wantActive })
      .eq('id', id);

    if (error) {
      // 23514 = check_violation, satu-satunya yang mungkin di sini adalah
      // mencoba publish challenge yang belum punya flag.
      if (error.code === '23514') {
        return {
          error: 'Tidak bisa dipublikasikan: challenge ini belum punya flag.',
        };
      }
      return { error: error.message };
    }
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal menyimpan.',
    };
  }

  revalidateAdmin(id);
  return { notice: flag ? 'Tersimpan, flag diperbarui.' : 'Tersimpan.' };
}

export async function deleteChallengeAction(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const id = text(formData, 'id');
  if (!id) return { error: 'Challenge tidak dikenali.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (error) return { error: error.message };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal menghapus.',
    };
  }

  revalidateAdmin();
  redirect('/admin');
}

export async function toggleChallengeActiveAction(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const id = text(formData, 'id');
  const next = formData.get('next') === 'true';
  if (!id) return { error: 'Challenge tidak dikenali.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('challenges')
      .update({ is_active: next })
      .eq('id', id);

    if (error) {
      if (error.code === '23514') {
        return { error: 'Set flag dulu sebelum mempublikasikan.' };
      }
      return { error: error.message };
    }
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal mengubah status.',
    };
  }

  revalidateAdmin(id);
  return {};
}

/* -------------------------------------------------------------------------- */
/* Hint                                                                        */
/* -------------------------------------------------------------------------- */

export async function saveHintAction(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const challengeId = text(formData, 'challenge_id');
  const hintId = text(formData, 'hint_id');
  const hintText = text(formData, 'hint_text');
  const cost = Number.parseInt(text(formData, 'cost') || '0', 10);
  const orderIndex = Number.parseInt(text(formData, 'order_index') || '1', 10);

  if (!challengeId) return { error: 'Challenge tidak dikenali.' };
  if (!hintText) return { error: 'Teks hint tidak boleh kosong.' };
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: 'Biaya hint harus angka ≥ 0.' };
  }
  if (!Number.isFinite(orderIndex) || orderIndex < 1) {
    return { error: 'Urutan hint dimulai dari 1.' };
  }

  try {
    const supabase = await createClient();

    const { error } = hintId
      ? await supabase
          .from('hints')
          .update({ hint_text: hintText, cost, order_index: orderIndex })
          .eq('id', hintId)
      : await supabase.from('hints').insert({
          challenge_id: challengeId,
          hint_text: hintText,
          cost,
          order_index: orderIndex,
        });

    if (error) {
      // 23505 = unique_violation pada (challenge_id, order_index)
      if (error.code === '23505') {
        return { error: `Urutan ${orderIndex} sudah dipakai hint lain.` };
      }
      return { error: error.message };
    }
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal menyimpan hint.',
    };
  }

  revalidateAdmin(challengeId);
  return { notice: hintId ? 'Hint diperbarui.' : 'Hint ditambahkan.' };
}

export async function deleteHintAction(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const challengeId = text(formData, 'challenge_id');
  const hintId = text(formData, 'hint_id');
  if (!hintId) return { error: 'Hint tidak dikenali.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('hints').delete().eq('id', hintId);
    if (error) return { error: error.message };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal menghapus hint.',
    };
  }

  revalidateAdmin(challengeId);
  return { notice: 'Hint dihapus.' };
}
