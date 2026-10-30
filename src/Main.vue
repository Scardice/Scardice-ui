<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <el-container id="root" class="seal-root app-shell" :class="{ 'nav-rail': navigationCompact }">
    <div
      v-if="testWebUIBypass.auth || testWebUIBypass.originRateLimit"
      role="alert"
      class="w-full bg-red-700 px-4 py-3 text-center font-semibold text-white">
      <strong>测试安全警告：</strong>
      <span v-if="testWebUIBypass.auth">WebUI 与管理 API 的凭据校验已关闭。</span>
      <span v-if="testWebUIBypass.originRateLimit">
        管理 API 的 Origin 校验与速率限制已关闭。
      </span>
    </div>
    <a class="workspace-skip-link" href="#workspace-main" @click.prevent="workspaceMain?.focus()">
      跳到工作区
    </a>
    <el-header class="global-header">
      <div class="brand-area">
        <el-button
          class="nav-toggle"
          text
          :aria-label="overlayNavigation ? '打开导航' : navigationCompact ? '展开导航' : '收起导航'"
          :aria-expanded="overlayNavigation ? drawerMenu : !navigationCompact"
          :icon="overlayNavigation ? IconMenu : navigationCompact ? Expand : Fold"
          @click="toggleNavigation" />
        <button class="brand-wordmark" type="button" @click="enableAdvancedConfig">Scardice</button>
      </div>
      <div class="global-actions">
        <button
          type="button"
          class="workspace-search"
          aria-label="搜索页面或功能"
          @click="paletteOpen = true">
          <el-icon><Search /></el-icon><span>搜索页面</span><kbd>Ctrl K</kbd>
        </button>
        <el-tooltip
          :content="hasRuntimeVersion ? `核心版本 ${baseInfo.version}` : '核心版本未知'"
          placement="bottom">
          <span class="connection-status" :class="{ offline: store.backendOffline }" role="status">
            <span aria-hidden="true"></span>
            {{ store.backendOffline ? '核心离线' : store.canAccess ? '已连接' : '未登录' }}
          </span>
        </el-tooltip>
        <el-tooltip v-if="store.canAccess" content="余烬新闻" placement="bottom">
          <button
            type="button"
            class="news-button"
            aria-label="查看余烬新闻"
            @click="dialogFeed = true">
            <el-badge is-dot :hidden="!newsLoaded || newsChecked">
              <el-icon :size="22" aria-hidden="true"><Bell /></el-icon>
            </el-badge>
          </button>
        </el-tooltip>
      </div>
    </el-header>

    <div class="main-shell">
      <aside v-if="!overlayNavigation" class="sidebar">
        <Menu
          :pages="navigationPages"
          :active-path="currentPage?.path ?? route.path"
          :compact="navigationCompact"
          @search="paletteOpen = true" />
      </aside>
      <div ref="contentBox" class="seal-content">
        <div class="seal-background" aria-hidden="true">
          <div class="seal-background-image"></div>
          <div class="seal-background-mask"></div>
        </div>
        <main
          id="workspace-main"
          ref="workspaceMain"
          v-loading="loading"
          class="el-main main-container"
          tabindex="-1">
          <router-view v-slot="{ Component, route: currentRoute }">
            <div :key="currentRoute.name ?? currentRoute.path" class="route-page">
              <component :is="Component" @update:advanced-settings-show="refreshAdvancedSettings" />
            </div>
          </router-view>
        </main>
      </div>
    </div>
  </el-container>

  <el-drawer
    v-model="drawerMenu"
    title="全部功能"
    direction="ltr"
    size="min(280px, 88vw)"
    class="drawer-menu workspace-menu-drawer">
    <Menu
      :pages="navigationPages"
      :active-path="currentPage?.path ?? route.path"
      @navigate="drawerMenu = false"
      @search="paletteOpen = true" />
  </el-drawer>

  <el-dialog
    v-model="paletteOpen"
    title="跳转到工作区"
    width="min(560px, calc(100vw - 24px))"
    class="workspace-command-dialog"
    @opened="paletteInput?.focus()">
    <el-input
      ref="paletteInput"
      v-model="paletteQuery"
      :prefix-icon="Search"
      placeholder="搜索页面或功能"
      aria-label="搜索页面或功能"
      clearable
      @keydown="handlePaletteKey" />
    <div ref="paletteResults" class="workspace-command-results">
      <button
        v-for="(page, index) in paletteMatches"
        :key="page.path"
        type="button"
        class="workspace-command-result"
        @click="navigateFromPalette(page.path)"
        @keydown.down.prevent="focusPaletteResult(index + 1)"
        @keydown.up.prevent="focusPaletteResult(index - 1)">
        <el-icon :size="20"><component :is="page.icon" /></el-icon>
        <span
          ><strong>{{ page.label }}</strong
          ><small>{{ groupLabel(page.group) }} · {{ page.hint }}</small></span
        >
        <el-icon><ArrowRight /></el-icon>
      </button>
      <p v-if="!paletteMatches.length" class="workspace-empty" role="status">
        没有匹配的功能，请尝试其他名称。
      </p>
    </div>
    <template #footer
      ><span class="workspace-subtitle">↑ ↓ 选择 · Enter 打开 · Esc 关闭</span></template
    >
  </el-dialog>

  <el-dialog
    v-model="showDialog"
    title="登录 WebUI"
    width="min(400px, calc(100vw - 24px))"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="the-dialog login-dialog">
    <form class="login-form" @submit.prevent="doUnlock">
      <label for="login-password">UI 密码或管理员令牌</label>
      <el-input
        id="login-password"
        v-model="password"
        type="password"
        show-password
        autocomplete="current-password"
        placeholder="输入后按 Enter 登录" />
      <el-button type="primary" native-type="submit" :disabled="!password">登录</el-button>
    </form>
  </el-dialog>

  <el-dialog
    v-model="dialogLostConnectionVisible"
    title="与核心的连接已断开"
    width="min(440px, calc(100vw - 24px))"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="the-dialog">
    <p>正在每 5 秒自动重连，恢复后此提示会自动关闭。</p>
    <p>如果长时间没有恢复，请检查服务器上的 Scardice 进程是否仍在运行。</p>
  </el-dialog>

  <el-dialog
    v-model="dialogFeed"
    :close-on-click-modal="false"
    :close-on-press-escape="!newsLoaded || newsLoadError"
    class="dialog-feed"
    :show-close="!newsLoaded || newsLoadError">
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <h4 :id="titleId" :class="titleClass" class="news-title">余烬新闻</h4>
        <el-button type="primary" :icon="Check" :disabled="!newsLoaded" @click="checkNews(close)"
          >标记为已读</el-button
        >
      </div>
    </template>

    <p v-if="newsLoadError" role="alert" class="news-load-error">
      {{
        newsLoaded ? '获取最新余烬新闻失败，仍显示上次成功获取的内容。' : '暂时无法获取余烬新闻。'
      }}
    </p>
    <p v-if="newsLoaded && !newsData" role="status">暂无内容</p>
    <div
      v-if="newsLoaded && newsData"
      data-news-content
      style="text-align: left"
      v-html="newsData"></div>
  </el-dialog>
