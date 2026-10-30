<template>
  <section class="workspace-page help-workspace">
    <header class="workspace-header">
      <div>
        <h1 class="workspace-title">帮助文档</h1>
        <p class="workspace-subtitle">浏览已加载的帮助词条，或管理帮助文件。</p>
      </div>
      <div class="help-header-actions">
        <div class="help-mode-switch" role="group" aria-label="帮助文档工作区">
          <button type="button" :aria-pressed="tab === 'item'" @click="tab = 'item'">
            词条阅读
          </button>
          <button type="button" :aria-pressed="tab === 'file'" @click="tab = 'file'">
            文件管理
          </button>
        </div>
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="reloadLoading"
          :disabled="reloadLoading"
          @click="reload">
          重载帮助文档
        </el-button>
      </div>
    </header>

    <div v-if="needReload || configNeedSave" class="help-notices">
      <el-alert
        v-if="needReload"
        title="帮助文件已修改，需要重载后生效。"
        type="warning"
        :closable="false"
        show-icon />
      <div v-if="configNeedSave" class="help-config-notice">
        <el-alert title="设置存在修改，别忘记保存。" type="warning" :closable="false" show-icon />
        <el-button
          type="primary"
          :icon="DocumentChecked"
          :disabled="!configNeedSave"
          @click="summitConfig">
          保存设置
        </el-button>
      </div>
    </div>

    <el-dialog v-model="uploadDialogVisible" title="上传帮助文档">
      <el-alert
        v-show="uploadForm.group === 'default'"
        style="margin-bottom: 20px"
        type="warning"
        :closable="false">
        更具体的分组能提供组内搜索命令
        <el-tag size="small" type="info">.find#&lt;分组&gt; &lt;搜索内容&gt;</el-tag
        >，是否一定要选择默认分组？
      </el-alert>
      <el-form ref="uploadFormRef" label-position="top" :model="uploadForm" :rules="uploadRules">
        <el-form-item label="分组" prop="group">
          <el-select
            v-model="uploadForm.group"
            name="upload-group"
            placeholder="选择分组"
            filterable
            clearable
            allow-create
            aria-label="帮助文档分组">
            <el-option
              v-for="group in docGroups"
              :key="group.key"
              :label="group.label"
              :value="group.key" />
          </el-select>
        </el-form-item>
        <el-form-item label="帮助文档" prop="files">
          <el-upload
            :on-change="fileChange"
            :file-list="uploadForm.files"
            multiple
            accept=".json,.jsonc,.hjson,.xlsx"
            :auto-upload="false">
            <template #trigger>
              <el-button type="primary" :icon="Upload">选择文件</el-button>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-space>
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUpload(uploadFormRef)">上传</el-button>
        </el-space>
      </template>
    </el-dialog>

    <el-dialog v-model="configDialogVisible" title="设置帮助文档">
      <el-alert
        v-show="configNeedSave"
        style="margin-bottom: 20px"
        type="warning"
        :closable="false">
        设置存在修改，别忘记保存！
      </el-alert>
      <h3>分组别名</h3>
      <el-form>
        <el-form-item
          v-for="group in docGroups"
          :key="group.key"
          :label="group.label"
          label-width="50px">
          <HelpConfigTags
            :group="group"
            :aliases="helpAliases"
            @add-alias="addAlias"
            @remove-alias="removeAlias" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-space>
          <el-button @click="configDialogClose">取消</el-button>
          <el-button type="primary" @click="summitConfig">保存</el-button>
        </el-space>
      </template>
    </el-dialog>

    <section
      v-show="tab === 'item'"
      class="help-entry-workspace workspace-body"
      aria-label="帮助词条">
      <aside class="help-categories" aria-label="帮助文档分组">
        <div class="help-section-label">按分组浏览</div>
        <button
          v-for="category in helpCategories"
          :key="category.key || 'all'"
          type="button"
          :aria-pressed="selectedGroup === category.key"
          :class="{ active: selectedGroup === category.key }"
          @click="selectHelpGroup(category.key)">
          {{ category.label }}
        </button>
      </aside>

      <div class="help-entry-list" :class="{ 'mobile-hidden': mobileView === 'reader' }">
        <div class="help-search">
          <el-select
            v-model="selectedGroup"
            name="help-group"
            class="help-mobile-category"
            aria-label="帮助文档分组"
            @change="selectHelpGroup">
            <el-option
              v-for="category in helpCategories"
              :key="category.key || 'all'"
              :label="category.label"
              :value="category.key" />
          </el-select>
          <el-input
            v-model="textItemQuery.title"
            name="help-title"
            aria-label="按词条名搜索"
            placeholder="词条名"
            clearable
            @keyup.enter="searchHelpText" />
          <div class="help-search-secondary">
            <el-input
              v-model="textItemQuery.id"
              name="help-id"
              aria-label="按序号搜索"
              placeholder="序号"
              clearable
              @keyup.enter="searchHelpText" />
            <el-input
              v-model="textItemQuery.from"
              name="help-source"
              aria-label="按来源文件搜索"
              placeholder="来源文件"
              clearable
              @keyup.enter="searchHelpText" />
            <el-button type="primary" @click="searchHelpText">搜索</el-button>
          </div>
        </div>

        <el-alert
          v-if="itemError"
          class="help-inline-error"
          :title="itemError"
          type="error"
          :closable="false"
          show-icon />
        <div class="help-results" v-loading="itemsLoading">
          <div v-if="!itemsLoading && !itemError && textItems.length === 0" class="help-empty">
            没有找到匹配的帮助词条。
          </div>
          <div class="help-results-scroll">
            <button
              v-for="item in textItems"
              :key="item.id"
              type="button"
              class="help-item"
              :class="{ active: selectedHelpItem?.id === item.id }"
              :aria-current="selectedHelpItem?.id === item.id ? 'page' : undefined"
              @click="selectHelpItem(item)">
              <span class="help-item-heading">
                <span class="help-item-title">{{ item.title }}</span>
                <span class="help-item-id">#{{ item.id }}</span>
              </span>
              <span class="help-item-summary">{{ getHelpText(item.content) }}</span>
              <span class="help-item-source">{{ item.group }} · {{ item.from }}</span>
            </button>
          </div>
        </div>
        <footer class="help-pagination">
          <span v-if="itemsLoading">读取中…</span>
          <span v-else>{{ textItemQuery.total }} 条词条</span>
          <el-pagination
            :page-size="textItemQuery.pageSize"
            :current-page="textItemQuery.pageNum"
            :total="textItemQuery.total"
            :pager-count="5"
            layout="prev, pager, next"
            background
            hide-on-single-page
            @current-change="handleCurrentPageChange" />
        </footer>
      </div>

      <article class="help-reader" :class="{ 'mobile-hidden': mobileView === 'list' }">
        <template v-if="selectedHelpItem">
          <div class="help-reader-toolbar">
            <el-button class="help-reader-back" @click="mobileView = 'list'"
              >返回词条列表</el-button
            >
            <span>{{ selectedHelpItem.group }}</span>
          </div>
          <div class="help-reading-content">
            <h2>{{ selectedHelpItem.title }}</h2>
            <dl class="help-metadata">
              <div>
                <dt>序号</dt>
                <dd>{{ selectedHelpItem.id }}</dd>
              </div>
              <div v-if="selectedHelpItem.from">
                <dt>来源文件</dt>
                <dd>{{ selectedHelpItem.from }}</dd>
              </div>
              <div v-if="selectedHelpItem.packageName">
                <dt>分类</dt>
                <dd>{{ selectedHelpItem.packageName }}</dd>
              </div>
              <div v-if="selectedHelpItem.keyWords">
                <dt>关键词</dt>
                <dd>{{ selectedHelpItem.keyWords }}</dd>
              </div>
            </dl>
            <pre class="help-content">{{ selectedHelpItem.content }}</pre>
          </div>
        </template>
        <div v-else class="help-empty help-reader-empty">
          <span v-if="itemsLoading">正在读取帮助词条…</span>
          <span v-else-if="itemError">帮助词条暂不可用。</span>
          <span v-else>从列表中选择一个词条开始阅读。</span>
        </div>
      </article>
    </section>

    <section
      v-show="tab === 'file'"
      class="help-file-workspace workspace-body"
      aria-label="文件管理">
      <div class="help-file-toolbar">
        <div>
          <h2>帮助文件</h2>
          <p>上传或删除文件后，需要重载帮助文档使变更生效。</p>
        </div>
        <div class="help-file-actions">
          <el-button v-show="showDeleteFile" type="danger" :icon="Delete" @click="deleteFiles">
            删除所选
          </el-button>
          <el-button :icon="Upload" @click="uploadDialogVisible = true">上传</el-button>
          <el-button :icon="Setting" @click="configDialogVisible = true">设置</el-button>
        </div>
      </div>
      <el-alert
        v-if="fileTreeError"
        :title="fileTreeError"
        type="error"
        :closable="false"
        show-icon />
      <div class="help-file-tree" v-loading="fileTreeLoading">
        <div class="file-tree-heading">
          <span>文件名</span>
          <span>状态 / 分组</span>
        </div>
        <el-tree
          ref="fileTreeRef"
          class="file-tree"
          :data="docTree"
          :props="treeNodeProps"
          node-key="key"
          default-expand-all
          show-checkbox
          empty-text="没有可管理的帮助文件"
          @check="updateCheckedFiles">
          <template #default="{ node, data }">
            <div class="file-line">
              <div class="file-info">
                <span class="file-icon">
                  <i-bi-folder2 v-if="data.isDir" />
                  <i-bi-filetype-json v-else-if="data.type === '.json'" />
                  <i-bi-filetype-xlsx v-else-if="data.type === '.xlsx'" />
                  <i-bi-file-break v-else />
                </span>
                <span :class="{ 'del-line': data.deleted }">{{ node.label }}</span>
              </div>
              <div v-if="!data.isDir" class="file-tag">
                <el-tag
                  :type="getHelpDocTag(data.loadStatus, data.deleted, data.group).type"
                  size="small"
                  :disable-transitions="true">
                  {{ getHelpDocTag(data.loadStatus, data.deleted, data.group).label }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-tree>
      </div>
    </section>
  </section>
</template>

<script lang="ts" setup>
import type { FormRules, FormInstance, ElTree } from 'element-plus';
import { Delete, DocumentChecked, Refresh, Setting, Upload } from '@element-plus/icons-vue';
import { trim } from 'lodash-es';
import type { UploadUserFile } from 'element-plus';
import type { HelpDoc, HelpTextItem, HelpTextItemQuery } from '~/type.d.ts';
import {
  deleteHelpDoc,
  getHelpDocConfig,
  getHelpDocPage,
  getHelpDocTree,
  postHelpDocConfig,
  reloadHelpDoc,
  uploadHelpDoc,
} from '~/api/helpdoc';
import { confirmUploadTargetMatch } from '~/utils/upload-classifier';
import { formatUploadFailureMessage } from '~/utils/upload-error';

interface Group {
  key: string;
  label: string;
}

const tab = ref<'file' | 'item'>('item');
const selectedGroup = ref('');
const mobileView = ref<'list' | 'reader'>('list');

const needReload = ref<boolean>(false);

interface UploadForm {
  group: string;
  files: any[];
}

const treeNodeProps = {
  label: 'name',
  disabled: 'deleted',
};
const docTree = ref<HelpDoc[]>([] as any);
const docGroups = ref<Group[]>([]);
const helpCategories = computed(() => [
  { key: '', label: '全部' },
  { key: 'builtin', label: '内置' },
  ...docGroups.value.filter(group => group.key !== 'builtin'),
]);
const fileTreeLoading = ref(false);
const fileTreeError = ref('');
const selectedFileKeys = ref<string[]>([]);
const itemsLoading = ref(false);
const itemError = ref('');
const selectedHelpItemId = ref<number>();
const uploadDialogVisible = ref<boolean>(false);
const uploadFormRef = ref<FormInstance>();
const uploadForm = reactive<UploadForm>({
  group: '',
  files: [] as any[],
});
const uploadRules = reactive<FormRules>({
  group: [
    { required: true, message: '请选择分组', trigger: 'blur' },
    { pattern: '^(?!builtin).*', message: '不能为内置分组', trigger: 'blur' },
  ],
  files: [{ required: true, message: '请选择文件', trigger: 'blur' }],
});

const fileChange = (_f: any, newFiles: any) => {
  uploadForm.files = newFiles;
};

async function confirmHelpdocFiles(files: UploadUserFile[]) {
  let unknownWarned = false;

  for (const file of files) {
    if (!file.raw) {
      continue;
    }

    const result = await confirmUploadTargetMatch(file.raw, 'helpdoc', {
      warnUnknown: !unknownWarned,
    });
    if (result.detected.type === 'unknown') {
      unknownWarned = true;
    }

    if (!result.proceed) {
      return false;
    }
  }

  return true;
}

const submitUpload = async (formData: FormInstance | undefined) => {
  if (!formData) return;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await formData.validate(async (valid, _) => {
    if (valid) {
      if (!(await confirmHelpdocFiles(uploadForm.files))) {
        return;
      }

      // const fd = new FormData();
      // fd.append("group", uploadForm.group)
      // uploadForm.files.forEach(f => {
      //   fd.append("files", f.raw)
      // })

      const res = await uploadHelpDoc(uploadForm);
      if (res.result) {
        ElMessage.success('上传完成，请在全部操作完成后，手动重载帮助文件');
      } else {
        ElMessage.error(formatUploadFailureMessage(res.err));
      }
      formData.resetFields();
      needReload.value = true;
      await refreshFileTree();
      uploadDialogVisible.value = false;
    }
  });
};

const fileTreeRef = ref<InstanceType<typeof ElTree>>();
const showDeleteFile = computed(() => selectedFileKeys.value.length > 0);
const updateCheckedFiles = () => {
  selectedFileKeys.value = (fileTreeRef.value?.getCheckedKeys(false) ?? []) as string[];
};
const deleteFiles = async () => {
  const checkedFileKeys = fileTreeRef.value?.getCheckedKeys(false) as string[];
  if (checkedFileKeys && checkedFileKeys.length !== 0) {
    ElMessageBox.confirm('确认删除选择的文件吗？', '删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      deleteHelpDoc(checkedFileKeys).then(res => {
        if (res.result) {
          ElMessage({
            type: 'success',
            message: '删除文件成功',
          });
          refreshFileTree();
        } else {
          ElMessage({
            type: 'error',
            message: res.err ?? '删除文件失败',
          });
        }
      });
      needReload.value = true;
    });
  } else {
    ElMessage({
      type: 'error',
      message: '未选择文件',
    });
  }
};

