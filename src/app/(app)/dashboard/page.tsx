import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Droplet, Flag, ShieldCheck, Trophy, Users } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Dashboard',
};

function StatCard({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Trophy;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
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

  const { data: solves } = await supabase
    .from('solves')
    .select('id, is_first_blood')
    .eq('user_id', user.id);

  const solveCount = solves?.length ?? 0;
  const firstBloodCount =
    solves?.filter((solve) => solve.is_first_blood).length ?? 0;

  return (
    <>
      <PageHeader
        title={`Halo, ${profile?.name ?? user.email}`}
        description="Semua challenge selalu aktif. Kerjakan kapan pun, skormu langsung masuk leaderboard."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total skor" icon={Trophy}>
          <p className="font-mono text-3xl font-bold tabular-nums">
            {profile?.total_score ?? 0}
          </p>
        </StatCard>

        <StatCard label="Challenge selesai" icon={Flag}>
          <p className="font-mono text-3xl font-bold tabular-nums">
            {solveCount}
          </p>
        </StatCard>

        <StatCard label="First blood" icon={Droplet}>
          <p className="font-mono text-3xl font-bold tabular-nums text-destructive text-glow-blood">
            {firstBloodCount}
          </p>
        </StatCard>

        <StatCard label="Mode" icon={profile?.team_id ? Users : ShieldCheck}>
          <Badge variant={profile?.team_id ? 'default' : 'outline'}>
            {profile?.team_id ? 'Tim' : 'Individu'}
          </Badge>
        </StatCard>
      </div>
    </>
  );
}
