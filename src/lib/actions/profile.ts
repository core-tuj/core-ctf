'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type ProfileFormState = {
  error?: string;
  notice?: string;
};

/** Hanya izinkan URL http(s); string kosong berarti hapus avatar. */
function normalizeAvatarUrl(raw: string): string | null | undefined {
  const value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const name = String(formData.get('name') ?? '').trim();
  const avatarRaw = String(formData.get('avatar_url') ?? '');

  if (name.length < 1 || name.length > 40) {
    return { error: 'Nama harus 1–40 karakter.' };
  }

  const avatarUrl = normalizeAvatarUrl(avatarRaw);
  if (avatarUrl === undefined) {
    return { error: 'URL avatar harus diawali http:// atau https://.' };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Sesi berakhir. Silakan login ulang.' };

    // GRANT di database hanya mengizinkan authenticated meng-update dua kolom
    // ini, jadi role dan total_score tetap aman meski payload dimanipulasi.
    const { error } = await supabase
      .from('profiles')
      .update({ name, avatar_url: avatarUrl })
      .eq('id', user.id);

    if (error) return { error: error.message };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Gagal menyimpan profil.',
    };
  }

  // Nama dan avatar muncul di header dan leaderboard, bukan hanya di /profile
  revalidatePath('/', 'layout');

  return { notice: 'Profil tersimpan.' };
}
