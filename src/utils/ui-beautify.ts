import { testWebUIBypass } from '~/utils/test-webui-bypass';
import {
  buildUiTheme,
  buildUiThemeFromColor,
  onSolidColor,
  type UiThemeMode,
} from '~/utils/theme-palette';
export type UiThemeId =
  | 'classic'
  | 'mint'
  | 'purple'
  | 'pink'
  | 'amberBrown'
  | 'gray'
  | 'dark'
  | 'starry'
  | 'deepSea'
  | 'custom';
export type UiFontId = 'default' | 'noto' | 'lxgw' | 'sourceHan' | 'systemSerif' | 'mono';
export type UiBackgroundFit = 'cover' | 'contain' | 'stretch' | 'auto';
export type UiBackgroundCropMode = 'background' | 'free';
export type UiBackgroundMaskPreset = 'none' | 'soft' | 'vignette' | 'focus' | 'ink';
export type UiBackgroundPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'leftTop'
  | 'rightTop'
  | 'leftBottom'
  | 'rightBottom';

export interface UiThemeColors {
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  nav: string;
  navHover: string;
  navActive: string;
  page: string;
  panel: string;
  surface: string;
  surfaceSoft: string;
  surfaceMuted: string;
  input: string;
  border: string;
  borderLight: string;
  text: string;
  textRegular: string;
  textSecondary: string;
  textMuted: string;
  codeBg: string;
  tableHeader: string;
}

export type UiThemeColorKey = keyof UiThemeColors;

export interface UiBeautifyConfig {
  themeId: UiThemeId;
  fontId: UiFontId;
  customColors: UiThemeColors;
  /** 自定义主题的基准主色与明暗模式；其余颜色由它们生成 */
  customAccent?: string;
  customMode?: UiThemeMode;
  backgroundEnabled: boolean;
  backgroundPath: string;
  backgroundFit: UiBackgroundFit;
  backgroundBlur: number;
  backgroundDim: number;
  backgroundImageOpacity: number;
  cardOpacity: number;
  backgroundMaskPreset: UiBackgroundMaskPreset;
  backgroundPosition: UiBackgroundPosition;
  backgroundOpacity?: number;
  backgroundCropPath?: string;
  backgroundCropMode?: UiBackgroundCropMode;
}

export interface UiThemeOption {
  id: UiThemeId;
  name: string;
  description: string;
  mode: UiThemeMode;
  colors: UiThemeColors;
}

export interface UiFontOption {
  id: UiFontId;
  name: string;
  family: string;
}

const classicColors = buildUiTheme({ accentHue: 255, accentChroma: 0.17 });

export const defaultCustomUiThemeColors: UiThemeColors = classicColors;

export const defaultUiBeautifyConfig: UiBeautifyConfig = {
  themeId: 'classic',
  fontId: 'default',
  customColors: defaultCustomUiThemeColors,
  customAccent: classicColors.primary,
  customMode: 'light',
  backgroundEnabled: false,
  backgroundPath: '',
  backgroundFit: 'cover',
  backgroundBlur: 0,
  backgroundDim: 0,
  backgroundImageOpacity: 80,
  cardOpacity: 100,
  backgroundMaskPreset: 'none',
  backgroundPosition: 'center',
  backgroundCropPath: '',
  backgroundCropMode: 'background',
};

