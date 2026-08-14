import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

import { ChallengeBoard } from '@/components/challenges/challenge-board';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Challenges',
};

export default async function ChallengesPage() {
  const supabase = await createClient();

  // Dibaca dari view `challenges_board`, bukan tabel `challenges`:
  // kolom flag_hash tidak di-GRANT ke authenticated, jadi `select('*')` pada
  // tabelnya akan ditolak database. View ini sekaligus membawa solve_count,
  // hint_count, solved_by_me, dan first_blood_by dalam satu query.
  const { data: challenges, error } = await supabase
    .from('challenges_board')
    .select('*')
    .eq('is_active', true)
    .order('static_score', { ascending: true })
    .order('title', { ascending: true });

  const solved = challenges?.filter((item) => item.solved_by_me).length ?? 0;

  return (
    <>
      <PageHeader
        title="Challenges"
        description={
          challenges?.length
            ? `${solved} dari ${challenges.length} challenge sudah kamu selesaikan.`
            : 'Daftar soal per kategori. Unlock hint bila mentok, lalu submit flag.'
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Gagal memuat challenge</AlertTitle>
          <AlertDescription className="space-y-1">
            <p className="font-mono text-xs">{error.message}</p>
            <p>
              Pastikan seluruh migrasi di{' '}
              <code className="font-mono">supabase/migrations/</code> sudah
              di-apply.
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        <ChallengeBoard challenges={challenges ?? []} />
      )}
    </>
  );
}
