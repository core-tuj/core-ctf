import { createBrowserClient } from '@supabase/ssr';

import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Supabase client untuk Client Component.
 *
 * Dipakai untuk hal-hal yang harus hidup di browser: Realtime subscription
 * (leaderboard, first blood) dan RPC yang dipanggil dari interaksi UI.
 *
 * `createBrowserClient` sudah melakukan memoisasi internal, jadi memanggil
 * fungsi ini di banyak komponen tidak membuat koneksi baru.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
