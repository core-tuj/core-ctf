import {
  Boxes,
  Bug,
  Cpu,
  Eye,
  Fingerprint,
  Globe,
  Lock,
  type LucideIcon,
} from 'lucide-react';

import type { ChallengeCategory } from '@/types/database';

/**
 * Kelas Tailwind ditulis lengkap sebagai string literal, bukan disusun
 * dinamis seperti `bg-category-${category}`. Tailwind memindai kode sumber
 * sebagai teks — nama kelas hasil interpolasi tidak akan pernah ikut ter-build.
 */
export const CATEGORY_META: Record<
  ChallengeCategory,
  { label: string; icon: LucideIcon; badge: string; accent: string }
> = {
  web: {
    label: 'Web',
    icon: Globe,
    badge: 'border-category-web/40 bg-category-web/10 text-category-web',
    accent: 'bg-category-web',
  },
  pwn: {
    label: 'Pwn',
    icon: Bug,
    badge: 'border-category-pwn/40 bg-category-pwn/10 text-category-pwn',
    accent: 'bg-category-pwn',
  },
  crypto: {
    label: 'Crypto',
    icon: Lock,
    badge:
      'border-category-crypto/40 bg-category-crypto/10 text-category-crypto',
    accent: 'bg-category-crypto',
  },
  forensics: {
    label: 'Forensics',
    icon: Fingerprint,
    badge:
      'border-category-forensics/40 bg-category-forensics/10 text-category-forensics',
    accent: 'bg-category-forensics',
  },
  reverse: {
    label: 'Reverse',
    icon: Cpu,
    badge:
      'border-category-reverse/40 bg-category-reverse/10 text-category-reverse',
    accent: 'bg-category-reverse',
  },
  osint: {
    label: 'OSINT',
    icon: Eye,
    badge: 'border-category-osint/40 bg-category-osint/10 text-category-osint',
    accent: 'bg-category-osint',
  },
  misc: {
    label: 'Misc',
    icon: Boxes,
    badge: 'border-category-misc/40 bg-category-misc/10 text-category-misc',
    accent: 'bg-category-misc',
  },
};

export const CATEGORY_ORDER: ChallengeCategory[] = [
  'web',
  'pwn',
  'crypto',
  'forensics',
  'reverse',
  'osint',
  'misc',
];
