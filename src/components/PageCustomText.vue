<template>
  <section class="workspace-page text-workspace" aria-labelledby="text-workspace-title">
    <header class="workspace-header text-workspace-header">
      <div class="heading-copy">
        <h1 id="text-workspace-title" class="workspace-title">文案管理</h1>
        <p class="workspace-subtitle">
          浏览实际文案类别，编辑后保存到服务端；切换类别不会丢弃未保存内容。
        </p>
      </div>
      <div class="workspace-actions header-actions">
        <span
          class="save-state"
          :class="{ 'is-dirty': modified || isBusy }"
          role="status"
          aria-live="polite">
          <span
            class="status-dot"
            :class="{ warning: modified || isBusy }"
            aria-hidden="true"></span>
          {{ saveStatusText }}
        </span>
        <el-button
          class="desktop-save-action"
          type="primary"
          :icon="DocumentChecked"
          :disabled="!modified || isBusy"
          :loading="saving"
          @click="save">
          保存{{ pendingCategoryCount ? `（${pendingCategoryCount} 类）` : '' }}
        </el-button>
        <el-button type="primary" plain @click="dialogImportVisible = true" :disabled="isBusy">
          导入/导出
        </el-button>
      </div>
    </header>

    <el-button class="help-trigger" :icon="QuestionFilled" @click="dialogHelpVisible = true">
      编辑说明与变量帮助
    </el-button>

    <div class="workspace-toolbar text-toolbar">
      <el-input
        v-model="currentFilterName"
        class="search-field"
        name="custom-text-search"
        :prefix-icon="Search"
        clearable
        aria-label="搜索文案类别、名称、说明、内容或变量"
        placeholder="搜索类别、名称、说明、内容或变量" />
      <el-radio-group
        v-model="filterMode"
        class="filter-modes"
        aria-label="文案筛选模式"
        @change="handleFilterModeChange">
        <el-radio v-for="mode in filterModes" :key="mode.value" :value="mode.value">
          {{ mode.desc }}
        </el-radio>
      </el-radio-group>
      <div v-if="filterMode === 'group'" class="group-filter">
        <span>分组</span>
        <el-select
          v-model="currentFilterGroup"
          class="group-select"
          name="custom-text-group-filter"
          filterable
          allow-create
          aria-label="按文案分组筛选">
          <el-option v-for="group in filterGroups" :key="group" :label="group" :value="group" />
        </el-select>
      </div>
      <span class="result-count" aria-live="polite">{{ visibleEntries.length }} 条文案</span>
    </div>
    <p v-if="operationError && !dialogImportVisible" class="workspace-error" role="alert">
      {{ operationError }}
    </p>

    <div class="workspace-body text-workspace-body">
      <aside class="navigation-pane" aria-label="当前类别文案列表">
        <div class="navigation-heading entry-list-heading">
          <span class="section-title">当前类别文案</span>
          <span class="muted">{{ visibleEntries.length }}</span>
        </div>
        <nav class="entry-list" aria-label="当前类别文案列表">
          <button
            v-for="entry in visibleEntries"
            :key="entry.key"
            class="entry-link"
            :class="{ 'is-active': selectedEntryKey === entry.key }"
            type="button"
            :aria-pressed="selectedEntryKey === entry.key"
            @click="selectEntry(entry.key)">
            <span class="entry-link-title">{{ entry.key }}</span>
            <span class="entry-link-description">{{
              getEntryType(props.category, entry.key)
            }}</span>
          </button>
          <p v-if="visibleEntries.length === 0" class="empty-list">
            {{ hasCategory ? '当前筛选条件下没有文案。' : '请选择一个已有文案类别。' }}
          </p>
        </nav>
      </aside>

      <div class="editor-pane">
        <div class="mobile-list-control">
          <el-button :icon="List" @click="navigationDrawerOpen = true">浏览文案列表</el-button>
          <span class="mobile-category">{{ hasCategory ? props.category : '未选择类别' }}</span>
        </div>

        <div v-if="categoryKeys.length === 0" class="empty-state" role="status" aria-live="polite">
          <strong>{{
            store.backendOffline ? '文案服务暂时不可用' : '当前没有可编辑的文案类别'
          }}</strong>
          <span>
            {{
              store.backendOffline
                ? '请确认主程序连接恢复后重新加载文案。'
                : '请确认后端已返回文案数据；若此状态持续，请检查服务端连接后刷新页面。'
            }}
          </span>
        </div>
        <div v-else-if="!hasCategory" class="empty-state" role="status">
          <strong>当前路由没有对应的文案类别</strong>
          <span>请从左侧选择一个实际存在的类别。</span>
        </div>
        <template v-else>
          <div class="editor-context">
            <div class="editor-context-copy">
              <h2 class="section-title">{{ props.category }}</h2>
              <span class="muted">{{ visibleEntries.length }} 个文案条目</span>
            </div>
            <span v-if="selectedEntryKey" class="focused-entry">当前：{{ selectedEntryKey }}</span>
          </div>

          <template v-if="selectedEntry">
            <article
              v-for="{ key, variants } in selectedEntries"
              :id="entryDomId(props.category, key)"
              :key="key"
              class="text-card">
              <header class="text-card-heading">
                <span class="card-title-group">
                  <span class="card-title">{{ key }}</span>
                  <span class="card-description">{{ getEntryType(props.category, key) }}</span>
                </span>
                <span class="card-heading-meta">
                  <el-tag
                    size="small"
                    disable-transitions
                    :type="getHelpInfo(props.category, key)?.modified ? 'warning' : 'info'">
                    {{
                      getHelpInfo(props.category, key)
                        ? getHelpInfo(props.category, key)?.modified
                          ? '已自定义'
                          : '默认'
                        : '状态未知'
                    }}
                  </el-tag>
                  <el-tag
                    v-if="getHelpInfo(props.category, key)?.notBuiltin"
                    size="small"
                    type="warning"
                    disable-transitions>
                    旧版文本
                  </el-tag>
                </span>
              </header>

              <div class="text-card-content">
                <el-alert
                  v-if="key === '戳一戳'"
                  class="text-warning"
                  type="warning"
                  :closable="false"
                  show-icon>
                  请确认你使用的 QQ
                  连接方式支持该功能；若不支持，请在“基本设置”中关闭戳一戳，避免日志中出现相关报错。
                </el-alert>
                <div v-if="getHelpInfo(props.category, key)?.extraText" class="entry-help-text">
                  <el-icon aria-hidden="true"><QuestionFilled /></el-icon>
                  <span>{{ getHelpInfo(props.category, key)?.extraText }}</span>
                </div>

                <div class="variant-list" role="group" :aria-label="`${key} 的回复变体`">
                  <div v-for="(variant, index) in variants" :key="index" class="variant-row">
                    <div class="variant-row-heading">
                      <span class="variant-number">
                        回复 {{ index + 1
                        }}<span v-if="variant[1] !== undefined"> · 权重 {{ variant[1] }}</span>
                      </span>
                      <el-button
                        class="variant-remove"
                        text
                        :icon="CircleClose"
                        :disabled="isBusy"
                        :aria-label="`删除${key}第${index + 1}条回复语`"
                        @click="removeItem(props.category, key, variants, index)" />
                    </div>
                    <el-input
                      v-model="variant[0]"
                      type="textarea"
                      :autosize="{ minRows: 2, maxRows: 8 }"
                      resize="vertical"
                      :disabled="isBusy"
                      :name="`custom-text-${props.category}-${key}-${index}`"
                      :aria-label="`${key}第${index + 1}条回复语`"
                      @focus="selectedEntryKey = key"
                      @input="markEntryChanged(props.category, key)" />
                  </div>
                  <el-button
                    class="variant-add"
                    :icon="CirclePlusFilled"
                    :disabled="isBusy"
                    @click="addItem(props.category, key)">
                    添加回复语
                  </el-button>
                </div>

                <div class="card-actions">
                  <span class="mono entry-key">{{ props.category }}:{{ key }}</span>
                  <div class="entry-actions">
                    <el-tooltip
                      v-if="getHelpInfo(props.category, key)?.modified"
                      content="重置为初始值">
                      <el-button
                        text
                        :icon="BrushFilled"
                        :disabled="isBusy"
                        :aria-label="`重置${key}为默认文案`"
                        @click="askResetValue(props.category, key)" />
                    </el-tooltip>
                    <el-tooltip
                      v-if="getHelpInfo(props.category, key)?.notBuiltin"
                      content="新版默认配置不再使用此文本；升级后仍可能使用，请确认无用后再移除。">
                      <el-button
                        text
                        type="danger"
                        :icon="DeleteFilled"
                        :disabled="isBusy"
                        :aria-label="`移除旧版文案${key}`"
                        @click="askDeleteValue(props.category, key)" />
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </article>
          </template>
          <div v-else class="empty-state" role="status" aria-live="polite">
            <strong>{{
              currentFilterName ? '没有找到匹配的文案' : '当前筛选条件下没有文案'
            }}</strong>
            <span>调整搜索词、筛选模式或分组，查看此类别中的其他文案。</span>
          </div>
        </template>
      </div>

      <aside v-if="selectedEntry" class="preview-pane" aria-label="预览测试与可用变量">
        <section class="preview-section" aria-labelledby="text-preview-title">
          <h2 id="text-preview-title" class="section-title">预览与测试</h2>
          <p class="preview-note">服务端预览使用已保存文案及预设变量，不代表实际跑团结果。</p>
          <div class="preview-actions">
            <el-button :loading="previewLoading" :disabled="isBusy" @click="refreshPreview">
              重新预览已保存文案
            </el-button>
            <router-link to="/tool/test" class="test-link">打开指令测试</router-link>
          </div>
          <p v-if="previewError" class="operation-error" role="alert">{{ previewError }}</p>
          <div
            v-for="(variant, index) in selectedEntry.variants"
            :key="index"
            class="preview-variant">
            <h3 class="section-title">回复 {{ index + 1 }}</h3>
            <template v-if="getPreview(props.category, selectedEntry.key, variant[0])">
              <el-tag
                size="small"
                :type="
                  getPreviewCheckErr(props.category, selectedEntry.key, variant[0])
                    ? 'danger'
                    : getPreview(props.category, selectedEntry.key, variant[0]).version === 'v2'
                      ? 'success'
                      : 'warning'
                "
                disable-transitions>
                {{
                  getPreviewCheckErr(props.category, selectedEntry.key, variant[0])
                    ? '预览异常'
                    : '服务端预览'
                }}
              </el-tag>
              <component :is="getPreviewInfo(props.category, selectedEntry.key, variant[0])" />
            </template>
            <p v-else class="preview-note">
              {{
                pendingCategories.has(props.category)
                  ? '此回复尚无匹配的服务端预览。保存后重新预览，或在指令测试中检查已保存文案。'
                  : '尚无服务端预览，请点击“重新预览已保存文案”。'
              }}
            </p>
          </div>
        </section>
        <section class="preview-section" aria-labelledby="text-variables-title">
          <h2 id="text-variables-title" class="section-title">可用变量</h2>
          <p class="preview-note">使用花括号包裹变量名，例如 <code v-pre>{$t玩家}</code>。</p>
          <h3 class="variable-label">当前文案</h3>
          <el-space v-if="selectedVariables.length" size="small" wrap>
            <el-tag
              v-for="variable in selectedVariables"
              :key="variable"
              size="small"
              disable-transitions>
              {{ variable }}
            </el-tag>
          </el-space>
          <p v-else class="preview-note">服务端未提供此文案的专用变量。</p>
          <h3 class="variable-label">通用变量</h3>
          <el-space size="small" wrap>
            <el-tag
              v-for="variable in globalVariables"
              :key="variable"
              size="small"
              disable-transitions>
              {{ variable }}
            </el-tag>
          </el-space>
        </section>
      </aside>
    </div>

    <footer class="workspace-savebar mobile-savebar" aria-label="移动端文案保存操作">
      <span class="savebar-message">{{ saveStatusText }}</span>
      <el-button
        type="primary"
        :icon="DocumentChecked"
        :disabled="!modified || isBusy"
        :loading="saving"
        @click="save">
        保存{{ pendingCategoryCount ? `（${pendingCategoryCount} 类）` : '' }}
      </el-button>
    </footer>

    <el-drawer
      v-model="navigationDrawerOpen"
      title="选择文案"
      direction="ltr"
      size="min(360px, 92vw)"
      class="text-navigation-drawer">
      <nav class="drawer-navigation" aria-label="移动端当前类别文案列表">
        <button
          v-for="entry in visibleEntries"
          :key="entry.key"
          class="entry-link"
          :class="{ 'is-active': selectedEntryKey === entry.key }"
          type="button"
          :aria-pressed="selectedEntryKey === entry.key"
          @click="selectEntry(entry.key)">
          <span class="entry-link-title">{{ entry.key }}</span>
          <span class="entry-link-description">{{ getEntryType(props.category, entry.key) }}</span>
        </button>
        <p v-if="visibleEntries.length === 0" class="empty-list">当前类别没有匹配的文案。</p>
      </nav>
    </el-drawer>
    <el-dialog
      v-model="dialogHelpVisible"
      title="编辑说明与变量帮助"
      width="min(720px, calc(100vw - 32px))"
      align-center>
      <div class="help-content">
        <p>此处可以对骰子返回的文本进行修改；最终返回的文本将从多个条目中随机抽取。</p>
        <p>点击“添加回复语”可增加一个随机文本变体；各变体保留原有权重，默认新变体权重为 1。</p>
        <p>
          标记为“已自定义”的条目与默认值不同；“旧版文本”是不再由新版默认配置使用、但升级后仍可能被使用的条目。
        </p>
        <p>
          右侧“可用变量”来自服务端帮助信息。可使用
          <code v-pre>{$t判定值}</code> 等变量；自定义文本也可以嵌套引用，避免递归嵌套。
        </p>
        <p>
          支持使用 <code>[图:data/images/Scardice.png]</code> 插入图片，也可使用 CQ
          码。图片需放在骰子的适当目录；CQ 码格式请参阅 OneBot 文档。
        </p>
        <p>
          COC 的“判定 - 常规”和“判定 - 简短”主要区别是，多重检定默认使用简短版本（例如 .ra
          3#射击）。调整后可在“指令测试”中验证。
        </p>
        <div class="global-variables">
          <span>可在所有文本中使用：</span>
          <el-space size="small" wrap>
            <el-tag
              v-for="variable in globalVariables"
              :key="variable"
              size="small"
              disable-transitions>
              {{ variable }}
            </el-tag>
          </el-space>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="dialogHelpVisible = false">知道了</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogImportVisible"
      title="导入/导出文案"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="true"
      :fullscreen="true"
      class="the-dialog">
      <div class="import-options">
        <el-checkbox v-model="importOnlyCurrent" :disabled="importing">
          仅当前类别（未勾选时导出全部类别）
        </el-checkbox>
        <el-checkbox v-model="importImpact" :disabled="importing">压缩导出 JSON</el-checkbox>
      </div>
      <p>以下为实际服务端文案的导出内容；也可粘贴兼容格式的文案配置后导入。</p>
      <el-input
        id="import-edit"
        name="custom-text-import-export"
        v-model="configForImport"
        class="import-edit"
        type="textarea"
        :autosize="{ minRows: 8 }"
        :disabled="importing"
        aria-label="文案导出或导入 JSON 内容"
        :aria-invalid="Boolean(operationError)"
        :aria-describedby="operationError ? 'text-import-error' : undefined"
        placeholder="在此粘贴文案配置 JSON"
        @input="operationError = ''" />
      <p v-if="operationError" id="text-import-error" class="operation-error" role="alert">
        {{ operationError }}
      </p>

      <template #footer>
        <span class="dialog-footer">
          <el-button :disabled="importing" @click="configForImport = ''">清空</el-button>
          <el-button
            id="btnCopy1"
            data-clipboard-target="#import-edit"
            :disabled="importing"
            @click="copied">
            复制导出内容
          </el-button>
          <el-button type="primary" :loading="importing" @click="doImport"> 导入并保存 </el-button>
        </span>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="tsx">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useStore } from '~/store';
