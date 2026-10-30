<template>
  <section class="workspace-page censor-workspace" aria-labelledby="censor-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="censor-workspace-title" class="workspace-title">拦截管理</h1>
        <p class="workspace-subtitle">用敏感词检查骰子收发的消息，命中后按级别提醒、警告或拉黑。</p>
      </div>
      <div class="workspace-actions">
        <label class="workspace-toggle">
          <el-switch v-model="censorEnable" aria-label="启用拦截" @change="enableChange" />
          <span>启用拦截</span>
        </label>
        <el-button v-show="censorEnable" :icon="Refresh" @click="restartCensor">重载拦截</el-button>
      </div>
    </header>

    <el-alert
      v-if="censorEnable && censorStore.needReload"
      type="warning"
      :closable="false"
      show-icon
      title="有修改尚未生效，点击右上角“重载拦截”后生效。" />

    <div class="workspace-body workspace-scroll">
      <el-tabs v-if="censorEnable" v-model="tab">
        <el-tab-pane label="拦截设置" name="setting">
          <censor-config></censor-config>
        </el-tab-pane>

        <el-tab-pane label="敏感词" name="word">
          <censor-word-tip></censor-word-tip>
          <censor-files></censor-files>
          <censor-words></censor-words>
        </el-tab-pane>

        <el-tab-pane label="拦截日志" name="log">
          <censor-log></censor-log>
        </el-tab-pane>
      </el-tabs>
      <div v-else class="workspace-panel workspace-empty">
        <strong>拦截未启用</strong>
        <p>启用后可以设置拦截范围、管理敏感词库并查看拦截日志。</p>
        <el-button type="primary" @click="enableChange(true)">启用拦截</el-button>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { Refresh } from '@element-plus/icons-vue';
import { getCensorStatus } from '~/api/censor';
onBeforeMount(() => {
  refreshCensorStatus();
});

import { useCensorStore } from '~/components/mod/censor/censor';

const censorEnable = ref<boolean>(false);

const censorStore = useCensorStore();

const refreshCensorStatus = async () => {
  const status:
    | { result: false }
    | {
        result: true;
        enable: boolean;
        isLoading: boolean;
      } = await getCensorStatus();
  if (status.result) {
    censorEnable.value = status.enable;
  }
};

const restartCensor = async () => {
  const restart = await censorStore.restartCensor();
  if (restart.result) {
    censorEnable.value = restart.enable;
    censorStore.reload();
  }
};

const stopCensor = async () => {
  const stop = await censorStore.stopCensor();
  if (stop.result) {
    censorEnable.value = false;
  }
};

const enableChange = async (value: boolean | number | string) => {
  if (value === true) {
    await restartCensor();
  } else {
    await stopCensor();
  }
};

const tab = ref('setting');
</script>
