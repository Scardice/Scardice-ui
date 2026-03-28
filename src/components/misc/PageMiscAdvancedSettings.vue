<template>
  <el-affix v-if="modified" :offset="60">
    <div class="tip-danger">
      <el-text type="danger" size="large" tag="strong">内容已修改，不要忘记保存！</el-text>
    </div>
  </el-affix>

  <h2 class="h-2">高级设置</h2>
  <div class="tip-danger">
    <el-text>
      此处是面向开发者或进阶用户的隐藏设置页，下列的设置项可能会对余烬核心的功能造成重大影响。<br />
      一些尚在测试的不稳定设置项，以及
      <strong>普通骰主无需关注</strong> 的设置项会被放在此处。<br />
      此处的设置项不保证稳定提供，在未来版本随时可能会被移除。<br />
      <br />
      <strong>除非你知道自己在做什么，否则不要修改此处的任何设置项！</strong><br />
      <br />
      <em
        >如果你误操作修改了此处设置，希望恢复默认，请手动删除
        <code>data/default/advanced.yaml</code> 文件。</em
      >
    </el-text>
  </div>

  <el-form label-width="130px">
    <el-form-item label="显示高级设置页">
      <template #label>
        <span>显示高级设置页</span>
        <el-tooltip raw-content content="设置是否显示高级设置页，只影响展示">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-switch v-model="config.show" />
    </el-form-item>
    <el-form-item label="启用高级设置">
      <template #label>
        <span>启用高级设置</span>
        <el-tooltip raw-content content="设置是否启用高级设置，关闭时下列设置无效">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-switch v-model="config.enable" />
    </el-form-item>

    <h3>凭据查看</h3>
    <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        凭据默认掩码显示。点击右侧小眼睛后，才会切换为明文显示。请勿在录屏或共享屏幕时展开。
      </template>
    </el-alert>
    <el-form-item v-for="item in credentialItems" :key="item.key" :label="item.label">
      <el-input
        :model-value="item.value || item.emptyText"
        :type="visibleCredentialKeys[item.key] ? 'text' : 'password'"
        :placeholder="item.emptyText"
        readonly
        style="width: 36rem"
        autocomplete="off">
        <template #suffix>
          <el-icon
            class="toggle-credential-visibility"
            @click="toggleCredentialVisibility(item.key)">
            <View v-if="!visibleCredentialKeys[item.key]" />
            <Hide v-else />
          </el-icon>
        </template>
      </el-input>
    </el-form-item>

    <h3>JS 环境</h3>
    <el-alert type="error" :closable="false" style="margin-bottom: 16px">
      <template #title>
        开启后会向插件暴露 <code>seal.inst</code>，等同于把核心 <code>*Dice</code> 实例直接交给 JS。
      </template>
      <template #default>
        插件将可能直接修改核心配置、增删骰主、强制重载或关闭 JS
        环境、读取和改写部分运行时状态、发送通知或邮件。
        不当使用或恶意脚本可能导致权限提升、配置损坏、扩展异常重载、服务中断，甚至借由现有配置向外发送敏感内容。
      </template>
    </el-alert>
    <el-form-item label="暴露 seal.inst">
      <template #label>
        <span>暴露 seal.inst</span>
        <el-tooltip
          raw-content
          content="危险开关。启用后 JS 插件可以直接访问核心 Dice 实例，仅建议在确保信任加载的所有插件的前提下使用">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-switch
        v-model="config.exposeDangerousSealInst"
        inline-prompt
        active-text="危险"
        inactive-text="关闭"
        @change="handleDangerousSealInstToggle" />
    </el-form-item>

    <h3>自定义回复</h3>
    <el-form-item label="开启回复调试日志">
      <template #label>
        <span>回复调试日志</span>
        <el-tooltip raw-content content="开启自定义回复调试日志，打印字符细节">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-checkbox v-model="replyDebugMode">开启</el-checkbox>
    </el-form-item>
    <el-form-item label="全局统一冷却时间">
      <template #label>
        <span>统一冷却时间</span>
        <el-tooltip
          raw-content
          content="所有自定义回复统一使用这个冷却时间，不再使用各回复文件里的 interval。单位为秒。">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-input-number v-model="config.customReplyCooldown" :min="0.1" :step="0.5" :precision="1" />
      <el-text class="ml-2" type="info">秒</el-text>
    </el-form-item>

    <h3>跑团日志</h3>
    <el-form-item label="自定义后端 URL">
      <template #label>
        <span>自定义后端 URL</span>
        <el-tooltip raw-content content="设置第三方跑团日志后端 URL">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-input v-model="config.storyLogBackendUrl" style="width: 30rem" />
    </el-form-item>
    <el-form-item label="API 版本">
      <template #label>
        <span>API 版本</span>
        <el-tooltip raw-content content="指定后端的 API 版本">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-input v-model="config.storyLogApiVersion" style="width: 10rem" />
    </el-form-item>
    <el-form-item label="Token">
      <template #label>
        <span>Token</span>
        <el-tooltip raw-content content="指定传递给后端的 token">
          <el-icon>
            <question-filled />
          </el-icon>
        </el-tooltip>
      </template>
      <el-input v-model="config.storyLogBackendToken" style="width: 30rem" />
    </el-form-item>

    <el-form-item v-if="modified" label="" label-width="1rem" style="margin-top: 3rem">
      <el-button type="danger" @click="submitGiveup">放弃改动</el-button>
      <el-button type="success" @click="submit">保存设置</el-button>
    </el-form-item>
  </el-form>

  <el-dialog
    v-model="dangerousSealInstDialogVisible"
    title="确认暴露 seal.inst"
    width="42rem"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false">
    <div class="dangerous-dialog-content">
      <p>这是最后一次警告！</p>
      <p>请只在你完全信任当前所有 JS 插件，且明确知道风险时启用。</p>
      <p>我们建议骰主在启用此功能前审查相关插件源代码。</p>
    </div>
    <template #footer>
      <el-button @click="cancelDangerousSealInstEnable">取消</el-button>
      <el-button
        type="danger"
        :disabled="dangerousSealInstConfirmCountdown > 0"
        @click="confirmDangerousSealInstEnable">
        {{
          dangerousSealInstConfirmCountdown > 0
            ? `确认 (${dangerousSealInstConfirmCountdown}s)`
            : '确认启用'
        }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Hide, QuestionFilled, View } from '@element-plus/icons-vue';
