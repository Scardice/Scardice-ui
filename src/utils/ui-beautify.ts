export type UiThemeId =
  | 'classic'
  | 'pink'
  | 'gray'
  | 'dark'
  | 'purple'
  | 'blueWhite'
  | 'mint'
  | 'sandGold'
  | 'starry'
  | 'deepSea'
  | 'rose'
  | 'amberBrown'
  | 'khaki'
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
  colors: UiThemeColors;
}

export interface UiFontOption {
  id: UiFontId;
  name: string;
  family: string;
}

const classicColors: UiThemeColors = {
  primary: '#409eff',
  success: '#21ba45',
  warning: '#f2711c',
  danger: '#db2828',
  info: '#42b8dd',
  nav: '#545c64',
  navHover: '#434a50',
  navActive: '#fcd34d',
  page: '#f3f4f6',
  panel: '#ffffff',
  surface: '#ffffff',
  surfaceSoft: '#f3f5f7',
  surfaceMuted: '#e9eef5',
  input: '#ffffff',
  border: '#dcdfe6',
  borderLight: '#ebeef5',
  text: '#2c3e50',
  textRegular: '#606266',
  textSecondary: '#74787f',
  textMuted: '#a8abb2',
  codeBg: '#ecf5ff',
  tableHeader: '#f3f5f7',
};

export const defaultCustomUiThemeColors: UiThemeColors = {
  primary: '#2f73f6',
  success: '#21ba45',
  warning: '#f2711c',
  danger: '#db2828',
  info: '#42b8dd',
  nav: '#42526a',
  navHover: '#4f6078',
  navActive: '#fcd34d',
  page: '#f2f5f9',
  panel: '#ffffff',
  surface: '#ffffff',
  surfaceSoft: '#eef3f8',
  surfaceMuted: '#e3ebf5',
  input: '#ffffff',
  border: '#d5deea',
  borderLight: '#e5ebf3',
  text: '#213047',
  textRegular: '#4b5b72',
  textSecondary: '#6f7f95',
  textMuted: '#94a3b8',
  codeBg: '#e9f2ff',
  tableHeader: '#edf3fa',
};

