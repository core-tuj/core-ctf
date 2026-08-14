'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Droplet, Flag, LogIn, Trophy, Users } from 'lucide-react';

import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Flag,
    title: 'Challenge always-on',
    body: 'Tidak ada jadwal, tidak ada hitung mundur. Semua soal aktif kapan pun kamu siap.',
  },
  {
    icon: Trophy,
    title: 'Leaderboard realtime',
    body: 'Peringkat bergerak begitu ada flag yang benar — tanpa perlu refresh.',
  },
  {
    icon: Droplet,
    title: 'First blood',
    body: 'Yang pertama menaklukkan sebuah soal diumumkan ke seluruh peserta.',
  },
  {
    icon: Users,
    title: 'Individu atau tim',
    body: 'Main sendiri, atau kumpulkan poin bersama satu tim lewat join code.',
  },
];

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col justify-center gap-12 py-16">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5"
      >
        <Logo size={96} className="rounded-2xl shadow-glow-blood" />

        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold tracking-tight text-glow sm:text-5xl">
            CORE <span className="text-destructive">CTF</span>
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Cyber Operation for Research
          </p>
        </div>

        <p className="max-w-xl text-muted-foreground">
          Platform latihan Capture The Flag milik CORE. Asah kemampuan web,
          crypto, forensics, reverse engineering, OSINT, dan misc kapan saja.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/register">
              <Flag className="h-4 w-4" />
              Mulai main
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Masuk
            </Link>
          </Button>
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card/25 p-5 backdrop-blur-sm"
            >
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <h2 className="mb-1 font-mono text-sm font-semibold">
                {feature.title}
              </h2>
              <p className="text-sm text-muted-foreground">{feature.body}</p>
            </div>
          );
        })}
      </motion.section>
    </main>
  );
}
