<template>
  <section class="workspace-page backup-workspace" aria-labelledby="backup-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="backup-workspace-title" class="workspace-title">备份</h1>
        <p class="workspace-subtitle">手动或定时备份骰子数据，并自动清理过旧的备份文件。</p>
      </div>
      <div class="workspace-actions">
        <el-button
          type="primary"
          :icon="FolderAdd"
          :loading="backupSubmitting || backupReconciling"
          :disabled="backupRunning || backupReconciling"
          @click="showBackup = true">
          {{ backupReconciling ? '正在确认状态' : backupRunning ? '备份进行中' : '立即备份' }}
        </el-button>
      </div>
    </header>

    <div class="workspace-body workspace-scroll">
      <section
        v-if="backupJob || backupSubmitting || backupStatusError || backupRequestError"
        class="workspace-panel backup-progress"
        aria-labelledby="backup-progress-title"
        aria-live="polite">
        <div class="workspace-panel-header">
          <div>
            <h2 id="backup-progress-title">{{ backupProgressTitle }}</h2>
            <p v-if="backupSubmitting">正在提交备份请求。</p>
            <p v-else-if="backupReconciling">正在同步服务器上的备份任务。</p>
            <p v-else-if="backupRunning">{{ backupStageLabels[backupJob!.stage] }}</p>
            <p v-else-if="backupJob?.status === 'succeeded'">
              备份文件已保存，可以在下方列表下载。
            </p>
          </div>
          <el-button :icon="Refresh" :disabled="backupSubmitting" @click="refreshBackupStatus">
            刷新状态
          </el-button>
        </div>
        <el-progress
          v-if="backupSubmitting || backupReconciling || backupRunning"
          :percentage="backupPercentage"
          :indeterminate="!backupJob?.totalFiles"
          :show-text="Boolean(backupJob?.totalFiles)"
          :duration="2"
          aria-label="备份文件进度" />
        <p v-if="backupJob?.totalFiles && !backupSubmitting" class="backup-progress-detail">
          已归档 {{ backupJob.completedFiles }} / {{ backupJob.totalFiles }} 个文件
        </p>
        <p v-if="backupJob?.filename && !backupSubmitting" class="backup-progress-filename">
          {{ backupJob.filename }}
        </p>
        <p v-if="backupJob?.error && !backupSubmitting" class="backup-progress-error">
          失败原因：{{ backupJob.error }}
        </p>
        <p v-if="backupRequestError" class="backup-progress-error">{{ backupRequestError }}</p>
        <p v-if="backupStatusError" class="backup-progress-error">{{ backupStatusError }}</p>
        <p v-if="backupRunning" class="backup-progress-detail">
          备份在服务器后台执行，离开页面后继续进行。
        </p>
      </section>

      <section class="workspace-panel" aria-labelledby="backup-settings-title">
        <div class="workspace-panel-header">
          <div>
            <h2 id="backup-settings-title">自动备份与清理</h2>
            <p>修改后点击“保存设置”生效。</p>
          </div>
          <el-button :icon="DocumentChecked" @click="doSave">保存设置</el-button>
        </div>

        <el-form label-position="left" label-width="auto" class="backup-form">
          <el-form-item label="自动备份">
            <label class="workspace-toggle">
              <el-switch v-model="cfg.autoBackupEnable" aria-label="启用自动备份" />
              <span>启用自动备份</span>
            </label>
          </el-form-item>
          <template v-if="cfg.autoBackupEnable">
            <el-form-item label="备份间隔">
              <div class="backup-field">
                <el-input
                  v-model="cfg.autoBackupTime"
                  class="backup-input"
                  placeholder="@every 12h" />
                <span class="backup-hint">
                  使用 cron 表达式，例如 <code>@every 12h</code>。
                  <a href="https://pkg.go.dev/github.com/robfig/cron" target="_blank" rel="noopener"
                    >查看 cron 语法</a
                  >
                </span>
              </div>
            </el-form-item>
            <el-form-item label="备份范围">
              <el-checkbox-group v-model="cfg.autoBackupSelectionList">
                <el-checkbox label="基础（含自定义回复）" value="base" checked disabled />
                <el-checkbox label="JS 插件" value="js" />
                <el-checkbox label="牌堆" value="deck" />
                <el-checkbox label="帮助文档" value="helpdoc" />
                <el-checkbox label="敏感词库" value="censor" />
                <el-checkbox label="人名信息" value="name" />
                <el-checkbox label="图片" value="image" />
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="文件名示例">
              <code class="backup-filename"
                >bak_{{ now }}_auto_r{{
                  cfg.autoBackupSelection.toString(16)
                }}_&lt;随机值&gt;.zip</code
              >
            </el-form-item>
          </template>

          <el-form-item label="自动清理">
            <el-radio-group v-model="cfg.backupCleanStrategy">
              <el-radio-button :value="0">不清理</el-radio-button>
              <el-radio-button :value="1">按数量保留</el-radio-button>
              <el-radio-button :value="2">按时间保留</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="cfg.backupCleanStrategy === 1" label="保留数量">
            <el-input-number v-model="cfg.backupCleanKeepCount" :min="1" :step="1" />
            <span class="backup-hint backup-hint--inline">只保留最新的这么多个备份</span>
          </el-form-item>
          <el-form-item v-if="cfg.backupCleanStrategy === 2" label="保留时长">
            <div class="backup-field">
              <el-input v-model="cfg.backupCleanKeepDur" class="backup-input" placeholder="720h" />
              <span class="backup-hint">
                单位支持 h / m / s，例如 <code>720h</code>（30 天）、<code>10h30m</code>。
              </span>
            </div>
          </el-form-item>
          <el-form-item v-if="cfg.backupCleanStrategy !== 0" label="清理时机">
            <el-checkbox-group v-model="backupCleanTriggers">
              <el-checkbox :value="CleanTrigger.AfterAutoBackup">每次自动备份后</el-checkbox>
              <el-checkbox :value="CleanTrigger.Cron">按定时间隔</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item v-if="cfg.backupCleanStrategy !== 0" label="清理间隔">
            <div class="backup-field">
              <el-input v-model="cfg.backupCleanCron" class="backup-input" placeholder="@daily" />
              <span class="backup-hint">勾选“按定时间隔”时生效，同样使用 cron 表达式。</span>
            </div>
          </el-form-item>
        </el-form>
      </section>

      <section class="workspace-panel" aria-labelledby="backup-files-title">
        <div class="workspace-panel-header">
          <div>
            <h2 id="backup-files-title">已备份文件</h2>
            <p>恢复方法：完全关闭骰子后，把备份压缩包解压到骰子目录，并选择覆盖 data 目录。</p>
          </div>
          <el-button
            v-if="data.items?.length"
            type="danger"
            plain
            :icon="Delete"
            @click="enterBatchDelete">
            批量删除
          </el-button>
        </div>

        <div v-if="!data.items?.length" class="workspace-empty">
          <strong>还没有备份</strong>
          <p>点击右上角“立即备份”创建第一个备份。</p>
        </div>
        <ul v-else class="backup-list">
          <li v-for="i in data.items" :key="i.name" class="backup-line">
            <div class="backup-info">
              <span class="backup-name">{{ i.name }}</span>
              <el-text v-if="(i?.selection ?? 0) >= 0" size="small" type="info"
                >包含：{{ parseSelectionDesc(i.selection).join('、') }} ·
                {{ filesize(i.fileSize) }}</el-text
              >
              <el-text v-else size="small" type="warning">无法识别此备份的内容</el-text>
            </div>
            <div class="backup-actions">
              <el-button
                size="small"
                tag="a"
                class="backup-download"
                :icon="Download"
                :href="`${urlBase}/sd-api/backup/download?name=${encodeURIComponent(i.name)}&token=${encodeURIComponent(store.token)}`">
                下载
              </el-button>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                plain
                :aria-label="`删除备份 ${i.name}`"
                @click="bakDeleteConfirm(i.name)">
                删除
              </el-button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <el-dialog
      v-model="showBatchDelete"
      title="批量删除备份"
      width="min(640px, calc(100vw - 32px))">
      <el-alert
        :closable="false"
        class="backup-dialog-alert"
        title="默认勾选最近的 5 个备份之前的历史备份，可自行调整。"></el-alert>
      <el-space size="large" alignment="center" class="backup-dialog-summary">
        <el-checkbox
          v-model="checkAllBaks"
          :indeterminate="isIndeterminate"
          @change="handleCheckAllChange"
          >{{ checkAllBaks ? '取消全选' : '全选' }}</el-checkbox
        >
        <el-text type="info" size="small"
          >已勾选 {{ selectedBaks.length }} 个备份，共
          {{ filesize(selectedBaks.map(bak => bak.fileSize).reduce((a, b) => a + b, 0)) }}</el-text
        >
      </el-space>
      <el-checkbox-group v-model="selectedBaks" @change="handleCheckedBakChange">
        <div v-for="i of data.items" :key="i.name">
          <el-checkbox :value="i">
            <template #default>{{ i.name }}</template>
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-space wrap>
          <el-button @click="showBatchDelete = false">取消</el-button>
          <el-button
            type="danger"
            :disabled="!(selectedBaks && selectedBaks.length > 0)"
            @click="bakBatchDeleteConfirm"
            >删除所选（{{ selectedBaks.length }}）
          </el-button>
        </el-space>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showBackup"
      title="立即备份"
      width="min(560px, calc(100vw - 32px))"
      :close-on-click-modal="!backupSubmitting"
      :close-on-press-escape="!backupSubmitting"
      :show-close="!backupSubmitting">
      <el-space direction="vertical" alignment="flex-start">
        <div>
          <span>备份范围：</span>
          <el-checkbox-group v-model="backupSelections" :disabled="backupSubmitting">
            <el-checkbox label="基础（含自定义回复）" value="base" checked disabled />
            <el-checkbox label="JS 插件" value="js" />
            <el-checkbox label="牌堆" value="deck" />
            <el-checkbox label="帮助文档" value="helpdoc" />
            <el-checkbox label="敏感词库" value="censor" />
            <el-checkbox label="人名信息" value="name" />
            <el-checkbox label="图片" value="image" />
          </el-checkbox-group>
        </div>
        <div class="flex flex-wrap">
          <span>备份文件名预览：</span>
          <el-text type="info"
            >bak_{{ now }}_r{{
              formatSelection(backupSelections).toString(16)
            }}_&lt;随机值&gt;.zip</el-text
          >
        </div>
      </el-space>
      <template #footer>
        <el-space wrap>
          <el-button :disabled="backupSubmitting" @click="showBackup = false">取消</el-button>
          <el-button
            type="primary"
            :loading="backupSubmitting || backupReconciling"
            :disabled="backupRunning || backupReconciling"
            @click="doBackup"
            >立即备份</el-button
          >
        </el-space>
      </template>
    </el-dialog>
  </section>
