<template>
  <header class="page-header">
    <h2>自动补全</h2>
    <el-switch
      v-model="enabled"
      active-text="启用"
      inactive-text="关闭"
      :loading="saving"
      :disabled="saving || initializing"
      @change="onToggle" />
  </header>

  <div class="tip log-gap-fill-tip">
    <div class="log-gap-fill-status">
      <el-tag :type="enabled ? 'success' : 'info'" effect="plain" size="small">
        {{ enabled ? '已启用' : '已关闭' }}
      </el-tag>
      <el-text>{{
        enabled ? '发现群消息缺口后会从平台历史自动补录。' : '不会再自动检测或补录群消息缺口。'
      }}</el-text>
    </div>
    <el-text tag="p">{{ description }}</el-text>
    <el-text tag="p">{{ disabledHint }}</el-text>
    <el-text tag="p" type="info" size="small">
      开关修改后立即保存并生效；正在执行的补全任务可能在下一次检查时停止。
    </el-text>
  </div>

  <el-card v-loading="statusLoading && !status" shadow="never" class="log-gap-fill-runtime">
    <template #header>
      <div class="log-gap-fill-runtime-header">
        <div class="log-gap-fill-runtime-title">
          <span>运行状态</span>
          <el-text type="info" size="small">每 5 秒自动刷新</el-text>
        </div>
        <el-button size="small" :icon="Refresh" :loading="statusLoading" @click="loadStatus(true)">
          刷新
        </el-button>
      </div>
    </template>

    <el-alert v-if="statusError" :title="statusError" type="warning" :closable="false" show-icon />

    <template v-if="status">
      <el-descriptions
        :column="statusColumns"
        border
        size="small"
        class="log-gap-fill-runtime-summary">
        <el-descriptions-item label="开关">
          {{ status.enabled ? '已开启' : '已关闭' }}
        </el-descriptions-item>
        <el-descriptions-item label="补录中">{{ status.runningGroups }} 个群</el-descriptions-item>
        <el-descriptions-item label="待补录">{{ status.pendingGroups }} 个群</el-descriptions-item>
        <el-descriptions-item label="等待重试">{{ status.retryGroups }} 个群</el-descriptions-item>
        <el-descriptions-item label="最近对账">
          {{ formatStatusTime(status.lastReconcile) }}
        </el-descriptions-item>
        <el-descriptions-item label="涉及群数">{{ status.groups.length }} 个</el-descriptions-item>
      </el-descriptions>

      <el-table
        v-if="status.groups.length"
        :data="status.groups"
        row-key="groupId"
        size="small"
        max-height="320"
        class="log-gap-fill-runtime-table">
        <el-table-column label="群组" min-width="180">
          <template #default="{ row }">
            <div class="log-gap-fill-group-name">{{ row.groupName || row.groupId }}</div>
            <div v-if="row.groupName" class="log-gap-fill-group-id">{{ row.groupId }}</div>
          </template>
        </el-table-column>
        <el-table-column label="日志" min-width="140">
          <template #default="{ row }">
            <div>{{ row.logName || '-' }}</div>
            <el-text type="info" size="small">{{ row.logOn ? '记录中' : '已关闭' }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="stateTagType(row.state)" size="small" effect="plain">
              {{ stateLabel(row.state) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="待补区间" min-width="150">
          <template #default="{ row }">
            <span v-if="row.fromSeq > 0 && row.toSeq > row.fromSeq">
              {{ row.fromSeq }} → {{ row.toSeq }}
            </span>
            <span v-else class="log-gap-fill-muted">-</span>
            <el-text v-if="row.offDiscovery" type="info" size="small">（离线发现）</el-text>
          </template>
        </el-table-column>
        <el-table-column label="重试时间" width="130">
          <template #default="{ row }">
            {{ row.retryAfter > 0 ? formatStatusTime(row.retryAfter) : '-' }}
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-else
        description="当前没有待补或运行中的任务"
        :image-size="52"
        class="log-gap-fill-runtime-empty" />
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { useWindowSize } from '@vueuse/core';
import {
  getLogGapFillStatus,
  setLogGapFillEnable,
  type LogGapFillGroupState,
  type LogGapFillStatus,
} from '~/api/dice';
import { useStore } from '~/store';

const store = useStore();
const description =
  '控制群消息 log 的自动补全：核心离线、重连或漏记群消息时，自动从平台历史补录缺口，补录完成后会在群里通知。';
const disabledHint =
  '关闭后，收到群消息、核心启动/重连、执行 .log on/.bot on 都不会触发补录；实时记录和日志查看不受影响。';
const enabled = ref(store.curDice.config?.logGapFillEnable !== false);
const saving = ref(false);
// 初始配置回读期间禁用开关，避免用户切换与首次回读竞态。
const initializing = ref(true);
// 用户手动切换后置位：迟到的初始回读不能再把开关盖回旧值。
const enabledTouched = ref(false);

const readEnabled = () => store.curDice.config?.logGapFillEnable !== false;

const status = ref<LogGapFillStatus>();
const statusLoading = ref(false);
const statusError = ref('');
let statusTimer: number | undefined;
let statusRequestId = 0;

const { width: viewportWidth } = useWindowSize();
const statusColumns = computed(() => (viewportWidth.value <= 640 ? 1 : 3));

const formatStatusTime = (ts?: number) => (ts ? dayjs.unix(ts).format('MM-DD HH:mm:ss') : '-');

const stateLabel = (state: LogGapFillGroupState | string) => {
  switch (state) {
    case 'running':
      return '补录中';
    case 'pending':
      return '排队中';
    case 'waiting':
      return '等待触发';
    case 'retry':
      return '等待重试';
    default:
      return '待处理';
  }
};

const stateTagType = (state: LogGapFillGroupState | string) => {
  switch (state) {
    case 'running':
      return 'primary' as const;
    case 'pending':
      return 'warning' as const;
    case 'retry':
      return 'danger' as const;
    default:
      return 'info' as const;
  }
};

const loadStatus = async (manual = false) => {
  if (statusLoading.value) {
    return;
  }
  statusLoading.value = true;
  const requestId = ++statusRequestId;
  try {
    const ret = await getLogGapFillStatus();
    if (requestId !== statusRequestId) {
      return;
    }
    status.value = ret;
    statusError.value = '';
  } catch (error) {
    if (requestId !== statusRequestId) {
      return;
    }
    console.error('读取自动补全状态失败', error);
    statusError.value = '读取自动补全状态失败，请稍后重试';
    if (manual) {
      ElMessage.error('读取自动补全状态失败');
    }
  } finally {
    if (requestId === statusRequestId) {
      statusLoading.value = false;
    }
  }
};

onMounted(() => {
  void loadStatus();
  statusTimer = window.setInterval(() => {
    if (!document.hidden) {
      void loadStatus();
    }
  }, 5000);
});

// 开关切换后强制刷新：作废切换前发出的状态请求，避免旧响应把开关状态盖回去。
const refreshStatusAfterToggle = () => {
  statusRequestId += 1;
  statusLoading.value = false;
  void loadStatus();
};

onBeforeUnmount(() => {
  statusRequestId += 1;
  if (statusTimer !== undefined) {
    window.clearInterval(statusTimer);
    statusTimer = undefined;
  }
});

onBeforeMount(async () => {
  try {
    try {
      await store.diceConfigGet();
    } catch (error) {
      console.error('读取自动补全设置失败', error);
    }
    if (!enabledTouched.value) {
      enabled.value = readEnabled();
    }
  } finally {
    initializing.value = false;
  }
});

const onToggle = async (value: string | number | boolean) => {
  const next = Boolean(value);
  enabledTouched.value = true;
  saving.value = true;
  try {
    try {
      await setLogGapFillEnable(next);
    } catch (error) {
      enabled.value = !next;
      console.error('保存自动补全设置失败', error);
      ElMessage.error('保存自动补全设置失败');
      return;
    }

    // 保存已成功，开关以本次保存结果为准；回读配置失败也不能回滚成旧值。
    enabled.value = next;
    try {
      await store.diceConfigGet();
      enabled.value = readEnabled();
      ElMessage.success(next ? '自动补全已开启' : '自动补全已关闭');
    } catch (error) {
      console.error('读取自动补全设置失败', error);
      ElMessage.warning('设置已保存，但读取最新配置失败，请刷新后确认');
    }
  } finally {
    saving.value = false;
    refreshStatusAfterToggle();
  }
};
</script>

<style scoped>
.log-gap-fill-tip {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.log-gap-fill-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.log-gap-fill-tip > :deep(.el-text) {
  align-self: stretch;
  margin: 0;
  line-height: 1.7;
}

.log-gap-fill-runtime {
  margin-top: 1rem;
}

.log-gap-fill-runtime-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.log-gap-fill-runtime-title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-weight: 600;
}

.log-gap-fill-runtime-summary {
  margin-top: 0.75rem;
}

.log-gap-fill-runtime-table {
  margin-top: 0.75rem;
  width: 100%;
}

.log-gap-fill-runtime-empty {
  margin-top: 0.5rem;
}

.log-gap-fill-group-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.log-gap-fill-group-id {
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.log-gap-fill-muted {
  color: var(--el-text-color-secondary);
}

@media screen and (max-width: 640px) {
  .log-gap-fill-runtime-table {
    font-size: 0.78rem;
  }
}
</style>
