<template>
  <section class="workspace-page logs-workspace" aria-labelledby="logs-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="logs-workspace-title" class="workspace-title">实时日志</h1>
        <p class="workspace-subtitle">查看核心日志快照与实时更新；暂停后恢复时会重新读取快照。</p>
      </div>
      <div class="stream-status" :class="`stream-status--${streamStatus}`" role="status">
        <i class="status-dot" aria-hidden="true"></i>
        {{ streamStatusLabel }}
      </div>
    </header>

    <div class="workspace-toolbar log-toolbar">
      <label class="sr-only" for="log-search">搜索日志时间、级别、来源或消息</label>
      <div class="search-wrap">
        <el-icon aria-hidden="true"><Search /></el-icon>
        <input
          id="log-search"
          v-model="search"
          name="log-search"
          type="search"
          autocomplete="off"
          placeholder="搜索时间、来源或消息" />
      </div>
      <div
        v-if="availableLevels.length"
        class="log-level-filters"
        role="group"
        aria-label="日志级别筛选">
        <button
          v-for="level in availableLevels"
          :key="level"
          type="button"
          :class="['level-filter', levelTypeClass(level), { 'is-muted': !isLevelEnabled(level) }]"
          :aria-pressed="isLevelEnabled(level)"
          @click="toggleLevel(level)">
          {{ levelLabel(level) }}
        </button>
      </div>
      <span v-else class="no-levels">当前没有可用的日志级别</span>
      <span class="toolbar-spacer"></span>
      <span class="result-count">显示 {{ visibleLogs.length }} / {{ allLogs.length }} 条</span>
      <button
        type="button"
        class="toolbar-toggle"
        :aria-pressed="followLatest"
        @click="followLatest = !followLatest">
        跟随最新 <span>{{ followLatest ? '开' : '关' }}</span>
      </button>
      <button
        type="button"
        class="toolbar-toggle pause-toggle"
        :aria-pressed="isPaused"
        @click="togglePause">
        <el-icon aria-hidden="true"><VideoPlay v-if="isPaused" /><VideoPause v-else /></el-icon>
        {{ isPaused ? '恢复更新' : '暂停更新' }}
      </button>
    </div>

    <div ref="feedViewport" class="workspace-body log-feed-viewport" aria-label="核心日志记录">
      <div class="log-feed">
        <div class="log-feed-head" aria-hidden="true">
          <span>时间</span>
          <span>级别</span>
          <span>来源 / 模块</span>
          <span>消息</span>
        </div>
        <ol class="log-entries" aria-label="核心日志记录">
          <li
            v-for="(log, index) in visibleLogs"
            :key="`${log.ts}-${log.level}-${index}`"
            class="log-entry">
            <button
              type="button"
              class="log-row"
              :class="{ 'log-row--with-source': logSource(log) }"
              :aria-label="logAccessibleName(log)"
              @click="openDetails(log)">
              <time class="log-time" :datetime="formatIsoTime(log.ts)">
                {{ formatTime(log.ts) }}
              </time>
              <span class="log-level" :class="levelTypeClass(log.level)">
                {{ levelLabel(log.level) }}
              </span>
              <span v-if="logSource(log)" class="log-source">{{ logSource(log) }}</span>
              <span class="log-message" :class="logToneClass(log)">
                <LogRichContent :content="log.msg" />
              </span>
            </button>
          </li>
        </ol>
        <div v-if="visibleLogs.length === 0" class="log-empty" role="status">
          <strong>{{ allLogs.length ? '没有匹配的日志' : '当前没有可显示的日志' }}</strong>
          <span v-if="allLogs.length">更改搜索条件或重新启用日志级别筛选。</span>
          <span v-else>收到后端日志后会显示在这里。</span>
          <button v-if="allLogs.length" type="button" @click="clearFilters">清除筛选</button>
        </div>
      </div>
    </div>

    <el-drawer
      v-model="detailsVisible"
      class="log-detail-drawer"
      direction="rtl"
      size="560px"
      :with-header="false"
      :destroy-on-close="false">
      <template v-if="selectedLog">
        <div class="log-drawer-header">
          <div>
            <span class="drawer-eyebrow">核心日志 · 原始记录</span>
            <h2>日志详情</h2>
          </div>
          <button
            type="button"
            class="drawer-close"
            aria-label="关闭日志详情"
            @click="detailsVisible = false">
            ×
          </button>
        </div>

        <div class="log-drawer-content">
          <dl class="log-detail-metadata">
            <div>
              <dt>时间</dt>
              <dd>
                {{ formatFullTime(selectedLog.ts) }}
                <span v-if="formatIsoTime(selectedLog.ts)" class="log-iso">
                  {{ formatIsoTime(selectedLog.ts) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>级别</dt>
              <dd>
                <span class="log-level" :class="levelTypeClass(selectedLog.level)">
                  {{ levelLabel(selectedLog.level) }}
                </span>
              </dd>
            </div>
            <div v-if="selectedLog.module">
              <dt>模块</dt>
              <dd>{{ selectedLog.module }}</dd>
            </div>
            <div v-if="selectedLog.caller">
              <dt>调用方</dt>
              <dd>{{ selectedLog.caller }}</dd>
            </div>
            <div>
              <dt>消息</dt>
              <dd class="log-detail-message" :class="logToneClass(selectedLog)">
                <LogRichContent :content="selectedLog.msg" />
              </dd>
            </div>
          </dl>

          <section class="raw-payload-section" aria-labelledby="raw-payload-title">
            <div class="payload-heading">
              <h3 id="raw-payload-title">原始日志载荷</h3>
              <button type="button" class="copy-button" @click="copyPayload">
                <el-icon aria-hidden="true"><CopyDocument /></el-icon>
                复制
              </button>
            </div>
            <p v-if="copyFeedback" class="copy-feedback" role="status">{{ copyFeedback }}</p>
            <pre class="raw-payload" tabindex="0"><code>{{ rawPayload }}</code></pre>
          </section>
        </div>
      </template>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { CopyDocument, Search, VideoPause, VideoPlay } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import LogRichContent from '~/components/utils/log-rich-content.vue';
import { useStore } from '~/store';

type SysLog = {
  level: string;
  ts: number;
  caller: string;
  module?: string;
  msg: string;
};
type StreamStatus = 'loading' | 'connected' | 'reconnecting' | 'paused' | 'unavailable';

const store = useStore();
const allLogs = computed(() => store.curDice.logs as SysLog[]);
const search = ref('');
const disabledLevels = ref<string[]>([]);
const followLatest = ref(true);
const isPaused = ref(false);
const isActive = ref(false);
const selectedLog = ref<SysLog | null>(null);
const detailsVisible = ref(false);
const copyFeedback = ref('');
const feedViewport = ref<HTMLElement | null>(null);
const streamStatus = ref<StreamStatus>('loading');
let logSSE: EventSource | null = null;

const availableLevels = computed(() => {
  const levels = new Set(allLogs.value.map(log => log.level).filter(level => !!level));
  const preference = ['debug', 'info', 'warn', 'error'];
  return [...levels].sort((left, right) => {
    const leftOrder = preference.indexOf(left.toLowerCase());
    const rightOrder = preference.indexOf(right.toLowerCase());
    if (leftOrder >= 0 || rightOrder >= 0) {
      if (leftOrder < 0) return 1;
      if (rightOrder < 0) return -1;
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right);
  });
});

const visibleLogs = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return allLogs.value.filter(log => {
    if (disabledLevels.value.includes(log.level)) return false;
    if (!query) return true;
    return [
      log.level,
      log.module || '',
      log.caller || '',
      log.msg,
      formatTime(log.ts),
      formatFullTime(log.ts),
    ].some(value => value.toLocaleLowerCase().includes(query));
  });
});

