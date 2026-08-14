'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Loader2, TriangleAlert } from 'lucide-react';

import {
  updateProfileAction,
  type ProfileFormState,
} from '@/lib/actions/profile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: ProfileFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {pending ? 'Menyimpan…' : 'Simpan'}
    </Button>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export function ProfileForm({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <p className="text-xs text-muted-foreground">
          Avatar diambil dari URL. Login lewat Google mengisinya otomatis.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="label-micro">
            Nama tampilan
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={name}
            required
            minLength={1}
            maxLength={40}
            autoComplete="nickname"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avatar_url" className="label-micro">
            URL avatar
          </Label>
          <Input
            id="avatar_url"
            name="avatar_url"
            type="url"
            defaultValue={avatarUrl ?? ''}
            placeholder="https://…"
            autoComplete="off"
          />
        </div>
      </div>

      <SaveButton />
    </form>
  );
}
