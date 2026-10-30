<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ArrowDown, Search, Star } from '@element-plus/icons-vue';
import {
  groupLabel,
  navigationGroups,
  searchNavigation,
  type NavigationGroup,
  type NavigationPage,
} from '~/router/navigation';

const props = defineProps<{
  pages: NavigationPage[];
  activePath: string;
  compact?: boolean;
}>();
const emit = defineEmits<{ navigate: []; search: [] }>();
const navId = useId();
const query = ref('');
const primaryPages = computed(() => props.pages.filter(page => page.group === 'primary'));
const groups = computed(() =>
  navigationGroups
    .map(group => ({
      ...group,
      pages: props.pages.filter(page => page.group === group.key),
    }))
    .filter(group => group.pages.length),
);
const matches = computed(() => searchNavigation(props.pages, query.value));
const activeGroup = computed(() => props.pages.find(page => page.path === props.activePath)?.group);
const expandedGroup = ref<string>();
const popupGroup = ref<NavigationGroup>();
const router = useRouter();

function finishNavigation(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)
    return;
  query.value = '';
  if (popupGroup.value) document.getElementById(`${navId}-trigger-${popupGroup.value}`)?.focus();
  popupGroup.value = undefined;
  emit('navigate');
}

async function handleSearchKey(event: Event | KeyboardEvent) {
  if (!(event instanceof KeyboardEvent) || event.isComposing) return;
  if (event.key === 'Escape' && query.value) {
    event.stopPropagation();
    query.value = '';
  } else if (event.key === 'Enter' && matches.value[0]) {
    event.preventDefault();
    const failure = await router.push(matches.value[0].path);
    if (!failure) {
      query.value = '';
      emit('navigate');
    }
  }
}

function setPopupVisible(group: NavigationGroup, visible: boolean) {
  if (visible) popupGroup.value = group;
  else if (popupGroup.value === group) popupGroup.value = undefined;
}

function closePopup(group: NavigationGroup) {
  popupGroup.value = undefined;
  document.getElementById(`${navId}-trigger-${group}`)?.focus();
}

function focusPopup(group: NavigationGroup) {
  if (popupGroup.value === group)
    document.getElementById(`${navId}-nav-${group}`)?.querySelector('a')?.focus();
}

watch(
  [() => props.activePath, () => props.compact, activeGroup],
  () => {
    query.value = '';
    popupGroup.value = undefined;
    expandedGroup.value = activeGroup.value;
  },
  { immediate: true },
);
</script>