const getHelpDocTag = (
  loadStatus: number,
  deleted: boolean,
  group: string,
): {
  type: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  label: string;
} => {
  if (loadStatus === 0) {
    return {
      type: 'warning',
      label: '未加载',
    };
  } else if (loadStatus === 2) {
    return {
      type: 'danger',
      label: '格式有误',
    };
  } else if (deleted) {
    return {
      type: 'warning',
      label: group,
    };
  } else {
    return {
      type: 'success',
      label: group,
    };
  }
};

const refreshFileTree = async () => {
  fileTreeLoading.value = true;
  fileTreeError.value = '';
  try {
    const resp = await getHelpDocTree();
    if (resp?.result) {
      docTree.value = resp.data;
      selectedFileKeys.value = [];
      docGroups.value = [
        { label: '默认', key: 'default' },
        ...resp.data
          .filter(entry => entry.isDir)
          .map(entry => ({ label: entry.name, key: entry.name })),
      ];
    } else {
      fileTreeError.value = resp?.err ?? '无法获取帮助文件信息';
      ElMessage.error(fileTreeError.value);
    }
  } catch (error) {
    fileTreeError.value =
      error instanceof Error ? `无法获取帮助文件信息：${error.message}` : '无法获取帮助文件信息';
    ElMessage.error(fileTreeError.value);
  } finally {
    fileTreeLoading.value = false;
  }
};

