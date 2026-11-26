<script lang="ts" setup>
import { Back, Delete, Download, Refresh, Search, Select, Upload } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import randomColor from 'randomcolor';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../../tailwind.config';
import {
  browseStoryItems,
  downloadStoryLog,
  getStoryInfo,
  getStoryLogPage,
  deleteStoryLog,
  type LogBrowseItem,
  type StoryLog,
} from '~/api/story';
import { postStoryLog } from '~/api/story';
import LogRichContent from '~/components/utils/log-rich-content.vue';
const twColors = resolveConfig(tailwindConfig).theme.colors;

interface Log {
  id: number;
  name: string;
  groupId: string;
  createdAt: number;
  updatedAt: number;
  size: number;
  pitch?: boolean;
  current?: number;
}

async function getInfo() {
  return getStoryInfo();
  //   return backend.get(url("info"))
}

// async function getLogs() {
//     return apiFetch(url("logs"), {
//         method: "get", headers: { token: token }
//     })
// }

const queryLogPage = ref({
  pageNum: 1,
  pageSize: 20,
  total: 0,
  name: '',
  groupId: '',
  createdTime: [undefined, undefined] as unknown as [Date, Date],
});

const getLogPage = getStoryLogPage;
// async function getLogPage(params: { pageNum: number, pageSize: number, name?: string, groupId?: string, createdTimeBegin?: number, createdTimeEnd?: number }) {
//     return await backend.get(url("logs/page"), {
//       headers: {token: token}, params: params
//     })
// }

// async function getItems(v: Log) {
//     // ofetch get+params 至少在开发模式有莫名奇妙的 bug ，会丢失 baseURL
//     // 下面的接口就先不更换了
//     return await backend.get(url('items'), { params: v, headers: { token } }) as unknown as Item[]
// }

const browseQuery = reactive({
  pageNum: 1,
  pageSize: 50,
  total: 0,
  keyword: '',
  sender: '',
  timeRange: [undefined, undefined] as unknown as [Date, Date],
  order: 'desc' as 'asc' | 'desc',
});

async function delLog(v: Log) {
  return deleteStoryLog(v);
  // return backend.delete(url('log'), { headers: { token }, data: v }) as unknown as boolean
}

