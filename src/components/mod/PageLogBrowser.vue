<script setup lang="ts">
import { Back, Refresh, Search } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import {
  browseStoryItems,
  getStoryLogPage,
  type LogBrowseItem,
  type LogBrowseParams,
  type StoryLog,
} from '~/api/story';
import LogRichContent from '~/components/utils/log-rich-content.vue';

const logQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
  name: '',
  groupId: '',
  createdTime: [undefined, undefined] as unknown as [Date, Date],
});

const logs = ref<StoryLog[]>([]);
const logsLoading = ref(false);

const mode = ref<'logs' | 'items'>('logs');
const selectedLog = ref<StoryLog | null>(null);

const browseQuery = reactive({
  pageNum: 1,
  pageSize: 50,
  keyword: '',
  sender: '',
  timeRange: [undefined, undefined] as unknown as [Date, Date],
  order: 'desc' as 'asc' | 'desc',
});
const items = ref<LogBrowseItem[]>([]);
const total = ref(0);
const itemsLoading = ref(false);

const formatTime = (ts: number) => dayjs.unix(ts).format('YYYY-MM-DD HH:mm:ss');

async function searchLogs() {
  logsLoading.value = true;
  try {
    const result = await getStoryLogPage({
      pageNum: logQuery.pageNum,
      pageSize: logQuery.pageSize,
      name: logQuery.name || undefined,
      groupId: logQuery.groupId || undefined,
      createdTimeBegin: logQuery.createdTime?.[0]
        ? dayjs(logQuery.createdTime[0]).startOf('date').unix()
        : undefined,
      createdTimeEnd: logQuery.createdTime?.[1]
        ? dayjs(logQuery.createdTime[1]).endOf('date').unix()
        : undefined,
    });
    if (result.result) {
      logs.value = result.data ?? [];
      logQuery.total = result.total;
    } else {
      ElMessage.error('无法获取日志列表' + (result.err ?? ''));
    }
  } catch {
    ElMessage.error('无法获取日志列表');
  } finally {
    logsLoading.value = false;
  }
}

function resetLogs() {
  logQuery.pageNum = 1;
  logQuery.name = '';
  logQuery.groupId = '';
  logQuery.createdTime = [undefined, undefined] as unknown as [Date, Date];
  searchLogs();
}

function searchLogsFirstPage() {
  logQuery.pageNum = 1;
  searchLogs();
}

function handleLogPageChange(page: number) {
  logQuery.pageNum = page;
  searchLogs();
}

function handleLogPageSizeChange(size: number) {
  logQuery.pageSize = size;
  logQuery.pageNum = 1;
  searchLogs();
}

async function searchItems(resetPage = false) {
  if (!selectedLog.value) {
    return;
  }
  if (resetPage) {
    browseQuery.pageNum = 1;
  }
  itemsLoading.value = true;
  try {
    const params: LogBrowseParams = {
      pageNum: browseQuery.pageNum,
      pageSize: browseQuery.pageSize,
      groupId: selectedLog.value.groupId,
      logName: selectedLog.value.name,
      keyword: browseQuery.keyword.trim() || undefined,
      sender: browseQuery.sender.trim() || undefined,
      timeBegin: browseQuery.timeRange?.[0] ? dayjs(browseQuery.timeRange[0]).unix() : undefined,
      timeEnd: browseQuery.timeRange?.[1] ? dayjs(browseQuery.timeRange[1]).unix() : undefined,
      order: browseQuery.order,
    };
    const result = await browseStoryItems(params);
    if (result.result) {
      items.value = result.data ?? [];
      total.value = result.total;
    } else {
      items.value = [];
      total.value = 0;
      ElMessage.error('查询群消息失败：' + (result.err ?? '未知错误'));
    }
  } catch {
    ElMessage.error('查询群消息失败');
  } finally {
    itemsLoading.value = false;
  }
}

function openLog(row: Record<string, unknown>) {
  const log = row as unknown as StoryLog;
  selectedLog.value = log;
  mode.value = 'items';
  browseQuery.pageNum = 1;
  browseQuery.keyword = '';
  browseQuery.sender = '';
  browseQuery.timeRange = [undefined, undefined] as unknown as [Date, Date];
  browseQuery.order = 'desc';
  searchItems();
}