const textItems = ref<HelpTextItem[]>([]);
const textItemQuery = ref<HelpTextItemQuery>({
  pageNum: 1,
  pageSize: 20,
  total: 0,
});
const selectedHelpItem = computed(() =>
  textItems.value.find(item => item.id === selectedHelpItemId.value),
);
const getHelpText = (row: string) => {
  const temp = trim(row);
  if (temp.length <= 200) {
    return temp;
  } else {
    return temp.substring(0, 151) + '...';
  }
};
const selectHelpItem = (item: HelpTextItem) => {
  selectedHelpItemId.value = item.id;
  mobileView.value = 'reader';
};
const selectHelpGroup = async (group: string) => {
  selectedGroup.value = group;
  textItemQuery.value.group = group || undefined;
  textItemQuery.value.pageNum = 1;
  mobileView.value = 'list';
  await refreshTextItems();
};
const searchHelpText = async () => {
  textItemQuery.value.pageNum = 1;
  await refreshTextItems();
};
const handleCurrentPageChange = async (val: number) => {
  textItemQuery.value.pageNum = val;
  await refreshTextItems();
};
const refreshTextItems = async () => {
  itemsLoading.value = true;
  itemError.value = '';
  try {
    const resp = await getHelpDocPage(textItemQuery.value);
    if (resp?.result) {
      textItems.value = resp.data;
      textItemQuery.value.total = resp.total;
      if (!resp.data.some(item => item.id === selectedHelpItemId.value)) {
        selectedHelpItemId.value = resp.data[0]?.id;
      }
    } else {
      itemError.value = resp?.err ?? '无法获取帮助词条信息';
      textItems.value = [];
      selectedHelpItemId.value = undefined;
      textItemQuery.value.total = 0;
      ElMessage.error(itemError.value);
    }
  } catch (error) {
    itemError.value =
      error instanceof Error ? `无法获取帮助词条信息：${error.message}` : '无法获取帮助词条信息';
    textItems.value = [];
    selectedHelpItemId.value = undefined;
    textItemQuery.value.total = 0;
    ElMessage.error(itemError.value);
  } finally {
    itemsLoading.value = false;
  }
};

