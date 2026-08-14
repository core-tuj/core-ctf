'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Loader2, Plus, TriangleAlert, Trash2 } from 'lucide-react';

import {
  deleteHintAction,
  saveHintAction,
  type AdminFormState,
} from '@/lib/actions/admin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initialState: AdminFormState = {};

export type AdminHint = {
  id: string;
  hint_text: string;
  cost: number;
  order_index: number;
};

function SubmitIcon({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" variant="ghost" disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">Hapus hint</span>
    </Button>
  );
}

function HintRow({
  challengeId,
  hint,
}: {
  challengeId: string;
  hint: AdminHint;
}) {
  const [saveState, saveAction] = useActionState(saveHintAction, initialState);
  const [deleteState, deleteAction] = useActionState(
    deleteHintAction,
    initialState
  );

  const error = saveState.error ?? deleteState.error;

  return (
    <li className="space-y-2 border-b border-border p-3 last:border-b-0">
      {error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {saveState.notice ? (
        <Alert variant="success">
          <Check />
          <AlertDescription>{saveState.notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-start gap-2">
        <form action={saveAction} className="flex-1 space-y-2">
          <input type="hidden" name="challenge_id" value={challengeId} />
          <input type="hidden" name="hint_id" value={hint.id} />

          <Textarea
            name="hint_text"
            required
            rows={2}
            defaultValue={hint.hint_text}
            className="min-h-0 text-[0.8125rem]"
          />

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-20 space-y-1">
              <Label
                htmlFor={`order-${hint.id}`}
                className="label-micro"
              >
                Urutan
              </Label>
              <Input
                id={`order-${hint.id}`}
                name="order_index"
                type="number"
                min={1}
                defaultValue={hint.order_index}
                className="h-8"
              />
            </div>

            <div className="w-24 space-y-1">
              <Label htmlFor={`cost-${hint.id}`} className="label-micro">
                Biaya
              </Label>
              <Input
                id={`cost-${hint.id}`}
                name="cost"
                type="number"
                min={0}
                defaultValue={hint.cost}
                className="h-8"
              />
            </div>

            <SubmitIcon label="Simpan" />
          </div>
        </form>

        <form action={deleteAction}>
          <input type="hidden" name="challenge_id" value={challengeId} />
          <input type="hidden" name="hint_id" value={hint.id} />
          <DeleteButton />
        </form>
      </div>
    </li>
  );
}

function NewHintForm({
  challengeId,
  nextOrder,
  onDone,
}: {
  challengeId: string;
  nextOrder: number;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(saveHintAction, initialState);

  // Menutup form lewat efek, bukan saat render: memanggil setState milik
  // parent di tengah render memicu peringatan React dan render berulang.
  useEffect(() => {
    if (state.notice) onDone();
  }, [state.notice, onDone]);

  return (
    <form action={formAction} className="space-y-2 border-t border-border p-3">
      <input type="hidden" name="challenge_id" value={challengeId} />

      {state.error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Textarea
        name="hint_text"
        required
        rows={2}
        placeholder="Teks hint baru…"
        className="min-h-0 text-[0.8125rem]"
      />

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-20 space-y-1">
          <Label htmlFor="new-order" className="label-micro">
            Urutan
          </Label>
          <Input
            id="new-order"
            name="order_index"
            type="number"
            min={1}
            defaultValue={nextOrder}
            className="h-8"
          />
        </div>

        <div className="w-24 space-y-1">
          <Label htmlFor="new-cost" className="label-micro">
            Biaya
          </Label>
          <Input
            id="new-cost"
            name="cost"
            type="number"
            min={0}
            defaultValue={0}
            className="h-8"
          />
        </div>

        <SubmitIcon label="Tambah" />
      </div>
    </form>
  );
}

export function HintEditor({
  challengeId,
  hints,
}: {
  challengeId: string;
  hints: AdminHint[];
}) {
  const [adding, setAdding] = useState(false);
  // Referensi stabil supaya efek di NewHintForm tidak berjalan tiap render
  const closeAdding = useCallback(() => setAdding(false), []);

  const nextOrder =
    hints.reduce((max, hint) => Math.max(max, hint.order_index), 0) + 1;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="label-micro">Hint ({hints.length})</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAdding((value) => !value)}
        >
          <Plus className="h-3.5 w-3.5" />
          {adding ? 'Tutup' : 'Tambah hint'}
        </Button>
      </div>

      <div className="rounded-md border border-border bg-surface">
        {hints.length === 0 && !adding ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Belum ada hint. Biaya 0 berarti hint gratis.
          </p>
        ) : (
          <ul>
            {hints.map((hint) => (
              <HintRow key={hint.id} challengeId={challengeId} hint={hint} />
            ))}
          </ul>
        )}

        {adding ? (
          <NewHintForm
            challengeId={challengeId}
            nextOrder={nextOrder}
            onDone={closeAdding}
          />
        ) : null}
      </div>
    </section>
  );
}
