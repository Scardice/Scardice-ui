<script setup lang="ts">
import type { Resource } from '~/store';
import { useStore } from '~/store';
import { filesize } from 'filesize';
import { urlBase } from '~/api';
import { CopyDocument, Delete, Download, Search, Upload } from '@element-plus/icons-vue';
import ClipboardJS from 'clipboard';
import {
  createResource,
  deleteResource as deleteResourceApi,
  getResourcePage,
} from '~/api/resource';

const store = useStore();

const loading = ref(true);
const images = ref<Resource[]>([]);

const drawer = ref(false);
const currentResource = ref<Resource>({} as Resource);

const fileList = ref<any[]>([]);

const refreshResources = async () => {
  loading.value = true;
  const imagesRes = await getResourcePage('image');
  if (imagesRes.result) {
    images.value = imagesRes.data;
  } else {
    ElMessage.error(imagesRes.err);
  }
  loading.value = false;
};

const deleteResource = async (resource: Resource) => {
  ElMessageBox.confirm(
    `确定删除「${resource.name}（${resource.path}）」吗？删除后无法恢复，引用它的回复将无法显示图片。`,
    '删除图片',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  ).then(async () => {
    const res = await deleteResourceApi(resource.path);
    if (res.result) {
      ElMessage.success('图片已删除');
    } else {
      ElMessage.error(res.err);
    }
    await nextTick(async () => {
      await refreshResources();
    });
  });
};

const handleShow = async (resource: Resource) => {
  currentResource.value = resource;
  drawer.value = true;
};

const beforeUpload = async (file: any) => {
  // UploadRawFile
  if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/gif') {
    ElMessage.error('只能上传 PNG、JPG 或 GIF 图片');
    return false;
  }
  try {
    const resp = await createResource(file);
    if (resp.result) {
      ElMessage.success('上传完成');
    } else {
      ElMessage.error(resp.err);
    }
  } catch (e: any) {
    ElMessage.error(e.toString());
  } finally {
    await nextTick(async () => {
      await refreshResources();
    });
  }
  return false;
};

const copySealCode = async () => {
  ElMessage.success('已复制余烬码，可直接粘贴到回复或文案中');
};

onBeforeMount(async () => {
  loading.value = true;
  await refreshResources();
  new ClipboardJS('.resource-seal-code-copy-btn');
});
</script>

<template>
  <section class="workspace-page resource-workspace" aria-labelledby="resource-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="resource-workspace-title" class="workspace-title">资源管理</h1>
        <p class="workspace-subtitle">
          上传图片后复制“余烬码”（如
          <code>[图:data/images/xxx.png]</code>），即可在回复和文案中引用。
        </p>
      </div>
      <div class="workspace-actions">
        <el-upload
          action=""
          multiple
          accept=".png,.jpg,.jpeg,.gif"
          :before-upload="beforeUpload"
          :file-list="fileList"
          :show-file-list="false">
          <el-button type="primary" :icon="Upload">上传图片</el-button>
        </el-upload>
      </div>
    </header>

    <div class="workspace-body workspace-scroll">
      <section class="workspace-panel" aria-labelledby="resource-images-title">
        <div class="workspace-panel-header">
          <div>
            <h2 id="resource-images-title">图片</h2>
            <p>支持 PNG、JPG、GIF，共 {{ images.length }} 张。</p>
          </div>
        </div>
        <el-table
          v-loading="loading"
          :data="images"
          table-layout="auto"
          empty-text="还没有上传图片">
          <el-table-column label="预览" align="center" min-width="64px">
            <template #default="scope">
              <resource-render
                :key="scope.row.path"
                class="min-w-10"
                :data="scope.row as Resource"
                mini />
            </template>
          </el-table-column>
          <el-table-column prop="path" label="路径" />
          <el-table-column align="center" prop="size" label="大小">
            <template #default="scope">
              {{ filesize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right">
            <template #default="scope">
              <div class="resource-actions">
                <el-button
                  v-if="scope.row.type === 'image'"
                  type="primary"
                  link
                  size="small"
                  :icon="CopyDocument"
                  class="resource-seal-code-copy-btn"
                  :data-clipboard-text="`[图:${scope.row.path}]`"
                  @click="copySealCode()">
                  复制余烬码
                </el-button>
                <el-button
                  link
                  size="small"
                  :icon="Search"
                  @click="handleShow(scope.row as Resource)">
                  详情
                </el-button>
                <el-button
                  link
                  size="small"
                  :icon="Download"
                  tag="a"
                  class="resource-download"
                  :href="`${urlBase}/sd-api/resource/download?path=${encodeURIComponent(scope.row.path)}&token=${encodeURIComponent(store.token)}`">
                  下载
                </el-button>
                <el-button
                  type="danger"
                  link
                  size="small"
                  :icon="Delete"
                  @click="deleteResource(scope.row as Resource)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-drawer
      v-model="drawer"
      title="图片详情"
      size="min(420px, 92vw)"
      class="resource-detail-drawer"
      direction="rtl">
      <el-space class="mx-auto" size="large" direction="vertical" alignment="center">
        <div class="max-w-xs">
          <resource-render :key="currentResource.path" :data="currentResource" />
        </div>
        <el-descriptions title="" :column="1">
          <el-descriptions-item label="文件名">{{ currentResource.name }}</el-descriptions-item>
          <el-descriptions-item label="路径">{{ currentResource.path }}</el-descriptions-item>
          <el-descriptions-item label="大小">{{
            filesize(currentResource.size)
          }}</el-descriptions-item>
        </el-descriptions>
      </el-space>
    </el-drawer>
  </section>
</template>

<style scoped lang="css">
.el-loading-mask {
  z-index: 9;
}

.resource-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.resource-actions .el-button + .el-button {
  margin-inline-start: 0;
}

.resource-download {
  text-decoration: none;
}
</style>
