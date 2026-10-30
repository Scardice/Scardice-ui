<template>
  <section class="workspace-page home-workspace" aria-labelledby="home-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="home-workspace-title" class="workspace-title">运行概览</h1>
        <p class="workspace-subtitle">查看核心状态、平台接口连通性、管理操作记录与快捷入口。</p>
      </div>
      <div class="workspace-actions">
        <el-button :icon="Refresh" :loading="refreshing" @click="refreshOverview">
          刷新概览
        </el-button>
        <el-tooltip
          v-if="hasUpgrade && store.curDice.baseInfo.containerMode"
          content="容器模式下禁止直接更新，请手动拉取最新镜像">
          <el-button type="primary" disabled>升级新版</el-button>
        </el-tooltip>
        <el-button v-else-if="hasUpgrade" type="primary" @click="upgradeDialogVisible = true">
          升级新版
        </el-button>
      </div>
    </header>

    <div class="workspace-body home-scroll">
      <section class="overview-metrics" aria-label="核心与账号指标">
        <div class="metric-item metric-item--accounts">
          <span class="metric-label">已连接账号</span>
          <div class="metric-account-value">
            <strong class="metric-value">
              {{ connectionsLoading ? '…' : `${connectedCount} / ${connections.length}` }}
            </strong>
            <el-button class="metric-account-action" link type="primary" @click="goToConnections">
              {{ connections.length ? '管理账号' : '添加账号' }}
            </el-button>
          </div>
          <small v-if="endpointLoadError" class="metric-caption">账号列表读取失败</small>
          <small v-else class="metric-caption">
            在线 / 已配置<template v-if="overviewUpdatedAt">
              · 更新于 {{ overviewUpdatedAt }}</template
            >
          </small>
        </div>
        <div class="metric-item">
          <span class="metric-label">运行时长</span>
          <strong class="metric-value">
            {{ hasBaseInfo ? formatUptime(store.curDice.baseInfo.uptime) : '—' }}
          </strong>
          <small class="metric-caption">核心进程运行时间</small>
        </div>
        <div class="metric-item">
          <span class="metric-label">运行时内存</span>
          <strong class="metric-value">
            {{ hasBaseInfo ? filesize(store.curDice.baseInfo.memoryUsedSys || 0) : '—' }}
          </strong>
          <small class="metric-caption">Go 保留内存，不等同于进程 RSS</small>
        </div>
        <div class="metric-item">
          <span class="metric-label">运行环境</span>
          <strong class="metric-value metric-value--environment">
            {{
              hasBaseInfo
                ? `${store.curDice.baseInfo.OS || '未知'} / ${store.curDice.baseInfo.arch || '未知'}`
                : '—'
            }}
          </strong>
          <small class="metric-caption">
            <template v-if="hasBaseInfo">
              版本 {{ store.curDice.baseInfo.versionSimple || store.curDice.baseInfo.version }}
              <template v-if="store.curDice.baseInfo.appChannel">
                ({{ store.curDice.baseInfo.appChannel }})</template
              >
              · {{ store.curDice.baseInfo.containerMode ? '容器模式' : '非容器模式' }}
            </template>
            <template v-else>环境信息暂不可用</template>
          </small>
        </div>
      </section>

      <div class="overview-grid">
        <div class="home-main-column">
          <HomeQuickEntries />
          <HomeActivityFeed />
        </div>
        <section class="overview-section network-section" aria-labelledby="network-title">
          <div class="section-heading">
            <div>
              <h2 id="network-title">接口连通性</h2>
              <p class="section-caption">核心服务器到平台 API 的可达性</p>
            </div>
            <el-tooltip content="重新检测六个平台 API">
              <button
                type="button"
                class="network-refresh"
                :disabled="checkingNetwork"
                aria-label="重新检测接口连通性"
                @click="refreshNetworkHealth">
                <el-icon><Refresh /></el-icon>
              </button>
            </el-tooltip>
          </div>
          <div class="network-summary" role="status" aria-live="polite">
            <span class="network-summary-label">
              可达平台
              <el-tooltip
                content="检测不携带账号凭据：401/403/404 等拒绝响应也算可达，但不代表账号已授权。"
                placement="top">
                <el-icon class="network-help" aria-label="可达的含义"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <strong>{{ networkHealthLabel }}</strong>
          </div>
          <p v-if="networkError" class="network-error" role="status">{{ networkError }}</p>
          <div class="network-target-list" aria-label="平台 API 检测结果">
            <div v-for="target in healthTargetRows" :key="target.key" class="network-target-row">
              <strong class="network-target-name">{{ target.label }}</strong>
              <span class="network-target-state" :class="`network-target-state--${target.state}`">
                <i class="network-state-dot" aria-hidden="true"></i>
                {{ target.stateLabel }}
              </span>
              <span class="network-target-detail">
                <template v-if="target.result?.statusCode">
                  HTTP {{ target.result.statusCode }}
                </template>
                <template v-else-if="target.result">无 HTTP 响应</template>
                <template v-else>—</template>
                <template v-if="target.result">
                  · {{ formatProbeDuration(target.result.duration) }}
                </template>
              </span>
            </div>
          </div>
          <p v-if="networkHealth && networkHealth.timestamp !== 0" class="network-checked-at">
            检测于 {{ dayjs.unix(networkHealth.timestamp).from(now) }}
            <span>({{ dayjs.unix(networkHealth.timestamp).format('YYYY-MM-DD HH:mm:ss') }})</span>
          </p>
        </section>
      </div>
    </div>

    <el-dialog
      v-model="upgradeDialogVisible"
      title="升级新版本"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="true"
      class="the-dialog">
      <el-link
        style="font-size: 16px; font-weight: bolder"
        type="primary"
        href="https://dice.weizaima.com/changelog"
        target="_blank">
        查看更新日志
      </el-link>

      <div>请及时更新余烬到最新版本，这意味着功能增加和 BUG 修复。</div>
      <div>当然，在更新前最好看看右上角的余烬新闻，通常会很有帮助。</div>
      <div>在操作之前，最好能确保你目前可以接触到服务器，以防万一需要人工干预。</div>
      <div>
        <b>如果升级后无法启动，请删除余烬目录中的“update”、“auto_update.exe”并手动进行升级</b>
      </div>
      <div><b>进一步的内容请查阅届时自动生成的“升级失败指引”或加群询问。</b></div>

      <el-button style="margin: 1rem 0" type="primary" @click="doUpgrade">
        确认升级到 {{ store.curDice.baseInfo.versionNew }}
      </el-button>

      <div>{{ store.curDice.baseInfo.versionNewNote }}</div>
      <div>注意：升级成功后界面不会自动刷新，请在重连完成后手动刷新</div>
      <div><b>当前 Win11 22H2 无法自动重启，建议此系统用户手动更新</b></div>
      <div>不要连续多次执行</div>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { QuestionFilled, Refresh } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { filesize } from 'filesize';
