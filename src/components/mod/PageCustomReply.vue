<template>
  <section class="workspace-page reply-workspace" aria-labelledby="reply-workspace-title">
    <header class="workspace-header reply-header">
      <div class="reply-heading">
        <h1 id="reply-workspace-title" class="workspace-title">自定义回复</h1>
        <p class="workspace-subtitle">管理回复文件、公共条件和按优先级执行的规则。</p>
      </div>
      <div class="reply-header-controls">
        <label class="workspace-toggle total-switch">
          <el-switch :model-value="replyEnable" aria-label="启用自定义回复" @change="switchClick" />
          <span>启用自定义回复</span>
        </label>
        <el-button
          :icon="QuestionFilled"
          class="reply-help-button"
          @click="dialogHelpVisible = true">
          变量与匹配帮助
        </el-button>
      </div>
    </header>

    <template v-if="replyEnable">
      <div class="reply-file-toolbar">
        <div v-if="curFilename && cr" class="reply-file-details">
          <label class="file-select">
            <span>当前文件</span>
            <el-select
              :model-value="curFilename"
              aria-label="当前回复文件"
              @change="switchReplyFile">
              <el-option
                v-for="item in fileItems"
                :key="item.filename"
                :label="item.filename"
                :value="item.filename" />
            </el-select>
          </label>
          <el-tag size="small" :type="currentReplyIsV2 ? 'success' : 'info'" effect="plain">
            {{ currentReplyIsV2 ? 'V2' : '未声明 / 跟随全局' }}
          </el-tag>
          <label class="file-enabled">
            <span>启用此文件</span>
            <el-switch v-model="cr.enable" />
          </label>
          <el-text v-if="!cr.enable" type="warning" size="small">此文件已停用</el-text>
          <el-alert
            v-if="currentReplyUsesGlobalV2"
            class="reply-version-warning"
            type="warning"
            :closable="false"
            show-icon
            title="该文件未声明 V2，但当前会按全局 V2 运行，旧语法可能不兼容。" />
        </div>

        <div class="workspace-actions reply-file-actions">
          <el-button :icon="DocumentAdd" @click="customReplyFileNew">新建文件</el-button>
          <el-button :icon="Tickets" :disabled="!curFilename" @click="dialogFormVisible = true">
            导入文本
          </el-button>
          <el-upload
            action=""
            class="reply-upload"
            :show-file-list="false"
            multiple
            accept=".yaml,.yml,.json,.jsonc,.hjson"
            :before-upload="beforeUpload"
            :file-list="uploadFileList">
            <el-button :icon="Upload">上传文件</el-button>
          </el-upload>
          <el-button
            v-if="curFilename"
            :icon="Download"
            tag="a"
            style="text-decoration: none"
            :href="`${urlBase}/sd-api/configs/custom_reply/file_download?name=${encodeURIComponent(curFilename)}&token=${encodeURIComponent(store.token)}`">
            下载文件
          </el-button>
          <el-button
            v-if="curFilename && !currentReplyIsV2"
            :icon="RefreshRight"
            @click="convertCurrentReplyToV2">
            转换为 V2
          </el-button>
          <el-button
            v-if="curFilename"
            type="danger"
            plain
            :icon="Delete"
            @click="customReplyFileDelete">
            删除文件
          </el-button>
        </div>
      </div>

      <template v-if="curFilename && cr">
        <details
          ref="commonConditionsRef"
          class="common-conditions"
          :class="{ 'is-disabled': !cr.enable }">
          <summary>
            <span class="common-title">公共条件</span>
            <span class="common-count">{{ conditions.length }} 项</span>
            <span class="common-description">应用于文件内所有规则；公共条件需全部满足。</span>
          </summary>
          <div class="common-conditions-content">
            <div class="common-conditions-actions">
              <el-text type="info" size="small"
                >每项公共条件都必须满足，之后再匹配规则自己的条件。</el-text
              >
              <el-button
                type="success"
                size="small"
                plain
                :icon="Plus"
                @click="addOneCondition(conditions)">
                添加公共条件
              </el-button>
            </div>
            <custom-reply-conditions v-model="conditions" />
            <el-text v-if="!conditions.length" type="info">当前无公共条件。</el-text>
          </div>
        </details>

        <div class="workspace-body reply-workspace-body">
          <aside
            class="rules-pane"
            :class="{ 'mobile-hidden': mobileStep === 'editor' }"
            aria-label="回复规则列表">
            <div class="rules-pane-heading">
              <div>
                <strong>规则</strong>
                <el-tag size="small" effect="plain">{{ list.length }}</el-tag>
              </div>
              <el-button size="small" type="primary" plain :icon="Plus" @click="addOne">
                新建规则
              </el-button>
            </div>
            <el-input
              v-model="ruleQuery"
              class="rule-search"
              clearable
              :prefix-icon="Search"
              placeholder="搜索条件或回复内容"
              aria-label="搜索回复规则" />
            <nav class="rules-list" aria-label="选择回复规则">
              <div
                v-for="{ rule, index } in filteredRules"
                :key="index"
                class="rule-row"
                :class="{ 'is-active': selectedRuleIndex === index }">
                <button
                  class="rule-select"
                  type="button"
                  :aria-pressed="selectedRuleIndex === index"
                  @click="selectRule(index)">
                  <span
                    class="rule-status"
                    :class="{ 'is-disabled': !rule.enable }"
                    aria-hidden="true"></span>
                  <span class="rule-copy">
                    <span class="rule-title">规则 {{ index + 1 }}</span>
                    <span class="rule-summary">{{ ruleSummary(rule) }}</span>
                    <span class="rule-meta">
                      {{ (rule.conditions || []).length }} 个条件 ·
                      {{ (rule.results || []).length }} 个结果
                    </span>
                  </span>
                </button>
                <div class="rule-order-controls" role="group" aria-label="调整规则优先级">
                  <el-button
                    text
                    :icon="ArrowUp"
                    :disabled="index === 0"
                    :aria-label="`将规则 ${index + 1} 上移`"
                    @click="moveRule(index, -1)" />
                  <el-button
                    text
                    :icon="ArrowDown"
                    :disabled="index === list.length - 1"
                    :aria-label="`将规则 ${index + 1} 下移`"
                    @click="moveRule(index, 1)" />
                </div>
              </div>
              <el-empty
                v-if="!filteredRules.length"
                :description="list.length ? '没有符合搜索条件的规则' : '当前文件没有规则'"
                :image-size="64">
                <el-button v-if="!list.length" type="primary" @click="addOne">新建规则</el-button>
              </el-empty>
            </nav>
          </aside>

          <section
            class="editor-pane"
            :class="{ 'mobile-hidden': mobileStep === 'rules' }"
            aria-label="回复规则编辑器">
            <div v-if="!selectedRule" class="reply-empty">
              <el-empty description="选择一条规则开始编辑，或创建新规则">
                <el-button type="primary" :icon="Plus" @click="addOne">新建规则</el-button>
              </el-empty>
            </div>
            <template v-else>
              <header class="rule-editor-heading">
                <el-button class="mobile-back" :icon="ArrowLeft" @click="mobileStep = 'rules'">
                  返回规则
                </el-button>
                <div class="rule-heading-copy">
                  <h2>规则 {{ selectedRuleIndex + 1 }}</h2>
                  <p :title="ruleSummary(selectedRule)">{{ ruleSummary(selectedRule) }}</p>
                </div>
                <div class="rule-heading-actions">
                  <label class="rule-enabled">
                    <span>规则启用</span>
                    <el-switch v-model="selectedRule.enable" />
                  </label>
                  <el-button type="danger" plain :icon="Delete" @click="deleteSelectedRule">
                    删除规则
                  </el-button>
                </div>
              </header>

              <details class="rule-variable-help">
                <summary>变量与规则执行说明</summary>
                <p>
                  公共条件和本规则的条件都需要同时满足（AND）。匹配到本规则后停止后续规则匹配，结果按顺序执行。
                </p>
                <p>
                  匹配文本使用 <code>$t0</code>；正则捕获组使用 <code>$t1</code>、<code>$t2</code>
                  等，命名组可使用对应名称。自定义回复使用高级设置中的统一冷却时间。
                </p>
              </details>

              <nested-draggable :tasks="selectedRuleItems" focused />
            </template>
          </section>
        </div>
      </template>

      <el-empty v-else-if="loadingFiles" description="正在读取回复文件…" />
      <el-empty v-else-if="fileListError" description="读取回复文件列表失败">
        <el-button type="primary" @click="loadReplyFiles">重试</el-button>
      </el-empty>
      <el-empty v-else-if="fileItems.length" description="无法读取当前回复文件">
        <el-button type="primary" @click="loadReplyFile(fileItems[0].filename)">重试</el-button>
      </el-empty>
      <el-empty v-else description="当前没有自定义回复文件">
        <el-button type="primary" :icon="DocumentAdd" @click="customReplyFileNew">
          新建回复文件
        </el-button>
      </el-empty>

      <footer
        v-if="cr && curFilename && (modified || saving || savedFeedback)"
        class="workspace-savebar reply-savebar">
        <span class="save-status" :class="{ 'is-dirty': modified }" role="status">
          <span class="save-dot" aria-hidden="true"></span>
          {{ saving ? '正在保存…' : modified ? '有未保存的修改' : '已保存' }}
        </span>
        <el-button
          type="primary"
          :icon="DocumentChecked"
          :disabled="!modified || saving"
          :loading="saving"
          @click="doSave()">
          保存
        </el-button>
      </footer>
    </template>

    <div v-else class="workspace-panel workspace-empty reply-disabled-state">
      <strong>自定义回复未启用</strong>
      <p>启用后，可以按关键词、正则等条件让骰子自动回复。</p>
      <el-button type="primary" @click="switchClick(true)">启用自定义回复</el-button>
    </div>

    <el-dialog
      v-model="dialogHelpVisible"
      title="变量与匹配帮助"
      width="min(640px, calc(100vw - 32px))"
      align-center>
      <div class="reply-help-content">
        <p>规则按列表顺序匹配；命中一条后立即停止继续匹配，并按顺序执行该规则的结果。</p>
        <p>公共条件与规则条件都必须同时满足（AND）。</p>
        <p>
          匹配文本存入 <code>$t0</code>，正则捕获组存入 <code>$t1</code>、<code>$t2</code>
          等；正则命名组也可通过对应名称访问，例如 <code>$tA</code>。
        </p>
        <p>自定义回复共用“高级设置”中的冷却时间。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="dialogHelpVisible = false">知道了</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogFormVisible"
      title="导入配置"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="the-dialog">
      <el-input
        v-model="configForImport"
        placeholder="支持格式: 关键字/回复语"
        class="reply-text"
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 10 }" />

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogFormVisible = false">取消</el-button>
          <el-button type="primary" :disabled="configForImport === ''" @click="doImport">
            下一步
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="createDialogVisible"
      title="新建自定义回复"
      :close-on-click-modal="false"
      width="min(420px, calc(100vw - 32px))"
      class="the-dialog">
      <el-form label-position="top" @submit.prevent="submitCustomReplyFileNew">
        <el-form-item label="文件名">
          <el-input v-model="newReplyFilename" placeholder="reply2.yaml" autofocus />
        </el-form-item>
        <el-form-item label="VM 版本">
          <el-radio-group v-model="newReplyVMVersion">
            <el-radio-button value="v2">V2</el-radio-button>
            <el-radio-button value="v1">V1 / 跟随全局</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-alert
          v-if="newReplyVMVersion === 'v1'"
          type="warning"
          :closable="false"
          show-icon
          title="不写入 V2 声明，将跟随全局 VMVersionForReply；按 V2 运行时可能不兼容。" />
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="creatingReply" @click="submitCustomReplyFileNew">
            创建
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogLicenseVisible"
      title="许可协议"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="the-dialog">
      <pre class="license-copy">
