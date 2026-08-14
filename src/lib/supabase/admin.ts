import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Client dengan service role key — MELEWATI SEMUA RLS.
 *
 * Import 'server-only' di atas membuat build gagal kalau file ini tidak sengaja
 * ikut ter-bundle ke client component.
 *
 * Hanya untuk operasi yang memang tidak bisa dilakukan lewat RPC, misalnya
 * mengangkat user pertama menjadi admin atau maintenance script. Untuk aksi
 * player biasa, tetap pakai client biasa + RPC supaya RLS bekerja.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    supabaseUrl(),
    supabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
