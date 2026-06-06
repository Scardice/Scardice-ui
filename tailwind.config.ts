import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{html,js,ts,vue}'],
  theme: {
    extend: {
      colors: {
        sd: {
          pink: 'var(--sd-color-brand-pink)',
          cyan: 'var(--sd-color-brand-cyan)',
          'bg-tint': 'var(--sd-color-bg-tint)',
          'bg-card': 'var(--sd-color-bg-card)',
        },
      },
      borderRadius: {
        'sd-sm': 'var(--sd-radius-sm)',
        'sd-md': 'var(--sd-radius-md)',
        'sd-lg': 'var(--sd-radius-lg)',
        'sd-xl': 'var(--sd-radius-xl)',
      },
      boxShadow: {
        'sd-card': 'var(--sd-shadow-card)',
        'sd-soft': 'var(--sd-shadow-soft)',
      },
    },
  },
  plugins: [],
} satisfies Config;