const reloadLoading = ref<boolean>(false);
const reload = async () => {
  reloadLoading.value = true;
  try {
    const resp = await reloadHelpDoc();
    if (resp?.result) {
      ElMessage.success('重载帮助文件成功');
      needReload.value = false;
      await refreshFileTree();
      await refreshTextItems();
      await refreshConfig();
    } else {
      ElMessage.error(resp.err ?? '重载帮助文件失败');
    }
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? `重载帮助文件失败：${error.message}` : '重载帮助文件失败',
    );
  } finally {
    reloadLoading.value = false;
  }
};

const configDialogVisible = ref<boolean>(false);
const configNeedSave = ref<boolean>(false);
const helpAliases = ref<Map<string, string[]>>(new Map());

const refreshConfig = async () => {
  const config = await getHelpDocConfig();
  helpAliases.value = new Map(Object.entries(config.aliases));
  configNeedSave.value = false;
};

const configDialogClose = () => {
  configDialogVisible.value = false;
};

const addAlias = (groupKey: string, alias: string) => {
  // 别名不能重复
  for (const aliases of helpAliases.value.values()) {
    if (aliases.includes(alias)) {
      ElMessage.error('别名 ' + alias + ' 已被使用');
      return;
    }
  }
  if (helpAliases.value.has(groupKey)) {
    helpAliases.value?.get?.(groupKey)?.push(alias);
  } else {
    helpAliases.value.set(groupKey, [alias]);
  }
  configNeedSave.value = true;
};

