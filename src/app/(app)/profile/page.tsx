import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/layout/page-header';
import { ProfileForm } from '@/components/profile/profile-form';
import { StatRow } from '@/components/ui/stat-row';
import { CATEGORY_META } from '@/lib/categories';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import type { ChallengeCategory } from '@/types/database';

export const metadata: Metadata = {
  title: 'Profil',
};

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
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

  const challengeById = new Map(
    (challenges ?? []).map((challenge) => [challenge.id, challenge])
  );

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

      <div className="space-y-8">
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
            {[
              { label: 'Email', value: user.email ?? '—' },
              { label: 'Role', value: profile?.role ?? '—' },
              { label: 'Tim', value: teamName ?? 'Mode individu' },
              {
                label: 'Bergabung',
                value: profile?.created_at
                  ? dateFormat.format(new Date(profile.created_at))
                  : '—',
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="truncate font-mono text-xs">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="label-micro mb-2">Riwayat solve ({solves.length})</h2>

          {solves.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada challenge yang diselesaikan.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="label-micro py-2 pl-3 pr-2 text-left font-normal">
                      Challenge
                    </th>
                    <th className="label-micro hidden px-2 py-2 text-left font-normal sm:table-cell">
                      Waktu
                    </th>
                    <th className="label-micro w-16 py-2 pl-2 pr-3 text-right font-normal">
                      Poin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {solves.map((solve) => {
                    const challenge = challengeById.get(solve.challenge_id);
                    const meta = challenge
                      ? CATEGORY_META[challenge.category as ChallengeCategory]
                      : null;

                    return (
                      <tr
                        key={solve.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="py-2 pl-3 pr-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {meta ? (
                              <span
                                className={cn(
                                  'h-2 w-2 shrink-0 rounded-sm',
                                  meta.accent
                                )}
                                aria-hidden="true"
                              />
                            ) : null}
                            <span className="truncate font-mono text-[0.8125rem]">
                              {challenge?.title ?? 'Challenge dihapus'}
                            </span>
                            {solve.is_first_blood ? (
                              <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-destructive">
                                first blood
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="hidden px-2 py-2 font-mono text-[0.6875rem] text-muted-foreground sm:table-cell">
                          {dateFormat.format(new Date(solve.created_at))}
                        </td>
                        <td className="tabular py-2 pl-2 pr-3 text-right font-mono text-xs text-primary">
                          {solve.points_awarded}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
