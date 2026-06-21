<template>
  <el-drawer
    v-model="drawerVisible"
    class="package-installed-drawer"
    direction="rtl"
    :size="size"
    title="扩展包详情">
    <main v-loading="loading" class="package-drawer-body">
      <el-empty v-if="!data" description="请选择一个扩展包" />
      <template v-else>
        <header class="package-drawer-header">
          <el-space wrap>
            <el-text size="large" tag="strong">{{ packageMeta.name }}</el-text>
            <el-tag size="small">{{ packageMeta.version }}</el-tag>
            <el-tag :type="stateTagType" size="small">{{ stateLabel }}</el-tag>
            <el-tag v-if="data.sourceStatus" :type="sourceStatusTagType" size="small">
              {{ sourceStatusLabel }}
            </el-tag>
          </el-space>
          <el-text class="package-description" tag="p">
            {{ packageMeta.description || '暂无简介' }}
          </el-text>
          <el-alert
            v-if="data.sourceWarning"
            type="warning"
            :closable="false"
            show-icon
            :title="data.sourceWarning" />
        </header>

        <el-tabs v-model="activeTab" stretch>
          <el-tab-pane label="信息" name="info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="包 ID">{{ packageMeta.id }}</el-descriptions-item>
              <el-descriptions-item label="作者">
                {{ packageMeta.authors?.join(', ') || '未知' }}
              </el-descriptions-item>
              <el-descriptions-item label="许可协议">
                {{ packageMeta.license || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="主页">
                {{ packageMeta.homepage || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="仓库">
                {{ packageMeta.repository || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="安装时间">
                {{ formatTime(data.installTime) }}
              </el-descriptions-item>
              <el-descriptions-item label="安装路径">
                {{ data.installPath || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="源路径">
                {{ data.sourcePath || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="用户数据">
                {{ data.userDataPath || '-' }}
              </el-descriptions-item>
              <el-descriptions-item v-if="data.errText" label="错误">
                <el-text type="danger">{{ data.errText }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="内容" name="contents">
            <el-empty v-if="contentEntries.length === 0" description="该包未声明内容" />
            <el-descriptions v-else :column="1" border>
              <el-descriptions-item
                v-for="entry in contentEntries"
                :key="entry.kind"
                :label="entry.kind">
                {{ entry.files.join(', ') || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="依赖/权限" name="permissions">
            <section class="package-drawer-section">
              <el-text tag="strong">依赖</el-text>
              <el-empty v-if="dependencyEntries.length === 0" description="无依赖" />
              <el-descriptions v-else :column="1" border>
                <el-descriptions-item
                  v-for="entry in dependencyEntries"
                  :key="entry.name"
                  :label="entry.name">
                  {{ entry.version }}
                </el-descriptions-item>
              </el-descriptions>
            </section>

            <section class="package-drawer-section">
              <el-text tag="strong">权限</el-text>
              <el-empty v-if="permissionEntries.length === 0" description="无权限声明" />
              <el-descriptions v-else :column="1" border>
                <el-descriptions-item
                  v-for="entry in permissionEntries"
                  :key="entry.name"
                  :label="entry.name">
                  {{ entry.value }}
                </el-descriptions-item>
              </el-descriptions>
            </section>
          </el-tab-pane>

          <el-tab-pane label="配置" name="config">
            <section class="package-drawer-section">
              <el-space wrap>
                <el-text tag="strong">当前配置</el-text>
                <el-button
                  v-if="canEditConfig"
                  type="primary"
                  size="small"
                  :loading="saving"
                  @click="saveConfig">
                  保存配置
                </el-button>
              </el-space>
              <el-input
                v-if="canEditConfig"
                v-model="editableConfig"
                class="package-config-editor"
                type="textarea"
                :rows="10" />
              <pre v-else class="json-block">{{ prettyJson(configData) }}</pre>
            </section>

            <section class="package-drawer-section">
              <el-text tag="strong">配置 Schema</el-text>
              <pre class="json-block">{{ prettyJson(configSchema) }}</pre>
            </section>
          </el-tab-pane>
        </el-tabs>
      </template>
    </main>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PackageInstance, PackageState } from '~/api/package';
import { formatTime } from './time';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    size?: string;
    loading?: boolean;
    saving?: boolean;
    data: PackageInstance | null;
    configData?: Record<string, unknown> | null;
    configSchema?: Record<string, unknown> | null;
  }>(),
  {
    size: '56%',
    loading: false,
    saving: false,
    configData: null,
    configSchema: null,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save-config': [value: Record<string, unknown>];
}>();

const activeTab = ref('info');
const editableConfig = ref('');

const drawerVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const emptyPackageMeta = {
  id: '-',
  name: '-',
  version: '-',
  authors: [] as string[],
  license: '',
  description: '',
  homepage: '',
  repository: '',
};

const packageMeta = computed(() => props.data?.manifest.package ?? emptyPackageMeta);

const stateTextMap: Record<PackageState, string> = {
  enabled: '已启用',
  disabled: '已停用',
  error: '异常',
  installed: '已安装',
};

const stateLabel = computed(() => (props.data ? stateTextMap[props.data.state] : '-'));
const stateTagType = computed(() => {
  switch (props.data?.state) {
    case 'enabled':
      return 'success';
    case 'disabled':
      return 'info';
    case 'error':
      return 'danger';
    case 'installed':
    default:
      return 'primary';
  }
});

const sourceStatusLabel = computed(() =>
  props.data?.sourceStatus === 'cache_only' ? '仅缓存' : '源文件存在',
);
const sourceStatusTagType = computed(() =>
  props.data?.sourceStatus === 'cache_only' ? 'warning' : 'success',
);

const contentEntries = computed(() => {
  const contents = props.data?.manifest.contents;
  if (!contents) {
    return [];
  }
  return Object.entries(contents).map(([kind, files]) => ({ kind, files }));
});

const dependencyEntries = computed(() => {
  return Object.entries(props.data?.manifest.dependencies ?? {}).map(([name, version]) => ({
    name,
    version,
  }));
});

const stringifyEntryValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.join('、');
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  return String(value);
};

const permissionEntries = computed(() => {
  return Object.entries(props.data?.manifest.permissions ?? {}).map(([name, value]) => ({
    name,
    value: stringifyEntryValue(value),
  }));
});

const hasEntries = (value?: Record<string, unknown> | null) => {
  return value !== undefined && value !== null && Object.keys(value).length > 0;
};

const canEditConfig = computed(() => hasEntries(props.configSchema));

const prettyJson = (value?: Record<string, unknown> | null) => {
  if (!value || Object.keys(value).length === 0) {
    return '{}';
  }
  return JSON.stringify(value, null, 2);
};

const resetEditableConfig = () => {
  editableConfig.value = prettyJson(props.configData);
};

watch(
  () => props.configData,
  () => resetEditableConfig(),
  { immediate: true },
);

const saveConfig = () => {
  try {
    const parsed = JSON.parse(editableConfig.value) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      ElMessage.error('配置 JSON 必须是对象');
      return;
    }
    emit('save-config', parsed as Record<string, unknown>);
  } catch {
    ElMessage.error('配置 JSON 格式有误');
  }
};
</script>

<style scoped lang="css">
.package-drawer-body {
  min-height: 100%;
}

.package-drawer-header {
  margin-bottom: 1rem;
}

.package-description {
  display: block;
  margin: 0.75rem 0;
  white-space: pre-line;
}

.package-drawer-section {
  margin-bottom: 1rem;
}

.json-block {
  box-sizing: border-box;
  max-height: 16rem;
  overflow: auto;
  padding: 0.75rem;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-light);
  white-space: pre-wrap;
  word-break: break-word;
}

.package-config-editor {
  margin-top: 0.75rem;
}

@media screen and (max-width: 768px) {
  :global(.package-installed-drawer) {
    width: 92% !important;
  }
}
</style>
