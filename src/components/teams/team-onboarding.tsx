'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, History, Loader2, LogIn, UserPlus } from 'lucide-react';

import {
  createTeamAction,
  joinTeamAction,
  type TeamFormState,
} from '@/lib/actions/teams';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: TeamFormState = {};

function SubmitButton({
  label,
  icon: Icon,
  disabled,
}: {
  label: string;
  icon: typeof UserPlus;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {pending ? 'Memproses…' : label}
    </Button>
  );
}

function FormError({ state }: { state: TeamFormState }) {
  if (!state.error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    </motion.div>
  );
}

export function TeamOnboarding({ solveCount }: { solveCount: number }) {
  const [createState, createAction] = useActionState(
    createTeamAction,
    initialState
  );
  const [joinState, joinAction] = useActionState(joinTeamAction, initialState);

  return (
    <div className="space-y-6">
      {solveCount > 0 ? (
        <Alert>
          <History />
          <AlertTitle>
            {solveCount} solve-mu akan ikut terbawa
          </AlertTitle>
          <AlertDescription>
            Begitu bergabung, poin dari challenge yang sudah kamu selesaikan
            langsung masuk ke skor tim. Kalau ada anggota lain yang pernah
            menyelesaikan challenge yang sama, yang dihitung adalah{' '}
            <strong>solve yang paling awal</strong> — jadi tidak ada poin
            ganda. Skor pribadimu tidak berubah.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" />
              Buat tim baru
            </CardTitle>
            <CardDescription>
              Kamu akan mendapat join code untuk dibagikan ke anggota lain.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={createAction} className="space-y-4">
              <FormError state={createState} />

              <div className="space-y-2">
                <Label htmlFor="team-name">Nama tim</Label>
                <Input
                  id="team-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={40}
                  autoComplete="off"
                  placeholder="Null Terminators"
                />
              </div>

              <SubmitButton label="Buat tim" icon={UserPlus} />
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogIn className="h-4 w-4 text-primary" />
              Gabung tim
            </CardTitle>
            <CardDescription>
              Minta join code 6 karakter dari salah satu anggota tim.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={joinAction} className="space-y-4">
              <FormError state={joinState} />

              <div className="space-y-2">
                <Label htmlFor="join-code">Join code</Label>
                <Input
                  id="join-code"
                  name="join_code"
                  required
                  minLength={6}
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="A7K2XM"
                  // Kode selalu huruf besar; uppercase di CSS supaya yang
                  // diketik user langsung terlihat sama dengan yang dikirim.
                  className="font-mono uppercase tracking-[0.3em] placeholder:tracking-[0.3em]"
                />
              </div>

              <SubmitButton label="Gabung" icon={LogIn} />
            </form>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Tanpa tim, kamu tetap bisa bermain dalam mode individu. Kalau bergabung
        tim, poin setiap solve masuk ke skor tim <em>dan</em> skor pribadimu.
      </p>
    </div>
  );
}
