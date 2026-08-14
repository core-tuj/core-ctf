import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Check, ChevronLeft } from 'lucide-react';

import { ChallengeForm } from '@/components/admin/challenge-form';
import { DeleteChallengeButton } from '@/components/admin/delete-challenge-button';
import { HintEditor, type AdminHint } from '@/components/admin/hint-editor';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Sunting challenge',
};

export default async function EditChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const supabase = await createClient();

  const [challengeResult, hintsResult] = await Promise.all([
    supabase.from('challenges_board').select('*').eq('id', id).single(),
    // hint_text tidak di-GRANT ke authenticated, jadi harus lewat RPC khusus
    // admin. Lihat migrasi 20260814110000.
    supabase.rpc('admin_list_hints', { p_challenge_id: id }),
  ]);

  const challenge = challengeResult.data;
  if (!challenge) notFound();

  const hints = (hintsResult.data ?? []) as AdminHint[];

  return (
    <>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Panel Admin
      </Link>

      <PageHeader
        title={challenge.title}
        description={challenge.is_active ? 'Terbit' : 'Draft — belum terlihat pemain'}
        actions={
          <DeleteChallengeButton
            id={challenge.id}
            title={challenge.title}
            solveCount={challenge.solve_count}
          />
        }
      />

      <div className="space-y-8">
        {created ? (
          <Alert variant="success">
            <Check />
            <AlertDescription>
              Challenge dibuat. Tambahkan hint di bawah bila perlu.
            </AlertDescription>
          </Alert>
        ) : null}

        <ChallengeForm
          mode="edit"
          hasFlag={challenge.has_flag}
          values={{
            id: challenge.id,
            title: challenge.title,
            category: challenge.category,
            description: challenge.description,
            static_score: challenge.static_score,
            author: challenge.author,
            file_url: challenge.file_url,
            connection_info: challenge.connection_info,
            flag_format: challenge.flag_format,
            is_active: challenge.is_active,
          }}
        />

        <HintEditor challengeId={challenge.id} hints={hints} />
      </div>
    </>
  );
}