尊敬的用户，欢迎您选择由木落等研发的余烬骰点核心（Scardice），在您使用自定义功能前，请务必仔细阅读使用须知，当您使用我们提供的服务时，即代表您已同意使用须知的内容。

  您需了解，余烬核心官方版只支持 TRPG 功能，娱乐功能定制化请自便，和余烬无关。
  您清楚并明白您对通过骰子提供的全部内容负责，包括自定义回复、非自带的插件、牌堆。余烬骰不对非自身提供以外的内容合法性负责。您不得在使用余烬骰服务时，导入包括但不限于以下情形的内容：
  (1) 反对中华人民共和国宪法所确定的基本原则的；
  (2) 危害国家安全，泄露国家秘密，颠覆国家政权，破坏国家统一的；
  (3) 损害国家荣誉和利益的；
  (4) 煽动民族仇恨、民族歧视、破坏民族团结的；
  (5) 破坏国家宗教政策，宣扬邪教和封建迷信的；
  (6) 散布谣言，扰乱社会秩序，破坏社会稳定的；
  (7) 散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的；
  (8) 侮辱或者诽谤他人，侵害他人合法权益的；
  (9) 宣扬、教唆使用外挂、私服、病毒、恶意代码、木马及其相关内容的；
  (10) 侵犯他人知识产权或涉及第三方商业秘密及其他专有权利的；
  (11) 散布任何贬损、诋毁、恶意攻击余烬骰及开发人员、海洋馆工作人员、mod 编写人员、关联合作者的；
  (12) 含有中华人民共和国法律、行政法规、政策、上级主管部门下发通知中所禁止的其他内容的。

  一旦查实您有以上禁止行为，请立即停用余烬骰。同时我们也会主动对你进行举报。</pre
      >

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogLicenseVisible = false">我同意</el-button>
          <el-button @click="licenseRefuse">我拒绝</el-button>
        </span>
      </template>
    </el-dialog>
  </section>
