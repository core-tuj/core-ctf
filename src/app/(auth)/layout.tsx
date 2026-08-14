import Link from 'next/link';

import { Logo } from '@/components/layout/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <Link href="/" className="flex flex-col items-center gap-3">
          <Logo size={72} className="rounded-xl" />
          <span className="font-mono text-xl font-bold tracking-tight text-glow">
            CORE <span className="text-destructive">CTF</span>
          </span>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Cyber Operation for Research
          </span>
        </Link>

        {children}
      </div>
    </main>
  );
}