export const uiThemeOptions: UiThemeOption[] = [
  {
    id: 'classic',
    name: '经典蓝',
    description: '冷静的蓝色，默认主题',
    mode: 'light',
    colors: classicColors,
  },
  {
    id: 'mint',
    name: '青碧',
    description: '清爽的青绿色',
    mode: 'light',
    colors: buildUiTheme({ accentHue: 190, accentChroma: 0.12, neutralHue: 210 }),
  },
  {
    id: 'purple',
    name: '藤紫',
    description: '柔和的紫色',
    mode: 'light',
    colors: buildUiTheme({ accentHue: 295, accentChroma: 0.17, neutralHue: 290 }),
  },
  {
    id: 'pink',
    name: '樱粉',
    description: '温柔的玫瑰粉',
    mode: 'light',
    colors: buildUiTheme({
      accentHue: 355,
      accentChroma: 0.17,
      neutralHue: 350,
      neutralChroma: 0.01,
    }),
  },
  {
    id: 'amberBrown',
    name: '琥珀',
    description: '温暖的琥珀棕，背景微暖',
    mode: 'light',
    colors: buildUiTheme({ accentHue: 55, accentChroma: 0.13, neutralHue: 70 }),
  },
  {
    id: 'gray',
    name: '石墨',
    description: '低饱和蓝灰，几乎无彩色',
    mode: 'light',
    colors: buildUiTheme({ accentHue: 250, accentChroma: 0.07, neutralChroma: 0.006 }),
  },
  {
    id: 'dark',
    name: '夜航',
    description: '深色背景配蓝色',
    mode: 'dark',
    colors: buildUiTheme({ accentHue: 255, accentChroma: 0.14, mode: 'dark' }),
  },
  {
    id: 'starry',
    name: '星夜',
    description: '深色背景配紫色',
    mode: 'dark',
    colors: buildUiTheme({ accentHue: 295, accentChroma: 0.14, neutralHue: 290, mode: 'dark' }),
  },
  {
    id: 'deepSea',
    name: '深海',
    description: '深色背景配青色',
    mode: 'dark',
    colors: buildUiTheme({ accentHue: 205, accentChroma: 0.11, neutralHue: 220, mode: 'dark' }),
  },
];

/** 已下线的旧主题映射到最接近的新主题，避免老用户的设置失效。 */
const legacyThemeAliases: Record<string, UiThemeId> = {
  blueWhite: 'classic',
  sandGold: 'amberBrown',
  khaki: 'amberBrown',
  rose: 'pink',
};

export const uiFontOptions: UiFontOption[] = [
  {
    id: 'default',
    name: '默认字体',
    family:
      "'PingFang SC', 'Helvetica Neue', 'Hiragino Sans GB', 'Segoe UI', 'Microsoft YaHei', '微软雅黑', sans-serif",
  },
  {
    id: 'noto',
    name: 'Noto Sans',
    family: "'Noto Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif",
  },
  {
    id: 'lxgw',
    name: '霞鹜文楷',
    family: "'LXGW WenKai', '霞鹜文楷', 'KaiTi', 'Microsoft YaHei', sans-serif",
  },
  {
    id: 'sourceHan',
    name: '思源黑体',
    family: "'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', sans-serif",
  },
  {
    id: 'systemSerif',
    name: '系统宋体',
    family: "'Songti SC', 'SimSun', 'Noto Serif SC', serif",
  },
  {
    id: 'mono',
    name: '等宽字体',
    family: "'JetBrains Mono', 'Cascadia Code', 'Consolas', 'Microsoft YaHei', monospace",
  },
];

export const uiBackgroundFitOptions: Array<{ label: string; value: UiBackgroundFit }> = [
  { label: '填充', value: 'cover' },
  { label: '适应', value: 'contain' },
  { label: '拉伸', value: 'stretch' },
  { label: '不适应', value: 'auto' },
];

export const uiBackgroundCropModeOptions: Array<{ label: string; value: UiBackgroundCropMode }> = [
  { label: '背景比例', value: 'background' },
  { label: '自由剪裁', value: 'free' },
];

export const uiBackgroundMaskOptions: Array<{ label: string; value: UiBackgroundMaskPreset }> = [
  { label: '无', value: 'none' },
  { label: '柔光', value: 'soft' },
  { label: '暗角', value: 'vignette' },
  { label: '聚焦', value: 'focus' },
  { label: '墨色', value: 'ink' },
];

export const uiBackgroundPositionOptions: Array<{ label: string; value: UiBackgroundPosition }> = [
  { label: '居中', value: 'center' },
  { label: '顶部', value: 'top' },
  { label: '底部', value: 'bottom' },
  { label: '左侧', value: 'left' },
  { label: '右侧', value: 'right' },
  { label: '左上', value: 'leftTop' },
  { label: '右上', value: 'rightTop' },
  { label: '左下', value: 'leftBottom' },
  { label: '右下', value: 'rightBottom' },
];

