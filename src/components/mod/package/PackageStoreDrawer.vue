<template>
  <el-drawer v-model="visible" :size="size" direction="rtl" destroy-on-close>
    <template #header>
      <el-space wrap>
        <el-text size="large" tag="strong">{{ data?.name || '商店扩展包详情' }}</el-text>
        <el-tag v-if="data?.version" size="small">{{ data.version }}</el-tag>
        <el-tag v-if="data?.installed" size="small" type="success">已安装</el-tag>
      </el-space>
    </template>

    <el-empty v-if="!data" description="请选择一个商店扩展包" />

    <template v-else>
      <section class="drawer-section">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="名称">{{ data.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="包 ID">{{ data.id }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ data.version || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ joinList(data.authors) }}</el-descriptions-item>
          <el-descriptions-item label="许可证">{{ data.license || '-' }}</el-descriptions-item>
          <el-descriptions-item label="简介">
            <span class="break-text">{{ data.description || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="主页">
            <el-link
              v-if="data.homepage"
              :href="data.homepage"
              target="_blank"
              rel="noopener noreferrer">
              {{ data.homepage }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="仓库">
            <el-link
              v-if="data.repository"
              :href="data.repository"
              target="_blank"
              rel="noopener noreferrer">
              {{ data.repository }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="SealDice 版本">
            {{ data.seal.minVersion || '-' }} ~ {{ data.seal.maxVersion || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="drawer-section">
        <el-text tag="strong">内容类型</el-text>
        <div class="tag-row">
          <el-tag v-for="content in data.contents" :key="content" size="small">
            {{ contentKindLabel(content) }}
          </el-tag>
          <el-empty v-if="data.contents.length === 0" description="未标注内容类型" />
        </div>
      </section>

      <section class="drawer-section">
        <el-text tag="strong">依赖</el-text>
        <el-table v-if="dependencyEntries.length > 0" :data="dependencyEntries" size="small">
          <el-table-column prop="key" label="包" min-width="160" />
          <el-table-column prop="value" label="版本" min-width="160" />
        </el-table>
        <el-empty v-else description="无依赖" />
      </section>

      <section class="drawer-section">
        <el-text tag="strong">商店资源</el-text>
        <el-descriptions
          v-if="storeAssetEntries.length > 0"
          :column="1"
          border
          class="drawer-descriptions">
          <el-descriptions-item v-for="item in storeAssetEntries" :key="item.key" :label="item.key">
            <span class="break-text">{{ item.value }}</span>
          </el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="无资源信息" />
      </section>

      <section class="drawer-section">
        <el-text tag="strong">下载信息</el-text>
        <el-descriptions :column="1" border class="drawer-descriptions">
          <el-descriptions-item label="下载地址">
            <span class="break-text">{{ data.download.url || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="发布时间">
            {{ formatTime(data.download.releaseTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatTime(data.download.updateTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="下载次数">
            {{ data.download.downloadCount ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="校验值">
            <pre class="json-block">{{ prettyJson(data.download.hash ?? {}) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </section>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ContentKind } from '~/api/package';
import type { StorePackage } from '~/api/store';
import { formatTime } from './time';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    size?: string;
    data: StorePackage | null;
  }>(),
  {
    size: '56%',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const contentKindLabels: Record<ContentKind, string> = {
  scripts: 'JS 扩展',
  decks: '牌堆',
  reply: '自定义回复',
  helpdoc: '帮助文档',
  templates: '模板',
};

const dependencyEntries = computed(() => {
  return Object.entries(props.data?.dependencies ?? {}).map(([key, value]) => ({ key, value }));
});

const storeAssetEntries = computed(() => {
  return Object.entries(props.data?.storeAssets ?? {}).flatMap(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) {
      return [];
    }
    const value = Array.isArray(rawValue) ? rawValue.join('\n') : String(rawValue);
    return value ? [{ key, value }] : [];
  });
});

const joinList = (value: string[] | undefined) => {
  return value && value.length > 0 ? value.join('、') : '-';
};

const contentKindLabel = (value: ContentKind) => contentKindLabels[value] ?? value;

const prettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};
</script>

<style scoped lang="css">
.drawer-section {
  margin-bottom: 1.25rem;
}

.drawer-descriptions {
  margin-top: 0.75rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.break-text {
  white-space: pre-wrap;
  word-break: break-all;
}

.json-block {
  max-height: 12rem;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
