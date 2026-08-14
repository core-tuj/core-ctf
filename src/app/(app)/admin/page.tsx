import type { Metadata } from 'next';
import { ShieldHalf } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Panel Admin',
};

/**
 * Akses dijaga middleware (role admin). Halaman ini tidak mengulang
 * pengecekan karena middleware sudah me-redirect non-admin ke /dashboard.
 */
export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Panel Admin"
        description="CRUD challenge, hint, dan user."
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <ShieldHalf className="h-8 w-8 text-primary/60" />
          <p className="text-sm text-muted-foreground">
            Form admin menyusul. Flag diubah lewat RPC{' '}
            <code className="font-mono">admin_set_flag</code>, bukan update
            kolom langsung.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
