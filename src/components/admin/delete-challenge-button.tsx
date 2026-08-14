'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Trash2, TriangleAlert } from 'lucide-react';

import { deleteChallengeAction, type AdminFormState } from '@/lib/actions/admin';
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

const initialState: AdminFormState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {pending ? 'Menghapus…' : 'Ya, hapus'}
    </Button>
  );
}

export function DeleteChallengeButton({
  id,
  title,
  solveCount,
}: {
  id: string;
  title: string;
  solveCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    deleteChallengeAction,
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-3.5 w-3.5" />
          Hapus
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus “{title}”?</DialogTitle>
          <DialogDescription>
            {solveCount > 0
              ? `Challenge ini sudah diselesaikan ${solveCount} kali. Menghapusnya ikut menghapus solve tersebut, dan skor pemain maupun tim akan dihitung ulang turun.`
              : 'Hint dan seluruh riwayat submit ikut terhapus. Tindakan ini tidak bisa dibatalkan.'}
          </DialogDescription>
        </DialogHeader>

        {state.error ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="flex justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
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