</template>

<script lang="ts" setup>
import { urlBase } from '~/api';
import { useStore } from '~/store';
import nestedDraggable from '../utils/nested.vue';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Delete,
  DocumentAdd,
  DocumentChecked,
  Download,
  Plus,
  RefreshRight,
  QuestionFilled,
  Search,
  Tickets,
  Upload,
} from '@element-plus/icons-vue';
import { ElCheckbox } from 'element-plus';
import {
  getCustomReply,
  getCustomReplyFileList,
  postCustomReplyDel,
  postCustomReplyNew,
  type ReplyVMVersion,
  saveCustomReply,
  uploadCustomReply,
} from '~/api/configs';
import type { DiceConfig } from '~/api/dice';
import { confirmUploadTargetMatch } from '~/utils/upload-classifier';
import { formatUploadFailureMessage } from '~/utils/upload-error';
const createDialogVisible = ref(false);
const newReplyFilename = ref('');
const newReplyVMVersion = ref<ReplyVMVersion>('v2');
const creatingReply = ref(false);
const conversionAcknowledged = ref(false);

const store = useStore();
const dialogFormVisible = ref(false);
const dialogLicenseVisible = ref(false);
const dialogHelpVisible = ref(false);
const configForImport = ref('');

const replyEnable = computed(() => store.curDice.config.customReplyConfigEnable);