export const useUiBeautifyConfig = () => {
  const config = useStorage<UiBeautifyConfig>(
    'seal-ui-beautify-config',
    defaultUiBeautifyConfig,
    localStorage,
    { mergeDefaults: true },
  );
  const migrated = legacyThemeAliases[config.value.themeId as string];
  if (migrated) config.value.themeId = migrated;
  return config;
};

const colorKeys: UiThemeColorKey[] = [
  'primary',
  'success',
  'warning',
  'danger',
  'info',
  'nav',
  'navHover',
  'navActive',
  'page',
  'panel',
  'surface',
  'surfaceSoft',
  'surfaceMuted',
  'input',
  'border',
  'borderLight',
  'text',
  'textRegular',
  'textSecondary',
  'textMuted',
  'codeBg',
  'tableHeader',
];

const clampColorChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const channelToHex = (value: number) => clampColorChannel(value).toString(16).padStart(2, '0');

export const normalizeColorInput = (value: string) => {
  const raw = value.trim();
  const hex = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const body = hex[1];
    const normalized =
      body.length === 3
        ? body
            .split('')
            .map(item => item + item)
            .join('')
        : body;
    return `#${normalized.toLowerCase()}`;
  }

  const rgb = raw.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  const rgbBare = raw.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  const match = rgb || rgbBare;
  if (!match) {
    return null;
  }
  const channels = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (channels.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    return null;
  }
  return `#${channels.map(channelToHex).join('')}`;
};

const sanitizeThemeColors = (
  colors: Partial<UiThemeColors> | undefined,
  fallback: UiThemeColors,
): UiThemeColors => {
  const next = { ...fallback };
  for (const key of colorKeys) {
    const normalized = normalizeColorInput(String(colors?.[key] ?? ''));
    next[key] = normalized || fallback[key];
  }
  return next;
};

export const getUiThemeColors = (config: Partial<UiBeautifyConfig>) => {
  if (config.themeId === 'custom') {
    return sanitizeThemeColors(config.customColors, defaultCustomUiThemeColors);
  }
  const id = legacyThemeAliases[config.themeId as string] ?? config.themeId;
  return uiThemeOptions.find(item => item.id === id)?.colors || classicColors;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeColorInput(hex) || '#000000';
  const num = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const mix = (hex: string, target: string, weight: number) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const ratio = weight / 100;
  const value = (channelA: number, channelB: number) =>
    channelToHex(channelA * (1 - ratio) + channelB * ratio);
  return `#${value(a.r, b.r)}${value(a.g, b.g)}${value(a.b, b.b)}`;
};

const getLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const next = value / 255;
    return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const isDarkThemeColors = (colors: UiThemeColors) => getLuminance(colors.page) < 0.28;

const backgroundPositionMap: Record<UiBackgroundPosition, string> = {
  center: 'center',
  top: 'center top',
  bottom: 'center bottom',
  left: 'left center',
  right: 'right center',
  leftTop: 'left top',
  rightTop: 'right top',
  leftBottom: 'left bottom',
  rightBottom: 'right bottom',
};

export const deriveThemeFromPrimary = (value: string, mode: UiThemeMode = 'light'): UiThemeColors =>
  buildUiThemeFromColor(normalizeColorInput(value) || classicColors.primary, mode);

const setColorScale = (root: HTMLElement, name: string, color: string, surface: string) => {
  root.style.setProperty(`--el-color-${name}`, color);
  for (const step of [3, 5, 7, 8, 9]) {
    root.style.setProperty(`--el-color-${name}-light-${step}`, mix(color, surface, step * 10));
  }
  root.style.setProperty(`--el-color-${name}-dark-2`, mix(color, '#000000', 20));
};

const setRootVar = (root: HTMLElement, name: string, value: string) => {
  root.style.setProperty(name, value);
};

