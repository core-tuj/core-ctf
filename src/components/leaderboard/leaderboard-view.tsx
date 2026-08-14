'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Droplet, Flag, Radio, Trophy, Users } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { LeaderboardPlayer, LeaderboardTeam } from '@/types/database';

const ROW_LIMIT = 100;
/** Beberapa solve bisa masuk beruntun; jangan re-fetch untuk tiap-tiap event. */
const REFETCH_DEBOUNCE_MS = 400;

function rankStyle(rank: number) {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-slate-300';
  if (rank === 3) return 'text-amber-600';
  return 'text-muted-foreground';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

function Row({
  rank,
  name,
  subtitle,
  avatarUrl,
  score,
  solveCount,
  firstBloodCount,
  highlight,
}: {
  rank: number;
  name: string;
  subtitle: string | null;
  avatarUrl?: string | null;
  score: number;
  solveCount: number;
  firstBloodCount: number;
  highlight: boolean;
}) {
  return (
    <motion.li
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 38 }}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card/20 px-3 py-2.5',
        highlight && 'border-primary/50 bg-primary/10'
      )}
    >
      <span
        className={cn(
          'w-8 shrink-0 text-center font-mono text-sm font-bold tabular-nums',
          rankStyle(rank)
        )}
      >
        {rank}
      </span>

      <Avatar className="h-8 w-8">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name}
          {highlight ? (
            <span className="ml-2 font-mono text-xs text-primary">kamu</span>
          ) : null}
        </p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
        <Flag className="h-3 w-3" />
        {solveCount}
      </span>

      {firstBloodCount > 0 ? (
        <span className="hidden items-center gap-1 text-xs text-destructive sm:flex">
          <Droplet className="h-3 w-3" />
          {firstBloodCount}
        </span>
      ) : null}

      <span className="w-16 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-primary">
        {score}
      </span>
    </motion.li>
  );
}

export function LeaderboardView({
  initialPlayers,
  initialTeams,
  currentUserId,
  currentTeamId,
}: {
  initialPlayers: LeaderboardPlayer[];
  initialTeams: LeaderboardTeam[];
  currentUserId: string;
  currentTeamId: string | null;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [teams, setTeams] = useState(initialTeams);
  const [tab, setTab] = useState<'players' | 'teams'>('players');
  const [live, setLive] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    // Kalau Realtime gagal disiapkan, tabel tetap menampilkan data yang sudah
    // dirender server — indikatornya saja yang tidak pernah jadi "live".
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    async function refetch() {
      const [playerRows, teamRows] = await Promise.all([
        supabase
          .from('leaderboard_players')
          .select('*')
          .order('rank', { ascending: true })
          .limit(ROW_LIMIT),
        supabase
          .from('leaderboard_teams')
          .select('*')
          .order('rank', { ascending: true })
          .limit(ROW_LIMIT),
      ]);

      if (!active) return;
      if (playerRows.data) setPlayers(playerRows.data);
      if (teamRows.data) setTeams(teamRows.data);
    }

    const channel = supabase
      .channel('leaderboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'solves' },
        () => {
          // View tidak bisa di-subscribe langsung; solve baru adalah sinyal
          // untuk menarik ulang peringkat yang sudah dihitung database.
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(refetch, REFETCH_DEBOUNCE_MS);
        }
      )
      .subscribe((status) => {
        if (active) setLive(status === 'SUBSCRIBED');
      });

    return () => {
      active = false;
      if (debounce.current) clearTimeout(debounce.current);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as 'players' | 'teams')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="w-auto">
          <TabsTrigger value="players">
            <Trophy className="h-3.5 w-3.5" />
            Individu
            <span className="font-mono text-xs opacity-70">
              {players.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="h-3.5 w-3.5" />
            Tim
            <span className="font-mono text-xs opacity-70">{teams.length}</span>
          </TabsTrigger>
        </TabsList>

        <span
          className={cn(
            'flex items-center gap-1.5 font-mono text-xs',
            live ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Radio className={cn('h-3.5 w-3.5', live && 'animate-pulse')} />
          {live ? 'live' : 'menyambung…'}
        </span>
      </div>

      <div className="mt-6">
        {tab === 'players' ? (
          players.length === 0 ? (
            <EmptyState message="Belum ada pemain terdaftar." />
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {players.map((player) => (
                  <Row
                    key={player.id}
                    rank={player.rank}
                    name={player.name}
                    subtitle={player.team_name}
                    avatarUrl={player.avatar_url}
                    score={player.total_score}
                    solveCount={player.solve_count}
                    firstBloodCount={player.first_blood_count}
                    highlight={player.id === currentUserId}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )
        ) : teams.length === 0 ? (
          <EmptyState message="Belum ada tim yang dibuat." />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {teams.map((team) => (
                <Row
                  key={team.id}
                  rank={team.rank}
                  name={team.name}
                  subtitle={`${team.member_count} anggota`}
                  score={team.total_score}
                  solveCount={team.solve_count}
                  firstBloodCount={team.first_blood_count}
                  highlight={team.id === currentTeamId}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Tabs>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/20 py-16 text-center">
      <Trophy className="h-8 w-8 text-primary/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