import {
  BrushFilled,
  CircleClose,
  CirclePlusFilled,
  DeleteFilled,
  DocumentChecked,
  List,
  Search,
  QuestionFilled,
} from '@element-plus/icons-vue';
import { cloneDeep, sortBy, startsWith, trim, uniq } from 'lodash-es';
import ClipboardJS from 'clipboard';
import { getPendingCustomTextCategories } from './customText/workspaceState';
import { getCustomText, refreshCustomTextPreview } from '~/api/configs';

const store = useStore();
const props = defineProps<{ category: string }>();

type TextVariant = string[];
type TextItem = [string, TextVariant[]];
type TextGroup = [string, TextItem[]];
type VisibleEntry = { key: string; variants: TextVariant[] };

const pendingCategories = computed(() => getPendingCustomTextCategories(store.index));
const modified = computed(() => pendingCategories.value.size > 0);
const pendingCategoryCount = computed(() => pendingCategories.value.size);
const configForImport = ref('');
const importOnlyCurrent = ref(true);
const importImpact = ref(true);
const dialogImportVisible = ref(false);
const dialogHelpVisible = ref(false);
const navigationDrawerOpen = ref(false);
const selectedEntryKey = ref('');
const currentFilterName = ref('');
const filterMode = ref('all');
const currentFilterGroup = ref('');
const saving = ref(false);
const importing = ref(false);
const operationError = ref('');
const previewLoading = ref(false);
const previewError = ref('');
const isBusy = computed(() => saving.value || importing.value);
const saveStatusText = computed(() => {
  if (saving.value) return '正在保存文案…';
  if (importing.value) return '正在导入并保存…';
  if (modified.value) return `${pendingCategoryCount.value} 个类别有未保存更改`;
  return '所有更改均已保存';
});
let clipboard: ClipboardJS | undefined;

