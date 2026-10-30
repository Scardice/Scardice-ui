import type { UiThemeColors } from '~/utils/ui-beautify';

export type UiThemeMode = 'light' | 'dark';

export interface UiThemeSeed {
  /** OKLCH 色相（0–360），决定主色 */
  accentHue: number;
  /** OKLCH 彩度，主色的鲜艳程度 */
  accentChroma?: number;
  /** 中性色（背景、边框、文字）的色相，默认跟随主色 */
  neutralHue?: number;
  /** 中性色彩度，越大背景越偏向主色调 */
  neutralChroma?: number;
  mode?: UiThemeMode;
}

/** 深色主题中实心按钮上的文字颜色 */
export const DARK_ON_SOLID = '#10141c';
/** 正文与控件文字需要达到的最低对比度（WCAG AA 为 4.5，留一点余量） */
const MIN_TEXT_CONTRAST = 4.6;

const toLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const toGamma = (value: number) =>
  value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;

function oklchToLinearRgb(l: number, c: number, h: number): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ];
}

/** OKLCH 转 #rrggbb；超出 sRGB 色域时降低彩度，保持明度与色相不变。 */
export function oklch(l: number, c: number, h: number): string {
  let chroma = c;
  for (let i = 0; i < 40; i++) {
    const rgb = oklchToLinearRgb(l, chroma, h);
    if (rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4)) {
      return `#${rgb
        .map(v =>
          Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`;
    }
    chroma *= 0.92;
  }
  return oklch(l, 0, h);
}

/** #rrggbb 转 OKLCH，返回 [明度, 彩度, 色相]。 */
export function hexToOklch(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363031944 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [lightness, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
}

export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => toLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 实心色块上的文字颜色：白字可读则用白字，否则用深色。 */
export function onSolidColor(fill: string): string {
  return contrastRatio('#ffffff', fill) >= 4.5 ? '#ffffff' : DARK_ON_SOLID;
}

/** 沿明度方向搜索第一个满足条件的颜色。 */
function fitLightness(
  chroma: number,
  hue: number,
  accept: (color: string) => boolean,
  from: number,
  to: number,
  step: number,
): string {
  for (let l = from; step > 0 ? l <= to : l >= to; l += step) {
    const color = oklch(l, chroma, hue);
    if (accept(color)) return color;
  }
  return oklch(to, chroma, hue);
}

/**
 * 由主色色相与中性色生成完整主题。
 * 所有中性色按固定的感知明度阶梯取值，主色与状态色的明度由对比度要求反推：
 * 浅色主题保证白字可读且可作链接色，深色主题保证深色文字可读且在面板上可读。
 */
export function buildUiTheme(seed: UiThemeSeed): UiThemeColors {
  const accentHue = seed.accentHue;
  const accentChroma = seed.accentChroma ?? 0.15;
  const neutralHue = seed.neutralHue ?? accentHue;
  const neutralChroma = seed.neutralChroma ?? 0.012;
  const n = (l: number, k = 1) => oklch(l, neutralChroma * k, neutralHue);
  const navActive = oklch(0.81, Math.min(accentChroma, 0.11), accentHue);

  if (seed.mode === 'dark') {
    const panel = n(0.225, 1.6);
    const fill = (hue: number, chroma: number) =>
      fitLightness(
        chroma,
        hue,
        color =>
          contrastRatio(color, panel) >= MIN_TEXT_CONTRAST + 0.4 &&
          contrastRatio(color, DARK_ON_SOLID) >= MIN_TEXT_CONTRAST + 0.4,
        0.6,
        0.92,
        0.005,
      );
    return {
      primary: fill(accentHue, Math.min(accentChroma, 0.14)),
      success: fill(150, 0.14),
      warning: fill(70, 0.14),
      danger: fill(25, 0.15),
      info: n(0.72, 1.2),
      nav: n(0.15, 1.6),
      navHover: n(0.21, 1.8),
      navActive,
      page: n(0.18, 1.6),
      panel,
      surface: n(0.245, 1.6),
      surfaceSoft: n(0.205, 1.6),
      surfaceMuted: n(0.285, 1.6),
      input: n(0.2, 1.6),
      border: n(0.38, 1.6),
      borderLight: n(0.31, 1.6),
      text: n(0.94, 0.8),
      textRegular: n(0.84, 1),
      textSecondary: n(0.72, 1.2),
      textMuted: n(0.58, 1.2),
      codeBg: oklch(0.21, 0.03, accentHue),
      tableHeader: n(0.205, 1.6),
    };
  }

  const panel = n(0.995, 0.3);
  const fill = (hue: number, chroma: number) =>
    fitLightness(
      chroma,
      hue,
      color =>
        contrastRatio('#ffffff', color) >= MIN_TEXT_CONTRAST &&
        contrastRatio(color, panel) >= MIN_TEXT_CONTRAST,
      0.72,
      0.3,
      -0.005,
    );
  return {
    primary: fill(accentHue, accentChroma),
    success: fill(150, 0.15),
    warning: fill(60, 0.15),
    danger: fill(27, 0.19),
    info: n(0.52, 1.5),
    nav: n(0.255, 2.2),
    navHover: n(0.32, 2.2),
    navActive,
    page: n(0.972, 0.8),
    panel,
    surface: panel,
    surfaceSoft: n(0.962, 0.8),
    surfaceMuted: n(0.93, 1),
    input: panel,
    border: n(0.86, 1.2),
    borderLight: n(0.918, 1),
    text: n(0.24, 2),
    textRegular: n(0.38, 1.8),
    textSecondary: n(0.52, 1.5),
    textMuted: n(0.68, 1.2),
    codeBg: oklch(0.955, 0.025, accentHue),
    tableHeader: n(0.962, 0.8),
  };
}

/** 由任意主色生成主题：保留色相与彩度，明度按对比度要求自动校正。 */
export function buildUiThemeFromColor(hex: string, mode: UiThemeMode): UiThemeColors {
  const [, chroma, hue] = hexToOklch(hex);
  return buildUiTheme({
    accentHue: hue,
    accentChroma: Math.min(Math.max(chroma, 0.02), 0.2),
    neutralChroma: chroma < 0.04 ? 0.006 : 0.012,
    mode,
  });
}