</template>

<script lang="ts" setup>
import type { CheckboxValueType } from 'element-plus';
import { isAxiosError } from 'axios';
import { useStore } from '~/store';
import { urlBase } from '~/api';
import { filesize } from 'filesize';
import { Delete, DocumentChecked, Download, FolderAdd, Refresh } from '@element-plus/icons-vue';
import { sum } from 'lodash-es';
import { dayjs } from 'element-plus';
import {
  getBackupConfig,
  getBackupList,
  getBackupStatus,
  postBackupBatchDel,
  postBackupDel,
  postDoBackup,
  setBackupConfig,
  type BackupJob,
} from '~/api/backup';

const store = useStore();

const data = ref<{
  items: any[];
}>({
  items: [],
});

const cfg = ref<any>({});
const now = ref(dayjs().format('YYMMDD_HHmmss'));
const showBackup = ref<boolean>(false);
const backupSelections = ref<string[]>([
  'base',
  'js',
  'deck',
  'helpdoc',
  'censor',
  'name',
  'image',
]);

const backupJob = ref<BackupJob | null>(null);
const backupSubmitting = ref(false);
const backupReconciling = ref(false);
const backupStatusError = ref('');
const backupRequestError = ref('');
const backupRunning = computed(() => backupJob.value?.status === 'running');
const backupStageLabels: Record<BackupJob['stage'], string> = {
  preparing: '正在准备备份目录',
  snapshot: '正在生成数据库一致性快照，大型数据库可能需要较长时间',
  collecting: '正在收集备份文件',
  archiving: '正在压缩备份文件',
  finalizing: '正在校验写入并发布备份文件',
};
const backupProgressTitle = computed(() => {
  if (backupSubmitting.value) return '正在提交备份';
  if (backupReconciling.value) return '正在确认备份状态';
  if (backupRunning.value) return '正在创建备份';
  if (backupRequestError.value) return '备份请求异常';
  if (backupJob.value?.status === 'failed') return '备份失败';
  if (backupJob.value?.status === 'succeeded') return '备份已完成';
  return '备份状态';
});
const backupPercentage = computed(() => {
  const job = backupJob.value;
  return job?.totalFiles ? Math.floor((job.completedFiles / job.totalFiles) * 100) : 100;
});
let backupPageActive = false;
let backupStatusEpoch = 0;
let backupPollTimer: ReturnType<typeof setTimeout> | undefined;
let backupAttemptJobId: string | undefined;