const filterModes = [
  { value: 'all', desc: '全部' },
  { value: 'unmodified', desc: '默认文案' },
  { value: 'modified', desc: '修改过' },
  { value: 'group', desc: '指定分组' },
  { value: 'deprecated', desc: '旧版文本' },
];
const globalVariables = [
  '$t玩家',
  '$tQQ昵称',
  '$t个人骰子面数',
  '$tQQ',
  '$t骰子帐号',
  '$t骰子昵称',
  '$t群号',
  '$t群名',
];

const categoryKeys = computed(() => Object.keys(store.curDice.customTexts ?? {}));
const hasCategory = computed(() => categoryKeys.value.includes(props.category));
const filterGroups = computed(() => {
  const helpInfo = store.curDice.customTextsHelpInfo?.[props.category] ?? {};
  return sortBy(
    uniq(
      Object.values(helpInfo)
        .map(info => trim(info.subType ?? ''))
        .filter(subType => subType !== ''),
    ),
  );
});

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function getHelpInfo(category: string, key: string) {
  return store.curDice.customTextsHelpInfo?.[category]?.[key];
}

function getEntryType(category: string, key: string): string {
  const helpInfo = getHelpInfo(category, key);
  return (
    helpInfo?.subType || (helpInfo?.notBuiltin ? '旧版文本' : helpInfo ? '其它' : '帮助信息不可用')
  );
}

