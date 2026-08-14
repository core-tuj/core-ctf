'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { siteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export type AuthFormState = {
  error?: string;
  notice?: string;
};

/**
 * Hanya izinkan redirect ke path internal.
 * Tanpa pengecekan ini, `?next=https://evil.example` menjadikan halaman login
 * sebagai open redirect yang enak dipakai untuk phishing.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '/dashboard';
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '')
      .trim()
      .toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

export async function signInWithPassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  const next = safeNextPath(formData.get('next'));

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Pesan digeneralisasi supaya tidak bisa dipakai untuk menebak
    // email mana yang terdaftar.
    return { error: 'Email atau password salah.' };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUpWithPassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  const name = String(formData.get('name') ?? '').trim();

  if (!name || name.length < 2) {
    return { error: 'Nama minimal 2 karakter.' };
  }
  if (!email) {
    return { error: 'Email wajib diisi.' };
  }
  if (password.length < 8) {
    return { error: 'Password minimal 8 karakter.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Dibaca trigger handle_new_user() untuk mengisi profiles.name
      data: { full_name: name.slice(0, 40) },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Kalau konfirmasi email aktif di Supabase, session belum terbentuk.
  if (!data.session) {
    return {
      notice: `Cek inbox ${email} untuk mengonfirmasi akun sebelum masuk.`,
    };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get('next'));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent('Gagal memulai login Google.')}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}
