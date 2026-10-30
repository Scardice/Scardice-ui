<template>
  <el-dialog
    v-model="visible"
    title="测试用户与测试群"
    width="min(720px, calc(100vw - 24px))"
    class="sandbox-manage-dialog"
    append-to-body>
    <el-tabs v-model="tab">
      <el-tab-pane label="测试用户" name="users">
        <p class="manage-hint">
          每位测试用户都有独立的私聊，也可以在群里发言。把用户 ID 加入 Master 列表即可测试骰主指令。
        </p>
        <ul class="manage-list">
          <li v-for="user in sandbox.users" :key="user.id" class="manage-user">
            <SandboxAvatar kind="user" :name="user.name" :color="user.color" :size="32" />
            <div class="manage-user-main">
              <el-input
                v-model.trim="user.name"
                maxlength="32"
                :aria-label="`${user.id} 的昵称`"
                placeholder="昵称"
                @blur="user.name ||= `用户 ${user.id.slice(3)}`" />
              <code class="manage-id">{{ user.id }}</code>
            </div>
            <div class="manage-colors" role="radiogroup" :aria-label="`${user.name} 的头像颜色`">
              <button
                v-for="(swatch, index) in avatarPalette"
                :key="swatch"
                type="button"
                role="radio"
                class="manage-color"
                :class="{ active: user.color === index }"
                :style="{ background: swatch }"
                :aria-checked="user.color === index"
                :aria-label="`颜色 ${index + 1}`"
                @click="user.color = index" />
            </div>
            <el-tooltip
              :disabled="sandbox.users.length > 1"
              content="至少保留一位测试用户"
              placement="top">
              <span>
                <el-button
                  :icon="Delete"
                  text
                  type="danger"
                  :disabled="sandbox.users.length <= 1"
                  :aria-label="`删除 ${user.name}`"
                  @click="confirmRemoveUser(user.id, user.name)" />
              </span>
            </el-tooltip>
          </li>
        </ul>
        <el-button :icon="Plus" class="manage-add" @click="addSandboxUser()"
          >新建测试用户</el-button
        >
      </el-tab-pane>

      <el-tab-pane label="测试群" name="groups">
        <p class="manage-hint">设置每个群有哪些成员以及他们的角色，用于测试需要群管权限的指令。</p>
        <div class="manage-groups">
          <section
            v-for="group in sandbox.groups"
            :id="`manage-${group.id}`"
            :key="group.id"
            class="manage-group">
            <div class="manage-group-header">
              <SandboxAvatar kind="group" :name="group.name" :size="32" />
              <div class="manage-user-main">
                <el-input
                  v-model.trim="group.name"
                  maxlength="32"
                  :aria-label="`${group.id} 的群名`"
                  placeholder="群名"
                  @blur="group.name ||= group.id" />
                <code class="manage-id">{{ group.id }}</code>
              </div>
              <el-tooltip
                :disabled="sandbox.groups.length > 1"
                content="至少保留一个测试群"
                placement="top">
                <span>
                  <el-button
                    :icon="Delete"
                    text
                    type="danger"
                    :disabled="sandbox.groups.length <= 1"
                    :aria-label="`删除 ${group.name}`"
                    @click="confirmRemoveGroup(group.id, group.name)" />
                </span>
              </el-tooltip>
            </div>
            <ul class="manage-members">
              <li v-for="user in sandbox.users" :key="user.id" class="manage-member">
                <SandboxAvatar kind="user" :name="user.name" :color="user.color" :size="24" />
                <span class="manage-member-name">{{ user.name }}</span>
                <el-select
                  :model-value="group.members[user.id] ?? 'none'"
                  class="manage-role"
                  :aria-label="`${user.name} 在 ${group.name} 的角色`"
                  @change="value => changeRole(group, user.id, value)">
                  <el-option label="群主" value="owner" />
                  <el-option label="管理员" value="admin" />
                  <el-option label="成员" value="member" />
                  <el-option label="不在群中" value="none" />
                </el-select>
              </li>
            </ul>
          </section>
        </div>
        <el-button :icon="Plus" class="manage-add" @click="addSandboxGroup()">新建测试群</el-button>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="manage-footer">
        <el-button text @click="confirmReset">恢复默认</el-button>
        <el-button type="primary" @click="visible = false">完成</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import SandboxAvatar from './SandboxAvatar.vue';
import {
  addSandboxGroup,
  addSandboxUser,
  avatarPalette,
  removeSandboxGroup,
  removeSandboxUser,
  resetSandbox,
  sandbox,
  setGroupRole,
  type GroupRole,
  type SandboxGroup,
} from './state';

const visible = defineModel<boolean>({ required: true });
const tab = defineModel<'users' | 'groups'>('tab', { default: 'users' });

const changeRole = (group: SandboxGroup, userId: string, value: GroupRole | 'none') => {
  if (!setGroupRole(group, userId, value)) {
    ElMessage.warning('群里至少要保留一名成员');
  }
};

const confirmRemoveUser = async (id: string, name: string) => {
  try {
    await ElMessageBox.confirm(
      `删除测试用户「${name}」（${id}）？其私聊记录将不再显示。`,
      '删除测试用户',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  removeSandboxUser(id);
};

const confirmRemoveGroup = async (id: string, name: string) => {
  try {
    await ElMessageBox.confirm(
      `删除测试群「${name}」（${id}）？其聊天记录将不再显示。`,
      '删除测试群',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  removeSandboxGroup(id);
};

const confirmReset = async () => {
  try {
    await ElMessageBox.confirm('恢复为默认的 2 位测试用户和 1 个测试群？', '恢复默认', {
      confirmButtonText: '恢复默认',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  resetSandbox();
};
</script>

<style scoped>
.manage-hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--seal-text-secondary);
}

.manage-list,
.manage-members {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.manage-user,
.manage-group-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.manage-user {
  padding: 10px 12px;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 8px;
}

.manage-user-main {
  display: flex;
  flex: 1 1 220px;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.manage-user-main .el-input {
  flex: 1;
  min-width: 0;
}

.manage-id {
  flex: none;
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.manage-colors {
  display: flex;
  gap: 6px;
}

.manage-color {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
}

.manage-color.active {
  box-shadow:
    0 0 0 2px var(--seal-panel-bg-base),
    0 0 0 4px var(--el-color-primary);
}

.manage-color:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.manage-add {
  margin-top: 12px;
}

.manage-groups {
  display: grid;
  gap: 12px;
}

.manage-group {
  padding: 12px;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 8px;
}

.manage-members {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--seal-border-color-light);
}

.manage-member {
  display: flex;
  align-items: center;
  gap: 8px;
}

.manage-member-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.manage-role {
  width: 120px;
}

.manage-footer {
  display: flex;
  justify-content: space-between;
}
</style>
