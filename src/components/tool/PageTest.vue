<template>
  <section class="workspace-page test-workspace" aria-labelledby="test-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="test-workspace-title" class="workspace-title">指令测试</h1>
        <p class="workspace-subtitle">
          模拟多位用户在私聊和群聊中向骰子发送指令；会话记录在刷新页面后清空。
        </p>
      </div>
      <div class="workspace-actions">
        <el-button :icon="UserFilled" @click="openManage('users')">测试用户与群</el-button>
        <el-dropdown trigger="click" @command="handleReloadCommand">
          <el-button :icon="Refresh">重载资源</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="deck" :disabled="deckReloading">牌堆</el-dropdown-item>
              <el-dropdown-item command="js" :disabled="jsReloading">JS 扩展</el-dropdown-item>
              <el-dropdown-item command="helpdoc" :disabled="helpdocReloading"
                >帮助文档</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="workspace-body sandbox">
      <div class="sandbox-layout">
        <aside class="workspace-panel sandbox-sidebar">
          <ConversationList
            :groups="conversationItems.groups"
            :privates="conversationItems.privates"
            :active-key="sandbox.active"
            @select="selectConversation"
            @add-group="addGroupAndOpen"
            @add-user="addUserAndOpen" />
        </aside>

        <section class="workspace-panel sandbox-chat" :aria-label="`${chatTitle} 会话`">
          <header class="chat-header">
            <el-badge
              class="chat-switch"
              :value="otherUnread"
              :hidden="otherUnread === 0"
              :max="99">
              <el-button :icon="ChatLineSquare" aria-label="切换会话" @click="drawerVisible = true">
                会话
              </el-button>
            </el-badge>
            <SandboxAvatar
              :kind="activeGroup ? 'group' : 'user'"
              :name="chatTitle"
              :color="activeUser?.color ?? 0"
              :size="36" />
            <div class="chat-title">
              <strong>{{ chatTitle }}</strong>
              <span>{{ chatMeta }}</span>
            </div>
            <div class="chat-actions">
              <el-button v-if="activeGroup" text :icon="User" @click="openManage('groups')">
                成员
              </el-button>
              <el-tooltip content="清空此会话的记录" placement="bottom">
                <el-button
                  text
                  :icon="Delete"
                  aria-label="清空此会话的记录"
                  :disabled="activeLogs.length === 0"
                  @click="clearActive" />
              </el-tooltip>
            </div>
          </header>

          <div ref="scroller" class="chat-scroll" role="log" aria-live="polite">
            <div v-if="activeLogs.length === 0" class="chat-empty">
              <template v-if="activeGroup">
                <strong>测试群「{{ activeGroup.name }}」</strong>
                <p>在下方切换发言人，模拟不同成员在群内发送指令；骰子的回复会显示在这里。</p>
              </template>
              <template v-else-if="activeUser">
                <strong>与骰子的私聊</strong>
                <p>
                  以「{{ activeUser.name }}」（{{ activeUser.id }}）的身份发送指令。把
                  <code>{{ activeUser.id }}</code> 加入 Master 列表即可测试骰主指令。
                </p>
                <el-button text type="primary" @click="router.push('/misc/base-setting')">
                  前往设置 Master
                </el-button>
              </template>
            </div>

            <div
              v-for="item in decoratedLogs"
              :key="item.id"
              class="msg"
              :class="[`is-${item.kind}`, { 'is-continued': !item.showHeader }]">
              <p v-if="item.kind === 'system'" class="msg-system">{{ item.content }}</p>
              <template v-else>
                <SandboxAvatar
                  v-if="item.showHeader"
                  :kind="item.kind === 'bot' ? 'bot' : 'user'"
                  :name="item.senderName"
                  :color="item.senderColor"
                  :size="36" />
                <span v-else class="msg-avatar-spacer" aria-hidden="true" />
                <div class="msg-body">
                  <div v-if="item.showHeader" class="msg-meta">
                    <span class="msg-name">{{ item.senderName }}</span>
                    <em v-if="item.roleLabel" class="msg-role">{{ item.roleLabel }}</em>
                    <time :datetime="new Date(item.at).toISOString()">{{ item.timeLabel }}</time>
                  </div>
                  <div class="msg-bubble"><log-rich-content :content="item.content" /></div>
                </div>
              </template>
            </div>
          </div>

          <footer class="composer">
            <p v-if="replyError" class="reply-status" role="status">{{ replyError }}</p>
            <div v-if="activeGroup" class="speaker-bar" role="radiogroup" aria-label="发言人">
              <span class="speaker-label">发言人</span>
              <button
                v-for="member in activeMembers"
                :key="member.id"
                type="button"
                role="radio"
                class="speaker-chip"
                :class="{ active: member.id === speaker?.id }"
                :aria-checked="member.id === speaker?.id"
                @click="setSpeaker(member.id)">
                <SandboxAvatar kind="user" :name="member.name" :color="member.color" :size="20" />
                <span>{{ member.name }}</span>
                <em v-if="activeGroup.members[member.id] !== 'member'">
                  {{ roleLabels[activeGroup.members[member.id]] }}
                </em>
              </button>
            </div>
            <div class="composer-row">
              <el-autocomplete
                ref="autocomplete"
                v-model="input"
                class="composer-input"
                popper-class="sandbox-suggest"
                placement="top-start"
                :debounce="80"
                :fetch-suggestions="querySuggestions"
                :trigger-on-focus="false"
                :highlight-first-item="mentionMode"
                :aria-label="`以 ${sender?.name ?? ''} 的身份输入指令`"
                :placeholder="composerPlaceholder"
                @select="onSuggestionSelect"
                @compositionend="markCompositionEnd"
                @keyup.enter="onEnterKeyup">
                <template #default="{ item }">
                  <div v-if="item.mention" class="mention-option">
                    <SandboxAvatar
                      :kind="item.mention.bot ? 'bot' : 'user'"
                      :name="item.mention.name"
                      :color="item.mention.color"
                      :size="24" />
                    <span class="mention-name">{{ item.mention.name }}</span>
                    <span class="mention-id">{{
                      item.mention.bot ? '骰子' : item.mention.id
                    }}</span>
                  </div>
                  <span v-else>{{ item.value }}</span>
                </template>
              </el-autocomplete>
              <el-button
                type="primary"
                :icon="Promotion"
                :disabled="!input.trim() || !repliesReady"
                @click="send">
                发送
              </el-button>
            </div>
          </footer>
        </section>
      </div>
    </div>

    <el-drawer
      v-model="drawerVisible"
      title="测试会话"
      direction="ltr"
      size="min(320px, 88vw)"
      append-to-body>
      <ConversationList
        :groups="conversationItems.groups"
        :privates="conversationItems.privates"
        :active-key="sandbox.active"
        @select="selectConversation"
        @add-group="addGroupAndOpen"
        @add-user="addUserAndOpen" />
    </el-drawer>

    <ManageDialog v-model="manageVisible" v-model:tab="manageTab" />
  </section>
