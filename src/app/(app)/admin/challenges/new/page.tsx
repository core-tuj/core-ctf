import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';

import { ChallengeForm } from '@/components/admin/challenge-form';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'Challenge baru',
};

export default function NewChallengePage() {
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
        title="Challenge baru"
        description="Hint bisa ditambahkan setelah challenge tersimpan."
      />

      <ChallengeForm mode="create" />
    </>
  );
}