const switchClick = (value: boolean | string | number) => {
  const enabled = value === true;
  store.diceConfigSet({ customReplyConfigEnable: enabled } as DiceConfig);
  if (enabled) {
    dialogLicenseVisible.value = true;
  }
};

const licenseRefuse = () => {
  dialogLicenseVisible.value = false;
  store.curDice.config.customReplyConfigEnable = false;
  store.diceConfigSet({ customReplyConfigEnable: false } as DiceConfig);
};

const curFilename = ref('');
const conditions = ref<any[]>([]);
const list = ref<any[]>([]);
const fileItems = ref<any[]>([]);
const uploadFileList = ref<any[]>([]);
const cr = ref<any>(null);
const loadingFiles = ref(true);
const fileListError = ref(false);
const modified = ref(false);
const saving = ref(false);
const savedFeedback = ref(false);
let savedFeedbackTimer: ReturnType<typeof setTimeout> | undefined;
let editRevision = 0;

function clearSavedFeedback(): void {
  if (savedFeedbackTimer) clearTimeout(savedFeedbackTimer);
  savedFeedbackTimer = undefined;
  savedFeedback.value = false;
}

function showSavedFeedback(): void {
  clearSavedFeedback();
  savedFeedback.value = true;
  savedFeedbackTimer = setTimeout(() => {
    savedFeedback.value = false;
    savedFeedbackTimer = undefined;
  }, 3000);
}

onBeforeUnmount(clearSavedFeedback);
const selectedRuleIndex = ref(-1);
const mobileStep = ref<'rules' | 'editor'>('rules');
const ruleQuery = ref('');
const commonConditionsRef = ref<HTMLDetailsElement | null>(null);

const currentReplyIsV2 = computed(() => cr.value?.vmVersion === 'v2');
const currentReplyUsesGlobalV2 = computed(
  () => !!cr.value && !currentReplyIsV2.value && store.curDice.config.VMVersionForReply === 'v2',
);
const selectedRule = computed(() => list.value[selectedRuleIndex.value] ?? null);
const selectedRuleItems = computed(() => (selectedRule.value ? [selectedRule.value] : []));
const filteredRules = computed(() => {
  const query = ruleQuery.value.trim().toLocaleLowerCase();
  return list.value
    .map((rule, index) => ({ rule, index }))
    .filter(
      ({ rule, index }) =>
        !query || ruleSearchText(rule, index).toLocaleLowerCase().includes(query),
    );
});

function ruleSearchText(rule: any, index: number): string {
  const conditions = (rule.conditions || []).map(
    (condition: any) =>
      `${condition.condType ?? ''} ${condition.matchType ?? ''} ${condition.matchOp ?? ''} ${condition.value ?? ''}`,
  );
  const replies = (rule.results || []).flatMap((result: any) =>
    (result.message || []).map((reply: any[]) => reply[0] ?? ''),
  );
  return `规则 ${index + 1} ${ruleSummary(rule)} ${conditions.join(' ')} ${replies.join(' ')}`;
}

watch(
  [() => cr.value, () => conditions.value],
  () => {
    if (cr.value && curFilename.value) {
      editRevision++;
      modified.value = true;
      clearSavedFeedback();
    }
  },
  { deep: true },
);

function ruleSummary(rule: any): string {
  const condition = rule?.conditions?.[0];
  if (!condition) return '未设置规则条件';
  if (condition.condType === 'textMatch') {
    const matchNames: Record<string, string> = {
      matchExact: '精确',
      matchMulti: '任一',
      matchContains: '包含',
      matchNotContains: '不含',
      matchFuzzy: '模糊',
      matchRegex: '正则',
      matchPrefix: '前缀',
      matchSuffix: '后缀',
    };
    return `${matchNames[condition.matchType] ?? '文本'}：${String(condition.value ?? '').replace(/\s+/g, ' ')}`;
  }
  if (condition.condType === 'exprTrue') {
    return `表达式：${String(condition.value ?? '').replace(/\s+/g, ' ')}`;
  }
  if (condition.condType === 'textLenLimit') {
    return `文本长度${condition.matchOp === 'le' ? ' ≤ ' : ' ≥ '}${condition.value ?? 0}`;
  }
  return '自定义条件';
}

const clearCurrentReply = () => {
  curFilename.value = '';
  clearSavedFeedback();
  cr.value = null;
  conditions.value = [];
  list.value = [];
  selectedRuleIndex.value = -1;
  modified.value = false;
  mobileStep.value = 'rules';
};

