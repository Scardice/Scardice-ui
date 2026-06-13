<template>
  <div class="ui-beautify-page">
    <div class="ui-beautify-header">
      <div>
        <h2>UI 美化</h2>
        <el-text type="info">设置会保存在当前浏览器，仅影响 WebUI 显示。</el-text>
      </div>
      <el-button @click="resetConfig">恢复默认</el-button>
    </div>

    <section class="ui-beautify-section">
      <h3>主题颜色</h3>
      <div class="theme-grid">
        <button
          v-for="theme in uiThemeOptions"
          :key="theme.id"
          class="theme-card"
          :class="{ active: config.themeId === theme.id }"
          type="button"
          @click="config.themeId = theme.id">
          <span class="theme-name">{{ theme.name }}</span>
          <span class="theme-swatches">
            <span
              v-for="(color, swatchIndex) in getThemeSwatches(theme)"
              :key="`${theme.id}-${swatchIndex}-${color}`"
              class="theme-swatch"
              :style="{ backgroundColor: color }" />
          </span>
        </button>
      </div>
      <div class="theme-preview-panel" :style="themePreviewStyle">
        <div class="theme-preview-top">
          <div>
            <strong>{{ currentThemeName }}预览</strong>
            <el-text size="small" type="info">卡片、输入框、折叠块、表格、按钮实时小样</el-text>
          </div>
          <span class="theme-preview-pill">Live</span>
        </div>
        <div class="theme-preview-grid">
          <div class="theme-preview-card">
            <strong>卡片标题</strong>
            <span>这里展示主面板、次级块、边框与文字层级。</span>
            <div class="theme-preview-actions">
              <button type="button" class="theme-preview-button primary">主要</button>
              <button type="button" class="theme-preview-button plain">次要</button>
            </div>
          </div>
          <div class="theme-preview-card">
            <label class="theme-preview-field">
              <span>输入框</span>
              <input value="Scardice UI" readonly />
            </label>
            <div class="theme-preview-collapse">
              <div class="theme-preview-collapse-title">折叠块标题</div>
              <div class="theme-preview-collapse-body">帮助内容和说明文字使用同一套卡片视觉。</div>
            </div>
          </div>
          <table class="theme-preview-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>群组</td>
                <td>在线</td>
              </tr>
              <tr>
                <td>插件</td>
                <td>启用</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="config.themeId === 'custom'" class="custom-theme-panel">
        <div class="custom-theme-header">
          <div>
            <strong>自定义配色</strong>
            <el-text type="info" size="small"
              >可点选色块，或输入 #RRGGBB / #RGB / rgb(64, 158, 255)。</el-text
            >
          </div>
          <el-space wrap>
            <label class="custom-primary-generator">
              <span>主色</span>
              <input
                class="custom-color-picker"
                type="color"
                :value="customGeneratorPrimary"
                aria-label="选择主色并生成配色"
                @input="pickGeneratorPrimary" />
              <el-input
                v-model="customGeneratorPrimary"
                size="small"
                @change="value => commitGeneratorPrimary(String(value))"
                @blur="commitGeneratorPrimary(customGeneratorPrimary)" />
            </label>
            <el-button size="small" type="primary" plain @click="() => generateCustomColors()">
              主色生成
            </el-button>
            <el-button size="small" @click="resetCustomColors">恢复自定义默认</el-button>
          </el-space>
        </div>
        <div class="custom-color-grid">
          <label v-for="item in customColorItems" :key="item.key" class="custom-color-item">
            <span class="custom-color-label">{{ item.label }}</span>
            <input
              class="custom-color-picker"
              type="color"
              :value="config.customColors[item.key]"
              :aria-label="`选择${item.label}`"
              @input="pickCustomColor(item.key, $event)"
              @change="pickCustomColor(item.key, $event)" />
            <el-input
              :model-value="customColorInputs[item.key]"
              size="small"
              @input="value => (customColorInputs[item.key] = String(value))"
              @change="value => commitCustomColor(item.key, String(value))"
              @blur="commitCustomColor(item.key, customColorInputs[item.key])" />
          </label>
        </div>
      </div>
    </section>

    <section class="ui-beautify-section">
      <h3>字体</h3>
      <el-radio-group v-model="config.fontId" class="font-list">
        <el-radio-button v-for="font in uiFontOptions" :key="font.id" :label="font.id">
          <span :style="{ fontFamily: font.family }">{{ font.name }}</span>
        </el-radio-button>
      </el-radio-group>
    </section>

    <section class="ui-beautify-section">
      <h3>图像背景</h3>
      <el-form label-width="7rem" class="background-form">
        <el-form-item label="启用背景">
          <el-switch v-model="config.backgroundEnabled" />
        </el-form-item>
        <el-form-item label="图片路径">
          <el-input
            v-model="config.backgroundPath"
            placeholder="例如 data/images/04cfe09a564c162c33c2d611300103df_720.jpg">
            <template #append>
              <el-button :disabled="!config.backgroundPath.trim()" @click="saveBackgroundConfig">
                保存
              </el-button>
              <el-button
                :disabled="!config.backgroundPath.trim() || cropLoading"
                :loading="cropLoading"
                @click="openCropWindow">
                剪裁
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="config.backgroundCropPath" label="剪裁文件">
          <el-space wrap>
            <el-text truncated>{{ config.backgroundCropPath }}</el-text>
            <el-button size="small" plain @click="clearBackgroundCrop">使用原图</el-button>
          </el-space>
        </el-form-item>
        <el-form-item label="图片比例">
          <el-segmented
            v-model="config.backgroundFit"
            :disabled="!config.backgroundEnabled"
            :options="uiBackgroundFitOptions" />
        </el-form-item>
        <el-form-item label="图片位置">
          <div class="background-position-control">
            <el-tooltip
              :disabled="isBackgroundPositionEnabled || !config.backgroundEnabled"
              content="图片位置仅在自由剪裁模式下生效；背景比例剪裁会自动居中覆盖。"
              placement="top">
              <span class="background-position-segment">
                <el-segmented
                  v-model="config.backgroundPosition"
                  :disabled="!isBackgroundPositionEnabled"
                  :options="uiBackgroundPositionOptions" />
              </span>
            </el-tooltip>
            <el-text
              v-if="config.backgroundEnabled && !isBackgroundPositionEnabled"
              size="small"
              type="info">
              仅自由剪裁后的背景图可调整位置，背景比例剪裁会自动居中覆盖。
            </el-text>
          </div>
        </el-form-item>
        <el-form-item label="遮罩预设">
          <el-segmented
            v-model="config.backgroundMaskPreset"
            :disabled="!config.backgroundEnabled"
            :options="uiBackgroundMaskOptions" />
        </el-form-item>
        <el-form-item label="背景虚化">
          <el-slider
            v-model="config.backgroundBlur"
            :disabled="!config.backgroundEnabled"
            :min="0"
            :max="80"
            :step="1"
            show-input />
        </el-form-item>
        <el-form-item label="背景暗化">
          <el-slider
            v-model="config.backgroundDim"
            :disabled="!config.backgroundEnabled"
            :min="0"
            :max="80"
            :step="1"
            show-input />
        </el-form-item>
        <el-form-item label="图片不透明度">
          <el-slider
            v-model="config.backgroundImageOpacity"
            :disabled="!config.backgroundEnabled"
            :min="0"
            :max="100"
            :step="1"
            show-input />
        </el-form-item>
        <el-form-item label="卡片不透明度">
          <el-slider v-model="config.cardOpacity" :min="0" :max="100" :step="1" show-input />
        </el-form-item>
        <el-form-item label="主题取色">
          <el-button
            type="primary"
            plain
            :disabled="!config.backgroundPath.trim() || backgroundColorLoading"
            :loading="backgroundColorLoading"
            @click="generateThemeFromBackground">
            从背景图生成主题
          </el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="ui-preview">
      <div class="ui-preview-nav">Scardice</div>
      <div class="ui-preview-body">
        <div class="ui-preview-panel">
          <strong>预览</strong>
          <span>按钮、面板和文字会随主题即时变化。</span>
          <el-space wrap>
            <el-button type="primary">主要</el-button>
            <el-button type="success">成功</el-button>
            <el-button type="warning">警告</el-button>
            <el-button type="danger">危险</el-button>
          </el-space>
        </div>
      </div>
    </section>

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
  </div>