<template>
  <nav class="workspace-navigation" :class="{ compact }" aria-label="全部功能">
    <div class="nav-search">
      <el-tooltip v-if="compact" content="搜索全部功能 · Ctrl K" placement="right">
        <button
          type="button"
          class="nav-search-button"
          aria-label="搜索全部功能"
          @click="emit('search')">
          <el-icon :size="18"><Search /></el-icon>
        </button>
      </el-tooltip>
      <el-input
        v-else
        v-model="query"
        :prefix-icon="Search"
        placeholder="查找功能"
        aria-label="筛选导航入口"
        clearable
        @keydown="handleSearchKey" />
    </div>
    <div class="nav-scroll">
      <template v-if="query.trim()">
        <div class="nav-search-count" role="status">{{ matches.length }} 个匹配入口</div>
        <router-link
          v-for="page in matches"
          :key="page.path"
          :to="page.path"
          class="nav-search-result"
          :class="{ active: activePath === page.path }"
          :aria-current="activePath === page.path ? 'page' : undefined"
          @click="finishNavigation">
          <span>{{ page.label }}</span
          ><small>{{ groupLabel(page.group) }}</small>
        </router-link>
        <div v-if="!matches.length" class="nav-no-results">
          <p>没有匹配的功能</p>
          <button type="button" @click="query = ''">清除搜索</button>
        </div>
      </template>
      <div v-else class="full-navigation-menu">
        <el-tooltip
          v-for="page in primaryPages"
          :key="page.path"
          :content="page.label"
          placement="right"
          :disabled="!compact">
          <router-link
            :to="page.path"
            class="nav-primary"
            :class="{ active: activePath === page.path }"
            :aria-label="page.label"
            :aria-current="activePath === page.path ? 'page' : undefined"
            @click="finishNavigation">
            <el-icon :size="18"><component :is="page.icon" /></el-icon>
            <span v-if="!compact">{{ page.label }}</span>
          </router-link>
        </el-tooltip>
        <div class="nav-divider" role="separator"></div>
        <div v-for="group in groups" :key="group.key" class="nav-group">
          <el-popover
            v-if="compact"
            :visible="popupGroup === group.key"
            trigger="click"
            role="dialog"
            :aria-label="group.label"
            placement="right-start"
            :width="208"
            :offset="10"
            :show-arrow="false"
            popper-class="workspace-nav-popper"
            :show-after="0"
            :hide-after="0"
            @update:visible="setPopupVisible(group.key, $event)"
            @after-enter="focusPopup(group.key)">
            <template #reference>
              <button
                :id="`${navId}-trigger-${group.key}`"
                type="button"
                class="nav-group-toggle"
                :class="{ 'has-active': activeGroup === group.key }"
                :aria-label="group.label"
                :aria-expanded="popupGroup === group.key"
                :aria-controls="`${navId}-nav-${group.key}`"
                :title="group.label"
                @keydown.esc.stop="closePopup(group.key)">
                <el-icon :size="18"><component :is="group.icon" /></el-icon>
              </button>
            </template>
            <div
              :id="`${navId}-nav-${group.key}`"
              class="nav-popup-content"
              @keydown.esc.stop="closePopup(group.key)">
              <div class="nav-popup-heading">
                {{ group.label }}<span>{{ group.pages.length }}</span>
              </div>
              <router-link
                v-for="page in group.pages"
                :key="page.path"
                :to="page.path"
                class="nav-destination"
                :class="{ active: activePath === page.path }"
                :aria-current="activePath === page.path ? 'page' : undefined"
                @click="finishNavigation">
                {{ page.label }}
              </router-link>
            </div>
          </el-popover>
          <template v-else>
            <button
              :id="`${navId}-trigger-${group.key}`"
              type="button"
              class="nav-group-toggle"
              :class="{ 'has-active': activeGroup === group.key }"
              :aria-label="group.label"
              :aria-expanded="expandedGroup === group.key"
              :aria-controls="`${navId}-nav-${group.key}`"
              @click="expandedGroup = expandedGroup === group.key ? undefined : group.key">
              <el-icon :size="18"><component :is="group.icon" /></el-icon>
              <span class="nav-group-title"
                >{{ group.label }}<span class="nav-count">{{ group.pages.length }}</span></span
              >
              <el-icon class="nav-group-chevron" :class="{ expanded: expandedGroup === group.key }"
                ><ArrowDown
              /></el-icon>
            </button>
            <div
              class="nav-group-collapse"
              :class="{ open: expandedGroup === group.key }"
              :inert="expandedGroup !== group.key">
              <div :id="`${navId}-nav-${group.key}`" class="nav-group-items">
                <router-link
                  v-for="page in group.pages"
                  :key="page.path"
                  :to="page.path"
                  class="nav-destination"
                  :class="{ active: activePath === page.path }"
                  :aria-current="activePath === page.path ? 'page' : undefined"
                  @click="finishNavigation">
                  <span>{{ page.label }}</span>
                  <span v-if="page.path === '/misc/advanced-setting'" class="nav-advanced-label"
                    >进阶</span
                  >
                </router-link>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div class="nav-footer">
      <el-tooltip content="关于" placement="right" :disabled="!compact">
        <router-link
          to="/about"
          class="nav-about"
          :class="{ active: activePath === '/about' }"
          aria-label="关于"
          :aria-current="activePath === '/about' ? 'page' : undefined"
          @click="finishNavigation">
          <el-icon :size="17"><Star /></el-icon><span v-if="!compact">关于</span>
        </router-link>
      </el-tooltip>
      <span v-if="!compact" class="nav-total">{{ pages.length }} 个入口</span>
    </div>
  </nav>
</template>
