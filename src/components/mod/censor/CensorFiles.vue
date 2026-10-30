<template>
  <section class="workspace-panel censor-files">
    <div class="workspace-panel-header">
      <div>
        <h2>词库文件</h2>
        <p>支持 txt 与 toml 格式；导入后需重载拦截才会生效。</p>
      </div>
      <div class="workspace-actions">
        <el-button
          class="censor-template-link"
          tag="a"
          target="_blank"
          link
          :href="`${urlBase}/sd-api/censor/files/template/toml`"
          :icon="Download">
          toml 模板
        </el-button>
        <el-button
          class="censor-template-link"
          tag="a"
          target="_blank"
          link
          :href="`${urlBase}/sd-api/censor/files/template/txt`"
          :icon="Download"
          >txt 模板
        </el-button>
        <el-upload
          action=""
          multiple
          :show-file-list="false"
          accept="application/text,.txt,application/toml,.toml"
          :before-upload="beforeUpload">
          <el-button type="primary" :icon="Upload">导入词库</el-button>
        </el-upload>
      </div>
    </div>
    <el-table table-layout="auto" :data="files">
      <el-table-column fixed label="文件名" prop="name"></el-table-column>
      <el-table-column prop="count[1]">
        <template #header>
          <el-tag type="info" disable-transitions>提醒</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="count[2]">
        <template #header>
          <el-tag disable-transitions>注意</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="count[3]">
        <template #header>
          <el-tag type="warning" disable-transitions>警告</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="count[4]">
        <template #header>
          <el-tag type="danger" disable-transitions>危险</el-tag>
        </template>
      </el-table-column>
      <el-table-column fixed="right">
        <template #default="scope">
          <el-button
            size="small"
            type="danger"
            :icon="Delete"
            plain
            @click="deleteFile(scope.row.key)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup lang="ts">
import type { UploadUserFile } from 'element-plus';
import { Delete, Download, Upload } from '@element-plus/icons-vue';
import { urlBase } from '~/api';
import { useCensorStore } from '~/components/mod/censor/censor';
import { deleteCensorFiles, getCensorFiles, uploadCensorFile } from '~/api/censor';
import { formatUploadFailureMessage } from '~/utils/upload-error';

onBeforeMount(() => {
  refreshFiles();
});

const censorStore = useCensorStore();

interface SensitiveWordFile {
  key: string;
  path: string;
  counter: number[];
}

const files = ref<SensitiveWordFile[]>();

censorStore.$subscribe(async (_, state) => {
  if (state.filesNeedRefresh === true) {
    await refreshFiles();
    state.filesNeedRefresh = false;
  }
});

const refreshFiles = async () => {
  const c:
    | { result: false }
    | {
        result: true;
        data: SensitiveWordFile[];
      } = await getCensorFiles();
  if (c.result) {
    files.value = c.data;
  }
};

const beforeUpload = async (file: UploadUserFile) => {
  try {
    const c = await uploadCensorFile(file as unknown as File);
    if (c.result) {
      await refreshFiles();
      ElMessage.success('上传完成，请在全部操作完成后，手动重载拦截');
      censorStore.markReload();
    } else {
      ElMessage.error(formatUploadFailureMessage(c.err));
    }
  } catch (err) {
    console.error('upload censor file failed:', err);
    ElMessage.error(formatUploadFailureMessage(err));
  }
  return false;
};

const deleteFile = async (key: string) => {
  await ElMessageBox.confirm('是否删除此词库？', '删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    const c: { result: true } | { result: false; err: string } = await deleteCensorFiles([key]);
    if (c.result) {
      ElMessage.success('删除词库完成，请在全部操作完成后，手动重载拦截');
      censorStore.markReload();
    } else {
      ElMessage.error('删除词库失败！' + c.err);
    }
  });
};
</script>

<style scoped>
.censor-files {
  margin-top: 16px;
}

.censor-template-link {
  text-decoration: none;
}
</style>
