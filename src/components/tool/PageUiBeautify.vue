<template>
  <section class="workspace-page ui-beautify-page" aria-labelledby="beautify-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="beautify-workspace-title" class="workspace-title">UI 美化</h1>
        <p class="workspace-subtitle">设置只保存在当前浏览器，仅影响 WebUI 的显示效果。</p>
      </div>
      <div class="workspace-actions">
        <el-button :icon="RefreshLeft" @click="resetConfig">恢复默认</el-button>
      </div>
    </header>

    <div class="workspace-body workspace-scroll beautify-body">
      <div class="beautify-layout">
        <div class="beautify-main">
          <section class="workspace-panel" aria-labelledby="beautify-theme-title">
            <div class="workspace-panel-header">
              <div>
                <h2 id="beautify-theme-title">主题</h2>
                <p>点选即生效。所有主题都保证文字与按钮清晰可读。</p>
              </div>
            </div>

            <div class="theme-grid" role="radiogroup" aria-label="主题">
              <button
                v-for="theme in uiThemeOptions"
                :key="theme.id"
                class="theme-card"
                :class="{ active: config.themeId === theme.id }"
                type="button"
                role="radio"
                :aria-checked="config.themeId === theme.id"
                :aria-label="`${theme.name}：${theme.description}`"
                @click="config.themeId = theme.id">
                <span class="theme-thumb" :style="themeThumbStyle(theme.colors)" aria-hidden="true">
                  <span class="theme-thumb-nav">
                    <i class="is-active" />
                    <i />
                    <i />
                  </span>
                  <span class="theme-thumb-main">
                    <span class="theme-thumb-panel">
                      <i class="theme-thumb-title" />
                      <i class="theme-thumb-line" />
                      <i class="theme-thumb-line is-short" />
                      <span class="theme-thumb-actions">
                        <i class="theme-thumb-button" />
                        <i class="theme-thumb-link" />
                      </span>
                    </span>
                  </span>
                </span>
                <span class="theme-meta">
                  <span class="theme-name"
                    >{{ theme.name
                    }}<em v-if="theme.mode === 'dark'" class="theme-tag">深色</em></span
                  >
                  <span class="theme-desc">{{ theme.description }}</span>
                </span>
                <el-icon v-if="config.themeId === theme.id" class="theme-check" aria-hidden="true"
                  ><CircleCheckFilled
                /></el-icon>
              </button>
              <button
                class="theme-card"
                :class="{ active: config.themeId === 'custom' }"
                type="button"
                role="radio"
                :aria-checked="config.themeId === 'custom'"
                aria-label="自定义：选择任意主色生成主题"
                @click="config.themeId = 'custom'">
                <span
                  class="theme-thumb"
                  :style="themeThumbStyle(config.customColors)"
                  aria-hidden="true">
                  <span class="theme-thumb-nav">
                    <i class="is-active" />
                    <i />
                    <i />
                  </span>
                  <span class="theme-thumb-main">
                    <span class="theme-thumb-panel">
                      <i class="theme-thumb-title" />
                      <i class="theme-thumb-line" />
                      <i class="theme-thumb-line is-short" />
                      <span class="theme-thumb-actions">
                        <i class="theme-thumb-button" />
                        <i class="theme-thumb-link" />
                      </span>
                    </span>
                  </span>
                </span>
                <span class="theme-meta">
                  <span class="theme-name">自定义</span>
                  <span class="theme-desc">选择任意主色，自动生成整套配色</span>
                </span>
                <el-icon v-if="config.themeId === 'custom'" class="theme-check" aria-hidden="true"
                  ><CircleCheckFilled
                /></el-icon>
              </button>
            </div>

            <div v-if="config.themeId === 'custom'" class="custom-editor">
              <div class="custom-editor-row">
                <label class="custom-field">
                  <span class="custom-field-label">主色</span>
                  <span class="custom-accent">
                    <input
                      class="custom-color-picker"
                      type="color"
                      :value="config.customAccent"
                      aria-label="选择主色"
                      @input="pickCustomAccent" />
                    <el-input
                      v-model="customAccentInput"
                      class="custom-hex-input"
                      aria-label="主色色值"
                      placeholder="#1a73d5"
                      @change="value => commitCustomAccent(String(value))" />
                  </span>
                </label>
                <div class="custom-field">
                  <span class="custom-field-label">明暗</span>
                  <el-segmented
                    :model-value="config.customMode"
                    :options="customModeOptions"
                    aria-label="明暗模式"
                    @change="value => setCustomMode(value as UiThemeMode)" />
                </div>
                <el-button
                  v-if="config.backgroundPath.trim()"
                  :icon="Picture"
                  :loading="backgroundColorLoading"
                  @click="generateThemeFromBackground">
                  从背景图取色
                </el-button>
              </div>
              <p class="custom-hint">
                背景、边框、文字、导航与状态色会按主色自动生成，并自动校正明度保证可读。
                修改主色或明暗会重新生成下方所有颜色。
              </p>

              <el-collapse class="custom-advanced">
                <el-collapse-item name="tokens">
                  <template #title>
                    <span class="custom-advanced-title">逐项微调颜色（高级）</span>
                  </template>
                  <div v-for="group in customColorGroups" :key="group.label" class="token-group">
                    <h4>{{ group.label }}</h4>
                    <div class="token-grid">
                      <label v-for="item in group.items" :key="item.key" class="token-item">
                        <input
                          class="custom-color-picker is-small"
                          type="color"
                          :value="config.customColors[item.key]"
                          :aria-label="`选择${item.label}`"
                          @input="pickCustomColor(item.key, $event)" />
                        <span class="token-label">{{ item.label }}</span>
                        <el-input
                          :model-value="customColorInputs[item.key]"
                          size="small"
                          class="token-input"
                          :aria-label="`${item.label}色值`"
                          @input="value => (customColorInputs[item.key] = String(value))"
                          @change="value => commitCustomColor(item.key, String(value))" />
                      </label>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </section>

          <section class="workspace-panel" aria-labelledby="beautify-bg-title">
            <div class="workspace-panel-header">
              <div>
                <h2 id="beautify-bg-title">背景图片</h2>
                <p>在内容区铺一张背景图，可调节虚化、暗化与卡片透明度。</p>
              </div>
              <label class="workspace-toggle">
                <el-switch v-model="config.backgroundEnabled" aria-label="启用背景图片" />
                <span>启用背景图片</span>
              </label>
            </div>

            <el-form
              v-if="config.backgroundEnabled"
              label-width="auto"
              label-position="left"
              class="background-form">
              <el-form-item label="图片路径">
                <div class="background-field">
                  <el-input
                    v-model="config.backgroundPath"
                    placeholder="例如 data/images/background.jpg">
                    <template #append>
                      <el-button
                        :disabled="!config.backgroundPath.trim()"
                        @click="saveBackgroundConfig">
                        应用
                      </el-button>
                    </template>
                  </el-input>
                  <span class="background-hint">
                    可先在“资源管理”上传图片，再复制其路径到这里。
                  </span>
                </div>
              </el-form-item>
              <el-form-item label="裁剪">
                <div class="background-inline">
                  <el-button
                    :icon="Crop"
                    :disabled="!config.backgroundPath.trim() || cropLoading"
                    :loading="cropLoading"
                    @click="openCropWindow">
                    裁剪图片
                  </el-button>
                  <template v-if="config.backgroundCropPath">
                    <el-text size="small" type="info" truncated>
                      正在使用裁剪图：{{ config.backgroundCropPath }}
                    </el-text>
                    <el-button link type="primary" @click="clearBackgroundCrop">改用原图</el-button>
                  </template>
                </div>
              </el-form-item>
              <el-form-item label="填充方式">
                <el-segmented v-model="config.backgroundFit" :options="uiBackgroundFitOptions" />
              </el-form-item>
              <el-form-item label="图片位置">
                <div class="background-field">
                  <span class="background-position-segment">
                    <el-segmented
                      v-model="config.backgroundPosition"
                      :disabled="!isBackgroundPositionEnabled"
                      :options="uiBackgroundPositionOptions" />
                  </span>
                  <span v-if="!isBackgroundPositionEnabled" class="background-hint">
                    仅“自由剪裁”后的图片可调整位置，其他情况自动居中。
                  </span>
                </div>
              </el-form-item>
              <el-form-item label="遮罩">
                <el-segmented
                  v-model="config.backgroundMaskPreset"
                  :options="uiBackgroundMaskOptions" />
              </el-form-item>
              <el-form-item label="虚化">
                <el-slider
                  v-model="config.backgroundBlur"
                  :min="0"
                  :max="80"
                  :step="1"
                  show-input />
              </el-form-item>
              <el-form-item label="暗化">
                <el-slider v-model="config.backgroundDim" :min="0" :max="80" :step="1" show-input />
              </el-form-item>
              <el-form-item label="图片不透明度">
                <el-slider
                  v-model="config.backgroundImageOpacity"
                  :min="0"
                  :max="100"
                  :step="1"
                  show-input />
              </el-form-item>
              <el-form-item label="卡片不透明度">
                <el-slider v-model="config.cardOpacity" :min="0" :max="100" :step="1" show-input />
              </el-form-item>
              <el-form-item label="配色">
                <el-button
                  :icon="Picture"
                  :disabled="!config.backgroundPath.trim() || backgroundColorLoading"
                  :loading="backgroundColorLoading"
                  @click="generateThemeFromBackground">
                  用背景图主色生成主题
                </el-button>
              </el-form-item>
            </el-form>
            <p v-else class="background-off-hint">开启后即可设置图片与显示效果。</p>
          </section>
        </div>
        <aside class="beautify-side">
          <section class="workspace-panel" aria-labelledby="beautify-density-title">
            <div class="workspace-panel-header">
              <div>
                <h2 id="beautify-density-title">显示密度</h2>
                <p>调整列表行高与页面间距。</p>
              </div>
            </div>
            <el-radio-group v-model="density" class="option-list" aria-label="显示密度">
              <el-radio v-for="item in densityOptions" :key="item.value" :value="item.value" border>
                <span class="option-text">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.hint }}</small>
                </span>
              </el-radio>
            </el-radio-group>
          </section>

          <section class="workspace-panel" aria-labelledby="beautify-font-title">
            <div class="workspace-panel-header">
              <div>
                <h2 id="beautify-font-title">字体</h2>
                <p>未安装的字体会回退到系统默认字体。</p>
              </div>
            </div>
            <el-radio-group v-model="config.fontId" class="option-list" aria-label="字体">
              <el-radio v-for="font in uiFontOptions" :key="font.id" :value="font.id" border>
                <span class="option-text">
                  <strong>{{ font.name }}</strong>
                  <small :style="{ fontFamily: font.family }">余烬骰子 Aa 1d100 = 42</small>
                </span>
              </el-radio>
            </el-radio-group>
          </section>
        </aside>
      </div>
    </div>

    <el-dialog
      v-model="cropDialogVisible"
      title="选择背景裁剪区域"
      width="min(92vw, 64rem)"
      class="crop-dialog"
      destroy-on-close
      @closed="resetCropWindow">
      <div class="crop-window">
        <div class="crop-mode-toolbar">
          <el-segmented
            v-model="cropMode"
            :options="uiBackgroundCropModeOptions"
            @change="handleCropModeChange" />
          <el-text size="small" type="info">{{ cropModeHint }}</el-text>
        </div>
        <div
          ref="cropFrameRef"
          class="crop-stage"
          :style="cropFrameStyle"
          @pointerdown="startCropCreate"
          @pointermove="moveCropDrag"
          @pointerup="stopCropDrag"
          @pointercancel="stopCropDrag">
          <img
            v-if="cropPreviewUrl"
            class="crop-image"
            :src="cropPreviewUrl"
            draggable="false"
            :style="cropImageStyle" />
          <div
            v-if="cropPreviewUrl"
            class="crop-selection"
            :style="cropSelectionStyle"
            @pointerdown.stop="startCropMove">
            <span
              v-for="handle in cropHandles"
              :key="handle"
              class="crop-handle"
              :class="`crop-handle-${handle}`"
              @pointerdown.stop="event => startCropResize(event, handle)" />
            <div class="crop-grid" />
          </div>
        </div>
        <div class="crop-toolbar">
          <el-text size="small" type="info">
            拖动选区移动，拖动四角调整范围；自由剪裁可拖出任意比例。
          </el-text>
        </div>
      </div>
      <template #footer>
        <el-button @click="cropDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="cropLoading" @click="saveSelectedCrop">
          保存剪裁
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import {
  applyUiBeautifyConfig,
  defaultUiBeautifyConfig,
  deriveThemeFromPrimary,
  getUiThemeColors,
  normalizeBackgroundPath,
  normalizeColorInput,
  uiBackgroundCropModeOptions,
  uiBackgroundFitOptions,
  uiBackgroundMaskOptions,
  uiBackgroundPositionOptions,
  uiFontOptions,
  uiThemeOptions,
  useUiBeautifyConfig,
  type UiBackgroundCropMode,
  type UiThemeColorKey,
  type UiThemeColors,
} from '~/utils/ui-beautify';
import { relativeLuminance, type UiThemeMode } from '~/utils/theme-palette';
import { deleteResource, saveResourceBlob } from '~/api/resource';
import { CircleCheckFilled, Crop, Picture, RefreshLeft } from '@element-plus/icons-vue';

