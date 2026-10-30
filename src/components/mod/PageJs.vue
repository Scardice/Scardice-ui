<template>
  <section class="workspace-page plugin-workspace" aria-labelledby="js-plugin-title">
    <header class="workspace-header plugin-header">
      <div class="plugin-heading">
        <h1 id="js-plugin-title" class="workspace-title">JS 扩展</h1>
        <p class="workspace-subtitle">启用、配置、更新 JS 插件；修改后需重载才会生效。</p>
      </div>
      <div class="workspace-toolbar plugin-global-actions">
        <label class="workspace-toggle">
          <el-switch v-model="jsEnable" aria-label="启用 JS 扩展" />
          <span>启用 JS 扩展</span>
        </label>
        <el-button
          v-show="jsEnable"
          plain
          :icon="Refresh"
          :loading="jsReloading"
          :disabled="jsReloading"
          @click="jsReload">
          重载 JS
        </el-button>
      </div>
    </header>

    <div v-if="needReload" class="plugin-notice plugin-notice-warning" role="status">
      <el-text type="warning" tag="strong">有改动尚未生效，重载 JS 后生效。</el-text>
      <el-button
        v-if="jsEnable"
        type="primary"
        size="small"
        :loading="jsReloading"
        :disabled="jsReloading"
        @click="jsReload">
        立即重载
      </el-button>
    </div>
    <div v-if="jsConfigEdited" class="plugin-notice plugin-notice-danger" role="status">
      <el-text v-if="jsConfigFormatErrKeys.length > 0" type="danger" tag="strong">
        配置内容已修改，但存在格式错误，无法保存！
      </el-text>
      <template v-else>
        <el-text type="danger" tag="strong">配置已修改，请保存。</el-text>
        <el-button
          type="primary"
          size="small"
          :disabled="!jsConfigEdited"
          :loading="saveButtonLoading"
          @click="doJsConfigSave()">
          保存配置
        </el-button>
      </template>
    </div>

    <el-tabs v-model="mode" class="plugin-mode-tabs">
      <el-tab-pane label="插件列表" name="list">
        <header class="plugin-list-toolbar">
          <div class="plugin-search-controls">
            <el-input
              type="search"
              v-model="jsFilter"
              class="plugin-search"
              :prefix-icon="Search"
              clearable
              aria-label="搜索插件名称、版本、介绍或作者"
              placeholder="搜索插件名称、版本、介绍或作者" />
            <div class="plugin-status-filters" role="group" aria-label="按启用状态筛选插件">
              <el-button
                size="small"
                :type="jsStatusFilter === 'all' ? 'primary' : 'default'"
                :aria-pressed="jsStatusFilter === 'all'"
                @click="jsStatusFilter = 'all'">
                全部
              </el-button>
              <el-button
                size="small"
                :type="jsStatusFilter === 'enabled' ? 'primary' : 'default'"
                :aria-pressed="jsStatusFilter === 'enabled'"
                @click="jsStatusFilter = 'enabled'">
                已启用
              </el-button>
              <el-button
                size="small"
                :type="jsStatusFilter === 'disabled' ? 'primary' : 'default'"
                :aria-pressed="jsStatusFilter === 'disabled'"
                @click="jsStatusFilter = 'disabled'">
                已关闭
              </el-button>
            </div>
          </div>
          <div class="plugin-list-actions">
            <span class="plugin-result-count" aria-live="polite">
              {{ filteredJsList.length }} / {{ jsList.length }} 个插件
            </span>
            <el-upload
              action=""
              multiple
              accept="*"
              class="upload"
              :before-upload="beforeUpload"
              :file-list="uploadFileList">
              <el-button type="primary" :icon="Upload">上传插件</el-button>
            </el-upload>
            <el-link
              type="primary"
              :icon="Link"
              href="https://github.com/sealdice/javascript"
              target="_blank"
              rel="noopener noreferrer">
              浏览插件仓库
            </el-link>
          </div>
        </header>

        <main
          class="plugin-list-content"
          v-loading="listLoading"
          aria-label="已安装的 JavaScript 插件">
          <div v-if="listLoadError" class="plugin-empty-state" role="alert">
            <el-icon class="plugin-empty-icon"><WarningFilled /></el-icon>
            <strong>插件列表加载失败</strong>
            <span>请检查连接后重试；已有插件文件不会因此被修改。</span>
            <el-button type="primary" plain @click="refreshList">重新加载</el-button>
          </div>
          <div v-else-if="!listLoading && jsList.length === 0" class="plugin-empty-state">
            <strong>尚未安装 JS 插件</strong>
            <span>上传本地插件，或前往插件仓库获取。</span>
            <div class="plugin-empty-actions">
              <el-upload
                action=""
                multiple
                accept="*"
                class="upload"
                :before-upload="beforeUpload"
                :file-list="uploadFileList">
                <el-button :icon="Upload">上传插件</el-button>
              </el-upload>
              <el-link
                type="primary"
                href="https://github.com/sealdice/javascript"
                target="_blank"
                rel="noopener noreferrer">
                浏览插件仓库
              </el-link>
            </div>
          </div>
          <div v-else-if="!listLoading && filteredJsList.length === 0" class="plugin-empty-state">
            <strong>没有找到匹配的插件</strong>
            <span>试试调整搜索词或状态筛选。</span>
            <el-button
              plain
              @click="
                jsFilter = '';
                jsStatusFilter = 'all';
              ">
              清除筛选
            </el-button>
          </div>
          <div v-else class="plugin-list" role="list">
            <div class="plugin-list-head" aria-hidden="true">
              <span>插件 / 简介</span>
              <span>内存占用（估算）</span>
              <span>最近更新</span>
              <span class="plugin-list-actions-heading">操作</span>
            </div>
            <article
              v-for="plugin in filteredJsList"
              :key="plugin.filename"
              class="plugin-row"
              role="listitem">
              <button
                type="button"
                class="plugin-row-main"
                :aria-label="`查看 ${plugin.name} 详情，${
                  plugin.errText ? '加载错误' : plugin.enable ? '已启用' : '已关闭'
                }`"
                @click="openPluginDetails(plugin)">
                <span class="plugin-row-heading">
                  <span
                    class="plugin-status-indicator"
                    :class="{
                      'is-error': plugin.errText,
                      'is-enabled': !plugin.errText && plugin.enable,
                      'is-disabled': !plugin.errText && !plugin.enable,
                    }">
                    {{ plugin.errText ? '加载错误' : plugin.enable ? '已启用' : '已关闭' }}
                  </span>
                  <strong class="plugin-name">{{ plugin.name }}</strong>
                  <code class="plugin-version">{{ plugin.version || '未定义版本' }}</code>
                  <el-tag v-if="plugin.official" size="small" type="success">官方</el-tag>
                  <el-tag
                    v-if="plugin.filename.toLowerCase().endsWith('.ts')"
                    size="small"
                    type="primary">
                    TypeScript
                  </el-tag>
                  <el-tooltip
                    v-if="plugin.hasDangerousApiUsage"
                    placement="top"
                    :content="formatDangerousApiUsageSummary(plugin)">
                    <el-tag size="small" type="danger">高权限 API</el-tag>
                  </el-tooltip>
                </span>
                <span class="plugin-description">{{ plugin.desc || '暂无介绍' }}</span>
              </button>
              <div class="plugin-row-meta">
                <el-tooltip placement="top" :content="formatMemoryTooltip(plugin.memory)">
                  <span
                    class="plugin-memory"
                    :class="{ 'is-measured': plugin.memory?.status === 'ok' }"
                    tabindex="0"
                    :aria-label="`内存占用 ${formatMemoryValue(plugin.memory)}，${formatMemoryTooltip(plugin.memory)}`">
                    <span class="plugin-memory-label" aria-hidden="true">内存</span>
                    {{ formatMemoryValue(plugin.memory) }}
                  </span>
                </el-tooltip>
                <div class="plugin-update-summary">
                  <span>{{
                    plugin.updateTime ? dayjs.unix(plugin.updateTime).fromNow() : '暂无记录'
                  }}</span>
                  <el-tag v-if="plugin.updateUrls?.length" size="small" type="info">
                    可检查更新
                  </el-tag>
                </div>
              </div>
              <div class="plugin-row-actions">
                <el-switch
                  v-model="plugin.enable"
                  :aria-label="`${plugin.enable ? '禁用' : '启用'}插件 ${plugin.name}`"
                  :disabled="plugin.errText !== ''"
                  style="
                    --el-switch-on-color: var(--el-color-success);
                    --el-switch-off-color: var(--el-color-danger);
                  "
                  @change="changejsScriptStatus(plugin.name, plugin.enable)" />
                <el-button
                  v-if="plugin.updateUrls?.length"
                  class="plugin-update-button"
                  size="small"
                  text
                  :icon="Download"
                  :loading="diffLoading"
                  :disabled="diffLoading"
                  :aria-label="`检查 ${plugin.name} 更新`"
                  @click="requestPluginUpdate(plugin)">
                  更新
                </el-button>
                <el-dropdown
                  trigger="click"
                  popper-class="js-plugin-action-menu"
                  @command="handlePluginAction">
                  <el-button
                    class="plugin-more-button"
                    text
                    :icon="MoreFilled"
                    :aria-label="`${plugin.name} 更多操作`" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'details', filename: plugin.filename }">
                        查看详情
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'config', filename: plugin.filename }">
                        打开插件设置
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="(plugin.builtin && plugin.builtinUpdated) || !plugin.builtin"
                        divided
                        :command="{ action: 'delete', filename: plugin.filename }">
                        {{ plugin.builtin ? '卸载更新' : '删除插件' }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </article>
          </div>
        </main>
        <el-dialog v-model="showDiff" title="插件内容对比" class="diff-dialog">
          <diff-viewer lang="javascript" :old="jsCheck.old" :new="jsCheck.new" />
          <template #footer>
            <el-space wrap>
              <el-button @click="showDiff = false">取消</el-button>
              <el-button
                v-if="!(jsCheck.old === jsCheck.new)"
                type="success"
                :icon="DocumentChecked"
                @click="jsUpdate"
                >确认更新</el-button
              >
            </el-space>
          </template>
        </el-dialog>

        <el-dialog
          v-model="dangerousApiDialogVisible"
          class="dangerous-api-dialog-window"
          width="72rem"
          align-center
          :title="dangerousApiDialogTitle">
          <div v-if="selectedDangerousApiUsage" class="dangerous-api-dialog">
            <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
              <template #title>
                {{ selectedDangerousApiUsage.name }}：
                {{ selectedDangerousApiUsage.risk || '风险说明未提供' }}
              </template>
              <template #default>
                <p v-if="selectedDangerousApiUsage.description">
                  {{ selectedDangerousApiUsage.description }}
                </p>
                <p>
                  这里只能列出源码里直接写出的调用位置和直接成员访问，无法完整追踪经变量别名转手后的所有调用。
                </p>
              </template>
            </el-alert>
            <el-descriptions :column="1" border style="margin-bottom: 16px">
              <el-descriptions-item label="插件">
                {{ selectedDangerousApiScript?.name || '&lt;未知>' }}
              </el-descriptions-item>
              <el-descriptions-item label="危险 API">
                {{ selectedDangerousApiUsage.name }}
              </el-descriptions-item>
              <el-descriptions-item label="检测到的直接成员">
                {{
                  (selectedDangerousApiUsage.referencedMembers ?? []).length > 0
                    ? (selectedDangerousApiUsage.referencedMembers ?? []).join('、')
                    : '未检测到直接成员访问'
                }}
              </el-descriptions-item>
            </el-descriptions>
            <el-table
              :data="selectedDangerousApiUsage.occurrences ?? []"
              border
              max-height="520"
              empty-text="未检测到调用位置">
              <el-table-column label="位置" width="120">
                <template #default="{ row }">
                  <div class="dangerous-api-position">
                    <div>第 {{ row.line }} 行</div>
                    <div>第 {{ row.column }} 列</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="access" label="访问形式" min-width="220" />
              <el-table-column prop="kind" label="类型" width="110">
                <template #default="{ row }">
                  {{ formatDangerousApiOccurrenceKind(row.kind) }}
                </template>
              </el-table-column>
              <el-table-column prop="member" label="成员" min-width="160">
                <template #default="{ row }">{{ row.member || '直接引用' }}</template>
              </el-table-column>
              <el-table-column prop="memberDescription" label="说明" min-width="320">
                <template #default="{ row }">
                  <div class="dangerous-api-description">
                    {{ getDangerousApiOccurrenceDescription(selectedDangerousApiUsage, row) }}
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-dialog>
        <el-drawer
          v-model="pluginDetailsVisible"
          class="js-plugin-detail-drawer"
          direction="rtl"
          size="min(520px, 92vw)"
          :with-header="false"
          :destroy-on-close="false"
          aria-labelledby="plugin-detail-title"
          :title="selectedPlugin ? `${selectedPlugin.name} 插件详情` : '插件详情'">
          <template v-if="selectedPlugin">
            <header class="plugin-drawer-header">
              <div>
                <p class="plugin-drawer-eyebrow">插件详情</p>
                <h2 id="plugin-detail-title">{{ selectedPlugin.name }}</h2>
                <div class="plugin-drawer-version">
                  <code>{{ selectedPlugin.version || '未定义版本' }}</code>
                  <el-tag v-if="selectedPlugin.official" size="small" type="success"> 官方 </el-tag>
                  <el-tag
                    :type="
                      selectedPlugin.errText ? 'danger' : selectedPlugin.enable ? 'success' : 'info'
                    "
                    size="small">
                    {{
                      selectedPlugin.errText
                        ? '加载错误'
                        : selectedPlugin.enable
                          ? '已启用'
                          : '已关闭'
                    }}
                  </el-tag>
                </div>
              </div>
              <el-button
                class="plugin-drawer-close"
                text
                aria-label="关闭插件详情"
                @click="pluginDetailsVisible = false">
                <el-icon><Close /></el-icon>
              </el-button>
            </header>

            <div class="plugin-drawer-content">
              <p class="plugin-drawer-description">
                {{ selectedPlugin.desc || '暂无介绍' }}
              </p>
              <el-alert
                v-if="selectedPlugin.errText"
                class="plugin-error-detail"
                type="error"
                title="插件加载错误"
                :description="selectedPlugin.errText"
                :closable="false"
                show-icon />
              <el-descriptions :column="1" border>
                <el-descriptions-item label="作者">
                  {{ selectedPlugin.author || '未提供' }}
                </el-descriptions-item>
                <el-descriptions-item label="许可协议">
                  {{ selectedPlugin.license || '未提供' }}
                </el-descriptions-item>
                <el-descriptions-item label="主页">
                  <span class="plugin-breakable-value">
                    {{ selectedPlugin.homepage || '未提供' }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="文件">
                  <code class="plugin-breakable-value">{{ selectedPlugin.filename }}</code>
                </el-descriptions-item>
                <el-descriptions-item label="安装时间">
                  {{
                    selectedPlugin.installTime
                      ? dayjs.unix(selectedPlugin.installTime).format('YYYY-MM-DD HH:mm')
                      : '暂无记录'
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{
                    selectedPlugin.updateTime
                      ? dayjs.unix(selectedPlugin.updateTime).format('YYYY-MM-DD HH:mm')
                      : '暂无记录'
                  }}
                </el-descriptions-item>
                <el-descriptions-item v-if="selectedPlugin.grant" label="声明权限">
                  <span class="plugin-breakable-value">{{ selectedPlugin.grant }}</span>
                </el-descriptions-item>
                <el-descriptions-item v-if="selectedPlugin.updateUrls?.length" label="更新来源">
                  <div class="plugin-update-sources">
                    <code v-for="url in selectedPlugin.updateUrls ?? []" :key="url">{{ url }}</code>
                  </div>
                </el-descriptions-item>
              </el-descriptions>

              <section
                v-if="selectedPlugin.memory"
                class="plugin-memory-section"
                aria-labelledby="plugin-memory-title">
                <h3 id="plugin-memory-title">内存占用（估算）</h3>
                <p v-if="selectedPlugin.memory.status !== 'ok'">
                  {{ formatMemoryTooltip(selectedPlugin.memory) }}
                </p>
                <template v-else>
                  <p>
                    统计插件代码创建且仍存活的普通对象、数组与
                    ArrayBuffer，以及它们直接持有的字符串和数字；小对象为采样估计，大对象逐个跟踪。统计于
                    {{ dayjs.unix(selectedPlugin.memory.sweptAt / 1000).fromNow() }}。
                  </p>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="合计">
                      {{ filesize(selectedPlugin.memory.bytes) }} ·
                      {{ formatObjectCount(selectedPlugin.memory.objects) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="普通对象">
                      {{ formatMemoryAmount(selectedPlugin.memory.object) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="数组">
                      {{ formatMemoryAmount(selectedPlugin.memory.array) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="ArrayBuffer">
                      {{ formatMemoryAmount(selectedPlugin.memory.arrayBuffer) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="其中大对象">
                      {{ formatMemoryAmount(selectedPlugin.memory.large) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="小对象采样">
                      {{ selectedPlugin.memory.samples.toLocaleString() }} 个存活样本
                    </el-descriptions-item>
                  </el-descriptions>
                </template>
              </section>

              <section
                v-if="selectedPlugin.hasDangerousApiUsage"
                class="plugin-security-section"
                aria-labelledby="plugin-security-title">
                <h3 id="plugin-security-title">高权限 API 检查</h3>
                <p>检测结果仅覆盖源码中可识别的直接调用；详情会列出位置与成员访问。</p>
                <el-button
                  v-for="usage in selectedPlugin.dangerousApiUsages"
                  :key="`${selectedPlugin.filename}-${usage.id}-detail`"
                  class="dangerous-api-link"
                  type="danger"
                  plain
                  @click="openDangerousApiUsageDialog(selectedPlugin, usage)">
                  {{ usage.name }}
                </el-button>
              </section>
            </div>

            <footer class="plugin-drawer-footer">
              <el-switch
                v-model="selectedPlugin.enable"
                :aria-label="`${selectedPlugin.enable ? '禁用' : '启用'}插件 ${selectedPlugin.name}`"
                :disabled="selectedPlugin.errText !== ''"
                active-text="启用"
                inactive-text="关闭"
                @change="changejsScriptStatus(selectedPlugin.name, selectedPlugin.enable)" />
              <el-button @click="openPluginConfig(selectedPlugin)">插件设置</el-button>
              <el-button
                v-if="selectedPlugin.updateUrls?.length"
                :icon="Download"
                :loading="diffLoading"
                :disabled="diffLoading"
                @click="requestPluginUpdate(selectedPlugin)">
                检查更新
              </el-button>
              <el-dropdown
                trigger="click"
                popper-class="js-plugin-action-menu"
                @command="handlePluginAction">
                <el-button type="primary" :icon="MoreFilled">更多操作</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="
                        (selectedPlugin.builtin && selectedPlugin.builtinUpdated) ||
                        !selectedPlugin.builtin
                      "
                      divided
                      :command="{ action: 'delete', filename: selectedPlugin.filename }">
                      {{ selectedPlugin.builtin ? '卸载更新' : '删除插件' }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </footer>
          </template>
        </el-drawer>
      </el-tab-pane>

      <el-tab-pane label="控制台" name="console">
        <main class="plugin-console">
          <div ref="editorBox" class="plugin-console-editor"></div>
          <div class="plugin-console-actions">
            <el-button type="success" :icon="CaretRight" :disabled="!jsEnable" @click="doExecute">
              执行代码
            </el-button>
            <el-text type="danger" tag="p"> 注意：延迟执行的代码，其输出不会立即出现 </el-text>
          </div>
          <div class="plugin-console-output" aria-live="polite">
            <div v-for="(line, index) in jsLines" :key="index">{{ line }}</div>
          </div>
        </main>
      </el-tab-pane>
      <el-tab-pane label="插件设置" name="config">
        <main class="plugin-config-content" v-loading="configLoading">
          <div v-if="size(jsConfig) === 0" style="display: flex; justify-content: center">
            <el-text size="large" tag="strong">暂无设置项</el-text>
          </div>
          <el-collapse
            v-else
            v-model="expandedConfigPlugins"
            class="js-list-main plugin-config-list"
            style="margin-top: 0.5rem">
            <el-collapse-item
              v-for="(config, i) in jsConfig"
              :key="i"
              :name="(config as unknown as JsPluginConfig).pluginName"
              :data-plugin-name="(config as unknown as JsPluginConfig).pluginName"
              class="js-item">
              <template #title>
                <div class="js-item-header">
                  <el-space>
                    <el-text size="large" tag="strong" style="margin-left: 1rem">{{
                      (config as unknown as JsPluginConfig)['pluginName']
                    }}</el-text>
                  </el-space>
                  <el-space>
                    <template
                      v-if="getDeprecatedKeys(config as unknown as JsPluginConfig).length > 0">
                      <el-tooltip
                        content="移除 - 当前插件存在暂未使用的配置项，<br />点击以移除此插件全部暂未使用的配置项。"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfigs(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              getDeprecatedKeys(config as unknown as JsPluginConfig),
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                  </el-space>
                </div>
              </template>
              <el-card shadow="never" style="border: 0">
                <el-tabs
                  v-if="hasSecondLevelGroupByAny(config)"
                  v-model="jsConfigGroupActive[getPluginNameByAny(config)]"
                  style="margin-bottom: 0.75rem">
                  <el-tab-pane
                    v-for="group in getConfigGroupsByAny(config)"
                    :key="group.key"
                    :label="group.label"
                    :name="group.key" />
                </el-tabs>
                <el-form v-for="c in getDisplayConfigsByAny(config)" :key="c.key">
                  <template #header>
                    <div class="js-item-header">
                      <el-space>
                        <el-text size="large">{{
                          (c as unknown as JsPluginConfigItem).key
                        }}</el-text>
                      </el-space>
                    </div>
                  </template>
                  <el-form-item
                    v-if="(c as unknown as JsPluginConfigItem).type == 'string'"
                    style="width: 100%; margin-bottom: 0.5rem">
                    <el-form-item label="字符串配置项:">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item
                    ><br />
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <div style="width: 100%; margin-bottom: 0.5rem">
                      <el-input
                        v-model="(c as unknown as JsPluginConfigItem).value"
                        type="textarea"
                        @change="
                          doJsConfigChanged(
                            (config as unknown as JsPluginConfig).pluginName,
                            (c as unknown as JsPluginConfigItem).key,
                          )
                        "></el-input>
                    </div>
                    <template
                      v-if="
                        (c as unknown as JsPluginConfigItem).value !==
                        (c as unknown as JsPluginConfigItem).defaultValue
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              false,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                  </el-form-item>
                  <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'int'">
                    <el-form-item label="整数配置项:">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item
                    ><br />
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <el-form-item :span="30">
                      <div style="margin-left: 1rem">
                        <el-input-number
                          v-model="(c as unknown as JsPluginConfigItem).value"
                          type="number"
                          @change="
                            doJsConfigChanged(
                              (config as unknown as JsPluginConfig).pluginName,
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          "></el-input-number>
                      </div>
                    </el-form-item>
                    <template
                      v-if="
                        (c as unknown as JsPluginConfigItem).value !==
                        (c as unknown as JsPluginConfigItem).defaultValue
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              false,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                  </el-form-item>
                  <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'float'">
                    <el-form-item label="浮点数配置项:">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item
                    ><br />
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <el-form-item :span="30">
                      <div style="margin-left: 1rem">
                        <el-input-number
                          v-model="(c as unknown as JsPluginConfigItem).value"
                          type="number"
                          @change="
                            doJsConfigChanged(
                              (config as unknown as JsPluginConfig).pluginName,
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          "></el-input-number>
                      </div>
                    </el-form-item>
                    <template
                      v-if="
                        (c as unknown as JsPluginConfigItem).value !==
                        (c as unknown as JsPluginConfigItem).defaultValue
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              false,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                  </el-form-item>
                  <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'bool'">
                    <el-form-item label="布尔配置项:">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item
                    ><br />
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <el-form-item :span="30">
                      <div style="margin-left: 1rem">
                        <el-switch
                          v-model="(c as unknown as JsPluginConfigItem).value"
                          @change="
                            doJsConfigChanged(
                              (config as unknown as JsPluginConfig).pluginName,
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          "></el-switch>
                      </div>
                    </el-form-item>
                    <template
                      v-if="
                        (c as unknown as JsPluginConfigItem).value !==
                        (c as unknown as JsPluginConfigItem).defaultValue
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              false,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                  </el-form-item>
                  <el-form-item
                    v-if="(c as unknown as JsPluginConfigItem).type == 'template'"
                    style="width: 100%; margin-bottom: 0.5rem">
                    <el-form-item label="模板配置项:" style="width: 100%; margin-bottom: 0.5rem">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item
                    ><br />
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <template
                      v-if="
                        !isEqual(
                          (c as unknown as JsPluginConfigItem).value,
                          (c as unknown as JsPluginConfigItem).defaultValue,
                        )
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              false,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <el-form-item style="width: 100%; margin-bottom: 0.5rem">
                      <div
                        v-for="(d, index) in (c as unknown as JsPluginConfigItem).value"
                        :key="index"
                        style="width: 100%; margin-bottom: 0.5rem">
                        <!-- 这里面是单条修改项 -->
                        <el-row>
                          <el-col style="width: 100%; margin-bottom: 0.5rem">
                            <span style="width: 100%">
                              <el-input
                                v-model="(c as unknown as JsPluginConfigItem).value[index]"
                                type="textarea"
                                :autosize="true"
                                @change="
                                  doJsConfigChanged(
                                    (config as unknown as JsPluginConfig).pluginName,
                                    (c as unknown as JsPluginConfigItem).key,
                                  )
                                "></el-input>
                            </span>
                          </el-col>
                          <el-col :span="5">
                            <div
                              style="
                                display: flex;
                                align-items: center;
                                width: 1.3rem;
                                margin-left: 1rem;
                                margin-top: 0.5rem;
                              ">
                              <el-tooltip
                                :content="index === 0 ? '点击添加一项' : '点击删除你不想要的配置项'"
                                placement="bottom-start">
                                <el-icon>
                                  <circle-plus-filled
                                    v-if="index == 0"
                                    @click="
                                      doJsConfigAddItem(
                                        (c as unknown as JsPluginConfigItem).value,
                                        (config as unknown as JsPluginConfig).pluginName,
                                        (c as unknown as JsPluginConfigItem).key,
                                      )
                                    " />
                                  <circle-close
                                    v-else
                                    @click="
                                      doJsConfigRemoveItemAt(
                                        (c as unknown as JsPluginConfigItem).value,
                                        index as number,
                                        (config as unknown as JsPluginConfig).pluginName,
                                        (c as unknown as JsPluginConfigItem).key,
                                      )
                                    " />
                                </el-icon>
                              </el-tooltip>
                            </div>
                          </el-col>
                        </el-row>
                      </div>
                    </el-form-item>
                  </el-form-item>
                  <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'option'">
                    <el-form-item label="选项配置项:" style="width: 100%; margin-bottom: 0.5rem">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item>
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <template
                      v-if="
                        (c as unknown as JsPluginConfigItem).value !==
                        (c as unknown as JsPluginConfigItem).defaultValue
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              false,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <div style="width: 100%; margin-bottom: 0.5rem">
                      <el-select
                        v-model="(c as unknown as JsPluginConfigItem).value"
                        @change="
                          doJsConfigChanged(
                            (config as unknown as JsPluginConfig).pluginName,
                            (c as unknown as JsPluginConfigItem).key,
                          )
                        ">
                        <el-option
                          v-for="s in (c as unknown as JsPluginConfigItem).option"
                          :key="s"
                          :value="s"
                          >{{ s }}</el-option
                        >
                      </el-select>
                    </div>
                  </el-form-item>
                  <el-form-item
                    v-if="(c as unknown as JsPluginConfigItem).type == 'task:cron'"
                    style="width: 100%; margin-bottom: 0.5rem">
                    <el-form-item label="Cron 型定时任务:">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item
                    ><br />
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <div style="width: 100%; margin-bottom: 0.5rem">
                      <el-input
                        v-model="(c as unknown as JsPluginConfigItem).value"
                        type="textarea"
                        @change="
                          doTaskCronFormatCheck(
                            (config as unknown as JsPluginConfig)['pluginName'],
                            (c as unknown as JsPluginConfigItem).key,
                            (c as unknown as JsPluginConfigItem).value,
                          )
                        "></el-input>
                      <el-text
                        v-if="
                          jsConfigFormatErrKeys.indexOf(
                            (config as unknown as JsPluginConfig)['pluginName'] +
                              '/' +
                              (c as unknown as JsPluginConfigItem).key,
                          ) !== -1
                        "
                        type="danger">
                        格式错误！
                      </el-text>
                    </div>
                    <template
                      v-if="
                        (c as unknown as JsPluginConfigItem).value !==
                        (c as unknown as JsPluginConfigItem).defaultValue
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个定时任务在当前版本中不被使用，<br />但未来版本中仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              true,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                  </el-form-item>
                  <el-form-item
                    v-if="(c as unknown as JsPluginConfigItem).type == 'task:daily'"
                    style="width: 100%; margin-bottom: 0.5rem">
                    <el-form-item label="每日定时任务:">{{
                      (c as unknown as JsPluginConfigItem).key
                    }}</el-form-item
                    ><br />
                    <div style="width: 100%">
                      <el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text>
                    </div>
                    <div style="width: 100%; margin-bottom: 0.5rem">
                      <el-input
                        v-model="(c as unknown as JsPluginConfigItem).value"
                        type="textarea"
                        @change="
                          doTaskDailyFormatCheck(
                            (config as unknown as JsPluginConfig)['pluginName'],
                            (c as unknown as JsPluginConfigItem).key,
                            (c as unknown as JsPluginConfigItem).value,
                          )
                        "></el-input>
                      <el-text
                        v-if="
                          jsConfigFormatErrKeys.indexOf(
                            (config as unknown as JsPluginConfig)['pluginName'] +
                              '/' +
                              (c as unknown as JsPluginConfigItem).key,
                          ) !== -1
                        "
                        type="danger">
                        格式错误！
                      </el-text>
                    </div>
                    <template
                      v-if="
                        (c as unknown as JsPluginConfigItem).value !==
                        (c as unknown as JsPluginConfigItem).defaultValue
                      ">
                      <el-tooltip content="重置为初始值" placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doResetJsConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                            )
                          ">
                          <brush-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                    <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                      <el-tooltip
                        content="移除 - 这个定时任务在当前版本中不被使用，<br />但未来版本中仍可能被使用，请确认无用后删除"
                        raw-content
                        placement="bottom-end">
                        <el-icon
                          style="float: right; margin-left: 1rem"
                          @click="
                            doDeleteUnusedConfig(
                              (config as unknown as JsPluginConfig)['pluginName'],
                              (c as unknown as JsPluginConfigItem).key,
                              true,
                            )
                          ">
                          <delete-filled />
                        </el-icon>
                      </el-tooltip>
                    </template>
                  </el-form-item>
                </el-form>
              </el-card>
            </el-collapse-item>
          </el-collapse>
        </main>
      </el-tab-pane>
    </el-tabs>
    <teleport to="body">
      <el-tooltip v-if="mode === 'list'" content="回到顶部" placement="left">
        <button
          class="js-backtop"
          type="button"
          aria-label="回到插件列表顶部"
          @click="scrollJsListTop">
          <el-icon><ArrowUp /></el-icon>
        </button>
      </el-tooltip>
    </teleport>
  </section>
</template>

<script lang="ts" setup>
import {
  ArrowUp,
  BrushFilled,
  CaretRight,
  CircleClose,
  CirclePlusFilled,
  Close,
  DeleteFilled,
  DocumentChecked,
  Download,
  Link,
  MoreFilled,
  Refresh,
  Search,
  Upload,
  WarningFilled,
} from '@element-plus/icons-vue';
import * as dayjs from 'dayjs';
import { basicSetup, EditorView } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { isEqual, size } from 'lodash-es';
import { filesize } from 'filesize';
import type {
  JsDangerousAPIOccurrence,
  JsDangerousAPIUsage,
  JsMemoryAmount,
  JsMemoryUsage,
  JsPluginConfig,
  JsPluginConfigItem,
  JsScriptInfo,
} from '~/type.d.ts';
import { postUtilsCheckCronExpr } from '~/api/utils';
import {
  checkJsUpdate,
  deleteJs,
  deleteUnusedJsConfigs,
  disableJS,
  enableJS,
  executeJS,
  getJsConfigs,
  getJsList,
  getJsRecord,
  getJsStatus,
  resetJsConfig,
  setJsConfig,
  // setJsConfigs,
  // NOTE(lyjjl): 现在已经不使用全量提交，为了与后端既有端点对应保留对应函数，但是通常不应再调用
  shutDownJS,
  updateJs,
  uploadJs,
} from '~/api/js';
import type { UploadRawFile } from 'element-plus';
import { confirmUploadTargetMatch } from '~/utils/upload-classifier';
import { formatUploadFailureMessage } from '~/utils/upload-error';
import { runJsReloadWithProgress } from '~/utils/js-reload-progress';

const jsEnable = ref(false);
const editorBox = ref(null);
const mode = ref('list');
const needReload = ref(false);
const jsReloading = ref(false);
let editor: EditorView;

const jsLines = ref([] as string[]);

const defaultText = [
  '// 学习制作可以看这里：https://github.com/sealdice/javascript/tree/main/examples',
  '// 下载插件可以看这里：https://github.com/sealdice/javascript/tree/main/scripts',
  '// 使用 TypeScript，编写更容易 https://github.com/sealdice/javascript/tree/main/examples_ts',
  '// 目前可用于：创建自定义指令，自定义 COC 房规，发送网络请求，读写本地数据',
  '',
  "console.log('这是测试控制台');",
  "console.log('可以这样来查看变量详情：');",
  'console.log(Object.keys(seal));',
  "console.log('更多内容正在制作中...')",
  "console.log('注意：测试版！API 仍然可能发生重大变化！')",
  '// 写在这里的所有变量都是临时变量，如果你希望全局变量，使用 globalThis',
  '// 但是注意，全局变量在进程关闭后失效，想保存状态请存入硬盘。',
  'globalThis._test = 123;',
  '',
  "let ext = seal.ext.find('test');",
  'if (!ext) {',
  "  ext = seal.ext.new('test', '木落', '1.0.0');",
  '  seal.ext.register(ext);',
  '}',
];

/** 执行指令 */
const doExecute = async () => {
  jsLines.value = [];
  const txt = editor.state.doc.toString();
  const data = await executeJS(txt);

  // 优先填充 print 输出
  const lines = [] as string[];
  if (data.outputs) {
    lines.push(...data.outputs);
  }
  // 填充 err 或 ret
  if (data.err) {
    lines.push(data.err);
  } else {
    lines.push(data.ret as string);
    try {
      (window as any).lastJSValue = data.ret;
      (globalThis as any).lastJSValue = data.ret;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {}
  }
  jsLines.value = lines;
};

const jsConfigEdited = ref(false);
// key format: `${pluginName}/${key}`。使用 Record 而非 Set 以兼容 Vue 3 响应式追踪
const changedConfigKeys = ref<Record<string, boolean>>({});
const doJsConfigChanged = (pluginName: string, key: string) => {
  jsConfigEdited.value = true;
  changedConfigKeys.value[`${pluginName}/${key}`] = true;
};

const jsConfigFormatErrKeys: Ref<string[]> = ref([]);
const doTaskCronFormatCheck = async (pluginName: string, key: string, expr: string) => {
  const index = jsConfigFormatErrKeys.value.indexOf(pluginName + '/' + key);
  try {
    await postUtilsCheckCronExpr(expr);
    if (index !== -1) {
      jsConfigFormatErrKeys.value.splice(index, 1);
    }
    jsConfigEdited.value = true;
    changedConfigKeys.value[`${pluginName}/${key}`] = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    if (index === -1) {
      jsConfigFormatErrKeys.value.push(pluginName + '/' + key);
    }
    jsConfigEdited.value = true;
  }
};

const doTaskDailyFormatCheck = (pluginName: string, key: string, expr: string) => {
  const pattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const index = jsConfigFormatErrKeys.value.indexOf(pluginName + '/' + key);
  if (pattern.test(expr)) {
    if (index !== -1) {
      jsConfigFormatErrKeys.value.splice(index, 1);
    }
    jsConfigEdited.value = true;
    changedConfigKeys.value[`${pluginName}/${key}`] = true;
  } else {
    if (index === -1) {
      jsConfigFormatErrKeys.value.push(pluginName + '/' + key);
    }
    jsConfigEdited.value = true;
  }
};

const doDeleteUnusedConfig = (pluginName: any, key: any, isTask: boolean) => {
  ElMessageBox.confirm(
    isTask
      ? `删除插件 ${pluginName} 的定时任务 ${key} ，确定吗？`
      : `删除插件 ${pluginName} 的配置项 ${key} ，确定吗？`,
    '删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ).then(async data => {
    await deleteUnusedJsConfigs(pluginName, [key]);
    setTimeout(() => {
      // 稍等等再重载，以免出现没删掉
      refreshConfig();
      // 删除后本地编辑失效，清空变更登记避免脏提交
      changedConfigKeys.value = {};
      jsConfigEdited.value = false;
    }, 1000);
    ElMessage.success('配置项已删除');
  });
};

const getDeprecatedKeys = (config: JsPluginConfig): string[] => {
  const configs = config.configs || [];
  const result: string[] = [];
  for (const c of configs) {
    if (c.deprecated) {
      result.push(c.key);
    }
  }
  return result;
};

interface JsConfigGroup {
  key: string;
  label: string;
  items: JsPluginConfigItem[];
}

const normalizeGroupName = (group?: string): string => (group || '').trim();

const buildConfigGroups = (config: JsPluginConfig): JsConfigGroup[] => {
  const groups: JsConfigGroup[] = [];
  const groupMap = new Map<string, JsConfigGroup>();
  for (const item of config.configs || []) {
    const groupName = normalizeGroupName(item.group);
    const key = groupName;
    let group = groupMap.get(key);
    if (!group) {
      group = {
        key,
        label: groupName === '' ? '默认分组' : groupName,
        items: [],
      };
      groupMap.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
};

const getConfigGroups = (config: JsPluginConfig): JsConfigGroup[] =>
  configGroupsByPlugin.value[config.pluginName] || [];

const hasSecondLevelGroup = (config: JsPluginConfig): boolean =>
  getConfigGroups(config).some(group => group.key !== '');

const getDisplayConfigs = (config: JsPluginConfig): JsPluginConfigItem[] => {
  const configs = config.configs || [];
  if (!hasSecondLevelGroup(config)) {
    return configs;
  }
  const groups = getConfigGroups(config);
  if (groups.length === 0) {
    return [];
  }
  const activeGroup = jsConfigGroupActive.value[config.pluginName];
  const match = groups.find(group => group.key === activeGroup) || groups[0];
  return match.items;
};

const getConfigByAny = (config: unknown): JsPluginConfig => config as JsPluginConfig;
const getPluginNameByAny = (config: unknown): string => getConfigByAny(config).pluginName;
const hasSecondLevelGroupByAny = (config: unknown): boolean =>
  hasSecondLevelGroup(getConfigByAny(config));
const getConfigGroupsByAny = (config: unknown): JsConfigGroup[] =>
  getConfigGroups(getConfigByAny(config));
const getDisplayConfigsByAny = (config: unknown): JsPluginConfigItem[] =>
  getDisplayConfigs(getConfigByAny(config));

const doDeleteUnusedConfigs = (pluginName: string, keys: string[]) => {
  ElMessageBox.confirm(
    `删除插件 ${pluginName} 的共 ${keys.length} 个暂未使用的配置项/定时任务，确定吗？`,
    '删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ).then(async data => {
    await deleteUnusedJsConfigs(pluginName, keys);
    setTimeout(() => {
      // 稍等等再重载，以免出现没删掉
      refreshConfig();
      changedConfigKeys.value = {};
      jsConfigEdited.value = false;
    }, 1000);
    ElMessage.success('配置项已删除');
  });
};

const doResetJsConfig = (plginName: string, key: string) => {
  ElMessageBox.confirm('重置这条配置项回默认状态，确定吗？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await resetJsConfig(plginName, key);
    ElMessage({
      type: 'success',
      message: '成功！',
    });
    setTimeout(() => {
      refreshConfig();
      jsConfigEdited.value = false;
      jsConfigFormatErrKeys.value = [];
      changedConfigKeys.value = {};
    }, 1000);
  });
};
const doJsConfigAddItem = (arr: any[], pluginName: string, key: string) => {
  arr.push('');
  doJsConfigChanged(pluginName, key);
  return arr;
};
const doJsConfigRemoveItemAt = <T,>(arr: T[], index: number, pluginName: string, key: string) => {
  if (index < 0 || index >= arr.length) {
    return arr;
  }
  arr.splice(index, 1);
  doJsConfigChanged(pluginName, key);
  return arr;
};

const saveButtonLoading = ref(false);

const doJsConfigSave = async () => {
  if (saveButtonLoading.value) return;
  // 有格式错误时不允许保存（按钮也不应渲染，但作为二次保险）
  if (jsConfigFormatErrKeys.value.length > 0) return;

  // 收集所有变更项
  const changedKeys = Object.keys(changedConfigKeys.value).filter(k => changedConfigKeys.value[k]);
  if (changedKeys.length === 0) {
    jsConfigEdited.value = false;
    return;
  }

  // 解析 pluginName/key 并从 jsConfig 取出当前值
  const tasks = changedKeys.map(k => {
    const slashIdx = k.indexOf('/');
    const pluginName = k.slice(0, slashIdx);
    const key = k.slice(slashIdx + 1);
    const plugin = jsConfig.value[pluginName];
    const item = plugin?.configs.find(c => c.key === key);
    return {
      changedKey: k,
      pluginName,
      key,
      value: item?.value,
    };
  });

  saveButtonLoading.value = true;
  try {
    const results = await Promise.allSettled(
      tasks.map(t => setJsConfig(t.pluginName, t.key, t.value)),
    );

    const failedKeys: string[] = [];
    const succeededKeys: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        failedKeys.push(tasks[i].changedKey);
      } else {
        succeededKeys.push(tasks[i].changedKey);
      }
    });

    // 移除已成功项
    succeededKeys.forEach(k => {
      delete changedConfigKeys.value[k];
    });

    if (failedKeys.length > 0) {
      ElMessage.error(`保存失败（${failedKeys.length} 项）: ${failedKeys.join(', ')}`);
    } else {
      ElMessage.success('已保存');
      jsConfigEdited.value = false;
      // 保存成功后刷新以同步服务端状态
      try {
        await refreshConfig();
      } catch (err) {
        console.error('refresh after save failed:', err);
      }
    }
  } finally {
    saveButtonLoading.value = false;
  }
};

let timerId: ReturnType<typeof setInterval> | undefined;

onMounted(async () => {
  jsEnable.value = await jsStatus();
  watch(jsEnable, async (newStatus, oldStatus) => {
    console.log('new:', newStatus, ' old:', oldStatus);
    if (oldStatus !== undefined) {
      if (newStatus) {
        console.log('reload');
        await jsReload();
      } else {
        console.log('shutdown');
        await jsShutdown();
      }
    }
  });

  const el = editorBox.value as any as HTMLElement;
  editor = new EditorView({
    extensions: [basicSetup, javascript(), EditorView.lineWrapping],
    parent: el,
    doc: defaultText.join('\n'),
  });
  el.onclick = () => {
    editor.focus();
  };
  try {
    (globalThis as any).editor = editor;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {}

  try {
    await refreshJsData();
  } catch {
    // The list surface exposes the failed request and lets the user retry.
  }

  timerId = setInterval(async () => {
    console.log('refresh');
    const data = await getJsRecord();

    if (data.outputs) {
      jsLines.value.push(...data.outputs);
    }
  }, 3000);
});

onBeforeUnmount(() => {
  if (timerId !== undefined) {
    clearInterval(timerId);
    timerId = undefined;
  }
});

const jsList = ref<JsScriptInfo[]>([]);
const jsFilter = ref<string>('');
const jsStatusFilter = ref<'all' | 'enabled' | 'disabled'>('all');
const listLoading = ref(false);
const listLoadError = ref(false);
const pluginDetailsVisible = ref(false);
const selectedPluginFilename = ref('');
const selectedPlugin = computed(
  () => jsList.value.find(plugin => plugin.filename === selectedPluginFilename.value) ?? null,
);
const dangerousApiDialogVisible = ref(false);
const selectedDangerousApiScript = ref<JsScriptInfo | null>(null);
const selectedDangerousApiUsage = ref<JsDangerousAPIUsage | null>(null);

const openPluginDetails = (plugin: JsScriptInfo) => {
  selectedPluginFilename.value = plugin.filename;
  pluginDetailsVisible.value = true;
};

const selectedConfigPlugin = ref('');
const selectedConfigScript = ref<JsScriptInfo | null>(null);
const expandedConfigPlugins = ref<string[]>([]);
const isConfigLoaded = ref(false);
const configLoading = ref(false);
const focusPluginConfig = async (pluginName: string) => {
  await nextTick();
  const panel = document.querySelector<HTMLElement>('.plugin-config-content');
  const item = Array.from(
    panel?.querySelectorAll<HTMLElement>('.plugin-config-list > .el-collapse-item') ?? [],
  ).find(element => element.dataset.pluginName === pluginName);
  if (!panel || !item) {
    return;
  }
  const panelTop = panel.getBoundingClientRect().top;
  panel.scrollTo({
    top: panel.scrollTop + item.getBoundingClientRect().top - panelTop,
    behavior: 'auto',
  });
  item.querySelector<HTMLElement>('.el-collapse-item__header')?.focus({ preventScroll: true });
};

const focusPluginConfigForScript = async (script: JsScriptInfo | string) => {
  const candidates =
    typeof script === 'string' ? [script] : (script.extensionNames ?? [script.name]);
  const pluginNames = [
    ...new Set(
      candidates
        .map(name => jsConfig.value[name]?.pluginName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const firstName = pluginNames[0];
  if (!firstName) {
    selectedConfigPlugin.value = '';
    expandedConfigPlugins.value = [];
    ElMessage.info('未找到此脚本对应的扩展设置项，请在插件设置列表中手动查找。');
    return;
  }
  selectedConfigPlugin.value = firstName;
  expandedConfigPlugins.value = pluginNames;
  await focusPluginConfig(firstName);
};

const openPluginConfig = (plugin: JsScriptInfo) => {
  selectedConfigScript.value = plugin;
  selectedConfigPlugin.value = '';
  expandedConfigPlugins.value = [];
  pluginDetailsVisible.value = false;
  mode.value = 'config';
};

const normalizeDangerousApiOccurrence = (
  occurrence: Partial<JsDangerousAPIOccurrence> | null | undefined,
): JsDangerousAPIOccurrence => ({
  line: occurrence?.line ?? 0,
  column: occurrence?.column ?? 0,
  kind: occurrence?.kind ?? 'direct',
  member: occurrence?.member ?? '',
  access: occurrence?.access ?? '',
  memberDescription: occurrence?.memberDescription ?? '',
});

const normalizeDangerousApiUsage = (
  usage: Partial<JsDangerousAPIUsage> | null | undefined,
): JsDangerousAPIUsage => ({
  id: usage?.id ?? '',
  name: usage?.name ?? '',
  description: usage?.description ?? '',
  risk: usage?.risk ?? '',
  occurrences: Array.isArray(usage?.occurrences)
    ? usage.occurrences.map(item => normalizeDangerousApiOccurrence(item))
    : [],
  referencedMembers: Array.isArray(usage?.referencedMembers)
    ? usage.referencedMembers.filter((item): item is string => typeof item === 'string')
    : [],
});

const normalizeJsScriptInfo = (script: Partial<JsScriptInfo> | null | undefined): JsScriptInfo => ({
  name: script?.name ?? '',
  enable: Boolean(script?.enable),
  version: script?.version ?? '',
  author: script?.author ?? '',
  license: script?.license ?? '',
  homepage: script?.homepage ?? '',
  desc: script?.desc ?? '',
  grant: script?.grant,
  updateTime: script?.updateTime ?? 0,
  installTime: script?.installTime ?? 0,
  errText: script?.errText ?? '',
  filename: script?.filename ?? '',
  extensionNames: Array.isArray(script?.extensionNames)
    ? script.extensionNames.filter((name): name is string => typeof name === 'string')
    : undefined,
  updateUrls: Array.isArray(script?.updateUrls) ? script.updateUrls : [],
  official: Boolean(script?.official),
  builtin: Boolean(script?.builtin),
  builtinUpdated: Boolean(script?.builtinUpdated),
  hasDangerousApiUsage: Boolean(script?.hasDangerousApiUsage),
  dangerousApiUsages: Array.isArray(script?.dangerousApiUsages)
    ? script.dangerousApiUsages.map(item => normalizeDangerousApiUsage(item))
    : [],
  memory: script?.memory ?? null,
});

const filteredJsList = computed(() => {
  const query = jsFilter.value.trim().toLocaleLowerCase();
  return jsList.value.filter(plugin => {
    const matchesStatus =
      jsStatusFilter.value === 'all' ||
      (jsStatusFilter.value === 'enabled' && plugin.enable) ||
      (jsStatusFilter.value === 'disabled' && !plugin.enable);
    if (!matchesStatus) {
      return false;
    }
    return (
      !query ||
      [plugin.name, plugin.version, plugin.desc, plugin.author, plugin.filename].some(value =>
        value.toLocaleLowerCase().includes(query),
      )
    );
  });
});

const scrollJsListTop = () => {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  document
    .querySelector<HTMLElement>('.plugin-list-content')
    ?.scrollTo({ top: 0, left: 0, behavior });
};

const formatObjectCount = (objects: number) => `约 ${objects.toLocaleString()} 个对象`;

const formatMemoryAmount = (amount: JsMemoryAmount) =>
  `${filesize(amount.bytes)} · ${formatObjectCount(amount.objects)}`;

const formatMemoryValue = (memory?: JsMemoryUsage | null) => {
  switch (memory?.status) {
    case 'ok':
      // 小对象按 1/64 采样，没有采到存活对象时只能说明占用低于统计精度。
      return memory.bytes > 0 ? filesize(memory.bytes) : '极少';
    case 'pending':
      return '统计中';
    default:
      return '—';
  }
};

const formatMemoryTooltip = (memory?: JsMemoryUsage | null) => {
  switch (memory?.status) {
    case 'ok':
      return memory.bytes > 0
        ? `${formatObjectCount(memory.objects)}，统计于 ${dayjs.unix(memory.sweptAt / 1000).fromNow()}`
        : `未采样到存活对象，占用低于统计精度，统计于 ${dayjs.unix(memory.sweptAt / 1000).fromNow()}`;
    case 'pending':
      return '运行时尚未完成首次统计，请稍后刷新';
    case 'unsupported':
      return '该插件所在的运行时暂不支持内存统计';
    default:
      return '插件未运行';
  }
};

const formatDangerousApiUsageSummary = (js: JsScriptInfo) =>
  js.dangerousApiUsages
    .map((usage: JsDangerousAPIUsage) => `${usage.name}: ${usage.risk}`)
    .join('\n');

const formatDangerousApiOccurrenceKind = (kind: string) => {
  switch (kind) {
    case 'method':
      return '方法';
    case 'property':
      return '属性';
    default:
      return '直接引用';
  }
};

const sealInstDangerousMemberDescriptions: Record<string, string> = {
  ImSession: '当前 IM 会话对象，包含端点、群组会话和消息处理运行态。',
  imSession: '当前 IM 会话对象，包含端点、群组会话和消息处理运行态。',
  CmdMap: '核心命令映射表，包含已注册的命令项。',
  ExtList: '当前扩展列表，包含已注册扩展对象。',
  ExtRegistry: '扩展注册表，用于按名称或别名索引扩展。',
  ActiveWithGraph: '扩展开关联动图，用于处理 ActiveWith 依赖关系。',
  ActiveWithGraphMu: '保护扩展开关联动图的读写锁。',
  ExtRegistryVersion: '扩展注册表版本号，扩展变更时递增。',
  RollParser: '骰点表达式解析器实例。',
  LastUpdatedTime: '最近一次标记为已修改的时间戳。',
  TextMap: '当前文本模板映射表。',
  BaseConfig: '基础配置对象，包含实例名和数据目录等基础信息。',
  DBOperator: '数据库操作器，用于访问底层数据库。',
  Logger: '核心日志记录器。',
  LogWriter: '供 UI 使用的日志写入器。',
  IsDeckLoading: '当前是否正在加载牌堆。',
  DeckList: '当前牌堆列表。',
  deckList: '当前牌堆列表。',
  CommandPrefix: '当前命令前缀列表，例如 .、。等，会影响命令解析入口。',
  commandPrefix: '当前命令前缀列表，例如 .、。等，会影响命令解析入口。',
  DiceMasters: '当前骰主列表。改写后可直接影响管理权限。',
  diceMasters: '当前骰主列表。改写后可直接影响管理权限。',
  MasterUnlockCode: '当前骰主解锁码。',
  MasterUnlockCodeTime: '当前骰主解锁码的更新时间。',
  CustomReplyConfig: '自定义回复配置列表。',
  TextMapRaw: '原始文本模板配置。',
  TextMapHelpInfo: '文本模板帮助信息映射。',
  TextMapCompatible: '文本模板兼容层映射。',
  ConfigManager: '插件配置管理器。',
  Parent: '所属 DiceManager 实例。',
  CocExtraRules: 'COC 额外规则映射。',
  Cron: '核心 cron 调度器。',
  AliveNoticeEntry: '存活通知任务的 cron 条目 ID。',
  JsPrinter: 'JS 控制台输出记录器。',
  ExtLoopManager: 'JS 事件循环管理器。',
  JsScriptList: '当前加载的 JS 脚本元数据列表。',
  JsScriptCron: 'JS 脚本专用 cron 调度器。',
  JsScriptCronLock: 'JS 脚本 cron 调度器的互斥锁。',
  JsReloadLock: 'JS 重载锁，用于避免并发重载。',
  JsBuiltinDigestSet: '内置脚本摘要表，用于判断内置脚本是否被更新。',
  JsLoadingScript: '当前正在加载的脚本元数据。',
  GameSystemMap: '游戏系统模板映射。',
  RunAfterLoaded: '核心加载完成后待执行的回调列表。',
  UIEndpoint: 'UI 使用的端点信息。',
  CensorManager: '敏感词审查管理器。',
  AttrsManager: '属性管理器。',
  Config: '核心配置对象，包含 JS 开关、邮件、日志、风控等大量运行配置。',
  AdvancedConfig: '高级配置对象，包含危险开关和跑团日志后端等高级设置。',
  PublicDice: '公骰客户端对象，用于与公骰服务端通信。',
  PublicDiceTimerId: '公骰心跳任务的 cron 条目 ID。',
  ContainerMode: '当前是否处于容器模式。',
  IsAlreadyLoadConfig: '核心配置是否已完成加载。',
  SaveDatabaseInsertCheckMapFlag: '数据库插入检查表的初始化标记。',
  SaveDatabaseInsertCheckMap: '数据库插入检查映射。',
  StoreManager: '扩展商店管理器。',
  JsExtRegistry: 'JS 扩展真实注册表。',
  ExtUpdateTime: '扩展变更时间戳，用于触发延迟更新。',
  JsReloading: '当前是否正在重载 JS 扩展。',
  DirtyGroups: '脏群组列表，用于保存优化。',
  MarkModified: '标记核心状态已修改，更新时间戳以触发后续保存。',
  StartStartupJsLoad: '在启动阶段异步开始加载 JS 脚本。',
  WaitStartupJsLoaded: '等待启动阶段的 JS 脚本加载完成。',
  CocExtraRulesAdd: '添加一条 COC 额外规则。',
  Init: '初始化核心实例，包括配置、扩展、调度器和各类管理器。',
  ExtFind: '按名称或别名查找扩展。',
  ExtAliasToName: '将扩展别名转换成主扩展名。',
  ExtRemove: '移除一个扩展。',
  MasterRefresh: '整理骰主列表并去重。',
  MasterAdd: '向骰主列表中新增一项，可能直接提升管理权限。',
  MasterCheck: '检查某个群组 ID 或用户 ID 是否拥有骰主权限。',
  MasterRemove: '从骰主列表中移除一项。',
  UnlockCodeUpdate: '刷新或生成骰主解锁码。',
  UnlockCodeVerify: '校验给定解锁码是否有效。',
  IsMaster: '检查某个统一 ID 是否属于骰主。',
  ApplyAliveNotice: '重建并应用存活通知定时任务。',
  GameSystemTemplateAddEx: '添加或覆盖一个游戏系统模板。',
  GameSystemTemplateAdd: '添加一个游戏系统模板，已存在时不会覆盖。',
  ResetQuitInactiveCron: '重建退群判定的定时任务。',
  PublicDiceEndpointRefresh: '向公骰服务刷新端点在线信息。',
  PublicDiceInfoRegister: '向公骰服务注册或更新公骰信息。',
  PublicDiceSetupTick: '重建公骰心跳定时更新。',
  PublicDiceSetup: '初始化公骰客户端并完成注册、端点刷新与心跳配置。',
  StoreSetup: '初始化扩展商店管理器。',
  NoticeForEveryEndpoint: '向各端点发送通知消息。',
  RegisterBuiltinExt: '注册内置扩展。',
  RegisterBuiltinSystemTemplate: '注册内置游戏系统模板。',
  RegisterExtension: '向核心注册新的扩展对象，直接影响扩展系统。',
  GetExtDataDir: '返回指定扩展的数据目录路径，并在必要时创建目录。',
  GetDiceDataPath: '返回核心数据目录下指定名称对应的路径。',
  GetExtConfigFilePath: '返回指定扩展配置文件的完整路径。',
  JsInit: '初始化并重建整个 JS 运行环境。',
  JsShutdown: '关闭 JS 环境。',
  JsLoadScripts: '扫描脚本目录并加载脚本元数据与脚本内容。',
  JsReload: '重建并重载整个 JS 环境。',
  JsExtSettingVacuum: '清理已删除脚本对应的插件配置。该方法已标记为弃用且存在已知问题。',
  JsParseMeta: '解析脚本文件的元数据头和签名信息。',
  JsLoadScriptRaw: '加载并执行单个脚本文件。',
  JsCheckUpdate: '检查某个 JS 脚本是否存在更新。',
  JsUpdate: '应用某个 JS 脚本的更新文件。',
  JsDownload: '下载 JS 脚本或其更新文件。',
  GenerateTextMap: '根据原始配置重建文本模板映射。',
  SaveText: '将文本模板配置落盘保存。',
  ApplyExtDefaultSettings: '应用扩展默认设置。',
  Save: '将当前配置和高级配置落盘保存。',
  CanSendMail: '检查邮件配置是否完整可用。',
  SendMail: '按当前邮件配置发送通知邮件。',
  SendMailRow: '直接发送邮件，可指定主题、收件人、正文和附件，并返回投递错误。',
  GetBanList: '获取当前黑名单/信任列表。',
  NewCensorManager: '初始化敏感词审查管理器。',
  CensorMsg: '执行一条消息的敏感词审查。',
  DeckCheckUpdate: '检查某个牌堆是否存在更新。',
  DeckUpdate: '应用某个牌堆更新文件。',
  DeckDownload: '下载牌堆或其更新文件。',
};

const getDangerousApiOccurrenceDescription = (
  usage: JsDangerousAPIUsage | null,
  occurrence: { memberDescription?: string; member?: string; kind?: string },
) => {
  if (occurrence.memberDescription) {
    return occurrence.memberDescription;
  }
  if (!usage) {
    return '暂无说明';
  }
  if (usage.id === 'seal.inst') {
    if (!occurrence.member) {
      return '直接获取高权限 API 本体。后续可继续读取字段、调用方法或转存到其它变量。';
    }
    const exact = sealInstDangerousMemberDescriptions[occurrence.member];
    if (exact) {
      return exact;
    }
    const lowerFirst = occurrence.member[0].toLowerCase() + occurrence.member.slice(1);
    if (sealInstDangerousMemberDescriptions[lowerFirst]) {
      return sealInstDangerousMemberDescriptions[lowerFirst];
    }
    const upperFirst = occurrence.member[0].toUpperCase() + occurrence.member.slice(1);
    if (sealInstDangerousMemberDescriptions[upperFirst]) {
      return sealInstDangerousMemberDescriptions[upperFirst];
    }
  }
  if (occurrence.kind === 'method') {
    return '检测到对高权限实例方法的直接调用，但当前没有预置说明。';
  }
  if (occurrence.kind === 'property') {
    return '检测到对高权限实例字段或属性的直接访问，但当前没有预置说明。';
  }
  return '直接获取高权限 API 本体。后续可继续读取字段、调用方法或转存到其它变量。';
};

const dangerousApiDialogTitle = computed(() => {
  if (!selectedDangerousApiUsage.value) {
    return '高权限 API 调用明细';
  }
  return `${selectedDangerousApiUsage.value.name} 调用明细`;
});

const openDangerousApiUsageDialog = (script: JsScriptInfo, usage: JsDangerousAPIUsage) => {
  selectedDangerousApiScript.value = normalizeJsScriptInfo(script);
  selectedDangerousApiUsage.value = normalizeDangerousApiUsage(usage);
  dangerousApiDialogVisible.value = true;
};
const jsConfig = ref<{ [key: string]: JsPluginConfig }>({});
const jsConfigGroupActive = ref<{ [pluginName: string]: string }>({});
const configGroupsByPlugin = computed<Record<string, JsConfigGroup[]>>(() => {
  const next: Record<string, JsConfigGroup[]> = {};
  for (const config of Object.values(jsConfig.value)) {
    next[config.pluginName] = buildConfigGroups(config);
  }
  return next;
});
const uploadFileList = ref<any[]>([]);

// const jsVisitDir = async () => {
// 好像 webui 上没啥效果，先算了
// await store.jsVisitDir();
// };

const jsStatus = async () => {
  const res = await getJsStatus();
  return res.result ? res.status : false;
};

const refreshList = async () => {
  listLoading.value = true;
  listLoadError.value = false;
  try {
    const lst = await getJsList();
    jsList.value = Array.isArray(lst) ? lst.map(item => normalizeJsScriptInfo(item)) : [];
  } catch (err) {
    console.error('refresh js list failed:', err);
    listLoadError.value = true;
  } finally {
    listLoading.value = false;
  }
};

const initConfigGroupActive = () => {
  const next: { [pluginName: string]: string } = {};
  for (const config of Object.values(jsConfig.value)) {
    if (!hasSecondLevelGroup(config)) {
      continue;
    }
    const groups = getConfigGroups(config);
    if (groups.length === 0) {
      continue;
    }
    const old = jsConfigGroupActive.value[config.pluginName];
    const exists = groups.some(group => group.key === old);
    next[config.pluginName] = exists ? old : groups[0].key;
  }
  jsConfigGroupActive.value = next;
};

const refreshConfig = async () => {
  jsConfig.value = await getJsConfigs();
  initConfigGroupActive();
};

const refreshJsData = async () => {
  await refreshList();
};

watch(mode, async newMode => {
  if (newMode !== 'config') {
    return;
  }
  configLoading.value = true;
  try {
    if (!isConfigLoaded.value) {
      await refreshConfig();
      isConfigLoaded.value = true;
    }
    const script = selectedConfigScript.value;
    selectedConfigScript.value = null;
    if (script) {
      await focusPluginConfigForScript(script);
    } else if (selectedConfigPlugin.value) {
      await focusPluginConfigForScript(selectedConfigPlugin.value);
    }
  } catch (err) {
    console.error('refresh js config failed:', err);
    ElMessage.warning('插件配置刷新失败，请手动刷新界面');
  } finally {
    configLoading.value = false;
  }
});

const jsReload = async () => {
  if (jsReloading.value) {
    return;
  }
  jsReloading.value = true;
  try {
    await runJsReloadWithProgress({
      afterReload: async () => {
        await refreshJsData();
        needReload.value = false;
      },
      successMessage: '已重载',
      testModeMessage: '展示模式无法重载脚本',
    });
  } finally {
    jsEnable.value = await jsStatus();
    jsReloading.value = false;
  }
};

const jsShutdown = async () => {
  const ret = await shutDownJS();
  if (ret?.testMode) {
    ElMessage.success('展示模式无法关闭');
  } else if (ret?.result === true) {
    ElMessage.success('已关闭 JS 支持');
    jsLines.value = [];
    await refreshList();
  }
  jsEnable.value = await jsStatus();
};

const beforeUpload = async (file: UploadRawFile) => {
  if (!(await confirmUploadTargetMatch(file, 'js')).proceed) {
    return false;
  }

  try {
    const uploaded = await uploadJs(file);
    await refreshList();
    if ('incremental' in uploaded && uploaded.incremental) {
      const loaded = uploaded.loaded ?? [];
      const rejected = uploaded.rejected ?? [];
      if (loaded.length > 0) {
        ElMessage.success(`上传完成，已局部加载：${loaded.join('、')}，无需重载`);
      } else if (uploaded.disabled) {
        ElMessage.success('上传完成，该插件已被禁用，未加载');
      } else if (rejected.length === 0) {
        ElMessage.success('上传完成');
      }
      for (const issue of rejected) {
        ElMessage.warning(`《${issue.name}》未能加载：${issue.reason}`);
      }
      for (const warning of uploaded.warnings ?? []) {
        ElMessage.warning(warning);
      }
    } else {
      const reason = 'reason' in uploaded && uploaded.reason ? `（${uploaded.reason}）` : '';
      ElMessage.success(`上传完成${reason}，请在全部操作完成后，手动重载插件`);
      needReload.value = true;
    }
  } catch (err) {
    console.error('upload js plugin failed:', err);
    ElMessage.error(formatUploadFailureMessage(err));
  }
  return false;
};

const doDelete = async (data: JsScriptInfo) => {
  ElMessageBox.confirm(
    data.official
      ? `卸载官方插件《${data.name}》的更新，确定吗？`
      : `删除插件《${data.name}》，确定吗？`,
    '删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ).then(async _data => {
    await deleteJs(data.filename);
    if (selectedPluginFilename.value === data.filename) {
      pluginDetailsVisible.value = false;
    }
    setTimeout(() => {
      // 稍等等再重载，以免出现没删掉
      refreshList();
    }, 1000);
    ElMessage.success('插件已删除，请手动重载后生效');
    needReload.value = true;
  });
};

const changejsScriptStatus = async (name: string, status: boolean) => {
  if (status) {
    const ret = await enableJS(name);
    setTimeout(() => {
      refreshList();
    }, 1000);
    if (ret.result) {
      ElMessage.success('插件已启用，请手动重载后生效');
    }
  } else {
    const ret = await disableJS(name);
    setTimeout(() => {
      refreshList();
    }, 1000);
    if (ret.result) {
      ElMessage.success('插件已禁用，请手动重载后生效');
    }
  }
  needReload.value = true;
  return true;
};

// const showSettingDialog = ref<boolean>(false);

// interface DeckProp {
//   key: string;
//   value: string;

//   name?: string;
//   desc?: string;
//   required?: boolean;
//   default?: string;
// }

// const settingForm = ref({
//   props: [{ key: 'name', value: 'test props' }] as DeckProp[],
// });

const showDiff = ref<boolean>(false);
const diffLoading = ref<boolean>(false);

interface JsCheckResult {
  old: string;
  new: string;
  filename: string;
  tempFileName: string;
}

const jsCheck = ref<JsCheckResult>({
  old: '',
  new: '',
  filename: '',
  tempFileName: '',
});

const doCheckUpdate = async (plugin: JsScriptInfo) => {
  if (diffLoading.value) {
    return;
  }
  diffLoading.value = true;
  try {
    const checkResult = await checkJsUpdate(plugin.filename);
    if (checkResult.result) {
      jsCheck.value = { ...checkResult, filename: plugin.filename };
      showDiff.value = true;
    } else {
      ElMessage.error('检查更新失败！' + checkResult.err);
    }
  } catch (err) {
    ElMessage.error(`检查更新失败！${String(err)}`);
  } finally {
    diffLoading.value = false;
  }
};

const requestPluginUpdate = async (plugin: JsScriptInfo) => {
  if (!plugin.official) {
    try {
      await ElMessageBox.confirm('更新地址由插件作者提供，是否确认要检查该插件更新？', '检查更新', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }
  }
  await doCheckUpdate(plugin);
};

type JsPluginAction = {
  action: 'details' | 'config' | 'delete';
  filename: string;
};

const handlePluginAction = ({ action, filename }: JsPluginAction) => {
  const plugin = jsList.value.find(item => item.filename === filename);
  if (!plugin) {
    return;
  }
  if (action === 'details') {
    openPluginDetails(plugin);
  } else if (action === 'config') {
    openPluginConfig(plugin);
  } else {
    void doDelete(plugin);
  }
};

const jsUpdate = async () => {
  const res = await updateJs(jsCheck.value.tempFileName, jsCheck.value.filename);
  if (res.result) {
    showDiff.value = false;
    needReload.value = true;
    setTimeout(() => {
      refreshList();
    }, 1000);
    ElMessage.success('更新成功，请手动重载后生效');
  } else {
    showDiff.value = false;
    ElMessage.error('更新失败！' + res.err);
  }
};
</script>

<style lang="css">
.cm-editor {
  /* height: v-bind("$props.initHeight"); */
  height: 20rem;
  /* font-size: 18px; */

  outline: 0 !important;
  /* height: 50rem; */
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.12),
    0 0 6px rgba(0, 0, 0, 0.04);
}

.cm-editor .cm-gutters {
  background-color: var(--seal-surface-soft);
  color: var(--seal-text-muted);
  border-right-color: var(--seal-border-color);
}

.cm-editor .cm-activeLineGutter {
  background-color: var(--seal-surface-muted);
  color: var(--seal-text-color);
}

@media screen and (max-width: 700px) {
  .bak-item {
    flex-direction: column;

    & > span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}

.deck-keys {
  display: flex;
  flex-flow: wrap;

  & > span {
    margin-right: 1rem;
    /* width: fit-content; */
  }
}

.upload {
  > ul {
    display: none;
  }
}

.js-list-main {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.js-item-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.js-item {
  min-width: 100%;
}

.dangerous-api-link {
  text-decoration: underline;
  text-underline-offset: 0.16em;
}

.dangerous-api-dialog-window .el-dialog {
  width: min(72rem, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dangerous-api-dialog-window .el-dialog__body {
  overflow-y: auto;
}

.dangerous-api-position {
  line-height: 1.35;
}

.dangerous-api-description {
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

.js-backtop {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 60;
  width: 2.55rem;
  height: 2.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 999px;
  color: var(--seal-on-primary);
  background: color-mix(in srgb, var(--el-color-primary) 92%, var(--seal-panel-bg));
  box-shadow: var(--el-box-shadow);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.js-backtop:hover {
  transform: translateY(-2px);
  background: var(--el-color-primary);
}

@media screen and (max-width: 760px) {
  .js-backtop {
    right: 0.8rem;
    bottom: 0.8rem;
  }
}
.plugin-workspace {
  min-width: 0;
  gap: var(--workspace-gap, 16px);
}

.plugin-header {
  flex: 0 0 auto;
  gap: 16px;
}

.plugin-heading {
  min-width: 0;
}

.plugin-global-actions,
.plugin-list-actions,
.plugin-empty-actions,
.plugin-drawer-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.plugin-mode-tabs {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.plugin-workspace .plugin-mode-tabs > .el-tabs__header {
  flex: 0 0 auto;
}

.plugin-workspace .plugin-mode-tabs > .el-tabs__content {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
}

.plugin-workspace .plugin-mode-tabs .el-tab-pane {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.plugin-notice {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 8px 12px;
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 6px;
  background: var(--el-color-danger-light-9);
}

.plugin-notice-warning {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.plugin-list-toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 4px 0 12px;
}

.plugin-search-controls,
.plugin-status-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.plugin-search {
  width: min(360px, 100%);
}

.plugin-list-actions {
  justify-content: flex-end;
}

.plugin-result-count {
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
  white-space: nowrap;
}

.plugin-list-content {
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  border: 1px solid var(--seal-border-color, var(--el-border-color));
  border-radius: 6px;
  background: var(--seal-panel-bg, var(--el-bg-color));
  overscroll-behavior: contain;
}

.plugin-list {
  min-width: 0;
}

.plugin-list-head,
.plugin-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 0.2fr) minmax(132px, 0.33fr) 100px;
  align-items: center;
  column-gap: 12px;
  padding-inline: 12px;
}

.plugin-list-head {
  position: sticky;
  z-index: 1;
  top: 0;
  min-height: 34px;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  background: var(--seal-surface-soft, var(--el-fill-color-light));
  border-bottom: 1px solid var(--seal-border-color, var(--el-border-color));
  font-size: 12px;
}

.plugin-list-actions-heading {
  text-align: end;
}

.plugin-row {
  min-height: var(--workspace-plugin-row-height, 64px);
  border-bottom: 1px solid var(--seal-border-color, var(--el-border-color));
}

.plugin-row:last-child {
  border-bottom: 0;
}

.plugin-row-main {
  display: grid;
  min-width: 0;
  min-height: inherit;
  grid-template-columns: minmax(210px, 0.95fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 12px;
  padding-block: 8px;
  color: var(--seal-text-color, var(--el-text-color-primary));
  text-align: start;
  background: transparent;
  border: 0;
  font: inherit;
  cursor: pointer;
}

.plugin-row-heading {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.plugin-name {
  overflow: hidden;
  max-width: 100%;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-version {
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 11px;
}

.plugin-status-indicator {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
}

.plugin-status-indicator.is-enabled {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.plugin-status-indicator.is-disabled {
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  background: var(--seal-surface-soft, var(--el-fill-color-light));
}

.plugin-status-indicator.is-error {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.plugin-description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* 桌面端内存与更新时间各占一列；窄屏下合并为一行。 */
.plugin-row-meta {
  display: contents;
}

.plugin-memory {
  justify-self: start;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.plugin-memory.is-measured {
  color: var(--seal-text-color, var(--el-text-color-primary));
}

/* 桌面端由表头说明含义，窄屏没有表头时才显示。 */
.plugin-memory-label {
  display: none;
  margin-inline-end: 4px;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
}

.plugin-update-summary {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
}

.plugin-row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.plugin-row-actions .el-switch {
  min-height: 40px;
}
.plugin-update-button {
  min-height: 40px;
  padding-inline: 8px;
}

.plugin-more-button {
  width: 40px;
  min-height: 40px;
  padding: 0;
}

.js-plugin-action-menu .el-dropdown-menu__item {
  display: flex;
  min-height: 40px;
  align-items: center;
}

.plugin-empty-state {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  text-align: center;
}

.plugin-empty-state strong {
  color: var(--seal-text-color, var(--el-text-color-primary));
  font-size: 15px;
}

.plugin-empty-state .plugin-empty-icon {
  color: var(--el-color-danger);
  font-size: 24px;
}

.plugin-empty-actions {
  justify-content: center;
}

.plugin-console {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  scrollbar-gutter: stable;
  padding-inline-end: 12px;
}

.plugin-console-editor {
  min-width: 0;
}

.plugin-console-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding-block: 12px;
}

.plugin-console-actions p {
  margin: 0;
}

.plugin-console-output {
  overflow-wrap: anywhere;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.plugin-config-content {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}

.plugin-config-list {
  min-width: 0;
}

.plugin-row-main:focus-visible,
.plugin-workspace .el-button:focus-visible,
.plugin-workspace .el-link:focus-visible,
.plugin-workspace .el-input__wrapper:focus-within,
.plugin-workspace .el-switch:focus-within .el-switch__core,
.plugin-drawer-close:focus-visible,
.js-backtop:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.plugin-drawer-header {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--seal-border-color, var(--el-border-color));
}

.plugin-drawer-header h2 {
  margin: 4px 0 8px;
  color: var(--seal-text-color, var(--el-text-color-primary));
  font-size: 20px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.plugin-drawer-eyebrow {
  margin: 0;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
}

.plugin-drawer-version {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
}

.js-plugin-detail-drawer .el-drawer__body {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: contain;
}

.plugin-drawer-close {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
}

.plugin-drawer-content {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  padding-block: 16px;
  overscroll-behavior: contain;
}

.plugin-drawer-description {
  margin: 0 0 16px;
  color: var(--seal-text-color, var(--el-text-color-primary));
  line-height: 1.6;
  white-space: pre-line;
}

.plugin-error-detail {
  margin-bottom: 16px;
}

.plugin-error-detail .el-alert__description {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.plugin-breakable-value {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.plugin-update-sources {
  display: grid;
  gap: 6px;
}

.plugin-update-sources code {
  overflow-wrap: anywhere;
}

.plugin-security-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 6px;
  background: var(--el-color-danger-light-9);
}

.plugin-memory-section {
  margin-top: 16px;
}

.plugin-memory-section h3 {
  margin: 0 0 6px;
  font-size: 14px;
}

.plugin-memory-section p {
  margin: 0 0 8px;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
  line-height: 1.5;
}

.plugin-security-section h3 {
  width: 100%;
  margin: 0;
  font-size: 14px;
}

.plugin-security-section p {
  width: 100%;
  margin: 0;
  color: var(--seal-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
  line-height: 1.5;
}

.plugin-drawer-footer {
  flex: 0 0 auto;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--seal-border-color, var(--el-border-color));
}

.plugin-drawer-footer .el-switch {
  margin-inline-end: auto;
}

.js-backtop {
  width: 44px;
  height: 44px;
}

@media (hover: hover) {
  .plugin-row:hover {
    background: var(--seal-surface-soft, var(--el-fill-color-light));
  }
}

@media (max-width: 1050px) {
  .plugin-list-head,
  .plugin-row {
    grid-template-columns: minmax(0, 1fr) max-content;
    column-gap: 10px;
    padding-inline: 10px;
  }

  .plugin-list-head > span:nth-child(2),
  .plugin-list-head > span:nth-child(3) {
    display: none;
  }

  .plugin-row-main {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .plugin-row-meta {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    grid-column: 1;
  }

  .plugin-memory-label {
    display: inline;
  }

  .plugin-row-actions {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}

@media (max-width: 767px) {
  .plugin-header {
    align-items: flex-start;
  }

  .plugin-global-actions {
    justify-content: flex-end;
  }

  .plugin-list-toolbar,
  .plugin-search-controls {
    align-items: stretch;
  }

  .plugin-search-controls {
    width: 100%;
    flex-direction: column;
  }

  .plugin-search {
    width: 100%;
  }

  .plugin-search input {
    font-size: 16px;
  }

  .plugin-status-filters .el-button {
    min-height: 44px;
    margin: 0;
  }

  .plugin-list-actions {
    width: 100%;
    justify-content: space-between;
  }

  .plugin-list-actions > .el-upload,
  .plugin-empty-actions > .el-upload {
    display: flex;
  }

  .plugin-list-head {
    display: none;
  }

  .plugin-row {
    min-height: var(--workspace-plugin-row-height, 64px);
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 4px 8px;
    padding: 8px 10px;
  }

  .plugin-row-main {
    grid-column: 1;
    grid-row: 1;
    gap: 5px;
    padding-block: 2px;
  }

  .plugin-row-heading {
    gap: 5px;
  }

  .plugin-name {
    font-size: 14px;
  }

  .plugin-description {
    -webkit-line-clamp: 1;
  }

  .plugin-row-meta {
    grid-column: 1;
    grid-row: 2;
    padding-inline-start: 4px;
  }

  .plugin-memory,
  .plugin-update-summary {
    font-size: 11px;
  }

  .plugin-row-actions {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .plugin-row-actions .el-switch,
  .plugin-more-button {
    min-height: 44px;
  }

  .plugin-more-button {
    width: 44px;
  }
  .plugin-update-button {
    min-height: 44px;
  }

  .plugin-global-actions .el-switch,
  .plugin-global-actions .el-button,
  .plugin-list-actions .el-button,
  .plugin-empty-state .el-button,
  .plugin-console-actions .el-button,
  .js-plugin-action-menu .el-dropdown-menu__item {
    min-height: 44px;
  }

  .plugin-list-actions .el-link,
  .plugin-empty-actions .el-link {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
  }

  .plugin-empty-state {
    min-height: 180px;
    padding: 18px;
  }

  .plugin-drawer-footer {
    justify-content: flex-start;
  }

  .plugin-drawer-footer > :not(.el-switch) {
    min-height: 44px;
  }

  .js-backtop {
    right: 0.8rem;
    bottom: 0.8rem;
  }

  .el-drawer.js-plugin-detail-drawer {
    width: 100vw !important;
    max-width: 100vw;
    height: 100dvh;
    margin: 0;
  }

  .js-plugin-detail-drawer .el-drawer__body {
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding: 16px;
    overflow: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .plugin-row,
  .js-backtop {
    transition: none;
  }
}
</style>
