<template>
  <section class="quick-entry-section" aria-labelledby="quick-entry-title">
    <div class="section-heading">
      <div>
        <h2 id="quick-entry-title">快捷入口</h2>
        <p class="section-caption">自选常用页面；此列表仅保存在当前浏览器。</p>
      </div>
      <button
        ref="editorButton"
        class="quick-editor-trigger workspace-section-action"
        type="button"
        @click="openEditor">
        <el-icon aria-hidden="true"><EditPen /></el-icon>
        编辑入口
      </button>
    </div>

    <nav v-if="visibleEntries.length" aria-label="快捷入口">
      <ul class="quick-entry-list">
        <li v-for="page in visibleEntries" :key="page.path">
          <router-link class="quick-entry-link" :to="page.path">
            <el-icon aria-hidden="true"><component :is="page.icon" /></el-icon>
            <span class="quick-entry-link__text">
              <strong>{{ page.label }}</strong>
              <small>{{ page.hint }}</small>
            </span>
            <el-icon class="quick-entry-link__arrow" aria-hidden="true"><ArrowRight /></el-icon>
          </router-link>
        </li>
      </ul>
    </nav>
    <div v-else class="quick-entry-empty">
      <p>还没有设置快捷入口。</p>
      <el-button @click="openEditor">添加常用页面</el-button>
    </div>

    <el-dialog
      v-model="editorOpen"
      title="编辑快捷入口"
      width="min(680px, calc(100vw - 24px))"
      :close-on-click-modal="false"
      @opened="focusSearch"
      @closed="restoreFocus">
      <div class="quick-editor">
        <div class="quick-editor__section">
          <h3>已选入口顺序</h3>
          <p class="section-caption">使用上移、下移调整首页显示顺序，也可以移除入口。</p>
          <ol v-if="orderedDraftEntries.length" class="draft-entry-list">
            <li v-for="(page, index) in orderedDraftEntries" :key="page.path">
              <span class="draft-entry-name">
                <el-icon aria-hidden="true"><component :is="page.icon" /></el-icon>
                {{ page.label }}
              </span>
              <span class="draft-entry-actions">
                <el-button
                  text
                  :disabled="index === 0"
                  :aria-label="`将${page.label}上移`"
                  @click="moveEntry(index, -1)">
                  上移
                </el-button>
                <el-button
                  text
                  :disabled="index === orderedDraftEntries.length - 1"
                  :aria-label="`将${page.label}下移`"
                  @click="moveEntry(index, 1)">
                  下移
                </el-button>
                <el-button text :aria-label="`移除${page.label}`" @click="removeEntry(page.path)">
                  移除
                </el-button>
              </span>
            </li>
          </ol>
          <p v-else class="quick-editor__empty">尚未选择入口。</p>
        </div>

        <div class="quick-editor__section">
          <h3>添加或移除页面</h3>
          <el-input
            ref="searchInput"
            v-model="searchText"
            name="quick-entry-search"
            aria-label="搜索可用页面"
            placeholder="搜索页面名称或说明"
            clearable />
          <ul class="route-option-list">
            <li v-for="page in matchingPages" :key="page.path">
              <label class="route-option" :for="inputId(page.path)">
                <input
                  :id="inputId(page.path)"
                  type="checkbox"
                  name="quick-entry-route"
                  :checked="draftPaths.includes(page.path)"
                  @change="toggleEntry(page.path)" />
                <span>
                  <strong>{{ page.label }}</strong>
                  <small>{{ page.hint }}</small>
                </span>
              </label>
            </li>
            <li v-if="matchingPages.length === 0" class="route-option-empty">
              没有匹配的可用页面。
            </li>
          </ul>
        </div>
        <p v-if="saveError" class="save-error" role="alert">{{ saveError }}</p>
      </div>
      <template #footer>
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存快捷入口</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, EditPen } from '@element-plus/icons-vue';
import { buildNavigation, searchNavigation, type NavigationPage } from '~/router/navigation';
import { isAdminAuthMode, useStore } from '~/store';

const storageKey = 'scardice-home-quick-entry-paths-v1';
const defaultPaths = ['/connect', '/mod/reply', '/misc/base-setting', '/mod/js'];
const store = useStore();
const router = useRouter();
const editorOpen = ref(false);
const searchText = ref('');
const searchInput = ref<{ focus: () => void } | null>(null);
const editorButton = ref<HTMLButtonElement | null>(null);
const showAdvanced = ref(false);
const saveError = ref('');
const draftPaths = ref<string[]>([]);

function readSavedPaths() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return [...defaultPaths];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some(path => typeof path !== 'string')) {
      return [...defaultPaths];
    }
    return [...new Set(parsed.filter((path): path is string => typeof path === 'string'))];
  } catch {
    return [...defaultPaths];
  }
}