</template>

<script lang="ts" setup>
import {
  ChatLineSquare,
  Delete,
  Promotion,
  Refresh,
  User,
  UserFilled,
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import type { AxiosError } from 'axios';
import { useStore, type TalkLogItem } from '~/store';
import { getCommandList, getRecentMessage, postExec } from '~/api/dice';
import { reloadDeck as postReloadDeck } from '~/api/deck';
import { reloadHelpDoc } from '~/api/helpdoc';
import LogRichContent from '~/components/utils/log-rich-content.vue';
import { runJsReloadWithProgress } from '~/utils/js-reload-progress';
import ConversationList, { type ConversationItem } from './sandbox/ConversationList.vue';
import ManageDialog from './sandbox/ManageDialog.vue';
import SandboxAvatar from './sandbox/SandboxAvatar.vue';
import {
  addSandboxGroup,
  addSandboxUser,
  groupKey,
  groupMembers,
  privateKey,
  roleLabels,
  sandbox,
} from './sandbox/state';

const store = useStore();
const router = useRouter();

const manageVisible = ref(false);
const manageTab = ref<'users' | 'groups'>('users');
const drawerVisible = ref(false);
const unread = reactive<Record<string, number>>({});
const scroller = ref<HTMLElement | null>(null);
let logSeq = Date.now();

const openManage = (tab: 'users' | 'groups') => {
  manageTab.value = tab;
  manageVisible.value = true;
};

/* ---------- 会话 ---------- */

const lastLogOf = (key: string) => {
  for (let i = store.talkLogs.length - 1; i >= 0; i--) {
    if (store.talkLogs[i].conversation === key) return store.talkLogs[i];
  }
  return undefined;
};

const userName = (id?: string) =>
  sandbox.value.users.find(user => user.id === id)?.name ?? id ?? '';

const previewOf = (key: string) => {
  const last = lastLogOf(key);
  if (!last) return '';
  const text = last.content.replace(/\s+/g, ' ');
  return last.kind === 'user' && key.startsWith('group:')
    ? `${userName(last.senderId)}：${text}`
    : text;
};

const conversationItems = computed(() => ({
  groups: sandbox.value.groups.map<ConversationItem>(group => {
    const key = groupKey(group.id);
    return {
      key,
      type: 'group',
      title: group.name,
      subtitle: previewOf(key) || `${Object.keys(group.members).length} 名成员`,
      color: 0,
      unread: unread[key] ?? 0,
    };
  }),
  privates: sandbox.value.users.map<ConversationItem>(user => {
    const key = privateKey(user.id);
    return {
      key,
      type: 'private',
      title: user.name,
      subtitle: previewOf(key) || user.id,
      color: user.color,
      unread: unread[key] ?? 0,
    };
  }),
}));

watchEffect(() => {
  const keys = [...conversationItems.value.groups, ...conversationItems.value.privates].map(
    item => item.key,
  );
  if (keys.length && !keys.includes(sandbox.value.active)) sandbox.value.active = keys[0];
});

const activeGroup = computed(() =>
  sandbox.value.groups.find(group => groupKey(group.id) === sandbox.value.active),
);
const activeUser = computed(() =>
  activeGroup.value
    ? undefined
    : sandbox.value.users.find(user => privateKey(user.id) === sandbox.value.active),
);
const activeMembers = computed(() => (activeGroup.value ? groupMembers(activeGroup.value) : []));

const speaker = computed(() => {
  const group = activeGroup.value;
  if (!group) return undefined;
  const chosen = sandbox.value.speakers[group.id];
  return activeMembers.value.find(member => member.id === chosen) ?? activeMembers.value[0];
});
const sender = computed(() => activeUser.value ?? speaker.value);

const setSpeaker = (userId: string) => {
  if (activeGroup.value) sandbox.value.speakers[activeGroup.value.id] = userId;
};

const chatTitle = computed(() => activeGroup.value?.name ?? activeUser.value?.name ?? '');
const chatMeta = computed(() =>
  activeGroup.value
    ? `${activeGroup.value.id} · ${activeMembers.value.length} 名成员`
    : `${activeUser.value?.id ?? ''} · 私聊`,
);

const otherUnread = computed(() =>
  Object.entries(unread).reduce(
    (sum, [key, count]) => (key === sandbox.value.active ? sum : sum + count),
    0,
  ),
);

const selectConversation = (key: string) => {
  sandbox.value.active = key;
  drawerVisible.value = false;
};

const addGroupAndOpen = () => selectConversation(groupKey(addSandboxGroup().id));
const addUserAndOpen = () => selectConversation(privateKey(addSandboxUser().id));

/* ---------- 消息 ---------- */

const activeLogs = computed(() =>
  store.talkLogs.filter(log => log.conversation === sandbox.value.active),
);

const decoratedLogs = computed(() =>
  activeLogs.value.map((log, index) => {
    const prev = activeLogs.value[index - 1];
    const user =
      log.kind === 'user' ? sandbox.value.users.find(u => u.id === log.senderId) : undefined;
    const role =
      activeGroup.value && log.senderId ? activeGroup.value.members[log.senderId] : undefined;
    return {
      ...log,
      showHeader:
        !prev ||
        prev.kind !== log.kind ||
        prev.senderId !== log.senderId ||
        log.at - prev.at > 5 * 60 * 1000,
      senderName: log.kind === 'bot' ? BOT_NAME : (user?.name ?? log.senderId ?? ''),
      senderColor: user?.color ?? 0,
      roleLabel: role ? roleLabels[role] : '',
      timeLabel: dayjs(log.at).format('HH:mm'),
    };
  }),
);

const pushLog = (log: Omit<TalkLogItem, 'id' | 'at'>) => {
  store.talkLogs.push({ ...log, id: ++logSeq, at: Date.now() });
};

const isNearBottom = () => {
  const el = scroller.value;
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
};

const scrollToBottom = async (force = false) => {
  const stick = force || isNearBottom();
  await nextTick();
  if (stick && scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
};

watch(
  () => sandbox.value.active,
  key => {
    unread[key] = 0;
    void scrollToBottom(true);
  },
  { immediate: true },
);

const clearActive = () => {
  const key = sandbox.value.active;
  store.talkLogs = store.talkLogs.filter(log => log.conversation !== key);
};

/* ---------- 发送与接收 ---------- */

const input = ref('');
const repliesReady = ref(false);
const replyError = ref('');
const autocomplete = ref<{
  suggestions: unknown[];
  focus: () => void;
  inputRef?: { input?: HTMLInputElement };
} | null>(null);
let suggestionPickedAt = 0;
let compositionEndedAt = 0;

const composerPlaceholder = computed(() => {
  if (!repliesReady.value) return '正在连接回复通道…';
  const name = sender.value?.name ?? '';
  return activeGroup.value
    ? `以「${name}」发送，输入 @ 提及成员`
    : `以「${name}」发送，例如 .r 1d100`;
});

/* ---------- @ 提及：插入带稳定 ID 的 CQ 码，聊天记录显示昵称 ---------- */

// 与核心 UI 端点的 UserID 保持一致
const BOT_ID = 'UI:1000';
const BOT_NAME = '余烬核心';

interface MentionTarget {
  id: string;
  name: string;
  color: number;
  bot?: boolean;
}

interface Suggestion {
  value: string;
  mention?: MentionTarget;
  caret?: number;
}

const botTarget: MentionTarget = { id: BOT_ID, name: BOT_NAME, color: 0, bot: true };

/** 当前会话中可以被 @ 的对象：骰子以及群成员。 */
const mentionTargets = computed<MentionTarget[]>(() => [
  botTarget,
  ...activeMembers.value.map(member => ({
    id: member.id,
    name: member.name,
    color: member.color,
  })),
]);

const mentionMode = ref(false);

const cqMention = (id: string) => `[CQ:at,qq=${id.slice(id.indexOf(':') + 1)}]`;

const decodeMentions = (text: string) =>
  text.replace(/\[CQ:at,qq=([A-Za-z0-9_-]+)[^\]]*\]/g, (_, suffix: string) => {
    const id = `UI:${suffix}`;
    return `@${id === BOT_ID ? BOT_NAME : userName(id)}`;
  });

const onSuggestionSelect = (item: Record<string, unknown>) => {
  suggestionPickedAt = Date.now();
  const caret = typeof item.caret === 'number' ? item.caret : undefined;
  if (caret === undefined) return;
  void nextTick(() => {
    const el = autocomplete.value?.inputRef?.input;
    el?.focus();
    el?.setSelectionRange(caret, caret);
  });
};

const markCompositionEnd = () => {
  compositionEndedAt = Date.now();
};

const onEnterKeyup = (event: KeyboardEvent) => {
  // 输入法用回车上屏时不发送
  if (event.isComposing || Date.now() - compositionEndedAt < 120) return;
  // 回车选中候选时只补全，不发送；鼠标点击发送不受此保护影响。
  if (Date.now() - suggestionPickedAt < 300) return;
  void send();
};

const send = async () => {
  const text = input.value.trim();
  const from = sender.value;
  if (!text || !from || !repliesReady.value) return;
  const key = sandbox.value.active;
  const group = activeGroup.value;
  pushLog({ conversation: key, kind: 'user', senderId: from.id, content: decodeMentions(text) });
  input.value = '';
  mentionMode.value = false;
  if (autocomplete.value) autocomplete.value.suggestions = [];
  void scrollToBottom(true);
  try {
    await postExec(
      text,
      group ? 'group' : 'private',
      group
        ? {
            userId: from.id,
            nickname: from.name,
            groupId: group.id,
            groupName: group.name,
            groupRole: group.members[from.id],
          }
        : { userId: from.id, nickname: from.name },
    );
  } catch (error) {
    const reason = (error as AxiosError<string>).response?.data;
    pushLog({
      conversation: key,
      kind: 'system',
      content:
        typeof reason === 'string' && reason
          ? `发送失败：${reason}`
          : '发送失败，请检查与核心的连接',
    });
  }
};

let pollTimer: ReturnType<typeof setInterval> | undefined;
let replyCursor: string | undefined;
let replyPoll: Promise<void> | undefined;
let replyPollingActive = true;

const pollReplies = () => {
  if (replyPoll) return replyPoll;
  replyPoll = (async () => {
    try {
      const batch = await getRecentMessage(replyCursor);
      if (!replyPollingActive) return;
      if (!batch.cursor || !Array.isArray(batch.messages)) {
        throw new Error('核心回复接口不匹配，请更新核心后刷新页面');
      }
      if (batch.truncated) {
        pushLog({
          conversation: sandbox.value.active,
          kind: 'system',
          content: '回复通道已重置或部分历史已过期，已恢复接收；缺失的结果请查看核心日志。',
        });
      }
      for (const message of batch.messages) {
        const key =
          message.messageType === 'group' ? groupKey(message.uid) : privateKey(message.uid);
        pushLog({ conversation: key, kind: 'bot', content: decodeMentions(message.message) });
        if (key === sandbox.value.active) void scrollToBottom();
        else unread[key] = (unread[key] ?? 0) + 1;
      }
      // 仅在本批消息写入会话后推进游标，失败请求仍可读取同一批消息。
      replyCursor = batch.cursor;
      repliesReady.value = true;
      replyError.value = '';
    } catch (error) {
      if (!replyPollingActive) return;
      replyError.value =
        error instanceof Error && error.message.startsWith('核心回复接口')
          ? error.message
          : '接收回复失败，正在重新连接。';
      if (import.meta.env.DEV) console.warn('获取骰子回复失败', error);
    }
  })().finally(() => {
    replyPoll = undefined;
  });
  return replyPoll;
};

/* ---------- 指令补全 ---------- */

const fallbackCommands =
  'r ra rc rh rd rx st sc coc dnd en ti li set setcoc nn pc ch draw deck log help find text jrrp bot ext master send reply';
const commandSuggestions = ref(fallbackCommands.split(' ').map(cmd => ({ value: `.${cmd}` })));

const findMentionQuery = (text: string, caret: number) => {
  const match = /@([^\s@]{0,32})$/.exec(text.slice(0, caret));
  return match ? { start: match.index, keyword: match[1].toLowerCase() } : undefined;
};

const querySuggestions = (query: string, cb: (results: Suggestion[]) => void) => {
  const caret = autocomplete.value?.inputRef?.input?.selectionStart ?? query.length;
  const mention = findMentionQuery(query, caret);
  mentionMode.value = Boolean(mention);
  if (mention) {
    const before = query.slice(0, mention.start);
    const after = query.slice(caret).replace(/^ /, '');
    const results = mentionTargets.value
      .filter(target => target.id !== sender.value?.id)
      .filter(
        target =>
          !mention.keyword ||
          target.name.toLowerCase().includes(mention.keyword) ||
          target.id.toLowerCase().includes(mention.keyword),
      )
      .map<Suggestion>(target => {
        const head = `${before}${cqMention(target.id)} `;
        return { value: head + after, mention: target, caret: head.length };
      });
    // 等 highlight-first-item 随 mentionMode 更新后再交回列表，回车即可选中第一项
    void nextTick(() => cb(results));
    return;
  }
  const text = query.trim().toLowerCase().replace(/^。/, '.');
  if (!text.startsWith('.') || text.includes(' ')) {
    cb([]);
    return;
  }
  cb(
    commandSuggestions.value.filter(item => item.value.toLowerCase().startsWith(text)).slice(0, 12),
  );
};

onMounted(async () => {
  void pollReplies();
  pollTimer = setInterval(pollReplies, 1000);
  try {
    const commands = await getCommandList();
    if (Array.isArray(commands) && commands.length) {
      commandSuggestions.value = [...new Set(commands)]
        .sort((a, b) => a.length - b.length || a.localeCompare(b))
        .map(cmd => ({ value: `.${cmd}` }));
    }
  } catch {
    // 保留内置的常用指令列表
  }
});

onBeforeUnmount(() => {
  replyPollingActive = false;
  if (pollTimer) clearInterval(pollTimer);
});

/* ---------- 重载资源 ---------- */

const deckReloading = ref<boolean>(false);
const reloadDeck = async () => {
  deckReloading.value = true;
  const ret = await postReloadDeck();
  if (ret.testMode) {
    ElMessage.success('展示模式无法重载牌堆');
  } else {
    ElMessage.success('已重载牌堆');
  }
  deckReloading.value = false;
};

const jsReloading = ref<boolean>(false);
const reloadJs = async () => {
  jsReloading.value = true;
  try {
    await runJsReloadWithProgress({
      successMessage: '已重载 JS',
      testModeMessage: '展示模式无法重载 JS',
    });
  } finally {
    jsReloading.value = false;
  }
};

const helpdocReloading = ref<boolean>(false);
const reloadHelpdoc = async () => {
  helpdocReloading.value = true;
  const ret = await reloadHelpDoc();
  if (ret && ret?.result) {
    ElMessage.success('已重载帮助文档');
  } else {
    ElMessage.error(ret.err || '无法重载帮助文档');
  }
  helpdocReloading.value = false;
};

const handleReloadCommand = (command: string) => {
  if (command === 'deck') void reloadDeck();
  else if (command === 'js') void reloadJs();
  else void reloadHelpdoc();
};
</script>

<style scoped lang="css">
.sandbox {
  container-type: inline-size;
  display: flex;
  min-height: 0;
}

.sandbox-layout {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--workspace-gap);
  min-height: 0;
}

