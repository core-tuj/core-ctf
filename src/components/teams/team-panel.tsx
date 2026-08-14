import { CopyButton } from '@/components/teams/copy-button';
import { LeaveTeamButton } from '@/components/teams/leave-team-button';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { StatRow } from '@/components/ui/stat-row';
import { cn } from '@/lib/utils';

export type TeamMember = {
  id: string;
  name: string;
  avatar_url: string | null;
  total_score: number;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export function TeamPanel({
  team,
  members,
  stats,
  currentUserId,
}: {
  team: { id: string; name: string; join_code: string; total_score: number };
  members: TeamMember[];
  stats: {
    rank: number | null;
    solve_count: number;
    first_blood_count: number;
  };
  currentUserId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-micro">Tim</p>
          <h2 className="font-mono text-lg font-semibold">{team.name}</h2>
        </div>
        <LeaveTeamButton />
      </div>

      <StatRow
        items={[
          {
            label: 'Peringkat',
            value: stats.rank ? `#${stats.rank}` : '—',
          },
          { label: 'Skor tim', value: team.total_score, tone: 'primary' },
          { label: 'Solve', value: stats.solve_count },
          {
            label: 'First blood',
            value: stats.first_blood_count,
            tone: stats.first_blood_count > 0 ? 'blood' : undefined,
          },
        ]}
      />

      <section className="rounded-md border border-border bg-surface p-4">
        <p className="label-micro mb-2">Join code</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-base font-semibold tracking-[0.25em] text-primary">
            {team.join_code}
          </code>
          <CopyButton value={team.join_code} label="Salin" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Siapa pun yang punya kode ini bisa bergabung. Bagikan hanya ke anggota
          timmu.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="label-micro">Anggota ({members.length})</h3>
          <p className="text-[0.6875rem] text-muted-foreground">
            Satu challenge dihitung sekali untuk tim — dari yang solve paling
            awal
          </p>
        </div>

        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {members.map((member) => (
            <li
              key={member.id}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2',
                member.id === currentUserId && 'bg-primary/[0.07]'
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
                {member.id === currentUserId ? (
                  <span className="ml-1.5 font-mono text-[0.65rem] text-primary">
                    kamu
                  </span>
                ) : null}
              </span>

              <span className="tabular font-mono text-xs text-muted-foreground">
                {member.total_score}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
