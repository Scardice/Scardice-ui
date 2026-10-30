<template>
  <section class="workspace-page deck-workspace" aria-labelledby="deck-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="deck-workspace-title" class="workspace-title">牌堆管理</h1>
        <p class="workspace-subtitle">
          上传、更新和删除牌堆；支持 json / yaml / toml / deck 格式。
          <el-tooltip raw-content>
            <template #content>
              deck 牌堆：单文件带图的牌堆格式。牌堆内用 ./images/xxx.png 引用图片，<br />
              连同图片目录打包成 zip，再把扩展名改为 .deck 即可。<br />
              toml 牌堆：余烬支持的新格式，书写更友好，并支持云牌组等功能。
            </template>
            <el-icon class="deck-format-help" aria-label="牌堆格式说明"
              ><question-filled
            /></el-icon>
          </el-tooltip>
        </p>
      </div>
      <div class="workspace-actions">
        <el-button :icon="Refresh" @click="reloadDecks">重载牌堆</el-button>
        <el-upload
          class="upload"
          action=""
          multiple
          :show-file-list="false"
          :before-upload="beforeUpload"
          :file-list="fileList">
          <el-button type="primary" :icon="Upload">上传牌堆</el-button>
        </el-upload>
      </div>
    </header>

    <div class="workspace-toolbar deck-toolbar">
      <el-input
        v-model="filter"
        class="deck-search"
        :prefix-icon="Search"
        placeholder="搜索牌堆名称、作者、简介或牌组"
        aria-label="搜索牌堆"
        clearable />
      <span class="deck-count">
        {{
          filter ? `匹配 ${filtered.length} / ${data.length} 个牌堆` : `共 ${data.length} 个牌堆`
        }}
      </span>
      <el-link
        class="deck-more-link"
        :icon="Link"
        href="https://github.com/sealdice/draw"
        target="_blank"
        rel="noopener noreferrer">
        浏览牌堆仓库
      </el-link>
    </div>

    <div class="workspace-body workspace-scroll deck-list">
      <p v-if="filtered.length" class="deck-legend">
        实线标签是可直接抽取的牌组；虚线标签只供牌堆内部引用。
      </p>
      <div v-if="!loading && data.length === 0" class="workspace-panel workspace-empty">
        <strong>还没有牌堆</strong>
        <p>上传牌堆文件后，群内即可使用 .draw 抽取牌组。</p>
      </div>
      <div v-else-if="!loading && filtered.length === 0" class="workspace-panel workspace-empty">
        <strong>没有匹配“{{ filter }}”的牌堆</strong>
        <p>换个关键词，或清空搜索查看全部牌堆。</p>
        <el-button @click="filter = ''">清空搜索</el-button>
      </div>
      <foldable-card
        v-for="i in filtered"
        :key="i.filename"
        class="deck-item"
        :err-title="i.filename"
        :err-text="i.errText">
        <template #title>
          <el-space size="small" alignment="center" wrap>
            <el-text size="large" tag="b">{{ i.name }}</el-text>
            <el-text v-if="i.version" type="info">{{ i.version }}</el-text>
            <el-tag size="small" type="info" effect="plain" disable-transitions>
              {{ i.fileFormat }}
            </el-tag>
          </el-space>
        </template>

        <template #title-extra>
          <el-popconfirm
            v-if="i.updateUrls && i.updateUrls.length > 0"
            confirm-button-text="检查更新"
            cancel-button-text="取消"
            title="更新地址由牌堆作者提供，确认检查该牌堆的更新吗？"
            width="240"
            @confirm="doCheckUpdate(i)">
            <template #reference>
              <el-button :icon="Download" size="small" :loading="diffLoading">检查更新</el-button>
            </template>
          </el-popconfirm>
          <el-button :icon="Delete" type="danger" size="small" plain @click="doDelete(i)">
            删除
          </el-button>
        </template>

        <template #title-extra-error>
          <el-button :icon="Delete" type="danger" size="small" plain @click="doDelete(i)">
            删除
          </el-button>
        </template>

        <template #description>
          <el-space size="small" direction="vertical" alignment="normal">
            <el-text v-if="i.cloud" type="warning" size="small">
              <el-icon><MostlyCloudy /></el-icon>
              包含作者提供的云端内容，请自行确认来源可信。
            </el-text>
            <el-text v-if="i.fileFormat === 'jsonc'" type="info" size="small">
              <el-icon><Warning /></el-icon>
              此牌堆使用扩展 JSON（允许注释与尾逗号），而非标准 JSON。
            </el-text>
          </el-space>
        </template>

        <el-descriptions class="deck-meta" :column="3">
          <el-descriptions-item :span="3" label="作者">{{
            i.author || '佚名'
          }}</el-descriptions-item>
          <el-descriptions-item v-if="i.desc" :span="3" label="简介">{{
            i.desc
          }}</el-descriptions-item>
          <el-descriptions-item :span="3" label="牌组">
            <span class="deck-tags">
              <el-tag
                v-for="(visible, c) of i.command"
                :key="c"
                size="small"
                :class="{ 'deck-tag-internal': !visible }"
                :type="visible ? 'primary' : 'info'"
                :title="visible ? undefined : '仅供牌堆内部引用'"
                effect="plain"
                disable-transitions>
                {{ c }}
              </el-tag>
            </span>
          </el-descriptions-item>
          <el-descriptions-item v-if="i.license" label="许可协议">{{
            i.license
          }}</el-descriptions-item>
          <el-descriptions-item v-if="i.date" label="发布时间">{{ i.date }}</el-descriptions-item>
          <el-descriptions-item v-if="i.updateDate" label="更新时间">
            {{ i.updateDate }}
          </el-descriptions-item>
        </el-descriptions>

        <template #unfolded-extra>
          <span class="deck-tags">
            <span class="deck-tags-label">可抽取牌组</span>
            <template v-for="(visible, c) of i.command" :key="c">
              <el-tag v-if="visible" size="small" effect="plain" disable-transitions>{{
                c
              }}</el-tag>
            </template>
          </span>
        </template>
      </foldable-card>
    </div>

    <el-dialog
      v-model="showDiff"
      title="对比牌堆更新内容"
      width="min(960px, calc(100vw - 32px))"
      class="diff-dialog">
      <diff-viewer :lang="deckCheck.format" :old="deckCheck.old" :new="deckCheck.new" />
      <template #footer>
        <el-button @click="showDiff = false">取消</el-button>
        <el-button
          v-if="!(deckCheck.old === deckCheck.new)"
          type="primary"
          :icon="DocumentChecked"
          @click="deckUpdate">
          应用更新
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script lang="ts" setup>
import {
  QuestionFilled,
  Upload,
  Download,
  Refresh,
  Search,
  Link,
  Delete,
  MostlyCloudy,
  DocumentChecked,
  Warning,
} from '@element-plus/icons-vue';
import { getBackupConfig } from '~/api/backup';
import {
  checkDeckUpdate,
  deleteDeck,
  getDeckList,
  reloadDeck,
  updateDeck,
  uploadDeck,
} from '~/api/deck';
import type { UploadRawFile } from 'element-plus/es/components/upload/src/upload.mjs';
import { confirmUploadTargetMatch } from '~/utils/upload-classifier';
import { formatUploadFailureMessage } from '~/utils/upload-error';