export const defaultUiBeautifyConfig: UiBeautifyConfig = {
  themeId: 'classic',
  fontId: 'default',
  customColors: defaultCustomUiThemeColors,
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
    name: '原本配色',
    colors: classicColors,
  },
  {
    id: 'pink',
    name: '樱粉',
    colors: {
      primary: '#e84d8a',
      success: '#25a863',
      warning: '#f59e0b',
      danger: '#e5484d',
      info: '#4aa3df',
      nav: '#6b3f57',
      navHover: '#7d4d68',
      navActive: '#ffd166',
      page: '#fff4f8',
      panel: '#ffffff',
      surface: '#fffafd',
      surfaceSoft: '#fff7fb',
      surfaceMuted: '#fdeaf2',
      input: '#ffffff',
      border: '#efc7d8',
      borderLight: '#f6dbe7',
      text: '#3e2534',
      textRegular: '#684657',
      textSecondary: '#926b7c',
      textMuted: '#b48a9e',
      codeBg: '#ffe5f0',
      tableHeader: '#fdeaf2',
    },
  },
  {
    id: 'gray',
    name: '雾灰',
    colors: {
      primary: '#5b728f',
      success: '#2f9e72',
      warning: '#c9792b',
      danger: '#c94d4d',
      info: '#4a98b5',
      nav: '#454b54',
      navHover: '#555d68',
      navActive: '#f2c94c',
      page: '#f2f3f5',
      panel: '#ffffff',
      surface: '#fbfbfc',
      surfaceSoft: '#f6f7f9',
      surfaceMuted: '#e9ecef',
      input: '#ffffff',
      border: '#ccd2d9',
      borderLight: '#dde2e8',
      text: '#272b30',
      textRegular: '#4d5660',
      textSecondary: '#747e89',
      textMuted: '#9aa3ad',
      codeBg: '#e7edf4',
      tableHeader: '#e9ecef',
    },
  },
  {
    id: 'dark',
    name: '夜航',
    colors: {
      primary: '#6ca8ff',
      success: '#3dd68c',
      warning: '#f9b44c',
      danger: '#ff6b7a',
      info: '#5fd4e8',
      nav: '#111827',
      navHover: '#1f2937',
      navActive: '#facc15',
      page: '#151b24',
      panel: '#303b50',
      surface: '#273244',
      surfaceSoft: '#202938',
      surfaceMuted: '#3a465a',
      input: '#273244',
      border: '#65758c',
      borderLight: '#53647b',
      text: '#e6edf7',
      textRegular: '#cbd5e1',
      textSecondary: '#9fb0c6',
      textMuted: '#8090a8',
      codeBg: '#142033',
      tableHeader: '#22314b',
    },
  },
  {
    id: 'purple',
    name: '藤紫',
    colors: {
      primary: '#8064d9',
      success: '#20a67a',
      warning: '#e29b31',
      danger: '#e14f6a',
      info: '#5b9adf',
      nav: '#4d456f',
      navHover: '#5f5485',
      navActive: '#f6d365',
      page: '#f6f3ff',
      panel: '#ffffff',
      surface: '#fffaff',
      surfaceSoft: '#faf7ff',
      surfaceMuted: '#e6def8',
      input: '#ffffff',
      border: '#d5c9ef',
      borderLight: '#e7def8',
      text: '#302b45',
      textRegular: '#5a5271',
      textSecondary: '#7f7498',
      textMuted: '#a096b8',
      codeBg: '#eee8ff',
      tableHeader: '#ece6fb',
    },
  },
  {
    id: 'blueWhite',
    name: '蓝白',
    colors: {
      primary: '#2563eb',
      success: '#0f9f6e',
      warning: '#d9841f',
      danger: '#dc3e64',
      info: '#0ea5c6',
      nav: '#2f5f9c',
      navHover: '#3b70b2',
      navActive: '#fcd34d',
      page: '#eef6ff',
      panel: '#ffffff',
      surface: '#fbfdff',
      surfaceSoft: '#f3f9ff',
      surfaceMuted: '#e1efff',
      input: '#ffffff',
      border: '#c5d8ee',
      borderLight: '#d9e8f8',
      text: '#1d2f4c',
      textRegular: '#45617f',
      textSecondary: '#6a829c',
      textMuted: '#91a4bb',
      codeBg: '#e2efff',
      tableHeader: '#e1efff',
    },
  },
  {
    id: 'mint',
    name: '浅绿',
    colors: {
      primary: '#14a99a',
      success: '#2aa857',
      warning: '#c98a16',
      danger: '#de4d4d',
      info: '#318fb5',
      nav: '#2f6f66',
      navHover: '#3d8177',
      navActive: '#f5d56b',
      page: '#effaf4',
      panel: '#ffffff',
      surface: '#fbfffd',
      surfaceSoft: '#f3fbf7',
      surfaceMuted: '#e1f4ea',
      input: '#ffffff',
      border: '#bddbcf',
      borderLight: '#d5eadf',
      text: '#18332d',
      textRegular: '#3f6158',
      textSecondary: '#66867c',
      textMuted: '#8da9a0',
      codeBg: '#dff6ef',
      tableHeader: '#e1f4ea',
    },
  },
  {
    id: 'sandGold',
    name: '砂金',
    colors: {
      primary: '#d4a017',
      success: '#2f9f6f',
      warning: '#f2b84b',
      danger: '#c8574d',
      info: '#2f9c95',
      nav: '#3f4a2f',
      navHover: '#50613a',
      navActive: '#f5cf5b',
      page: '#f7f3dc',
      panel: '#fffefa',
      surface: '#fffdf0',
      surfaceSoft: '#fbf6dc',
      surfaceMuted: '#eee7bd',
      input: '#fffefa',
      border: '#cfc174',
      borderLight: '#e6dca9',
      text: '#2f301d',
      textRegular: '#586034',
      textSecondary: '#777b4b',
      textMuted: '#969662',
      codeBg: '#f3e7a5',
      tableHeader: '#eee7bd',
    },
  },
  {
    id: 'starry',
    name: '星空',
    colors: {
      primary: '#a78bfa',
      success: '#5ee6b3',
      warning: '#f7c66a',
      danger: '#ff78a6',
      info: '#c084fc',
      nav: '#24143f',
      navHover: '#33205d',
      navActive: '#fde68a',
      page: '#160d2a',
      panel: '#3c2864',
      surface: '#30204f',
      surfaceSoft: '#25183f',
      surfaceMuted: '#4a3474',
      input: '#30204f',
      border: '#8b72bf',
      borderLight: '#71599f',
      text: '#f3ebff',
      textRegular: '#ddd0f6',
      textSecondary: '#bda8e6',
      textMuted: '#9b85c2',
      codeBg: '#21133d',
      tableHeader: '#2b1d50',
    },
  },
  {
    id: 'deepSea',
    name: '深海',
    colors: {
      primary: '#2dd4bf',
      success: '#42d392',
      warning: '#f3b64d',
      danger: '#ff6b7a',
      info: '#38bdf8',
      nav: '#092236',
      navHover: '#0d314d',
      navActive: '#f8d36a',
      page: '#071923',
      panel: '#1b465b',
      surface: '#15384a',
      surfaceSoft: '#102b3a',
      surfaceMuted: '#24546a',
      input: '#15384a',
      border: '#4d8fa4',
      borderLight: '#37748a',
      text: '#e4f7fb',
      textRegular: '#bddce4',
      textSecondary: '#91bdca',
      textMuted: '#6f9dac',
      codeBg: '#0d2e43',
      tableHeader: '#10354d',
    },
  },
  {
    id: 'rose',
    name: '玫红',
    colors: {
      primary: '#c0185b',
      success: '#0f8f79',
      warning: '#c47b16',
      danger: '#9f1239',
      info: '#1d8394',
      nav: '#4a0f2e',
      navHover: '#64123f',
      navActive: '#f8c350',
      page: '#f3e8ea',
      panel: '#fffdfb',
      surface: '#fbf1f1',
      surfaceSoft: '#f7e7e8',
      surfaceMuted: '#e7c8cf',
      input: '#fffdfb',
      border: '#bd8897',
      borderLight: '#dec1c9',
      text: '#2f0d1f',
      textRegular: '#593040',
      textSecondary: '#785260',
      textMuted: '#987581',
      codeBg: '#ecd1d8',
      tableHeader: '#e7c8cf',
    },
  },
  {
    id: 'amberBrown',
    name: '琥珀棕',
    colors: {
      primary: '#b96f23',
      success: '#4f8f4d',
      warning: '#d1912c',
      danger: '#bf5848',
      info: '#4f8fb0',
      nav: '#4b3324',
      navHover: '#5f422f',
      navActive: '#f0bd58',
      page: '#f3ede5',
      panel: '#fffaf4',
      surface: '#fff5ea',
      surfaceSoft: '#f8ecdd',
      surfaceMuted: '#ead8c4',
      input: '#fffaf4',
      border: '#cdb49a',
      borderLight: '#e4d2bf',
      text: '#312217',
      textRegular: '#5a4030',
      textSecondary: '#7d604c',
      textMuted: '#9c8069',
      codeBg: '#efdcc4',
      tableHeader: '#ead8c4',
    },
  },
  {
    id: 'khaki',
    name: '卡其色',
    colors: {
      primary: '#a9965b',
      success: '#6aa978',
      warning: '#d1a652',
      danger: '#c8796e',
      info: '#78a8b8',
      nav: '#746d54',
      navHover: '#837b61',
      navActive: '#f3da84',
      page: '#f7f5ec',
      panel: '#fffefa',
      surface: '#fffdf5',
      surfaceSoft: '#fbf8ec',
      surfaceMuted: '#eee8d1',
      input: '#fffefa',
      border: '#d6cdae',
      borderLight: '#e8e0ca',
      text: '#373426',
      textRegular: '#665f49',
      textSecondary: '#867e63',
      textMuted: '#a69d81',
      codeBg: '#f0e8cd',
      tableHeader: '#eee8d1',
    },
  },
  {
    id: 'custom',
    name: '自定义配色',
    colors: defaultCustomUiThemeColors,
  },
];

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

