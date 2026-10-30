<script setup lang="ts">
import { DocumentChecked, QuestionFilled } from '@element-plus/icons-vue';
import { getBanConfig, setBanConfig } from '~/api/banconfig';
import type { BanConfig } from '~/type';

const banConfig = ref<BanConfig>({} as BanConfig);
const modified = ref<boolean>(false);

const banConfigSave = async () => {
  await setBanConfig(banConfig.value);
  await configGet();
  ElMessage.success('已保存');
  modified.value = false;
  await nextTick(() => {
    modified.value = false;
  });
};

const configGet = async () => {
  banConfig.value = await getBanConfig();
};

onBeforeMount(async () => {
  await configGet();
  await nextTick();
  modified.value = false;
});

watch(
  banConfig,
  () => {
    modified.value = true;
  },
  { deep: true },
);
</script>

<template>
  <div class="ban-config">
    <div class="ban-config__savebar">
      <span class="ban-config__status" :class="{ 'is-dirty': modified }" role="status">
        {{ modified ? '有未保存的更改' : '所有规则已保存' }}
      </span>
      <el-button type="primary" :icon="DocumentChecked" :disabled="!modified" @click="banConfigSave"
        >保存规则</el-button
      >
    </div>

    <section class="workspace-panel ban-config__section">
      <h2>拉黑后的处理方式</h2>
      <el-form :model="banConfig" size="small" label-position="top" class="ban-config__form">
        <el-form-item label="对黑名单用户或群组">
          <div class="ban-config__behavior-grid">
            <el-checkbox v-model="banConfig.banBehaviorRefuseReply">拒绝回复</el-checkbox>
            <el-checkbox v-model="banConfig.banBehaviorRefuseInvite">拒绝邀请</el-checkbox>
            <el-checkbox v-model="banConfig.banBehaviorQuitLastPlace">退出事发群</el-checkbox>
            <el-checkbox v-model="banConfig.banBehaviorQuitPlaceImmediately">
              使用时立即退出群
            </el-checkbox>
            <el-checkbox v-model="banConfig.banBehaviorQuitIfAdmin">
              使用者为管理员立即退群，为普通群员进行通告
            </el-checkbox>
            <el-checkbox v-model="banConfig.banBehaviorQuitIfAdminSilentIfNotAdmin">
              使用者为管理员立即退群，为普通群员仅拒绝回复
            </el-checkbox>
          </div>
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="ban-config__notify-label">
              同一用户的通报间隔
              <el-tooltip
                content="-1 表示每次通报；0 表示使用默认的 20 分钟；正整数表示自定义冷却分钟数。冷却按同一群内的同一黑名单用户分别计算。"
                placement="top">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-space :size="8">
            <el-input-number
              v-model="banConfig.banNotifyIntervalMinutes"
              class="ban-config__number"
              :min="-1"
              :step="1"
              step-strictly />
            <span>分钟</span>
          </el-space>
        </el-form-item>
      </el-form>
    </section>

    <section class="workspace-panel ban-config__section">
      <h2>怒气值规则</h2>
      <p class="ban-config__description">
        用户每次做出恶意行为（禁言、踢出骰子、刷屏）都会累积怒气值；达到警告或拉黑阈值后自动加入名单，并通知邀请者、通知列表与事发群。
      </p>

      <el-form :model="banConfig" size="small" label-position="top" class="ban-config__form">
        <section class="ban-config__group">
          <h5 class="ban-config__group-title">名单阈值</h5>
          <div class="ban-config__field-grid">
            <el-form-item label="警告阈值">
              <el-input-number
                v-model="banConfig.thresholdWarn"
                class="ban-config__number"
                :min="0"
                :step="1"
                step-strictly />
            </el-form-item>
            <el-form-item label="拉黑阈值">
              <el-input-number
                v-model="banConfig.thresholdBan"
                class="ban-config__number"
                :min="0"
                :step="1"
                step-strictly />
            </el-form-item>
          </div>
        </section>

        <section class="ban-config__group">
          <h5 class="ban-config__group-title">积分变化</h5>
          <div class="ban-config__field-grid">
            <el-form-item label="禁言增加">
              <el-input-number
                v-model="banConfig.scoreGroupMuted"
                class="ban-config__number"
                :min="0"
                :step="1"
                step-strictly />
            </el-form-item>
            <el-form-item label="踢出增加">
              <el-input-number
                v-model="banConfig.scoreGroupKicked"
                class="ban-config__number"
                :min="0"
                :step="1"
                step-strictly />
            </el-form-item>
            <el-form-item label="刷屏增加">
              <el-input-number
                v-model="banConfig.scoreTooManyCommand"
                class="ban-config__number"
                :min="0"
                :step="1"
                step-strictly />
            </el-form-item>
            <el-form-item label="每分钟下降">
              <el-input-number
                v-model="banConfig.scoreReducePerMinute"
                class="ban-config__number"
                :min="0"
                :step="1"
                step-strictly />
            </el-form-item>
          </div>
        </section>

        <section class="ban-config__group">
          <h5 class="ban-config__group-title">连带责任</h5>
          <div class="ban-config__field-grid">
            <el-form-item label="群组连带责任">
              <el-input-number
                v-model="banConfig.jointScorePercentOfGroup"
                class="ban-config__number"
                :min="0"
                :max="1"
                :step="0.1" />
            </el-form-item>
            <el-form-item label="邀请人连带责任">
              <el-input-number
                v-model="banConfig.jointScorePercentOfInviter"
                class="ban-config__number"
                :min="0"
                :max="1"
                :step="0.1" />
            </el-form-item>
          </div>
        </section>
      </el-form>
    </section>
  </div>
</template>

<style scoped lang="css">
.ban-config {
  display: grid;
  gap: var(--workspace-gap);
  max-width: 72rem;
}

.ban-config__savebar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.ban-config__status {
  font-size: 13px;
  color: var(--seal-text-secondary);
}

.ban-config__status.is-dirty {
  color: var(--el-color-warning);
  font-weight: 600;
}

.ban-config__section > h2 {
  margin: 0 0 12px;
}

.ban-config__description {
  max-width: 72ch;
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--seal-text-secondary);
}

.ban-config__form :deep(.el-form-item) {
  margin-bottom: 1rem;
}

.ban-config__form :deep(.el-form-item__label) {
  margin-bottom: 0.375rem;
  line-height: 1.4;
}

.ban-config__behavior-grid,
.ban-config__field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1.5rem;
}

.ban-config__group + .ban-config__group {
  margin-top: 1.5rem;
}

.ban-config__group-title {
  margin: 0 0 0.75rem;
}

.ban-config__number {
  width: 10rem;
  max-width: 100%;
}

.ban-config__notify-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

@media (max-width: 48rem) {
  .ban-config__behavior-grid,
  .ban-config__field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
