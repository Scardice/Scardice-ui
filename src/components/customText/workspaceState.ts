import { reactive } from 'vue';

const pendingCategoriesByServer = reactive(new Map<number, Set<string>>());

export function getPendingCustomTextCategories(serverIndex: number): Set<string> {
  let categories = pendingCategoriesByServer.get(serverIndex);
  if (!categories) {
    categories = reactive(new Set<string>());
    pendingCategoriesByServer.set(serverIndex, categories);
  }
  return categories;
}