</template>

<script setup lang="ts">
import { isAdminAuthMode, useStore } from './store';
import { testWebUIBypass } from '~/utils/test-webui-bypass';

import {
  ArrowRight,
  Bell,
  Check,
  Expand,
  Fold,
  Menu as IconMenu,
  Search,
} from '@element-plus/icons-vue';
import type { InputInstance } from 'element-plus';
import { buildNavigation, groupLabel, searchNavigation } from '~/router/navigation';

import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';

import { passwordHash } from './utils';
import { getNewUtils, postUtilsCheckNews } from './api/utils';
import { checkSecurity } from './api/others';
import { applyUiBeautifyConfig, useUiBeautifyConfig } from '~/utils/ui-beautify';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);

const loading = useStorage('router-view-loading', true);
const uiBeautifyConfig = useUiBeautifyConfig();

watch(
  uiBeautifyConfig,
  value => {
    applyUiBeautifyConfig(value);
  },
  { deep: true, immediate: true },
);

const store = useStore();
const baseInfo = computed(() => store.curDice.baseInfo);
const hasRuntimeVersion = computed(() => {
  const info = baseInfo.value;
  return Boolean(
    info.appChannel &&
    info.version &&
    info.version !== '0.0' &&
    info.versionSimple &&
    info.versionSimple !== '0.0',
  );
});
const password = ref('');

