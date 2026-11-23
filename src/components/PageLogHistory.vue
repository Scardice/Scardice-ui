<template>
  <el-drawer
    v-model="visible"
    title="历史日志"
    direction="rtl"
    :size="drawerSize"
    class="log-history-drawer"
    :destroy-on-close="false">
    <LogHistoryPanel :active="visible" />
  </el-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import LogHistoryPanel from '~/components/utils/LogHistoryPanel.vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const { width: viewportWidth } = useWindowSize();
const isMobile = computed(() => viewportWidth.value <= 640);
const drawerSize = computed(() => (isMobile.value ? '94%' : '860px'));
</script>

<style scoped>
.log-history-drawer {
  max-width: 860px;
}

.log-history-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 0.9rem;
  border-bottom: 2px solid #f5a9b8;
}

.log-history-drawer :deep(.el-drawer__title) {
  color: #3d8fb8;
  font-weight: 600;
}
</style>
