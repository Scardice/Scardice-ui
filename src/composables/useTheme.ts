import { useStorage, useMediaQuery } from '@vueuse/core';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type Theme = 'light' | 'dark';

export const themePreference = useStorage<ThemePreference>('scardice-theme', 'auto');
const systemIsDark = useMediaQuery('(prefers-color-scheme: dark)');

export const currentTheme = computed<Theme>(() => {
  if (themePreference.value === 'auto') {
    return systemIsDark.value ? 'dark' : 'light';
  }
  return themePreference.value;
});

export function setThemePreference(pref: ThemePreference) {
  themePreference.value = pref;
}

export function cycleTheme() {
  const order: ThemePreference[] = ['light', 'dark', 'auto'];
  const idx = order.indexOf(themePreference.value);
  themePreference.value = order[(idx + 1) % order.length];
}

watch(
  currentTheme,
  theme => {
    document.documentElement.dataset.theme = theme;
  },
  { immediate: true },
);
