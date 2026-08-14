'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

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
const REFETCH_DEBOUNCE_MS = 400;

function rankTone(rank: number) {
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

/**
 * Baris tabel setinggi ~36px, bukan kartu.
 * Scoreboard dibaca dengan cara memindai kolom dari atas ke bawah — kartu
 * dengan padding tebal memaksa mata melompat dan memuat lebih sedikit peserta
 * per layar.
 */
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
    <motion.tr
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 42 }}
      className={cn(
        'border-b border-border last:border-b-0',
        highlight && 'bg-primary/[0.07]'
      )}
    >
      <td
        className={cn(
          'tabular w-10 py-1.5 pl-3 pr-1 text-right font-mono text-xs font-semibold',
          rankTone(rank)
        )}
      >
        {rank}
      </td>

      <td className="py-1.5 pl-3 pr-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-6 w-6 border-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-[0.6rem]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-[0.8125rem] leading-tight">
              {name}
              {highlight ? (
                <span className="ml-1.5 font-mono text-[0.65rem] text-primary">
                  kamu
                </span>
              ) : null}
            </span>
            {subtitle ? (
              <span className="block truncate text-[0.6875rem] leading-tight text-muted-foreground">
                {subtitle}
              </span>
            ) : null}
          </span>
        </div>
      </td>

      <td className="tabular hidden px-2 py-1.5 text-right font-mono text-xs text-muted-foreground sm:table-cell">
        {solveCount}
      </td>

      <td
        className={cn(
          'tabular hidden px-2 py-1.5 text-right font-mono text-xs sm:table-cell',
          firstBloodCount > 0 ? 'text-destructive' : 'text-muted-foreground/40'
        )}
      >
        {firstBloodCount}
      </td>

      <td className="tabular w-20 py-1.5 pl-2 pr-3 text-right font-mono text-sm font-semibold text-primary">
        {score}
      </td>
    </motion.tr>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="label-micro w-10 py-2 pl-3 pr-1 text-right font-normal">
              #
            </th>
            <th className="label-micro py-2 pl-3 pr-2 text-left font-normal">
              Nama
            </th>
            <th className="label-micro hidden px-2 py-2 text-right font-normal sm:table-cell">
              Solve
            </th>
            <th className="label-micro hidden px-2 py-2 text-right font-normal sm:table-cell">
              FB
            </th>
            <th className="label-micro w-20 py-2 pl-2 pr-3 text-right font-normal">
              Skor
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
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
      <div className="flex items-center justify-between gap-3">
        <TabsList className="border-b-0">
          <TabsTrigger value="players">
            Individu
            <span className="tabular opacity-60">{players.length}</span>
          </TabsTrigger>
          <TabsTrigger value="teams">
            Tim
            <span className="tabular opacity-60">{teams.length}</span>
          </TabsTrigger>
        </TabsList>

        <span
          className={cn(
            'flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em]',
            live ? 'text-primary' : 'text-muted-foreground/60'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              live ? 'animate-pulse bg-primary' : 'bg-muted-foreground/40'
            )}
            aria-hidden="true"
          />
          {live ? 'live' : 'offline'}
        </span>
      </div>

      <div className="mt-5">
        {tab === 'players' ? (
          players.length === 0 ? (
            <EmptyState message="Belum ada pemain terdaftar." />
          ) : (
            <Table>
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
            </Table>
          )
        ) : teams.length === 0 ? (
          <EmptyState message="Belum ada tim yang dibuat." />
        ) : (
          <Table>
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
          </Table>
        )}
      </div>
    </Tabs>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
