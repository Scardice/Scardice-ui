<script setup lang="ts">
import type { UploadUserFile } from 'element-plus';
import { Download, Delete, Plus, Search, Upload } from '@element-plus/icons-vue';
import { urlBase } from '~/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getBanConfigList, importBanConfig, postMapAddOne, postMapDelOne } from '~/api/banconfig';
import { formatUploadFailureMessage } from '~/utils/upload-error';

dayjs.extend(relativeTime);

const recordList = ref<any[]>([]);
const recordPage = ref({
  no: 1,
  total: 0,
  pageSize: 10,
});

const showBanned = ref(true);
const showWarn = ref(true);
const showTrusted = ref(true);
const showOthers = ref(true);
const dialogAddShow = ref(false);

const banRankText = new Map<number, string>();
banRankText.set(-30, '禁止');
banRankText.set(-10, '警告');
banRankText.set(+30, '信任');
banRankText.set(0, '常规');

const addData = ref<{ id: string; rank: number; name: string; reason: string }>({
  id: '',
  rank: -30,
  reason: '',
  name: '',
});

const doAdd = async () => {
  if (addData.value.id === '') return;
  await postMapAddOne(
    addData.value.id,
    addData.value.rank,
    addData.value.name,
    addData.value.reason,
  );
  await refreshList();
  ElMessage.success('已保存');
  dialogAddShow.value = false;
};

const searchBy = ref('');

const filteredRecordList = computed<any[]>(() => {
  if (recordList.value) {
    const items = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [k, _v] of Object.entries(recordList.value)) {
      const v = _v as any;
      let ok = false;
      if (v.rank === -30 && showBanned.value) {
        ok = true;
      }
      if (v.rank === -10 && showWarn.value) {
        ok = true;
      }
      if (v.rank === 30 && showTrusted.value) {
        ok = true;
      }
      if (v.rank === 0 && showOthers.value) {
        ok = true;
      }

      if (ok && searchBy.value !== '') {
        let a = false;
        let b = false;
        if (v.ID.indexOf(searchBy.value) !== -1) {
          a = true;
        }
        if (v.name.indexOf(searchBy.value) !== -1) {
          b = true;
        }
        ok = a || b;
      }

      v.rankText = banRankText.get(v.rank);

      if (ok) items.push(v);
    }

    return items;
  }
  return [];
});

const groupItems = computed(() => {
  const start = (recordPage.value.no - 1) * recordPage.value.pageSize;
  const end = start + recordPage.value.pageSize;
  return filteredRecordList.value.slice(start, end);
});

