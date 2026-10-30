<template>
  <section class="workspace-page advanced-workspace" aria-labelledby="advanced-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="advanced-workspace-title" class="workspace-title">高级设置</h1>
        <p class="workspace-subtitle">面向开发者与进阶用户的隐藏设置，修改前请确认了解其影响。</p>
      </div>
    </header>

    <div class="workspace-body workspace-scroll">
      <el-alert type="warning" :closable="false" show-icon title="这些设置可能显著改变核心行为">
        <p class="advanced-alert-text">
          这里存放测试中或普通骰主无需关注的设置，未来版本可能随时调整或移除。 如需恢复默认，请删除
          <code>data/default/advanced.yaml</code> 后重启骰子。
        </p>
      </el-alert>

      <el-form label-width="auto" label-position="left" class="advanced-form">
        <section class="workspace-panel">
          <div class="workspace-panel-header">
            <h2>页面与总开关</h2>
          </div>
          <el-form-item label="显示高级设置页">
            <div class="advanced-field">
              <el-switch v-model="config.show" aria-label="显示高级设置页" />
              <span class="advanced-hint">关闭后侧栏不再显示本页，只影响界面展示。</span>
            </div>
          </el-form-item>
          <el-form-item label="启用高级设置">
            <div class="advanced-field">
              <el-switch v-model="config.enable" aria-label="启用高级设置" />
              <span class="advanced-hint">关闭时，下方所有设置都不生效。</span>
            </div>
          </el-form-item>
        </section>

        <section class="workspace-panel">
          <div class="workspace-panel-header">
            <div>
              <h2>凭据查看</h2>
              <p>默认隐藏。点击眼睛图标显示明文，请勿在录屏或共享屏幕时显示。</p>
            </div>
          </div>
          <el-form-item v-for="item in credentialItems" :key="item.key" :label="item.label">
            <el-input
              :model-value="item.value || item.emptyText"
              :type="visibleCredentialKeys[item.key] ? 'text' : 'password'"
              :placeholder="item.emptyText"
              readonly
              class="advanced-input-wide"
              autocomplete="off">
              <template #suffix>
                <button
                  type="button"
                  class="toggle-credential-visibility"
                  :aria-label="visibleCredentialKeys[item.key] ? '隐藏凭据' : '显示凭据'"
                  @click="toggleCredentialVisibility(item.key)">
                  <el-icon>
                    <View v-if="!visibleCredentialKeys[item.key]" />
                    <Hide v-else />
                  </el-icon>
                </button>
              </template>
            </el-input>
          </el-form-item>
        </section>

        <section class="workspace-panel">
          <div class="workspace-panel-header">
            <div>
              <h2>JS 插件权限</h2>
              <p>以下两项会让插件获得核心级权限，只在完全信任所有已加载插件时开启。</p>
            </div>
          </div>
          <el-form-item label="暴露 seal.inst">
            <div class="advanced-field">
              <el-switch
                v-model="config.exposeDangerousSealInst"
                class="advanced-danger-switch"
                aria-label="暴露 seal.inst"
                @change="handleDangerousSealInstToggle" />
              <span class="advanced-hint">
                插件可直接访问核心 <code>*Dice</code> 实例：修改配置、增删骰主、重载
                JS、发送通知等。
              </span>
            </div>
          </el-form-item>
          <el-form-item label="无限制 fs 访问">
            <div class="advanced-field">
              <el-switch
                v-model="config.allowFilesystemUnrestrictedAccess"
                class="advanced-danger-switch"
                aria-label="允许无限制 fs 访问"
                @change="handleDangerousFilesystemToggle" />
              <span class="advanced-hint">
                插件的 <code>fs</code> 模块可读写、删除插件私有目录之外的任意文件。
              </span>
            </div>
          </el-form-item>
        </section>

        <section class="workspace-panel">
          <div class="workspace-panel-header">
            <h2>自定义回复</h2>
          </div>
          <el-form-item label="回复调试日志">
            <div class="advanced-field">
              <el-switch v-model="replyDebugMode" aria-label="回复调试日志" />
              <span class="advanced-hint">在日志中打印匹配过程与字符细节。</span>
            </div>
          </el-form-item>
          <el-form-item label="统一冷却时间">
            <div class="advanced-field">
              <span class="advanced-inline">
                <el-input-number
                  v-model="config.customReplyCooldown"
                  :min="0.1"
                  :step="0.5"
                  :precision="1" />
                <span>秒</span>
              </span>
              <span class="advanced-hint"
                >所有回复文件统一使用此冷却时间，忽略各文件的 interval。</span
              >
            </div>
          </el-form-item>
        </section>

        <section class="workspace-panel">
          <div class="workspace-panel-header">
            <div>
              <h2>跑团日志后端</h2>
              <p>使用第三方跑团日志服务时填写。</p>
            </div>
          </div>
          <el-form-item label="后端 URL">
            <el-input
              v-model="config.storyLogBackendUrl"
              class="advanced-input-wide"
              placeholder="https://example.com" />
          </el-form-item>
          <el-form-item label="API 版本">
            <el-input v-model="config.storyLogApiVersion" class="advanced-input-narrow" />
          </el-form-item>
          <el-form-item label="Token">
            <el-input
              v-model="config.storyLogBackendToken"
              class="advanced-input-wide"
              type="password"
              show-password
              autocomplete="off" />
          </el-form-item>
        </section>
      </el-form>
    </div>

    <footer class="workspace-savebar">
      <span class="advanced-save-status" :class="{ 'is-dirty': modified }" role="status">
        {{ modified ? '有未保存的更改' : '所有设置已保存' }}
      </span>
      <div class="workspace-actions">
        <el-button :disabled="!modified" @click="submitGiveup">放弃更改</el-button>
        <el-button type="primary" :icon="DocumentChecked" :disabled="!modified" @click="submit">
          保存设置
        </el-button>
      </div>
    </footer>

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

    <el-dialog
      v-model="dangerousFilesystemDialogVisible"
      title="确认启用无限制 fs 访问"
      width="42rem"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false">
      <div class="dangerous-dialog-content">
        <p>这是最后一次警告！</p>
        <p>启用后，JS 插件可通过 fs 模块访问运行用户可以访问的所有路径。</p>
        <p>请只在你完全信任当前所有 JS 插件时启用。</p>
      </div>
      <template #footer>
        <el-button @click="cancelDangerousFilesystemEnable">取消</el-button>
        <el-button
          type="danger"
          :disabled="dangerousFilesystemConfirmCountdown > 0"
          @click="confirmDangerousFilesystemEnable">
          {{
            dangerousFilesystemConfirmCountdown > 0
              ? `确认 (${dangerousFilesystemConfirmCountdown}s)`
              : '确认启用'
          }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { DocumentChecked, Hide, View } from '@element-plus/icons-vue';
import { useStore } from '~/store';
import type { AdvancedConfig } from '~/type.d.ts';
import { getCustomReplyDebug, postCustomReplyDebug } from '~/api/configs';
import { testWebUIBypass } from '~/utils/test-webui-bypass';

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
  allowFilesystemUnrestrictedAccess: false,
});
const replyDebugMode = ref(false);
const visibleCredentialKeys = ref<Record<string, boolean>>({});
const modified = ref(false);
const savedConfigSnapshot = ref('');
const savedReplyDebugMode = ref(false);
const dangerousSealInstDialogVisible = ref(false);
const dangerousSealInstConfirmCountdown = ref(0);
let dangerousSealInstConfirmTimer: number | undefined;
const dangerousFilesystemDialogVisible = ref(false);
const dangerousFilesystemConfirmCountdown = ref(0);
let dangerousFilesystemConfirmTimer: number | undefined;

