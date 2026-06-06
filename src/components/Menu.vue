<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <el-menu
    :unique-opened="true"
    style="border-right: var(--sd-menu-border); border-radius: 12px; overflow: hidden"
    :active-text-color="twColors.amber[300]"
    :background-color="props.type === 'dark' ? 'var(--sd-menu-bg)' : undefined"
    :text-color="props.type === 'dark' ? 'var(--sd-menu-text)' : undefined"
    router
    :default-active="route.path">
    <el-menu-item index="/home">
      <el-icon><home-filled /></el-icon>
      <span>主页</span>
    </el-menu-item>

    <el-menu-item index="/connect">
      <el-icon>
        <connection />
      </el-icon>
      <span>账号设置</span>
    </el-menu-item>

    <el-sub-menu index="/custom-text">
      <template #title>
        <el-icon>
          <setting />
        </el-icon>
        <span>自定义文案</span>
      </template>

      <el-menu-item
        v-for="(_, k) in store.curDice.customTexts"
        :key="k"
        :index="`/custom-text/${k}`">
        <span>{{ k }}</span>
      </el-menu-item>
    </el-sub-menu>

    <el-sub-menu index="/mod">
      <template #title>
        <el-icon>
          <edit-pen />
        </el-icon>
        <span>扩展功能</span>
      </template>

      <el-menu-item index="/mod/reply">
        <span>自定义回复</span>
      </el-menu-item>

      <el-menu-item index="/mod/deck">
        <span>牌堆管理</span>
      </el-menu-item>

      <el-menu-item index="/mod/story">
        <span>跑团日志</span>
      </el-menu-item>

      <el-menu-item index="/mod/js">
        <span>JS 扩展</span>
      </el-menu-item>

      <el-menu-item index="/mod/helpdoc">
        <span>帮助文档</span>
      </el-menu-item>

      <el-menu-item index="/mod/censor">
        <span>拦截管理</span>
      </el-menu-item>
    </el-sub-menu>

    <el-sub-menu index="/misc">
      <template #title>
        <el-icon>
          <operation />
        </el-icon>
        <span>综合设置</span>
      </template>

      <el-menu-item index="/misc/base-setting">
        <span>基本设置</span>
      </el-menu-item>

      <el-menu-item index="/misc/group">
        <span>群组管理</span>
      </el-menu-item>

      <el-menu-item index="/misc/ban">
        <span>黑白名单</span>
      </el-menu-item>

      <el-menu-item index="/misc/dice-public">
        <span>公骰设置</span>
      </el-menu-item>

      <el-menu-item index="/misc/backup">
        <span>备份</span>
      </el-menu-item>

      <el-menu-item v-if="advancedConfigCounter >= 8" index="/misc/advanced-setting">
        <span>高级设置</span>
      </el-menu-item>
    </el-sub-menu>

    <el-sub-menu index="/tool">
      <template #title>
        <el-icon>
          <tools />
        </el-icon>
        <span>辅助工具</span>
      </template>

      <el-menu-item index="/tool/test">
        <span>指令测试</span>
      </el-menu-item>

      <el-menu-item index="/tool/resource">
        <span>资源管理</span>
      </el-menu-item>
    </el-sub-menu>

    <el-menu-item index="/about">
      <el-icon>
        <star />
      </el-icon>
      <span>关于</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
import {
  HomeFilled,
  Connection,
  Setting,
  Star,
  Operation,
  Tools,
  EditPen,
} from '@element-plus/icons-vue';
import { useStore } from '~/store';
import type { ModelRef } from 'vue';
import { twColors } from '~/utils/colors';

const props = defineProps<{
  type: 'light' | 'dark';
}>();

const advancedConfigCounter: ModelRef<number> = defineModel('advancedConfigCounter', {
  default: 0,
});

const store = useStore();

const route = useRoute();
</script>

<style scoped lang="css">
.el-menu-item {
  margin: 2px 6px !important;
  width: auto !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.18) !important;
}

.el-menu-item.is-active {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.el-sub-menu__title {
  border-radius: 8px !important;
  margin: 2px 6px !important;
  width: auto !important;
  transition: all 0.2s ease !important;
}

.el-sub-menu__title:hover {
  background-color: rgba(255, 255, 255, 0.12) !important;
}

/* 让深色菜单更柔和，与粉色背景融合 */
.el-menu--dark {
  background: linear-gradient(
    135deg,
    rgba(92, 206, 250, 0.65) 0%,
    rgba(245, 169, 184, 0.22) 100%
  ) !important;
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

[data-theme='dark'] .el-menu--dark {
  background: linear-gradient(
    135deg,
    rgba(30, 40, 55, 0.92) 0%,
    rgba(35, 28, 40, 0.82) 100%
  ) !important;
  backdrop-filter: blur(6px);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

[data-theme='dark'] .el-menu-item.is-active {
  background-color: rgba(245, 169, 184, 0.12) !important;
}

[data-theme='dark'] .el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.06) !important;
}

[data-theme='dark'] .el-sub-menu__title:hover {
  background-color: rgba(255, 255, 255, 0.06) !important;
}

[data-theme='dark'] .el-sub-menu__title {
  color: var(--sd-color-text-primary);
}

[data-theme='dark'] .el-menu-item {
  color: var(--sd-color-text-secondary);
}

[data-theme='dark'] .el-menu-item.is-active {
  color: var(--sd-color-brand-cyan);
}
</style>