.sandbox-sidebar {
  display: none;
  padding: 12px 8px;
  overflow-y: auto;
}

@container (min-width: 720px) {
  .sandbox-layout {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .sandbox-sidebar {
    display: block;
  }

  .chat-switch {
    display: none !important;
  }
}

/* 聊天区 */
.sandbox-chat {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.chat-header {
  display: flex;
  flex: none;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--seal-border-color-light);
}

.chat-title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.chat-title strong {
  overflow: hidden;
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-title span {
  overflow: hidden;
  font-size: 12px;
  color: var(--seal-text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.chat-actions .el-button + .el-button {
  margin-inline-start: 0;
}

.chat-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
}

.chat-empty {
  max-width: 420px;
  margin: 48px auto;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  color: var(--seal-text-secondary);
}

.chat-empty strong {
  display: block;
  margin-bottom: 4px;
  font-size: 15px;
  color: var(--seal-text-color);
}

.chat-empty p {
  margin: 0 0 8px;
}

/* 消息 */
.msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
}

.msg.is-continued {
  margin-top: 4px;
}

.msg:first-of-type {
  margin-top: 0;
}

.msg.is-user {
  flex-direction: row-reverse;
}

.msg.is-system {
  justify-content: center;
}

.msg-system {
  margin: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--seal-surface-soft);
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.msg-avatar-spacer {
  flex: none;
  width: 36px;
}

.msg-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: min(640px, 78%);
  min-width: 0;
}

.msg.is-user .msg-body {
  align-items: flex-end;
}

.msg-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.msg.is-user .msg-meta {
  flex-direction: row-reverse;
}

.msg-name {
  color: var(--seal-text-regular);
  font-weight: 600;
}

.msg-role {
  padding: 0 5px;
  border: 1px solid var(--seal-border-color);
  border-radius: 4px;
  font-size: 11px;
  font-style: normal;
}

.msg-bubble {
  padding: 8px 12px;
  border-radius: 4px 12px 12px 12px;
  background: var(--seal-surface-soft);
  color: var(--seal-text-color);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.msg.is-user .msg-bubble {
  border-radius: 12px 4px 12px 12px;
  background: var(--el-color-primary-light-8);
}

/* 输入区 */
.composer {
  flex: none;
  padding: 10px 16px max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--seal-border-color-light);
}

.reply-status {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-color-warning);
}

.speaker-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.speaker-label {
  flex: none;
  margin-inline-end: 2px;
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.speaker-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 3px 10px 3px 4px;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 999px;
  background: var(--seal-panel-bg);
  color: var(--seal-text-regular);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.speaker-chip em {
  font-size: 11px;
  font-style: normal;
  color: var(--seal-text-secondary);
}

.speaker-chip.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--seal-text-color);
  font-weight: 600;
}

.speaker-chip:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.composer-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.composer-input {
  flex: 1;
}

/* 补全弹层挂在 body 下，需用全局选择器 */
:global(.sandbox-suggest .mention-option) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  line-height: 1.4;
}

:global(.sandbox-suggest .mention-name) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

:global(.sandbox-suggest .mention-id) {
  margin-left: auto;
  padding-left: 12px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

@container (max-width: 719px) {
  .chat-header {
    gap: 8px;
    padding: 8px 12px;
  }

  .chat-scroll {
    padding: 12px;
  }

  .composer {
    padding-inline: 12px;
  }

  .msg-body {
    max-width: 82%;
  }

  .speaker-chip {
    min-height: 36px;
  }
}
</style>
