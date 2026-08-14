'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Loader2, TriangleAlert } from 'lucide-react';

import {
  createChallengeAction,
  updateChallengeAction,
  type AdminFormState,
} from '@/lib/actions/admin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { ChallengeCategory } from '@/types/database';

const initialState: AdminFormState = {};

export type ChallengeFormValues = {
  id?: string;
  title: string;
  category: ChallengeCategory;
  description: string;
  static_score: number;
  author: string | null;
  file_url: string | null;
  connection_info: string | null;
  flag_format: string;
  is_active: boolean;
};

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? 'Menyimpan…' : label}
    </Button>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="label-micro">
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ChallengeForm({
  mode,
  values,
  hasFlag,
}: {
  mode: 'create' | 'edit';
  values?: ChallengeFormValues;
  /** Hanya untuk pesan di UI — hash flag tidak pernah bisa dibaca. */
  hasFlag?: boolean;
}) {
  const [state, formAction] = useActionState(
    mode === 'create' ? createChallengeAction : updateChallengeAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      {values?.id ? (
        <input type="hidden" name="id" value={values.id} />
      ) : null}

      {state.error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.notice ? (
        <Alert variant="success">
          <Check />
          <AlertDescription>{state.notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Judul" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            minLength={2}
            maxLength={120}
            defaultValue={values?.title}
            placeholder="Cookie Monster"
          />
        </Field>

        <Field label="Kategori" htmlFor="category">
          <Select
            id="category"
            name="category"
            defaultValue={values?.category ?? 'web'}
          >
            {CATEGORY_ORDER.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_META[category].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Poin" htmlFor="static_score">
          <Input
            id="static_score"
            name="static_score"
            type="number"
            min={0}
            max={10000}
            required
            defaultValue={values?.static_score ?? 100}
          />
        </Field>

        <Field label="Author" htmlFor="author">
          <Input
            id="author"
            name="author"
            defaultValue={values?.author ?? ''}
            placeholder="nama pembuat soal"
          />
        </Field>
      </div>

      <Field
        label="Deskripsi"
        htmlFor="description"
        hint="Baris baru dipertahankan apa adanya saat ditampilkan ke pemain."
      >
        <Textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={values?.description}
          placeholder="Jelaskan soalnya di sini…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Link berkas"
          htmlFor="file_url"
          hint="Tempel link Google Drive. Pastikan aksesnya 'siapa saja yang memiliki link'."
        >
          <Input
            id="file_url"
            name="file_url"
            type="url"
            defaultValue={values?.file_url ?? ''}
            placeholder="https://drive.google.com/file/d/…"
          />
        </Field>

        <Field
          label="Info koneksi"
          htmlFor="connection_info"
          hint="Kosongkan bila soal tidak butuh koneksi."
        >
          <Input
            id="connection_info"
            name="connection_info"
            defaultValue={values?.connection_info ?? ''}
            placeholder="nc host.example 1337"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Flag"
          htmlFor="flag"
          hint={
            mode === 'edit'
              ? hasFlag
                ? 'Sudah ada flag tersimpan. Isi hanya bila ingin menggantinya — hash lama tidak bisa dibaca kembali.'
                : 'Belum ada flag. Wajib diisi sebelum bisa dipublikasikan.'
              : 'Disimpan sebagai bcrypt di database dan tidak bisa dibaca kembali. Simpan salinannya sendiri.'
          }
        >
          <Input
            id="flag"
            name="flag"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            placeholder={
              mode === 'edit' && hasFlag ? '••••••  (biarkan kosong)' : 'CTF{…}'
            }
          />
        </Field>

        <Field
          label="Format flag"
          htmlFor="flag_format"
          hint="Petunjuk yang ditampilkan di kolom submit pemain."
        >
          <Input
            id="flag_format"
            name="flag_format"
            defaultValue={values?.flag_format ?? 'CTF{...}'}
          />
        </Field>
      </div>

      <label className="flex items-start gap-2.5 rounded border border-border bg-surface px-3 py-2.5">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={values?.is_active ?? false}
          className="mt-0.5 h-4 w-4 accent-[#6780ff]"
        />
        <span className="text-sm">
          Publikasikan
          <span className="block text-[0.6875rem] text-muted-foreground">
            Challenge yang tidak dipublikasikan hanya terlihat oleh admin.
          </span>
        </span>
      </label>

      <SaveButton label={mode === 'create' ? 'Buat challenge' : 'Simpan'} />
    </form>
  );
}