function clearBackupPoll() {
  if (backupPollTimer) clearTimeout(backupPollTimer);
  backupPollTimer = undefined;
}

async function applyBackupJob(job: BackupJob | null, recovered = false) {
  const previous = backupJob.value;
  backupJob.value = job;
  const finished = job && (recovered || (previous?.id === job.id && previous.status === 'running'));
  if (finished && job.status === 'succeeded') {
    ElMessage.success('备份已完成');
    try {
      await refreshList();
    } catch {
      if (backupPageActive) ElMessage.warning('备份已完成，文件列表刷新失败，请刷新页面。');
    }
  } else if (finished && job.status === 'failed') {
    ElMessage.error(job.error || '创建备份失败');
  }
}

async function refreshBackupStatus() {
  if (!backupPageActive || backupSubmitting.value) return;
  clearBackupPoll();
  const epoch = ++backupStatusEpoch;
  try {
    const response = await getBackupStatus();
    if (!backupPageActive || epoch !== backupStatusEpoch) return;
    backupStatusError.value = '';
    const reconciling = backupReconciling.value;
    const recovered = Boolean(
      reconciling && response.job && response.job.id !== backupAttemptJobId,
    );
    backupReconciling.value = false;
    if (recovered || response.job?.status === 'running') {
      backupRequestError.value = '';
    } else if (reconciling) {
      backupRequestError.value = '服务器当前任务保持不变，请重新提交备份请求。';
      backupJob.value = null;
      return;
    }
    await applyBackupJob(response.job, recovered);
  } catch {
    if (!backupPageActive || epoch !== backupStatusEpoch) return;
    backupStatusError.value = '暂时无法获取备份状态，请检查连接或点击“刷新状态”。';
  } finally {
    if (
      backupPageActive &&
      epoch === backupStatusEpoch &&
      (backupRunning.value || backupStatusError.value)
    ) {
      backupPollTimer = setTimeout(() => void refreshBackupStatus(), 1500);
    }
  }
}