const streamStatusLabel = computed(() => {
  switch (streamStatus.value) {
    case 'connected':
      return '实时更新中';
    case 'reconnecting':
      return '连接中断，正在重连';
    case 'paused':
      return '更新已暂停';
    case 'unavailable':
      return '实时日志不可用';
    default:
      return '正在连接日志流';
  }
});
const rawPayload = computed(() =>
  selectedLog.value ? JSON.stringify(selectedLog.value, null, 2) : '',
);

function getLogLimit() {
  const raw = Number(store.curDice.config?.logPageItemLimit ?? 100);
  if (!Number.isFinite(raw) || raw <= 0) return 100;
  return Math.floor(raw);
}

function trimLogs(logs: SysLog[]) {
  const limit = getLogLimit();
  return logs.length > limit ? logs.slice(logs.length - limit) : logs;
}

function logSource(log: SysLog) {
  return log.module || log.caller || '';
}

function formatTime(timestamp: number) {
  return dayjs.unix(timestamp).format('HH:mm:ss');
}

function formatFullTime(timestamp: number) {
  return dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

function formatIsoTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

const levelLabels: Record<string, string> = {
  debug: '调试',
  info: '信息',
  warn: '警告',
  warning: '警告',
  error: '错误',
  dpanic: '严重',
  panic: '严重',
  fatal: '严重',
};

function levelLabel(level: string) {
  return levelLabels[level.toLowerCase()] ?? level;
}

function levelTypeClass(level: string) {
  switch (level.toLowerCase()) {
    case 'debug':
      return 'level-debug';
    case 'info':
      return 'level-info';
    case 'warn':
    case 'warning':
      return 'level-warn';
    case 'error':
      return 'level-error';
    default:
      return 'level-other';
  }
}

function logToneClass(log: SysLog) {
  if (log.msg.startsWith('onebot | ')) return 'log-tone--warning';
  if (log.msg.startsWith('发给')) return 'log-tone--primary';
  if (log.level === 'warn' || log.level === 'warning') return 'log-tone--warning';
  if (log.level === 'error') return 'log-tone--danger';
  return '';
}

function isLevelEnabled(level: string) {
  return !disabledLevels.value.includes(level);
}

function toggleLevel(level: string) {
  disabledLevels.value = isLevelEnabled(level)
    ? [...disabledLevels.value, level]
    : disabledLevels.value.filter(item => item !== level);
}

function clearFilters() {
  search.value = '';
  disabledLevels.value = [];
}

function logAccessibleName(log: SysLog) {
  const source = logSource(log);
  const sourceText = source ? `，${source}` : '';
  return `${formatFullTime(log.ts)}，${log.level}${sourceText}：${log.msg}。打开详情`;
}

function scrollToLatest() {
  const viewport = feedViewport.value;
  if (viewport && followLatest.value && isActive.value) {
    viewport.scrollTop = viewport.scrollHeight;
  }
}

function closeLogStream() {
  const source = logSSE;
  logSSE = null;
  source?.close();
}

function openLogStream() {
  if (!isActive.value || isPaused.value || logSSE) return;
  if (!store.canAccess || !store.token) {
    streamStatus.value = 'unavailable';
    return;
  }

  streamStatus.value = 'loading';
  const token = encodeURIComponent(store.token);
  const source = new EventSource(`/sd-api/log/stream?token=${token}`);
  logSSE = source;

  source.onopen = () => {
    if (logSSE === source) streamStatus.value = 'connected';
  };
  source.addEventListener('snapshot', event => {
    if (logSSE !== source || isPaused.value || !isActive.value) return;
    try {
      const data = JSON.parse((event as MessageEvent).data);
      if (Array.isArray(data)) {
        store.curDice.logs = trimLogs(data as SysLog[]);
        streamStatus.value = 'connected';
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('日志快照解析失败', error);
    }
  });
  source.addEventListener('log', event => {
    if (logSSE !== source || isPaused.value || !isActive.value) return;
    try {
      const data = JSON.parse((event as MessageEvent).data) as SysLog;
      const merged = [...(store.curDice.logs as SysLog[]), data];
      store.curDice.logs = trimLogs(merged);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('日志解析失败', error);
    }
  });
  source.onerror = () => {
    if (logSSE === source) streamStatus.value = 'reconnecting';
  };
}

function activateFeed() {
  isActive.value = true;
  if (isPaused.value) {
    streamStatus.value = 'paused';
    return;
  }
  openLogStream();
  void nextTick(scrollToLatest);
}

function deactivateFeed() {
  isActive.value = false;
  closeLogStream();
  if (!isPaused.value) streamStatus.value = 'loading';
}

function togglePause() {
  isPaused.value = !isPaused.value;
  if (isPaused.value) {
    closeLogStream();
    streamStatus.value = 'paused';
    return;
  }
  openLogStream();
}

function openDetails(log: SysLog) {
  selectedLog.value = log;
  copyFeedback.value = '';
  detailsVisible.value = true;
}

async function copyPayload() {
  if (!selectedLog.value) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(JSON.stringify(selectedLog.value, null, 2));
    copyFeedback.value = '原始日志载荷已复制。';
  } catch {
    copyFeedback.value = '浏览器未开放剪贴板写入；可选中下方内容手动复制。';
  }
}

watch(
  () => store.curDice.logs,
  async () => {
    if (!followLatest.value || !isActive.value) return;
    await nextTick();
    scrollToLatest();
  },
);

watch(
  () => [store.token, store.canAccess],
  () => {
    if (!isActive.value) return;
    closeLogStream();
    if (isPaused.value) {
      streamStatus.value = 'paused';
    } else {
      openLogStream();
    }
  },
);

watch(followLatest, async enabled => {
  if (!enabled || !isActive.value) return;
  await nextTick();
  scrollToLatest();
});

onMounted(activateFeed);
onActivated(activateFeed);
onDeactivated(deactivateFeed);
onUnmounted(deactivateFeed);
</script>

<style scoped>
.logs-workspace {
  min-width: 0;
}

.stream-status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-primary);
}

