import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orbi: {
          green:      '#3ECF8E',
          'green-dk': '#29A86E',
          'green-lt': '#6EDFA8',
        },
        bg: {
          base:     '#0D0D0D',
          elevated: '#161616',
          card:     'rgba(255,255,255,0.03)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          subtle:  'rgba(255,255,255,0.04)',
          green:   'rgba(62,207,142,0.25)',
        },
        ink: {
          DEFAULT:   '#EDEDED',
          secondary: 'rgba(237,237,237,0.60)',
          muted:     'rgba(237,237,237,0.35)',
        },
      },
      fontFamily: {
        display: ['var(--font-fredoka)', 'sans-serif'],
        sans:    ['var(--font-inter)',   'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        'grid-dot': "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
        'hero-glow': 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(62,207,142,0.12) 0%, transparent 70%)',
        'green-glow': 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(62,207,142,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        'dot-24': '24px 24px',
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'float-delay': 'float 6s ease-in-out 1.5s infinite',
        'pulse-slow':  'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':   'spin 20s linear infinite',
        'shimmer':     'shimmer 2.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-16px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
