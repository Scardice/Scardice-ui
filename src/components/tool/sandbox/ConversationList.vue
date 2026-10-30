<template>
  <nav class="conversation-list" aria-label="测试会话">
    <section v-for="section in sections" :key="section.type" class="conversation-section">
      <div class="conversation-section-header">
        <h2>{{ section.label }}</h2>
        <el-tooltip :content="section.addLabel" placement="top">
          <button
            type="button"
            class="conversation-add"
            :aria-label="section.addLabel"
            @click="section.type === 'group' ? emit('add-group') : emit('add-user')">
            <el-icon><Plus /></el-icon>
          </button>
        </el-tooltip>
      </div>
      <button
        v-for="item in section.items"
        :key="item.key"
        type="button"
        class="conversation-item"
        :class="{ active: item.key === activeKey }"
        :aria-current="item.key === activeKey ? 'true' : undefined"
        @click="emit('select', item.key)">
        <SandboxAvatar
          :kind="item.type === 'group' ? 'group' : 'user'"
          :name="item.title"
          :color="item.color"
          :size="34" />
        <span class="conversation-text">
          <span class="conversation-title">{{ item.title }}</span>
          <span class="conversation-subtitle">{{ item.subtitle }}</span>
        </span>
        <span v-if="item.unread" class="conversation-unread" :aria-label="`${item.unread} 条未读`">
          {{ item.unread > 99 ? '99+' : item.unread }}
        </span>
      </button>
    </section>
  </nav>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue';
import SandboxAvatar from './SandboxAvatar.vue';

export interface ConversationItem {
  key: string;
  type: 'private' | 'group';
  title: string;
  subtitle: string;
  color: number;
  unread: number;
}

const props = defineProps<{
  groups: ConversationItem[];
  privates: ConversationItem[];
  activeKey: string;
}>();

const emit = defineEmits<{
  select: [key: string];
  'add-group': [];
  'add-user': [];
}>();

const sections = computed(() => [
  { type: 'group', label: '群聊', addLabel: '新建测试群', items: props.groups },
  { type: 'private', label: '私聊', addLabel: '新建测试用户', items: props.privates },
]);
</script>

<style scoped>
.conversation-list {
  display: grid;
  gap: 16px;
}

.conversation-section {
  display: grid;
  gap: 2px;
}

.conversation-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px 8px;
}

.conversation-section-header h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--seal-text-secondary);
}

.conversation-add {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--seal-text-secondary);
  cursor: pointer;
}

.conversation-add:hover,
.conversation-add:focus-visible {
  background: var(--seal-surface-soft);
  color: var(--el-color-primary);
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--seal-text-color);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.conversation-item:hover {
  background: var(--seal-surface-soft);
}

.conversation-item.active {
  background: var(--el-color-primary-light-9);
  box-shadow: inset 3px 0 0 var(--el-color-primary);
}

.conversation-item:focus-visible,
.conversation-add:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}

.conversation-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.conversation-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.conversation-subtitle {
  overflow: hidden;
  font-size: 12px;
  color: var(--seal-text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.conversation-unread {
  flex: none;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  box-sizing: border-box;
  border-radius: 9px;
  background: var(--el-color-danger);
  color: var(--seal-on-danger);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .conversation-item {
    transition: none;
  }
}
</style>