const removeAlias = (groupKey: string, alias: string) => {
  if (helpAliases.value.has(groupKey)) {
    const lst = helpAliases.value.get(groupKey) ?? [];
    helpAliases.value.set(groupKey, [...lst.filter(v => v !== alias)]);
    configNeedSave.value = true;
  }
};

const summitConfig = async () => {
  if (helpAliases.value) {
    const res = await postHelpDocConfig({
      aliases: Object.fromEntries(helpAliases.value),
    });
    if (res.result) {
      ElMessage.success('保存设置成功');
      configDialogClose();
      nextTick(async () => {
        await refreshConfig();
      });
    } else {
      ElMessage.error('保存设置失败！' + res.err);
    }
  }
};

onBeforeMount(async () => {
  await refreshFileTree();
  await refreshTextItems();
  await refreshConfig();
});
</script>

<style scoped>
.help-workspace {
  gap: 16px;
}

.workspace-header {
  align-items: flex-start;
  gap: 16px;
}

.help-header-actions,
.help-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-header-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.help-mode-switch {
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--seal-border-color);
  border-radius: 6px;
  background: var(--seal-surface-soft);
}

.help-mode-switch button {
  min-height: 34px;
  padding: 5px 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--seal-text-secondary);
  cursor: pointer;
}

.help-mode-switch button[aria-pressed='true'] {
  background: var(--seal-surface-bg);
  color: var(--seal-text-color);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--seal-text-color) 12%, transparent);
}

