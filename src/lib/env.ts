/**
 * Akses environment variable dengan pesan error yang jelas.
 *
 * Tanpa ini, kredensial yang lupa di-set muncul sebagai error Supabase yang
 * membingungkan ("Invalid URL") jauh dari sumber masalahnya.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Environment variable ${name} belum di-set. Salin .env.local.example menjadi .env.local lalu isi nilainya.`
    );
  }
  return value;
}

/**
 * Apakah kredensial Supabase sudah tersedia.
 *
 * Dipakai middleware agar `npm run dev` tanpa .env.local tidak membuat seluruh
 * aplikasi (termasuk landing page) balas 500.
 */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function supabaseUrl(): string {
  return required(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function supabaseAnonKey(): string {
  return required(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Server-only. Jangan pernah dipanggil dari client component. */
export function supabaseServiceRoleKey(): string {
  return required(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Base URL aplikasi, dipakai untuk redirect callback OAuth.
 * Prioritas: env eksplisit -> URL deployment Vercel -> localhost.
 */
export function siteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    'http://localhost:3000';

  return url.replace(/\/$/, '');
}
