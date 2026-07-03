/** @type {import('tailwindcss').Config} */
const alpha = (v) => `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: alpha('--background'),
        foreground: alpha('--foreground'),
        card: {
          DEFAULT: alpha('--card'),
          foreground: alpha('--card-foreground'),
        },
        muted: {
          DEFAULT: alpha('--muted'),
          foreground: alpha('--muted-foreground'),
        },
        primary: {
          DEFAULT: alpha('--primary'),
          foreground: alpha('--primary-foreground'),
        },
        success: {
          DEFAULT: alpha('--success'),
          foreground: alpha('--success-foreground'),
        },
        destructive: {
          DEFAULT: alpha('--destructive'),
          foreground: alpha('--destructive-foreground'),
        },
        border: alpha('--border'),
        input: alpha('--input'),
        ring: alpha('--ring'),
      },
      borderRadius: {
        // Radius grammar: cards/inputs = 20px; chips/small = 14px; panes = 24px; pills via rounded-full.
        sm: 'calc(var(--radius) - 6px)',
        md: 'calc(var(--radius) - 6px)',
        lg: 'var(--radius)',
        xl: 'var(--radius)',
        '2xl': 'calc(var(--radius) + 4px)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          'system-ui',
          'Inter',
          'sans-serif',
        ],
      },
      fontWeight: {
        // Ladder 300 / 400 / 600 / 700 — no true 500.
        medium: '600',
      },
      keyframes: {
        'set-flash': {
          '0%': { backgroundColor: alpha('--success').replace('<alpha-value>', '0.25') },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'set-flash': 'set-flash 0.6s ease-out',
      },
    },
  },
  plugins: [],
};
