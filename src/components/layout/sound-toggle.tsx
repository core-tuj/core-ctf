'use client';

import { Volume2, VolumeX } from 'lucide-react';

import { useSoundPreference } from '@/lib/notification-sound';
import { Button } from '@/components/ui/button';

export function SoundToggle() {
  const { muted, toggle } = useSoundPreference();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-pressed={muted}
      title={muted ? 'Nyalakan suara notifikasi' : 'Bisukan suara notifikasi'}
    >
      {muted ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      <span className="sr-only">
        {muted ? 'Nyalakan suara notifikasi' : 'Bisukan suara notifikasi'}
      </span>
    </Button>
  );
}
