<template>
  <el-collapse-item :title="group === '__others__' ? '无分组' : group" :name="group">
    <div class="text-group-grid">
      <slot name="values" />
    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
defineProps<{
  group: string | '__others__';
}>();
</script>

<style scoped lang="css">
.text-group-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: var(--workspace-gap, 16px);
}

@media (min-width: 1400px) {
  .text-group-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
