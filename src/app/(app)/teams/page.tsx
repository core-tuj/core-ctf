import type { Metadata } from 'next';
import { Users } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Tim',
};

export default function TeamsPage() {
  return (
    <>
      <PageHeader
        title="Tim"
        description="Buat tim baru atau gabung dengan join code. Skor solve masuk ke tim dan individu sekaligus."
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-8 w-8 text-primary/60" />
          <p className="text-sm text-muted-foreground">
            RPC <code className="font-mono">create_team</code> /{' '}
            <code className="font-mono">join_team</code> sudah siap di database;
            UI-nya menyusul.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
