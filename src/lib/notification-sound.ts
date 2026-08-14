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

/*
 * Level sengaja dijaga di kisaran -8 s/d -11 dBFS puncak. Versi pertama
 * memakai puncak 0.07 (-23 dBFS) dengan nada 90 ms — terukur benar secara
 * sinyal, tapi praktis tidak terdengar di speaker laptop.
 */
const SOLVE_PEAK = 0.3;
const FIRST_BLOOD_PEAK = 0.38;

const SOLVE_NOTES: Note[] = [
  { freq: 659.25, start: 0, dur: 0.16 }, // E5
  { freq: 987.77, start: 0.1, dur: 0.34 }, // B5
];

const FIRST_BLOOD_NOTES: Note[] = [
  { freq: 1046.5, start: 0, dur: 0.12 }, // C6
  { freq: 1318.51, start: 0.09, dur: 0.12 }, // E6
  { freq: 1567.98, start: 0.18, dur: 0.12 }, // G6
  { freq: 2093.0, start: 0.27, dur: 0.55 }, // C7
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

function schedule(
  ac: AudioContext,
  notes: Note[],
  type: OscillatorType,
  peak: number
) {
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

function play(notes: Note[], type: OscillatorType, peak: number) {
  if (isSoundMuted()) return;

  const ac = audioContext();
  if (!ac) return;

  if (ac.state === 'suspended') {
    // Penjadwalan harus menunggu context benar-benar berjalan. Kalau tidak,
    // currentTime masih beku saat nada dijadwalkan, dan begitu context
    // resume seluruh nada sudah lewat waktunya lalu hilang tanpa bunyi.
    void ac
      .resume()
      .then(() => schedule(ac, notes, type, peak))
      .catch(() => {});
    return;
  }

  schedule(ac, notes, type, peak);
}

export function playSolveSound() {
  // Triangle, bukan sine: harmoniknya membuat nada lebih terdengar
  // pada level puncak yang sama.
  play(SOLVE_NOTES, 'triangle', SOLVE_PEAK);
}

export function playFirstBloodSound() {
  play(FIRST_BLOOD_NOTES, 'triangle', FIRST_BLOOD_PEAK);
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
