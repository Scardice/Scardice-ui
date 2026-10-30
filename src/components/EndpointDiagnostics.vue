<template>
  <el-dialog
    :model-value="true"
    title="运行诊断"
    width="min(680px, calc(100vw - 32px))"
    @close="$emit('close')">
    <div class="diagnostic-heading">
      <div>
        <strong>{{ name }}</strong>
        <p>端点诊断快照；运行实例的计数在重启或重新登录后重置。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadDiagnostics">刷新</el-button>
    </div>

    <div v-if="loading" class="diagnostic-state" role="status">正在读取诊断…</div>
    <div v-else-if="error" class="diagnostic-state" role="alert">
      <p>无法读取运行诊断，请检查连接后重试。</p>
      <el-button @click="loadDiagnostics">重试</el-button>
    </div>
    <div v-else-if="!entries.length" class="diagnostic-state" role="status">
      暂无诊断信息，端点可能未运行或不提供诊断。
    </div>
    <p v-if="!loading && !error && entries.length > 5" class="diagnostic-scroll-hint">
      可滚动查看全部诊断条目。
    </p>
    <ul
      v-if="!loading && !error && entries.length"
      class="diagnostic-list"
      :aria-busy="loading"
      aria-label="诊断条目，可滚动查看"
      tabindex="0">
      <li
        v-for="(entry, index) in entries"
        :key="`${entry.code}-${index}`"
        class="diagnostic-entry">
        <div class="diagnostic-entry-heading">
          <strong>{{ label(entry) }}</strong>
          <el-tag :type="severityType(entry.severity)" size="small" disable-transitions>
            {{ severityLabel(entry.severity) }}
          </el-tag>
        </div>
        <div class="diagnostic-message">{{ message(entry) }}</div>
        <div v-if="Object.hasOwn(labels, entry.code)" class="diagnostic-code">{{ entry.code }}</div>
        <dl v-if="entry.fields?.length" class="diagnostic-fields">
          <div v-for="field in entry.fields" :key="field.key">
            <dt>{{ field.key }}</dt>
            <dd>{{ field.redacted ? '[REDACTED]' : field.value }}</dd>
          </div>
        </dl>
      </li>
    </ul>
  </el-dialog>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import {
  getEndpointDiagnostics,
  type DiagnosticEntry,
  type DiagnosticSeverity,
} from '~/api/endpoints';

const props = defineProps<{ endpointId: string; name: string }>();
defineEmits<{ close: [] }>();

const entries = ref<DiagnosticEntry[]>([]);
const loading = ref(false);
const error = ref(false);
let disposed = false;

const labels: Record<string, string> = {
  'inbound.rejected': '入站事件被拒绝',
  'inbound.backpressure': '入站事件背压',
  'inbound.conflicts': '入站事件身份冲突',
  'inbound.retries': '入站事件重新投递',
  'priority.coalesced': '重复优先事件合并',
  'transport.dropped_events': '传输事件丢弃',
  'outbound.recall_rejected': '延迟撤回被拒绝',
  'outbound.recall_failed': '消息撤回失败',
  'transport.reconnect_attempts': '连接重试次数',
  'transport.auth_rejected': '鉴权失败连接数',
};
const label = (entry: DiagnosticEntry) =>
  Object.hasOwn(labels, entry.code) ? labels[entry.code] : entry.code;
const message = (entry: DiagnosticEntry) => {
  if (Object.hasOwn(labels, entry.code)) {
    const count = entry.message.match(/: (\d+)$/);
    if (count) return count[1];
  }
  return entry.message || '无详情';
};
const severityLabel = (severity: DiagnosticSeverity) =>
  severity === 3 ? '错误' : severity === 2 ? '警告' : '信息';
const severityType = (severity: DiagnosticSeverity) =>
  severity === 3 ? 'danger' : severity === 2 ? 'warning' : 'info';

const loadDiagnostics = async () => {
  if (loading.value) return;
  loading.value = true;
  error.value = false;
  try {
    const report = await getEndpointDiagnostics(props.endpointId);
    if (!disposed) entries.value = report.entries ?? [];
  } catch {
    if (!disposed) error.value = true;
  } finally {
    if (!disposed) {
      loading.value = false;
    }
  }
};

onMounted(loadDiagnostics);
onBeforeUnmount(() => {
  disposed = true;
});
</script>

<style scoped>
.diagnostic-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.diagnostic-heading p {
  margin: 4px 0 0;
  color: var(--seal-text-secondary);
}
.diagnostic-heading > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.diagnostic-state {
  padding: 20px 0;
  color: var(--seal-text-secondary);
}
.diagnostic-state p {
  margin: 0 0 12px;
}
.diagnostic-scroll-hint {
  margin: 0 0 8px;
  color: var(--seal-text-secondary);
}
.diagnostic-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: min(55vh, 480px);
  overflow-y: auto;
}
.diagnostic-entry {
  padding: 12px 0;
  border-top: 1px solid var(--seal-border-color-light);
  overflow-wrap: anywhere;
}
.diagnostic-entry-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diagnostic-message {
  margin-top: 4px;
}
.diagnostic-code {
  color: var(--seal-text-secondary);
  font-size: 12px;
}
.diagnostic-fields {
  margin: 8px 0 0;
}
.diagnostic-fields > div {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.diagnostic-fields dt {
  color: var(--seal-text-secondary);
}
.diagnostic-fields dd {
  margin: 0;
}
</style>