async function uploadLog(v: Log) {
  await ElMessageBox.confirm('将此跑团日志上传至余烬服务器？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  });
  return postStoryLog(v);
  // return backend.post(url("uploadLog"), v,{ headers: { token }})
}

//

const tab: Ref<'list' | 'backup'> = ref('list');
const mode: Ref<'logs' | 'items'> = ref('logs');
const sum_log = ref(0),
  sum_item = ref(0),
  cur_log = ref(0),
  cur_item = ref(0);
dayjs.extend(relativeTime);

const logs: Ref<Log[]> = ref([]);
// 只接受最后一次列表检索的响应，避免慢请求覆盖新筛选结果
let logsRequestId = 0;

async function searchLogs() {
  const params = {
    pageNum: queryLogPage.value.pageNum,
    pageSize: queryLogPage.value.pageSize,
    name: queryLogPage.value.name.trim() || undefined,
    groupId: queryLogPage.value.groupId.trim() || undefined,
    createdTimeBegin: queryLogPage.value.createdTime?.[0]
      ? dayjs(queryLogPage.value.createdTime?.[0]).startOf('date').unix()
      : undefined,
    createdTimeEnd: queryLogPage.value.createdTime?.[1]
      ? dayjs(queryLogPage.value.createdTime?.[1]).endOf('date').unix()
      : undefined,
  };
  const requestId = ++logsRequestId;
  try {
    const result:
      | { result: false; err?: string }
      | {
          result: true;
          total: number;
          data: Log[];
          pageNum: number;
          pageSize: number;
        } = await getLogPage(params);
    if (requestId !== logsRequestId) {
      return;
    }
    if (result.result) {
      logs.value = result.data;
      queryLogPage.value.total = result.total;
    } else {
      ElMessage.error(result.err ? `无法获取跑团日志：${result.err}` : '无法获取跑团日志');
    }
  } catch {
    if (requestId !== logsRequestId) {
      return;
    }
    ElMessage.error('无法获取跑团日志');
  }
}

const refreshLogs = async () => {
  try {
    [sum_log.value, sum_item.value, cur_log.value, cur_item.value] = await getInfo();
  } catch {
    ElMessage.error('无法获取跑团日志统计');
  }
  await searchLogs();
};

const searchLogsFirstPage = async () => {
  queryLogPage.value.pageNum = 1;
  await searchLogs();
};

const resetLogs = async () => {
  queryLogPage.value.name = '';
  queryLogPage.value.groupId = '';
  queryLogPage.value.createdTime = [undefined, undefined] as unknown as [Date, Date];
  await searchLogsFirstPage();
};

const handleLogPageChange = async (val: number) => {
  queryLogPage.value.pageNum = val;
  await searchLogs();
};

const handlePageSizeChange = async (val: number) => {
  queryLogPage.value.pageNum = 1;
  queryLogPage.value.pageSize = val;
  await searchLogs();
};

async function DelLog(v: Log, flag = true) {
  try {
    await ElMessageBox.confirm('是否删除此跑团日志？', '删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  try {
    const info = await delLog(v);
    if (info) {
      ElMessage({
        message: '删除成功',
        type: 'success',
      });
      if (flag) await refreshLogs();
    } else {
      ElMessage({
        message: '删除失败',
        type: 'error',
      });
    }
  } catch {
    ElMessage({
      message: '删除失败',
      type: 'error',
    });
  }
}

async function DelLogs() {
  try {
    await ElMessageBox.confirm('是否删除所选跑团日志？', '删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  const ls = logs.value.filter(v => v.pitch === true);
  for (const v of ls) {
    try {
      const info = await delLog(v);
      ElMessage({
        message: info === true ? '删除成功' : '删除失败',
        type: info === true ? 'success' : 'error',
      });
    } catch {
      ElMessage({
        message: '删除失败',
        type: 'error',
      });
    }
  }
  await refreshLogs();
}

async function UploadLog(v: Log) {
  const info = (await uploadLog(v)) as string;
  ElMessage({
    showClose: true,
    dangerouslyUseHTMLString: true,
    message: info,
    duration: 0,
  });
  return info;
}

const downloadingLogKey = ref('');
const logDownloadKey = (v: Log) => JSON.stringify([v.groupId, v.name]);

async function DownloadLog(v: Log) {
  const key = logDownloadKey(v);
  if (downloadingLogKey.value) {
    return;
  }
  downloadingLogKey.value = key;
  try {
    const blob = await downloadStoryLog({ groupId: v.groupId, name: v.name });
    if (blob.type.includes('json')) {
      let message = '导出日志失败';
      try {
        const data = JSON.parse(await blob.text()) as { err?: string };
        if (data.err) message = data.err;
      } catch {
        // 保留默认错误提示
      }
      throw new Error(message);
    }
    const safe = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe(v.groupId)}_${safe(v.name)}_${dayjs().format('YYMMDDHHmmss')}.zip`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    ElMessage.error(
      message
        ? message.startsWith('导出日志失败')
          ? message
          : `导出日志失败：${message}`
        : '导出日志失败',
    );
  } finally {
    downloadingLogKey.value = '';
  }
}
//

const item_data: Ref<LogBrowseItem[]> = ref([]);
const selectedLog = ref<StoryLog | null>(null);
// 只接受最后一次检索的响应，避免快速切换筛选/日志时旧响应覆盖新结果
let browseRequestId = 0;
const browseLoading = ref(false);

const users = ref({}) as Ref<Record<string, Array<string>>>;

const showBrowseError = (err?: string) => {
  ElMessage.error(err ? `无法获取群消息：${err}` : '无法获取群消息');
};

async function searchItems(resetPage = false) {
  const log = selectedLog.value;
  if (!log) {
    return;
  }
  if (resetPage) {
    browseQuery.pageNum = 1;
  }
  const requestId = ++browseRequestId;
  browseLoading.value = true;
  try {
    const result = await browseStoryItems({
      pageNum: browseQuery.pageNum,
      pageSize: browseQuery.pageSize,
      groupId: log.groupId,
      logName: log.name,
      keyword: browseQuery.keyword.trim() || undefined,
      sender: browseQuery.sender.trim() || undefined,
      timeBegin: browseQuery.timeRange?.[0] ? dayjs(browseQuery.timeRange[0]).unix() : undefined,
      timeEnd: browseQuery.timeRange?.[1] ? dayjs(browseQuery.timeRange[1]).unix() : undefined,
      order: browseQuery.order,
    });
    if (requestId !== browseRequestId) {
      return;
    }
    if (result.result) {
      item_data.value = result.data ?? [];
      browseQuery.total = result.total;
    } else {
      item_data.value = [];
      browseQuery.total = 0;
      showBrowseError(result.err);
    }
  } catch {
    if (requestId !== browseRequestId) {
      return;
    }
    item_data.value = [];
    browseQuery.total = 0;
    showBrowseError();
  } finally {
    if (requestId === browseRequestId) {
      browseLoading.value = false;
    }
  }
}

async function openItem(log: Log) {
  selectedLog.value = log;
  mode.value = 'items';
  browseQuery.keyword = '';
  browseQuery.sender = '';
  browseQuery.timeRange = [undefined, undefined] as unknown as [Date, Date];
  browseQuery.order = 'desc';
  await searchItems(true);
}

const handleItemPageChange = async (val: number) => {
  browseQuery.pageNum = val;
  await searchItems();
};

const handleItemPageSizeChange = async (val: number) => {
  browseQuery.pageSize = val;
  await searchItems(true);
};

async function resetBrowse() {
  browseQuery.keyword = '';
  browseQuery.sender = '';
  browseQuery.timeRange = [undefined, undefined] as unknown as [Date, Date];
  browseQuery.order = 'desc';
  await searchItems(true);
}

function closeItem() {
  browseRequestId += 1;
  browseLoading.value = false;
  item_data.value = [];
  selectedLog.value = null;
  browseQuery.total = 0;
  mode.value = 'logs';
  users.value = {};
}

const randomColorWithIndex = (i: number): string => {
  const presets = [
    twColors.red[600],
    twColors.orange[600],
    twColors.yellow[600],
    twColors.green[600],
    twColors.cyan[600],
    twColors.blue[600],
    twColors.purple[600],
    twColors.pink[600],
    twColors.slate[600],
  ];
  const randomColorSystems = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'monochrome',
  ];
  if (i < presets.length) {
    return presets[i];
  } else {
    return randomColor({
      hue: randomColorSystems[i % randomColorSystems.length],
      luminosity: 'dark',
    });
  }
};

const formatItemTime = (ts: number) => dayjs.unix(ts).format('YYYY-MM-DD HH:mm:ss');

// 用用户 ID 的稳定哈希分配颜色：同一用户不因翻页/首次出现在第几页而换色。
const stableColorIndex = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const items = computed(() => {
  const items: LogBrowseItem[] = [];
  item_data.value.forEach(v => {
    if (!users.value[v.IMUserId]) {
      users.value[v.IMUserId] = [randomColorWithIndex(stableColorIndex(v.IMUserId)), v.nickname];
    }
    items.push(v);
  });
  return items;
});

//

onBeforeMount(async () => {
  await refreshLogs();
});
</script>

<template>
  <!--    <header style="margin-bottom: 1rem;">-->
  <!--        &lt;!&ndash; <ElButton type="primary" :icon="Refresh" @click="getLogs(); getInfo()">刷新日志列表</ElButton> &ndash;&gt;-->
  <!--    </header>-->
  <el-tabs v-model="tab" stretch>
    <el-tab-pane label="跑团日志" name="list">
      <template v-if="mode == 'logs'">
        <header>
          <ElCard>
            <template #header>
              <strong style="display: block; margin: 10px 0">跑团日志 / Story</strong>
            </template>
            <el-space direction="vertical" alignment="flex-start">
              <el-text size="large" style="margin-right: 1rem"
                >记录过 {{ sum_log }} 份日志，共计 {{ sum_item }} 条消息</el-text
              >
              <el-text size="large" style="margin-right: 1rem"
                >现有 {{ cur_log }} 份日志，共计 {{ cur_item }} 条消息</el-text
              >
            </el-space>
          </ElCard>
        </header>
        <ElDivider></ElDivider>
        <main>
          <el-form :inline="true" :model="queryLogPage" class="story-filter" @submit.prevent>
            <el-form-item label="日志名">
              <el-input v-model="queryLogPage.name" clearable @keyup.enter="searchLogsFirstPage" />
            </el-form-item>
            <el-form-item label="群号">
              <el-input
                v-model="queryLogPage.groupId"
                clearable
                placeholder="例如 QQ-Group:123456"
                @keyup.enter="searchLogsFirstPage" />
            </el-form-item>
            <el-form-item label="创建时间">
              <el-date-picker
                v-model="queryLogPage.createdTime"
                type="daterange"
                range-separator="-" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="searchLogsFirstPage">查询</el-button>
              <el-button :icon="Refresh" @click="resetLogs">重置</el-button>
            </el-form-item>
          </el-form>
          <ElButtonGroup style="margin-top: 5px; display: block">
            <ElButton
              type="primary"
              size="small"
              :icon="Select"
              @click="logs.forEach(v => (v.pitch = !v.pitch))"
              >全选
            </ElButton>
            <ElButton
              v-show="logs.filter(v => v.pitch).length > 0"
              type="danger"
              size="small"
              :icon="Delete"
              @click="DelLogs()"
              >删除所选</ElButton
            >
          </ElButtonGroup>
          <template v-for="i in logs" :key="i.id">
            <foldable-card style="margin-top: 10px">
              <template #title>
                <el-space>
                  <ElCheckbox v-model="i.pitch" style="float: right" />
                  <el-space wrap>
                    <el-text size="large" tag="strong">{{ i.name }}</el-text>
                    <el-text>({{ i.groupId }})</el-text>
                  </el-space>
                </el-space>
              </template>
              <template #action>
                <div class="story-card-actions">
                  <ElButton size="small" plain @click="openItem(i)">查看</ElButton>
                  <ElButton
                    size="small"
                    plain
                    :icon="Download"
                    :loading="downloadingLogKey === logDownloadKey(i)"
                    :disabled="downloadingLogKey !== '' && downloadingLogKey !== logDownloadKey(i)"
                    @click="DownloadLog(i)"
                    >下载到本地</ElButton
                  >
                  <ElButton size="small" type="primary" :icon="Upload" plain @click="UploadLog(i)"
                    >提取日志
                  </ElButton>
                  <ElButton size="small" type="danger" :icon="Delete" plain @click="DelLog(i)"
                    >删除
                  </ElButton>
                </div>
              </template>

              <el-space direction="vertical" alignment="flex-start">
                <el-space>
                  <el-text>包含 {{ i.size }} 条消息</el-text>
                </el-space>
                <el-space>
                  <el-text>创建于：{{ dayjs.unix(i.createdAt).format('YYYY-MM-DD') }}</el-text>
                  <ElTag size="small" disable-transitions>{{
                    dayjs.unix(i.createdAt).fromNow()
                  }}</ElTag
                  ><br />
                </el-space>
                <el-space>
                  <el-text>更新于：{{ dayjs.unix(i.updatedAt).format('YYYY-MM-DD') }}</el-text>
                  <ElTag size="small" disable-transitions>{{
                    dayjs.unix(i.updatedAt).fromNow()
                  }}</ElTag
                  ><br />
                </el-space>
              </el-space>
            </foldable-card>
          </template>
        </main>
        <div style="display: flex; justify-content: center">
          <el-pagination
            class="pagination"
            :page-size="queryLogPage.pageSize"
            :current-page="queryLogPage.pageNum"
            :pager-count="3"
            :total="queryLogPage.total"
            layout="sizes, prev, pager, next"
            background
            @current-change="handleLogPageChange"
            @size-change="handlePageSizeChange" />
        </div>
      </template>
      <template v-if="mode == 'items'">
        <ElCard shadow="never">
          <template #header>
            <div class="story-header">
              <div class="story-title">
                <strong>{{ selectedLog?.name }}</strong>
                <el-text type="info" size="small">{{ selectedLog?.groupId }}</el-text>
              </div>
              <ElButton type="primary" :icon="Back" @click="closeItem()">返回列表</ElButton>
            </div>
          </template>
          <ElCollapse>
            <ElCollapseItem title="颜色设置">
              <template v-for="(_, id) in users" :key="id">
                <div style="padding: 0.5rem">
                  <el-color-picker
                    v-model="users[id][0]"
                    color-format="hex"
                    :predefine="randomColor({ count: 10 })" />
                  <span style="padding-left: 1rem">{{ users[id][1] }}</span>
                </div>
              </template>
            </ElCollapseItem>
          </ElCollapse>
        </ElCard>
        <el-card shadow="never" class="filter-card">
          <el-form :inline="true" :model="browseQuery" class="story-filter" @submit.prevent>
            <el-form-item label="关键词">
              <el-input
                v-model="browseQuery.keyword"
                clearable
                placeholder="消息内容"
                @keyup.enter="searchItems(true)" />
            </el-form-item>
            <el-form-item label="发送者">
              <el-input
                v-model="browseQuery.sender"
                clearable
                placeholder="昵称或用户 ID"
                @keyup.enter="searchItems(true)" />
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="browseQuery.timeRange"
                type="datetimerange"
                range-separator="-"
                start-placeholder="开始时间"
                end-placeholder="结束时间" />
            </el-form-item>
            <el-form-item label="排序">
              <el-radio-group v-model="browseQuery.order" @change="searchItems(true)">
                <el-radio-button value="desc">最新在前</el-radio-button>
                <el-radio-button value="asc">最早在前</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="searchItems(true)">查询</el-button>
              <el-button :icon="Refresh" @click="resetBrowse">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        <div class="my-4 px-4" v-loading="browseLoading">
          <template v-for="(v, i1) in items" :key="i1">
            <div class="story-log-message">
              <div class="story-log-meta">
                <span class="story-log-time">{{ formatItemTime(v.time) }}</span>
                <span class="story-log-userid">{{ v.IMUserId }}</span>
                <el-tag v-if="v.isDice" size="small" effect="plain">骰子</el-tag>
                <span v-else class="story-log-role">玩家</span>
              </div>
              <div class="story-log-body" :style="{ color: users[v.IMUserId][0] }">
                <span>{{ v.nickname }}：</span>
                <log-rich-content :content="v.message" />
              </div>
            </div>
          </template>
        </div>
        <div style="display: flex; justify-content: center">
          <el-pagination
            class="pagination"
            :page-size="browseQuery.pageSize"
            :current-page="browseQuery.pageNum"
            :page-sizes="[20, 50, 100, 200]"
            :pager-count="5"
            :total="browseQuery.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @current-change="handleItemPageChange"
            @size-change="handleItemPageSizeChange" />
        </div>
      </template>
    </el-tab-pane>
    <el-tab-pane label="日志备份" name="backup">
      <story-backup />
    </el-tab-pane>
  </el-tabs>
</template>

<style scoped lang="css">
.pagination {
  margin-top: 10px;
  background-color: var(--seal-surface-soft);
}

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.story-card-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  row-gap: 0.4rem;
}

.story-title {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.filter-card {
  margin-top: 10px;
}

@media (max-width: 768px) {
  .story-filter :deep(.el-form-item) {
    display: flex;
    width: 100%;
    margin-right: 0;
  }

  .story-filter :deep(.el-form-item__content) {
    flex: 1;
    min-width: 0;
  }

  .story-filter :deep(.el-input),
  .story-filter :deep(.el-date-editor) {
    width: 100%;
  }

  .story-title {
    overflow-wrap: anywhere;
  }

  .pagination {
    flex-wrap: wrap;
    justify-content: center;
    row-gap: 0.5rem;
  }

  .pagination :deep(.el-pagination__sizes),
  .pagination :deep(.el-pagination__jump) {
    display: none;
  }
}

.story-log-message {
  margin: 1em 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.story-log-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.15rem;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  white-space: normal;
}

.story-log-time {
  font-variant-numeric: tabular-nums;
}

.story-log-userid {
  overflow-wrap: anywhere;
}

.story-log-role {
  color: var(--el-text-color-secondary);
}
</style>
