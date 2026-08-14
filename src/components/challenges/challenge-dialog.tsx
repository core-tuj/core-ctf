'use client';

import { Download } from 'lucide-react';

import { FlagForm } from '@/components/challenges/flag-form';
import { HintPanel } from '@/components/challenges/hint-panel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CATEGORY_META } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { ChallengeBoardItem } from '@/types/database';

export function ChallengeDialog({
  challenge,
  open,
  onOpenChange,
}: {
  challenge: ChallengeBoardItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const meta = CATEGORY_META[challenge.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={cn('h-2 w-2 rounded-sm', meta.accent)}
              aria-hidden="true"
            />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
              {meta.label}
            </span>
            <span className="tabular font-mono text-[0.65rem] text-primary">
              {challenge.static_score} poin
            </span>
            {challenge.author ? (
              <span className="truncate font-mono text-[0.65rem] text-muted-foreground">
                · {challenge.author}
              </span>
            ) : null}
          </div>

          <DialogTitle>{challenge.title}</DialogTitle>

          <DialogDescription asChild>
            <div className="flex flex-wrap gap-x-3 font-mono text-[0.6875rem]">
              <span className="tabular">{challenge.solve_count} solve</span>
              {challenge.first_blood_by ? (
                <span className="text-destructive">
                  first blood: {challenge.first_blood_by}
                </span>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* whitespace-pre-line: deskripsi disimpan sebagai teks biasa di
            database, baris barunya harus tetap terlihat. */}
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {challenge.description || 'Tidak ada deskripsi.'}
        </p>

        {challenge.connection_info ? (
          <div className="space-y-1.5">
            <p className="label-micro">Koneksi</p>
            <code className="block overflow-x-auto rounded border border-border bg-background px-3 py-2 font-mono text-sm">
              {challenge.connection_info}
            </code>
          </div>
        ) : null}

        {challenge.file_url ? (
          <a
            href={challenge.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-primary/40 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Download className="h-4 w-4" />
            Download file
          </a>
        ) : null}

        {challenge.hint_count > 0 ? <Separator /> : null}

        <HintPanel
          challengeId={challenge.id}
          hintCount={challenge.hint_count}
        />

        <Separator />

        <FlagForm
          challengeId={challenge.id}
          solved={challenge.solved_by_me}
          flagFormat={challenge.flag_format}
        />
      </DialogContent>
    </Dialog>
  );
}
