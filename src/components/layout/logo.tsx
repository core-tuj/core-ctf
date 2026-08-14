import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * Logo CORE.
 *
 * Berkasnya JPEG dengan latar navy yang menyatu (bukan transparan), jadi
 * ditampilkan sebagai ubin bersudut membulat — terbaca sebagai ikon aplikasi,
 * bukan gambar yang latarnya "bocor".
 */
export function Logo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.jpg"
      alt=""
      width={size}
      height={size}
      priority
      className={cn('shrink-0 rounded-md', className)}
    />
  );
}

/** Logo + wordmark. `alt` dikosongkan karena teksnya sudah mewakili. */
export function LogoLockup({
  size = 28,
  className,
  textClassName,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Logo size={size} />
      <span
        className={cn(
          'font-mono font-bold tracking-tight',
          textClassName
        )}
      >
        CORE <span className="text-destructive">CTF</span>
      </span>
    </span>
  );
}
