import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

import { LeaderboardView } from '@/components/leaderboard/leaderboard-view';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Leaderboard',
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Data awal diambil di server supaya peringkat sudah terisi pada render
  // pertama; setelah itu client yang menjaga kesegarannya lewat Realtime.
  const [profile, playerRows, teamRows] = await Promise.all([
    supabase.from('profiles').select('team_id').eq('id', user.id).single(),
    supabase
      .from('leaderboard_players')
      .select('*')
      .order('rank', { ascending: true })
      .limit(100),
    supabase
      .from('leaderboard_teams')
      .select('*')
      .order('rank', { ascending: true })
      .limit(100),
  ]);

  const error = playerRows.error ?? teamRows.error;

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Peringkat diperbarui otomatis setiap ada flag yang benar — tidak perlu refresh."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Gagal memuat leaderboard</AlertTitle>
          <AlertDescription className="space-y-1">
            <p className="font-mono text-xs">{error.message}</p>
            <p>
              Pastikan migrasi{' '}
              <code className="font-mono">20260814090400_views_realtime</code>{' '}
              sudah di-apply.
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        <LeaderboardView
          initialPlayers={playerRows.data ?? []}
          initialTeams={teamRows.data ?? []}
          currentUserId={user.id}
          currentTeamId={profile.data?.team_id ?? null}
        />
      )}
    </>
  );
}