</template>

<script setup lang="ts">
import {
  applyUiBeautifyConfig,
  defaultCustomUiThemeColors,
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
  type UiThemeOption,
} from '~/utils/ui-beautify';
import { deleteResource, saveResourceBlob } from '~/api/resource';

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

const cloneColors = (colors: UiThemeColors): UiThemeColors => ({ ...colors });
const customGeneratorPrimary = ref(config.value.customColors.primary);

const ensureCustomColors = () => {
  const current = (config.value.customColors || {}) as Partial<UiThemeColors>;
  const repaired = getUiThemeColors({
    themeId: 'custom',
    customColors: current as UiThemeColors,
  });
  const needsRepair =
    !config.value.customColors ||
    (Object.keys(defaultCustomUiThemeColors) as UiThemeColorKey[]).some(
      key => current[key] !== repaired[key],
    );
  if (needsRepair) {
    config.value.customColors = repaired;
  }
  config.value.backgroundMaskPreset ||= defaultUiBeautifyConfig.backgroundMaskPreset;
  config.value.backgroundPosition ||= defaultUiBeautifyConfig.backgroundPosition;
};

ensureCustomColors();

const getThemeSwatches = (theme: UiThemeOption) => [
  ...(theme.id === 'custom'
    ? [
        config.value.customColors.primary,
        config.value.customColors.nav,
        config.value.customColors.page,
        config.value.customColors.panel,
        config.value.customColors.surfaceSoft,
      ]
    : [
        theme.colors.primary,
        theme.colors.nav,
        theme.colors.page,
        theme.colors.panel,
        theme.colors.surfaceSoft,
      ]),
];