function entryMatches(
  category: string,
  key: string,
  variants: TextVariant[],
  query: string,
): boolean {
  const helpInfo = getHelpInfo(category, key);
  const searchableValues = [
    key,
    helpInfo?.subType ?? '',
    helpInfo?.extraText ?? '',
    ...(helpInfo?.vars ?? []),
    ...variants.map(variant => variant[0] ?? ''),
  ];
  return searchableValues.some(value => normalize(value).includes(query));
}

function doSort(category: string): TextGroup[] {
  const texts = store.curDice.customTexts?.[category] ?? {};
  const helpInfo = store.curDice.customTextsHelpInfo?.[category] ?? {};
  const query = normalize(currentFilterName.value);
  const categoryMatches = query !== '' && normalize(category).includes(query);
  let items = Object.entries(texts) as TextItem[];

  if (query && !categoryMatches) {
    items = items.filter(([key, variants]) => entryMatches(category, key, variants, query));
  }

  switch (filterMode.value) {
    case 'unmodified':
      items = items.filter(([key]) => !helpInfo[key]?.modified);
      break;
    case 'modified':
      items = items.filter(([key]) => Boolean(helpInfo[key]?.modified));
      break;
    case 'deprecated':
      items = items.filter(([key]) => Boolean(helpInfo[key]?.notBuiltin));
      break;
    case 'group': {
      const group = trim(currentFilterGroup.value);
      items = group
        ? items.filter(([key]) => startsWith(trim(helpInfo[key]?.subType ?? ''), group))
        : [];
      break;
    }
  }

  const groupCounts: Record<string, number> = {};
  for (const [key] of items) {
    const group = helpInfo[key]?.subType?.split(' ')[0] ?? '';
    groupCounts[group] = (groupCounts[group] ?? 0) + 1;
  }

  const groups = new Map<string, TextItem[]>();
  for (const item of items) {
    const groupPrefix = helpInfo[item[0]]?.subType?.split(' ')[0] ?? '';
    const group = groupCounts[groupPrefix] >= 4 ? groupPrefix : '__others__';
    const groupItems = groups.get(group) ?? [];
    groupItems.push(item);
    groups.set(group, groupItems);
  }

  for (const groupItems of groups.values()) {
    groupItems.sort(([keyA], [keyB]) => {
      const infoA = helpInfo[keyA];
      const infoB = helpInfo[keyB];
      const topOrderDifference = (infoB?.topOrder ?? 0) - (infoA?.topOrder ?? 0);
      return topOrderDifference || (infoB?.subType ?? '').localeCompare(infoA?.subType ?? '');
    });
  }

  return [...groups.entries()].sort(([groupA], [groupB]) => {
    if (groupA === '__others__') return -1;
    if (groupB === '__others__') return 1;
    return 0;
  });
}