const density = useStorage<'comfortable' | 'compact' | 'dense'>('workspace-density', 'compact');
const densityOptions = [
  { value: 'comfortable', label: '舒适', hint: '行高更大、留白更多，适合触屏或大屏' },
  { value: 'compact', label: '紧凑', hint: '默认设置，信息量与可读性平衡' },
  { value: 'dense', label: '极紧凑', hint: '一屏显示更多行，适合管理大量数据' },
] as const;

const config = useUiBeautifyConfig();
const cropLoading = ref(false);
const backgroundColorLoading = ref(false);
const cropDialogVisible = ref(false);
const cropFrameRef = ref<HTMLElement | null>(null);
const cropPreviewUrl = ref('');
const cropImage = ref<HTMLImageElement | null>(null);
const cropNaturalSize = reactive({ width: 0, height: 0 });
const cropFrameSize = reactive({ width: 0, height: 0 });
const cropMode = ref<UiBackgroundCropMode>('background');
const cropSelection = reactive({ x: 0, y: 0, width: 0, height: 0 });
type CropHandle = 'nw' | 'ne' | 'sw' | 'se';
type CropDragAction = 'create' | 'move' | 'resize';
const cropHandles: CropHandle[] = ['nw', 'ne', 'sw', 'se'];
const cropDrag = reactive<{
  active: boolean;
  action: CropDragAction;
  handle: CropHandle;
  startX: number;
  startY: number;
  rectX: number;
  rectY: number;
  rectWidth: number;
  rectHeight: number;
}>({
  active: false,
  action: 'move',
  handle: 'se',
  startX: 0,
  startY: 0,
  rectX: 0,
  rectY: 0,
  rectWidth: 0,
  rectHeight: 0,
});
let cropResizeObserver: ResizeObserver | undefined;
const minCropSize = 36;