.stream-status--connected .status-dot {
  background: var(--el-color-success);
}

.stream-status--reconnecting .status-dot {
  background: var(--el-color-warning);
}

.stream-status--paused .status-dot,
.stream-status--unavailable .status-dot {
  background: var(--el-text-color-placeholder);
}

.log-toolbar {
  flex: 0 0 auto;
  align-items: center;
}

.search-wrap {
  display: flex;
  width: min(360px, 100%);
  min-width: 220px;
  height: 36px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  color: var(--el-text-color-secondary);
  background: var(--seal-input-bg);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.search-wrap:focus-within {
  border-color: var(--el-color-primary);
  outline: 2px solid color-mix(in srgb, var(--el-color-primary) 24%, transparent);
  outline-offset: 1px;
}

.search-wrap input {
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 0;
  color: var(--el-text-color-primary);
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 13px;
}

.search-wrap input::placeholder {
  color: var(--el-text-color-placeholder);
}

.log-level-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.level-filter {
  min-width: 52px;
  min-height: 32px;
  padding: 0 8px;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}

.level-filter[aria-pressed='true'] {
  background: var(--seal-surface-soft);
  border-color: currentColor;
}

.level-filter.is-muted {
  color: var(--el-text-color-placeholder);
  opacity: 0.72;
}

.level-filter.level-debug,
.log-level.level-debug {
  color: var(--el-text-color-secondary);
}

.level-filter.level-info,
.log-level.level-info {
  color: var(--el-text-color-regular);
}

.level-filter.level-warn,
.log-level.level-warn {
  color: var(--el-color-warning);
}

.level-filter.level-error,
.log-level.level-error {
  color: var(--el-color-danger);
}

.no-levels,
.result-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.toolbar-spacer {
  flex: 1 1 auto;
}

.toolbar-toggle {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 10px;
  color: var(--el-text-color-regular);
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 5px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.toolbar-toggle[aria-pressed='true'] {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.pause-toggle .el-icon {
  font-size: 15px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.log-feed-viewport {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  padding-inline-end: 12px;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

.log-feed-head,
.log-row {
  display: grid;
  grid-template-columns: 100px 72px minmax(120px, 220px) minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
  padding-inline: 16px;
}

.log-feed-head {
  position: sticky;
  z-index: 1;
  top: 0;
  min-height: 36px;
  color: var(--el-text-color-secondary);
  background: var(--seal-table-header-bg);
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
}

.log-entries {
  margin: 0;
  padding: 0;
  list-style: none;
}

.log-entry {
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.log-row {
  width: 100%;
  min-height: var(--workspace-row-height, 40px);
  padding-block: 8px;
  color: var(--el-text-color-primary);
  text-align: left;
  background: transparent;
  border: 0;
  font: inherit;
  cursor: pointer;
}

.log-row:not(.log-row--with-source) {
  grid-template-columns: 100px 72px minmax(0, 1fr);
}

.log-row:hover {
  background: var(--seal-surface-soft);
}

.log-row:focus-visible,
.level-filter:focus-visible,
.toolbar-toggle:focus-visible,
.log-empty button:focus-visible,
.drawer-close:focus-visible,
.copy-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.log-time {
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.log-level {
  display: inline-flex;
  width: fit-content;
  min-width: 46px;
  min-height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.level-info.log-level {
  background: var(--seal-surface-soft);
}

.level-warn.log-level {
  background: var(--el-color-warning-light-9);
}

.level-error.log-level {
  background: var(--el-color-danger-light-9);
}

.level-other {
  color: var(--el-text-color-secondary);
}

.log-source {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-message {
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.log-tone--warning {
  color: var(--el-color-warning);
}

.log-tone--danger {
  color: var(--el-color-danger);
}

.log-tone--primary {
  color: var(--el-color-primary);
}

.log-empty {
  display: flex;
  min-height: 200px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
}

.log-empty strong {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.log-empty button {
  min-height: 36px;
  margin-top: 4px;
  padding: 0 10px;
  color: var(--el-color-primary);
  background: transparent;
  border: 0;
  border-radius: 5px;
  font: inherit;
  cursor: pointer;
}

.log-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 0 0 15px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.drawer-eyebrow {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.log-drawer-header h2 {
  margin: 6px 0 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

.drawer-close {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: 0;
  border-radius: 6px;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
}

.log-drawer-content {
  min-height: 0;
  overflow: auto;
  padding: 17px 0 24px;
  scrollbar-gutter: stable;
  padding-inline-end: 12px;
}

.log-detail-metadata {
  margin: 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.log-detail-metadata > div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  line-height: 1.55;
}

.log-detail-metadata dt {
  color: var(--el-text-color-secondary);
}

.log-detail-metadata dd {
  min-width: 0;
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--el-text-color-primary);
}

.log-iso {
  display: block;
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}

.raw-payload-section {
  margin-top: 22px;
}

.payload-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.payload-heading h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.copy-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  color: var(--el-text-color-regular);
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 5px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.copy-button:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.copy-feedback {
  margin: 8px 0 0;
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 1.5;
}

.raw-payload {
  max-height: min(48vh, 420px);
  overflow: auto;
  scrollbar-gutter: stable;
  margin: 10px 0 0;
  padding: 13px 14px;
  color: var(--el-text-color-primary);
  background: var(--seal-surface-soft);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  tab-size: 2;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 767px) {
  .log-toolbar {
    gap: 8px;
  }

  .search-wrap {
    width: 100%;
    min-width: 0;
    height: 44px;
  }

  .search-wrap input {
    font-size: 16px;
  }

  .log-level-filters {
    min-height: 44px;
  }

  .level-filter,
  .toolbar-toggle {
    min-height: 44px;
    font-size: 13px;
  }

  .result-count {
    width: 100%;
  }

  .toolbar-spacer {
    display: none;
  }

  .log-feed-head {
    display: none;
  }

  .log-row {
    grid-template-columns: 80px auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 7px 9px;
    min-height: 44px;
    padding: 11px 12px;
  }

  .log-row:not(.log-row--with-source) {
    grid-template-columns: 80px auto minmax(0, 1fr);
  }

  .log-time {
    grid-column: 1;
    grid-row: 1;
  }

  .log-level {
    grid-column: 2;
    grid-row: 1;
    justify-self: start;
  }

  .log-source {
    grid-column: 3;
    grid-row: 1;
    text-align: right;
  }

  .log-message {
    grid-column: 1 / -1;
    grid-row: 2;
    font-size: 16px;
    line-height: 1.45;
  }

  .log-detail-metadata > div {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 9px;
    font-size: 16px;
  }

  .drawer-close {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }
  :global(.el-drawer.log-detail-drawer) {
    width: 100vw !important;
    max-width: 100vw;
    height: 100dvh;
  }

  :global(.log-detail-drawer .el-drawer__body) {
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding: 18px 18px 16px;
  }

  :global(.log-detail-drawer .log-drawer-content) {
    flex: 1 1 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .log-feed-viewport {
    scroll-behavior: auto;
  }
}
</style>