const visibleEntryGroups = computed(() => doSort(props.category));
const visibleEntries = computed<VisibleEntry[]>(() =>
  visibleEntryGroups.value.flatMap(([, values]) =>
    values.map(([key, variants]) => ({ key, variants })),
  ),
);
const selectedEntries = computed(() =>
  visibleEntries.value.filter(entry => entry.key === selectedEntryKey.value),
);
const selectedEntry = computed(() => selectedEntries.value[0]);
const selectedVariables = computed(
  () => getHelpInfo(props.category, selectedEntry.value?.key ?? '')?.vars ?? [],
);

function handleFilterModeChange(newMode: string | number | boolean | undefined): void {
  if (newMode === 'group') {
    nextTick(() => {
      currentFilterGroup.value = filterGroups.value[0] ?? '';
      currentFilterName.value = '';
    });
  } else {
    currentFilterGroup.value = '';
    currentFilterName.value = '';
  }
}

function entryDomId(category: string, key: string): string {
  return `custom-text-entry-${encodeURIComponent(category)}-${encodeURIComponent(key)}`;
}

async function selectEntry(key: string): Promise<void> {
  selectedEntryKey.value = key;
  navigationDrawerOpen.value = false;
  await nextTick();
  document.getElementById(entryDomId(props.category, key))?.scrollIntoView({ block: 'nearest' });
}

let selectionCategory = '';
watch(
  () => [props.category, visibleEntries.value.map(entry => entry.key)] as const,
  ([category, entryKeys]) => {
    if (category !== selectionCategory) {
      selectionCategory = category;
      selectedEntryKey.value = '';
    }
    if (!entryKeys.includes(selectedEntryKey.value)) {
      selectedEntryKey.value = entryKeys[0] ?? '';
    }
  },
  { immediate: true },
);

watch(
  () => props.category,
  () => {
    filterMode.value = 'all';
    currentFilterGroup.value = '';
    navigationDrawerOpen.value = false;
    previewError.value = '';
  },
  { immediate: true },
);

function markEntryChanged(category: string, key: string): void {
  operationError.value = '';
  pendingCategories.value.add(category);
  const helpInfo = getHelpInfo(category, key);
  if (helpInfo) helpInfo.modified = true;
}

function addItem(category: string, key: string): void {
  const variants = store.curDice.customTexts?.[category]?.[key];
  if (!variants) return;
  variants.push(['', 1 as any]);
  markEntryChanged(category, key);
}

function removeItem(category: string, key: string, variants: TextVariant[], index: number): void {
  variants.splice(index, 1);
  markEntryChanged(category, key);
}

function resetValue(category: string, key: string): void {
  const helpInfo = getHelpInfo(category, key);
  if (!helpInfo) return;
  const texts = store.curDice.customTexts?.[category];
  if (!texts) return;
  texts[key] = cloneDeep(helpInfo.origin);
  helpInfo.modified = false;
  operationError.value = '';
  pendingCategories.value.add(category);
}

