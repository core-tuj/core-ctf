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
  title: 'Daftar',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat akun</CardTitle>
        <CardDescription>
          Gratis. Semua challenge selalu aktif — tidak ada jadwal, tidak ada
          hitung mundur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          mode="register"
          next={params.next ?? '/dashboard'}
          initialError={params.error}
        />
      </CardContent>
    </Card>
  );
}
