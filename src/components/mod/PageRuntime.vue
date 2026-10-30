<template>
  <section
    class="workspace-page runtime-page"
    :aria-busy="loading"
    aria-labelledby="runtime-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="runtime-workspace-title" class="workspace-title">JS 运行时</h1>
        <p class="workspace-subtitle">管理执行 JS 扩展的运行时，以及各类脚本使用哪个运行时。</p>
      </div>
      <div class="workspace-actions">
        <el-button
          :icon="Refresh"
          :loading="loading"
          :disabled="savingConfig || uploading || Boolean(uninstallingRuntimeID)"
          @click="loadManagement">
          刷新状态
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="managementError"
      type="error"
      :closable="false"
      show-icon
      role="alert"
      :title="managementError" />

    <div class="workspace-body workspace-scroll">
      <el-tabs v-model="activeTab" class="runtime-tabs">
        <el-tab-pane label="运行时与路由" name="overview">
          <el-alert
            v-if="management?.discoveryError"
            class="runtime-discovery-alert"
            type="warning"
            :closable="false"
            show-icon
            title="部分运行时未能发现">
            <details class="runtime-diagnostic">
              <summary>查看发现诊断</summary>
              <pre>{{ management.discoveryError }}</pre>
            </details>
          </el-alert>

          <div v-if="management" class="runtime-overview">
            <section class="runtime-catalog" aria-labelledby="runtime-status-heading">
              <div class="runtime-section-heading">
                <h2 id="runtime-status-heading">运行时</h2>
                <span class="runtime-muted">
                  {{ management.runtimes.filter(item => item.loaded).length }} 已加载 /
                  {{ management.runtimes.length }} 已发现
                </span>
              </div>
              <el-alert
                v-if="uninstallError"
                type="error"
                :closable="false"
                show-icon
                role="alert"
                :title="uninstallError" />

              <div v-if="management.runtimes.length" class="runtime-card-list">
                <article
                  v-for="runtime in management.runtimes"
                  :key="runtime.id"
                  class="runtime-card"
                  :aria-labelledby="`runtime-title-${runtime.id}`">
                  <div class="runtime-card-heading">
                    <div class="runtime-identity">
                      <h3 :id="`runtime-title-${runtime.id}`">{{ runtime.id }}</h3>
                      <span class="runtime-muted">
                        {{
                          runtime.builtin
                            ? '内置运行时'
                            : runtime.managed
                              ? '托管运行时'
                              : '外部运行时'
                        }}
                        <template v-if="runtime.author"> · {{ runtime.author }}</template>
                      </span>
                    </div>
                    <span
                      class="runtime-status"
                      :class="{
                        'is-loaded': runtime.loaded,
                        'is-error': !runtime.loaded && runtime.error,
                      }">
                      <i aria-hidden="true" />
                      {{ runtime.loaded ? '已加载' : runtime.error ? '异常' : '未加载' }}
                    </span>
                  </div>

                  <dl class="runtime-card-facts">
                    <div>
                      <dt>版本</dt>
                      <dd>{{ runtime.version || '未提供' }}</dd>
                    </div>
                    <div>
                      <dt>支持文件</dt>
                      <dd>{{ runtime.extensions.join(' / ') || '未声明' }}</dd>
                    </div>
                  </dl>
                  <div class="runtime-card-context">
                    <el-tag
                      v-if="serverDefaultRuntime === runtime.id"
                      type="info"
                      effect="plain"
                      size="small">
                      全局默认
                    </el-tag>
                    <span v-if="!runtime.installed" class="runtime-muted">当前不可用于路由</span>
                  </div>
                  <el-alert
                    v-if="runtime.error"
                    type="error"
                    :closable="false"
                    show-icon
                    :title="runtime.error" />

                  <details class="runtime-technical">
                    <summary>技术信息</summary>
                    <dl class="runtime-details">
                      <div>
                        <dt>ABI</dt>
                        <dd>{{ runtime.abi || '未提供' }}</dd>
                      </div>
                      <div>
                        <dt>能力</dt>
                        <dd>{{ runtime.capabilities.join(', ') || '未声明' }}</dd>
                      </div>
                      <div v-if="runtime.path">
                        <dt>库路径</dt>
                        <dd>
                          <code>{{ runtime.path }}</code>
                        </dd>
                      </div>
                    </dl>
                  </details>
                  <div v-if="runtime.managed" class="runtime-uninstall">
                    <el-button
                      type="danger"
                      plain
                      :loading="uninstallingRuntimeID === runtime.id"
                      :disabled="
                        loading ||
                        Boolean(uninstallingRuntimeID) ||
                        Boolean(uninstallDisabledReason(runtime))
                      "
                      @click="scheduleRuntimeUninstall(runtime)">
                      安排卸载
                    </el-button>
                    <p v-if="uninstallDisabledReason(runtime)" class="runtime-muted">
                      {{ uninstallDisabledReason(runtime) }}
                    </p>
                  </div>
                </article>
              </div>
              <div v-else class="runtime-state">
                <strong>尚未发现运行时</strong>
                <p class="runtime-muted">检查运行时目录，或上传兼容归档。</p>
                <el-button @click="activeTab = 'install'">上传运行时</el-button>
              </div>
            </section>

            <section class="runtime-routing" aria-labelledby="runtime-routing-heading">
              <div class="runtime-section-heading">
                <h2 id="runtime-routing-heading">路由配置</h2>
                <span v-if="configDirty" class="runtime-unsaved" role="status">未保存</span>
              </div>
              <div class="runtime-card runtime-route-card">
                <el-alert
                  v-if="configError"
                  type="error"
                  :closable="false"
                  show-icon
                  role="alert"
                  :title="configError" />
                <div class="runtime-field">
                  <label for="runtime-global-default">全局默认运行时</label>
                  <el-select
                    id="runtime-global-default"
                    v-model="draftDefaultRuntime"
                    aria-label="全局默认运行时"
                    :disabled="loading || savingConfig || !installedRuntimes.length"
                    @change="configError = ''">
                    <el-option
                      v-if="
                        draftDefaultRuntime &&
                        !installedRuntimes.some(item => item.id === draftDefaultRuntime)
                      "
                      :label="`${draftDefaultRuntime}（当前不可用）`"
                      :value="draftDefaultRuntime"
                      disabled />
                    <el-option
                      v-for="runtime in installedRuntimes"
                      :key="runtime.id"
                      :label="runtime.id"
                      :value="runtime.id" />
                  </el-select>
                  <p v-if="!installedRuntimes.length" class="runtime-muted">
                    没有可用运行时，请检查发现诊断或上传兼容归档。
                  </p>
                </div>

                <div class="runtime-extension-routes">
                  <h3>扩展包路由</h3>
                  <el-alert
                    v-if="packageError"
                    type="warning"
                    :closable="false"
                    show-icon
                    :title="packageError" />
                  <div v-if="extensionPackages.length" class="runtime-route-list">
                    <div
                      v-for="(extension, index) in extensionPackages"
                      :key="extension.manifest.package.id"
                      class="runtime-field runtime-route-row">
                      <div class="runtime-route-copy">
                        <label :for="`runtime-extension-route-${index}`">
                          {{ extension.manifest.package.name || extension.manifest.package.id }}
                        </label>
                        <span class="runtime-muted runtime-id">{{
                          extension.manifest.package.id
                        }}</span>
                      </div>
                      <el-select
                        :id="`runtime-extension-route-${index}`"
                        :model-value="extensionRouteDraft.get(extension.manifest.package.id) ?? ''"
                        :aria-label="`${extension.manifest.package.name || extension.manifest.package.id} 的运行时`"
                        :disabled="loading || savingConfig || !installedRuntimes.length"
                        @update:model-value="
                          value => setExtensionRoute(extension.manifest.package.id, value)
                        ">
                        <el-option label="使用全局默认" value="" />
                        <el-option
                          v-if="
                            extensionRouteDraft.get(extension.manifest.package.id) &&
                            !installedRuntimes.some(
                              item =>
                                item.id === extensionRouteDraft.get(extension.manifest.package.id),
                            )
                          "
                          :label="`${extensionRouteDraft.get(extension.manifest.package.id)}（当前不可用）`"
                          :value="extensionRouteDraft.get(extension.manifest.package.id) ?? ''"
                          disabled />
                        <el-option
                          v-for="runtime in installedRuntimes"
                          :key="runtime.id"
                          :label="runtime.id"
                          :value="runtime.id" />
                      </el-select>
                    </div>
                  </div>
                  <p v-else-if="!packageError" class="runtime-muted">
                    暂无已安装扩展包，无需单独配置路由。
                  </p>
                </div>

                <details class="runtime-routing-help">
                  <summary>运行时如何选择？</summary>
                  <p class="runtime-muted">
                    脚本的 @runtime 声明优先，其次是扩展包路由、全局默认，最后按文件后缀匹配。
                  </p>
                </details>
                <div v-if="configDirty" class="runtime-save-bar">
                  <span class="runtime-muted">修改尚未生效</span>
                  <div class="runtime-actions">
                    <el-button :disabled="loading || savingConfig" @click="discardRouteDraft">
                      取消修改
                    </el-button>
                    <el-button
                      type="primary"
                      :loading="savingConfig"
                      :disabled="loading || !installedRuntimes.length"
                      @click="saveRuntimeConfig">
                      保存路由
                    </el-button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane name="install">
          <template #label>
            <span class="runtime-tab-label">
              上传与安装
              <span v-if="management?.pendingChanges.length" class="runtime-pending-count">
                {{ management.pendingChanges.length }}
                <span class="sr-only">项待重启变更</span>
              </span>
            </span>
          </template>
          <div v-if="management" class="runtime-install-layout">
            <section aria-labelledby="runtime-install-heading">
              <div class="runtime-section-heading">
                <h2 id="runtime-install-heading">上传运行时</h2>
                <span class="runtime-muted">.tar.gz / .zip · 最大 64 MiB</span>
              </div>
              <div class="runtime-card runtime-upload-card">
                <p class="runtime-muted">
                  选择与当前 Core 平台兼容的 runtime 发布包。暂存成功后，下次启动 Core 时安装。
                </p>
                <label class="runtime-file-picker" :class="{ 'is-disabled': uploading }">
                  <input
                    id="runtime-archive-file"
                    ref="archiveInput"
                    name="runtimeArchive"
                    type="file"
                    accept=".tar.gz,.zip,application/gzip,application/zip"
                    :disabled="uploading"
                    :aria-describedby="uploadError ? 'runtime-upload-error' : undefined"
                    @change="selectRuntimeArchive" />
                  <el-icon aria-hidden="true"><Upload /></el-icon>
                  <strong>{{ archiveFile ? archiveFile.name : '选择运行时归档' }}</strong>
                  <span class="runtime-muted">
                    {{
                      archiveFile
                        ? `${(archiveFile.size / 1024 / 1024).toFixed(1)} MiB · 点击重新选择`
                        : '点击选择 .tar.gz 或 .zip 文件'
                    }}
                  </span>
                </label>
                <el-alert
                  v-if="uploadError"
                  id="runtime-upload-error"
                  type="error"
                  :closable="false"
                  show-icon
                  role="alert"
                  :title="uploadError" />
                <el-progress
                  v-if="uploadProgress !== null"
                  :percentage="uploadProgress"
                  :aria-label="`运行时归档上传进度 ${uploadProgress}%`" />
                <div class="runtime-upload-footer">
                  <p class="runtime-muted">包含原生代码，仅安装来自可信来源的归档。</p>
                  <el-button
                    type="primary"
                    :loading="uploading"
                    :disabled="!archiveFile || loading"
                    @click="uploadRuntimeArchive">
                    暂存安装
                  </el-button>
                </div>
              </div>
            </section>

            <section aria-labelledby="runtime-pending-heading">
              <div class="runtime-section-heading">
                <h2 id="runtime-pending-heading">待重启变更</h2>
                <span class="runtime-muted">{{ management.pendingChanges.length }} 项</span>
              </div>
              <div class="runtime-card runtime-pending-card">
                <p class="runtime-muted">安装和卸载不会影响当前进程，在 Core 下次启动时应用。</p>
                <div v-if="management.pendingChanges.length" class="runtime-pending-list">
                  <article
                    v-for="change in management.pendingChanges"
                    :key="`${change.id}:${change.action}`"
                    class="runtime-pending-item">
                    <el-tag
                      :type="change.action === 'install' ? 'success' : 'warning'"
                      effect="plain"
                      size="small">
                      {{ change.action === 'install' ? '待安装' : '待卸载' }}
                    </el-tag>
                    <div class="runtime-pending-copy">
                      <strong>{{ change.name || change.id }}</strong>
                      <span class="runtime-muted">
                        {{ change.id
                        }}<template v-if="change.version"> · {{ change.version }}</template>
                      </span>
                    </div>
                  </article>
                </div>
                <p v-else class="runtime-pending-empty">暂无待重启变更</p>
              </div>
            </section>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div v-if="loading && !management" class="runtime-state" role="status">
        正在读取运行时信息…
      </div>
      <div v-else-if="!management" class="workspace-panel workspace-empty">
        <strong>无法读取运行时信息</strong>
        <p>请检查与核心的连接或登录状态，然后重试。</p>
        <el-button :icon="Refresh" @click="loadManagement">重试</el-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Refresh, Upload } from '@element-plus/icons-vue';