function refreshBackupWhenVisible() {
  if (document.visibilityState === 'visible') void refreshBackupStatus();
}

const parseSelection = (selection: number): string[] => {
  const list = ['base'];
  const jsMark = selection & 0b000001;
  if (jsMark) {
    list.push('js');
  }
  const deckMark = selection & 0b000010;
  if (deckMark) {
    list.push('deck');
  }
  const helpdocMark = selection & 0b000100;
  if (helpdocMark) {
    list.push('helpdoc');
  }
  const censorMark = selection & 0b001000;
  if (censorMark) {
    list.push('censor');
  }
  const nameMark = selection & 0b010000;
  if (nameMark) {
    list.push('name');
  }
  const resourceMark = selection & 0b100000;
  if (resourceMark) {
    list.push('image');
  }
  return list;
};

const parseSelectionDesc = (selection: number): string[] => {
  const list = ['基础'];
  const jsMark = selection & 0b000001;
  if (jsMark) {
    list.push('JS 插件');
  }
  const deckMark = selection & 0b000010;
  if (deckMark) {
    list.push('牌堆');
  }
  const helpdocMark = selection & 0b000100;
  if (helpdocMark) {
    list.push('帮助文档');
  }
  const censorMark = selection & 0b001000;
  if (censorMark) {
    list.push('敏感词库');
  }
  const nameMark = selection & 0b010000;
  if (nameMark) {
    list.push('人名信息');
  }
  const resourceMark = selection & 0b100000;
  if (resourceMark) {
    list.push('图片');
  }
  return list;
};