const dialogFeed = ref(false);

const newsData = ref('');
const newsChecked = ref(true);
const newsMark = ref('');
const newsLoaded = ref(false);
const newsLoadError = ref(false);
const checkNews = async (close: () => void) => {
  console.log('newsMark', newsMark.value);
  if (!newsLoaded.value) return;
  try {
    const ret = await postUtilsCheckNews(newsMark.value);
    if (ret?.result) {
      ElMessage.success('已阅读最新的余烬新闻');
    } else {
      ElMessage.error('阅读余烬新闻失败');
      return;
    }
    if (await updateNews()) close();
  } catch {
    ElMessage.error('阅读余烬新闻失败');
  }
};
const updateNews = async () => {
  try {
    const newsInfo = await getNewUtils();
    if (!newsInfo.result) {
      newsLoadError.value = true;
      ElMessage.error(newsInfo.err ?? '获取余烬新闻失败');
      return false;
    }
    newsData.value = newsInfo.news;
    newsChecked.value = newsInfo.checked;
    newsMark.value = newsInfo.newsMark;
    newsLoaded.value = true;
    newsLoadError.value = false;
    return true;
  } catch {
    newsLoadError.value = true;
    ElMessage.error('获取余烬新闻失败');
    return false;
  }
};

const showDialog = computed(() => {
  return !store.canAccess && !store.backendOffline;
});

const dialogLostConnectionVisible = ref(false);
watch(
  () => store.backendOffline,
  v => {
    dialogLostConnectionVisible.value = v;
  },
);

const doUnlock = async () => {
  if (store.backendOffline) {
    ElMessage.error('当前无法连接主程序，请稍后再试');
    return;
  }
  const adminAuthenticated = await store.tryAdminToken(password.value);
  if (!adminAuthenticated) {
    const hash = await passwordHash(store.salt, password.value);
    await store.signIn(hash);
  }
  if (store.canAccess) {
    ElMessageBox.alert('欢迎回来，请开始使用。', '登录成功');
    password.value = '';
    checkPassword();
    window.location.reload();
  } else {
    ElMessageBox.alert('密码或管理员令牌无效，请重试', '登录失败');
    password.value = '';
  }
};

const checkPassword = async () => {
  if (!(await checkSecurity()).isOk) {
    ElMessageBox.alert(
      '欢迎使用余烬核心。<br/>如果您的服务开启在公网，为了保证您的安全性，请前往<b>“综合设置->基本设置”</b>界面，设置<b>UI 界面密码</b>。<br/>或切换为只有本机可访问。<br><b>如果您不了解上面在说什么，请务必设置一个密码</b>',
      '提示',
      { dangerouslyUseHTMLString: true },
    );
  }
};

onBeforeMount(async () => {
  const adminMode = !testWebUIBypass.auth && isAdminAuthMode();
  if (store.canAccess) {
    void store.getBaseInfo();
  }
  if (!adminMode) {
    void store.getCustomText();
  }

  if (store.canAccess && !adminMode && !testWebUIBypass.auth) {
    void checkPassword();
  }

  timerId = setInterval(async () => {
    if (store.canAccess) {
      try {
        await store.getBaseInfo();
        store.backendOffline = false;
      } catch (e: any) {
        if (!e.response || e.response.status === 403) {
          store.backendOffline = true;
        }
      }
      return;
    }
    // 未登录时，仅当判定为后端离线才轮询恢复
    if (store.backendOffline) {
      await store.trySignIn();
      // 恢复成功后重载页面以重新初始化各组件
      if (store.canAccess) {
        window.location.reload();
      }
    }
  }, 5000) as any;

  if (adminMode) {
    return;
  }

  await updateNews();

  const conf = await store.diceAdvancedConfigGet();
  if (conf.show) {
    advancedConfigCounter.value = 8;
  }
});