import HomeActivityFeed from '~/components/home/HomeActivityFeed.vue';
import HomeQuickEntries from '~/components/home/HomeQuickEntries.vue';
import { postUpgrade } from '~/api/dice';
import { getUtilsCheckNetWorkHealth, type UtilsNetworkHealthResponse } from '~/api/utils';
import { useStore } from '~/store';

const store = useStore();
const router = useRouter();

type NetworkTargetKey = UtilsNetworkHealthResponse['targets'][number]['target'];
type NetworkTargetState = 'reachable' | 'unreachable' | 'pending' | 'error';

const upgradeDialogVisible = ref(false);
const refreshing = ref(false);
const connectionsLoading = ref(false);
const endpointLoadError = ref(false);
const overviewUpdatedAt = ref('');
const now = ref(dayjs());
const networkError = ref('');
const checkingNetwork = ref(false);
const networkHealth = ref<UtilsNetworkHealthResponse | null>(null);
let relativeTimeTimer: ReturnType<typeof setInterval> | undefined;
let networkCheckTimer: ReturnType<typeof setInterval> | undefined;
let overviewActive = false;

const hasBaseInfo = computed(() => store.curDice.baseInfo.version !== '0.0');
const hasUpgrade = computed(
  () => store.curDice.baseInfo.versionCode < store.curDice.baseInfo.versionNewCode,
);
const connections = computed(() => store.curDice.conns || []);
const connectedCount = computed(
  () =>
    connections.value.filter(connection => connection.state === 1 && !connection.ambiguous).length,
);
const healthTargets: { key: NetworkTargetKey; label: string }[] = [
  { key: 'qq', label: 'QQ 官方机器人' },
  { key: 'kook', label: 'KOOK' },
  { key: 'discord', label: 'Discord' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'dingtalk', label: '钉钉' },
  { key: 'slack', label: 'Slack' },
];