function backToLogs() {
  mode.value = 'logs';
  selectedLog.value = null;
  items.value = [];
  total.value = 0;
}

function resetBrowse() {
  browseQuery.keyword = '';
  browseQuery.sender = '';
  browseQuery.timeRange = [undefined, undefined] as unknown as [Date, Date];
  browseQuery.order = 'desc';
  browseQuery.pageNum = 1;
  searchItems();
}

function handleBrowsePageChange(page: number) {
  browseQuery.pageNum = page;
  searchItems();
}

function handleBrowsePageSizeChange(size: number) {
  browseQuery.pageSize = size;
  browseQuery.pageNum = 1;
  searchItems();
}

onBeforeMount(searchLogs);
</script>

<template>
  <header class="page-header">
    <h2>log 查看</h2>
  </header>

  <div class="tip">
    <p class="title">说明</p>
    <div>
      浏览已记录的群消息。这里查的是群消息记录（log），不是控制台运行日志；页面只读，不显示已撤回消息。
    </div>
  </div>

  <template v-if="mode === 'logs'">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="logQuery" @submit.prevent>
        <el-form-item label="群号">
          <el-input
            v-model="logQuery.groupId"
            clearable
            placeholder="例如 QQ-Group:123456"
            @keyup.enter="searchLogsFirstPage" />
        </el-form-item>
        <el-form-item label="日志名">
          <el-input v-model="logQuery.name" clearable @keyup.enter="searchLogsFirstPage" />
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="logQuery.createdTime"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="searchLogsFirstPage">查询</el-button>
          <el-button :icon="Refresh" @click="resetLogs">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table v-loading="logsLoading" :data="logs" stripe class="log-table">
      <el-table-column prop="name" label="日志名" min-width="160" show-overflow-tooltip />
      <el-table-column prop="groupId" label="群号" min-width="180" show-overflow-tooltip />
      <el-table-column prop="size" label="消息数" width="100" />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="openLog(row)">浏览</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有找到群消息日志" />
      </template>
    </el-table>

    <div class="pagination-row">
      <el-pagination
        :current-page="logQuery.pageNum"
        :page-size="logQuery.pageSize"
        :page-sizes="[20, 50, 100]"
        :total="logQuery.total"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handleLogPageChange"
        @size-change="handleLogPageSizeChange" />
    </div>
  </template>

  <template v-else>
    <div class="browser-header">
      <el-button :icon="Back" @click="backToLogs">返回日志列表</el-button>
      <div class="browser-title">
        <strong>{{ selectedLog?.name }}</strong>
        <el-text type="info" size="small">{{ selectedLog?.groupId }}</el-text>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="browseQuery" @submit.prevent>
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
          <el-radio-group v-model="browseQuery.order">
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

    <el-table v-loading="itemsLoading" :data="items" stripe class="message-table">
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.time) }}</template>
      </el-table-column>
      <el-table-column label="发送者" width="190">
        <template #default="{ row }">
          <div class="sender-name">{{ row.nickname }}</div>
          <div class="sender-id">{{ row.IMUserId }}</div>
        </template>
      </el-table-column>
      <el-table-column label="消息" min-width="360">
        <template #default="{ row }">
          <div class="message-content">
            <log-rich-content :content="row.message" />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.isDice" size="small" effect="plain">骰子</el-tag>
          <span v-else class="muted">玩家</span>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有符合条件的群消息" />
      </template>
    </el-table>

    <div class="pagination-row">
      <el-pagination
        :current-page="browseQuery.pageNum"
        :page-size="browseQuery.pageSize"
        :page-sizes="[20, 50, 100, 200]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="handleBrowsePageChange"
        @size-change="handleBrowsePageSizeChange" />
    </div>
  </template>
</template>

<style scoped lang="css">
.filter-card {
  margin-bottom: 1rem;
}

.log-table,
.message-table {
  width: 100%;
}

.browser-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.browser-title {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sender-name {
  font-weight: 600;
}

.sender-id {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

.message-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}

.muted {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
}

.pagination-row {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}
</style>
