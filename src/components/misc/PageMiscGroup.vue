<template>
  <section class="workspace-page group-workspace" aria-labelledby="group-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="group-workspace-title" class="workspace-title">群组管理</h1>
        <p class="workspace-subtitle">
          查看骰子加入的群组，按需停用、退群或清理离线群组的本地记录。
        </p>
      </div>
      <div class="workspace-actions">
        <el-button :icon="Refresh" @click="refreshListWithNameRetry">刷新</el-button>
        <el-tooltip content="只能选择离线群组；仅删除本地记录，不会退群" placement="bottom">
          <el-button
            type="danger"
            plain
            :icon="Delete"
            :disabled="selectedGroupIds.length === 0"
            @click="deleteSelectedGroups">
            {{
              selectedGroupIds.length
                ? `删除所选记录（${selectedGroupIds.length}）`
                : '删除所选记录'
            }}
          </el-button>
        </el-tooltip>
      </div>
    </header>

    <section class="workspace-panel group-filter-panel" aria-label="筛选群组">
      <label class="group-filter-label" for="group-search">搜索</label>
      <div class="group-filter-controls">
        <el-input
          id="group-search"
          v-model="searchBy"
          class="group-search"
          clearable
          :prefix-icon="Search"
          placeholder="群号、群名或邀请人" />
        <el-select
          v-model="endpointFilter"
          class="group-endpoint-select"
          clearable
          filterable
          :value-on-clear="''"
          aria-label="按协议端筛选"
          placeholder="全部协议端"
          @clear="endpointFilter = ''">
          <el-option
            v-for="item in endpointOptions"
            :key="item.value"
            :value="item.value"
            :label="item.label" />
        </el-select>
        <span class="group-count">
          显示 {{ groupItems.length }} / {{ groupList.items?.length || 0 }} 个群组
        </span>
      </div>

      <span class="group-filter-label">平台</span>
      <el-checkbox-group v-model="checkList" class="group-filter-controls" aria-label="平台">
        <el-checkbox v-for="item in platformOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </el-checkbox>
      </el-checkbox-group>

      <span class="group-filter-label">条件</span>
      <div class="group-filter-controls">
        <el-checkbox v-model="filter30daysUnused">30 天未使用</el-checkbox>
        <el-checkbox v-model="showOfflineOnly">只看离线群组</el-checkbox>
        <el-checkbox v-model="orderByTimeDesc">最近使用的排在前面</el-checkbox>
      </div>
    </section>

    <div v-if="groupItems.length === 0" class="workspace-panel workspace-empty">
      <strong>{{ groupList.items?.length ? '没有符合筛选条件的群组' : '还没有群组记录' }}</strong>
      <p>
        {{
          groupList.items?.length
            ? '调整平台、协议端或搜索条件后再试。'
            : '骰子加入群组并收到消息后，群组会出现在这里。'
        }}
      </p>
    </div>
    <div v-else v-bind="containerProps" class="workspace-body group-list">
      <div v-bind="wrapperProps">
        <div v-for="item in list" :key="item.index">
          <foldable-card class="group-card">
            <template #title>
              <div class="item-header">
                <el-tooltip
                  :content="
                    isGroupOffline(item.data) ? '选中后可批量删除本地记录' : '在线群组不能删除记录'
                  "
                  placement="top">
                  <el-checkbox
                    :disabled="!isGroupOffline(item.data)"
                    :aria-label="`选择 ${item.data.groupId}`"
                    :model-value="selectedGroupIds.includes(item.data.groupId)"
                    @change="toggleGroupSelection(item.data.groupId, $event)" />
                </el-tooltip>
                <label class="workspace-toggle group-active-toggle">
                  <el-switch
                    v-model="item.data.active"
                    :aria-label="`在 ${item.data.groupId} 响应指令`"
                    @click="item.data.changed = true" />
                  <span>{{ item.data.active ? '响应指令' : '已停用' }}</span>
                </label>
                <div class="group-identity">
                  <strong class="group-name">{{ item.data.groupName || '未获取到群名' }}</strong>
                  <el-tooltip :content="item.data.groupId" placement="top" :show-after="300">
                    <span class="group-id">{{ item.data.groupId }}</span>
                  </el-tooltip>
                </div>
                <el-tag size="small" type="info" effect="plain">
                  {{ getPlatformLabel(item.data.groupId) }}
                </el-tag>
                <el-tag v-if="isGroupOffline(item.data)" size="small" type="info">离线</el-tag>
                <el-tag v-else size="small" type="success" effect="plain">在线</el-tag>
              </div>
            </template>

            <template #title-extra>
              <el-button
                v-if="item.data.changed"
                type="primary"
                size="small"
                :icon="DocumentChecked"
                @click="saveOne(item.data, item.index)"
                >保存更改</el-button
              >
              <el-tooltip
                :disabled="isGroupOffline(item.data)"
                content="在线群组不能删除记录"
                placement="top">
                <span>
                  <el-button
                    type="danger"
                    size="small"
                    :icon="Delete"
                    :disabled="!isGroupOffline(item.data)"
                    plain
                    @click="deleteGroupDataLocal(item.data)"
                    >删除本地记录</el-button
                  >
                </span>
              </el-tooltip>
              <template v-if="item.data.groupId.startsWith('QQ-Group:')">
                <el-tooltip
                  v-for="(_, j) in item.data.diceIdExistsMap"
                  :key="j"
                  :content="`让账号 ${j.toString()} 退出此群（会再次确认）`"
                  placement="top">
                  <el-button
                    type="danger"
                    size="small"
                    :icon="Close"
                    plain
                    @click="quitGroup(item.data, item.index, j.toString())"
                    >退群（…{{ j.toString().slice(-4) }}）</el-button
                  >
                </el-tooltip>
              </template>
            </template>

            <el-descriptions>
              <el-descriptions-item label="上次使用">{{
                item.data.recentDiceSendTime
                  ? dayjs.unix(item.data.recentDiceSendTime).fromNow()
                  : '从未'
              }}</el-descriptions-item>
              <el-descriptions-item label="入群时间">{{
                item.data.enteredTime ? dayjs.unix(item.data.enteredTime).fromNow() : '未知'
              }}</el-descriptions-item>
              <el-descriptions-item label="邀请人">{{
                formatInviter(item.data)
              }}</el-descriptions-item>
              <el-descriptions-item label="跑团日志">{{
                item.data.logOn ? '记录中' : '未记录'
              }}</el-descriptions-item>
              <el-descriptions-item label="迎新">{{
                item.data.showGroupWelcome ? '开启' : '关闭'
              }}</el-descriptions-item>
              <el-descriptions-item label="协议端">
                <span class="group-tags">
                  <el-tag
                    v-for="endpoint in getGroupEndpointIds(item.data)"
                    :key="endpoint"
                    size="small"
                    type="info"
                    effect="plain">
                    {{ endpoint }}
                  </el-tag>
                </span>
                <el-text v-if="getGroupEndpointIds(item.data).length === 0" type="info">无</el-text>
              </el-descriptions-item>
              <el-descriptions-item :span="3" label="启用扩展">
                <span v-if="item.data.tmpExtList" class="group-tags">
                  <el-tag
                    :key="group"
                    v-for="group of item.data.tmpExtList"
                    size="small"
                    effect="plain"
                    disable-transitions
                    >{{ group }}</el-tag
                  >
                </span>
                <el-text v-else type="info">未知</el-text>
              </el-descriptions-item>
            </el-descriptions>

            <template #unfolded-extra>
              <el-descriptions>
                <el-descriptions-item :span="2" label="上次使用"
                  >{{
                    item.data.recentDiceSendTime
                      ? dayjs.unix(item.data.recentDiceSendTime).fromNow()
                      : '从未'
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="邀请人">{{
                  formatInviter(item.data)
                }}</el-descriptions-item>
              </el-descriptions>
            </template>
          </foldable-card>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { DocumentChecked, Close, Delete, Refresh, Search } from '@element-plus/icons-vue';
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { now, sortBy } from 'lodash-es';
import { deleteGroupLocalData, getGroupList, postQuitGroup, setGroup } from '~/api/group';

dayjs.extend(relativeTime);

const checkList = ref<string[]>(['QQ-Group:']);

const groupList = ref<any>({});

const orderByTimeDesc = ref(true);
const filter30daysUnused = ref(false);
const showOfflineOnly = ref(false);
const endpointFilter = ref('');
const searchBy = ref('');
const selectedGroupIds = ref<string[]>([]);

const platformOptions = [
  { value: 'QQ-Group:', label: 'QQ 群' },
  { value: 'OpenQQ-Group:', label: 'QQ 官方机器人群' },
  { value: 'QQ-CH-Group:', label: 'QQ 频道' },
  { value: 'OpenQQCH-Channel:', label: 'QQ 官方机器人频道' },
  { value: 'DISCORD-CH-Group:', label: 'Discord 频道' },
  { value: 'DODO-Group:', label: 'Dodo 频道' },
  { value: 'KOOK-CH-Group:', label: 'KOOK 频道' },
  { value: 'DINGTALK-Group:', label: '钉钉群' },
  { value: 'SLACK-CH-Group:', label: 'Slack 频道' },
  { value: 'TG-Group:', label: 'TG 群' },
  { value: 'SEALCHAT-Group:', label: 'Sealchat 频道' },
];

const getGroupEndpointIds = (group: any) => Object.keys(group?.diceIdExistsMap || {});

const getActiveEndpointIds = (group: any) =>
  Object.entries(group?.diceIdActiveMap || {})
    .filter(([, active]) => Boolean(active))
    .map(([id]) => id);

const isGroupOffline = (group: any) => getActiveEndpointIds(group).length === 0;

const getPlatformLabel = (groupId: string) =>
  platformOptions.find(item => groupId.startsWith(item.value))?.label || '其他';

const formatInviter = (group: any) => {
  const inviter = group?.inviter || {};
  return inviter.display || group?.inviteUserId || '未知';
};

const getInviterSearchText = (group: any) => {
  const inviter = group?.inviter || {};
  return [
    group?.inviteUserId,
    inviter.userId,
    inviter.rawId,
    inviter.qq,
    inviter.name,
    inviter.display,
  ]
    .filter(Boolean)
    .join(' ');
};

const endpointOptions = computed(() => {
  const map = new Map<string, number>();
  for (const group of groupList.value.items || []) {
    for (const id of getGroupEndpointIds(group)) {
      map.set(id, (map.get(id) || 0) + 1);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({
      value,
      label: `${value}（${count}）`,
    }));
});

const groupItems = computed<any[]>(() => {
  if (groupList.value.items) {
    const activeEndpointFilter = endpointFilter.value || '';
    // const groupListItems = cloneDeep(groupList.value.items)
    let items = [];
    for (const i of groupList.value.items) {
      let ok = false;
      for (const f of checkList.value) {
        if (i.groupId.startsWith(f)) {
          ok = true;
        }
      }

      if (ok && searchBy.value !== '') {
        let a = false;
        let b = false;
        if (i.groupId.indexOf(searchBy.value) !== -1) {
          a = true;
        }
        if ((i.groupName || '').indexOf(searchBy.value) !== -1) {
          b = true;
        }
        const c = getInviterSearchText(i).indexOf(searchBy.value) !== -1;
        ok = a || b || c;
      }

      if (ok && activeEndpointFilter !== '') {
        ok = getGroupEndpointIds(i).includes(activeEndpointFilter);
      }

      if (ok && showOfflineOnly.value) {
        ok = isGroupOffline(i);
      }

      if (ok) {
        const t = Math.max(i.enteredTime || 0, i.recentCommandTime || 0, i.recentDiceSendTime || 0);
        if (filter30daysUnused.value) {
          if (now() / 1000 - t < 30 * 24 * 60 * 60) {
            ok = false;
          }
        }
      }

      if (ok) items.push(i);
    }

    items = sortBy(items, ['recentCommandTime']);
    if (orderByTimeDesc.value) {
      items = items.reverse();
    }
    return items;
  }
  return [];
});

const refreshList = async () => {
  const data = await getGroupList();
  groupList.value = data;
  const existingIds = new Set((data.items || []).map((item: any) => item.groupId));
  selectedGroupIds.value = selectedGroupIds.value.filter(id => existingIds.has(id));
};

const shouldRetryGroupName = (name?: string) => !name || name.trim() === '未获取到';

const refreshListWithNameRetry = async () => {
  await refreshList();
  if ((groupList.value.items || []).some((item: any) => shouldRetryGroupName(item.groupName))) {
    setTimeout(() => {
      refreshList();
    }, 900);
  }
};

const { list, containerProps, wrapperProps } = useVirtualList(groupItems, {
  itemHeight: 230,
});

const quitTextSave = ref(false);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const saveOne = async (i: any, index: number) => {
  // await store.backupConfigSave(cfg.value)
  // console.log(222, i, index)
  await setGroup(i);
  i.changed = false;
  ElMessage.success('已保存');
};

const quitGroup = async (i: any, index: number, diceId: string) => {
  const quitGroupText =
    localStorage.getItem('quitGroupText') || '因长期不使用等原因，骰主后台操作退出';
  ElMessageBox.prompt(
    '默认会留下退群留言。输入英文大写 NO 则静默退出，输入其他内容则作为退群留言。',
    '让骰子退出此群？',
    {
      confirmButtonText: '退出群组',
      cancelButtonText: '取消',
      type: 'warning',
      inputValue: quitGroupText,
      message: h('div', null, [
        h(
          'p',
          null,
          '默认会留下退群留言。输入英文大写 NO 则静默退出，输入其他内容则作为退群留言。',
        ),
        h(
          'label',
          {
            onInput: (e: any) => {
              quitTextSave.value = e.target.checked;
            },
          },
          [
            h('input', {
              value: quitTextSave.value,
              type: 'checkbox',
            }),
            h('span', null, ' 设为默认留言'),
          ],
        ),
      ]),
    },
  ).then(async data => {
    await postQuitGroup({
      groupId: i.groupId,
      diceId,
      silence: data.value === 'NO',
      extraText: data.value,
    });
    if (quitTextSave.value) {
      localStorage.setItem('quitGroupText', data.value);
    }

    await refreshList();
    ElMessage.success('已退出群组');
  });
};

const getGroupLocalDataDeleteError = (res: Awaited<ReturnType<typeof deleteGroupLocalData>>) => {
  if (res.result) {
    return '';
  }
  const activeDiceIds = res.data?.activeDiceIds || [];
  if (activeDiceIds.length > 0) {
    return `${res.err}：${activeDiceIds.join('、')}`;
  }
  return res.err || '删除失败';
};

const deleteGroupRecord = async (groupId: string) => {
  const res = await deleteGroupLocalData({
    groupId,
    scopes: ['group_record'],
  });
  if (!res.result) {
    throw new Error(getGroupLocalDataDeleteError(res));
  }
};

const deleteGroupDataLocal = async (i: any) => {
  await ElMessageBox.confirm(
    `只删除本地保存的群组记录，不会发送退群请求，也不会解散群。\n在线群组请先关闭服务或退群后再删除。\n确认删除 ${i.groupId}？`,
    '删除本地群组记录',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  );
  await deleteGroupRecord(i.groupId);
  selectedGroupIds.value = selectedGroupIds.value.filter(id => id !== i.groupId);
  await refreshList();
  ElMessage.success('本地群组记录已删除');
};

const toggleGroupSelection = (groupId: string, checked: string | number | boolean) => {
  const selected = Boolean(checked);
  if (selected && !selectedGroupIds.value.includes(groupId)) {
    selectedGroupIds.value.push(groupId);
  } else if (!selected) {
    selectedGroupIds.value = selectedGroupIds.value.filter(item => item !== groupId);
  }
};

const deleteSelectedGroups = async () => {
  const ids = [...selectedGroupIds.value];
  if (ids.length === 0) {
    return;
  }
  await ElMessageBox.confirm(
    `只删除本地保存的群组记录，不会发送退群请求，也不会解散群。\n确认删除选中的 ${ids.length} 个群组？`,
    '批量删除本地群组记录',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  );

  const failed: string[] = [];
  for (const groupId of ids) {
    try {
      await deleteGroupRecord(groupId);
    } catch (error: any) {
      failed.push(`${groupId}: ${error?.message || '删除失败'}`);
    }
  }

  selectedGroupIds.value = [];
  await refreshList();
  if (failed.length > 0) {
    ElMessage.error(`部分本地群组记录删除失败：${failed.join('；')}`);
    return;
  }
  ElMessage.success(`已删除 ${ids.length} 个本地群组记录`);
};

onBeforeMount(async () => {
  await refreshListWithNameRetry();
});
</script>

<style lang="css">
.group-filter-panel {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 10px 16px;
  flex-shrink: 0;
}

.group-filter-label {
  font-size: 13px;
  color: var(--seal-text-secondary);
}

.group-filter-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  min-width: 0;
}

.group-filter-controls .el-checkbox {
  margin-inline-end: 0;
}

.group-search {
  width: min(280px, 100%);
}

.group-endpoint-select {
  width: min(240px, 100%);
}

.group-count {
  margin-inline-start: auto;
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.group-list {
  overflow-y: auto;
}

.item-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  min-width: 0;
}

.group-active-toggle {
  min-width: 6.5em;
  font-size: 12px;
  color: var(--seal-text-regular);
}

.group-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 24rem;
}

.group-name {
  font-size: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.group-id {
  font-size: 12px;
  color: var(--seal-text-secondary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.group-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.group-card {
  margin-top: 16px;
}

@media (max-width: 767px) {
  .group-filter-panel {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }

  .group-count {
    margin-inline-start: 0;
  }
}
</style>