const currentThemeColors = computed(() => getUiThemeColors(config.value));
const currentThemeName = computed(
  () => uiThemeOptions.find(theme => theme.id === config.value.themeId)?.name || '主题',
);
const themePreviewStyle = computed(() => {
  const colors = currentThemeColors.value;
  return {
    '--preview-primary': colors.primary,
    '--preview-page': colors.page,
    '--preview-panel': colors.panel,
    '--preview-surface': colors.surface,
    '--preview-soft': colors.surfaceSoft,
    '--preview-muted': colors.surfaceMuted,
    '--preview-input': colors.input,
    '--preview-border': colors.border,
    '--preview-border-light': colors.borderLight,
    '--preview-text': colors.text,
    '--preview-regular': colors.textRegular,
    '--preview-secondary': colors.textSecondary,
    '--preview-table': colors.tableHeader,
  };
});

const customColorItems: Array<{ key: UiThemeColorKey; label: string }> = [
  { key: 'primary', label: '主色' },
  { key: 'success', label: '成功' },
  { key: 'warning', label: '警告' },
  { key: 'danger', label: '危险' },
  { key: 'info', label: '信息' },
  { key: 'nav', label: '导航背景' },
  { key: 'navHover', label: '导航悬停' },
  { key: 'navActive', label: '导航选中' },
  { key: 'page', label: '页面背景' },
  { key: 'panel', label: '主面板' },
  { key: 'surface', label: '浮层面板' },
  { key: 'surfaceSoft', label: '柔和块' },
  { key: 'surfaceMuted', label: '次级块' },
  { key: 'input', label: '输入框' },
  { key: 'border', label: '边框' },
  { key: 'borderLight', label: '浅边框' },
  { key: 'text', label: '主文字' },
  { key: 'textRegular', label: '正文' },
  { key: 'textSecondary', label: '次文字' },
  { key: 'textMuted', label: '弱文字' },
  { key: 'codeBg', label: '代码背景' },
  { key: 'tableHeader', label: '表头背景' },
];