import { getPackageList, refreshPackageInstallations, type PackageInstance } from '~/api/package';
import {
  getJSRuntimeManagement,
  installJSRuntimeArchive as installArchive,
  setJSRuntimeConfig,
  uninstallJSRuntime,
  type JSRuntimeManagement,
  type JSRuntimeStatus,
} from '~/api/runtime';

const activeTab = ref('overview');
const loading = ref(false);
const management = ref<JSRuntimeManagement | null>(null);
const managementError = ref('');
const packageError = ref('');
const configError = ref('');
const uploadError = ref('');
const uninstallError = ref('');
const extensionPackages = ref<PackageInstance[]>([]);
const serverDefaultRuntime = ref('');
const draftDefaultRuntime = ref('');
const serverExtensionRoutes = ref<Record<string, string>>({});
const extensionRouteDraft = reactive(new Map<string, string>());
const savingConfig = ref(false);
const archiveFile = ref<File | null>(null);
const archiveInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const uploadProgress = ref<number | null>(null);
const uninstallingRuntimeID = ref('');

const installedRuntimes = computed(() =>
  (management.value?.runtimes ?? []).filter(runtime => runtime.installed),
);

const configDirty = computed(() => {
  if (!management.value) {
    return false;
  }
  if (draftDefaultRuntime.value !== serverDefaultRuntime.value) {
    return true;
  }
  const ids = new Set([...Object.keys(serverExtensionRoutes.value), ...extensionRouteDraft.keys()]);
  for (const id of ids) {
    const saved = Object.prototype.hasOwnProperty.call(serverExtensionRoutes.value, id)
      ? serverExtensionRoutes.value[id]
      : '';
    if (saved !== (extensionRouteDraft.get(id) ?? '')) {
      return true;
    }
  }
  return false;
});

function requestStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

function requestFailureMessage(error: unknown, operation: string): string {
  const status = requestStatus(error);
  if (status === 401 || status === 403) {
    return '当前登录状态无权执行此操作。请使用管理员身份重新登录。';
  }
  if (status === 404 || status === 405) {
    return '当前 Core 版本不支持此运行时管理接口。请升级 Core 后重试。';
  }
  if (status === 400) {
    return `${operation}未通过校验。请检查运行时选择或归档格式后重试。`;
  }
  if (status === 409) {
    return '运行时存在待处理变更或仍被路由使用。检查路由与待处理列表后再试。';
  }
  if (status === 413) {
    return '运行时归档超过 64 MiB 压缩大小限制。选择较小的归档后重试。';
  }
  if (status === 503) {
    return 'Core 暂时无法处理此请求。检查 Core 状态后刷新重试。';
  }
  return `${operation}失败。请检查 Core 连接后刷新重试。`;
}

function resetRouteDraft(routes: Record<string, string>) {
  extensionRouteDraft.clear();
  for (const [id, runtimeID] of Object.entries(routes)) {
    extensionRouteDraft.set(id, runtimeID);
  }
  for (const extension of extensionPackages.value) {
    const id = extension.manifest.package.id;
    if (!extensionRouteDraft.has(id)) {
      extensionRouteDraft.set(id, '');
    }
  }
}