const loading = ref(true);

const filter = ref<string>('');
const data = ref<any[]>([]);
const filtered = computed(() =>
  data.value.filter(deck => {
    if (filter.value === '') {
      return true;
    }
    const val = filter.value.toLowerCase();
    return (
      deck.name?.toLowerCase()?.includes(val) ||
      deck.desc?.toLowerCase()?.includes(val) ||
      deck.author?.toLowerCase()?.includes(val) ||
      Object.keys(deck.command)
        .map(tag => tag?.toLowerCase()?.includes(val))
        .includes(true)
    );
  }),
);

const cfg = ref<any>({});

const refreshList = async () => {
  try {
    data.value = await getDeckList();
  } finally {
    loading.value = false;
  }
};

const configGet = async () => {
  const data = await getBackupConfig();
  cfg.value = data;
};

const fileList = ref<any[]>([]);

const reloadDecks = async () => {
  const ret = await reloadDeck();
  if (ret.testMode) {
    ElMessage.success('展示模式无法重载牌堆');
  } else {
    ElMessage.success('牌堆已重载');
    await refreshList();
  }
};

const doDelete = async (data: any) => {
  try {
    await ElMessageBox.confirm(`确定删除牌堆《${data.name}》吗？此操作无法撤销。`, '删除牌堆', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch (reason) {
    if (reason === 'cancel' || reason === 'close') return;
    throw reason;
  }

  await deleteDeck(data.filename);
  await reloadDeck();
  await refreshList();
  ElMessage.success('牌堆已删除');
};

// let lastSetEnable = 0;
// const setEnable = async (index: number, enable: boolean) => {
//   const now = new Date().getTime();
//   if (now - lastSetEnable < 100) return;
//   lastSetEnable = now;
//   const ret = await enableDeck(index, enable);
//   ElMessage.success('完成');
// };

// const doSave = async () => {
//   await setBackupConfig(cfg.value);
//   ElMessage.success('已保存');
// };

const beforeUpload = async (file: UploadRawFile) => {
  // UploadRawFile
  if (!(await confirmUploadTargetMatch(file, 'deck')).proceed) {
    return false;
  }

  try {
    await uploadDeck(file);
    ElMessage.success('上传完成，即将自动重载牌堆');
    await reloadDeck();
    await refreshList();
  } catch (err) {
    console.error('upload deck failed:', err);
    ElMessage.error(formatUploadFailureMessage(err));
  }
  return false;
};

onBeforeMount(async () => {
  await configGet();
  await refreshList();
});

const showDiff = ref<boolean>(false);
const diffLoading = ref<boolean>(false);

interface DeckCheckResult {
  old: string;
  new: string;
  format: 'json' | 'yaml' | 'toml';
  filename: string;
  tempFileName: string;
}

const deckCheck = ref<DeckCheckResult>({
  old: '',
  new: '',
  format: 'json',
  filename: '',
  tempFileName: '',
});

const doCheckUpdate = async (data: any) => {
  diffLoading.value = true;
  const checkResult = await checkDeckUpdate(data.filename);
  diffLoading.value = false;
  if (checkResult.result) {
    deckCheck.value = { ...checkResult, filename: data.filename };
    showDiff.value = true;
  } else {
    ElMessage.error('检查更新失败！' + checkResult.err);
  }
};

const deckUpdate = async () => {
  const res = await updateDeck(deckCheck.value.filename, deckCheck.value.tempFileName);
  if (res.result) {
    showDiff.value = false;
    ElMessage.success('更新成功，即将自动重载牌堆');
    await reloadDeck();
    await refreshList();
  } else {
    showDiff.value = false;
    ElMessage.error('更新失败！' + res.err);
  }
};
</script>

<style lang="css">
.deck-format-help {
  vertical-align: -2px;
  cursor: help;
}

.deck-toolbar {
  gap: 12px;
}

.deck-search {
  width: min(360px, 100%);
}

.deck-count {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.deck-more-link {
  margin-inline-start: auto;
}

.deck-list .deck-item {
  width: 100%;
}

.deck-meta {
  white-space: pre-line;
}

.deck-tags {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.deck-tags-label {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.deck-legend {
  margin: 0;
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.deck-tag-internal {
  border-style: dashed;
}

.upload > ul {
  display: none;
}

@media (max-width: 767px) {
  .deck-more-link {
    margin-inline-start: 0;
  }
}
</style>
