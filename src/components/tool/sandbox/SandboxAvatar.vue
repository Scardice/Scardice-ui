<template>
  <span
    class="sandbox-avatar"
    :class="[`is-${shape}`, { 'is-bot': kind === 'bot' }]"
    :style="{ '--avatar-size': `${size}px`, '--avatar-bg': background }"
    aria-hidden="true">
    <img v-if="kind === 'bot'" :src="imgSeal" alt="" />
    <template v-else-if="kind === 'group'">#</template>
    <template v-else>{{ initial }}</template>
  </span>
</template>

<script setup lang="ts">
import imgSeal from '~/assets/seal.png';
import { avatarPalette } from './state';

const props = withDefaults(
  defineProps<{
    kind: 'user' | 'group' | 'bot';
    name?: string;
    color?: number;
    size?: number;
  }>(),
  { name: '', color: 0, size: 36 },
);

const shape = computed(() => (props.kind === 'group' ? 'square' : 'circle'));
const initial = computed(() => Array.from(props.name.trim())[0]?.toUpperCase() ?? '?');
const background = computed(() =>
  props.kind === 'group'
    ? 'var(--el-color-primary)'
    : avatarPalette[props.color % avatarPalette.length],
);
</script>

<style scoped>
.sandbox-avatar {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--avatar-size);
  height: var(--avatar-size);
  overflow: hidden;
  background: var(--avatar-bg);
  color: #fff;
  font-size: calc(var(--avatar-size) * 0.42);
  font-weight: 600;
  line-height: 1;
  user-select: none;
}

.sandbox-avatar.is-circle {
  border-radius: 50%;
}

.sandbox-avatar.is-square {
  border-radius: 28%;
  color: var(--seal-on-primary);
}

.sandbox-avatar.is-bot {
  background: var(--seal-surface-soft);
  border: 1px solid var(--seal-border-color-light);
}

.sandbox-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
