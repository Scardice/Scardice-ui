<template>
  <section class="activity-section" aria-labelledby="activity-title">
    <div class="section-heading">
      <div>
        <h2 id="activity-title">管理操作记录</h2>
        <p class="section-caption">显示最近 20 条服务器记录，跨设备共享。</p>
      </div>
      <el-button
        class="workspace-section-action"
        :icon="Refresh"
        :loading="loading"
        @click="refresh">
        刷新记录
      </el-button>
    </div>

    <p v-if="error" class="activity-message activity-message--error" role="status">
      {{ items.length ? `刷新失败；以下为 ${lastFetchedLabel} 获取的记录。` : error }}
    </p>
    <p
      v-else-if="loading && items.length > 0 && lastFetchedLabel"
      class="activity-message"
      role="status">
      正在刷新；以下为 {{ lastFetchedLabel }} 获取的记录。
    </p>
    <p v-else-if="lastFetchedLabel" class="activity-message" role="status">
      更新于 {{ lastFetchedLabel }}
    </p>

    <div v-if="loading && items.length === 0" class="activity-empty" role="status">
      正在读取管理操作记录……
    </div>
    <div v-else-if="items.length === 0 && !error" class="activity-empty">
      目前没有可显示的管理操作记录。
    </div>
    <ol v-else-if="items.length" class="activity-list" aria-label="最近管理操作">
      <li v-for="item in items" :key="item.id" class="activity-item">
        <div class="activity-item__heading">
          <h3>{{ item.label }}</h3>
          <time :datetime="toDateTime(item.occurredAt)">{{ formatTime(item.occurredAt) }}</time>
        </div>
        <div class="activity-item__meta">
          <span class="activity-status" :class="`activity-status--${item.status}`">
            {{ statusLabel[item.status] }}
          </span>
          <span class="activity-actor">操作人：{{ item.actor }}</span>
          <span>HTTP {{ item.httpStatus }}</span>
        </div>
        <p class="activity-source">
          <span>来源 IP</span>
          <code>{{ item.sourceIP }}</code>
        </p>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { getRecentActivity, type ManagementActivityItem } from '~/api/activity';

const items = ref<ManagementActivityItem[]>([]);
const loading = ref(true);
const error = ref('');
const lastFetchedAt = ref<number | null>(null);
const lastFetchedLabel = computed(() =>
  lastFetchedAt.value === null ? '' : dayjs(lastFetchedAt.value).format('YYYY-MM-DD HH:mm:ss'),
);
const statusLabel = {
  succeeded: '成功',
  accepted: '已受理',
  failed: '失败',
} as const;

let active = false;
let requestInFlight = false;
let pollTimer: ReturnType<typeof setInterval> | undefined;

function formatTime(timestamp: number) {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

function toDateTime(timestamp: number) {
  return new Date(timestamp).toISOString();
}

async function refresh() {
  if (requestInFlight) return;
  requestInFlight = true;
  loading.value = true;
  error.value = '';
  try {
    const response = await getRecentActivity(20);
    if (!active) return;
    items.value = response.items;
    lastFetchedAt.value = response.timestamp;
  } catch {
    if (active) error.value = '无法读取管理操作记录，请点击右上角“刷新记录”重试。';
  } finally {
    requestInFlight = false;
    if (active) loading.value = false;
  }
}

function refreshWhenVisible() {
  if (document.visibilityState === 'visible') void refresh();
}

onMounted(() => {
  active = true;
  void refresh();
  pollTimer = setInterval(refreshWhenVisible, 60_000);
  window.addEventListener('focus', refreshWhenVisible);
  document.addEventListener('visibilitychange', refreshWhenVisible);
});

onUnmounted(() => {
  active = false;
  if (pollTimer) clearInterval(pollTimer);
  window.removeEventListener('focus', refreshWhenVisible);
  document.removeEventListener('visibilitychange', refreshWhenVisible);
});
</script>

<style scoped>
.activity-section {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.section-heading {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.section-heading > div {
  min-width: 0;
  flex: 1 1 220px;
}

.section-heading h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.section-caption,
.activity-message {
  margin: 3px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.activity-message {
  flex: 0 0 auto;
}

.activity-message--error {
  color: var(--el-color-danger);
}

.activity-empty {
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  text-align: center;
  flex: 1 1 auto;
}

.activity-list {
  margin: 0;
  padding: 0;
  list-style: none;
  min-height: 0;
  flex: 1 1 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding-inline-end: 12px;
  overscroll-behavior: contain;
}

.activity-item {
  min-width: 0;
  padding: 12px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.activity-item__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.activity-item__heading h3 {
  min-width: 0;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.activity-item__heading time,
.activity-item__meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.activity-item__heading time {
  flex: 0 0 auto;
  white-space: nowrap;
}

.activity-item__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 5px;
}

.activity-status {
  font-weight: 600;
}

.activity-status--succeeded {
  color: var(--el-color-success);
}

.activity-status--accepted {
  color: var(--el-color-warning);
}

.activity-status--failed {
  color: var(--el-color-danger);
}

.activity-actor {
  overflow-wrap: anywhere;
}

.activity-source {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.activity-source code {
  min-width: 0;
  max-width: 100%;
  justify-self: start;
  color: var(--el-text-color-primary);
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 1023px) {
  .activity-section {
    display: block;
    min-height: auto;
  }

  .activity-empty {
    flex: none;
  }

  .activity-list {
    min-height: auto;
    flex: none;
    overflow: visible;
  }
}

@media (max-width: 767px) {
  .section-heading {
    align-items: flex-start;
  }

  .activity-item__heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
  .activity-item__heading time {
    white-space: normal;
  }

  .section-caption,
  .activity-message,
  .activity-empty,
  .activity-item__heading h3,
  .activity-item__heading time,
  .activity-item__meta,
  .activity-source {
    font-size: 16px;
  }
}
</style>