const formatSelection = (selections: string[]): number => {
  let mark = 0;
  if (selections.includes('js')) {
    mark |= 0b000001;
  }
  if (selections.includes('deck')) {
    mark |= 0b000010;
  }
  if (selections.includes('helpdoc')) {
    mark |= 0b000100;
  }
  if (selections.includes('censor')) {
    mark |= 0b001000;
  }
  if (selections.includes('name')) {
    mark |= 0b010000;
  }
  if (selections.includes('image')) {
    mark |= 0b100000;
  }
  return mark;
};

watch(
  () => cfg.value.autoBackupSelectionList,
  v => {
    cfg.value.autoBackupSelection = formatSelection(v);
  },
);

const refreshList = async () => {
  const lst = await getBackupList();
  data.value = lst;
};

const configGet = async () => {
  const data = await getBackupConfig();
  cfg.value = data;
  cfg.value.autoBackupSelectionList = parseSelection(data.autoBackupSelection);
  if (data.backupCleanTrigger) {
    const triggers: CleanTrigger[] = [];
    if (data.backupCleanTrigger & CleanTrigger.Cron) {
      triggers.push(CleanTrigger.Cron);
    }
    if (data.backupCleanTrigger & CleanTrigger.AfterAutoBackup) {
      triggers.push(CleanTrigger.AfterAutoBackup);
    }
    backupCleanTriggers.value = triggers;
  }
};

const bakDeleteConfirm = async (name: string) => {
  const ret = await ElMessageBox.confirm('确认删除？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  });
  if (ret) {
    const r = await postBackupDel(name);
    if (!r.success) {
      ElMessage.error('删除失败');
    } else {
      ElMessage.success('已删除');
    }
  }
  await refreshList();
};

const showBatchDelete = ref<boolean>(false);
const selectedBaks = ref<any[]>([]); // 他不是string[]，是备份项的一种格式
const checkAllBaks = ref(false);
const isIndeterminate = ref(true);

const enterBatchDelete = async () => {
  selectedBaks.value = data.value.items.filter((_, index) => index >= 5);
  showBatchDelete.value = true;
};

const handleCheckAllChange = (val: CheckboxValueType) => {
  selectedBaks.value = val ? data.value.items : [];
  isIndeterminate.value = false;
};

const handleCheckedBakChange = (value: CheckboxValueType[]) => {
  const checkedCount = value.length;
  checkAllBaks.value = checkedCount === data.value.items.length;
  isIndeterminate.value = checkedCount > 0 && checkedCount < data.value.items.length;
};

const bakBatchDeleteConfirm = async () => {
  const ret = await ElMessageBox.confirm('确认删除所选备份？删除的内容无法找回！', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  });
  if (ret) {
    const res = await postBackupBatchDel(selectedBaks.value.map(bak => bak.name));
    if (res.result) {
      ElMessage.success('已删除所选备份');
    } else {
      ElMessage.error('有备份删除失败！失败文件：\n' + res.fails.join('\n'));
    }
  }
  showBatchDelete.value = false;
  await refreshList();
};

