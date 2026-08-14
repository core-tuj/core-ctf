import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { TeamOnboarding } from '@/components/teams/team-onboarding';
import { TeamPanel, type TeamMember } from '@/components/teams/team-panel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Tim',
};

export default async function TeamsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profileResult, solveResult] = await Promise.all([
    supabase.from('profiles').select('team_id').eq('id', user.id).single(),
    // Dipakai untuk memberi tahu berapa solve yang akan ikut terbawa saat
    // bergabung — bukan lagi sebagai penghalang.
    supabase
      .from('solves')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  if (profileResult.error) {
    return (
      <>
        <PageHeader title="Tim" />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Gagal memuat profil</AlertTitle>
          <AlertDescription className="font-mono text-xs">
            {profileResult.error.message}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const solveCount = solveResult.count ?? 0;
  const teamId = profileResult.data?.team_id ?? null;

  if (!teamId) {
    return (
      <>
        <PageHeader
          title="Tim"
          description="Buat tim baru atau gabung dengan join code. Solve yang sudah kamu kumpulkan ikut terbawa."
        />
        <TeamOnboarding solveCount={solveCount} />
      </>
    );
  }

  const [teamResult, membersResult, statsResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, join_code, total_score')
      .eq('id', teamId)
      .single(),
    supabase
      .from('profiles')
      .select('id, name, avatar_url, total_score')
      .eq('team_id', teamId)
      .order('total_score', { ascending: false }),
    supabase
      .from('leaderboard_teams')
      .select('rank, solve_count, first_blood_count')
      .eq('id', teamId)
      .single(),
  ]);

  if (teamResult.error || !teamResult.data) {
    return (
      <>
        <PageHeader title="Tim" />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Gagal memuat tim</AlertTitle>
          <AlertDescription className="font-mono text-xs">
            {teamResult.error?.message ?? 'Tim tidak ditemukan.'}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Tim"
        description="Bagikan join code ke anggota, dan pantau kontribusi tim."
      />
      <TeamPanel
        team={teamResult.data}
        members={(membersResult.data ?? []) as TeamMember[]}
        stats={{
          rank: statsResult.data?.rank ?? null,
          solve_count: statsResult.data?.solve_count ?? 0,
          first_blood_count: statsResult.data?.first_blood_count ?? 0,
        }}
        currentUserId={user.id}
      />
    </>
  );
}
