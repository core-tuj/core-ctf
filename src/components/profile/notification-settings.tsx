'use client';

import { Droplet, Flag, Volume2, VolumeX } from 'lucide-react';

import {
  playFirstBloodSound,
  playSolveSound,
  unlockAudio,
  useSoundPreference,
} from '@/lib/notification-sound';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Pengaturan suara yang bisa dicoba langsung.
 *
 * Tombol bisu di header saja tidak cukup: satu ikon tanpa label, dan satu-
 * satunya cara mendengar hasilnya adalah menunggu ada yang solve. Di sini
 * preferensinya diberi nama jelas dan bisa diuji saat itu juga.
 */
export function NotificationSettings() {
  const { muted, toggle } = useSoundPreference();

  function test(play: () => void) {
    // Klik ini sendiri sudah menjadi gesture yang dibutuhkan browser untuk
    // mengizinkan audio, tapi unlock dipanggil eksplisit agar tidak bergantung
    // pada urutan event.
    unlockAudio();
    play();
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-start gap-2.5">
          {muted ? (
            <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <div>
            <p className="text-sm">Suara notifikasi</p>
            <p className="text-xs text-muted-foreground">
              Berbunyi setiap ada yang menyelesaikan challenge. Tersimpan di
              browser ini saja.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant={muted ? 'outline' : 'default'}
          onClick={toggle}
          aria-pressed={!muted}
        >
          {muted ? 'Nyalakan' : 'Bisukan'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm">Coba suaranya</p>
          <p
            className={cn(
              'text-xs',
              muted ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {muted
              ? 'Suara sedang dibisukan — nyalakan dulu untuk mendengarnya.'
              : 'Pastikan volume perangkat tidak dalam keadaan senyap.'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={muted}
            onClick={() => test(playSolveSound)}
          >
            <Flag className="h-3.5 w-3.5" />
            Solve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={muted}
            onClick={() => test(playFirstBloodSound)}
          >
            <Droplet className="h-3.5 w-3.5" />
            First blood
          </Button>
        </div>
      </div>
    </div>
  );
}
