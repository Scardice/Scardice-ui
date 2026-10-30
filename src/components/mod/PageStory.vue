<script lang="ts" setup>
import { Back, Delete, Search, Upload } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import randomColor from 'randomcolor';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../../tailwind.config';
import { getStoryInfo, getStoryLogPage, getStoryItemPage, deleteStoryLog } from '~/api/story';
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

interface Item {
  id: number;
  logId: number;
  nickname: string;
  IMUserId: string;
  time: number;
  message: string;
  isDice: boolean;
  isEdit?: boolean;
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

const logItemPage = ref({
  pageNum: 1,
  pageSize: 100,
  size: 0,
  logName: '',
  groupId: '',
});

// async function getItemPage(params: { pageNum: number, pageSize: number, logName: string, groupId: string }) {
//     return backend.get(url("items/page"), {
//         headers: { token: token }, params: params
//     })
// }
const getItemPage = getStoryItemPage;

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

async function searchLogs() {
  const params = {
    ...queryLogPage.value,
    createdTimeBegin: queryLogPage.value.createdTime?.[0]
      ? dayjs(queryLogPage.value.createdTime?.[0]).startOf('date').unix()
      : undefined,
    createdTimeEnd: queryLogPage.value.createdTime?.[1]
      ? dayjs(queryLogPage.value.createdTime?.[1]).endOf('date').unix()
      : undefined,
  };
  const result:
    | { result: false; err?: string }
    | {
        result: true;
        total: number;
        data: Log[];
        pageNum: number;
        pageSize: number;
      } = await getLogPage(params);
  if (result.result) {
    logs.value = result.data;
    queryLogPage.value.total = result.total;
  } else {
    ElMessage.error('无法获取跑团日志' + result.err);
  }
}

const refreshLogs = async () => {
  [sum_log.value, sum_item.value, cur_log.value, cur_item.value] = await getInfo();
  await searchLogs();
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
  await ElMessageBox.confirm('是否删除此跑团日志？', '删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
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
  });
}

async function DelLogs() {
  await ElMessageBox.confirm('是否删除所选跑团日志？', '删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    const ls = [];
    for (const v of logs.value) {
      if (v.pitch === true) {
        ls.push(v);
      }
    }
    for (const v of ls) {
      const info = await delLog(v);
      if (info === true) {
        ElMessage({
          message: '删除成功',
          type: 'success',
        });
      } else {
        ElMessage({
          message: '删除失败',
          type: 'error',
        });
      }
    }
    await refreshLogs();
  });
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
//

const item_data: Ref<Item[]> = ref([]);

const users = ref({}) as Ref<Record<string, Array<string>>>;

async function openItem(log: Log) {
  logItemPage.value.logName = log.name;
  logItemPage.value.groupId = log.groupId;
  logItemPage.value.size = log.size;
  logItemPage.value.pageNum = 1;
  item_data.value = (await getItemPage({
    pageNum: logItemPage.value.pageNum,
    pageSize: logItemPage.value.pageSize,
    logName: logItemPage.value.logName,
    groupId: logItemPage.value.groupId,
  })) as unknown as Item[];
  mode.value = 'items';
}

const handleItemPageChange = async (val: number) => {
  logItemPage.value.pageNum = val;
  item_data.value = (await getItemPage(logItemPage.value)) as unknown as Item[];
};