async function askResetValue(category: string, key: string): Promise<void> {
  try {
    await ElMessageBox.confirm('重置这条文案为初始值，确定吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    resetValue(category, key);
    ElMessage.success('已重置为初始值；保存后生效。');
  } catch {
    // The user cancelled the confirmation.
  }
}

function deleteValue(category: string, key: string): void {
  const texts = store.curDice.customTexts?.[category];
  if (!texts) return;
  delete texts[key];
  operationError.value = '';
  pendingCategories.value.add(category);
}

async function askDeleteValue(category: string, key: string): Promise<void> {
  try {
    await ElMessageBox.confirm('删除这条旧版文案，确定吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    deleteValue(category, key);
    ElMessage.success('旧版文案已移除；保存后生效。');
  } catch {
    // The user cancelled the confirmation.
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || '未知错误');
}

async function save(): Promise<void> {
  const pendingSet = pendingCategories.value;
  const categories = [...pendingSet];
  if (categories.length === 0 || isBusy.value) return;

  operationError.value = '';
  saving.value = true;
  try {
    for (const category of categories) {
      if (!store.curDice.customTexts?.[category]) {
        throw new Error(`文案类别“${category}”已不存在，未保存任何更改。`);
      }
      await store.customTextSave(category);
    }
    await store.getCustomText();
    for (const category of categories) pendingSet.delete(category);
    ElMessage.success('文案已保存');
  } catch (error) {
    operationError.value = `保存失败：${errorText(error)}`;
    ElMessage.error(operationError.value);
  } finally {
    saving.value = false;
  }
}

const getPreview = (category: string, key: string, text: string) => {
  const previewInfo = store.curDice.previewInfo as any;
  return previewInfo?.[`${category}:${key}`]?.[text] as any;
};

const getPreviewCheckErr = (category: string, key: string, text: string) => {
  const info = getPreview(category, key, text);
  if (info?.version === 'v2') return Boolean(info.errV2);
  if (info?.version === 'v1') return Boolean(info.errV1);
  return false;
};

const getPreviewInfo = (category: string, key: string, text: string) => {
  const info = getPreview(category, key, text);
  if (!info) return;
  const version = info.version === 'v1' ? 'v1 [建议修改]' : info.version;
  const exists = info.presetExists ? '是' : '否';

  return (
    <div class="preview-details">
      <div>
        <span class="preview-tip-label">引擎版本</span>
        {version}
      </div>
      <div class="whitespace-pre-wrap">
        <span class="preview-tip-label preview-tip-label--v2">V2 预览</span>
        {info.textV2 || info.errV2}
      </div>
      <div class="whitespace-pre-wrap">
        <span class="preview-tip-label preview-tip-label--v1">V1 预览</span>
        {info.textV1 || info.errV1}
      </div>
      <div>
        <span class="preview-tip-label">存在预设</span>
        {exists} [存在时预览较为可靠]
      </div>
    </div>
  );
};

async function refreshPreview(): Promise<void> {
  if (previewLoading.value || isBusy.value) return;
  previewLoading.value = true;
  previewError.value = '';
  const server = store.curDice;
  const category = props.category;
  try {
    await refreshCustomTextPreview(category);
    const data = await getCustomText();
    server.previewInfo = data.previewInfo;
  } catch (error) {
    if (props.category === category && store.curDice === server) {
      previewError.value = `预览失败：${errorText(error)}`;
    }
  } finally {
    previewLoading.value = false;
  }
}

function copied(): void {
  ElMessage.success('已复制导出内容');
}

function importRefresh(): void {
  const indent = importImpact.value ? 0 : 2;
  const title = '某人的自定义配置';
  const items = importOnlyCurrent.value
    ? { [props.category]: store.curDice.customTexts?.[props.category] }
    : store.curDice.customTexts;
  configForImport.value = JSON.stringify({ title, items }, null, indent);
}

watch(dialogImportVisible, visible => {
  if (visible) {
    operationError.value = '';
    importRefresh();
    nextTick(() => {
      clipboard?.destroy();
      const copyButton = document.getElementById('btnCopy1');
      if (copyButton) clipboard = new ClipboardJS(copyButton);
    });
  }
});

watch([importImpact, importOnlyCurrent], () => {
  if (dialogImportVisible.value) importRefresh();
});

async function doImport(): Promise<void> {
  if (isBusy.value) return;

  let data: { title?: unknown; items?: Record<string, unknown> };
  try {
    data = JSON.parse(configForImport.value);
  } catch {
    operationError.value = '格式不正确：请检查 JSON 语法。';
    ElMessage.error(operationError.value);
    return;
  }
  if (!data.title || !data.items || typeof data.items !== 'object' || Array.isArray(data.items)) {
    operationError.value = '格式不正确：需要包含 title 和 items 对象。';
    ElMessage.error(operationError.value);
    return;
  }

  const importCategories = Object.keys(data.items).filter(category =>
    Object.prototype.hasOwnProperty.call(store.curDice.customTexts ?? {}, category),
  );
  if (importCategories.length === 0) {
    operationError.value = '导入内容中没有当前骰子支持的文案类别。';
    ElMessage.error(operationError.value);
    return;
  }

  operationError.value = '';
  importing.value = true;
  const pendingSet = pendingCategories.value;
  const savedCategories: string[] = [];
  try {
    for (const category of importCategories) {
      store.curDice.customTexts[category] = data.items[category] as Record<string, string[][]>;
      pendingSet.add(category);
      await store.customTextSave(category);
      savedCategories.push(category);
    }

    const savedCategorySet = new Set(savedCategories);
    const preservedDrafts = new Map<
      string,
      { texts: Record<string, string[][]>; modified: Record<string, boolean> }
    >();
    for (const category of pendingSet) {
      if (savedCategorySet.has(category)) continue;
      preservedDrafts.set(category, {
        texts: cloneDeep(store.curDice.customTexts[category] ?? {}),
        modified: Object.fromEntries(
          Object.entries(store.curDice.customTextsHelpInfo?.[category] ?? {}).map(([key, info]) => [
            key,
            info.modified,
          ]),
        ),
      });
    }

    await store.getCustomText();
    for (const [category, draft] of preservedDrafts) {
      store.curDice.customTexts[category] = draft.texts;
      const helpInfo = store.curDice.customTextsHelpInfo?.[category] ?? {};
      for (const [key, isModified] of Object.entries(draft.modified)) {
        if (helpInfo[key]) helpInfo[key].modified = isModified;
      }
    }
    for (const category of savedCategories) pendingSet.delete(category);

    ElMessage.success('文案已导入并保存');
    dialogImportVisible.value = false;
  } catch (error) {
    operationError.value = `导入失败：${errorText(error)}`;
    ElMessage.error(operationError.value);
  } finally {
    importing.value = false;
  }
}

onBeforeUnmount(() => clipboard?.destroy());
</script>

<style scoped>
.text-workspace {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  color: var(--seal-text-color);
}

.heading-copy {
  min-width: 0;
}

.header-actions {
  align-items: center;
  justify-content: flex-end;
}

.save-state {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  color: var(--el-color-success);
  font-size: 12px;
  white-space: nowrap;
}

.save-state.is-dirty {
  color: var(--el-color-warning);
}

.status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--el-color-success);
}

