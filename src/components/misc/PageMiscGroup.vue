<template>
  <div class="group-page-header">
    <div>
      <h2>群管理</h2>
      <el-text type="info"
        >当前显示 {{ groupItems.length }} / {{ groupList.items?.length || 0 }} 个群组</el-text
      >
    </div>
    <el-space wrap>
      <el-button :icon="Refresh" @click="refreshListWithNameRetry">刷新</el-button>
      <el-button
        type="danger"
        :icon="Delete"
        :disabled="selectedGroupIds.length === 0"
        @click="deleteSelectedGroups">
        删除所选 {{ selectedGroupIds.length }}
      </el-button>
    </el-space>
  </div>

  <section class="group-filter-panel">
    <div class="group-filter-row">
      <span class="group-filter-label">平台</span>
      <el-checkbox-group v-model="checkList">
        <el-checkbox v-for="item in platformOptions" :key="item.value" :label="item.value">
          {{ item.label }}
        </el-checkbox>
      </el-checkbox-group>
    </div>
    <div class="group-filter-row">
      <span class="group-filter-label">协议端</span>
      <el-select
        v-model="endpointFilter"
        clearable
        filterable
        :value-on-clear="''"
        @clear="endpointFilter = ''"
        style="width: 18rem"
        placeholder="全部协议端">
        <el-option
          v-for="item in endpointOptions"
          :key="item.value"
          :value="item.value"
          :label="item.label" />
      </el-select>
    </div>
    <div class="group-filter-row">
      <span class="group-filter-label">状态</span>
      <el-checkbox v-model="orderByTimeDesc">按最后使用时间降序</el-checkbox>
      <el-checkbox v-model="filter30daysUnused">30 天未使用</el-checkbox>
      <el-checkbox v-model="showOfflineOnly">只看离线群组</el-checkbox>
    </div>
    <div class="group-filter-row">
      <span class="group-filter-label">搜索</span>
      <el-input
        v-model="searchBy"
        clearable
        style="max-width: 20rem"
        placeholder="请输入帐号或群名的一部分" />
    </div>
  </section>

  <div style="margin-top: 2rem">
    <div v-bind="containerProps" style="height: calc(100vh - 22.5rem)">
      <div v-bind="wrapperProps">
        <div v-for="item in list" :key="item.index" style="">
          <foldable-card class="group-card">
            <template #title>
              <el-space class="item-header" size="large" alignment="center">
                <el-checkbox
                  :disabled="!isGroupOffline(item.data)"
                  :model-value="selectedGroupIds.includes(item.data.groupId)"
                  @change="toggleGroupSelection(item.data.groupId, $event)" />
                <el-switch
                  v-model="item.data.active"
                  style="
                    --el-switch-on-color: var(--el-color-success);
                    --el-switch-off-color: var(--el-color-danger);
                  "
                  @click="item.data.changed = true" />
                <el-space size="small" wrap>
                  <el-text
                    style="
                      max-width: 23rem;
                      overflow: hidden;
                      white-space: nowrap;
                      text-overflow: ellipsis;
                    "
                    size="large"
                    tag="strong"
                    >{{ item.data.groupId }}</el-text
                  >
                  <el-text>「{{ item.data.groupName || '未获取到' }}」</el-text>
                  <el-tag size="small" effect="plain">{{
                    getPlatformLabel(item.data.groupId)
                  }}</el-tag>
                  <el-tag v-if="isGroupOffline(item.data)" size="small" type="info" effect="dark">
                    离线
                  </el-tag>
                  <el-tag v-else size="small" type="success" effect="plain">在线</el-tag>
                </el-space>
              </el-space>
            </template>

            <template #title-extra>
              <el-button
                v-if="item.data.changed"
                type="success"
                size="small"
                :icon="DocumentChecked"
                plain
                @click="saveOne(item.data, item.index)"
                >保存</el-button
              >
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                :disabled="!isGroupOffline(item.data)"
                plain
                @click="deleteGroupDataLocal(item.data)"
                >删除本地数据</el-button
              >
              <template v-if="item.data.groupId.startsWith('QQ-Group:')">
                <el-tooltip
                  v-for="(_, j) in item.data.diceIdExistsMap"
                  :key="j"
                  raw-content
                  :content="j.toString() + '<br>有二次确认'">
                  <el-button
                    type="danger"
                    size="small"
                    :icon="Close"
                    plain
                    @click="quitGroup(item.data, item.index, j.toString())"
                    >退出 {{ j.toString().slice(-4) }}</el-button
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
              <el-descriptions-item label="Log状态">{{
                item.data.logOn ? '开启' : '关闭'
              }}</el-descriptions-item>
              <el-descriptions-item label="迎新">{{
                item.data.showGroupWelcome ? '开启' : '关闭'
              }}</el-descriptions-item>
              <el-descriptions-item label="协议端">
                <el-tag
                  v-for="endpoint in getGroupEndpointIds(item.data)"
                  :key="endpoint"
                  size="small"
                  style="margin-right: 0.35rem"
                  effect="plain">
                  {{ endpoint }}
                </el-tag>
                <el-text v-if="getGroupEndpointIds(item.data).length === 0" type="info">无</el-text>
              </el-descriptions-item>
              <el-descriptions-item :span="3" label="启用扩展">
                <span v-if="item.data.tmpExtList">
                  <el-tag
                    :key="group"
                    v-for="group of item.data.tmpExtList"
                    size="small"
                    style="margin-right: 0.5rem"
                    disable-transitions
                    >{{ group }}</el-tag
                  >
                </span>
                <el-text v-else>'未知'</el-text>
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

    <!-- <el-card shadow="hover" v-for="(i, index) in groupItems" style="margin-top: 1rem;">
      <template #header>
        <div class="item-header">
          <el-space size="large" alignment="center">
            <el-switch v-model="i.active" @click="i.changed = true"
              style="--el-switch-on-color: var(--el-color-success); --el-switch-off-color: var(--el-color-danger)" />
            <el-space size="small" wrap>
              <el-text size="large" tag="strong">{{ i.groupId }}</el-text>
              <el-text>「{{ i.groupName || '未获取到' }}」</el-text>
            </el-space>
          </el-space>
          <el-space>
            <el-button type="success" size="small" :icon="DocumentChecked" plain v-if="i.changed"
              @click="saveOne(i, index)">保存</el-button>
            <el-tooltip v-for="_, j in i.diceIdExistsMap" raw-content :content="j.toString() + '<br>有二次确认'">
              <el-button type="danger" size="small" :icon="Close" plain @click="quitGroup(i, index, j.toString())">退出
                {{ j.toString().slice(-4) }}</el-button>
            </el-tooltip>
          </el-space>
        </div>
      </template>
      <el-descriptions>
        <el-descriptions-item label="上次使用">{{ i.recentDiceSendTime ? dayjs.unix(i.recentDiceSendTime).fromNow() : '从未'
        }}</el-descriptions-item>
        <el-descriptions-item label="入群时间">{{ i.enteredTime ? dayjs.unix(i.enteredTime).fromNow() : '未知'
        }}</el-descriptions-item>
        <el-descriptions-item label="邀请人">{{ formatInviter(i) }}</el-descriptions-item>
        <el-descriptions-item label="Log 状态">{{ i.logOn ? '开启' : '关闭' }}</el-descriptions-item>
        <el-descriptions-item label="迎新">{{ i.showGroupWelcome ? '开启' : '关闭' }}</el-descriptions-item>
        <el-descriptions-item />
        <el-descriptions-item :span="3" label="启用扩展">
          <span v-if="i.tmpExtList">
            <el-tag size="small" v-for="group of i.tmpExtList" style="margin-right: 0.5rem;" disable-transitions>{{ group
            }}</el-tag>
          </span>
          <el-text v-else>'未知'</el-text>
        </el-descriptions-item>
      </el-descriptions>
    </el-card> -->
  </div>
