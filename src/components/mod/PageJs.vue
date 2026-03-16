<template>
  <header class="page-header">
    <el-switch v-model="jsEnable" active-text="启用" inactive-text="关闭" />
    <el-button v-show="jsEnable" type="primary" :icon="Refresh" @click="jsReload"
      >重载 JS</el-button
    >
  </header>

  <el-affix v-if="needReload" :offset="70">
    <div class="tip-danger">
      <el-text type="danger" size="large" tag="strong">存在修改，需要重载后生效！</el-text>
    </div>
  </el-affix>
  <el-affix v-if="jsConfigEdited" :offset="70">
    <div v-if="jsConfigFormatErrKeys.length > 0">
      <div class="tip-danger">
        <el-text type="danger" size="large" tag="strong"
          >配置内容已修改，但存在格式错误，无法保存！</el-text
        >
      </div>
    </div>
    <div v-else>
      <div class="tip-danger">
        <el-text type="danger" size="large" tag="strong">配置内容已修改，不要忘记保存！</el-text>
        <el-button
          class="button"
          type="primary"
          :icon="DocumentChecked"
          :disabled="!jsConfigEdited"
          @click="doJsConfigSave()"
          >点我保存</el-button
        >
      </div>
    </div>
  </el-affix>
  <el-row>
    <el-col :span="24">
      <el-tabs v-model="mode" class="demo-tabs" :stretch="true">
        <el-tab-pane label="控制台" name="console">
          <div>
            <div ref="editorBox"></div>
            <div>
              <div style="margin-top: 1rem">
                <el-button
                  type="success"
                  :icon="CaretRight"
                  :disabled="!jsEnable"
                  @click="doExecute"
                  >执行代码</el-button
                >
              </div>
            </div>
            <el-text type="danger" tag="p" style="padding: 1rem 0"
              >注意：延迟执行的代码，其输出不会立即出现</el-text
            >
            <div style="word-break: break-all; margin-bottom: 1rem; white-space: pre-line">
              <div :key="i" v-for="i in jsLines">{{ i }}</div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="插件列表" name="list">
          <header class="js-list-header">
            <el-space>
              <el-upload
                action=""
                multiple
                accept="application/javascript,application/typescript,.js,.ts"
                class="upload"
                :before-upload="beforeUpload"
                :file-list="uploadFileList">
                <el-button type="primary" :icon="Upload">上传插件</el-button>
              </el-upload>
              <el-input v-model="jsFilter" :prefix-icon="Search" size="small" clearable />
              <el-button
                type="info"
                :icon="Link"
                size="small"
                link
                tag="a"
                target="_blank"
                style="text-decoration: none"
                href="https://github.com/sealdice/javascript"
                >获取插件</el-button
              >
            </el-space>
          </header>
          <aside v-if="jsFilterCount > 0" class="mb-4">
            <el-text size="small" type="info">已过滤 {{ jsFilterCount }} 条</el-text>
          </aside>
          <main class="js-list-main">
            <foldable-card
              v-for="(i, index) of filteredJsList"
              :key="index"
              class="js-item"
              :err-title="i.filename"
              :err-text="i.errText">
              <template #title>
                <el-space class="js-item-header">
                  <el-switch
                    v-model="i.enable"
                    :disabled="i.errText !== ''"
                    style="
                      --el-switch-on-color: var(--el-color-success);
                      --el-switch-off-color: var(--el-color-danger);
                    "
                    @change="changejsScriptStatus(i.name, i.enable)" />
                  <el-text size="large" tag="b">{{ i.name }}</el-text>
                  <el-text>{{ i.version || '&lt;未定义>' }}</el-text>
                  <el-tag v-if="i.official" size="small" type="success">官方</el-tag>
                  <el-tooltip
                    v-if="i.hasDangerousApiUsage"
                    placement="top"
                    :content="formatDangerousApiUsageSummary(i)">
                    <el-tag size="small" type="danger">高权限 API</el-tag>
                  </el-tooltip>
                  <el-button
                    v-for="usage in i.dangerousApiUsages"
                    :key="`${i.filename}-${usage.id}-header`"
                    type="danger"
                    link
                    size="small"
                    class="dangerous-api-link"
                    @click.stop="openDangerousApiUsageDialog(i, usage)">
                    {{ usage.name }}
                  </el-button>

                  <el-tooltip content="该插件使用 TypeScript 编写">
                    <el-tag
                      v-if="i.filename.toLowerCase().endsWith('.ts')"
                      size="small"
                      type="primary"
                      >TS</el-tag
                    >
                  </el-tooltip>
                </el-space>
              </template>

              <template #title-extra>
                <el-button
                  v-if="i.official && i.updateUrls && i.updateUrls.length > 0"
                  :icon="Download"
                  type="success"
                  size="small"
                  plain
                  :loading="diffLoading">
                  更新
                </el-button>
                <el-popconfirm
                  v-else-if="i.updateUrls && i.updateUrls.length > 0"
                  confirm-button-text="确认"
                  cancel-button-text="取消"
                  title="更新地址由插件作者提供，是否确认要检查该插件更新？"
                  @confirm="doCheckUpdate(i)">
                  <template #reference>
                    <el-button
                      :icon="Download"
                      type="success"
                      size="small"
                      plain
                      :loading="diffLoading">
                      更新
                    </el-button>
                  </template>
                </el-popconfirm>
                <!--                    <el-button :icon="Setting" type="primary" size="small" plain @click="showSettingDialog = true">设置</el-button>-->
                <el-button
                  v-if="i.builtin && i.builtinUpdated"
                  :icon="Delete"
                  type="danger"
                  size="small"
                  plain
                  @click="doDelete(i)">
                  卸载更新
                </el-button>
                <el-button
                  v-if="!i.builtin"
                  :icon="Delete"
                  type="danger"
                  size="small"
                  plain
                  @click="doDelete(i)">
                  删除
                </el-button>
              </template>

              <template #title-extra-error>
                <el-space>
                  <el-button
                    v-if="i.builtin && i.builtinUpdated"
                    :icon="Delete"
                    type="danger"
                    size="small"
                    plain
                    @click="doDelete(i)">
                    卸载更新
                  </el-button>
                  <el-button
                    v-else-if="!i.builtin"
                    :icon="Delete"
                    type="danger"
                    size="small"
                    plain
                    @click="doDelete(i)">
                    删除
                  </el-button>
                </el-space>
              </template>

              <el-descriptions style="white-space: pre-line">
                <el-descriptions-item v-if="!i.official" :span="3" label="作者">{{
                  i.author || '&lt;佚名>'
                }}</el-descriptions-item>
                <el-descriptions-item :span="3" label="介绍">{{
                  i.desc || '&lt;暂无>'
                }}</el-descriptions-item>
                <el-descriptions-item v-if="!i.official" :span="3" label="主页">{{
                  i.homepage || '&lt;暂无>'
                }}</el-descriptions-item>
                <el-descriptions-item label="许可协议">{{
                  i.license || '&lt;暂无>'
                }}</el-descriptions-item>
                <el-descriptions-item label="安装时间">{{
                  dayjs.unix(i.installTime).fromNow()
                }}</el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ dayjs.unix(i.updateTime).fromNow() || '&lt;暂无>' }}
                </el-descriptions-item>
              </el-descriptions>

              <template #unfolded-extra>
                <el-text truncated>{{ i.desc || '&lt;暂无>' }}</el-text>
              </template>
            </foldable-card>

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
                  <!--<template #title>{{ selectedDangerousApiUsage.risk }}</template>-->
                  <template #default>
                    <!--{{ selectedDangerousApiUsage.description }}-->
                    这里只能列出源码里直接写出的调用位置和直接成员访问，无法完整追踪经变量别名转手后的所有调用。
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
                    <template #default="{ row }">{{ formatDangerousApiOccurrenceKind(row.kind) }}</template>
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
          </main>
        </el-tab-pane>

        <el-tab-pane label="插件设置" name="config">
          <main>
            <div v-if="size(jsConfig) === 0" style="display: flex; justify-content: center">
              <el-text size="large" tag="strong">暂无设置项</el-text>
            </div>
            <el-collapse v-else class="js-list-main" style="margin-top: 0.5rem">
              <el-collapse-item v-for="(config, i) in jsConfig" :key="i" class="js-item">
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
                          @change="doJsConfigChanged()"></el-input>
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
                            @change="doJsConfigChanged()"></el-input-number>
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
                            @change="doJsConfigChanged()"></el-input-number>
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
                            @change="doJsConfigChanged()"></el-switch>
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
                      <el-form-item
                        label="模板配置项:"
                        style="width: 100%; margin-bottom: 0.5rem"
                        >{{ (c as unknown as JsPluginConfigItem).key }}</el-form-item
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
                                  @change="doJsConfigChanged()"></el-input>
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
                                  :content="
                                    index === 0 ? '点击添加一项' : '点击删除你不想要的配置项'
                                  "
                                  placement="bottom-start">
                                  <el-icon>
                                    <circle-plus-filled
                                      v-if="index == 0"
                                      @click="
                                        doJsConfigAddItem(
                                          (c as unknown as JsPluginConfigItem).value,
                                        )
                                      " />
                                    <circle-close
                                      v-else
                                      @click="
                                        doJsConfigRemoveItemAt(
                                          (c as unknown as JsPluginConfigItem).value,
                                          index,
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
                      <el-form-item
                        label="选项配置项:"
                        style="width: 100%; margin-bottom: 0.5rem"
                        >{{ (c as unknown as JsPluginConfigItem).key }}</el-form-item
                      >
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
                          @change="doJsConfigChanged()">
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
    </el-col>
  </el-row>
</template>

<script lang="ts" setup>
import {
  BrushFilled,
  CaretRight,
  CircleClose,
  CirclePlusFilled,
  Delete,
  DeleteFilled,
  DocumentChecked,
  Download,
  Link,
  Refresh,
  Search,
  Upload,
} from '@element-plus/icons-vue';
import * as dayjs from 'dayjs';
import { basicSetup, EditorView } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { isEqual, size } from 'lodash-es';
import type {
  JsDangerousAPIOccurrence,
  JsDangerousAPIUsage,
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
  reloadJS,
  resetJsConfig,
  setJsConfigs,
  shutDownJS,
  updateJs,
  uploadJs,
} from '~/api/js';
import type { UploadRawFile } from 'element-plus';

const jsEnable = ref(false);
const editorBox = ref(null);
const mode = ref('console');
const needReload = ref(false);
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
const doJsConfigChanged = () => {
  jsConfigEdited.value = true;
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
    }, 1000);
  });
};
const doJsConfigAddItem = (arr: any[]) => {
  arr.push('');
  doJsConfigChanged();
  return arr;
};
const doJsConfigRemoveItemAt = <T,>(arr: T[], index: number) => {
  if (index < 0 || index >= arr.length) {
    return arr;
  }
  arr.splice(index, 1);
  doJsConfigChanged();
  return arr;
};