const customColorInputs = reactive<Record<UiThemeColorKey, string>>(
  Object.fromEntries(
    customColorItems.map(item => [item.key, config.value.customColors[item.key]]),
  ) as Record<UiThemeColorKey, string>,
);

const pickCustomColor = (key: UiThemeColorKey, event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (target?.value) {
    commitCustomColor(key, target.value);
  }
};

const commitCustomColor = (key: UiThemeColorKey, value: string) => {
  const normalized = normalizeColorInput(value);
  if (!normalized) {
    customColorInputs[key] = config.value.customColors[key];
    ElMessage.warning('颜色值格式不正确');
    return;
  }
  config.value.customColors[key] = normalized;
  customColorInputs[key] = normalized;
};

const syncCustomColorInputs = () => {
  for (const item of customColorItems) {
    customColorInputs[item.key] = config.value.customColors[item.key];
  }
  customGeneratorPrimary.value = config.value.customColors.primary;
};

const pickGeneratorPrimary = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (target?.value) {
    customGeneratorPrimary.value = target.value;
  }
};

const commitGeneratorPrimary = (value: string) => {
  const normalized = normalizeColorInput(value);
  if (!normalized) {
    customGeneratorPrimary.value = config.value.customColors.primary;
    ElMessage.warning('主色格式不正确');
    return;
  }
  customGeneratorPrimary.value = normalized;
};

const generateCustomColors = (primary = customGeneratorPrimary.value) => {
  const normalized = normalizeColorInput(primary);
  if (!normalized) {
    ElMessage.warning('主色格式不正确');
    return;
  }
  config.value.themeId = 'custom';
  config.value.customColors = deriveThemeFromPrimary(normalized);
  syncCustomColorInputs();
  ElMessage.success('已按主色生成自定义配色');
};

const resetCustomColors = () => {
  config.value.customColors = cloneColors(defaultCustomUiThemeColors);
  syncCustomColorInputs();
  ElMessage.success('已恢复自定义配色默认值');
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
    return defaultCustomUiThemeColors.primary;
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
    generateCustomColors(color);
    customGeneratorPrimary.value = color;
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
    customColors: cloneColors(defaultCustomUiThemeColors),
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
  value => {
    const colors = getUiThemeColors({ themeId: 'custom', customColors: value });
    for (const item of customColorItems) {
      customColorInputs[item.key] = colors[item.key];
    }
    customGeneratorPrimary.value = colors.primary;
  },
  { deep: true },
);
</script>

<style scoped>
.ui-beautify-page {
  display: grid;
  gap: 1rem;
}

.ui-beautify-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.ui-beautify-section,
.ui-preview {
  padding: 1rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--seal-panel-bg);
  box-shadow: var(--el-box-shadow-light);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}

.theme-card {
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--seal-surface-bg);
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.theme-card:hover,
.theme-card.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}

.theme-card.active {
  transform: translateY(-1px);
}

.theme-name {
  font-weight: 700;
}

.theme-swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.35rem;
}

.theme-swatch {
  height: 1.25rem;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.theme-preview-panel {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--preview-border-light);
  border-radius: 8px;
  background: var(--preview-page);
  color: var(--preview-text);
}

.theme-preview-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.theme-preview-top > div {
  display: grid;
  gap: 0.2rem;
}

.theme-preview-pill {
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--preview-border);
  border-radius: 999px;
  background: var(--preview-soft);
  color: var(--preview-secondary);
  font-size: 0.75rem;
  font-weight: 700;
}

.theme-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: 0.75rem;
}

.theme-preview-card,
.theme-preview-table {
  border: 1px solid var(--preview-border-light);
  border-radius: 8px;
  background: var(--preview-panel);
  color: var(--preview-text);
}

.theme-preview-card {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem;
}

.theme-preview-card > span,
.theme-preview-field > span,
.theme-preview-collapse-body {
  color: var(--preview-regular);
  font-size: 0.85rem;
}

