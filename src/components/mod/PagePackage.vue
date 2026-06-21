<template>
  <header class="page-header">
    <el-space wrap>
      <el-text size="large" tag="strong">扩展商店</el-text>
      <el-tag type="info">包管理</el-tag>
    </el-space>
    <el-space wrap>
      <el-dropdown @command="handleReloadContentCommand">
        <el-button :icon="Refresh" :loading="reloadAllLoading"> 重载内容 </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="all">全部内容</el-dropdown-item>
            <el-dropdown-item command="scripts">JS 扩展</el-dropdown-item>
            <el-dropdown-item command="decks">牌堆</el-dropdown-item>
            <el-dropdown-item command="reply">自定义回复</el-dropdown-item>
            <el-dropdown-item command="helpdoc">帮助文档</el-dropdown-item>
            <el-dropdown-item command="templates">模板</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadPackageData">
        刷新
      </el-button>
    </el-space>
  </header>

  <el-alert
    v-if="unsupportedText"
    class="package-alert"
    type="warning"
    :closable="false"
    show-icon
    :title="unsupportedText" />

  <el-tabs v-model="activeTab" stretch>
    <el-tab-pane label="已安装" name="installed">
      <main v-loading="installedLoading" class="package-panel">
        <el-alert
          v-if="installedError"
          class="package-alert"
          type="error"
          :closable="false"
          show-icon
          :title="installedError" />

        <el-empty
          v-else-if="installedPackages.length === 0 && !installedLoading"
          description="暂无已安装扩展包，或当前后端暂不支持包管理接口。" />

        <el-row v-else :gutter="16">
          <el-col v-for="item in installedPackages" :key="packageId(item)" :xs="24" :md="12">
            <el-card class="package-card" shadow="hover">
              <template #header>
                <el-space wrap>
                  <el-icon><Box /></el-icon>
                  <el-text tag="strong">{{ item.manifest.package.name }}</el-text>
                  <el-tag size="small">{{ item.manifest.package.version }}</el-tag>
                  <el-tag :type="packageStateType(item.state)" size="small">
                    {{ packageStateText(item.state) }}
                  </el-tag>
                </el-space>
              </template>
              <el-text class="package-description" tag="p">
                {{ item.manifest.package.description || '暂无简介' }}
              </el-text>
              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="包 ID">
                  {{ item.manifest.package.id }}
                </el-descriptions-item>
                <el-descriptions-item v-if="item.sourceWarning" label="提示">
                  <el-text type="warning">{{ item.sourceWarning }}</el-text>
                </el-descriptions-item>
              </el-descriptions>
              <el-space class="package-actions" wrap>
                <el-button type="primary" size="small" @click="openPackageDetail(item)">
                  详情
                </el-button>
                <el-button
                  v-if="item.state === 'enabled'"
                  type="warning"
                  size="small"
                  :loading="isPackageActionLoading(item)"
                  @click="handleDisablePackage(item)">
                  停用
                </el-button>
                <el-button
                  v-else
                  type="success"
                  size="small"
                  :loading="isPackageActionLoading(item)"
                  :disabled="item.sourceStatus === 'cache_only'"
                  @click="handleEnablePackage(item)">
                  启用
                </el-button>
                <el-button
                  type="primary"
                  size="small"
                  plain
                  :loading="isPackageActionLoading(item)"
                  @click="handleReloadPackage(item)">
                  重载
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  plain
                  :loading="isPackageActionLoading(item)"
                  @click="handleUninstallPackage(item)">
                  卸载
                </el-button>
              </el-space>
            </el-card>
          </el-col>
        </el-row>
      </main>
    </el-tab-pane>

    <el-tab-pane label="商店" name="store">
      <main v-loading="storeLoading" class="package-panel">
        <el-alert
          v-if="storeError"
          class="package-alert"
          type="error"
          :closable="false"
          show-icon
          :title="storeError" />

        <section class="package-section">
          <el-card shadow="never">
            <template #header>
              <el-space wrap>
                <el-icon><Shop /></el-icon>
                <el-text tag="strong">商店后端</el-text>
                <el-tag size="small" type="info">{{ storeBackends.length }} 个</el-tag>
              </el-space>
            </template>

            <el-space class="backend-add-row" wrap>
              <el-input
                v-model="newBackendUrl"
                class="backend-url-input"
                clearable
                placeholder="输入扩展商店后端地址" />
              <el-button type="primary" :loading="backendAddLoading" @click="handleAddBackend">
                添加后端
              </el-button>
              <el-button :loading="storeLoading" @click="loadStorePackages">刷新商店</el-button>
            </el-space>

            <el-empty
              v-if="storeBackends.length === 0 && !storeLoading && !storeError"
              description="暂无可用商店后端，或当前后端暂不支持扩展商店。" />
            <el-table v-else :data="storeBackends" class="package-table" size="small">
              <el-table-column label="名称" min-width="180">
                <template #default="{ row }">
                  <el-space wrap>
                    <el-text>{{ getBackendLabel(row) }}</el-text>
                    <el-tag v-if="isBuiltinBackend(row)" size="small" type="info">内置</el-tag>
                  </el-space>
                </template>
              </el-table-column>
              <el-table-column prop="url" label="地址" min-width="240" show-overflow-tooltip />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-switch
                    :model-value="isBackendEnabled(row)"
                    :loading="backendToggleLoadingMap[getBackendKey(row)] === true"
                    active-text="启用"
                    inactive-text="停用"
                    inline-prompt
                    @change="value => handleToggleBackend(row, value)" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    type="danger"
                    plain
                    :disabled="isBuiltinBackend(row)"
                    :loading="backendRemoveLoadingMap[getBackendKey(row)] === true"
                    @click="handleRemoveBackend(row)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </section>

        <section class="package-section">
          <el-card shadow="never">
            <template #header>
              <el-space wrap>
                <el-icon><Box /></el-icon>
                <el-text tag="strong">扩展包浏览</el-text>
                <el-tag size="small" type="info">
                  {{ storeViewMode === 'recommend' ? '推荐' : '搜索' }}
                </el-tag>
              </el-space>
            </template>

            <el-form class="store-query-form" label-position="top" :model="storeQuery">
              <el-row :gutter="12">
                <el-col :xs="24" :md="8">
                  <el-form-item label="后端">
                    <el-select v-model="storeQuery.backend" clearable placeholder="全部后端">
                      <el-option
                        v-for="backend in enabledStoreBackends"
                        :key="getBackendKey(backend)"
                        :label="getBackendLabel(backend)"
                        :value="getBackendIdentifier(backend)" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="内容类型">
                    <el-select v-model="storeQuery.content" placeholder="全部内容">
                      <el-option label="全部内容" value="all" />
                      <el-option label="JS 扩展" value="scripts" />
                      <el-option label="牌堆" value="decks" />
                      <el-option label="自定义回复" value="reply" />
                      <el-option label="帮助文档" value="helpdoc" />
                      <el-option label="模板" value="templates" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="名称">
                    <el-input v-model="storeQuery.name" clearable placeholder="按名称搜索" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="作者">
                    <el-input v-model="storeQuery.author" clearable placeholder="按作者搜索" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="分类">
                    <el-input v-model="storeQuery.category" clearable placeholder="按分类搜索" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="4">
                  <el-form-item label="排序">
                    <el-select v-model="storeQuery.sortBy">
                      <el-option label="更新时间" value="updateTime" />
                      <el-option label="发布时间" value="releaseTime" />
                      <el-option label="下载量" value="downloadCount" />
                      <el-option label="名称" value="name" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="4">
                  <el-form-item label="方向">
                    <el-select v-model="storeQuery.order">
                      <el-option label="降序" value="desc" />
                      <el-option label="升序" value="asc" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-space wrap>
                <el-button type="primary" :loading="storeLoading" @click="searchStorePackages">
                  搜索
                </el-button>
                <el-button :loading="storeLoading" @click="loadStoreRecommend">推荐</el-button>
              </el-space>
            </el-form>

            <el-empty
              v-if="storePackages.length === 0 && !storeLoading && !storeError"
              description="暂无商店扩展包。" />
            <el-row v-else :gutter="16">
              <el-col v-for="item in storePackages" :key="storePackageKey(item)" :xs="24" :md="12">
                <el-card class="package-card" shadow="hover">
                  <template #header>
                    <el-space wrap>
                      <el-text tag="strong">{{ item.name }}</el-text>
                      <el-tag size="small">{{ item.version }}</el-tag>
                      <el-tag v-if="item.installed" size="small" type="success">已安装</el-tag>
                    </el-space>
                  </template>
                  <el-text class="package-description" tag="p">
                    {{ item.description || '暂无简介' }}
                  </el-text>
                  <el-descriptions :column="1" size="small" border>
                    <el-descriptions-item label="作者">
                      {{ item.authors.join(', ') || '未知' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="内容">
                      {{ item.contents.join(', ') || '未标注' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="更新时间">
                      {{ formatTime(item.download.updateTime) }}
                    </el-descriptions-item>
                  </el-descriptions>
                  <el-space class="package-actions" wrap>
                    <el-button type="primary" size="small" @click="openStoreDetail(item)">
                      详情
                    </el-button>
                    <el-button
                      type="success"
                      size="small"
                      :disabled="item.installed"
                      :loading="storeInstallLoadingMap[storePackageKey(item)] === true"
                      @click="openStoreInstallPreview(item)">
                      {{ item.installed ? '已安装' : '预览安装' }}
                    </el-button>
                  </el-space>
                </el-card>
              </el-col>
            </el-row>
            <div v-if="storeViewMode === 'search'" class="store-pagination">
              <el-pagination
                v-model:current-page="storeQuery.pageNum"
                v-model:page-size="storeQuery.pageSize"
                :page-sizes="[12, 24, 48]"
                layout="sizes, prev, pager, next"
                background
                @current-change="() => searchStorePackages()"
                @size-change="handleStorePageSizeChange" />
            </div>
          </el-card>
        </section>
      </main>
    </el-tab-pane>
  </el-tabs>

  <PackageInstalledDrawer
    v-model="packageDetailVisible"
    :loading="packageDetailLoading"
    :saving="packageConfigSaving"
    :data="currentPackageDetail"
    :config-data="currentPackageConfig"
    :config-schema="currentPackageSchema"
    @save-config="handleSavePackageConfig" />

  <PackageStoreDrawer v-model="storeDetailVisible" :data="currentStorePackage" />

  <el-dialog
    v-model="storeInstallPreviewVisible"
    title="安装商店扩展包"
    width="min(720px, 92vw)"
    destroy-on-close>
    <div v-loading="storeInstallPreviewLoading">
      <el-empty
        v-if="!storeInstallPreviewData"
        description="正在获取安装预览，或当前后端不支持预览。" />
      <template v-else>
        <el-alert
          class="package-alert"
          type="info"
          :closable="false"
          show-icon
          :title="`即将${previewActionText(storeInstallPreviewData)}「${storeInstallPreviewData.manifest.package.name}」`" />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="包 ID">
            {{ storeInstallPreviewData.manifest.package.id }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">
            {{ storeInstallPreviewData.manifest.package.version }}
          </el-descriptions-item>
          <el-descriptions-item label="当前版本">
            {{ installedVersionForPreview(storeInstallPreviewData) }}
          </el-descriptions-item>
          <el-descriptions-item label="文件数量">
            {{ storeInstallPreviewData.fileCount ?? storeInstallPreviewData.files?.length ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="内容统计">
            <pre class="preview-json">{{ previewCountsText(storeInstallPreviewData) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
        <el-checkbox v-model="storeInstallAutoEnable" class="auto-enable-checkbox">
          安装后尝试启用扩展包
        </el-checkbox>
        <pre class="preview-file-list">{{
          (storeInstallPreviewData.files ?? []).join('\n') || '无文件列表'
        }}</pre>
      </template>
    </div>
    <template #footer>
      <el-button @click="storeInstallPreviewVisible = false">取消</el-button>
      <el-button
        type="primary"
        :disabled="!storeInstallPreviewData || storeInstallPreviewLoading"
        :loading="storeInstallConfirmLoading"
        @click="confirmStoreInstall">
        确认安装
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, reactive, ref, watch } from 'vue';
import { Box, Refresh, Shop } from '@element-plus/icons-vue';
import PackageInstalledDrawer from './package/PackageInstalledDrawer.vue';
import PackageStoreDrawer from './package/PackageStoreDrawer.vue';
import { formatTime } from './package/time';
import {
  disablePackage,
  enablePackage,
  getPackageList,
  getPackageConfig,
  getPackageConfigSchema,
  getPackageDetail,
  reloadAllPackages,
  reloadPackage,
  reloadPackageByContent,
  refreshPackageInstallations,
  setPackageConfig,
  uninstallPackage,
  type ContentKind,
  type PackageInstance,
  type PackageState,
  type PackageUploadPreview,
} from '~/api/package';
import {
  addStoreBackend,
  downloadStorePackage,
  getStoreBackendList,
  getStorePage,
  getStoreRecommend,
  previewStorePackageDownload,
  removeStoreBackend,
  setStoreBackendEnabled,
  type StoreBackendRecord,
  type StorePageQuery,
  type StorePackage,
  type StorePackageListPayload,
} from '~/api/store';

const activeTab = ref('installed');
const installedLoading = ref(false);
const storeLoading = ref(false);
const installedError = ref('');
const storeError = ref('');
const installedPackages = ref<PackageInstance[]>([]);
const storeBackends = ref<StoreBackendRecord[]>([]);
const storePackages = ref<StorePackage[]>([]);
const packageActionLoadingMap = ref<Record<string, boolean>>({});
const packageDetailVisible = ref(false);
const packageDetailLoading = ref(false);
const packageConfigSaving = ref(false);
const currentPackageId = ref('');
const currentPackageDetail = ref<PackageInstance | null>(null);
const currentPackageConfig = ref<Record<string, unknown> | null>(null);
const currentPackageSchema = ref<Record<string, unknown> | null>(null);
const reloadAllLoading = ref(false);
const newBackendUrl = ref('');
const backendAddLoading = ref(false);
const backendToggleLoadingMap = ref<Record<string, boolean>>({});
const backendRemoveLoadingMap = ref<Record<string, boolean>>({});
const storeViewMode = ref<'recommend' | 'search'>('recommend');
const storeDetailVisible = ref(false);
const currentStorePackage = ref<StorePackage | null>(null);
const storeInstallPreviewVisible = ref(false);
const storeInstallPreviewLoading = ref(false);
const storeInstallConfirmLoading = ref(false);
const storeInstallAutoEnable = ref(true);
const storeInstallPreviewTarget = ref<StorePackage | null>(null);
const storeInstallPreviewData = ref<PackageUploadPreview | null>(null);
const storeInstallLoadingMap = ref<Record<string, boolean>>({});
const storeQuery = reactive<StorePageQuery>({
  content: 'all',
  sortBy: 'updateTime',
  order: 'desc',
  pageNum: 1,
  pageSize: 12,
});

const loading = computed(() => installedLoading.value || storeLoading.value);
const enabledStoreBackends = computed(() => storeBackends.value.filter(isBackendEnabled));
const unsupportedText = computed(() => {
  if (installedError.value && storeError.value) {
    return '当前后端可能暂不支持扩展包/商店接口，页面将保持可用并显示空状态。';
  }
  return '';
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return '请求失败';
};

const packageId = (item: PackageInstance) => item.manifest.package.id;
const packageName = (item: PackageInstance) => item.manifest.package.name || packageId(item);
const storePackageKey = (item: StorePackage) =>
  `${item.backendID ?? 'default'}:${item.id}:${item.version}`;
const getBackendIdentifier = (backend: StoreBackendRecord) => {
  return backend.backendID || backend.id || backend.url || '';
};
const getBackendKey = (backend: StoreBackendRecord) => getBackendIdentifier(backend) || 'unknown';
const getBackendLabel = (backend: StoreBackendRecord) => {
  return backend.name || backend.id || backend.url || backend.backendID || '未命名后端';
};
const isBuiltinBackend = (backend: StoreBackendRecord) => {
  return backend.builtin === true || backend.official === true || backend.type === 'official';
};
const isBackendEnabled = (backend: StoreBackendRecord) => {
  if (backend.enabled !== undefined) {
    return backend.enabled;
  }
  return backend.disabled !== true;
};

const getBackendActionPayload = (backend: StoreBackendRecord): Partial<StoreBackendRecord> => {
  if (backend.backendID) {
    return { backendID: backend.backendID };
  }
  if (backend.id) {
    return { id: backend.id };
  }
  return { url: backend.url };
};

const contentKindSet = new Set<ContentKind>(['scripts', 'decks', 'reply', 'helpdoc', 'templates']);
const isContentKind = (value: string): value is ContentKind => {
  return contentKindSet.has(value as ContentKind);
};

const getResponseError = (
  response: { err?: string; message?: string } | undefined,
  fallback: string,
) => {
  return response?.err || response?.message || fallback;
};

const unwrapStoreList = (data: StorePackageListPayload | undefined) => {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data;
  }
  return data.list ?? data.items ?? [];
};

const buildStoreQuery = (): StorePageQuery => {
  return {
    backend: storeQuery.backend || undefined,
    content: storeQuery.content === 'all' ? undefined : storeQuery.content,
    author: storeQuery.author || undefined,
    name: storeQuery.name || undefined,
    category: storeQuery.category || undefined,
    sortBy: storeQuery.sortBy || undefined,
    order: storeQuery.order || undefined,
    pageNum: storeQuery.pageNum,
    pageSize: storeQuery.pageSize,
  };
};

const previewActionText = (preview: PackageUploadPreview) => {
  switch (preview.installAction ?? preview.action) {
    case 'upgrade':
      return '升级';
    case 'downgrade':
      return '降级';
    case 'reinstall':
      return '重装';
    default:
      return '安装';
  }
};

const installedVersionForPreview = (preview: PackageUploadPreview) => {
  const id = preview.manifest.package.id;
  const matched = installedPackages.value.find(item => packageId(item) === id);
  return preview.existingVersion || matched?.manifest.package.version || '-';
};

const previewCountsText = (preview: PackageUploadPreview) => {
  const counts = preview.contentCounts ?? preview.counts ?? {};
  return JSON.stringify(counts, null, 2);
};

const setBackendLoading = (
  mapRef: typeof backendToggleLoadingMap,
  key: string,
  loadingValue: boolean,
) => {
  mapRef.value = {
    ...mapRef.value,
    [key]: loadingValue,
  };
};

const setStoreInstallLoading = (key: string, loadingValue: boolean) => {
  storeInstallLoadingMap.value = {
    ...storeInstallLoadingMap.value,
    [key]: loadingValue,
  };
};

const isPackageActionLoading = (item: PackageInstance) => {
  return packageActionLoadingMap.value[packageId(item)] === true;
};

const setPackageActionLoading = (id: string, loadingValue: boolean) => {
  packageActionLoadingMap.value = {
    ...packageActionLoadingMap.value,
    [id]: loadingValue,
  };
};

const packageStateText = (state: PackageState) => {
  switch (state) {
    case 'enabled':
      return '已启用';
    case 'disabled':
      return '已停用';
    case 'error':
      return '异常';
    default:
      return '已安装';
  }
};

const packageStateType = (state: PackageState) => {
  switch (state) {
    case 'enabled':
      return 'success';
    case 'disabled':
      return 'info';
    case 'error':
      return 'danger';
    default:
      return 'primary';
  }
};

const loadInstalledPackages = async () => {
  installedLoading.value = true;
  installedError.value = '';
  try {
    const refresh = await refreshPackageInstallations();
    if (!refresh.result) {
      installedError.value = refresh.err || refresh.message || '刷新扩展包安装状态失败';
      installedPackages.value = [];
      return;
    }

    const response = await getPackageList();
    if (response.result && response.data) {
      installedPackages.value = response.data;
      return;
    }
    installedPackages.value = [];
    installedError.value = response.err || response.message || '获取已安装扩展包失败';
  } catch (error) {
    installedPackages.value = [];
    installedError.value = getErrorMessage(error);
  } finally {
    installedLoading.value = false;
  }
};

const loadStorePackages = async () => {
  storeLoading.value = true;
  storeError.value = '';
  try {
    const [backendResponse, recommendResponse] = await Promise.all([
      getStoreBackendList(),
      getStoreRecommend(),
    ]);

    if (backendResponse.result && backendResponse.data) {
      storeBackends.value = backendResponse.data;
    } else {
      storeBackends.value = [];
      storeError.value = backendResponse.err || backendResponse.message || '获取商店后端失败';
    }

    if (recommendResponse.result && recommendResponse.data) {
      storePackages.value = unwrapStoreList(recommendResponse.data);
      storeViewMode.value = 'recommend';
    } else {
      storePackages.value = [];
      storeError.value ||=
        recommendResponse.err || recommendResponse.message || '获取推荐扩展包失败';
    }
  } catch (error) {
    storeBackends.value = [];
    storePackages.value = [];
    storeError.value = getErrorMessage(error);
  } finally {
    storeLoading.value = false;
  }
};

const loadStoreRecommend = async () => {
  storeLoading.value = true;
  storeError.value = '';
  try {
    const response = await getStoreRecommend({ backend: storeQuery.backend || undefined });
    if (response.result && response.data) {
      storePackages.value = unwrapStoreList(response.data);
      storeViewMode.value = 'recommend';
      return;
    }
    storePackages.value = [];
    storeError.value = getResponseError(response, '获取推荐扩展包失败');
  } catch (error) {
    storePackages.value = [];
    storeError.value = getErrorMessage(error);
  } finally {
    storeLoading.value = false;
  }
};

const searchStorePackages = async () => {
  storeLoading.value = true;
  storeError.value = '';
  try {
    const response = await getStorePage(buildStoreQuery());
    if (response.result && response.data) {
      storePackages.value = unwrapStoreList(response.data);
      storeViewMode.value = 'search';
      return;
    }
    storePackages.value = [];
    storeError.value = getResponseError(response, '搜索商店扩展包失败');
  } catch (error) {
    storePackages.value = [];
    storeError.value = getErrorMessage(error);
  } finally {
    storeLoading.value = false;
  }
};

const handleStorePageSizeChange = async () => {
  storeQuery.pageNum = 1;
  await searchStorePackages();
};

const refreshCurrentStoreView = async () => {
  if (storeViewMode.value === 'search') {
    await searchStorePackages();
    return;
  }
  await loadStoreRecommend();
};

const loadPackageData = async () => {
  await Promise.all([loadInstalledPackages(), loadStorePackages()]);
};

const refreshCurrentPackageDetail = async () => {
  if (!currentPackageId.value) {
    return;
  }
  const matched = installedPackages.value.find(item => packageId(item) === currentPackageId.value);
  if (matched) {
    await openPackageDetail(matched, false);
  }
};

const openPackageDetail = async (item: PackageInstance, showDrawer = true) => {
  const id = packageId(item);
  currentPackageId.value = id;
  currentPackageDetail.value = item;
  currentPackageConfig.value = item.config ?? item.manifest.config ?? {};
  currentPackageSchema.value = {};
  if (showDrawer) {
    packageDetailVisible.value = true;
  }

  packageDetailLoading.value = true;
  try {
    const [detailResponse, configResponse, schemaResponse] = await Promise.all([
      getPackageDetail(id),
      getPackageConfig(id),
      getPackageConfigSchema(id),
    ]);

    if (detailResponse.result && detailResponse.data) {
      currentPackageDetail.value = detailResponse.data;
    } else {
      ElMessage.error(getResponseError(detailResponse, '获取扩展包详情失败'));
    }

    currentPackageConfig.value =
      configResponse.result && configResponse.data
        ? configResponse.data
        : (item.config ?? item.manifest.config ?? {});
    currentPackageSchema.value =
      schemaResponse.result && schemaResponse.data ? schemaResponse.data : {};
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    packageDetailLoading.value = false;
  }
};

const handleSavePackageConfig = async (config: Record<string, unknown>) => {
  if (!currentPackageId.value) {
    return;
  }
  packageConfigSaving.value = true;
  try {
    const response = await setPackageConfig(currentPackageId.value, config);
    if (response.result) {
      ElMessage.success('配置已保存');
      currentPackageConfig.value = config;
      await loadInstalledPackages();
      await refreshCurrentPackageDetail();
    } else {
      ElMessage.error(getResponseError(response, '保存配置失败'));
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    packageConfigSaving.value = false;
  }
};

const runPackageAction = async (
  item: PackageInstance,
  action: () => Promise<{ result: boolean; err?: string; message?: string }>,
  successMessage: string,
  fallbackError: string,
) => {
  const id = packageId(item);
  setPackageActionLoading(id, true);
  try {
    const response = await action();
    if (response.result) {
      ElMessage.success(successMessage);
      await loadInstalledPackages();
      await refreshCurrentPackageDetail();
    } else {
      ElMessage.error(getResponseError(response, fallbackError));
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    setPackageActionLoading(id, false);
  }
};

const handleEnablePackage = async (item: PackageInstance) => {
  if (item.sourceStatus === 'cache_only') {
    ElMessage.warning('该扩展包仅有缓存，无法启用');
    return;
  }
  await runPackageAction(
    item,
    () => enablePackage(packageId(item)),
    '扩展包已启用',
    '启用扩展包失败',
  );
};

const handleDisablePackage = async (item: PackageInstance) => {
  ElMessageBox.confirm(`停用扩展包「${packageName(item)}」，确定吗？`, '停用扩展包', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await runPackageAction(
      item,
      () => disablePackage(packageId(item)),
      '扩展包已停用',
      '停用扩展包失败',
    );
  });
};

const handleReloadPackage = async (item: PackageInstance) => {
  await runPackageAction(
    item,
    () => reloadPackage(packageId(item)),
    '扩展包已重载',
    '重载扩展包失败',
  );
};

const handleUninstallPackage = async (item: PackageInstance) => {
  ElMessageBox.confirm(`卸载扩展包「${packageName(item)}」，确定吗？`, '卸载扩展包', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await runPackageAction(
      item,
      () => uninstallPackage({ id: packageId(item), mode: 'full' }),
      '扩展包已卸载',
      '卸载扩展包失败',
    );
    if (currentPackageId.value === packageId(item)) {
      packageDetailVisible.value = false;
      currentPackageId.value = '';
      currentPackageDetail.value = null;
      currentPackageConfig.value = null;
      currentPackageSchema.value = null;
    }
  });
};

const handleReloadContentCommand = async (command: string) => {
  reloadAllLoading.value = true;
  try {
    const response =
      command === 'all'
        ? await reloadAllPackages()
        : isContentKind(command)
          ? await reloadPackageByContent(command)
          : undefined;
    if (!response) {
      ElMessage.error('未知的重载类型');
      return;
    }
    if (response.result) {
      ElMessage.success(command === 'all' ? '已重载全部扩展包' : '已重载指定内容');
      await loadInstalledPackages();
      await refreshCurrentPackageDetail();
    } else {
      ElMessage.error(getResponseError(response, '重载扩展包失败'));
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    reloadAllLoading.value = false;
  }
};

const handleAddBackend = async () => {
  const url = newBackendUrl.value.trim();
  if (!url) {
    ElMessage.warning('请输入商店后端地址');
    return;
  }
  backendAddLoading.value = true;
  try {
    const response = await addStoreBackend(url);
    if (response.result) {
      ElMessage.success('商店后端已添加');
      newBackendUrl.value = '';
      await loadStorePackages();
    } else {
      ElMessage.error(getResponseError(response, '添加商店后端失败'));
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    backendAddLoading.value = false;
  }
};

const handleToggleBackend = async (
  backend: StoreBackendRecord,
  value: string | number | boolean,
) => {
  const key = getBackendKey(backend);
  const enabled = value === true;
  setBackendLoading(backendToggleLoadingMap, key, true);
  try {
    const response = await setStoreBackendEnabled(getBackendActionPayload(backend), enabled);
    if (response.result) {
      ElMessage.success(enabled ? '商店后端已启用' : '商店后端已停用');
      await loadStorePackages();
    } else {
      ElMessage.error(getResponseError(response, '更新商店后端状态失败'));
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    setBackendLoading(backendToggleLoadingMap, key, false);
  }
};

const handleRemoveBackend = async (backend: StoreBackendRecord) => {
  if (isBuiltinBackend(backend)) {
    ElMessage.warning('内置商店后端不能删除');
    return;
  }
  ElMessageBox.confirm(`删除商店后端「${getBackendLabel(backend)}」，确定吗？`, '删除商店后端', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    const key = getBackendKey(backend);
    setBackendLoading(backendRemoveLoadingMap, key, true);
    try {
      const response = await removeStoreBackend(getBackendActionPayload(backend));
      if (response.result) {
        ElMessage.success('商店后端已删除');
        await loadStorePackages();
      } else {
        ElMessage.error(getResponseError(response, '删除商店后端失败'));
      }
    } catch (error) {
      ElMessage.error(getErrorMessage(error));
    } finally {
      setBackendLoading(backendRemoveLoadingMap, key, false);
    }
  });
};

const openStoreDetail = (item: StorePackage) => {
  currentStorePackage.value = item;
  storeDetailVisible.value = true;
};

const openStoreInstallPreview = async (item: StorePackage) => {
  const key = storePackageKey(item);
  storeInstallPreviewTarget.value = item;
  storeInstallPreviewData.value = null;
  storeInstallAutoEnable.value = true;
  storeInstallPreviewVisible.value = true;
  storeInstallPreviewLoading.value = true;
  setStoreInstallLoading(key, true);
  try {
    const response = await previewStorePackageDownload({ id: item.id, version: item.version });
    if (response.result && response.data) {
      storeInstallPreviewData.value = response.data;
    } else {
      ElMessage.error(getResponseError(response, '获取安装预览失败'));
      storeInstallPreviewVisible.value = false;
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
    storeInstallPreviewVisible.value = false;
  } finally {
    storeInstallPreviewLoading.value = false;
    setStoreInstallLoading(key, false);
  }
};

const confirmStoreInstall = async () => {
  const target = storeInstallPreviewTarget.value;
  if (!target) {
    ElMessage.error('缺少待安装的扩展包');
    return;
  }
  storeInstallConfirmLoading.value = true;
  setStoreInstallLoading(storePackageKey(target), true);
  try {
    const response = await downloadStorePackage({ id: target.id, version: target.version });
    if (!response.result) {
      ElMessage.error(getResponseError(response, '安装商店扩展包失败'));
      return;
    }

    storeInstallPreviewVisible.value = false;
    ElMessage.success('商店扩展包已安装');
    await loadInstalledPackages();

    if (storeInstallAutoEnable.value) {
      const installedId = storeInstallPreviewData.value?.manifest.package.id ?? target.id;
      const installed = installedPackages.value.find(item => packageId(item) === installedId);
      if (installed && installed.sourceStatus !== 'cache_only' && installed.state !== 'enabled') {
        const enableResponse = await enablePackage(installedId);
        if (enableResponse.result) {
          ElMessage.success('扩展包已自动启用');
          await loadInstalledPackages();
        } else {
          ElMessage.warning(getResponseError(enableResponse, '扩展包已安装，但自动启用失败'));
        }
      }
    }

    await refreshCurrentStoreView();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    storeInstallConfirmLoading.value = false;
    setStoreInstallLoading(storePackageKey(target), false);
  }
};

watch(storeInstallPreviewVisible, visible => {
  if (visible || storeInstallPreviewLoading.value) {
    return;
  }
  storeInstallPreviewTarget.value = null;
  storeInstallPreviewData.value = null;
});

onBeforeMount(() => {
  loadPackageData();
});
</script>

<style scoped lang="css">
.package-panel {
  min-height: 16rem;
}

.package-alert {
  margin-bottom: 1rem;
}

.package-section {
  margin-bottom: 1.5rem;
}

.package-card {
  margin-bottom: 1rem;
}

.package-description {
  display: block;
  margin-bottom: 1rem;
  white-space: pre-line;
}

.package-actions {
  margin-top: 1rem;
}

.package-table {
  margin-top: 1rem;
}

.backend-add-row {
  margin-bottom: 1rem;
}

.backend-url-input {
  width: min(30rem, 78vw);
}

.store-query-form {
  margin-bottom: 1rem;
}

.store-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.auto-enable-checkbox {
  margin: 1rem 0;
}

.preview-file-list,
.preview-json {
  max-height: 12rem;
  margin: 0.75rem 0 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