const ensureCustomColors = () => {
  const current = (config.value.customColors || {}) as Partial<UiThemeColors>;
  const repaired = getUiThemeColors({
    themeId: 'custom',
    customColors: current as UiThemeColors,
  });
  if (
    !config.value.customColors ||
    (Object.keys(repaired) as UiThemeColorKey[]).some(key => current[key] !== repaired[key])
  ) {
    config.value.customColors = repaired;
  }
  config.value.customAccent ||= repaired.primary;
  config.value.customMode ||= relativeLuminance(repaired.page) < 0.28 ? 'dark' : 'light';
  config.value.backgroundMaskPreset ||= defaultUiBeautifyConfig.backgroundMaskPreset;
  config.value.backgroundPosition ||= defaultUiBeautifyConfig.backgroundPosition;
};

ensureCustomColors();

const themeThumbStyle = (colors: UiThemeColors) => ({
  '--thumb-nav': colors.nav,
  '--thumb-nav-active': colors.navActive,
  '--thumb-page': colors.page,
  '--thumb-panel': colors.panel,
  '--thumb-border': colors.borderLight,
  '--thumb-text': colors.text,
  '--thumb-muted': colors.textMuted,
  '--thumb-primary': colors.primary,
});

const customModeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
];

const customColorGroups: Array<{
  label: string;
  items: Array<{ key: UiThemeColorKey; label: string }>;
}> = [
  {
    label: '品牌与状态',
    items: [
      { key: 'primary', label: '主色' },
      { key: 'success', label: '成功' },
      { key: 'warning', label: '警告' },
      { key: 'danger', label: '危险' },
      { key: 'info', label: '信息' },
    ],
  },
  {
    label: '侧边导航',
    items: [
      { key: 'nav', label: '导航背景' },
      { key: 'navHover', label: '导航悬停' },
      { key: 'navActive', label: '导航选中' },
    ],
  },
  {
    label: '背景与面板',
    items: [
      { key: 'page', label: '页面背景' },
      { key: 'panel', label: '面板' },
      { key: 'surface', label: '浮层' },
      { key: 'surfaceSoft', label: '浅色块' },
      { key: 'surfaceMuted', label: '深色块' },
      { key: 'input', label: '输入框' },
      { key: 'tableHeader', label: '表头' },
      { key: 'codeBg', label: '代码块' },
    ],
  },
  {
    label: '文字与边框',
    items: [
      { key: 'text', label: '标题文字' },
      { key: 'textRegular', label: '正文' },
      { key: 'textSecondary', label: '次要文字' },
      { key: 'textMuted', label: '占位文字' },
      { key: 'border', label: '边框' },
      { key: 'borderLight', label: '浅边框' },
    ],
  },
];

