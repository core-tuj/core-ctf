import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Callback OAuth (Google) dan konfirmasi email.
 *
 * Supabase mengirim user ke sini dengan `?code=...`, yang ditukar menjadi
 * session. Cookie-nya ditulis oleh createClient() lewat cookieStore.set —
 * di Route Handler penulisan cookie diizinkan, jadi tidak masuk ke blok catch
 * seperti pada Server Component.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/dashboard';
  // Cegah open redirect lewat parameter next.
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/dashboard';

  // Provider bisa mengembalikan error, misalnya saat user membatalkan consent.
  const providerError =
    searchParams.get('error_description') ?? searchParams.get('error');

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(providerError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent('Kode otorisasi tidak ditemukan.')}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`
    );
  }

  // Di belakang proxy (Vercel), origin request bukan host yang dilihat user.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocal = process.env.NODE_ENV === 'development';

  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
