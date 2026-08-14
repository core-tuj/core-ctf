import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from '@/lib/env';
import type { Database } from '@/types/database';

/** Butuh login. */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/challenges',
  '/leaderboard',
  '/teams',
  '/profile',
  '/admin',
];

/** Hanya untuk role admin. */
const ADMIN_PREFIXES = ['/admin'];

/** Halaman auth — kalau sudah login, tidak perlu ke sini lagi. */
const AUTH_PREFIXES = ['/login', '/register'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Refresh session Supabase + gerbang otorisasi berbasis route.
 *
 * Dua hal yang kritikal di sini:
 *
 * 1. Token akses Supabase berumur pendek. Server Component tidak bisa menulis
 *    cookie, jadi middleware inilah satu-satunya tempat token diperbarui.
 *    Tanpa ini user akan ter-logout sendiri saat token kedaluwarsa.
 *
 * 2. Setiap response baru (termasuk redirect) harus membawa ulang cookie yang
 *    di-set Supabase. Kalau lupa menyalinnya, session yang baru di-refresh
 *    hilang dan user terjebak dalam loop redirect.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Belum dikonfigurasi. Di development biarkan lewat supaya landing page tetap
  // bisa dibuka; di production ini misconfigurasi yang harus gagal keras,
  // karena melewatkan request berarti route terproteksi jadi terbuka.
  if (!hasSupabaseEnv()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Kredensial Supabase tidak di-set. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di environment variable deployment.'
      );
    }
    console.warn(
      '[supabase] .env.local belum diisi — pengecekan auth dilewati untuk development.'
    );
    return response;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Jangan sisipkan kode apa pun antara createServerClient dan getUser():
  // getUser() yang memicu refresh token, dan menundanya bikin bug session
  // yang sulit dilacak.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }

    const redirectResponse = NextResponse.redirect(url);
    // Bawa serta cookie hasil refresh token di atas.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  };

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    return redirectTo('/login', {
      next: pathname + request.nextUrl.search,
    });
  }

  if (user && matches(pathname, AUTH_PREFIXES)) {
    return redirectTo('/dashboard');
  }

  if (user && matches(pathname, ADMIN_PREFIXES)) {
    // Query role hanya untuk route admin, supaya request lain tidak kena
    // ongkos satu round-trip database.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return redirectTo('/dashboard', { error: 'forbidden' });
    }
  }

  return response;
}