const customColorInputs = reactive({ ...config.value.customColors });
const customAccentInput = ref(config.value.customAccent ?? '');

const regenerateCustomTheme = () => {
  config.value.themeId = 'custom';
  config.value.customColors = deriveThemeFromPrimary(
    config.value.customAccent ?? '',
    config.value.customMode ?? 'light',
  );
};

const commitCustomAccent = (value: string) => {
  const normalized = normalizeColorInput(value);
  if (!normalized) {
    customAccentInput.value = config.value.customAccent ?? '';
    ElMessage.warning('请输入 #RRGGBB、#RGB 或 rgb(64, 158, 255) 格式的颜色');
    return;
  }
  config.value.customAccent = normalized;
  customAccentInput.value = normalized;
  regenerateCustomTheme();
};

const pickCustomAccent = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (target?.value) commitCustomAccent(target.value);
};

const setCustomMode = (mode: UiThemeMode) => {
  config.value.customMode = mode;
  regenerateCustomTheme();
};

const commitCustomColor = (key: UiThemeColorKey, value: string) => {
  const normalized = normalizeColorInput(value);
  if (!normalized) {
    customColorInputs[key] = config.value.customColors[key];
    ElMessage.warning('请输入 #RRGGBB、#RGB 或 rgb(64, 158, 255) 格式的颜色');
    return;
  }
  config.value.customColors[key] = normalized;
};

const pickCustomColor = (key: UiThemeColorKey, event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (target?.value) commitCustomColor(key, target.value);
};

const applyCurrentUiConfig = () => {
  applyUiBeautifyConfig(config.value);
};

const saveBackgroundConfig = async () => {
  const oldCropPath = config.value.backgroundCropPath;
  config.value.backgroundCropPath = '';
  if (oldCropPath) {
    await deleteResource(oldCropPath).catch(() => undefined);
  }
  config.value.backgroundEnabled = true;
  applyCurrentUiConfig();
  ElMessage.success('背景设置已保存并已应用');
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = src;
  });

