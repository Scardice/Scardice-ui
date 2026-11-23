<template>
  <div class="log-history">
    <div class="log-history__toolbar">
      <div class="log-history__levels">
        <span class="log-history__label">等级</span>
        <el-checkbox-group v-model="selectedLevels" :min="1" size="small">
          <el-checkbox v-for="level in logLevelOptions" :key="level" :value="level">
            {{ logLevelLabelMap[level] }}
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <div class="log-history__dates">
        <el-date-picker
          v-model="startDate"
          type="date"
          size="small"
          value-format="x"
          placeholder="开始日期"
          class="log-history__date" />
        <span class="log-history__date-sep">至</span>
        <el-date-picker
          v-model="endDate"
          type="date"
          size="small"
          value-format="x"
          placeholder="结束日期"
          :disabled-date="isEndDateDisabled"
          class="log-history__date" />
      </div>

      <el-input
        v-model="keyword"
        size="small"
        clearable
        placeholder="搜索日志内容"
        class="log-history__keyword" />
    </div>

    <div class="log-history__bar">
      <el-button
        size="small"
        type="primary"
        plain
        :loading="loading"
        :disabled="loading || !hasMore"
        @click="loadOlder">
        {{ hasMore ? '加载更早' : '已到最早' }}
      </el-button>
      <el-button size="small" text :loading="loading" @click="reload">刷新</el-button>
      <span class="log-history__hint">
        已加载 {{ items.length }} 条{{ hasMore ? '' : '，没有更早的记录了' }}
      </span>
      <span class="log-history__source">来源：本机 data/ui.log</span>
    </div>

    <el-table
      v-loading="loading"
      :data="items"
      :height="tableHeight"
      class="log-history__table"
      empty-text="没有匹配的历史日志"
      :header-cell-style="{ backgroundColor: 'var(--seal-table-header-bg)' }">
      <el-table-column label="时间" :width="timeColumnWidth">
        <template #default="scope">
          <span class="log-history__time" :class="timeClass(scope.row as SysLog)">{{
            formatTime(scope.row.ts)
          }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="level" label="级别" :width="levelColumnWidth">
        <template #default="scope">
          <el-text :type="levelTextType(scope.row.level)">{{ scope.row.level }}</el-text>
        </template>
      </el-table-column>
      <el-table-column prop="msg" label="信息">
        <template #default="scope">
          <span :class="messageClass(scope.row as SysLog)">
            <log-rich-content :content="scope.row.msg" />
          </span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash-es';
import dayjs from 'dayjs';
import { useWindowSize } from '@vueuse/core';
import { getLogHistory, type LogLevel, type SysLog } from '~/api/log';
import LogRichContent from '~/components/utils/log-rich-content.vue';

const props = withDefaults(
  defineProps<{
    active?: boolean;
    tableHeight?: string;
  }>(),
  {
    active: true,
    tableHeight: '62vh',
  },
);

const logLevelOptions: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const logLevelLabelMap: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

const selectedLevels = ref<LogLevel[]>(['info', 'warn', 'error']);
const startDate = ref<string | number | null>(null);
const endDate = ref<string | number | null>(null);
const keyword = ref('');
const items = ref<SysLog[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const cursor = ref<number | undefined>(undefined);

const { width: viewportWidth } = useWindowSize();
const isMobile = computed(() => viewportWidth.value <= 640);
const timeColumnWidth = computed(() => (isMobile.value ? 128 : 172));
const levelColumnWidth = computed(() => (isMobile.value ? 60 : 68));

const normalizeLevel = (level: unknown): LogLevel => {
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level;
  }
  return 'info';
};

const formatTime = (ts: number) => {
  const value = dayjs.unix(ts);
  return isMobile.value ? value.format('MM-DD HH:mm:ss') : value.format('YYYY-MM-DD HH:mm:ss');
};

const levelTextType = (level: string) => {
  switch (normalizeLevel(level)) {
    case 'warn':
      return 'warning' as const;
    case 'error':
      return 'danger' as const;
    default:
      return undefined;
  }
};

const timeClass = (row: SysLog) => {
  if (row.msg.startsWith('onebot | ')) {
    return 'log-onebot';
  }
  if (row.msg.startsWith('发给')) {
    return 'log-sent';
  }
  if (row.level === 'warn') {
    return 'log-warn';
  }
  if (row.level === 'error') {
    return 'log-error';
  }
  return '';
};

const messageClass = (row: SysLog) => {
  if (row.msg.startsWith('onebot | ')) {
    return 'log-onebot';
  }
  if (row.msg.startsWith('发给')) {
    return 'log-sent';
  }
  if (row.level === 'warn') {
    return 'log-warn';
  }
  if (row.level === 'error') {
    return 'log-error';
  }
  return '';
};

const isEndDateDisabled = (date: Date) => {
  if (!startDate.value) {
    return false;
  }
  return dayjs(date)
    .startOf('day')
    .isBefore(dayjs(Number(startDate.value)).startOf('day'));
};

const buildParams = (reset: boolean) => {
  const params: Parameters<typeof getLogHistory>[0] = {
    limit: 200,
    levels: selectedLevels.value.join(','),
  };
  if (!reset && cursor.value) {
    params.beforeSeq = cursor.value;
  }

  if (startDate.value) {
    const start = dayjs(Number(startDate.value));
    if (start.isValid()) {
      params.startTs = start.startOf('day').unix();
    }
  }
  if (endDate.value) {
    const end = dayjs(Number(endDate.value));
    if (end.isValid()) {
      params.endTs = end.endOf('day').unix();
    }
  }

  const query = keyword.value.trim();
  if (query) {
    params.q = query;
  }
  return params;
};

let requestId = 0;

const loadPage = async (reset: boolean) => {
  if (!props.active) {
    return;
  }
  if (!reset && (loading.value || !hasMore.value)) {
    return;
  }

  const currentRequestId = ++requestId;
  loading.value = true;
  const previousCursor = cursor.value;
  try {
    const ret = await getLogHistory(buildParams(reset));
    if (currentRequestId !== requestId) {
      return;
    }

    const nextItems = ret.items ?? [];
    if (reset) {
      items.value = nextItems;
    } else {
      const seen = new Set(
        items.value.map(item => item.seq).filter((seq): seq is number => typeof seq === 'number'),
      );
      const unique = nextItems.filter(item => typeof item.seq !== 'number' || !seen.has(item.seq));
      items.value = [...unique, ...items.value];
    }

    const nextCursor = Number(ret.nextBeforeSeq) || 0;
    const cursorAdvanced = reset || !previousCursor || nextCursor < previousCursor;
    if (ret.hasMore && nextCursor > 0 && cursorAdvanced) {
      cursor.value = nextCursor;
      hasMore.value = true;
    } else {
      cursor.value = undefined;
      hasMore.value = false;
    }
  } catch (error) {
    if (currentRequestId !== requestId) {
      return;
    }
    console.error('加载历史日志失败', error);
    ElMessage.error('加载历史日志失败');
  } finally {
    if (currentRequestId === requestId) {
      loading.value = false;
    }
  }
};

const reload = () => {
  if (!props.active) {
    return;
  }
  cursor.value = undefined;
  hasMore.value = true;
  void loadPage(true);
};

const loadOlder = () => {
  if (loading.value || !hasMore.value) {
    return;
  }
  void loadPage(false);
};

const debouncedReload = debounce(reload, 300);

watch(
  () => props.active,
  active => {
    if (active) {
      reload();
    }
  },
  { immediate: true },
);

watch(
  () => selectedLevels.value.join(','),
  () => {
    reload();
  },
);

watch(startDate, value => {
  if (!value || !endDate.value) {
    return;
  }
  const start = dayjs(Number(value)).startOf('day');
  const end = dayjs(Number(endDate.value)).startOf('day');
  if (end.isBefore(start)) {
    endDate.value = value;
  }
});

watch([startDate, endDate], () => {
  debouncedReload();
});

watch(keyword, () => {
  debouncedReload();
});

onBeforeUnmount(() => {
  requestId++;
  debouncedReload.cancel();
});
</script>

<style scoped>
.log-history {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  height: 100%;
}

.log-history__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem 1rem;
}

.log-history__levels {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.log-history__label {
  color: var(--seal-text-regular);
  font-size: 0.82rem;
  white-space: nowrap;
}

.log-history__dates {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 100%;
}

.log-history__date-sep {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.log-history :deep(.log-history__date) {
  width: 142px;
  max-width: 100%;
}

.log-history__keyword {
  width: 180px;
  max-width: 100%;
}

.log-history__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem 0.9rem;
}

.log-history__hint {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

.log-history__source {
  margin-left: auto;
  color: #9aa7b2;
  font-size: 0.75rem;
}

.log-history__table {
  width: 100%;
}

.log-history__time {
  white-space: nowrap;
}

.log-warn {
  color: var(--el-color-warning);
}

.log-error {
  color: var(--el-color-danger);
}

.log-onebot {
  color: var(--el-color-warning);
}

.log-sent {
  color: var(--el-color-primary);
}

@media screen and (max-width: 640px) {
  .log-history__toolbar {
    gap: 0.5rem;
  }

  .log-history__dates {
    width: 100%;
  }

  .log-history :deep(.log-history__date) {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
  }

  .log-history__keyword {
    width: 100%;
  }

  .log-history__source {
    display: none;
  }
}
</style>