const loadReplyFile = async (filename: string) => {
  clearSavedFeedback();
  if (!filename) {
    clearCurrentReply();
    return true;
  }
  try {
    const ret = await getCustomReply(filename);
    cr.value = ret;
    conditions.value = ret.conditions ?? [];
    list.value = ret.items ?? [];
    curFilename.value = filename;
    selectedRuleIndex.value = list.value.length ? 0 : -1;
    ruleQuery.value = '';
    mobileStep.value = 'rules';
    await nextTick();
    modified.value = false;
    return true;
  } catch {
    ElMessage.error(`读取回复文件失败：${filename}`);
    return false;
  }
};

const prepareFileSwitch = async () => {
  if (!modified.value) return true;
  try {
    await ElMessageBox.confirm(
      '当前文件有未保存的修改。选择“保存后切换”以保留修改，或选择“放弃修改并切换”重新载入已保存内容。',
      '未保存的修改',
      {
        confirmButtonText: '保存后切换',
        cancelButtonText: '放弃修改并切换',
        distinguishCancelAndClose: true,
        type: 'warning',
      },
    );
    return await doSave();
  } catch (action) {
    if (action !== 'cancel') return false;
    return loadReplyFile(curFilename.value);
  }
};

const switchReplyFile = async (filename: string) => {
  if (!filename || filename === curFilename.value) return;
  if (!(await prepareFileSwitch())) return;
  await loadReplyFile(filename);
};

const customReplyFileNew = () => {
  newReplyFilename.value = `reply${Math.ceil(Math.random() * 10000)}.yaml`;
  newReplyVMVersion.value = 'v2';
  createDialogVisible.value = true;
};

const submitCustomReplyFileNew = async () => {
  const filename = newReplyFilename.value.trim() || `reply${Math.ceil(Math.random() * 10000)}.yaml`;
  creatingReply.value = true;
  try {
    const ret = await postCustomReplyNew(filename, newReplyVMVersion.value);
    if (!ret.success) {
      ElMessage.error('创建失败，可能存在同名文件');
      return;
    }
    const fileList = await getCustomReplyFileList();
    fileItems.value = fileList.items;
    createDialogVisible.value = false;
    ElMessage.success('创建成功');
    await switchReplyFile(filename);
  } catch {
    ElMessage.error('创建失败或文件列表读取失败');
  } finally {
    creatingReply.value = false;
  }
};

const convertCurrentReplyToV2 = async () => {
  if (!cr.value) return;
  conversionAcknowledged.value = false;
  try {
    await ElMessageBox.confirm(
      h('div', { style: 'line-height: 1.5' }, [
        h(
          'p',
          { style: 'margin: 0 0 0.75rem' },
          '转换只会为当前文件写入 V2 声明，不会自动改写已有表达式。V1 语法可能与 V2 不兼容，是否继续？',
        ),
        h(
          ElCheckbox,
          {
            onChange: (value: boolean | string | number) => {
              conversionAcknowledged.value = value === true;
            },
          },
          { default: () => '此操作不可逆' },
        ),
      ]),
      '转换为 V2',
      {
        confirmButtonText: '转换并保存',
        cancelButtonText: '取消',
        type: 'warning',
        beforeClose: (action, _instance, done) => {
          if (action === 'confirm' && !conversionAcknowledged.value) {
            ElMessage.warning('请先勾选“此操作不可逆”');
            return;
          }
          done();
        },
      },
    );
    const previousVMVersion = cr.value.vmVersion;
    cr.value.vmVersion = 'v2';
    const saved = await doSave('已转换为 V2');
    if (!saved) {
      cr.value.vmVersion = previousVMVersion;
    }
  } catch {
    // 用户取消转换。
  }
};

const customReplyFileDelete = async () => {
  if (!curFilename.value) return;
  const filename = curFilename.value;
  const warning = modified.value
    ? '是否删除此文件？当前未保存的修改也会一并丢弃。'
    : '是否删除此文件？';
  try {
    await ElMessageBox.confirm(warning, '删除自定义回复文件', {
      confirmButtonText: '删除文件',
      cancelButtonText: '取消',
      type: 'warning',
    });
    const result = await postCustomReplyDel(filename);
    if (!result.success) {
      ElMessage.error('删除失败');
      return;
    }
    clearCurrentReply();
    const fileList = await getCustomReplyFileList();
    fileItems.value = fileList.items;
    if (fileItems.value.length) {
      await loadReplyFile(fileItems.value[0].filename);
    }
    ElMessage.success('文件已删除');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      if (!curFilename.value) fileListError.value = true;
      ElMessage.error('删除失败或回复文件列表读取失败');
    }
  }
};

const beforeUpload = async (file: any) => {
  if (!(await confirmUploadTargetMatch(file, 'customReply')).proceed) {
    return false;
  }
  if (!(await prepareFileSwitch())) return false;

  try {
    await uploadCustomReply(file);
    const fileList = await getCustomReplyFileList();
    fileItems.value = fileList.items;
    ElMessage.success('上传完成');
    if (await loadReplyFile(file.name)) {
      ElMessage.success(`已切换到新文件: ${file.name}`);
    }
  } catch (error) {
    ElMessage.error(formatUploadFailureMessage(error));
  }
  return false;
};

