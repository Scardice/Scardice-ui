<script setup lang="ts">
const mode = ref<string>('list');
</script>

<template>
  <section class="workspace-page ban-workspace" aria-labelledby="ban-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="ban-workspace-title" class="workspace-title">黑白名单</h1>
        <p class="workspace-subtitle">
          管理被拉黑、警告或信任的用户与群组，并设置自动拉黑的计分规则。
        </p>
      </div>
    </header>

    <div class="workspace-body workspace-scroll">
      <el-tabs v-model="mode">
        <el-tab-pane label="名单" name="list">
          <ban-list />
        </el-tab-pane>
        <el-tab-pane label="自动拉黑规则" name="config">
          <ban-config />
        </el-tab-pane>
      </el-tabs>
    </div>
  </section>
</template>
