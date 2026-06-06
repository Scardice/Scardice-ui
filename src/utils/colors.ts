/**
 * Hardcoded Tailwind color palette (only the values actually used in the app).
 * This replaces the runtime `resolveConfig(tailwindConfig)` call which pulled
 * the entire 6.2 MB tailwindcss package into the production bundle.
 */
export const twColors = {
  amber: {
    300: '#fcd34d',
  },
  red: {
    600: '#dc2626',
  },
  orange: {
    600: '#ea580c',
  },
  yellow: {
    600: '#ca8a04',
  },
  green: {
    600: '#16a34a',
  },
  cyan: {
    600: '#0891b2',
  },
  blue: {
    600: '#2563eb',
  },
  purple: {
    600: '#9333ea',
  },
  pink: {
    600: '#db2777',
  },
  slate: {
    600: '#475569',
  },
} as const;