const doBackup = async () => {
  if (backupSubmitting.value || backupRunning.value || backupReconciling.value) return;
  showBackup.value = false;
  backupSubmitting.value = true;
  backupAttemptJobId = backupJob.value?.id;
  backupRequestError.value = '';
  backupStatusError.value = '';
  backupJob.value = null;
  ++backupStatusEpoch;
  clearBackupPoll();
  try {
    const ret = await postDoBackup(formatSelection(backupSelections.value));
    if (!backupPageActive) return;
    if ('testMode' in ret) {
      ElMessage.info('展示模式无法备份');
    } else {
      await applyBackupJob(ret.job);
    }
  } catch (error) {
    if (!backupPageActive) return;
    if (
      isAxiosError<{ error?: string; job?: BackupJob }>(error) &&
      error.response?.status === 409 &&
      error.response.data?.job
    ) {
      await applyBackupJob(error.response.data.job);
      ElMessage.info('已有备份任务，已显示当前进度');
    } else {
      const response = isAxiosError<{ error?: string }>(error) ? error.response : undefined;
      backupReconciling.value = !response;
      backupRequestError.value = response
        ? response.data?.error || `备份请求失败（HTTP ${response.status}）。`
        : '备份请求响应中断，正在确认服务器状态。';
      if (backupReconciling.value) {
        ElMessage.warning(backupRequestError.value);
      } else {
        ElMessage.error(backupRequestError.value);
      }
    }
  } finally {
    if (backupPageActive) {
      backupSubmitting.value = false;
      void refreshBackupStatus();
    }
  }
};

const doSave = async () => {
  await setBackupConfig(cfg.value);
  ElMessage.success('已保存');
};

const enum CleanTrigger {
  // 定时
  Cron = 1 << 0,
  // 自动备份后
  AfterAutoBackup = 1 << 1,
}

const backupCleanTriggers = ref<CleanTrigger[]>();

watch(backupCleanTriggers, newStrategies => {
  cfg.value.backupCleanTrigger = sum(newStrategies);
});

useIntervalFn(() => {
  now.value = dayjs().format('YYMMDD_HHmmss');
}, 1000);

onBeforeMount(async () => {
  backupPageActive = true;
  window.addEventListener('focus', refreshBackupWhenVisible);
  document.addEventListener('visibilitychange', refreshBackupWhenVisible);
  void refreshBackupStatus();
  await configGet();
  await refreshList();
});

onBeforeUnmount(() => {
  backupPageActive = false;
  ++backupStatusEpoch;
  clearBackupPoll();
  window.removeEventListener('focus', refreshBackupWhenVisible);
  document.removeEventListener('visibilitychange', refreshBackupWhenVisible);
});
</script>

<style lang="css">
.backup-progress-detail,
.backup-progress-filename,
.backup-progress-error {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.backup-progress-detail {
  color: var(--seal-text-secondary);
}

.backup-progress-filename {
  font-family: var(--workspace-mono);
}

.backup-progress-error {
  color: var(--el-color-danger);
}

.backup-form .el-form-item {
  margin-bottom: 14px;
}

.backup-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.backup-input {
  width: min(240px, 100%);
}

.backup-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--seal-text-secondary);
}

.backup-hint--inline {
  margin-inline-start: 12px;
}

.backup-filename {
  font-size: 12px;
  overflow-wrap: anywhere;
}

.backup-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.backup-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 10px 0;
}

.backup-line + .backup-line {
  border-top: 1px solid var(--seal-border-color-light);
}

.backup-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.backup-name {
  font-family: var(--workspace-mono);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.backup-actions {
  display: flex;
  gap: 8px;
}

.backup-actions .el-button + .el-button {
  margin-inline-start: 0;
}

.backup-download {
  text-decoration: none;
}

.backup-dialog-alert {
  margin-bottom: 16px;
}

.backup-dialog-summary {
  margin-bottom: 12px;
}
</style>
