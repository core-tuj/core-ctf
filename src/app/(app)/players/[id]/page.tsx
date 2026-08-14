import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/layout/page-header';
import { SolveHistory } from '@/components/profile/solve-history';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { RankPanel } from '@/components/ui/rank-badge';
import { StatRow } from '@/components/ui/stat-row';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Profil pemain',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Profil sendiri punya halaman terpisah yang bisa disunting.
  if (user.id === id) redirect('/profile');

  const [profileResult, solvesResult, rankResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, avatar_url, total_score, team_id, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('solves')
      .select('id, challenge_id, points_awarded, is_first_blood, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('leaderboard_players').select('rank').eq('id', id).single(),
  ]);

  const profile = profileResult.data;
  if (!profile) notFound();

  const solves = solvesResult.data ?? [];

  const challengeIds = solves.map((solve) => solve.challenge_id);
  const { data: challenges } = challengeIds.length
    ? await supabase
        .from('challenges_board')
        .select('id, title, category')
        .in('id', challengeIds)
    : { data: [] };

  let teamName: string | null = null;
  if (profile.team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', profile.team_id)
      .single();
    teamName = team?.name ?? null;
  }

  const firstBloodCount = solves.filter((s) => s.is_first_blood).length;

  return (
    <>
      <PageHeader title={profile.name} description="Profil pemain" />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="" />
            ) : null}
            <AvatarFallback>{initials(profile.name)}</AvatarFallback>
          </Avatar>

          <div>
            <p className="font-mono text-base font-semibold">{profile.name}</p>
            {profile.team_id && teamName ? (
              <Link
                href={`/teams/${profile.team_id}`}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {teamName}
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">Mode individu</p>
            )}
          </div>
        </div>

        <RankPanel score={profile.total_score} />

        <StatRow
          items={[
            {
              label: 'Peringkat',
              value: rankResult.data?.rank ? `#${rankResult.data.rank}` : '—',
            },
            { label: 'Skor', value: profile.total_score, tone: 'primary' },
            { label: 'Solve', value: solves.length },
            {
              label: 'First blood',
              value: firstBloodCount,
              tone: firstBloodCount > 0 ? 'blood' : undefined,
            },
          ]}
        />

        <section>
          <h2 className="label-micro mb-2">Riwayat solve ({solves.length})</h2>
          <SolveHistory
            solves={solves}
            challenges={challenges ?? []}
            emptyMessage="Pemain ini belum menyelesaikan challenge apa pun."
          />
        </section>
      </div>
    </>
  );
}
