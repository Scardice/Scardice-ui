<template>
  <div class="seal-help-card">
    <el-collapse v-model="model" class="seal-help-card__collapse">
      <el-collapse-item :name="name">
        <template #title>
          <el-text tag="strong">{{ title }}</el-text>
        </template>
        <slot />
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    name?: string;
    active?: string[];
  }>(),
  {
    title: '查看帮助',
    name: 'help',
    active: () => [],
  },
);

const model = ref<string[]>([...props.active]);
</script>

<style scoped>
.seal-help-card {
  padding: 0;
}

.seal-help-card__collapse {
  border: 0;
}
</style>