const getOpacity = (value: number | undefined, fallback: number) => {
  const next = Number(value ?? fallback);
  if (!Number.isFinite(next)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, next));
};

const toRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getBackgroundMask = (preset: UiBackgroundMaskPreset | undefined, dim: number) => {
  const dimLayer = `linear-gradient(rgba(0, 0, 0, ${dim}), rgba(0, 0, 0, ${dim}))`;
  switch (preset) {
    case 'soft':
      return `${dimLayer}, linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.02))`;
    case 'vignette':
      return `${dimLayer}, radial-gradient(circle at center, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.28) 100%)`;
    case 'focus':
      return `${dimLayer}, radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.24) 72%)`;
    case 'ink':
      return `${dimLayer}, linear-gradient(135deg, rgba(4, 8, 16, 0.36), rgba(4, 8, 16, 0.12))`;
    case 'none':
    default:
      return dimLayer;
  }
};

const getBackgroundSize = (fit: UiBackgroundFit | undefined) => {
  if (fit === 'stretch') {
    return '100% 100%';
  }
  if (fit === 'auto') {
    return 'auto';
  }
  return fit || 'cover';
};

const getResourceDataPath = (path: string) => {
  const token =
    !testWebUIBypass.skipStoredToken && typeof localStorage !== 'undefined'
      ? (localStorage.getItem('t') ?? '').trim()
      : '';
  const params = new URLSearchParams({ path });
  if (token) {
    params.set('token', token);
  }
  return `/sd-api/resource/data?${params.toString()}`;
};

export const normalizeBackgroundPath = (path: string) => {
  const trimmed = path.trim().replace(/\\/g, '/');
  if (!trimmed) {
    return '';
  }
  const dataImage = trimmed.match(/^\/?data\/images\/(.+)$/i);
  if (dataImage) {
    return getResourceDataPath(`data/images/${dataImage[1].replace(/^\/+/, '')}`);
  }
  const sdDataImage = trimmed.match(/^\/?sd-data\/images\/(.+)$/i);
  if (sdDataImage) {
    return getResourceDataPath(`data/images/${sdDataImage[1].replace(/^\/+/, '')}`);
  }
  if (/^(https?:|data:|blob:|\/|\.\/|\.\.\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\/+/, '')}`;
};

const toCssUrl = (path: string) => `url("${path.replace(/"/g, '\\"')}")`;