const healthTargetRows = computed(() =>
  healthTargets.map(target => {
    const result = networkHealth.value?.targets.find(item => item.target === target.key);
    const state: NetworkTargetState = result
      ? result.ok
        ? 'reachable'
        : 'unreachable'
      : networkError.value || networkHealth.value
        ? 'error'
        : 'pending';
    return {
      ...target,
      result,
      state,
      stateLabel: {
        reachable: '可达',
        unreachable: '不可达',
        pending: '检测中',
        error: '未获取结果',
      }[state],
    };
  }),
);

const networkHealthLabel = computed(() => {
  if (!networkHealth.value) return networkError.value ? '检测失败' : '检测中……';
  return `${networkHealth.value.ok.length} / ${networkHealth.value.total}`;
});

function formatUptime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value || 0));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  return days > 0
    ? `${days} 天 ${hours} 小时`
    : hours > 0
      ? `${hours} 小时 ${minutes} 分`
      : `${minutes} 分钟`;
}

function formatProbeDuration(duration: number) {
  const milliseconds = Math.max(0, duration) / 1_000_000;
  return `${milliseconds < 100 ? milliseconds.toFixed(1) : Math.round(milliseconds)} ms`;
}

async function refreshOverview() {
  if (refreshing.value) return;
  refreshing.value = true;
  connectionsLoading.value = true;
  try {
    await store.getImConnections();
    if (!overviewActive) return;
    endpointLoadError.value = false;
    overviewUpdatedAt.value = dayjs().format('HH:mm:ss');
  } catch {
    if (overviewActive) endpointLoadError.value = true;
  } finally {
    if (overviewActive) {
      connectionsLoading.value = false;
      refreshing.value = false;
    }
  }
}

async function refreshNetworkHealth() {
  if (checkingNetwork.value) return;
  checkingNetwork.value = true;
  networkError.value = '';
  try {
    const result = await getUtilsCheckNetWorkHealth();
    if (result.result) {
      networkHealth.value = result;
    } else {
      networkError.value = '接口连通性检测未返回结果，请稍后重试。';
    }
  } catch {
    networkError.value = '接口连通性检测失败，保留上次结果或稍后重试。';
  } finally {
    checkingNetwork.value = false;
  }
}

function goToConnections() {
  void router.push({ name: 'connect' });
}

const doUpgrade = async () => {
  upgradeDialogVisible.value = false;
  ElMessageBox.alert('开始下载更新，请等待……<br>完成后将自动重启余烬，并进入更新流程', '升级', {
    dangerouslyUseHTMLString: true,
  });
  try {
    const ret = await postUpgrade();
    ElMessageBox.alert(ret.text + '<br>如果几分钟后服务没有恢复，检查一下余烬目录', '升级', {
      dangerouslyUseHTMLString: true,
    });
  } catch (error) {
    console.error('升级失败', error);
  }
};

onMounted(() => {
  overviewActive = true;
  void refreshOverview();
  void refreshNetworkHealth();
  relativeTimeTimer = setInterval(() => {
    now.value = dayjs();
  }, 5_000);
  networkCheckTimer = setInterval(() => void refreshNetworkHealth(), 5 * 60 * 1000);
});

onUnmounted(() => {
  overviewActive = false;
  if (relativeTimeTimer) clearInterval(relativeTimeTimer);
  if (networkCheckTimer) clearInterval(networkCheckTimer);
});
</script>

<style scoped>
.home-scroll {
  container: home-overview / inline-size;
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: start;
  gap: var(--workspace-gap, 16px);
  overflow: hidden;
  padding: 0 4px 8px 0;
}

.metric-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.network-summary-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.network-help {
  color: var(--el-text-color-secondary);
  cursor: help;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 0 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.metric-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 4px 16px;
}

.metric-item:first-child {
  padding-inline-start: 0;
}

.metric-item + .metric-item {
  border-left: 1px solid var(--el-border-color-lighter);
}

.metric-label {
  overflow-wrap: anywhere;
}