let timerId: number;

const workspaceMain = ref<HTMLElement | null>(null);
const contentBox = ref<HTMLElement | null>(null);
let backgroundResizeObserver: ResizeObserver | undefined;
let backgroundRectFrame = 0;

const syncBackgroundRect = () => {
  const el = contentBox.value;
  if (!el) {
    return;
  }
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--seal-content-left', `${rect.left}px`);
  el.style.setProperty('--seal-content-top', `${rect.top}px`);
  el.style.setProperty('--seal-content-width', `${rect.width}px`);
  el.style.setProperty('--seal-content-height', `${rect.height}px`);
};

const queueBackgroundRectSync = () => {
  if (backgroundRectFrame) {
    window.cancelAnimationFrame(backgroundRectFrame);
  }
  backgroundRectFrame = window.requestAnimationFrame(() => {
    backgroundRectFrame = 0;
    syncBackgroundRect();
  });
};

onMounted(() => {
  queueBackgroundRectSync();
  window.addEventListener('keydown', handleWorkspaceShortcut);
  window.addEventListener('resize', queueBackgroundRectSync);
  if (contentBox.value) {
    backgroundResizeObserver = new ResizeObserver(queueBackgroundRectSync);
    backgroundResizeObserver.observe(contentBox.value);
  }
});

onBeforeUnmount(() => {
  window.clearInterval(timerId);
  window.removeEventListener('keydown', handleWorkspaceShortcut);
  window.removeEventListener('resize', queueBackgroundRectSync);
  backgroundResizeObserver?.disconnect();
  if (backgroundRectFrame) {
    window.cancelAnimationFrame(backgroundRectFrame);
  }
});

const drawerMenu = ref<boolean>(false);

const advancedConfigCounter = ref<number>(0);
const enableAdvancedConfig = async () => {
  advancedConfigCounter.value++;
  const counter = advancedConfigCounter.value;
  if (counter > 8) {
    ElMessage.info('高级设置页已经开启');
    await router.push({ path: '/misc/advanced-setting' });
    return;
  } else if (counter === 8) {
    const conf = await store.diceAdvancedConfigGet();
    conf.show = true;
    conf.enable = true;
    await store.diceAdvancedConfigSet(conf);
    await router.push({ path: '/misc/advanced-setting' });
    ElMessage.success('已开启高级设置页');
  } else if (counter > 2) {
    ElMessage.info('再按 ' + (8 - counter) + ' 次开启高级设置页');
  }
};

const router = useRouter();
const refreshAdvancedSettings = async (show: boolean) => {
  if (!show) {
    advancedConfigCounter.value = 0;
    await router.push({ path: '/home', replace: true });
    ElMessage.success('已关闭高级设置页');
  }
};

const route = useRoute();
const overlayNavigation = useMediaQuery('(max-width: 1023px)');
const wideNavigation = useMediaQuery('(min-width: 1440px)');
const navigationMode = useStorage<'auto' | 'expanded' | 'compact'>(
  'workspace-navigation-mode',
  'auto',
);
const navigationCompact = computed(
  () =>
    navigationMode.value === 'compact' ||
    (navigationMode.value !== 'expanded' && !wideNavigation.value),
);
const density = useStorage<'comfortable' | 'compact' | 'dense'>('workspace-density', 'compact');
const navigationPages = computed(() =>
  buildNavigation(Object.keys(store.curDice.customTexts), advancedConfigCounter.value >= 8),
);
const currentPage = computed(() =>
  navigationPages.value.find(page =>
    page.category !== undefined
      ? route.name === 'custom-text' && page.category === route.params.category
      : page.path === route.path,
  ),
);
const paletteOpen = ref(false);
const paletteQuery = ref('');
const paletteInput = ref<InputInstance>();
const paletteResults = ref<HTMLElement>();
const paletteMatches = computed(() => searchNavigation(navigationPages.value, paletteQuery.value));

