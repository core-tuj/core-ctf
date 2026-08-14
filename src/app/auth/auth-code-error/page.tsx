import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Login gagal',
};

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Login gagal
          </CardTitle>
          <CardDescription>
            Sesi tidak berhasil dibuat. Link konfirmasi mungkin sudah
            kedaluwarsa atau sudah pernah dipakai.
          </CardDescription>
        </CardHeader>

        {reason ? (
          <CardContent>
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs text-muted-foreground">
              {reason}
            </p>
          </CardContent>
        ) : null}

        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Coba masuk lagi</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