.metric-value {
  min-height: 28px;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.metric-account-value {
  display: flex;
  min-width: 0;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.metric-account-action {
  flex: 0 0 auto;
  font-size: 12px;
}

.metric-caption,
.section-caption {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.overview-grid {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 310px);
  gap: 24px;
  overflow: hidden;
}

.home-main-column {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 24px;
}

.home-main-column :deep(.section-heading) {
  padding-block: 4px;
  padding-inline-end: 12px;
}

.overview-section {
  min-width: 0;
  min-height: 0;
}

.section-heading {
  display: flex;
  min-height: 34px;
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

.section-heading .section-caption {
  margin-top: 2px;
}

.network-section {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.network-section .section-heading {
  margin-bottom: 8px;
}

.network-refresh {
  display: inline-grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
}

.network-refresh:hover:not(:disabled) {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.network-refresh:disabled {
  cursor: wait;
  opacity: 0.6;
}

.network-summary {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.network-summary strong {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.network-error {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

.network-error {
  color: var(--el-color-danger);
}

.network-target-list {
  margin-top: 8px;
}

.network-target-row {
  display: grid;
  min-height: 30px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
}

.network-target-name {
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 12px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.network-target-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.network-state-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
}

.network-target-state--reachable {
  color: var(--el-color-success);
}

.network-target-state--reachable .network-state-dot {
  background: var(--el-color-success);
}

.network-target-state--unreachable {
  color: var(--el-color-danger);
}

.network-target-state--unreachable .network-state-dot {
  background: var(--el-color-danger);
}

.network-target-state--error {
  color: var(--el-text-color-secondary);
}

.network-target-state--error .network-state-dot {
  background: var(--el-text-color-placeholder);
}

.network-target-state--pending {
  color: var(--el-color-primary);
}

.network-target-state--pending .network-state-dot {
  background: var(--el-color-primary);
}

.network-target-detail {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: end;
  white-space: nowrap;
}

.network-checked-at {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1.5;
}

.network-checked-at span {
  display: block;
  font-variant-numeric: tabular-nums;
}

@container home-overview (max-width: 760px) {
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }

  .network-section {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 12px;
    align-content: start;
  }

  .network-section .section-heading {
    margin-bottom: 0;
  }

  .network-summary {
    grid-column: 2;
    grid-row: 1;
    min-height: 0;
    padding: 0;
    border-bottom: 0;
    white-space: nowrap;
  }

  .network-error,
  .network-target-list,
  .network-checked-at {
    grid-column: 1 / -1;
  }

  .network-target-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;
  }

  .network-target-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0 6px;
    line-height: 1.5;
  }

  .network-target-detail {
    grid-column: 1 / -1;
    text-align: start;
  }

  .network-checked-at span {
    display: inline;
  }
}

@container home-overview (max-width: 700px) {
  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 0;
  }

  .metric-item {
    padding-block: 4px;
    padding-inline: 10px;
  }

  .metric-item:first-child,
  .metric-item:nth-child(2n + 1) {
    padding-inline-start: 0;
    border-left: 0;
  }

  .metric-item:nth-child(2n) {
    padding-inline-end: 0;
  }

  .metric-value {
    font-size: 18px;
  }

  .network-target-row {
    min-height: 28px;
    column-gap: 6px;
  }

  .network-refresh {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }
}
@media (max-width: 1023px) {
  .home-scroll {
    grid-template-rows: auto auto;
    align-content: start;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .overview-grid {
    overflow: visible;
  }

  .home-main-column {
    min-height: auto;
    grid-template-rows: auto auto;
  }

  .network-section {
    overflow: visible;
  }
}

@media (max-width: 767px) {
  .workspace-header {
    gap: 8px;
  }

  .workspace-subtitle {
    display: none;
  }

  .home-scroll {
    gap: 8px;
  }

  .metric-label {
    line-height: 1.5;
  }

  .overview-metrics {
    gap: 4px 0;
    padding-bottom: 8px;
  }

  .metric-item {
    gap: 2px;
    padding-block: 2px;
  }

  .metric-value {
    min-height: 24px;
  }
  .section-caption,
  .network-error,
  .network-summary,
  .network-summary strong,
  .network-target-row,
  .network-target-name,
  .network-target-detail,
  .network-checked-at {
    font-size: 16px;
  }
}
</style>