function toggleNavigation() {
  if (overlayNavigation.value) drawerMenu.value = true;
  else navigationMode.value = navigationCompact.value ? 'expanded' : 'compact';
}

function handleWorkspaceShortcut(event: KeyboardEvent) {
  if (
    event.isComposing ||
    event.altKey ||
    !(event.ctrlKey || event.metaKey) ||
    event.key.toLowerCase() !== 'k'
  )
    return;
  if (showDialog.value || dialogLostConnectionVisible.value || dialogFeed.value) return;
  event.preventDefault();
  paletteOpen.value = !paletteOpen.value;
}

function focusPaletteResult(index: number) {
  const results = paletteResults.value?.querySelectorAll<HTMLButtonElement>(
    '.workspace-command-result',
  );
  if (results?.length) results[(index + results.length) % results.length]?.focus();
}

function handlePaletteKey(event: Event | KeyboardEvent) {
  if (!(event instanceof KeyboardEvent) || event.isComposing) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusPaletteResult(0);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusPaletteResult(paletteMatches.value.length - 1);
  } else if (event.key === 'Enter' && paletteMatches.value[0]) {
    event.preventDefault();
    void navigateFromPalette(paletteMatches.value[0].path);
  }
}

async function navigateFromPalette(path: string) {
  const failure = await router.push(path);
  if (failure) return;
  paletteOpen.value = false;
  drawerMenu.value = false;
  await nextTick();
  workspaceMain.value?.focus();
}

watch(paletteOpen, open => {
  if (open) paletteQuery.value = '';
});
watch(
  density,
  value => {
    document.documentElement.dataset.density = value;
  },
  { immediate: true },
);
watch(
  currentPage,
  page => {
    document.title = `${page?.label ?? 'Scardice'} · Scardice`;
  },
  { immediate: true },
);
watch(overlayNavigation, overlay => {
  if (!overlay) drawerMenu.value = false;
});
watch(
  () => route.fullPath,
  () => {
    drawerMenu.value = false;
  },
);
</script>

<style>
html,
body {
  height: 100%;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track-piece {
  background: var(--seal-scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--seal-scrollbar-thumb);
}

::-webkit-scrollbar-corner {
  background: var(--seal-scrollbar-track);
}

::-webkit-scrollbar-thumb:window-inactive {
  background: var(--seal-surface-muted);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--seal-scrollbar-thumb-hover);
}

.seal-root.app-shell {
  display: flex;
  flex-direction: column;
  color: var(--seal-text-color);
  background: var(--seal-page-bg);
}
.global-header {
  --el-header-height: 52px;
  display: flex;
  flex: none;
  align-items: center;
  gap: 24px;
  padding-inline: 12px 20px;
  background: var(--seal-surface-bg-base);
  border-bottom: 1px solid var(--seal-border-color-light);
  min-width: 0;
}
.brand-area,
.global-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.brand-area {
  flex-shrink: 0;
}
.brand-wordmark {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
}
.global-header .nav-toggle {
  width: 32px;
  height: 32px;
  padding: 6px;
}
.global-actions {
  margin-inline-start: auto;
  gap: 16px;
}
.workspace-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  min-height: 32px;
  background: var(--seal-surface-soft);
  color: var(--seal-text-secondary);
  border: 1px solid var(--seal-border-color-light);
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}
.workspace-search kbd {
  margin-inline-start: 20px;
  font: inherit;
  font-size: 10px;
}
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  white-space: nowrap;
}
.connection-status > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-success);
}
.connection-status.offline > span {
  background: var(--el-color-danger);
}
.news-button {
  width: 28px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--seal-text-color);
  cursor: pointer;
}
.news-button .el-icon {
  display: block;
}
.main-shell {
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.sidebar {
  display: flex;
  flex: 0 0 180px;
  width: 180px;
  min-height: 0;
  overflow: hidden;
  background: var(--seal-nav-bg);
  color: #edf2f5;
}
.nav-rail .sidebar {
  flex-basis: 56px;
  width: 56px;
}
.seal-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  text-align: start;
}
.main-container {
  padding: 0;
  box-sizing: border-box;
  height: 100%;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}