function discardRouteDraft() {
  draftDefaultRuntime.value = serverDefaultRuntime.value;
  resetRouteDraft(serverExtensionRoutes.value);
  configError.value = '';
}

async function loadManagement() {
  const preserveDraft = configDirty.value;
  loading.value = true;
  managementError.value = '';
  const [managementResult, packageResult] = await Promise.allSettled([
    getJSRuntimeManagement(),
    (async () => {
      const refresh = await refreshPackageInstallations();
      if (!refresh.result) {
        throw new Error('package refresh failed');
      }
      const response = await getPackageList();
      if (!response.result || !response.data) {
        throw new Error('package list unavailable');
      }
      return response.data;
    })(),
  ]);

  if (managementResult.status === 'fulfilled') {
    const data = managementResult.value;
    management.value = data;
    serverDefaultRuntime.value = data.defaultRuntime;
    serverExtensionRoutes.value = Object.fromEntries(Object.entries(data.extensionRoutes ?? {}));
    if (!preserveDraft) {
      draftDefaultRuntime.value = data.defaultRuntime;
      resetRouteDraft(serverExtensionRoutes.value);
    }
  } else {
    managementError.value = requestFailureMessage(managementResult.reason, '读取运行时状态');
  }

  if (packageResult.status === 'fulfilled') {
    extensionPackages.value = packageResult.value;
    packageError.value = '';
    if (!preserveDraft) {
      for (const extension of extensionPackages.value) {
        const id = extension.manifest.package.id;
        if (!extensionRouteDraft.has(id)) {
          extensionRouteDraft.set(id, '');
        }
      }
    }
  } else {
    packageError.value = requestFailureMessage(packageResult.reason, '读取扩展包列表');
  }
  loading.value = false;
}

