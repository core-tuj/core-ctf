'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, KeyRound, Loader2, Mail, User } from 'lucide-react';

import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type AuthFormState,
} from '@/lib/actions/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const initialState: AuthFormState = {};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.28a12 12 0 0 0 0 10.72l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.18 15.23 0 12 0A12 12 0 0 0 1.28 6.64l4.01 3.09C6.23 6.87 8.88 4.76 12 4.76Z"
      />
    </svg>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <KeyRound className="h-4 w-4" />
      )}
      {pending ? 'Memproses…' : label}
    </Button>
  );
}

/**
 * Nilai `next` dikirim lewat hidden input, bukan lewat name/value pada tombol:
 * React memakai atribut `name` tombol untuk menyisipkan action id server action,
 * sehingga name kustom menimbulkan hydration mismatch.
 */
function GoogleButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="h-4 w-4" />
      )}
      Lanjutkan dengan Google
    </Button>
  );
}

export function AuthForm({
  mode,
  next = '/dashboard',
  initialError,
}: {
  mode: 'login' | 'register';
  next?: string;
  initialError?: string;
}) {
  const isRegister = mode === 'register';

  const [state, formAction] = useActionState(
    isRegister ? signUpWithPassword : signInWithPassword,
    initialState
  );

  const error = state.error ?? initialError;

  return (
    <div className="space-y-6">
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      ) : null}

      {state.notice ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Alert variant="success">
            <Mail />
            <AlertDescription>{state.notice}</AlertDescription>
          </Alert>
        </motion.div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        {isRegister ? (
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={40}
                autoComplete="nickname"
                placeholder="h4ck3rman"
                className="pl-9"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="kamu@example.com"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
          {isRegister ? (
            <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
          ) : null}
        </div>

        <SubmitButton label={isRegister ? 'Daftar' : 'Masuk'} />
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          atau
        </span>
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {isRegister ? 'Masuk' : 'Daftar'}
        </Link>
      </p>
    </div>
  );
}
