<template>
  <section class="workspace-panel censor-words">
    <div class="workspace-panel-header">
      <div>
        <h2>敏感词</h2>
        <p v-if="filterCount > 0">已隐藏 {{ filterCount }} 条不匹配的词</p>
      </div>
      <el-input
        v-model="filter"
        class="censor-word-search"
        clearable
        aria-label="搜索敏感词"
        placeholder="搜索敏感词" />
    </div>

    <main>
      <div class="w-full">
        <el-auto-resizer>
          <template #default="{ width }">
            <el-table-v2
              class="w-full"
              :width="width"
              :height="430"
              :columns="columns"
              :data="filteredWords">
            </el-table-v2>
          </template>
        </el-auto-resizer>
      </div>
    </main>
  </section>
</template>
<script setup lang="tsx">
import { useCensorStore } from '~/components/mod/censor/censor';
import type { Column } from 'element-plus';
import { getCensorWords } from '~/api/censor';

const columns: Column<any>[] = [
  {
    key: 'level',
    title: '级别',
    dataKey: 'level',
    width: 60,
    minWidth: 60,
    align: 'center',
    cellRenderer: ({ cellData: level }: any) => {
      switch (level) {
        case 1:
          return (
            <el-tag type="info" size="small" disable-transitions>
              提醒
            </el-tag>
          );
        case 2:
          return (
            <el-tag size="small" disable-transitions>
              注意
            </el-tag>
          );
        case 3:
          return (
            <el-tag type="warning" size="small" disable-transitions>
              警告
            </el-tag>
          );
        case 4:
          return (
            <el-tag type="danger" size="small" disable-transitions>
              危险
            </el-tag>
          );
        default:
          return (
            <el-tag type="info" size="small" disable-transitions>
              未知
            </el-tag>
          );
      }
    },
  },
  {
    key: 'related',
    title: '匹配词汇',
    dataKey: 'related',
    width: 800,
    cellRenderer: ({ cellData: related, rowData }: any) => {
      if (related) {
        return (
          <el-space size="small" wrap>
            {related.map((word: { word: string }) => (
              <el-text key={word.word}>{word.word}</el-text>
            ))}
          </el-space>
        );
      } else {
        return (
          <el-space>
            <el-text>{rowData.main}</el-text>
          </el-space>
        );
      }
    },
  },
];

onMounted(() => {
  refreshWords();
});

const censorStore = useCensorStore();

interface SensitiveRelatedWord {
  word: string;
  reason: string;
}

interface SensitiveWord {
  main: string;
  level: number;
  related: SensitiveRelatedWord[];
}

const words = ref<SensitiveWord[]>([]);
const filter = ref<string>('');
const filterCount = computed(() => words.value.length - filteredWords.value.length);
const filteredWords = computed(() =>
  words.value.filter(word => {
    if (filter.value === '') {
      return true;
    }
    const val = filter.value.toLowerCase();
    return (
      word.main.toLowerCase().includes(val) ||
      word.related.map(w => w.word.toLowerCase().includes(val)).includes(true)
    );
  }),
);

censorStore.$subscribe(async (_, state) => {
  if (state.wordsNeedRefresh === true) {
    await refreshWords();
    state.wordsNeedRefresh = false;
  }
});

const refreshWords = async () => {
  const c:
    | { result: false }
    | {
        result: true;
        data: SensitiveWord[];
      } = await getCensorWords();
  if (c.result) {
    words.value = c.data;
  }
};
</script>

<style scoped>
.censor-words {
  margin-top: 16px;
}

.censor-word-search {
  width: min(240px, 100%);
}
</style>