.help-mode-switch button:focus-visible,
.help-categories button:focus-visible,
.help-item:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.help-notices,
.help-config-notice {
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-notices {
  flex-direction: column;
  align-items: stretch;
}

.help-config-notice :deep(.el-alert) {
  flex: 1;
}

.help-entry-workspace {
  display: grid;
  grid-template-columns: minmax(155px, 190px) minmax(280px, 340px) minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--seal-border-color-light);
  border-radius: 6px;
  background: var(--seal-panel-bg);
}

.help-categories,
.help-entry-list {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.help-categories {
  padding: 12px 8px;
  border-inline-end: 1px solid var(--seal-border-color-light);
  background: var(--seal-surface-soft);
}

.help-section-label {
  padding: 4px 10px 10px;
  color: var(--seal-text-secondary);
  font-size: 12px;
}

.help-categories button {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--seal-text-regular);
  cursor: pointer;
  text-align: start;
}

.help-categories button:hover,
.help-item:hover {
  background: var(--seal-surface-muted);
}

.help-categories button.active,
.help-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.help-entry-list {
  display: flex;
  flex-direction: column;
  border-inline-end: 1px solid var(--seal-border-color-light);
}

.help-search {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--seal-border-color-light);
}

.help-search-secondary {
  display: grid;
  grid-template-columns: minmax(64px, 0.5fr) minmax(90px, 1fr) auto;
  gap: 6px;
  align-items: center;
}

.help-mobile-category {
  display: none;
}

.help-results {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.help-results-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.help-results > .help-empty {
  position: absolute;
  inset: 0;
}

.help-item {
  display: block;
  width: 100%;
  min-height: 68px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--seal-border-color-light);
  background: transparent;
  color: var(--seal-text-color);
  cursor: pointer;
  text-align: start;
}