const addOneCondition = (items: any[]) => {
  items.push({
    condType: 'textMatch',
    matchType: 'matchExact',
    value: '要匹配的文本',
  });
  if (commonConditionsRef.value) commonConditionsRef.value.open = true;
};

const addOne = () => {
  if (!cr.value) return;
  list.value.push({
    enable: true,
    conditions: [{ condType: 'textMatch', matchType: 'matchExact', value: '要匹配的文本' }],
    results: [{ resultType: 'replyToSender', delay: 0, message: [['说点什么', 1]] }],
  });
  selectedRuleIndex.value = list.value.length - 1;
  mobileStep.value = 'editor';
};

const selectRule = (index: number) => {
  selectedRuleIndex.value = index;
  mobileStep.value = 'editor';
};

const moveRule = (index: number, direction: -1 | 1) => {
  const target = index + direction;
  if (target < 0 || target >= list.value.length) return;
  const [rule] = list.value.splice(index, 1);
  list.value.splice(target, 0, rule);
  if (selectedRuleIndex.value === index) {
    selectedRuleIndex.value = target;
  } else if (
    direction < 0 &&
    selectedRuleIndex.value >= target &&
    selectedRuleIndex.value < index
  ) {
    selectedRuleIndex.value += 1;
  } else if (
    direction > 0 &&
    selectedRuleIndex.value > index &&
    selectedRuleIndex.value <= target
  ) {
    selectedRuleIndex.value -= 1;
  }
};

const deleteSelectedRule = async () => {
  if (selectedRuleIndex.value < 0) return;
  try {
    await ElMessageBox.confirm('确认删除当前回复规则？', '删除规则', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    list.value.splice(selectedRuleIndex.value, 1);
    selectedRuleIndex.value = list.value.length
      ? Math.min(selectedRuleIndex.value, list.value.length - 1)
      : -1;
    if (selectedRuleIndex.value < 0) mobileStep.value = 'rules';
  } catch {
    // 用户取消删除。
  }
};

const doSave = async (successMessage = '已保存') => {
  if (!cr.value || !curFilename.value || saving.value) return false;
  saving.value = true;
  clearSavedFeedback();
  try {
    for (const item of list.value) {
      for (const condition of item.conditions || []) {
        if (condition.condType === 'textLenLimit') {
          condition.value = parseInt(condition.value) || 0;
        }
      }

      for (const result of item.results || []) {
        if (result.delay) {
          result.delay = parseFloat(result.delay);
          if (result.delay < 0) result.delay = 0;
        }
        if (!result.delay) result.delay = 0;
      }
    }
    cr.value.filename = curFilename.value;
    cr.value.items = list.value;
    cr.value.conditions = conditions.value;
    for (const condition of cr.value.conditions) {
      if (condition.condType === 'textLenLimit') {
        condition.value = parseInt(condition.value) || 0;
      }
    }
    await nextTick();
    const savedRevision = editRevision;
    await saveCustomReply(cr.value);
    ElMessage.success(successMessage);
    if (editRevision === savedRevision) {
      modified.value = false;
      showSavedFeedback();
    }
    return !modified.value;
  } catch {
    ElMessage.error('保存失败！！');
    return false;
  } finally {
    saving.value = false;
  }
};

function parseString(str: string): [string[], string[], string] {
  const leftArr: string[] = [];
  const rightArr: string[] = [];
  let restIndex = 0;

  let currentStr = '';
  let isLeft = true;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    restIndex = i;
    if (isEscaped) {
      if (char !== '\r' && char !== '\n' && char !== '/') {
        currentStr += '\\'; // 如果是被转义的字符，将反斜杠保留
      }
      if (char === 'n' || char === 'r') {
        currentStr = currentStr.slice(0, -1) + '\n';
      } else {
        currentStr += char;
      }
      isEscaped = false;
      continue;
    }
    if (char === '\n') {
      break;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '|') {
      if (isLeft) {
        leftArr.push(currentStr);
      } else {
        rightArr.push(currentStr);
      }
      currentStr = '';
    } else if (char === '/') {
      if (i < str.length - 1 && str[i + 1] === '|') {
        currentStr += char;
      } else {
        if (isLeft) {
          leftArr.push(currentStr);
        } else {
          rightArr.push(currentStr);
        }
        currentStr = '';
        isLeft = false;
      }
    } else {
      currentStr += char;
    }
  }
  // 处理最后一个字符串
  if (isLeft) {
    leftArr.push(currentStr);
  } else {
    rightArr.push(currentStr);
  }

  return [leftArr, rightArr, str.slice(restIndex + 1)];
}

