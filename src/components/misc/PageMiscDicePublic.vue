<template>
  <section class="workspace-page public-workspace" aria-labelledby="public-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="public-workspace-title" class="workspace-title">公骰设置</h1>
        <p class="workspace-subtitle">把骰子登记到公骰列表，让其他人可以找到并邀请它。</p>
      </div>
      <div class="workspace-actions">
        <label class="workspace-toggle">
          <el-switch
            v-model="config.publicDiceEnable"
            aria-label="登记为公骰"
            @change="enableChange" />
          <span>登记为公骰</span>
        </label>
        <el-button
          :icon="DocumentChecked"
          :disabled="!config.publicDiceEnable"
          type="primary"
          @click="doSave"
          >保存</el-button
        >
      </div>
    </header>

    <div class="workspace-body workspace-scroll">
      <el-alert
        v-if="!config.publicDiceEnable"
        type="info"
        :closable="false"
        show-icon
        title="当前未登记为公骰。开启右上角开关后即可编辑下列信息。" />

      <div class="public-layout" :class="{ 'is-disabled': !config.publicDiceEnable }">
        <section class="workspace-panel" aria-labelledby="public-info-title">
          <div class="workspace-panel-header">
            <div>
              <h2 id="public-info-title">展示信息</h2>
              <p>这些内容会显示在公骰列表中。</p>
            </div>
          </div>
          <el-form label-position="top" class="public-form" :disabled="!config.publicDiceEnable">
            <el-form-item label="公骰昵称">
              <el-input v-model="config.publicDiceName" placeholder="例如：余烬骰" />
            </el-form-item>
            <el-form-item label="头像地址">
              <el-input v-model="config.publicDiceAvatar" placeholder="https://…/avatar.png" />
            </el-form-item>
            <el-form-item label="骰主留言" class="public-form-wide">
              <el-input
                v-model="config.publicDiceNote"
                placeholder="例如：欢迎拉群，请先阅读使用须知" />
            </el-form-item>
            <el-form-item label="公骰简介" class="public-form-wide">
              <el-input
                v-model="config.publicDiceBrief"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 8 }"
                placeholder="介绍骰子支持的规则、功能与使用限制" />
            </el-form-item>
            <el-form-item label="公骰 UID" class="public-form-wide">
              <el-input v-model="config.publicDiceId" show-password placeholder="留空则自动注册" />
              <p class="public-hint">上报公骰使用的密钥。通常留空自动生成，请勿展示给他人。</p>
            </el-form-item>
          </el-form>
        </section>

        <aside class="workspace-panel public-preview" aria-label="公骰列表预览">
          <span class="public-preview-label">列表预览</span>
          <div class="public-preview-card">
            <img
              class="public-preview-avatar"
              :src="config.publicDiceAvatar || imgSeal"
              alt=""
              @error="($event.target as HTMLImageElement).src = imgSeal" />
            <div class="public-preview-text">
              <strong>{{ config.publicDiceName || '未命名公骰' }}</strong>
              <span v-if="config.publicDiceNote">{{ config.publicDiceNote }}</span>
            </div>
          </div>
          <p class="public-preview-brief">{{ config.publicDiceBrief || '暂无简介' }}</p>
        </aside>
      </div>

      <section
        class="workspace-panel"
        :class="{ 'is-disabled': !config.publicDiceEnable }"
        aria-labelledby="public-endpoints-title">
        <div class="workspace-panel-header">
          <div>
            <h2 id="public-endpoints-title">上报的账号</h2>
            <p>勾选的账号会作为公骰出现在列表中，保存后生效。</p>
          </div>
        </div>
        <el-table
          ref="multipleTableRef"
          :data="tableData"
          row-key="id"
          empty-text="还没有可上报的账号"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="48" />
          <el-table-column property="userId" sortable label="账号" />
          <el-table-column property="platform" sortable label="平台" />
          <el-table-column property="adapter" sortable label="接入方式" />
          <el-table-column property="state" sortable label="状态" />
        </el-table>
      </section>
    </div>
  </section>
</template>
<script lang="ts" setup>
import imgSeal from '~/assets/seal.png';
import { DocumentChecked } from '@element-plus/icons-vue';
import type { TableInstance } from 'element-plus';
import { getDicePublicInfo, setDicePublicInfo } from '~/api/public_dice';
const config = ref<any>({});
const multipleTableRef = ref<TableInstance>();
// let selectedRows: any[] = [];
const handleSelectionChange = (selection: any[]) => {
  selected = selection;
};
const tableData = ref<any>([]);
let selected: any[] = [];
const enableChange = async (value: string | number | boolean) => {
  config.value.publicDiceEnable = value;
  await setDicePublicInfo(config.value, selected);
  await refreshInfo();
};
const doSave = async () => {
  await setDicePublicInfo(config.value, selected);
  await refreshInfo();
  ElMessage.success('公骰信息已保存');
};

const refreshInfo = async () => {
  tableData.value = [];
  const infos = await getDicePublicInfo();
  config.value = infos.config;
  if (infos.endpoints !== null) {
    infos.endpoints.forEach(dc => {
      const state = () => {
        switch (dc.state) {
          case 0:
            return '断开';
          case 1:
            return '已连接';
          case 2:
            return '连接中';
          case 3:
            return '连接失败';
          default:
            return '未知';
        }
      };
      const adapter = () => {
        if (
          dc.platform === 'QQ' &&
          dc.protocolType === 'onebot' &&
          dc.adapter.builtinMode !== null
        ) {
          switch (dc.adapter.builtinMode) {
            case 'lagrange':
              return '内置客户端';
            case 'gocq':
              return '分离部署';
          }
        }
        return '-';
      };
      tableData.value.push({
        userId: dc.userId,
        platform: dc.platform,
        adapter: adapter(),
        state: state(),
        isPublic: dc.isPublic,
        id: dc.id,
      });
    });

    tableData.value.forEach((row: any) => {
      multipleTableRef.value!.toggleRowSelection(row, row.isPublic);
    });
  }
};

onBeforeMount(async () => {
  await refreshInfo();
});
</script>
<style scoped lang="css">
.public-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  gap: var(--workspace-gap);
  align-items: start;
}

.public-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.public-form-wide {
  grid-column: 1 / -1;
}

.public-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--seal-text-secondary);
}

.public-preview {
  display: grid;
  gap: 12px;
}

.public-preview-label {
  font-size: 12px;
  color: var(--seal-text-secondary);
}

.public-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.public-preview-avatar {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  background: var(--seal-surface-soft);
}

.public-preview-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.public-preview-text span,
.public-preview-brief {
  font-size: 12px;
  color: var(--seal-text-secondary);
  overflow-wrap: anywhere;
}

.public-preview-brief {
  margin: 0;
  white-space: pre-line;
}

.is-disabled :deep(.el-table) {
  pointer-events: none;
  opacity: 0.6;
}

@media (max-width: 991px) {
  .public-layout,
  .public-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