export const applyUiBeautifyConfig = (config: Partial<UiBeautifyConfig>) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  const colors = getUiThemeColors(config);
  const font = uiFontOptions.find(item => item.id === config.fontId) || uiFontOptions[0];
  const isDark = isDarkThemeColors(colors);
  const imageOpacity = getOpacity(config.backgroundImageOpacity ?? config.backgroundOpacity, 80);
  const cardOpacity = getOpacity(config.cardOpacity, 100);
  const cardAlpha = cardOpacity / 100;
  const backgroundDim = Math.max(0, Math.min(0.8, (config.backgroundDim ?? 0) / 100));
  const backgroundCropMode = config.backgroundCropMode || 'background';
  const backgroundPosition =
    backgroundCropMode === 'free'
      ? backgroundPositionMap[config.backgroundPosition || 'center'] || backgroundPositionMap.center
      : backgroundPositionMap.center;

  setColorScale(root, 'primary', colors.primary, colors.surface);
  setColorScale(root, 'success', colors.success, colors.surface);
  setColorScale(root, 'warning', colors.warning, colors.surface);
  setColorScale(root, 'danger', colors.danger, colors.surface);
  setColorScale(root, 'info', colors.info, colors.surface);

  for (const name of ['primary', 'success', 'warning', 'danger'] as const) {
    setRootVar(root, `--seal-on-${name}`, onSolidColor(colors[name]));
  }
  setRootVar(root, '--seal-nav-bg', colors.nav);
  setRootVar(root, '--seal-nav-hover-bg', colors.navHover);
  setRootVar(root, '--seal-nav-active', colors.navActive);
  setRootVar(root, '--seal-page-bg', colors.page);
  setRootVar(root, '--seal-panel-bg-base', colors.panel);
  setRootVar(root, '--seal-surface-bg-base', colors.surface);
  setRootVar(root, '--seal-surface-soft-base', colors.surfaceSoft);
  setRootVar(root, '--seal-surface-muted-base', colors.surfaceMuted);
  setRootVar(root, '--seal-input-bg-base', colors.input);
  setRootVar(root, '--seal-panel-bg', toRgba(colors.panel, cardAlpha));
  setRootVar(root, '--seal-surface-bg', toRgba(colors.surface, cardAlpha));
  setRootVar(root, '--seal-surface-soft', toRgba(colors.surfaceSoft, cardAlpha));
  setRootVar(root, '--seal-surface-muted', toRgba(colors.surfaceMuted, cardAlpha));
  setRootVar(root, '--seal-input-bg', toRgba(colors.input, cardAlpha));
  setRootVar(root, '--seal-border-color', colors.border);
  setRootVar(root, '--seal-border-color-light', colors.borderLight);
  setRootVar(root, '--seal-text-color', colors.text);
  setRootVar(root, '--seal-text-regular', colors.textRegular);
  setRootVar(root, '--seal-text-secondary', colors.textSecondary);
  setRootVar(root, '--seal-text-muted', colors.textMuted);
  setRootVar(root, '--seal-code-bg', colors.codeBg);
  setRootVar(root, '--seal-table-header-bg', colors.tableHeader);
  setRootVar(root, '--seal-scrollbar-track', colors.surfaceSoft);
  setRootVar(root, '--seal-scrollbar-thumb', colors.border);
  setRootVar(root, '--seal-scrollbar-thumb-hover', colors.textMuted);
  setRootVar(root, '--seal-font-family', font.family);

  setRootVar(root, '--el-bg-color', colors.panel);
  setRootVar(root, '--el-bg-color-page', colors.page);
  setRootVar(root, '--el-bg-color-overlay', colors.surface);
  setRootVar(root, '--el-fill-color-blank', colors.panel);
  setRootVar(root, '--el-fill-color-extra-light', colors.surfaceSoft);
  setRootVar(root, '--el-fill-color-lighter', colors.surfaceSoft);
  setRootVar(root, '--el-fill-color-light', colors.surfaceMuted);
  setRootVar(root, '--el-fill-color', colors.surfaceMuted);
  setRootVar(root, '--el-fill-color-dark', mix(colors.surfaceMuted, colors.text, 14));
  setRootVar(root, '--el-fill-color-darker', mix(colors.surfaceMuted, colors.text, 24));
  setRootVar(root, '--el-border-color', colors.border);
  setRootVar(root, '--el-border-color-light', colors.borderLight);
  setRootVar(root, '--el-border-color-lighter', colors.borderLight);
  setRootVar(root, '--el-border-color-extra-light', mix(colors.borderLight, colors.panel, 45));
  setRootVar(root, '--el-border-color-dark', mix(colors.border, colors.text, 14));
  setRootVar(root, '--el-border-color-darker', mix(colors.border, colors.text, 24));
  setRootVar(root, '--el-border-color-hover', isDark ? colors.textMuted : colors.textSecondary);
  setRootVar(root, '--el-border', `1px solid ${colors.border}`);
  setRootVar(root, '--el-text-color-primary', colors.text);
  setRootVar(root, '--el-text-color-regular', colors.textRegular);
  setRootVar(root, '--el-text-color-secondary', colors.textSecondary);
  setRootVar(root, '--el-text-color-placeholder', colors.textMuted);
  setRootVar(root, '--el-text-color-disabled', colors.textMuted);
  setRootVar(root, '--el-disabled-bg-color', colors.surfaceSoft);
  setRootVar(root, '--el-disabled-text-color', colors.textMuted);
  setRootVar(root, '--el-disabled-border-color', colors.borderLight);
  setRootVar(root, '--el-overlay-color', isDark ? 'rgba(0, 0, 0, 0.82)' : 'rgba(0, 0, 0, 0.72)');
  setRootVar(
    root,
    '--el-overlay-color-light',
    isDark ? 'rgba(0, 0, 0, 0.68)' : 'rgba(0, 0, 0, 0.52)',
  );
  setRootVar(
    root,
    '--el-overlay-color-lighter',
    isDark ? 'rgba(0, 0, 0, 0.48)' : 'rgba(0, 0, 0, 0.32)',
  );
  setRootVar(root, '--el-popper-border-radius', '4px');
  setRootVar(root, '--el-popover-bg-color', colors.surface);
  setRootVar(root, '--el-popover-border-color', colors.borderLight);
  setRootVar(root, '--el-popover-title-text-color', colors.text);
  setRootVar(root, '--el-table-header-bg-color', colors.tableHeader);
  setRootVar(root, '--el-table-header-text-color', colors.text);
  setRootVar(root, '--el-table-bg-color', colors.panel);
  setRootVar(root, '--el-table-tr-bg-color', colors.panel);
  setRootVar(root, '--el-table-row-hover-bg-color', colors.surfaceSoft);
  setRootVar(root, '--el-table-border-color', colors.borderLight);
  setRootVar(root, '--el-table-text-color', colors.textRegular);
  setRootVar(
    root,
    '--el-mask-color',
    isDark ? 'rgba(5, 10, 20, 0.72)' : 'rgba(255, 255, 255, 0.78)',
  );
  setRootVar(
    root,
    '--el-mask-color-extra-light',
    isDark ? 'rgba(5, 10, 20, 0.36)' : 'rgba(255, 255, 255, 0.3)',
  );
  setRootVar(
    root,
    '--el-box-shadow-light',
    isDark ? '0 8px 22px rgba(0, 0, 0, 0.24)' : '0 8px 22px rgba(15, 23, 42, 0.08)',
  );
  setRootVar(
    root,
    '--el-box-shadow',
    isDark
      ? '0 12px 32px rgba(0, 0, 0, 0.34), 0 8px 20px rgba(0, 0, 0, 0.26)'
      : '0 12px 32px rgba(15, 23, 42, 0.08), 0 8px 20px rgba(15, 23, 42, 0.06)',
  );
  setRootVar(
    root,
    '--el-box-shadow-lighter',
    isDark ? '0 0 8px rgba(0, 0, 0, 0.28)' : '0 0 8px rgba(15, 23, 42, 0.08)',
  );
  setRootVar(
    root,
    '--el-box-shadow-dark',
    isDark
      ? '0 16px 48px rgba(0, 0, 0, 0.42), 0 12px 32px rgba(0, 0, 0, 0.34)'
      : '0 16px 48px rgba(15, 23, 42, 0.12), 0 12px 32px rgba(15, 23, 42, 0.1)',
  );

  setRootVar(
    root,
    '--seal-bg-image',
    config.backgroundEnabled && (config.backgroundCropPath || config.backgroundPath)
      ? toCssUrl(normalizeBackgroundPath(config.backgroundCropPath || config.backgroundPath || ''))
      : 'none',
  );
  setRootVar(root, '--seal-bg-size', getBackgroundSize(config.backgroundFit));
  setRootVar(root, '--seal-bg-blur', `${config.backgroundBlur ?? 0}px`);
  setRootVar(root, '--seal-bg-dim', `${backgroundDim}`);
  setRootVar(root, '--seal-bg-mask', getBackgroundMask(config.backgroundMaskPreset, backgroundDim));
  setRootVar(root, '--seal-bg-position', backgroundPosition);
  setRootVar(root, '--seal-bg-crop-mode', backgroundCropMode);
  setRootVar(root, '--seal-bg-opacity', `${imageOpacity / 100}`);
  setRootVar(root, '--seal-card-opacity', `${cardAlpha}`);
  root.dataset.sealTheme = config.themeId || 'classic';
  root.style.colorScheme = isDark ? 'dark' : 'light';
};