const getImageDominantColor = async (src: string) => {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  const size = 56;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('浏览器不支持图片取色');
  }
  ctx.drawImage(image, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 64) {
      continue;
    }
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 28 || min > 235 || max - min < 10) {
      continue;
    }
    const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const best = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  if (!best) {
    return defaultUiBeautifyConfig.customAccent ?? '#1a73d5';
  }
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value / best.count)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(best.r)}${toHex(best.g)}${toHex(best.b)}`;
};

const generateThemeFromBackground = async () => {
  if (!config.value.backgroundPath.trim()) {
    return;
  }
  backgroundColorLoading.value = true;
  try {
    const path = normalizeBackgroundPath(
      config.value.backgroundCropPath || config.value.backgroundPath,
    );
    const color = await getImageDominantColor(path);
    config.value.customAccent = color;
    customAccentInput.value = color;
    regenerateCustomTheme();
    ElMessage.success('已用背景图主色生成自定义主题');
  } catch (error: any) {
    ElMessage.error(error?.message || '背景图取色失败');
  } finally {
    backgroundColorLoading.value = false;
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('剪裁输出失败'));
      }
    }, 'image/png');
  });

const cropTargetRatio = ref(16 / 9);
const isBackgroundPositionEnabled = computed(
  () => config.value.backgroundEnabled && config.value.backgroundCropMode === 'free',
);
const cropModeHint = computed(() =>
  cropMode.value === 'free'
    ? '自由剪裁可选择任意比例；保存后图片位置设置会生效。'
    : '背景比例会按右侧内容背景区域剪裁，居中覆盖且不会拉伸。',
);

const cropImageRatio = computed(() => {
  if (!cropNaturalSize.width || !cropNaturalSize.height) {
    return 16 / 9;
  }
  return cropNaturalSize.width / cropNaturalSize.height;
});

const cropFrameStyle = computed(() => ({
  aspectRatio: `${cropImageRatio.value}`,
  maxWidth: `min(100%, ${Math.max(24, Math.round(68 * cropImageRatio.value))}vh)`,
}));

const cropImageStyle = computed(() => ({
  width: '100%',
  height: '100%',
}));

const cropSelectionStyle = computed(() => ({
  left: `${cropSelection.x}px`,
  top: `${cropSelection.y}px`,
  width: `${cropSelection.width}px`,
  height: `${cropSelection.height}px`,
}));

const updateCropFrameSize = () => {
  const rect = cropFrameRef.value?.getBoundingClientRect();
  if (!rect) {
    return;
  }
  const oldWidth = cropFrameSize.width;
  const oldHeight = cropFrameSize.height;
  cropFrameSize.width = Math.max(1, rect.width);
  cropFrameSize.height = Math.max(1, rect.height);
  if (oldWidth > 0 && oldHeight > 0 && cropSelection.width > 0 && cropSelection.height > 0) {
    const scaleX = cropFrameSize.width / oldWidth;
    const scaleY = cropFrameSize.height / oldHeight;
    cropSelection.x *= scaleX;
    cropSelection.y *= scaleY;
    cropSelection.width *= scaleX;
    cropSelection.height *= scaleY;
  }
};

const getBackgroundTargetRatio = () => {
  const rect = document.querySelector<HTMLElement>('.seal-content')?.getBoundingClientRect();
  const width = rect?.width || window.innerWidth || 16;
  const height = rect?.height || window.innerHeight || 9;
  return Math.max(0.2, Math.min(5, width / Math.max(1, height)));
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const clampCropSelection = () => {
  if (!cropFrameSize.width || !cropFrameSize.height) {
    return;
  }
  cropSelection.width = clamp(cropSelection.width, minCropSize, cropFrameSize.width);
  cropSelection.height = clamp(cropSelection.height, minCropSize, cropFrameSize.height);
  cropSelection.x = clamp(cropSelection.x, 0, cropFrameSize.width - cropSelection.width);
  cropSelection.y = clamp(cropSelection.y, 0, cropFrameSize.height - cropSelection.height);
};

const getLargestRatioSelection = (ratio: number) => {
  let width = cropFrameSize.width;
  let height = width / ratio;
  if (height > cropFrameSize.height) {
    height = cropFrameSize.height;
    width = height * ratio;
  }
  return {
    x: (cropFrameSize.width - width) / 2,
    y: (cropFrameSize.height - height) / 2,
    width,
    height,
  };
};

const resetCropSelection = () => {
  updateCropFrameSize();
  if (!cropFrameSize.width || !cropFrameSize.height) {
    return;
  }
  const next =
    cropMode.value === 'background'
      ? getLargestRatioSelection(cropTargetRatio.value)
      : {
          x: cropFrameSize.width * 0.125,
          y: cropFrameSize.height * 0.125,
          width: cropFrameSize.width * 0.75,
          height: cropFrameSize.height * 0.75,
        };
  cropSelection.x = next.x;
  cropSelection.y = next.y;
  cropSelection.width = next.width;
  cropSelection.height = next.height;
  clampCropSelection();
};

const fitRatioSelection = (rect: { x: number; y: number; width: number; height: number }) => {
  const ratio = cropTargetRatio.value;
  let width = Math.max(minCropSize, Math.abs(rect.width));
  let height = width / ratio;
  if (height > Math.max(minCropSize, Math.abs(rect.height))) {
    height = Math.max(minCropSize, Math.abs(rect.height));
    width = height * ratio;
  }
  if (width > cropFrameSize.width) {
    width = cropFrameSize.width;
    height = width / ratio;
  }
  if (height > cropFrameSize.height) {
    height = cropFrameSize.height;
    width = height * ratio;
  }
  return {
    x: clamp(rect.x, 0, cropFrameSize.width - width),
    y: clamp(rect.y, 0, cropFrameSize.height - height),
    width,
    height,
  };
};

const setCropSelectionFromCorners = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) => {
  const raw = {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
  const next =
    cropMode.value === 'background'
      ? fitRatioSelection(raw)
      : {
          x: raw.x,
          y: raw.y,
          width: Math.max(minCropSize, raw.width),
          height: Math.max(minCropSize, raw.height),
        };
  cropSelection.x = next.x;
  cropSelection.y = next.y;
  cropSelection.width = next.width;
  cropSelection.height = next.height;
  clampCropSelection();
};

const getStagePoint = (event: PointerEvent) => {
  const rect = cropFrameRef.value?.getBoundingClientRect();
  if (!rect) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
};

const resetCropWindow = () => {
  cropResizeObserver?.disconnect();
  cropResizeObserver = undefined;
  cropImage.value = null;
  cropPreviewUrl.value = '';
  cropDrag.active = false;
  cropSelection.x = 0;
  cropSelection.y = 0;
  cropSelection.width = 0;
  cropSelection.height = 0;
};

const openCropWindow = async () => {
  if (!config.value.backgroundPath.trim()) {
    return;
  }
  cropLoading.value = true;
  try {
    const normalizedPath = normalizeBackgroundPath(config.value.backgroundPath);
    const image = await loadImage(normalizedPath);
    cropImage.value = image;
    cropPreviewUrl.value = normalizedPath;
    cropNaturalSize.width = image.naturalWidth;
    cropNaturalSize.height = image.naturalHeight;
    cropMode.value = config.value.backgroundCropMode || 'background';
    cropTargetRatio.value = getBackgroundTargetRatio();
    cropDialogVisible.value = true;
    await nextTick();
    cropResizeObserver?.disconnect();
    if (cropFrameRef.value) {
      cropResizeObserver = new ResizeObserver(() => {
        updateCropFrameSize();
        clampCropSelection();
      });
      cropResizeObserver.observe(cropFrameRef.value);
    }
    resetCropSelection();
  } catch (error: any) {
    ElMessage.error(error?.message || '图片加载失败');
  } finally {
    cropLoading.value = false;
  }
};

const handleCropModeChange = (value: string | number | boolean) => {
  cropMode.value = value === 'free' ? 'free' : 'background';
  if (cropMode.value === 'background') {
    cropTargetRatio.value = getBackgroundTargetRatio();
  }
  nextTick(() => resetCropSelection());
};

const startCropCreate = (event: PointerEvent) => {
  if (!cropImage.value) {
    return;
  }
  const point = getStagePoint(event);
  cropDrag.active = true;
  cropDrag.action = 'create';
  cropDrag.startX = point.x;
  cropDrag.startY = point.y;
  cropDrag.rectX = point.x;
  cropDrag.rectY = point.y;
  cropDrag.rectWidth = 0;
  cropDrag.rectHeight = 0;
  cropFrameRef.value?.setPointerCapture?.(event.pointerId);
};

const startCropMove = (event: PointerEvent) => {
  if (!cropImage.value) {
    return;
  }
  const point = getStagePoint(event);
  cropDrag.active = true;
  cropDrag.action = 'move';
  cropDrag.startX = point.x;
  cropDrag.startY = point.y;
  cropDrag.rectX = cropSelection.x;
  cropDrag.rectY = cropSelection.y;
  cropDrag.rectWidth = cropSelection.width;
  cropDrag.rectHeight = cropSelection.height;
  cropFrameRef.value?.setPointerCapture?.(event.pointerId);
};

const startCropResize = (event: PointerEvent, handle: CropHandle) => {
  if (!cropImage.value) {
    return;
  }
  const point = getStagePoint(event);
  cropDrag.active = true;
  cropDrag.action = 'resize';
  cropDrag.handle = handle;
  cropDrag.startX = point.x;
  cropDrag.startY = point.y;
  cropDrag.rectX = cropSelection.x;
  cropDrag.rectY = cropSelection.y;
  cropDrag.rectWidth = cropSelection.width;
  cropDrag.rectHeight = cropSelection.height;
  cropFrameRef.value?.setPointerCapture?.(event.pointerId);
};

const moveCropDrag = (event: PointerEvent) => {
  if (!cropDrag.active) {
    return;
  }
  const point = getStagePoint(event);
  if (cropDrag.action === 'create') {
    setCropSelectionFromCorners(cropDrag.startX, cropDrag.startY, point.x, point.y);
    return;
  }
  if (cropDrag.action === 'move') {
    cropSelection.x = cropDrag.rectX + point.x - cropDrag.startX;
    cropSelection.y = cropDrag.rectY + point.y - cropDrag.startY;
    cropSelection.width = cropDrag.rectWidth;
    cropSelection.height = cropDrag.rectHeight;
    clampCropSelection();
    return;
  }

  const left = cropDrag.rectX;
  const top = cropDrag.rectY;
  const right = cropDrag.rectX + cropDrag.rectWidth;
  const bottom = cropDrag.rectY + cropDrag.rectHeight;
  const fixedX = cropDrag.handle.includes('w') ? right : left;
  const fixedY = cropDrag.handle.includes('n') ? bottom : top;
  setCropSelectionFromCorners(fixedX, fixedY, point.x, point.y);
};

const stopCropDrag = (event: PointerEvent) => {
  cropDrag.active = false;
  cropFrameRef.value?.releasePointerCapture?.(event.pointerId);
};

const saveSelectedCrop = async () => {
  if (!cropImage.value) {
    return;
  }
  cropLoading.value = true;
  try {
    updateCropFrameSize();
    clampCropSelection();
    const scaleX = cropNaturalSize.width / cropFrameSize.width;
    const scaleY = cropNaturalSize.height / cropFrameSize.height;
    const sx = cropSelection.x * scaleX;
    const sy = cropSelection.y * scaleY;
    const sw = cropSelection.width * scaleX;
    const sh = cropSelection.height * scaleY;
    const outputScale = Math.min(1, 2560 / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * outputScale));
    canvas.height = Math.max(1, Math.round(sh * outputScale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('浏览器不支持图像剪裁');
    }
    ctx.drawImage(cropImage.value, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas);
    const filename = `seal-ui-bg-crop-${Date.now()}.png`;
    const nextPath = `data/images/${filename}`;
    const oldCropPath = config.value.backgroundCropPath;
    const result = await saveResourceBlob(blob, filename);
    if (!result.result) {
      throw new Error(result.err || '剪裁文件保存失败');
    }
    if (oldCropPath) {
      await deleteResource(oldCropPath).catch(() => undefined);
    }
    config.value.backgroundCropPath = nextPath;
    config.value.backgroundEnabled = true;
    config.value.backgroundCropMode = cropMode.value;
    config.value.backgroundFit = 'cover';
    if (cropMode.value === 'background') {
      config.value.backgroundPosition = 'center';
    }
    applyCurrentUiConfig();
    cropDialogVisible.value = false;
    ElMessage.success('背景剪裁已保存并已应用');
  } catch (error: any) {
    ElMessage.error(error?.message || '剪裁失败');
  } finally {
    cropLoading.value = false;
  }
};

const clearBackgroundCrop = async () => {
  const oldPath = config.value.backgroundCropPath;
  config.value.backgroundCropPath = '';
  config.value.backgroundCropMode = 'background';
  config.value.backgroundPosition = 'center';
  if (oldPath) {
    await deleteResource(oldPath).catch(() => undefined);
  }
  applyCurrentUiConfig();
  ElMessage.success('已切回原图');
};

onBeforeUnmount(() => {
  cropResizeObserver?.disconnect();
});

const resetConfig = () => {
  config.value = {
    ...defaultUiBeautifyConfig,
    customColors: { ...defaultUiBeautifyConfig.customColors },
  };
  ElMessage.success('已恢复默认外观');
};

watch(
  config,
  () => {
    ensureCustomColors();
    applyCurrentUiConfig();
  },
  { deep: true, immediate: true },
);

watch(
  () => config.value.customColors,
  value =>
    Object.assign(customColorInputs, getUiThemeColors({ themeId: 'custom', customColors: value })),
  { deep: true },
);

watch(
  () => config.value.customAccent,
  value => {
    customAccentInput.value = value ?? '';
  },
);
</script>

<style scoped>
.beautify-body {
  container-type: inline-size;
}

.beautify-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--workspace-gap);
  align-items: start;
}

.beautify-main,
.beautify-side {
  display: grid;
  gap: var(--workspace-gap);
  min-width: 0;
}

@container (min-width: 1120px) {
  .beautify-layout {
    grid-template-columns: minmax(0, 1fr) 340px;
  }

  .beautify-side {
    position: sticky;
    top: 0;
  }
}

/* 主题 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr));
  gap: 12px;
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 8px 12px;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 10px;
  background: var(--seal-panel-bg);
  color: var(--seal-text-color);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .theme-card:hover {
    border-color: var(--seal-border-color);
    box-shadow: var(--el-box-shadow-lighter);
  }
}

.theme-card.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.theme-card:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.theme-check {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--seal-panel-bg-base);
  border-radius: 50%;
}

.theme-thumb {
  display: flex;
  height: 92px;
  overflow: hidden;
  border: 1px solid var(--thumb-border);
  border-radius: 6px;
  background: var(--thumb-page);
}

.theme-thumb i {
  display: block;
  border-radius: 2px;
}

.theme-thumb-nav {
  display: flex;
  flex: 0 0 26%;
  flex-direction: column;
  gap: 5px;
  padding: 10px 6px;
  background: var(--thumb-nav);
}

.theme-thumb-nav i {
  height: 5px;
  background: color-mix(in srgb, #fff 22%, transparent);
}

.theme-thumb-nav i.is-active {
  background: var(--thumb-nav-active);
}

.theme-thumb-main {
  flex: 1;
  padding: 10px;
}

.theme-thumb-panel {
  display: flex;
  flex-direction: column;
  gap: 5px;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--thumb-border);
  border-radius: 4px;
  background: var(--thumb-panel);
}

.theme-thumb-title {
  width: 45%;
  height: 6px;
  background: var(--thumb-text);
}

.theme-thumb-line {
  width: 85%;
  height: 4px;
  background: var(--thumb-muted);
  opacity: 0.6;
}

.theme-thumb-line.is-short {
  width: 60%;
}

.theme-thumb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
}

.theme-thumb-button {
  width: 34%;
  height: 10px;
  background: var(--thumb-primary);
}

.theme-thumb-link {
  width: 22%;
  height: 4px;
  background: var(--thumb-primary);
  opacity: 0.7;
}

.theme-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-inline: 4px;
}

.theme-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.theme-tag {
  padding: 0 6px;
  border: 1px solid var(--seal-border-color);
  border-radius: 999px;
  font-size: 11px;
  font-style: normal;
  font-weight: 400;
  line-height: 16px;
  color: var(--seal-text-secondary);
}

.theme-desc {
  font-size: 12px;
  line-height: 1.4;
  color: var(--seal-text-secondary);
}

/* 自定义主题 */
.custom-editor {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 8px;
  background: var(--seal-surface-soft);
}

.custom-editor-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 24px;
}

.custom-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-field-label {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.custom-accent {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-hex-input {
  width: 120px;
}

.custom-hint {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--seal-text-secondary);
}

.custom-color-picker {
  width: 32px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--seal-border-color);
  border-radius: 6px;
  background: var(--seal-panel-bg);
  cursor: pointer;
}

.custom-color-picker.is-small {
  width: 24px;
  height: 24px;
  padding: 1px;
  border-radius: 4px;
}

.custom-color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.custom-color-picker::-webkit-color-swatch {
  border: 0;
  border-radius: 3px;
}

.custom-color-picker::-moz-color-swatch {
  border: 0;
  border-radius: 3px;
}

.custom-advanced {
  margin-top: 12px;
  border-top: 0;
  border-bottom: 0;
}

.custom-advanced :deep(.el-collapse-item__header),
.custom-advanced :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom: 0;
}

.custom-advanced-title {
  font-size: 13px;
  color: var(--seal-text-regular);
}

.token-group + .token-group {
  margin-top: 12px;
}

.token-group h4 {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--seal-text-secondary);
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 6px 16px;
}

.token-item {
  display: grid;
  grid-template-columns: 24px minmax(4.5em, 1fr) minmax(0, 96px);
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

/* 密度与字体 */
.option-list {
  display: grid;
  gap: 8px;
  width: 100%;
}

.option-list .el-radio {
  width: 100%;
  height: auto;
  margin-inline-end: 0;
  padding-block: 10px;
  box-sizing: border-box;
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
  white-space: normal;
}

.option-text small {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

/* 背景 */
.background-form .el-form-item {
  margin-bottom: 14px;
}

.background-form .el-form-item:last-child {
  margin-bottom: 0;
}

.background-form :deep(.el-segmented) {
  max-width: 100%;
  overflow-x: auto;
}

.background-form :deep(.el-slider) {
  max-width: 480px;
}

.background-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 560px;
}

.background-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
}

.background-hint,
.background-off-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--seal-text-secondary);
}

.background-off-hint {
  margin: 0;
}

.background-position-segment {
  display: inline-flex;
  max-width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .theme-card {
    transition: none;
  }
}

.crop-window {
  display: grid;
  gap: 1rem;
}

.crop-mode-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.crop-stage {
  position: relative;
  width: 100%;
  max-height: 68vh;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background:
    linear-gradient(45deg, var(--seal-surface-soft) 25%, transparent 25%),
    linear-gradient(-45deg, var(--seal-surface-soft) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--seal-surface-soft) 75%),
    linear-gradient(-45deg, transparent 75%, var(--seal-surface-soft) 75%);
  background-color: var(--seal-surface-muted);
  background-position:
    0 0,
    0 0.5rem,
    0.5rem -0.5rem,
    -0.5rem 0;
  background-size: 1rem 1rem;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.crop-stage:active {
  cursor: grabbing;
}

.crop-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  user-select: none;
  pointer-events: none;
}

.crop-selection {
  position: absolute;
  cursor: move;
  border: 2px solid var(--el-color-primary);
  box-shadow:
    0 0 0 9999px rgba(0, 0, 0, 0.34),
    0 0 0 1px rgba(255, 255, 255, 0.85);
  box-sizing: border-box;
}

.crop-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to right,
      transparent 33.333%,
      rgba(255, 255, 255, 0.5) 33.333%,
      rgba(255, 255, 255, 0.5) calc(33.333% + 1px),
      transparent calc(33.333% + 1px),
      transparent 66.666%,
      rgba(255, 255, 255, 0.5) 66.666%,
      rgba(255, 255, 255, 0.5) calc(66.666% + 1px),
      transparent calc(66.666% + 1px)
    ),
    linear-gradient(
      to bottom,
      transparent 33.333%,
      rgba(255, 255, 255, 0.5) 33.333%,
      rgba(255, 255, 255, 0.5) calc(33.333% + 1px),
      transparent calc(33.333% + 1px),
      transparent 66.666%,
      rgba(255, 255, 255, 0.5) 66.666%,
      rgba(255, 255, 255, 0.5) calc(66.666% + 1px),
      transparent calc(66.666% + 1px)
    );
}

.crop-handle {
  position: absolute;
  z-index: 1;
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid #fff;
  border-radius: 999px;
  background: var(--el-color-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
}

.crop-handle-nw {
  left: -0.45rem;
  top: -0.45rem;
  cursor: nwse-resize;
}

.crop-handle-ne {
  right: -0.45rem;
  top: -0.45rem;
  cursor: nesw-resize;
}

.crop-handle-sw {
  left: -0.45rem;
  bottom: -0.45rem;
  cursor: nesw-resize;
}

.crop-handle-se {
  right: -0.45rem;
  bottom: -0.45rem;
  cursor: nwse-resize;
}

.crop-toolbar {
  display: grid;
  gap: 0.5rem;
}
</style>