.route-page {
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 20px;
  box-sizing: border-box;
}
.route-page:has(> .workspace-page) {
  padding: 0;
  overflow: hidden;
}
.workspace-navigation {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  padding: 10px 8px;
  color: #edf2f5;
  font-size: 13px;
}
.nav-search {
  flex-shrink: 0;
  padding: 0 0 10px;
}
.nav-search .el-input__wrapper {
  background: var(--seal-nav-hover-bg);
  box-shadow: 0 0 0 1px #ffffff24 inset;
}
.nav-search .el-input__inner {
  color: #fff;
}
.nav-search .el-input__inner::placeholder {
  color: #d1d7dd;
}
.nav-search .el-input__prefix,
.nav-search .el-input__suffix {
  color: #d1d7dd;
}
.nav-search-button {
  width: 40px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 6px;
  color: inherit;
  background: var(--seal-nav-hover-bg);
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}
.nav-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.nav-primary,
.nav-group-toggle,
.nav-destination,
.nav-about,
.nav-search-result {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 32px;
  margin-block: 2px;
  padding: 6px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: none;
  text-align: start;
  cursor: pointer;
}
.nav-primary:hover,
.nav-group-toggle:hover,
.nav-destination:hover,
.nav-about:hover,
.nav-search-result:hover {
  background: var(--seal-nav-hover-bg);
}
.nav-primary.active,
.nav-destination.active,
.nav-about.active,
.nav-search-result.active {
  color: #fff;
  font-weight: 600;
  background: color-mix(in srgb, var(--seal-nav-active) 18%, transparent);
  box-shadow: inset 3px 0 0 var(--seal-nav-active);
}
.nav-group-toggle.has-active {
  color: #fff;
  font-weight: 600;
}
.nav-group-toggle.has-active .el-icon:first-child {
  color: var(--seal-nav-active);
}
.nav-group-title {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  white-space: nowrap;
}
.nav-count {
  font-size: 11px;
  color: #c5ced7;
}
.nav-group-chevron {
  font-size: 10px;
  flex: none;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.nav-group-chevron.expanded {
  transform: rotate(180deg);
}
.nav-group-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 180ms cubic-bezier(0.25, 1, 0.5, 1);
}
.nav-group-collapse.open {
  grid-template-rows: 1fr;
  transition-duration: 240ms;
}
.nav-group-collapse > .nav-group-items {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 120ms ease,
    transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
}
.nav-group-collapse.open > .nav-group-items {
  opacity: 1;
  transform: none;
  transition-duration: 220ms, 240ms;
}
@media (prefers-reduced-motion: reduce) {
  .nav-group-chevron,
  .nav-group-collapse,
  .nav-group-collapse > .nav-group-items {
    transition: none;
  }
}
.nav-divider {
  height: 1px;
  margin-block: 12px;
  background: #ffffff24;
}
.nav-group-items .nav-destination {
  padding-inline-start: 34px;
}
.nav-destination > span:first-child {
  flex: 1;
}
.nav-advanced-label {
  font-size: 10px;
  color: #c5ced7;
}
.workspace-navigation.compact .nav-primary,
.workspace-navigation.compact .nav-group-toggle,
.workspace-navigation.compact .nav-about {
  justify-content: center;
  padding-inline: 0;
}
.workspace-navigation.compact .nav-divider {
  margin-inline: 6px;
}
.nav-search-result {
  display: block;
}
.nav-search-result small {
  display: block;
  font-size: 11px;
  color: #c5ced7;
}
.nav-search-count {
  padding: 4px 8px;
  font-size: 11px;
  color: #c5ced7;
}
.nav-no-results {
  padding: 8px;
  color: #d1d7dd;
}
.nav-no-results button {
  color: inherit;
  font: inherit;
  text-decoration: underline;
  background: none;
  border: 0;
  cursor: pointer;
}
.nav-footer {
  flex-shrink: 0;
  border-top: 1px solid #ffffff24;
  padding-top: 8px;
  margin-top: 8px;
}
.nav-total {
  display: block;
  padding: 5px 8px 0;
  color: #c5ced7;
  font-size: 11px;
}
.workspace-nav-popper.el-popper {
  padding: 8px;
  background: var(--seal-nav-bg);
  border-color: var(--seal-nav-hover-bg);
  color: #edf2f5;
}
.nav-popup-content {
  max-height: min(460px, calc(100dvh - 80px));
  overflow: auto;
  overscroll-behavior: contain;
}
.nav-popup-heading {
  display: flex;
  gap: 8px;
  padding: 6px 8px 10px;
  font-size: 12px;
  color: #c5ced7;
}
.nav-popup-heading span {
  margin-inline-start: auto;
}
.workspace-navigation a:focus-visible,
.workspace-navigation button:focus-visible,
.workspace-nav-popper a:focus-visible {
  outline: 2px solid var(--seal-nav-active);
  outline-offset: -2px;
}
.workspace-skip-link {
  position: fixed;
  inset-block-start: -70px;
  inset-inline-start: 10px;
  z-index: 9999;
  background: var(--seal-surface-bg-base);
  color: var(--seal-text-color);
  padding: 8px 12px;
  border: 2px solid var(--el-color-primary);
}
.workspace-skip-link:focus {
  inset-block-start: 6px;
}
.workspace-command-results {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  max-height: min(460px, 50dvh);
  overflow: auto;
}
.workspace-command-result {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 12px;
  background: transparent;
  color: var(--seal-text-color);
  border: 1px solid transparent;
  border-radius: 6px;
  text-align: start;
  cursor: pointer;
}
.workspace-command-result:hover,
.workspace-command-result:focus-visible {
  background: var(--seal-surface-soft);
}
.workspace-command-result > span {
  flex: 1;
  min-width: 0;
}
.workspace-command-result strong {
  display: block;
  font-weight: 600;
  font-size: 13px;
}
.workspace-command-result small {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: var(--seal-text-secondary);
}
.brand-wordmark:focus-visible,
.workspace-search:focus-visible,
.workspace-command-result:focus-visible,
.news-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.workspace-menu-drawer .el-drawer__header {
  flex: none;
  margin: 0;
  padding: 16px;
  color: #fff;
}
.workspace-menu-drawer .el-drawer__body {
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;
  overflow: hidden;
}
.workspace-menu-drawer .el-drawer__close-btn {
  color: #fff;
}
.news-title {
  margin: 0;
}
.login-form {
  display: grid;
  gap: 8px;
}
.login-form label {
  font-size: 13px;
  color: var(--seal-text-regular);
}
.login-form .el-button {
  margin-block-start: 8px;
}
.my-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
#app {
  font-family: var(--seal-font-family);
  text-align: start;
  color: var(--seal-text-color);
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
}
@media (max-width: 1199px) {
  .global-header {
    gap: 12px;
  }
}
@media (max-width: 767px) {
  .global-header {
    padding-inline: 8px;
    gap: 8px;
  }
  .brand-area {
    gap: 4px;
  }
  .brand-wordmark {
    font-size: 16px;
  }
  .global-actions {
    gap: 4px;
  }
  .global-header .nav-toggle,
  .workspace-search,
  .news-button {
    min-width: 44px;
    width: 44px;
    min-height: 44px;
    height: 44px;
    justify-content: center;
    padding: 4px;
  }
  .workspace-search span,
  .workspace-search kbd {
    display: none;
  }
  .route-page {
    padding: 12px;
  }
  .workspace-navigation .nav-primary,
  .workspace-navigation .nav-group-toggle,
  .workspace-navigation .nav-destination,
  .nav-about,
  .nav-search-result {
    min-height: 44px;
    font-size: 14px;
  }
  .workspace-navigation .el-input__wrapper {
    min-height: 40px;
  }
  .workspace-command-dialog .el-dialog__body {
    padding-inline: 12px;
  }
  .dialog-feed,
  .the-dialog {
    width: min(560px, calc(100vw - 24px)) !important;
  }
}
</style>
