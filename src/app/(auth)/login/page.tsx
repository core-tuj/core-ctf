import type { Metadata } from 'next';

import { AuthForm } from '@/components/auth/auth-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Masuk',
};

// Sejak Next 15, searchParams adalah Promise.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>
          Lanjutkan latihan dan kejar posisi teratas leaderboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          mode="login"
          next={params.next ?? '/dashboard'}
          initialError={params.error}
        />
      </CardContent>
    </Card>
  );
}
