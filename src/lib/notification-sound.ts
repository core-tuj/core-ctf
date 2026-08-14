'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Nada notifikasi disintesis lewat Web Audio, bukan diputar dari berkas.
 *
 * Alasannya praktis: tidak ada aset biner yang harus di-commit dan diunduh,
 * ukurannya nol, dan tidak ada urusan lisensi. Nada pendek seperti ini
 * memang lebih murah dibangkitkan daripada diambil lewat jaringan.
 */

const STORAGE_KEY = 'core-ctf:sound';

type Note = { freq: number; start: number; dur: number };

const SOLVE_NOTES: Note[] = [
  { freq: 659.25, start: 0, dur: 0.09 }, // E5
  { freq: 987.77, start: 0.08, dur: 0.13 }, // B5
];

const FIRST_BLOOD_NOTES: Note[] = [
  { freq: 1046.5, start: 0, dur: 0.08 }, // C6
  { freq: 1318.51, start: 0.07, dur: 0.08 }, // E6
  { freq: 1567.98, start: 0.14, dur: 0.08 }, // G6
  { freq: 2093.0, start: 0.21, dur: 0.26 }, // C7
];

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }

  return context;
}

/**
 * Browser menolak memulai audio sebelum ada interaksi pengguna. Dipanggil
 * sekali pada gesture pertama supaya notifikasi berikutnya bisa berbunyi.
 */
export function unlockAudio() {
  const ac = audioContext();
  if (ac && ac.state === 'suspended') void ac.resume().catch(() => {});
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

function play(notes: Note[], type: OscillatorType, peak: number) {
  if (isSoundMuted()) return;

  const ac = audioContext();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => {});

  const now = ac.currentTime;

  for (const note of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(note.freq, now + note.start);

    // Envelope: naik cepat lalu meluruh. Tanpa ini terdengar 'klik' di awal
    // dan akhir nada.
    gain.gain.setValueAtTime(0.0001, now + note.start);
    gain.gain.linearRampToValueAtTime(peak, now + note.start + 0.012);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + note.start + note.dur
    );

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now + note.start);
    osc.stop(now + note.start + note.dur + 0.02);
  }
}

export function playSolveSound() {
  play(SOLVE_NOTES, 'sine', 0.07);
}

export function playFirstBloodSound() {
  play(FIRST_BLOOD_NOTES, 'triangle', 0.11);
}

/* -------------------------------------------------------------------------- */
/* Preferensi bisu                                                             */
/* -------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function subscribeSound(callback: () => void) {
  listeners.add(callback);
  // 'storage' hanya menyala di tab LAIN, jadi perubahan di tab ini
  // disiarkan sendiri lewat `listeners`.
  window.addEventListener('storage', callback);

  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

/** Di server localStorage tidak ada; anggap suara menyala. */
function serverSnapshot() {
  return false;
}

/**
 * State untuk tombol bisu di header.
 *
 * Memakai useSyncExternalStore, bukan useState + useEffect: localStorage
 * adalah sumber di luar React, dan pola ini menangani render server,
 * hidrasi, serta sinkronisasi antar tab sekaligus.
 */
export function useSoundPreference() {
  const muted = useSyncExternalStore(
    subscribeSound,
    isSoundMuted,
    serverSnapshot
  );

  const toggle = useCallback(() => {
    const next = !isSoundMuted();

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on');
    } catch {
      // mode privat / storage diblokir — preferensi berlaku sesi ini saja
    }

    for (const listener of listeners) listener();

    if (!next) {
      unlockAudio();
      playSolveSound(); // umpan balik langsung saat dinyalakan
    }
  }, []);

  return { muted, toggle };
}
