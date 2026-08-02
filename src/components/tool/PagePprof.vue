<template>
  <div class="flex flex-col gap-4">
    <h2>性能分析</h2>
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
import { useStore } from '~/store';
import { Download, View } from '@element-plus/icons-vue';

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