function setExtensionRoute(id: string, value: unknown) {
  extensionRouteDraft.set(id, typeof value === 'string' ? value : '');
  configError.value = '';
}

function buildExtensionRoutes(): Record<string, string> {
  const routes = new Map(Object.entries(serverExtensionRoutes.value));
  for (const extension of extensionPackages.value) {
    const id = extension.manifest.package.id;
    const runtimeID = extensionRouteDraft.get(id) ?? '';
    if (runtimeID) {
      routes.set(id, runtimeID);
    } else {
      routes.delete(id);
    }
  }
  return Object.fromEntries(routes);
}

async function saveRuntimeConfig() {
  if (!management.value || !draftDefaultRuntime.value) {
    configError.value = '选择一个已安装的全局默认运行时后再保存。';
    return;
  }
  savingConfig.value = true;
  configError.value = '';
  const payload = {
    defaultRuntime: draftDefaultRuntime.value,
    extensionRoutes: buildExtensionRoutes(),
  };
  try {
    const response = await setJSRuntimeConfig(payload);
    if (!response.result) {
      configError.value = 'Core 未保存路由配置。检查所选运行时是否仍可用，然后重试。';
      return;
    }
    serverDefaultRuntime.value = payload.defaultRuntime;
    serverExtensionRoutes.value = payload.extensionRoutes;
    management.value = {
      ...management.value,
      defaultRuntime: payload.defaultRuntime,
      extensionRoutes: payload.extensionRoutes,
    };
    resetRouteDraft(payload.extensionRoutes);
    ElMessage.success('运行时路由已保存。');
  } catch (error) {
    configError.value = requestFailureMessage(error, '保存运行时路由');
  } finally {
    savingConfig.value = false;
  }
}

