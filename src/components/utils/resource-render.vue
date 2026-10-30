<script setup lang="ts">
import type { Resource } from '~/store';
import { Microphone, Picture, VideoCamera } from '@element-plus/icons-vue';
import { getResourceData } from '~/api/resource';

const url = ref<string>('');
const previewFailed = ref(false);

const getImageUrl = async (path: string) => {
  const blob = await getResourceData(path, props.mini);
  return window.URL.createObjectURL(blob);
};

onMounted(() => {
  getImageUrl(props.data.path)
    .then(imageUrl => {
      url.value = imageUrl;
    })
    .catch(() => {
      previewFailed.value = true;
    });
});

const props = withDefaults(
  defineProps<{
    data: Resource;
    mini?: boolean;
  }>(),
  {
    mini: false,
  },
);
</script>

<template>
  <div
    v-if="data.type === 'image' && previewFailed"
    role="alert"
    aria-live="polite"
    :aria-label="`${data.name}预览加载失败`">
    <el-icon>
      <Picture />
    </el-icon>
    <span>{{ data.name }}预览加载失败</span>
  </div>
  <el-image
    v-else-if="data.type === 'image'"
    :key="url"
    :alt="data.name"
    :src="url"
    fit="contain"
    loading="lazy">
    <template #placeholder>
      <div>
        <el-icon>
          <Picture />
        </el-icon>
      </div>
    </template>
    <template #error>
      <div>
        <el-icon>
          <Picture />
        </el-icon>
      </div>
    </template>
  </el-image>
  <el-icon v-else-if="data.type === 'audio'">
    <Microphone />
  </el-icon>
  <el-icon v-else-if="data.type === 'video'">
    <VideoCamera />
  </el-icon>
  <div v-else>
    {{ '未知格式' }}
  </div>
</template>

<style scoped lang="css"></style>