const refreshList = async () => {
  const lst = await getBanConfigList();
  recordList.value = lst;
  recordPage.value.total = lst.length;
  recordPage.value.no = 1;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const deleteOne = async (i: any, index: number) => {
  const res = await ElMessageBox.confirm(`确定删除 ${i.ID} 的名单记录吗？`, '删除记录', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
  if (res) {
    await postMapDelOne(i);
    await refreshList();
    ElMessage.success('记录已删除');
  }
};

const beforeUpload = async (file: UploadUserFile) => {
  try {
    const c = await importBanConfig(file);
    if (c.result) {
      ElMessage.success('导入黑白名单完成');
      await nextTick(async () => {
        await refreshList();
      });
    } else {
      ElMessage.error(formatUploadFailureMessage(c.err, '导入黑白名单失败'));
    }
  } catch (err) {
    console.error('import ban config failed:', err);
    ElMessage.error(formatUploadFailureMessage(err, '导入黑白名单失败'));
  }
  return false;
};

onBeforeMount(async () => {
  await refreshList();
});
</script>

<template>
  <div class="ban-toolbar">
    <el-input
      v-model="searchBy"
      class="ban-search"
      clearable
      :prefix-icon="Search"
      aria-label="搜索名单"
      placeholder="账号 ID 或名称" />
    <div class="ban-filters" role="group" aria-label="按级别筛选">
      <el-checkbox v-model="showBanned">拉黑</el-checkbox>
      <el-checkbox v-model="showWarn">警告</el-checkbox>
      <el-checkbox v-model="showTrusted">信任</el-checkbox>
      <el-checkbox v-model="showOthers">常规</el-checkbox>
    </div>
    <div class="workspace-actions ban-actions">
      <el-upload
        action=""
        multiple
        accept="application/json,.json"
        :show-file-list="false"
        :before-upload="beforeUpload">
        <el-button :icon="Upload">导入</el-button>
      </el-upload>
      <el-button
        :icon="Download"
        tag="a"
        target="_blank"
        class="ban-export"
        :href="`${urlBase}/sd-api/banconfig/export`">
        导出
      </el-button>
      <el-button type="primary" :icon="Plus" @click="dialogAddShow = true">添加记录</el-button>
    </div>
  </div>

  <div v-if="groupItems.length === 0" class="workspace-panel workspace-empty">
    <strong>{{ recordList.length ? '没有符合条件的记录' : '名单为空' }}</strong>
    <p>
      {{
        recordList.length
          ? '调整搜索词或级别筛选后再试。'
          : '用户或群组达到警告/拉黑阈值时会自动加入；也可以手动添加。'
      }}
    </p>
  </div>

  <ul v-else class="ban-list">
    <li v-for="(i, index) in groupItems" :key="i.ID" class="workspace-panel ban-item">
      <div class="ban-item-header">
        <el-tag
          :type="
            i.rankText === '禁止'
              ? 'danger'
              : i.rankText === '警告'
                ? 'warning'
                : i.rankText === '信任'
                  ? 'success'
                  : 'info'
          "
          disable-transitions>
          {{ i.rankText === '禁止' ? '拉黑' : i.rankText }}
        </el-tag>
        <div class="ban-identity">
          <strong>{{ i.name || '未知名称' }}</strong>
          <span>{{ i.ID }}</span>
        </div>
        <span class="ban-score" title="怒气值越高越接近拉黑阈值">怒气值 {{ i.score }}</span>
        <el-button
          class="ban-delete"
          :icon="Delete"
          type="danger"
          size="small"
          plain
          @click="deleteOne(i, index)"
          >删除</el-button
        >
      </div>
      <ul v-if="i.reasons?.length" class="ban-reasons">
        <li v-for="(j, index) in i.reasons" :key="index">
          <el-tooltip :content="dayjs.unix(i.times[index]).format('YYYY-MM-DD HH:mm:ss')">
            <time class="ban-time">{{ dayjs.unix(i.times[index]).fromNow() }}</time>
          </el-tooltip>
          <span>在 {{ i.places[index] }}：{{ j }}</span>
        </li>
      </ul>
    </li>
  </ul>

  <footer class="ban-pagination">
    <el-pagination
      v-model:current-page="recordPage.no"
      v-model:page-size="recordPage.pageSize"
      :pager-count="5"
      layout="prev, pager, next, total"
      background
      hide-on-single-page
      :total="filteredRecordList.length" />
  </footer>

  <el-dialog
    v-model="dialogAddShow"
    title="添加名单记录"
    width="min(480px, calc(100vw - 32px))"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="the-dialog">
    <el-form label-width="auto">
      <el-form-item label="账号 ID" required>
        <el-input v-model="addData.id" placeholder="例如 QQ:12345 或 QQ-Group:12345"></el-input>
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="addData.name" placeholder="留空则自动获取"></el-input>
      </el-form-item>
      <el-form-item label="原因">
        <el-input v-model="addData.reason" placeholder="默认为“骰主后台设置”"></el-input>
      </el-form-item>
      <el-form-item label="加入">
        <el-radio-group v-model="addData.rank">
          <el-radio
            v-for="item in [
              { label: '黑名单（拉黑）', value: -30 },
              { label: '白名单（信任）', value: 30 },
            ]"
            :key="item.value"
            :label="item.label"
            :value="item.value" />
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogAddShow = false">取消</el-button>
        <el-button type="primary" :disabled="!addData.id" @click="doAdd">添加</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped lang="css">
.ban-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-bottom: 16px;
}

.ban-search {
  width: min(280px, 100%);
}

.ban-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.ban-filters .el-checkbox {
  margin-inline-end: 0;
}

.ban-actions {
  margin-inline-start: auto;
}

.ban-export {
  text-decoration: none;
}

.ban-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ban-item-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.ban-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ban-identity span {
  font-size: 12px;
  color: var(--seal-text-secondary);
  overflow-wrap: anywhere;
}

.ban-score {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.ban-delete {
  margin-inline-start: auto;
}

.ban-reasons {
  display: grid;
  gap: 4px;
  margin: 12px 0 0;
  padding: 12px 0 0;
  list-style: none;
  border-top: 1px solid var(--seal-border-color-light);
  font-size: 13px;
}

.ban-reasons li {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.ban-time {
  min-width: 6em;
  color: var(--seal-text-secondary);
}

.ban-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

@media (max-width: 767px) {
  .ban-actions {
    margin-inline-start: 0;
  }
}
</style>
