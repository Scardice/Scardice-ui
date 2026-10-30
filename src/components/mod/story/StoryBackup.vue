<template>
  <el-alert
    type="info"
    :closable="false"
    show-icon
    title="每次把日志上传到染色器之前，都会先在本地保存一份备份。删除这些备份不会丢失日志本身。" />

  <section class="workspace-panel story-backup-panel">
    <div v-if="backups.length === 0" class="workspace-empty">
      <strong>还没有日志备份</strong>
      <p>提取日志后，备份会出现在这里。</p>
    </div>
    <template v-else>
      <div class="story-backup-bar">
        <el-checkbox
          v-model="checkAllBackups"
          :indeterminate="isIndeterminate && selectedBackups.length > 0"
          @change="handleCheckAllChange"
          >全选</el-checkbox
        >
        <el-text type="info" size="small">
          已选 {{ selectedBackups.length }} 个，共
          {{ filesize(selectedBackups.map(bak => bak.fileSize).reduce((a, b) => a + b, 0)) }}
        </el-text>
        <el-button
          class="story-backup-delete"
          type="danger"
          plain
          :icon="Delete"
          :disabled="selectedBackups.length === 0"
          @click="backupBatchDeleteConfirm"
          >{{
            selectedBackups.length ? `删除所选（${selectedBackups.length}）` : '删除所选'
          }}</el-button
        >
      </div>

      <el-checkbox-group
        v-model="selectedBackups"
        class="backup-list"
        @change="handleCheckedBackupChange">
        <div v-for="backup in backups" :key="backup.name" class="backup-line">
          <el-checkbox :value="backup">
            <span class="backup-name">{{ backup.name }}</span>
          </el-checkbox>
          <div class="backup-actions">
            <el-button
              size="small"
              tag="a"
              :icon="Download"
              class="backup-download"
              :href="`${urlBase}/sd-api/story/backup/download?name=${encodeURIComponent(backup.name)}&token=${encodeURIComponent(store.token)}`">
              下载（{{ filesize(backup.fileSize) }}）
            </el-button>
            <el-button
              type="danger"
              size="small"
              :icon="Delete"
              plain
              @click="bakDeleteConfirm(backup.name)"
              >删除
            </el-button>
          </div>
        </div>
      </el-checkbox-group>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { CheckboxValueType } from 'element-plus';
import { Delete, Download } from '@element-plus/icons-vue';
import { filesize } from 'filesize';
import { useStore } from '~/store';
import type { Backup } from '~/api/story';
import { getStoryBackUpList, postStoryBatchDel } from '~/api/story';
import { urlBase } from '~/api';

const store = useStore();

const backups = ref<Backup[]>([]);

const refreshList = async () => {
  const resp = await getStoryBackUpList();
  if (resp?.result) {
    backups.value = resp.data;
  }
  selectedBackups.value = [];
};

// const bakDownloadConfirm = async (name: string) => {
//   const res = await postStoryBatchDel([name]);
//   if (res?.result) {
//     ElMessage.success('已删除');
//   } else {
//     ElMessage.error('删除失败');
//   }
// };

const bakDeleteConfirm = async (name: string) => {
  const ret = await ElMessageBox.confirm(`确定删除备份 ${name} 吗？`, '删除备份', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
  if (ret) {
    const res = await postStoryBatchDel([name]);
    if (res?.result) {
      ElMessage.success('备份已删除');
    } else {
      ElMessage.error('删除失败');
    }
  }
  await refreshList();
};

const selectedBackups = ref<any[]>([]);
const checkAllBackups = ref(false);
const isIndeterminate = ref(true);

const handleCheckAllChange = (val: CheckboxValueType) => {
  selectedBackups.value = val ? backups.value : [];
  isIndeterminate.value = false;
};

const handleCheckedBackupChange = (value: CheckboxValueType[]) => {
  const checkedCount = value.length;
  checkAllBackups.value = checkedCount === backups.value.length;
  isIndeterminate.value = checkedCount > 0 && checkedCount < backups.value.length;
};

const backupBatchDeleteConfirm = async () => {
  const ret = await ElMessageBox.confirm(
    `确定删除选中的 ${selectedBackups.value.length} 个日志备份吗？`,
    '删除备份',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  );
  if (ret) {
    const res = await postStoryBatchDel(selectedBackups.value.map(bak => bak.name));
    if (res.result) {
      ElMessage.success('已删除所选备份');
    } else {
      ElMessage.error('有备份删除失败！失败文件：\n' + res.fails.join('\n'));
    }
  }
  await refreshList();
};

onBeforeMount(async () => {
  await refreshList();
});
</script>

<style scoped lang="css">
.story-backup-panel {
  margin-top: 16px;
}

.story-backup-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--seal-border-color-light);
}

.story-backup-delete {
  margin-inline-start: auto;
}

.backup-list {
  display: flex;
  flex-direction: column;
}

.backup-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 8px 0;
}

.backup-line + .backup-line {
  border-top: 1px solid var(--seal-border-color-light);
}

.backup-name {
  font-family: var(--workspace-mono);
  font-size: 13px;
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
</style>
