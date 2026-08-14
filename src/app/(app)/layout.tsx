import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import { SidebarNav } from '@/components/layout/sidebar-nav';
import { SiteHeader } from '@/components/layout/site-header';
import { SolveNotifier } from '@/components/realtime/solve-notifier';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/server';

/**
 * Shell untuk seluruh area yang butuh login: header sticky + sidebar desktop
 * + konten. Route group `(app)` tidak menambah segmen URL, jadi halamannya
 * tetap /dashboard, /challenges, dan seterusnya.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return (
      <main className="container flex min-h-screen items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle />
          <AlertTitle>Profil tidak ditemukan</AlertTitle>
          <AlertDescription>
            Trigger <code className="font-mono">on_auth_user_created</code>{' '}
            seharusnya membuat baris di tabel{' '}
            <code className="font-mono">profiles</code> saat signup. Pastikan
            migrasi <code className="font-mono">20260814090100</code> sudah
            di-apply, lalu login ulang.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  // Query terpisah, bukan embed `teams(name)`: tipe database ditulis manual
  // tanpa metadata relasi, jadi embed PostgREST tidak akan lolos typecheck.
  let teamName: string | null = null;
  if (profile.team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', profile.team_id)
      .single();
    teamName = team?.name ?? null;
  }

  const isAdmin = profile.role === 'admin';

  return (
    <div className="min-h-screen">
      <SiteHeader
        profile={profile}
        email={user.email ?? ''}
        teamName={teamName}
      />

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border p-4 lg:block">
          <SidebarNav isAdmin={isAdmin} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>

      {/* Dipasang di layout, bukan di halaman tertentu, supaya notifikasi
          solve muncul di mana pun user sedang berada. */}
      <SolveNotifier currentUserId={user.id} />
    </div>
  );
}