const selectedPaths = ref(readSavedPaths());
const availablePages = computed(() =>
  buildNavigation(Object.keys(store.curDice.customTexts ?? {}), showAdvanced.value).filter(
    page =>
      page.group !== 'footer' &&
      page.path !== '/home' &&
      router.resolve(page.path).matched.length > 0,
  ),
);
const pageByPath = computed(() => new Map(availablePages.value.map(page => [page.path, page])));
const visibleEntries = computed(() =>
  selectedPaths.value
    .map(path => pageByPath.value.get(path))
    .filter((page): page is NavigationPage => page !== undefined),
);
const orderedDraftEntries = computed(() =>
  draftPaths.value
    .map(path => pageByPath.value.get(path))
    .filter((page): page is NavigationPage => page !== undefined),
);
const matchingPages = computed(() => searchNavigation(availablePages.value, searchText.value));

function inputId(path: string) {
  return `quick-entry-${encodeURIComponent(path)}`;
}

function openEditor() {
  draftPaths.value = visibleEntries.value.map(page => page.path);
  searchText.value = '';
  saveError.value = '';
  editorOpen.value = true;
}

function toggleEntry(path: string) {
  if (draftPaths.value.includes(path)) {
    draftPaths.value = draftPaths.value.filter(item => item !== path);
  } else {
    draftPaths.value = [...draftPaths.value, path];
  }
}

function removeEntry(path: string) {
  draftPaths.value = draftPaths.value.filter(item => item !== path);
}

function moveEntry(index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= draftPaths.value.length) return;
  const updated = [...draftPaths.value];
  [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
  draftPaths.value = updated;
}

function cancelEdit() {
  editorOpen.value = false;
}

function saveEdit() {
  const validPaths = new Set(availablePages.value.map(page => page.path));
  const paths = [...new Set(draftPaths.value.filter(path => validPaths.has(path)))];
  try {
    localStorage.setItem(storageKey, JSON.stringify(paths));
  } catch {
    saveError.value = '浏览器未能保存设置，请检查本地存储权限后重试。';
    return;
  }
  selectedPaths.value = paths;
  editorOpen.value = false;
}

function focusSearch() {
  searchInput.value?.focus();
}

function restoreFocus() {
  nextTick(() => editorButton.value?.focus());
}

let active = false;
onMounted(() => {
  if (isAdminAuthMode()) return;
  active = true;
  void store
    .diceAdvancedConfigGet()
    .then(config => {
      if (active) showAdvanced.value = Boolean(config.show);
    })
    .catch(() => {
      // Keep advanced destinations hidden unless the server confirms they are enabled.
    });
});

onUnmounted(() => {
  active = false;
});
</script>

<style scoped>
.quick-entry-section {
  min-width: 0;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.section-heading h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.section-caption {
  margin: 3px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.quick-entry-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: min(32vh, 240px);
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding-inline-end: 12px;
  overscroll-behavior: contain;
  align-content: start;
}

.quick-entry-link {
  display: flex;
  min-width: 0;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  color: var(--el-text-color-primary);
  text-decoration: none;
}

.quick-entry-link:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--seal-surface-soft);
}

.quick-entry-link:focus-visible,
.draft-entry-actions :deep(button:focus-visible),
.route-option:focus-within {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.quick-entry-link > .el-icon {
  flex: 0 0 auto;
  color: var(--el-color-primary);
  font-size: 20px;
}

.quick-entry-link__text {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.quick-entry-link__text strong,
.quick-entry-link__text small {
  overflow-wrap: anywhere;
}

.quick-entry-link__text small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.quick-entry-link .quick-entry-link__arrow {
  margin-inline-start: auto;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.quick-entry-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
}

.quick-entry-empty p {
  margin: 0;
}

.quick-editor {
  display: grid;
  gap: 20px;
}

.quick-editor__section h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.draft-entry-list,
.route-option-list {
  max-height: 220px;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 8px 0 0;
  padding: 0;
  border-top: 1px solid var(--el-border-color-lighter);
  list-style: none;
}

.draft-entry-list li {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.draft-entry-name,
.draft-entry-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.draft-entry-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.draft-entry-actions {
  flex: 0 0 auto;
}

.quick-editor__empty,
.route-option-empty {
  margin: 0;
  padding: 12px 4px;
  color: var(--el-text-color-secondary);
}

.route-option-list {
  max-height: 260px;
}

.route-option-list li + li {
  border-top: 1px solid var(--el-border-color-lighter);
}

.route-option {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  cursor: pointer;
}

.route-option input {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  accent-color: var(--el-color-primary);
}

.route-option span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.route-option small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.save-error {
  margin: 0;
  color: var(--el-color-danger);
}

@media (max-width: 1023px) {
  .quick-entry-list {
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 767px) {
  .quick-entry-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-heading {
    align-items: flex-start;
  }

  .quick-entry-link__text small,
  .section-caption,
  .route-option small,
  .route-option strong,
  .draft-entry-name,
  .quick-editor__empty,
  .route-option-empty,
  .quick-editor__section h3 {
    font-size: 16px;
  }

  .draft-entry-list li {
    align-items: flex-start;
    flex-direction: column;
    padding: 8px 0;
  }

  .draft-entry-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .quick-editor-trigger {
    min-height: 44px;
  }
}
</style>