const doJsConfigSave = async () => {
  await setJsConfigs(jsConfig.value);
  jsConfigEdited.value = false;
  ElMessage.success('已保存');
};

let timerId: number;

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

  await refreshJsData();
  if (jsList.value.length > 0) {
    mode.value = 'list';
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
  clearInterval(timerId);
});

const jsList = ref<JsScriptInfo[]>([]);
const jsFilter = ref<string>('');
const dangerousApiDialogVisible = ref(false);
const selectedDangerousApiScript = ref<JsScriptInfo | null>(null);
const selectedDangerousApiUsage = ref<JsDangerousAPIUsage | null>(null);

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
  updateUrls: Array.isArray(script?.updateUrls) ? script.updateUrls : [],
  official: Boolean(script?.official),
  builtin: Boolean(script?.builtin),
  builtinUpdated: Boolean(script?.builtinUpdated),
  hasDangerousApiUsage: Boolean(script?.hasDangerousApiUsage),
  dangerousApiUsages: Array.isArray(script?.dangerousApiUsages)
    ? script.dangerousApiUsages.map(item => normalizeDangerousApiUsage(item))
    : [],
});

const jsFilterCount = computed(() => jsList.value.length - filteredJsList.value.length);
const filteredJsList = computed(() =>
  jsList.value.filter(js => {
    if (jsFilter.value === '') {
      return true;
    }
    const val = jsFilter.value.toLowerCase();
    return (
      js.name?.toLowerCase()?.includes(val) ||
      js.desc?.toLowerCase()?.includes(val) ||
      js.author?.toLowerCase()?.includes(val)
    );
  }),
);

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
  SendMailRow: '直接发送邮件，可指定主题、收件人、正文和附件。',
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
  const lst = await getJsList();
  jsList.value = Array.isArray(lst) ? lst.map(item => normalizeJsScriptInfo(item)) : [];
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
  try {
    await refreshConfig();
  } catch (err) {
    console.error('refresh js config failed:', err);
    ElMessage.warning('插件配置刷新失败，请手动刷新界面');
  }
};

const jsReload = async () => {
  const ret = await reloadJS();
  if (ret && ret.testMode) {
    ElMessage.success('展示模式无法重载脚本');
  } else {
    ElMessage.success('已重载');
    await refreshJsData();
    needReload.value = false;
  }
  jsEnable.value = await jsStatus();
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
  // UploadRawFile
  const fd = new FormData();
  fd.append('file', file);
  await uploadJs(file);
  refreshList();
  ElMessage.success('上传完成，请在全部操作完成后，手动重载插件');
  needReload.value = true;
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

const doCheckUpdate = async (data: any) => {
  diffLoading.value = true;
  const checkResult = await checkJsUpdate(data.filename);
  diffLoading.value = false;
  if (checkResult.result) {
    jsCheck.value = { ...checkResult, filename: data.filename };
    showDiff.value = true;
  } else {
    ElMessage.error('检查更新失败！' + checkResult.err);
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

.js-list-header {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
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
</style>