function selectRuntimeArchive(event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  archiveFile.value = input.files?.item(0) ?? null;
  uploadError.value = '';
  uploadProgress.value = null;
}

async function uploadRuntimeArchive() {
  const file = archiveFile.value;
  if (!file) {
    uploadError.value = '先选择 .tar.gz 或 .zip 运行时归档。';
    return;
  }
  if (!file.name.toLowerCase().endsWith('.tar.gz') && !file.name.toLowerCase().endsWith('.zip')) {
    uploadError.value = '选择扩展名为 .tar.gz 或 .zip 的运行时归档。';
    return;
  }
  if (file.size > 64 * 1024 * 1024) {
    uploadError.value = '运行时归档超过 64 MiB 压缩大小限制。选择较小的归档后重试。';
    return;
  }
  uploading.value = true;
  uploadError.value = '';
  uploadProgress.value = 0;
  try {
    const response = await installArchive(file, event => {
      if (event.total && event.total > 0) {
        uploadProgress.value = Math.min(100, Math.round((event.loaded / event.total) * 100));
      }
    });
    if (!response.result) {
      uploadError.value = 'Core 未能暂存此归档。检查文件格式、平台兼容性与大小后重试。';
      return;
    }
    archiveFile.value = null;
    if (archiveInput.value) {
      archiveInput.value.value = '';
    }
    uploadProgress.value = 100;
    ElMessage.success('运行时安装已暂存；Core 重启后生效。');
    await loadManagement();
  } catch (error) {
    uploadError.value = requestFailureMessage(error, '暂存运行时安装');
  } finally {
    uploading.value = false;
  }
}

function uninstallDisabledReason(runtime: JSRuntimeStatus): string {
  const pending = management.value?.pendingChanges.find(change => change.id === runtime.id);
  if (pending) {
    return pending.action === 'install' ? '此运行时已有待安装变更。' : '此运行时已有待卸载变更。';
  }
  if (serverDefaultRuntime.value === runtime.id) {
    return '先保存新的全局默认运行时，再安排卸载。';
  }
  if (Object.values(serverExtensionRoutes.value).includes(runtime.id)) {
    return '先移除引用此运行时的扩展包路由，再安排卸载。';
  }
  return '';
}

async function scheduleRuntimeUninstall(runtime: JSRuntimeStatus) {
  const title = runtime.id;
  try {
    await ElMessageBox.confirm(
      `Core 会在下次启动时从此 Dice 的托管运行时目录中移除「${title}」。当前进程仍会使用已加载的 native code；提交后无法从此页面取消。`,
      `安排卸载运行时「${title}」`,
      {
        confirmButtonText: '安排卸载',
        cancelButtonText: '取消',
        type: 'warning',
        autofocus: false,
      },
    );
  } catch {
    return;
  }

  uninstallingRuntimeID.value = runtime.id;
  uninstallError.value = '';
  try {
    const response = await uninstallJSRuntime(runtime.id);
    if (!response.result) {
      uninstallError.value = 'Core 未能安排卸载。检查运行时路由和待处理变更后重试。';
      return;
    }
    ElMessage.success('运行时卸载已安排；Core 重启后执行。');
    await loadManagement();
  } catch (error) {
    uninstallError.value = requestFailureMessage(error, '安排运行时卸载');
  } finally {
    uninstallingRuntimeID.value = '';
  }
}

onMounted(loadManagement);
</script>

<style scoped src="./runtime.css"></style>