const doImport = () => {
  if (!curFilename.value) return;
  const initialLength = list.value.length;
  let text = configForImport.value;

  while (true) {
    const [left, right, rest] = parseString(text);
    if (left.length && right.length) {
      const replies = right.map(value => [value, 1]);
      list.value.push({
        enable: true,
        conditions: [
          {
            condType: 'textMatch',
            matchType: 'matchMulti',
            value: left.join('|'),
          },
        ],
        results: [{ resultType: 'replyToSender', delay: 0, message: replies }],
      });
    }
    text = rest;
    if (!rest) break;
  }

  if (list.value.length > initialLength) {
    selectedRuleIndex.value = list.value.length - 1;
    mobileStep.value = 'editor';
  }
  ElMessage.success('导入成功！');
  configForImport.value = '';
  dialogFormVisible.value = false;
};

const loadReplyFiles = async () => {
  loadingFiles.value = true;
  fileListError.value = false;
  try {
    await store.diceConfigGet();
    const result = await getCustomReplyFileList();
    fileItems.value = result.items ?? [];
    if (fileItems.value.length) {
      await loadReplyFile(fileItems.value[0].filename);
    } else {
      clearCurrentReply();
    }
  } catch {
    fileListError.value = true;
    ElMessage.error('读取自定义回复文件列表失败');
  } finally {
    loadingFiles.value = false;
  }
};

onBeforeMount(loadReplyFiles);
</script>

<style scoped>
.reply-text > textarea {
  max-height: 65vh;
}

