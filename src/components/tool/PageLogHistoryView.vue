<template>
  <div class="log-history-page">
    <h2>历史日志</h2>
    <p class="log-history-page__desc">
      按日期、等级或关键词查看本机 data/ui.log 中保存的日志；默认显示最近 200 条。
    </p>

    <div class="log-history-page__panel">
      <LogHistoryPanel active :table-height="tableHeight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import LogHistoryPanel from '~/components/utils/LogHistoryPanel.vue';

const { width: viewportWidth } = useWindowSize();
const tableHeight = computed(() =>
  viewportWidth.value <= 640 ? 'calc(100vh - 360px)' : 'calc(100vh - 320px)',
);
</script>

<style scoped>
.log-history-page {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.log-history-page h2 {
  margin: 0;
}

.log-history-page__desc {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
}

.log-history-page__panel {
  padding: 1rem;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 8px;
  background: var(--seal-panel-bg);
}

@media screen and (max-width: 640px) {
  .log-history-page__panel {
    padding: 0.75rem;
  }
}
</style>
