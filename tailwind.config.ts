import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * CORE CTF — Cyber Dark Theme
 *
 * Palette utama (raw hex -> HSL token di src/app/globals.css):
 *   #030f26  background   -> 219 85% 8%    (bg-background)
 *   #000093  card/secondary -> 240 100% 29% (bg-card / bg-secondary)
 *   #6780ff  primary/accent -> 230 100% 70% (bg-primary, hover, ring)
 *   #c20000  danger/first blood -> 0 100% 38% (bg-destructive / bg-blood)
 */
const config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        /* ---- shadcn/ui semantic tokens (HSL vars) ---- */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        /* ---- Brand tokens (raw hex, dipakai untuk gradient/glow) ---- */
        cyber: {
          base: '#030f26', // background utama
          deep: '#000093', // card / elemen sekunder
          accent: '#6780ff', // highlight / primary
          blood: '#c20000', // first blood / danger
        },
        blood: {
          DEFAULT: '#c20000',
          foreground: '#ffffff',
        },

        /* ---- Warna kategori challenge ---- */
        category: {
          web: '#6780ff',
          pwn: '#c20000',
          crypto: '#00d3a7',
          forensics: '#ffb020',
          reverse: '#b06bff',
          osint: '#20c9ff',
          misc: '#8a93b8',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(103, 128, 255, 0.25), 0 0 24px -4px rgba(103, 128, 255, 0.45)',
        'glow-sm': '0 0 12px -2px rgba(103, 128, 255, 0.5)',
        'glow-blood':
          '0 0 0 1px rgba(194, 0, 0, 0.35), 0 0 28px -4px rgba(194, 0, 0, 0.6)',
        card: '0 8px 30px -12px rgba(0, 0, 147, 0.6)',
      },
      backgroundImage: {
        'cyber-grid':
          'linear-gradient(rgba(103,128,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(103,128,255,0.06) 1px, transparent 1px)',
        'accent-gradient': 'linear-gradient(135deg, #6780ff 0%, #000093 100%)',
        'blood-gradient': 'linear-gradient(135deg, #c20000 0%, #030f26 100%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(103, 128, 255, 0.45)' },
          '50%': { boxShadow: '0 0 24px 4px rgba(103, 128, 255, 0)' },
        },
        'blood-flash': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(194, 0, 0, 0.7)' },
          '50%': { boxShadow: '0 0 32px 6px rgba(194, 0, 0, 0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(110%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        scanline: {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'blood-flash': 'blood-flash 1.2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        scanline: 'scanline 6s linear infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