.theme-preview-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.theme-preview-button {
  min-height: 2rem;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--preview-border);
  cursor: default;
}

.theme-preview-button.primary {
  border-color: var(--preview-primary);
  background: var(--preview-primary);
  color: #fff;
}

.theme-preview-button.plain {
  background: var(--preview-surface);
  color: var(--preview-text);
}

.theme-preview-field {
  display: grid;
  gap: 0.35rem;
}

.theme-preview-field input {
  min-width: 0;
  padding: 0.42rem 0.55rem;
  border: 1px solid var(--preview-border);
  border-radius: 6px;
  background: var(--preview-input);
  color: var(--preview-text);
}

.theme-preview-collapse {
  overflow: hidden;
  border: 1px solid var(--preview-border-light);
  border-radius: 8px;
  background: var(--preview-surface);
}

.theme-preview-collapse-title {
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid var(--preview-border-light);
  background: var(--preview-panel);
  font-weight: 700;
}

.theme-preview-collapse-body {
  padding: 0.7rem;
  background: var(--preview-surface);
}

.theme-preview-table {
  width: 100%;
  border-spacing: 0;
  overflow: hidden;
}

.theme-preview-table th,
.theme-preview-table td {
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid var(--preview-border-light);
  text-align: left;
  font-size: 0.85rem;
}

.theme-preview-table th {
  background: var(--preview-table);
  color: var(--preview-text);
}

.theme-preview-table tr:last-child td {
  border-bottom: 0;
}

.custom-theme-panel {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--seal-surface-soft);
}

.custom-theme-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.custom-theme-header > div {
  display: grid;
  gap: 0.25rem;
}

.custom-theme-header > .el-space {
  justify-content: flex-end;
}

.custom-primary-generator {
  display: grid;
  grid-template-columns: auto 2.25rem minmax(7rem, 10rem);
  align-items: center;
  gap: 0.45rem;
  max-width: 100%;
  padding: 0.35rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--seal-panel-bg);
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.custom-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 0.65rem;
}

.custom-color-item {
  display: grid;
  grid-template-columns: minmax(4.8rem, auto) 2.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--seal-panel-bg);
}

.custom-color-picker {
  width: 2.25rem;
  height: 2.25rem;
  min-width: 2.25rem;
  padding: 0.1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--seal-surface-bg);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.45);
  cursor: pointer;
}

.custom-color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.custom-color-picker::-webkit-color-swatch {
  border: 0;
  border-radius: 4px;
}

.custom-color-picker::-moz-color-swatch {
  border: 0;
  border-radius: 4px;
}

.custom-color-item :deep(.el-input) {
  min-width: 0;
}

.custom-color-label {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.font-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.background-form {
  max-width: 48rem;
}

.background-form :deep(.el-segmented) {
  max-width: 100%;
  overflow-x: auto;
}

.background-position-control {
  display: grid;
  gap: 0.35rem;
}

.background-position-segment {
  display: inline-flex;
  max-width: 100%;
}

.ui-preview {
  overflow: hidden;
  padding: 0;
}

.ui-preview-nav {
  padding: 0.85rem 1rem;
  background: var(--seal-nav-bg);
  color: #fff;
  font-weight: 700;
}

.ui-preview-body {
  padding: 1rem;
  background: var(--seal-page-bg);
}

.ui-preview-panel {
  display: grid;
  gap: 0.75rem;
  max-width: 34rem;
  padding: 1rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--seal-panel-bg);
  color: var(--seal-text-color);
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

@media screen and (max-width: 700px) {
  .ui-beautify-header {
    flex-direction: column;
  }

  .custom-theme-header {
    flex-direction: column;
  }

  .custom-theme-header > .el-space {
    width: 100%;
    justify-content: flex-start;
  }

  .custom-primary-generator {
    grid-template-columns: auto 2.25rem minmax(0, 1fr);
    width: 100%;
  }

  .custom-color-item {
    grid-template-columns: minmax(4.6rem, auto) 2.25rem minmax(0, 1fr);
  }
}
</style>