function closeItem() {
  item_data.value = [];
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

const items = computed(() => {
  const items: Item[] = [];
  item_data.value.forEach((v, i) => {
    if (!users.value[v.IMUserId]) {
      users.value[v.IMUserId] = [randomColorWithIndex(i), v.nickname];
    }
    items.push(v);
  });
  return items;
});

const selectedLogCount = computed(() => logs.value.filter(v => v.pitch).length);
const allLogsSelected = computed(
  () => logs.value.length > 0 && selectedLogCount.value === logs.value.length,
);
const toggleAllLogs = (checked: string | number | boolean) => {
  logs.value.forEach(v => (v.pitch = Boolean(checked)));
};

onBeforeMount(async () => {
  await refreshLogs();
});
</script>

<template>
  <section class="workspace-page story-workspace" aria-labelledby="story-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="story-workspace-title" class="workspace-title">跑团日志</h1>
        <p class="workspace-subtitle">
          查看、提取和备份群内用 .log 记录的跑团日志。累计记录 {{ sum_log }} 份 /
          {{ sum_item }} 条，现存 {{ cur_log }} 份 / {{ cur_item }} 条。
        </p>
      </div>
    </header>

    <div class="workspace-body workspace-scroll">
      <el-tabs v-model="tab">
        <el-tab-pane label="日志列表" name="list">
          <template v-if="mode == 'logs'">
            <el-form
              :inline="true"
              :model="queryLogPage"
              class="story-query"
              @submit.prevent="searchLogs">
              <el-form-item label="日志名">
                <el-input v-model="queryLogPage.name" clearable placeholder="全部" />
              </el-form-item>
              <el-form-item label="群号">
                <el-input v-model="queryLogPage.groupId" clearable placeholder="全部" />
              </el-form-item>
              <el-form-item label="创建时间">
                <el-date-picker
                  v-model="queryLogPage.createdTime"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
              </el-form-item>
            </el-form>

            <div v-if="logs.length" class="story-bulkbar">
              <el-checkbox
                :model-value="allLogsSelected"
                :indeterminate="selectedLogCount > 0 && !allLogsSelected"
                @change="toggleAllLogs"
                >全选本页</el-checkbox
              >
              <el-button
                type="danger"
                size="small"
                plain
                :icon="Delete"
                :disabled="selectedLogCount === 0"
                @click="DelLogs()"
                >{{ selectedLogCount ? `删除所选（${selectedLogCount}）` : '删除所选' }}</el-button
              >
            </div>

            <div v-else class="workspace-panel workspace-empty">
              <strong>没有找到日志</strong>
              <p>在群内使用 .log new 开始记录；如已设置筛选条件，请调整后重新查询。</p>
            </div>

            <div class="story-list">
              <foldable-card v-for="i in logs" :key="i.id">
                <template #title>
                  <div class="story-title">
                    <el-checkbox v-model="i.pitch" :aria-label="`选择日志 ${i.name}`" />
                    <div class="story-identity">
                      <strong>{{ i.name }}</strong>
                      <span>{{ i.groupId }}</span>
                    </div>
                  </div>
                </template>
                <template #action>
                  <el-button size="small" @click="openItem(i)">查看</el-button>
                  <el-button size="small" :icon="Upload" @click="UploadLog(i)">提取日志</el-button>
                  <el-button size="small" type="danger" :icon="Delete" plain @click="DelLog(i)"
                    >删除
                  </el-button>
                </template>

                <dl class="story-meta">
                  <div>
                    <dt>消息数</dt>
                    <dd>{{ i.size }} 条</dd>
                  </div>
                  <div>
                    <dt>创建于</dt>
                    <dd :title="dayjs.unix(i.createdAt).format('YYYY-MM-DD HH:mm')">
                      {{ dayjs.unix(i.createdAt).format('YYYY-MM-DD') }}（{{
                        dayjs.unix(i.createdAt).fromNow()
                      }}）
                    </dd>
                  </div>
                  <div>
                    <dt>更新于</dt>
                    <dd :title="dayjs.unix(i.updatedAt).format('YYYY-MM-DD HH:mm')">
                      {{ dayjs.unix(i.updatedAt).format('YYYY-MM-DD') }}（{{
                        dayjs.unix(i.updatedAt).fromNow()
                      }}）
                    </dd>
                  </div>
                </dl>
              </foldable-card>
            </div>

            <div class="story-pagination">
              <el-pagination
                :page-size="queryLogPage.pageSize"
                :current-page="queryLogPage.pageNum"
                :pager-count="5"
                :total="queryLogPage.total"
                layout="total, sizes, prev, pager, next"
                background
                hide-on-single-page
                @current-change="handleLogPageChange"
                @size-change="handlePageSizeChange" />
            </div>
          </template>

          <template v-if="mode == 'items'">
            <div class="story-viewer-bar">
              <el-button :icon="Back" @click="closeItem()">返回日志列表</el-button>
            </div>
            <el-collapse class="story-colors">
              <el-collapse-item title="调整发言人颜色">
                <div class="story-color-list">
                  <label v-for="(_, id) in users" :key="id" class="story-color-item">
                    <el-color-picker
                      v-model="users[id][0]"
                      color-format="hex"
                      :predefine="randomColor({ count: 10 })" />
                    <span>{{ users[id][1] }}</span>
                  </label>
                </div>
              </el-collapse-item>
            </el-collapse>
            <div class="workspace-panel story-messages">
              <div
                v-for="(v, i1) in items"
                :key="i1"
                class="story-log-message"
                :style="{ color: users[v.IMUserId][0] }">
                <span>{{ v.nickname }}：</span>
                <log-rich-content :content="v.message" />
              </div>
            </div>
            <div class="story-pagination">
              <el-pagination
                :page-size="logItemPage.pageSize"
                :current-page="logItemPage.pageNum"
                :pager-count="5"
                :total="logItemPage.size"
                layout="prev, pager, next"
                background
                hide-on-single-page
                @current-change="handleItemPageChange" />
            </div>
          </template>
        </el-tab-pane>
        <el-tab-pane label="日志备份" name="backup">
          <story-backup />
        </el-tab-pane>
      </el-tabs>
    </div>
  </section>
</template>

<style scoped lang="css">
.story-query :deep(.el-form-item) {
  margin-bottom: 12px;
}

.story-query :deep(.el-input) {
  width: 12rem;
}

.story-bulkbar,
.story-viewer-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.story-list {
  display: grid;
  gap: 12px;
}

.story-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.story-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.story-identity strong {
  font-size: 15px;
  overflow-wrap: anywhere;
}

.story-identity span {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.story-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  margin: 0;
  font-size: 13px;
}

.story-meta dt {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.story-meta dd {
  margin: 0;
}

.story-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.story-colors {
  margin-bottom: 12px;
}

.story-color-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}

.story-color-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.story-log-message {
  margin: 0.75em 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