import { useStore } from '~/store';
import type { AdvancedConfig } from '~/type.d.ts';
import { getCustomReplyDebug, postCustomReplyDebug } from '~/api/configs';

const emit = defineEmits(['update:advanced-settings-show']);

const store = useStore();

const config = ref<AdvancedConfig>({
  show: false,
  enable: false,
  storyLogBackendUrl: '',
  storyLogApiVersion: '',
  storyLogBackendToken: '',
  customReplyCooldown: 5,
  exposeDangerousSealInst: false,
});
const replyDebugMode = ref(false);
const visibleCredentialKeys = ref<Record<string, boolean>>({});
const modified = ref(false);
const savedConfigSnapshot = ref('');
const savedReplyDebugMode = ref(false);
const dangerousSealInstDialogVisible = ref(false);
const dangerousSealInstConfirmCountdown = ref(0);
let dangerousSealInstConfirmTimer: number | undefined;

const credentialItems = computed(() => {
  let localToken = '';
  try {
    localToken = localStorage.getItem('t') ?? '';
  } catch {
    localToken = '';
  }

  return [
    {
      key: 'current-token',
      label: '当前会话 Token',
      value: store.token ?? '',
      emptyText: '当前会话 Token 不存在',
    },
    {
      key: 'local-token',
      label: '本地缓存 Token',
      value: localToken,
      emptyText: '本地缓存 Token 不存在',
    },
  ];
});

