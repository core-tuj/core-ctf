'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Droplet,
  Flag,
  Loader2,
  Timer,
} from 'lucide-react';

import { submitFlagAction, type FlagFormState } from '@/lib/actions/challenges';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const initialState: FlagFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Flag className="h-4 w-4" />
      )}
      {pending ? 'Mengecek…' : 'Submit'}
    </Button>
  );
}

function ResultAlert({ state }: { state: FlagFormState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  const result = state.result;
  if (!result) return null;

  if (result.status === 'correct') {
    return (
      <Alert variant={result.first_blood ? 'destructive' : 'success'}>
        {result.first_blood ? <Droplet /> : <CheckCircle2 />}
        <AlertDescription className="space-y-1">
          <p className="font-medium">
            {result.first_blood
              ? `FIRST BLOOD! +${result.points} poin`
              : `Flag benar. +${result.points} poin`}
          </p>
          {result.penalty > 0 ? (
            <p className="text-xs text-muted-foreground">
              Dipotong {result.penalty} poin dari hint yang dibuka. Total skormu
              sekarang {result.total_score}.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Total skormu sekarang {result.total_score}.
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={result.status === 'wrong' ? 'destructive' : 'default'}>
      {result.status === 'rate_limited' ? <Timer /> : <AlertTriangle />}
      <AlertDescription>{result.message}</AlertDescription>
    </Alert>
  );
}

export function FlagForm({
  challengeId,
  solved,
}: {
  challengeId: string;
  solved: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(submitFlagAction, initialState);

  const isCorrect = state.result?.status === 'correct';

  useEffect(() => {
    // Server Action sudah memanggil revalidatePath, tapi dialog ini tetap
    // terbuka. router.refresh() menarik ulang RSC-nya supaya kartu di
    // belakang langsung berubah menjadi "Solved".
    if (isCorrect) router.refresh();
  }, [isCorrect, router]);

  if (solved || isCorrect) {
    return (
      <div className="space-y-3">
        <AnimatePresence>
          {state.result ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ResultAlert state={state} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!state.result ? (
          <Alert variant="success">
            <CheckCircle2 />
            <AlertDescription>
              Challenge ini sudah kamu selesaikan.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {state.result || state.error ? (
          <motion.div
            key={state.error ?? state.result?.status}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ResultAlert state={state} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="challengeId" value={challengeId} />
        <Input
          name="flag"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="CTF{...}"
          aria-label="Flag"
          className="font-mono"
        />
        <SubmitButton />
      </form>
    </div>
  );
}