const normalizeAdvancedConfig = (value: AdvancedConfig): AdvancedConfig => ({
  ...value,
  allowFilesystemUnrestrictedAccess: value.allowFilesystemUnrestrictedAccess ?? false,
});

const credentialItems = computed(() => {
  let localToken = '';
  if (!testWebUIBypass.skipStoredToken) {
    try {
      localToken = localStorage.getItem('t') ?? '';
    } catch {
      localToken = '';
    }
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

const clearDangerousFilesystemConfirmTimer = () => {
  if (dangerousFilesystemConfirmTimer !== undefined) {
    window.clearInterval(dangerousFilesystemConfirmTimer);
    dangerousFilesystemConfirmTimer = undefined;
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

const cancelDangerousFilesystemEnable = () => {
  clearDangerousFilesystemConfirmTimer();
  dangerousFilesystemDialogVisible.value = false;
  dangerousFilesystemConfirmCountdown.value = 0;
  config.value.allowFilesystemUnrestrictedAccess = false;
  syncDirtyState();
};

const confirmDangerousFilesystemEnable = () => {
  clearDangerousFilesystemConfirmTimer();
  dangerousFilesystemDialogVisible.value = false;
  dangerousFilesystemConfirmCountdown.value = 0;
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

const handleDangerousFilesystemToggle = (value: string | number | boolean) => {
  if (value !== true) {
    syncDirtyState();
    return;
  }

  clearDangerousFilesystemConfirmTimer();
  dangerousFilesystemConfirmCountdown.value = 5;
  dangerousFilesystemDialogVisible.value = true;
  dangerousFilesystemConfirmTimer = window.setInterval(() => {
    if (dangerousFilesystemConfirmCountdown.value <= 1) {
      dangerousFilesystemConfirmCountdown.value = 0;
      clearDangerousFilesystemConfirmTimer();
      return;
    }
    dangerousFilesystemConfirmCountdown.value -= 1;
  }, 1000);
};

onBeforeMount(async () => {
  config.value = normalizeAdvancedConfig(await store.diceAdvancedConfigGet());
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
  config.value = normalizeAdvancedConfig(await store.diceAdvancedConfigGet());
  resetCredentialVisibility();
  syncSavedState();
  emit('update:advanced-settings-show', config.value.show);
  if (shouldNotifyDangerousReload) {
    ElMessage.info('设置已变更；若 JS 环境已启用，核心已自动重载 JS 环境使其生效。');
  }
};

const submitGiveup = async () => {
  clearDangerousSealInstConfirmTimer();
  clearDangerousFilesystemConfirmTimer();
  dangerousSealInstDialogVisible.value = false;
  dangerousSealInstConfirmCountdown.value = 0;
  dangerousFilesystemDialogVisible.value = false;
  dangerousFilesystemConfirmCountdown.value = 0;
  config.value = normalizeAdvancedConfig(await store.diceAdvancedConfigGet());
  replyDebugMode.value = (await getCustomReplyDebug()).value;
  resetCredentialVisibility();
  syncSavedState();
};

onBeforeUnmount(() => {
  clearDangerousSealInstConfirmTimer();
  clearDangerousFilesystemConfirmTimer();
});
</script>

<style scoped lang="css">
.advanced-form > .workspace-panel + .workspace-panel {
  margin-top: var(--workspace-gap);
}

.advanced-alert-text {
  margin: 4px 0 0;
}

.advanced-form .el-form-item {
  margin-bottom: 14px;
}

.advanced-form .el-form-item:last-child {
  margin-bottom: 0;
}

.advanced-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  min-width: 0;
}

.advanced-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--seal-text-secondary);
}

.advanced-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.advanced-input-wide {
  width: min(36rem, 100%);
}

.advanced-input-narrow {
  width: min(10rem, 100%);
}

.advanced-danger-switch {
  --el-switch-on-color: var(--el-color-danger);
}

.toggle-credential-visibility {
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.advanced-save-status {
  font-size: 13px;
  color: var(--seal-text-secondary);
}

.advanced-save-status.is-dirty {
  color: var(--el-color-warning);
  font-weight: 600;
}

.dangerous-dialog-content p {
  margin: 0 0 12px;
}

.dangerous-dialog-content ul {
  margin: 0 0 12px;
  padding-left: 20px;
}
</style>
