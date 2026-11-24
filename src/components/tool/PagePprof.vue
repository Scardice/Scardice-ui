<template>
  <div class="flex flex-col gap-4">
    <header class="page-header overview-header">
      <h2>性能分析</h2>
      <div class="overview-actions">
        <el-switch v-model="autoRefresh" active-text="自动刷新" />
        <el-button
          :icon="Refresh"
          size="small"
          :loading="overviewLoading"
          @click="loadOverview(true)">
          刷新
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="overviewError"
      :title="`运行概览读取失败：${overviewError}`"
      type="warning"
      :closable="false"
      show-icon />

    <el-alert
      v-if="overview && !overview.system.available"
      title="当前系统未提供主机 CPU/内存/磁盘指标，仅显示进程与运行数据"
      type="info"
      :closable="false"
      show-icon />

    <section class="overview-section">
      <div class="section-title">
        <span>运行概览</span>
        <el-text v-if="overview" type="info" size="small">
          采集于 {{ fmtTime(overview.collectedAt) }}
        </el-text>
      </div>

      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="8" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>CPU</span>
                <el-text type="info" size="small">{{ overview?.process.numCPU ?? '-' }} 核</el-text>
              </div>
            </template>
            <div class="metric-main">
              {{
                overview?.system.available === false ? '-' : fmtPercent(overview?.system.cpuPercent)
              }}
              <span v-if="overview?.system.available !== false" class="metric-unit">%</span>
            </div>
            <div class="metric-sub">
              <template v-if="overview?.system.available !== false">系统实时 · </template>
              进程平均 {{ fmtPercent(overview?.process.cpuPercent) }}%
            </div>
            <el-progress
              :percentage="clampPercent(overview?.system.cpuPercent)"
              :stroke-width="8"
              :show-text="false"
              :color="usageColor(overview?.system.cpuPercent ?? 0)" />
            <div class="metric-foot">
              负载 {{ fmtNum(overview?.system.load1) }} / {{ fmtNum(overview?.system.load5) }} /
              {{ fmtNum(overview?.system.load15) }}
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="8" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>内存</span>
                <el-text type="info" size="small">RSS</el-text>
              </div>
            </template>
            <div class="metric-main">{{ fmtBytes(overview?.process.rssBytes) }}</div>
            <div class="metric-sub">
              <template v-if="overview?.system.memoryAvailable !== false">
                系统已用 {{ fmtPercent(overview?.system.memUsedPercent) }}% · 可用
                {{ fmtBytes(overview?.system.memAvailableBytes) }}
              </template>
              <template v-else>系统内存信息不可用</template>
            </div>
            <el-progress
              :percentage="clampPercent(overview?.system.memUsedPercent)"
              :stroke-width="8"
              :show-text="false"
              :color="usageColor(overview?.system.memUsedPercent ?? 0)" />
            <div class="metric-foot">
              堆分配 {{ fmtBytes(overview?.process.heapAllocBytes) }} · 运行时
              {{ fmtBytes(overview?.process.sysBytes) }}
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="8" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>磁盘</span>
                <el-text type="info" size="small">数据分区</el-text>
              </div>
            </template>
            <div class="metric-main">
              {{
                overview?.system.diskAvailable === false
                  ? '-'
                  : fmtPercent(overview?.system.diskUsedPercent)
              }}
              <span v-if="overview?.system.diskAvailable !== false" class="metric-unit">%</span>
            </div>
            <div class="metric-sub">
              <template v-if="overview?.system.diskAvailable !== false">
                可用 {{ fmtBytes(overview?.system.diskFreeBytes) }} / 共
                {{ fmtBytes(overview?.system.diskTotalBytes) }}
              </template>
              <template v-else>磁盘信息不可用</template>
            </div>
            <el-progress
              :percentage="clampPercent(overview?.system.diskUsedPercent)"
              :stroke-width="8"
              :show-text="false"
              :color="usageColor(overview?.system.diskUsedPercent ?? 0)" />
            <div class="metric-foot">{{ overview?.storage.dataDir ?? '数据目录读取中' }}</div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="8" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>运行状态</span>
                <el-text type="info" size="small">{{ overview?.version ?? '' }}</el-text>
              </div>
            </template>
            <div class="metric-main">{{ fmtUptime(overview?.uptimeSeconds) }}</div>
            <div class="metric-sub">
              Goroutine {{ overview?.process.goroutines ?? '-' }} · GC
              {{ overview?.process.numGC ?? '-' }} 次
            </div>
            <div class="metric-foot">
              GOMAXPROCS {{ overview?.process.gomaxprocs ?? '-' }} ·
              {{ overview?.process.numCPU ?? '-' }} 核可用
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="8" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>群与消息</span>
                <el-text type="info" size="small">今日</el-text>
              </div>
            </template>
            <div class="metric-main">
              {{ overview?.counts.todayMessages ?? '-' }}
              <span class="metric-unit">条</span>
            </div>
            <div class="metric-sub">
              活跃群 {{ overview?.counts.todayActiveGroups ?? '-' }} · 指令
              {{ overview?.counts.todayCommands ?? '-' }}
            </div>
            <div class="metric-foot">
              <div>按 log 记录统计</div>
              <div>
                累计 {{ overview?.counts.groups ?? '-' }} 群 · {{ overview?.counts.logs ?? '-' }} 份
                log · {{ overview?.counts.logItems ?? '-' }} 条
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="8" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>存储占用</span>
                <el-text type="info" size="small">含备份</el-text>
              </div>
            </template>
            <div class="metric-main">{{ fmtBytes(totalStorageBytes) }}</div>
            <div class="storage-lines">
              <span>牌堆 {{ fmtBytes(overview?.storage.decksBytes) }}</span>
              <span>图片 {{ fmtBytes(overview?.storage.imagesBytes) }}</span>
              <span>帮助文档 {{ fmtBytes(overview?.storage.helpdocBytes) }}</span>
              <span>日志库 {{ fmtBytes(overview?.storage.logsDbBytes) }}</span>
              <span>备份 {{ fmtBytes(overview?.storage.backupsBytes) }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :xs="24" :md="16" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>连接状态</span>
                <el-text type="info" size="small">
                  在线 {{ onlineEndpointCount }} / {{ overview?.endpoints.length ?? 0 }}
                </el-text>
              </div>
            </template>
            <div class="endpoint-table-wrap">
              <el-table :data="overview?.endpoints ?? []" size="small" empty-text="暂无连接">
                <el-table-column prop="platform" label="平台" min-width="70" />
                <el-table-column label="账号" min-width="130">
                  <template #default="{ row }">
                    {{ row.nickname || row.userId || '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="protocolType" label="协议" min-width="90" />
                <el-table-column label="状态" min-width="80">
                  <template #default="{ row }">
                    <el-tag :type="endpointStateType(row.state)" size="small" effect="plain">
                      {{ endpointStateText(row.state) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="groupNum" label="群数" min-width="70" />
                <el-table-column prop="cmdExecutedNum" label="指令数" min-width="80" />
              </el-table>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="8" class="mb-3">
          <el-card shadow="hover" class="overview-card">
            <template #header>
              <div class="card-header">
                <span>备份</span>
                <el-tag
                  :type="overview?.backup.autoEnable ? 'success' : 'info'"
                  size="small"
                  effect="plain">
                  {{ overview?.backup.autoEnable ? '自动备份已开启' : '自动备份已关闭' }}
                </el-tag>
              </div>
            </template>
            <div class="backup-line">
              最近备份：{{ fmtTime(overview?.backup.lastBackupTime) }}
              <span v-if="overview?.backup.lastBackupSize">
                · {{ fmtBytes(overview.backup.lastBackupSize) }}
              </span>
            </div>
            <div class="backup-line">共 {{ overview?.backup.backupCount ?? 0 }} 份</div>
            <div class="backup-line backup-dir">
              {{ overview?.backup.backupDir ?? './backups' }}
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <h3 class="section-heading">性能采样</h3>
    <div class="tip">
      <el-collapse class="helptips">
        <el-collapse-item name="1">
          <template #title>
            <el-text tag="strong">查看帮助</el-text>
          </template>
          <el-text tag="p">
            <div>本页调用 <code>net/http/pprof</code> 提供的端点对海豹核心进行性能分析。</div>
            <div>
              采集得到的文件可以使用 Go 自带的 <code>go tool pprof</code> /
              <code>go tool trace</code> 命令离线分析。
            </div>
            <div>长时间采样（如 CPU profile、trace）会持续占用资源，建议仅在排查问题时使用。</div>
          </el-text>
        </el-collapse-item>
      </el-collapse>
    </div>

    <main>
      <el-row :gutter="16">
        <el-col v-for="item in profiles" :key="item.key" :xs="24" :sm="12" :md="8" class="mb-3">
          <el-card shadow="hover" class="profile-card">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ item.title }}</span>
                <el-tag v-if="item.supportsSeconds" type="warning" size="small">需时长</el-tag>
              </div>
            </template>

            <div class="profile-desc">{{ item.desc }}</div>

            <div v-if="item.secondsModel === 'profile'" class="profile-control">
              <el-text>采样时长（秒）：</el-text>
              <el-input-number
                v-model="profileSeconds"
                :min="1"
                :max="600"
                :step="5"
                size="small"
                controls-position="right"
                class="ml-2" />
            </div>
            <div v-if="item.secondsModel === 'trace'" class="profile-control">
              <el-text>采样时长（秒）：</el-text>
              <el-input-number
                v-model="traceSeconds"
                :min="1"
                :max="60"
                :step="1"
                size="small"
                controls-position="right"
                class="ml-2" />
            </div>

            <div class="profile-actions">
              <el-button
                type="primary"
                size="small"
                :icon="Download"
                :loading="isPending(item.key)"
                :disabled="isPending(item.key)"
                @click="handleDownload(item)">
                下载
              </el-button>
              <el-button
                v-if="item.textPath"
                size="small"
                :icon="View"
                :loading="isPending(item.key)"
                :disabled="isPending(item.key)"
                @click="handleView(item)">
                查看文本
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </main>

    <el-drawer v-model="previewVisible" :title="previewTitle" direction="rtl" size="60%">
      <div v-loading="previewLoading" class="profile-preview">
        <pre v-if="!previewLoading">{{ previewContent }}</pre>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { urlBase } from '~/api';
import { getOverview, type OverviewData } from '~/api/overview';
import { useStore } from '~/store';
import { Download, Refresh, View } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

interface ProfileEntry {
  key: string;
  title: string;
  desc: string;
  binaryPath: string;
  textPath: string;
  filename: string;
  supportsSeconds?: boolean;
  secondsModel?: 'profile' | 'trace';
}

const store = useStore();
const PPROF_BASE = `${urlBase}/sd-api/debug/pprof`;
const authQuery = () => `token=${encodeURIComponent(store.token)}`;

const profileSeconds = ref(30);
const traceSeconds = ref(5);

const overview = ref<OverviewData>();
const overviewLoading = ref(false);
const overviewError = ref('');
const autoRefresh = ref(true);
let overviewTimer: number | undefined;

const loadOverview = async (manual = false) => {
  if (overviewLoading.value) return;
  overviewLoading.value = true;
  try {
    overview.value = await getOverview();
    overviewError.value = '';
  } catch (e: unknown) {
    overviewError.value = e instanceof Error ? e.message : String(e);
    if (manual) {
      ElMessage.error(`读取运行概览失败：${overviewError.value}`);
    }
  } finally {
    overviewLoading.value = false;
  }
};

onMounted(() => {
  void loadOverview();
  overviewTimer = window.setInterval(() => {
    if (autoRefresh.value && !document.hidden) {
      void loadOverview();
    }
  }, 5000);
});

onUnmounted(() => {
  if (overviewTimer !== undefined) {
    window.clearInterval(overviewTimer);
    overviewTimer = undefined;
  }
});

const clampPercent = (value?: number) => Math.max(0, Math.min(100, value ?? 0));

const fmtPercent = (value?: number) => (value === undefined ? '-' : value.toFixed(1));

const fmtNum = (value?: number) => (value === undefined ? '-' : value.toFixed(2));

const fmtBytes = (value?: number) => {
  if (value === undefined || value < 0) return '-';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const digits = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[index]}`;
};

const fmtUptime = (seconds?: number) => {
  if (seconds === undefined) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  if (minutes > 0) return `${minutes} 分`;
  return `${Math.floor(seconds)} 秒`;
};

const fmtTime = (timestamp?: number) =>
  timestamp ? dayjs.unix(timestamp).format('MM-DD HH:mm') : '-';

const usageColor = (value: number) => {
  if (value >= 90) return '#f56c6c';
  if (value >= 70) return '#e6a23c';
  return 'var(--el-color-primary)';
};

const endpointStateText = (state: number) =>
  ({ 0: '断开', 1: '已连接', 2: '连接中', 3: '连接失败' })[state] ?? '未知';

const endpointStateType = (state: number) => {
  if (state === 1) return 'success';
  if (state === 2) return 'warning';
  if (state === 3) return 'danger';
  return 'info';
};

const onlineEndpointCount = computed(
  () => overview.value?.endpoints.filter(item => item.state === 1).length ?? 0,
);

const totalStorageBytes = computed(
  () => (overview.value?.storage.dataBytes ?? 0) + (overview.value?.storage.backupsBytes ?? 0),
);

const previewVisible = ref(false);
const previewTitle = ref('');
const previewContent = ref('');
const previewLoading = ref(false);

const PENDING_STORAGE_KEY = 'sd-pprof-pending';
const pendingExpiry = ref<Record<string, number>>({});

const isPending = (key: string) => {
  const exp = pendingExpiry.value[key];
  if (exp === undefined) return false;
  if (Date.now() >= exp) {
    clearPending(key);
    return false;
  }
  return true;
};

const persistPending = () => {
  try {
    sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingExpiry.value));
  } catch {
    /* ignore storage errors */
  }
};

const markPending = (key: string, durationMs: number) => {
  pendingExpiry.value = { ...pendingExpiry.value, [key]: Date.now() + durationMs };
  persistPending();
  window.setTimeout(() => clearPending(key), durationMs);
};

const clearPending = (key: string) => {
  if (!(key in pendingExpiry.value)) return;
  const next = { ...pendingExpiry.value };
  delete next[key];
  pendingExpiry.value = next;
  persistPending();
};

onMounted(() => {
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const valid: Record<string, number> = {};
    for (const [k, exp] of Object.entries(parsed)) {
      if (exp > now) {
        valid[k] = exp;
        window.setTimeout(() => clearPending(k), exp - now);
      }
    }
    pendingExpiry.value = valid;
    persistPending();
  } catch {
    /* ignore parse errors */
  }
});

const triggerDownload = async (key: string, urlPath: string, filename: string) => {
  try {
    const resp = await fetch(`${PPROF_BASE}${urlPath}&${authQuery()}`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (e: unknown) {
    const errMessage = e instanceof Error ? e.message : String(e);
    ElMessage.error(`下载失败：${errMessage}`);
  } finally {
    clearPending(key);
  }
};

const showTextProfile = async (key: string, urlPath: string, title: string) => {
  previewTitle.value = title;
  previewContent.value = '';
  previewLoading.value = true;
  previewVisible.value = true;
  try {
    const resp = await fetch(`${PPROF_BASE}${urlPath}&${authQuery()}`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    previewContent.value = await resp.text();
  } catch (e: unknown) {
    const errMessage = e instanceof Error ? e.message : String(e);
    previewContent.value = `加载失败：${errMessage}`;
  } finally {
    previewLoading.value = false;
    clearPending(key);
  }
};

const profiles: ProfileEntry[] = [
  {
    key: 'profile',
    title: 'CPU Profile',
    desc: '在指定时长内采集 CPU 使用情况。',
    binaryPath: '',
    textPath: '',
    filename: 'cpu.pprof',
    supportsSeconds: true,
    secondsModel: 'profile',
  },
  {
    key: 'trace',
    title: '执行轨迹 (Trace)',
    desc: '在指定时长内采集程序执行轨迹。',
    binaryPath: '',
    textPath: '',
    filename: 'trace.out',
    supportsSeconds: true,
    secondsModel: 'trace',
  },
  {
    key: 'heap',
    title: '堆内存 (Heap)',
    desc: '当前堆内存分配采样，可用于分析内存占用与泄漏。',
    binaryPath: 'heap',
    textPath: 'heap',
    filename: 'heap.pprof',
  },
  {
    key: 'allocs',
    title: '内存分配 (Allocs)',
    desc: '所有已分配的内存采样（历史累计），可用于分析分配热点。',
    binaryPath: 'allocs',
    textPath: 'allocs',
    filename: 'allocs.pprof',
  },
  {
    key: 'goroutine',
    title: '协程 (Goroutine)',
    desc: '当前所有 goroutine 的栈信息，常用于排查死锁、协程泄漏。',
    binaryPath: 'goroutine',
    textPath: 'goroutine',
    filename: 'goroutine.pprof',
  },
  {
    key: 'block',
    title: '阻塞 (Block)',
    desc: '同步原语上的阻塞事件采样。采样率使用 --block-profile 启动参数调整。',
    binaryPath: 'block',
    textPath: 'block',
    filename: 'block.pprof',
  },
  {
    key: 'mutex',
    title: '互斥锁 (Mutex)',
    desc: '互斥锁争用事件采样。采样率使用 --mutex-profile 启动参数调整。',
    binaryPath: 'mutex',
    textPath: 'mutex',
    filename: 'mutex.pprof',
  },
  {
    key: 'threadcreate',
    title: '线程创建 (ThreadCreate)',
    desc: '系统线程创建事件的采样。',
    binaryPath: 'threadcreate',
    textPath: 'threadcreate',
    filename: 'threadcreate.pprof',
  },
];

const buildDownloadPath = (entry: ProfileEntry) => {
  if (entry.key === 'profile') return `/profile?seconds=${profileSeconds.value}`;
  if (entry.key === 'trace') return `/trace?seconds=${traceSeconds.value}`;
  return `/${entry.binaryPath}?debug=0`;
};

const buildTextPath = (entry: ProfileEntry) => {
  if (entry.textPath) return `/${entry.textPath}?debug=1`;
  return '';
};

const handleDownload = async (entry: ProfileEntry) => {
  if (isPending(entry.key)) return;
  let durationMs: number;
  if (entry.key === 'profile') durationMs = profileSeconds.value * 1000;
  else if (entry.key === 'trace') durationMs = traceSeconds.value * 1000;
  else durationMs = 1500;
  markPending(entry.key, durationMs);
  await triggerDownload(entry.key, buildDownloadPath(entry), entry.filename);
};

const handleView = async (entry: ProfileEntry) => {
  if (isPending(entry.key)) return;
  markPending(entry.key, 5000);
  await showTextProfile(entry.key, buildTextPath(entry), entry.title);
};
</script>

<style scoped lang="css">
.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.overview-header h2 {
  margin: 0;
}

.overview-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.overview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
  font-size: 1.05rem;
}

.section-heading {
  margin: 1rem 0 0;
  font-size: 1.05rem;
}

.overview-card {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.metric-main {
  font-size: 1.65rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
}

.metric-unit {
  margin-left: 2px;
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.metric-sub {
  margin: 4px 0 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.metric-foot {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  word-break: break-all;
}

.storage-lines {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.endpoint-table-wrap {
  overflow-x: auto;
}

.backup-line {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.9;
}

.backup-dir {
  word-break: break-all;
}

@media screen and (max-width: 700px) {
  .overview-header {
    align-items: flex-start;
  }

  .metric-main {
    font-size: 1.45rem;
  }
}

.helptips {
  background-color: #f3f5f7;

  :deep(.el-collapse-item__header) {
    background-color: #f3f5f7;
  }

  :deep(.el-collapse-item__wrap) {
    background-color: #f3f5f7;
  }
}

.profile-card {
  height: 100%;
}

.profile-desc {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  min-height: 60px;
  margin-bottom: 12px;
}

.profile-control {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.profile-preview {
  padding: 0 16px;

  pre {
    white-space: pre-wrap;
    word-break: break-all;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  }
}

@media screen and (max-width: 700px) {
  .profile-preview {
    padding: 0 8px;
  }
}
</style>