export const useUiBeautifyConfig = () =>
  useStorage<UiBeautifyConfig>('seal-ui-beautify-config', defaultUiBeautifyConfig, localStorage, {
    mergeDefaults: true,
  });

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
  return uiThemeOptions.find(item => item.id === config.themeId)?.colors || classicColors;
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

export const deriveThemeFromPrimary = (value: string): UiThemeColors => {
  const primary = normalizeColorInput(value) || defaultCustomUiThemeColors.primary;
  const luminance = getLuminance(primary);
  const dark = luminance < 0.28;
  const accentText = luminance > 0.55 ? '#1f2937' : '#f8fafc';

  if (dark) {
    const panel = mix(primary, '#172033', 62);
    const surface = mix(primary, '#111827', 58);
    const muted = mix(primary, '#334155', 42);
    return {
      primary,
      success: mix(primary, '#22c55e', 72),
      warning: mix(primary, '#f59e0b', 74),
      danger: mix(primary, '#ef4444', 70),
      info: mix(primary, '#38bdf8', 72),
      nav: mix(primary, '#020617', 38),
      navHover: mix(primary, '#1e293b', 42),
      navActive: mix(primary, '#f8d36a', 78),
      page: mix(primary, '#020617', 72),
      panel,
      surface,
      surfaceSoft: mix(primary, '#0f172a', 70),
      surfaceMuted: muted,
      input: surface,
      border: mix(primary, '#94a3b8', 48),
      borderLight: mix(primary, '#cbd5e1', 56),
      text: '#f8fafc',
      textRegular: '#dbe4f0',
      textSecondary: '#b7c4d6',
      textMuted: '#8fa0b8',
      codeBg: mix(primary, '#0b1220', 74),
      tableHeader: mix(panel, '#020617', 18),
    };
  }

  return {
    primary,
    success: mix(primary, '#16a34a', 72),
    warning: mix(primary, '#d97706', 72),
    danger: mix(primary, '#dc2626', 70),
    info: mix(primary, '#0891b2', 70),
    nav: mix(primary, '#1f2937', 36),
    navHover: mix(primary, '#334155', 42),
    navActive: mix(primary, '#facc15', 78),
    page: mix(primary, '#f8fafc', 90),
    panel: mix(primary, '#ffffff', 96),
    surface: mix(primary, '#ffffff', 94),
    surfaceSoft: mix(primary, '#f8fafc', 86),
    surfaceMuted: mix(primary, '#e2e8f0', 78),
    input: mix(primary, '#ffffff', 97),
    border: mix(primary, '#94a3b8', 66),
    borderLight: mix(primary, '#cbd5e1', 78),
    text: mix(accentText, '#0f172a', 86),
    textRegular: mix(primary, '#334155', 34),
    textSecondary: mix(primary, '#64748b', 50),
    textMuted: mix(primary, '#94a3b8', 62),
    codeBg: mix(primary, '#eff6ff', 80),
    tableHeader: mix(primary, '#e2e8f0', 78),
  };
};

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
  const token = typeof localStorage === 'undefined' ? '' : (localStorage.getItem('t') ?? '').trim();
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