.status-dot.warning {
  background: var(--el-color-warning);
}

.help-trigger {
  align-self: flex-start;
  flex: 0 0 auto;
  min-height: 36px;
}
.help-content {
  display: grid;
  gap: 8px;
  padding: 0;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.5;
}

.help-content p {
  margin: 0;
}

.global-variables {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.text-toolbar {
  align-items: center;
  flex: 0 0 auto;
}

.search-field {
  width: min(360px, 100%);
}

.filter-modes {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.filter-modes :deep(.el-radio) {
  min-height: 36px;
  margin-inline-end: 0;
}

.group-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.group-select {
  width: 180px;
}

.result-count,
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.text-workspace-body {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--seal-border-color-light);
  border-radius: var(--el-border-radius-base);
  background: var(--seal-panel-bg);
}

.navigation-pane {
  display: flex;
  flex: 0 0 236px;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-inline-end: 1px solid var(--seal-border-color-light);
  background: var(--seal-surface-soft);
}

.navigation-heading {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
}

.section-title {
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

@media (hover: hover) {
  .entry-link:hover {
    background: var(--seal-surface-muted);
  }
}

.entry-list {
  display: grid;
  flex: 1 1 auto;
  align-content: start;
  gap: 2px;
  min-height: 0;
  overflow-y: auto;
  padding: 0 8px 12px;
}

.entry-link {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: var(--workspace-row-height, 40px);
  gap: 4px;
  padding: 8px 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.entry-link.is-active {
  background: var(--seal-surface-bg);
  box-shadow: inset 2px 0 0 var(--el-color-primary);
}

.entry-link-title {
  overflow-wrap: anywhere;
  font-size: 13px;
}

.entry-link-description {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-list {
  margin: 0;
  padding: 8px 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.workspace-error {
  flex: 0 0 auto;
  margin: 0;
  padding: 8px 12px;
  border-inline-start: 3px solid var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 13px;
}

.editor-pane {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 16px 20px 24px;
  overscroll-behavior: contain;
}

.editor-context {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.editor-context-copy {
  display: flex;
  min-width: 0;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.editor-context-copy .section-title {
  font-size: 15px;
}

.focused-entry {
  max-width: 48%;
  overflow: hidden;
  color: var(--el-color-primary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 6px;
  background: var(--seal-surface-bg);
}

.text-card-heading {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: max(52px, var(--workspace-row-height, 40px));
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 11px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
}

.card-title-group {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.card-title {
  overflow-wrap: anywhere;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.card-description {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-heading-meta {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
}

.text-card-content {
  min-width: 0;
  padding: 0 11px 11px;
}

.text-warning {
  margin: 0 0 10px;
}
.entry-help-text {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.entry-help-text :deep(.el-icon) {
  flex: 0 0 auto;
  margin-top: 2px;
}

.variant-list {
  display: grid;
  gap: var(--workspace-gap, 16px);
}

.variant-row {
  display: grid;
  min-width: 0;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--seal-border-color-light);
}

.variant-row-heading {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.variant-number {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.variant-remove {
  min-width: 40px;
  min-height: 36px;
}

.variant-add {
  justify-self: start;
  min-height: 38px;
}

.card-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--seal-border-color-light);
}

.entry-key {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
}

.entry-actions :deep(.el-button) {
  min-width: 40px;
  min-height: 36px;
}

.mobile-list-control {
  display: none;
}

.empty-state {
  display: grid;
  min-height: 220px;
  place-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.empty-state strong {
  color: var(--el-text-color-primary);
}

.mobile-savebar {
  display: none;
}

.drawer-navigation {
  display: grid;
  align-content: start;
  gap: 4px;
  overflow-y: auto;
}

.import-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 14px;
}

.import-edit :deep(textarea) {
  max-height: 65vh;
  font-family: inherit;
}

.operation-error {
  color: var(--el-color-danger);
}

.preview-pane {
  flex: 0 0 clamp(280px, 30%, 400px);
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  border-inline-start: 1px solid var(--seal-border-color-light);
  background: var(--seal-surface-bg);
  overscroll-behavior: contain;
}

.preview-section + .preview-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--seal-border-color-light);
}

.preview-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-block: 12px;
}

.test-link {
  color: var(--el-color-primary);
  font-size: 13px;
}

.preview-note {
  margin-block: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.preview-variant + .preview-variant {
  margin-top: 16px;
}

.preview-variant .section-title {
  margin-block: 12px 8px;
}

.preview-details {
  margin-top: 8px;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.6;
  white-space: normal;
  overflow-wrap: anywhere;
}

.preview-tip-label {
  display: block;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
}

.variable-label {
  margin-block: 12px 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 1199px) and (min-width: 768px) {
  .text-workspace-body {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(180px, 35%);
  }

  .navigation-pane {
    grid-row: 1 / 3;
  }

  .preview-pane {
    grid-column: 2;
    border-inline-start: 0;
    border-top: 1px solid var(--seal-border-color-light);
  }
}

.preview-tip-label--v2 {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.preview-tip-label--v1 {
  border-color: var(--el-color-warning);
  color: var(--el-color-warning);
}

@media (max-width: 899px) {
  .editor-pane {
    padding: 12px 14px 18px;
  }

  .focused-entry {
    display: none;
  }
}

@media (max-width: 767px) {
  .text-workspace {
    padding: 12px;
    gap: 10px;
  }

  .text-workspace-header {
    align-items: flex-start;
    gap: 8px;
  }

  .heading-copy {
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .save-state {
    margin-right: auto;
    font-size: 12px;
  }

  .desktop-save-action {
    display: none;
  }

  .help-trigger {
    min-height: 44px;
  }

  .help-content {
    padding-inline: 12px;
    font-size: 14px;
  }

  .text-toolbar {
    align-items: stretch;
    gap: 8px;
  }

  .search-field {
    width: 100%;
  }

  .search-field :deep(input) {
    font-size: 16px;
  }

  .filter-modes {
    gap: 2px 8px;
  }

  .filter-modes :deep(.el-radio) {
    min-height: 44px;
  }

  .group-filter {
    min-height: 44px;
  }

  .group-select {
    flex: 1;
  }

  .text-workspace-body {
    flex-direction: column;
    overflow-y: auto;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .navigation-pane {
    display: none;
  }
  .entry-link {
    min-height: max(44px, var(--workspace-row-height, 40px));
  }

  .header-actions :deep(.el-button) {
    min-height: 44px;
  }

  .search-field :deep(.el-input__wrapper),
  .group-select :deep(.el-input__wrapper) {
    min-height: 44px;
  }
  .text-card-content :deep(textarea),
  .import-edit :deep(textarea) {
    font-size: 16px;
  }

  .editor-pane {
    flex: 0 0 auto;
    overflow: visible;
    padding: 0 0 10px;
  }

  .preview-pane {
    flex: 0 0 auto;
    overflow: visible;
    padding: 16px 10px;
    border-inline-start: 0;
    border-top: 1px solid var(--seal-border-color-light);
  }

  .preview-note,
  .preview-details,
  .variable-label {
    font-size: 14px;
  }

  .preview-actions :deep(.el-button),
  .test-link {
    min-height: 44px;
  }

  .test-link {
    display: inline-flex;
    align-items: center;
  }

  .mobile-list-control {
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .mobile-list-control :deep(.el-button) {
    min-height: 44px;
  }

  .mobile-category {
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-context {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 8px;
  }

  .text-card-heading {
    min-height: max(52px, var(--workspace-row-height, 40px));
    padding-inline: 9px;
  }

  .text-card-content {
    padding: 0 9px 9px;
  }

  .variant-remove,
  .entry-actions :deep(.el-button) {
    min-width: 44px;
    min-height: 44px;
  }

  .variant-add {
    min-height: 44px;
  }

  .mobile-savebar {
    display: flex;
    position: sticky;
    z-index: 2;
    bottom: 0;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 0 max(8px, env(safe-area-inset-bottom));
    background: var(--seal-panel-bg);
  }

  .savebar-message {
    min-width: 0;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .mobile-savebar :deep(.el-button) {
    min-height: 44px;
    flex: 0 0 auto;
  }
}
</style>
