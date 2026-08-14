'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertTriangle, Loader2, LogOut } from 'lucide-react';

import { leaveTeamAction, type TeamFormState } from '@/lib/actions/teams';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const initialState: TeamFormState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {pending ? 'Memproses…' : 'Ya, keluar dari tim'}
    </Button>
  );
}

export function LeaveTeamButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(leaveTeamAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogOut className="h-3.5 w-3.5" />
          Keluar tim
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keluar dari tim?</DialogTitle>
          <DialogDescription>
            Kontribusimu ikut tertarik keluar — poin dari challenge yang hanya
            kamu yang menyelesaikannya akan hilang dari skor tim. Skor
            pribadimu tetap utuh, dan kamu bisa bergabung tim lain kapan saja.
          </DialogDescription>
        </DialogHeader>

        {state.error ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          <ConfirmButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
