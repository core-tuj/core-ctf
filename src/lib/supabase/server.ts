import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Supabase client untuk Server Component, Server Action, dan Route Handler.
 *
 * Sejak Next 15 `cookies()` bersifat async, jadi fungsi ini juga async:
 *
 *   const supabase = await createClient();
 *
 * Selalu buat client baru per request — jangan simpan di variabel module-level,
 * karena di serverless satu instance bisa melayani banyak user berbeda.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component tidak boleh menulis cookie. Aman diabaikan:
          // middleware yang bertugas me-refresh session token.
        }
      },
    },
  });
}

/**
 * User yang sedang login beserta baris profiles-nya.
 *
 * Selalu memakai `getUser()` (bukan `getSession()`) karena getUser memverifikasi
 * JWT ke server Supabase — session dari cookie saja bisa dipalsukan.
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile };
}