const resetCredentialVisibility = () => {
  const newState: Record<string, boolean> = {};
  for (const item of credentialItems.value) {
    newState[item.key] = false;
  }
  visibleCredentialKeys.value = newState;
};

const toggleCredentialVisibility = (key: string) => {
  visibleCredentialKeys.value[key] = !visibleCredentialKeys.value[key];
};

const syncDirtyState = () => {
  modified.value =
    JSON.stringify(config.value) !== savedConfigSnapshot.value ||
    replyDebugMode.value !== savedReplyDebugMode.value;
};

const clearDangerousSealInstConfirmTimer = () => {
  if (dangerousSealInstConfirmTimer !== undefined) {
    window.clearInterval(dangerousSealInstConfirmTimer);
    dangerousSealInstConfirmTimer = undefined;
  }
};

const syncSavedState = () => {
  savedConfigSnapshot.value = JSON.stringify(config.value);
  savedReplyDebugMode.value = replyDebugMode.value;
  syncDirtyState();
};

const cancelDangerousSealInstEnable = () => {
  clearDangerousSealInstConfirmTimer();
  dangerousSealInstDialogVisible.value = false;
  dangerousSealInstConfirmCountdown.value = 0;
  config.value.exposeDangerousSealInst = false;
  syncDirtyState();
};

const confirmDangerousSealInstEnable = () => {
  clearDangerousSealInstConfirmTimer();
  dangerousSealInstDialogVisible.value = false;
  dangerousSealInstConfirmCountdown.value = 0;
  syncDirtyState();
};

const handleDangerousSealInstToggle = (value: string | number | boolean) => {
  if (value !== true) {
    syncDirtyState();
    return;
  }

  clearDangerousSealInstConfirmTimer();
  dangerousSealInstConfirmCountdown.value = 5;
  dangerousSealInstDialogVisible.value = true;
  dangerousSealInstConfirmTimer = window.setInterval(() => {
    if (dangerousSealInstConfirmCountdown.value <= 1) {
      dangerousSealInstConfirmCountdown.value = 0;
      clearDangerousSealInstConfirmTimer();
      return;
    }
    dangerousSealInstConfirmCountdown.value -= 1;
  }, 1000);
};

onBeforeMount(async () => {
  config.value = await store.diceAdvancedConfigGet();
  replyDebugMode.value = (await getCustomReplyDebug()).value;
  resetCredentialVisibility();
  syncSavedState();
});

watch(
  () => config.value,
  () => {
    syncDirtyState();
  },
  {
    deep: true,
  },
);
watch(
  () => replyDebugMode.value,
  () => {
    syncDirtyState();
  },
);

const submit = async () => {
  const shouldNotifyDangerousReload =
    JSON.parse(savedConfigSnapshot.value || '{}').exposeDangerousSealInst !==
    config.value.exposeDangerousSealInst;
  await store.diceAdvancedConfigSet(config.value);
  await postCustomReplyDebug(replyDebugMode.value);
  config.value = await store.diceAdvancedConfigGet();
  resetCredentialVisibility();
  syncSavedState();
  emit('update:advanced-settings-show', config.value.show);
  if (shouldNotifyDangerousReload) {
    ElMessage.info('设置已变更；若 JS 环境已启用，核心已自动重载 JS 环境使其生效。');
  }
};

const submitGiveup = async () => {
  clearDangerousSealInstConfirmTimer();
  dangerousSealInstDialogVisible.value = false;
  dangerousSealInstConfirmCountdown.value = 0;
  config.value = await store.diceAdvancedConfigGet();
  replyDebugMode.value = (await getCustomReplyDebug()).value;
  resetCredentialVisibility();
  syncSavedState();
};

onBeforeUnmount(() => {
  clearDangerousSealInstConfirmTimer();
});
</script>

<style scoped lang="css">
.toggle-credential-visibility {
  cursor: pointer;
}

.dangerous-dialog-content p {
  margin: 0 0 12px;
}

.dangerous-dialog-content ul {
  margin: 0 0 12px;
  padding-left: 20px;
}
</style>
