<template>
  <header class="page-header">
    <h2>自动补全</h2>
    <el-switch
      v-model="enabled"
      active-text="启用"
      inactive-text="关闭"
      :loading="saving"
      :disabled="saving"
      @change="onToggle" />
  </header>

  <div class="tip log-gap-fill-tip">
    <div class="log-gap-fill-status">
      <el-tag :type="enabled ? 'success' : 'info'" effect="plain" size="small">
        {{ enabled ? '已启用' : '已关闭' }}
      </el-tag>
      <el-text>{{
        enabled ? '发现群消息缺口后会从平台历史自动补录。' : '不会再自动检测或补录群消息缺口。'
      }}</el-text>
    </div>
    <el-text tag="p">{{ description }}</el-text>
    <el-text tag="p">{{ disabledHint }}</el-text>
    <el-text tag="p" type="info" size="small">
      开关修改后立即保存并生效；正在执行的补全任务可能在下一次检查时停止。
    </el-text>
  </div>
</template>

<script setup lang="ts">
import { setLogGapFillEnable } from '~/api/dice';
import { useStore } from '~/store';

const store = useStore();
const description =
  '控制群消息 log 的自动补全：核心离线、重连或漏记群消息时，自动从平台历史补录缺口，补录完成后会在群里通知。';
const disabledHint =
  '关闭后，收到群消息、核心启动/重连、执行 .log on/.bot on 都不会触发补录；实时记录和日志查看不受影响。';
const enabled = ref(store.curDice.config?.logGapFillEnable !== false);
const saving = ref(false);

const readEnabled = () => store.curDice.config?.logGapFillEnable !== false;

onBeforeMount(async () => {
  try {
    await store.diceConfigGet();
  } catch (error) {
    console.error('读取自动补全设置失败', error);
  }
  enabled.value = readEnabled();
});

const onToggle = async (value: string | number | boolean) => {
  const next = Boolean(value);
  saving.value = true;
  try {
    await setLogGapFillEnable(next);
    await store.diceConfigGet();
    enabled.value = readEnabled();
    ElMessage.success(next ? '自动补全已开启' : '自动补全已关闭');
  } catch (error) {
    enabled.value = !next;
    console.error('保存自动补全设置失败', error);
    ElMessage.error('保存自动补全设置失败');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.log-gap-fill-tip {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.log-gap-fill-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.log-gap-fill-tip > :deep(.el-text) {
  align-self: stretch;
  margin: 0;
  line-height: 1.7;
}
</style>