.help-item-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.help-item-title {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.help-item-id,
.help-item-source {
  color: var(--seal-text-secondary);
  font-size: 12px;
}

.help-item-id {
  flex-shrink: 0;
}

.help-item-summary {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  color: var(--seal-text-regular);
  font-size: 13px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.help-item-source {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.help-inline-error {
  flex-shrink: 0;
}

.help-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  padding: 20px;
  color: var(--seal-text-secondary);
  text-align: center;
}

.help-pagination {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 48px;
  padding: 4px 10px;
  border-top: 1px solid var(--seal-border-color-light);
  color: var(--seal-text-secondary);
  font-size: 12px;
}

.help-pagination :deep(.el-pagination) {
  min-width: 0;
}

.help-reader {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 24px clamp(16px, 3vw, 40px);
}

.help-reading-content {
  max-width: 76ch;
  margin-inline: auto;
}

.help-reader-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 76ch;
  margin: 0 auto 20px;
  color: var(--seal-text-secondary);
  font-size: 13px;
}

.help-reader-back {
  display: none;
}

.help-reading-content h2 {
  margin: 0 0 16px;
  color: var(--seal-text-color);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.help-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 0 0 20px;
  padding: 12px 0;
  border-block: 1px solid var(--seal-border-color-light);
}

.help-metadata > div {
  display: flex;
  min-width: 0;
  gap: 6px;
  font-size: 13px;
}

.help-metadata dt {
  flex-shrink: 0;
  color: var(--seal-text-secondary);
}

.help-metadata dd {
  min-width: 0;
  margin: 0;
  color: var(--seal-text-color);
  overflow-wrap: anywhere;
}

.help-content {
  margin: 0;
  color: var(--seal-text-color);
  font-family: inherit;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  tab-size: 2;
}

.help-reader-empty {
  height: 100%;
}

.help-file-workspace {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.help-file-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
}

.help-file-toolbar h2 {
  margin: 0;
  color: var(--seal-text-color);
  font-size: 16px;
  font-weight: 600;
}

.help-file-toolbar p {
  margin: 4px 0 0;
  color: var(--seal-text-secondary);
  font-size: 13px;
}

.help-file-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.help-file-tree {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.file-tree-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(100px, 180px);
  gap: 12px;
  flex-shrink: 0;
  padding: 8px 16px 8px 40px;
  border-bottom: 1px solid var(--seal-border-color-light);
  color: var(--seal-text-secondary);
  font-size: 12px;
}

.file-tree-heading span:last-child {
  text-align: end;
}

.help-file-tree :deep(.file-tree) {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--seal-surface-soft);
}

.help-file-tree :deep(.el-tree-node__content) {
  height: auto;
  min-height: var(--workspace-row-height, 40px);
  padding-block: 5px;
}

.help-file-tree :deep(.el-tree-node__content:hover) {
  background: var(--seal-surface-muted);
}

.file-line {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.file-info {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--seal-text-color);
}

.file-info > span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}

.file-tag {
  flex-shrink: 0;
}

.del-line {
  text-decoration: line-through;
}

@media (max-width: 1099px) {
  .help-entry-workspace {
    grid-template-columns: minmax(260px, 40%) minmax(0, 1fr);
  }

  .help-categories {
    display: none;
  }

  .help-mobile-category {
    display: block;
  }
}

@media (max-width: 767px) {
  .workspace-header {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .help-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .help-mode-switch button,
  .help-header-actions > :deep(.el-button),
  .help-file-actions > :deep(.el-button) {
    min-height: 44px;
  }

  .help-entry-workspace {
    display: flex;
  }

  .help-entry-list,
  .help-reader {
    width: 100%;
    flex: 1;
    min-width: 0;
    min-height: 0;
    border-inline-end: 0;
  }

  .help-entry-list.mobile-hidden,
  .help-reader.mobile-hidden {
    display: none;
  }

  .help-search {
    padding: 10px;
  }

  .help-search-secondary {
    grid-template-columns: minmax(64px, 0.55fr) minmax(0, 1fr) auto;
  }

  .help-search :deep(.el-input__wrapper),
  .help-search :deep(.el-select__wrapper) {
    min-height: 44px;
  }
  .help-search :deep(.el-input__inner) {
    font-size: 16px;
  }
  .help-search-secondary :deep(.el-button) {
    min-height: 44px;
  }
  .help-pagination :deep(.el-pager) {
    display: none;
  }
  .help-pagination :deep(.btn-prev),
  .help-pagination :deep(.btn-next) {
    min-width: 44px;
    min-height: 44px;
  }
  .help-file-tree :deep(.el-tree-node__content) {
    min-height: 44px;
  }

  .help-item {
    min-height: 76px;
    padding: 12px;
  }

  .help-reader {
    padding: 12px 16px 20px;
  }

  .help-reader-toolbar {
    margin-bottom: 16px;
  }

  .help-reader-back {
    display: inline-flex;
    min-height: 44px;
  }

  .help-reading-content h2 {
    font-size: 20px;
  }

  .help-content {
    font-size: 16px;
  }

  .help-file-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .help-file-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .file-tree-heading {
    grid-template-columns: minmax(0, 1fr) minmax(82px, auto);
    gap: 6px;
    padding-inline: 36px 8px;
  }

  .file-line {
    gap: 6px;
  }
}
</style>
