/**
 * Tingkatan rank berbasis total skor.
 *
 * Diturunkan murni dari `total_score`, jadi tidak butuh kolom baru di database
 * dan otomatis berlaku untuk siapa pun yang skornya bisa dibaca — termasuk
 * pemain lain di leaderboard.
 *
 * Kelas warna ditulis sebagai string literal utuh; Tailwind memindai kode
 * sumber sebagai teks dan tidak akan menemukan nama kelas hasil interpolasi.
 */
export type RankTier = {
  /** Skor minimum untuk mencapai tingkat ini. */
  min: number;
  name: string;
  /** Angka romawi kecil untuk ditampilkan di badge. */
  numeral: string;
  text: string;
  border: string;
  bg: string;
  dot: string;
};

export const RANK_TIERS: RankTier[] = [
  {
    min: 0,
    name: 'Script Kiddie',
    numeral: 'I',
    text: 'text-slate-400',
    border: 'border-slate-400/40',
    bg: 'bg-slate-400/10',
    dot: 'bg-slate-400',
  },
  {
    min: 100,
    name: 'Initiate',
    numeral: 'II',
    text: 'text-emerald-400',
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-400/10',
    dot: 'bg-emerald-400',
  },
  {
    min: 300,
    name: 'Operator',
    numeral: 'III',
    text: 'text-sky-400',
    border: 'border-sky-400/40',
    bg: 'bg-sky-400/10',
    dot: 'bg-sky-400',
  },
  {
    min: 700,
    name: 'Breacher',
    numeral: 'IV',
    text: 'text-primary',
    border: 'border-primary/40',
    bg: 'bg-primary/10',
    dot: 'bg-primary',
  },
  {
    min: 1200,
    name: 'Exploiter',
    numeral: 'V',
    text: 'text-violet-400',
    border: 'border-violet-400/40',
    bg: 'bg-violet-400/10',
    dot: 'bg-violet-400',
  },
  {
    min: 2000,
    name: 'Ghost',
    numeral: 'VI',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-400/40',
    bg: 'bg-fuchsia-400/10',
    dot: 'bg-fuchsia-400',
  },
  {
    min: 3200,
    name: 'Zero Day',
    numeral: 'VII',
    text: 'text-amber-400',
    border: 'border-amber-400/40',
    bg: 'bg-amber-400/10',
    dot: 'bg-amber-400',
  },
  {
    min: 5000,
    name: 'Root',
    numeral: 'VIII',
    text: 'text-destructive',
    border: 'border-destructive/50',
    bg: 'bg-destructive/10',
    dot: 'bg-destructive',
  },
];

export type RankProgress = {
  tier: RankTier;
  /** Tingkat berikutnya, atau null kalau sudah tertinggi. */
  next: RankTier | null;
  /** 0–100. Bernilai 100 pada tingkat tertinggi. */
  percent: number;
  /** Sisa poin menuju tingkat berikutnya, 0 kalau sudah tertinggi. */
  remaining: number;
};

export function rankFor(score: number): RankProgress {
  const safeScore = Math.max(0, score);

  let index = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (safeScore >= RANK_TIERS[i].min) {
      index = i;
      break;
    }
  }

  const tier = RANK_TIERS[index];
  const next = RANK_TIERS[index + 1] ?? null;

  if (!next) {
    return { tier, next: null, percent: 100, remaining: 0 };
  }

  const span = next.min - tier.min;
  const gained = safeScore - tier.min;

  return {
    tier,
    next,
    percent: Math.min(100, Math.round((gained / span) * 100)),
    remaining: Math.max(0, next.min - safeScore),
  };
}
