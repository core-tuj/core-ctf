'use client';

import { Download, Droplet, Terminal, Users } from 'lucide-react';

import { FlagForm } from '@/components/challenges/flag-form';
import { HintPanel } from '@/components/challenges/hint-panel';
import { Badge } from '@/components/ui/badge';
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
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('gap-1', meta.badge)}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </Badge>
            <Badge variant="secondary" className="font-mono">
              {challenge.static_score} poin
            </Badge>
            {challenge.author ? (
              <span className="text-xs text-muted-foreground">
                oleh {challenge.author}
              </span>
            ) : null}
          </div>

          <DialogTitle>{challenge.title}</DialogTitle>

          <DialogDescription asChild>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {challenge.solve_count} solve
              </span>
              {challenge.first_blood_by ? (
                <span className="flex items-center gap-1 text-destructive">
                  <Droplet className="h-3 w-3" />
                  First blood: {challenge.first_blood_by}
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
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Terminal className="h-3.5 w-3.5" />
              Koneksi
            </p>
            <code className="block overflow-x-auto rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-sm">
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
        />
      </DialogContent>
    </Dialog>
  );
}
