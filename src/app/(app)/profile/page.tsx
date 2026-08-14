import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/layout/page-header';
import { ProfileForm } from '@/components/profile/profile-form';
import { SolveHistory } from '@/components/profile/solve-history';
import { RankPanel } from '@/components/ui/rank-badge';
import { StatRow } from '@/components/ui/stat-row';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Profil',
};

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profileResult, solvesResult, rankResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('solves')
      .select('id, challenge_id, points_awarded, is_first_blood, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leaderboard_players')
      .select('rank')
      .eq('id', user.id)
      .single(),
  ]);

  const profile = profileResult.data;
  const solves = solvesResult.data ?? [];

  // Judul challenge diambil terpisah: tipe database ditulis manual tanpa
  // metadata relasi, jadi embed PostgREST tidak lolos typecheck.
  const challengeIds = solves.map((solve) => solve.challenge_id);
  const { data: challenges } = challengeIds.length
    ? await supabase
        .from('challenges_board')
        .select('id, title, category')
        .in('id', challengeIds)
    : { data: [] };

  let teamName: string | null = null;
  if (profile?.team_id) {
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
      <PageHeader
        title="Profil"
        description="Ubah identitas tampilanmu dan lihat riwayat solve."
      />

      <div className="space-y-6">
        <RankPanel score={profile?.total_score ?? 0} />

        <StatRow
          items={[
            {
              label: 'Peringkat',
              value: rankResult.data?.rank ? `#${rankResult.data.rank}` : '—',
            },
            {
              label: 'Skor',
              value: profile?.total_score ?? 0,
              tone: 'primary',
            },
            { label: 'Solve', value: solves.length },
            {
              label: 'First blood',
              value: firstBloodCount,
              tone: firstBloodCount > 0 ? 'blood' : undefined,
            },
          ]}
        />

        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="label-micro mb-4">Identitas</h2>
          <ProfileForm
            name={profile?.name ?? ''}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </section>

        <section>
          <h2 className="label-micro mb-2">Akun</h2>
          <dl className="divide-y divide-border rounded-md border border-border bg-surface text-sm">
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-mono text-xs">
                {user.email ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-mono text-xs">{profile?.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Tim</dt>
              <dd className="truncate font-mono text-xs">
                {profile?.team_id && teamName ? (
                  <Link
                    href={`/teams/${profile.team_id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {teamName}
                  </Link>
                ) : (
                  'Mode individu'
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Bergabung</dt>
              <dd className="font-mono text-xs">
                {profile?.created_at
                  ? dateFormat.format(new Date(profile.created_at))
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="label-micro mb-2">Riwayat solve ({solves.length})</h2>
          <SolveHistory solves={solves} challenges={challenges ?? []} />
        </section>
      </div>
    </>
  );
}