.reply-workspace {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.reply-header {
  align-items: center;
}

.reply-heading {
  min-width: 0;
}

.reply-heading .workspace-subtitle {
  margin: 4px 0 0;
}

.reply-header-controls,
.total-switch,
.reply-file-details,
.reply-file-actions,
.file-enabled,
.rule-heading-actions,
.rule-enabled {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reply-header-controls {
  flex-wrap: wrap;
}

.total-switch,
.file-enabled,
.rule-enabled {
  color: var(--el-text-color-regular);
  font-size: 13px;
  white-space: nowrap;
}

.common-conditions > summary,
.rule-variable-help > summary {
  min-height: 40px;
  color: var(--el-color-primary);
  cursor: pointer;
}

.reply-help-content {
  color: var(--el-text-color-primary);
  line-height: 1.55;
}

.reply-help-content p {
  margin: 0.35rem 0;
}

.reply-file-toolbar {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 18px;
  padding: 9px 0;
  border-block: 1px solid var(--el-border-color-lighter);
}

.reply-file-details {
  min-width: 0;
  flex-wrap: wrap;
}

.file-select {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.file-select :deep(.el-select) {
  width: min(260px, 45vw);
}

.reply-file-actions {
  align-items: center;
  flex-wrap: wrap;
}

.reply-file-actions :deep(.el-button) {
  margin: 0;
}

.reply-upload,
.reply-upload :deep(.el-upload) {
  display: flex;
  align-items: center;
  line-height: 0;
}

.reply-version-warning {
  flex: 1 1 100%;
}

.common-conditions {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.common-conditions > summary {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  color: var(--el-text-color-primary);
  list-style-position: inside;
}

.common-title {
  font-weight: 600;
}

.common-count,
.common-description {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.common-conditions-content {
  max-height: min(32vh, 320px);
  overflow: auto;
  padding: 0 8px 10px;
}

.common-conditions-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0 8px;
}

.common-conditions.is-disabled {
  opacity: 0.75;
}

.reply-workspace-body {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}

.rules-pane {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-inline-end: 1px solid var(--el-border-color-lighter);
  background: var(--seal-surface-soft);
}

.rules-pane-heading {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px 6px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rules-pane-heading > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-search {
  flex: 0 0 auto;
  padding: 8px;
}

.rules-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  overflow: auto;
  padding: 4px 6px 10px;
}

.rule-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 2px;
  border-radius: var(--el-border-radius-base);
}

.rule-row.is-active {
  background: var(--seal-panel-bg);
  box-shadow: inset 2px 0 var(--el-color-primary);
}

.rule-select {
  display: flex;
  min-width: 0;
  min-height: var(--workspace-row-height, 40px);
  flex: 1 1 auto;
  align-items: flex-start;
  gap: 9px;
  padding: 8px 5px 8px 10px;
  border: 0;
  border-radius: var(--el-border-radius-base);
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.rule-select:hover {
  background: var(--el-fill-color-light);
}

.rule-row.is-active .rule-select:hover {
  background: transparent;
}

.rule-select:focus-visible,
.rule-order-controls :deep(.el-button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.rule-status,
.save-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--el-color-success);
}

.rule-status.is-disabled {
  background: var(--el-text-color-placeholder);
}

.rule-copy {
  display: grid;
  min-width: 0;
  flex: 1 1 auto;
  gap: 3px;
}

.rule-title {
  font-size: 13px;
  font-weight: 600;
}

.rule-summary,
.rule-meta {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-order-controls {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  padding-inline-end: 3px;
}

.rule-order-controls :deep(.el-button) {
  width: 30px;
  height: 28px;
  margin: 0;
}

.editor-pane {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 14px 18px 20px;
}

.reply-empty {
  display: grid;
  min-height: 100%;
  place-items: center;
}

.rule-editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rule-heading-copy {
  min-width: 0;
}

.rule-heading-copy h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 17px;
  font-weight: 600;
}

.rule-heading-copy p {
  overflow: hidden;
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-heading-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.rule-variable-help {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.rule-variable-help > summary {
  display: flex;
  align-items: center;
}

.rule-variable-help p {
  margin: 0.4rem 0;
}

.rule-variable-help code,
.reply-help-content code {
  color: var(--el-color-primary);
}

.mobile-back {
  display: none;
}

.reply-savebar {
  display: flex;
  min-height: 48px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0 0;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--seal-surface-bg);
}

.save-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-success);
  font-size: 12px;
}

.save-status.is-dirty {
  color: var(--el-color-warning);
}

.save-dot {
  width: 7px;
  height: 7px;
  margin: 0;
}

.save-status.is-dirty .save-dot {
  background: var(--el-color-warning);
}

.license-copy {
  max-height: 65vh;
  overflow: auto;
  white-space: pre-wrap;
}

.disabled {
  filter: grayscale(1);
  cursor: not-allowed;
  user-select: none;
}

@media (max-width: 767px) {
  .reply-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .reply-header-controls {
    width: 100%;
    justify-content: space-between;
  }

  .reply-help-button {
    min-height: 44px;
  }

  .reply-file-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .reply-file-details,
  .reply-file-actions {
    width: 100%;
  }

  .reply-file-details {
    gap: 8px;
  }

  .file-select {
    flex: 1 1 100%;
  }

  .file-select :deep(.el-select) {
    width: min(100%, 65vw);
    flex: 1 1 auto;
  }

  .reply-file-actions {
    gap: 6px;
  }

  .reply-file-actions :deep(.el-button) {
    min-height: 44px;
    padding-inline: 10px;
  }

  .common-conditions > summary {
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  .common-description {
    flex-basis: 100%;
    padding-inline-start: 1rem;
  }

  .common-conditions-content {
    max-height: 25vh;
    padding-inline: 2px;
  }

  .common-conditions-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .reply-workspace-body {
    display: flex;
    flex-direction: column;
  }

  .rules-pane,
  .editor-pane {
    min-height: 0;
    flex: 1 1 auto;
  }

  .rules-pane.mobile-hidden,
  .editor-pane.mobile-hidden {
    display: none;
  }

  .rules-pane {
    border-inline-end: 0;
  }

  .rule-select {
    min-height: 64px;
    align-items: center;
    padding-block: 10px;
  }

  .rule-status {
    margin-top: 0;
  }

  .rule-title {
    font-size: 14px;
  }

  .rule-summary,
  .rule-meta {
    font-size: 12px;
  }

  .rule-order-controls :deep(.el-button) {
    width: 44px;
    height: 44px;
  }

  .editor-pane {
    padding: 10px 12px 16px;
  }

  .rule-editor-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .mobile-back {
    display: inline-flex;
    min-height: 44px;
    flex: 0 0 auto;
  }

  .rule-heading-copy {
    flex: 1 1 100%;
    order: 2;
  }

  .rule-heading-actions {
    flex: 1 1 auto;
    justify-content: flex-end;
    order: 3;
  }

  .rule-enabled {
    font-size: 14px;
  }

  .rule-variable-help > summary {
    min-height: 44px;
  }

  .reply-savebar {
    position: sticky;
    z-index: 3;
    bottom: 0;
    min-height: 60px;
    padding: 8px 0 max(8px, env(safe-area-inset-bottom));
    background: var(--seal-panel-bg);
  }

  .reply-savebar :deep(.el-button) {
    min-height: 44px;
  }

  .common-conditions > summary {
    min-height: 44px;
  }

  .rules-pane-heading :deep(.el-button) {
    min-height: 44px;
  }

  .rule-search :deep(.el-input__inner) {
    font-size: 16px;
  }

  .total-switch,
  .file-enabled,
  .rule-enabled {
    min-height: 44px;
  }

  .editor-pane :deep(.el-button),
  .common-conditions-content :deep(.el-button) {
    min-height: 44px;
  }

  .editor-pane :deep(.el-radio-button__inner) {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
  }

  .common-conditions-content :deep(.el-radio-button__inner) {
    min-height: 44px;
  }

  .editor-pane :deep(.el-input__inner),
  .editor-pane :deep(.el-input__wrapper),
  .editor-pane :deep(.el-select__wrapper),
  .editor-pane :deep(.el-textarea__inner),
  .common-conditions-content :deep(.el-input__inner),
  .common-conditions-content :deep(.el-input__wrapper),
  .common-conditions-content :deep(.el-select__wrapper),
  .common-conditions-content :deep(.el-textarea__inner) {
    font-size: 16px;
  }
}
</style>