</template>

<script lang="ts" setup>
import { DocumentChecked, Close, Delete, Refresh } from '@element-plus/icons-vue';
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
  { value: 'QQ-CH-Group:', label: 'QQ 频道' },
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
    '会进行退出留言“因长期不使用等原因，骰主后台操作退出”，输入英文大写 NO 则静默退出，写别的则为附加留言',
    '退出此群？',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      inputValue: quitGroupText,
      message: h('div', null, [
        h(
          'p',
          null,
          '会进行退出留言“因长期不使用等原因，骰主后台操作退出”，输入英文大写 NO 则静默退出，写别的则为附加留言',
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
            h('span', null, '设为默认'),
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
    ElMessage.success('退出完成');

    ElMessage({
      type: 'success',
      message: '成功！',
    });
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
span.left {
  display: inline-block;
  min-width: 5rem;
}

@media screen and (max-width: 700px) {
  .bak-item {
    flex-direction: column;

    & > span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}

.item-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.group-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.group-filter-panel {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--seal-panel-bg);
  box-shadow: var(--el-box-shadow-light);
}

.group-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.group-filter-label {
  min-width: 4rem;
  color: var(--el-text-color-secondary);
  font-weight: 700;
}

.group-card {
  margin-top: 1rem;
}

@media screen and (max-width: 700px) {
  .group-page-header {
    flex-direction: column;
  }

  .group-filter-label {
    width: 100%;
  }
}
</style>
