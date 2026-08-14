import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { RankBadge } from '@/components/ui/rank-badge';
import { StatRow } from '@/components/ui/stat-row';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Profil tim',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export default async function TeamProfilePage({
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

  const [teamResult, membersResult, statsResult, meResult] = await Promise.all([
    // join_code sengaja TIDAK diambil: halaman ini bisa dibuka siapa pun, dan
    // siapa pun yang punya kode itu bisa masuk ke tim.
    supabase.from('teams').select('id, name, total_score').eq('id', id).single(),
    supabase
      .from('profiles')
      .select('id, name, avatar_url, total_score')
      .eq('team_id', id)
      .order('total_score', { ascending: false }),
    supabase
      .from('leaderboard_teams')
      .select('rank, solve_count, first_blood_count, member_count')
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('team_id').eq('id', user.id).single(),
  ]);

  const team = teamResult.data;
  if (!team) notFound();

  const members = membersResult.data ?? [];
  const stats = statsResult.data;
  const isMyTeam = meResult.data?.team_id === id;

  return (
    <>
      <Link
        href="/leaderboard"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Leaderboard
      </Link>

      <PageHeader
        title={team.name}
        description={isMyTeam ? 'Ini timmu' : 'Profil tim'}
        actions={
          isMyTeam ? (
            <Link
              href="/teams"
              className="self-center text-xs text-primary underline-offset-2 hover:underline"
            >
              Kelola tim
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <StatRow
          items={[
            { label: 'Peringkat', value: stats?.rank ? `#${stats.rank}` : '—' },
            { label: 'Skor tim', value: team.total_score, tone: 'primary' },
            { label: 'Solve', value: stats?.solve_count ?? 0 },
            {
              label: 'First blood',
              value: stats?.first_blood_count ?? 0,
              tone: (stats?.first_blood_count ?? 0) > 0 ? 'blood' : undefined,
            },
          ]}
        />

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="label-micro">Anggota ({members.length})</h2>
            <p className="text-[0.6875rem] text-muted-foreground">
              Satu challenge dihitung sekali untuk tim — dari yang solve paling
              awal
            </p>
          </div>

          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/players/${member.id}`}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface-raised',
                    member.id === user.id && 'bg-primary/[0.07]'
                  )}
                >
                  <Avatar className="h-6 w-6 border-0">
                    {member.avatar_url ? (
                      <AvatarImage src={member.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[0.6rem]">
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
                    {member.name}
                    {member.id === user.id ? (
                      <span className="ml-1.5 font-mono text-[0.65rem] text-primary">
                        kamu
                      </span>
                    ) : null}
                  </span>

                  <RankBadge
                    score={member.total_score}
                    showNumeral={false}
                    className="hidden sm:inline-flex"
                  />

                  <span className="tabular font-mono text-xs text-muted-foreground">
                    {member.total_score}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
