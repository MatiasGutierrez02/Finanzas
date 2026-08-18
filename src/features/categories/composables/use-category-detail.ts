import { onMounted, ref } from 'vue';

import type { CategoryDetailQuery, CategoryDetailSnapshot } from '../models/category-detail';
import { categoryDetailService } from '../services/category-detail.service';

export function useCategoryDetail(query: CategoryDetailQuery) {
  const snapshot = ref<CategoryDetailSnapshot>();
  const loading = ref(true);
  const errorMessage = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    errorMessage.value = null;

    try {
      snapshot.value = await categoryDetailService.getSnapshot(query);
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'No pudimos cargar los movimientos.';
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);

  return { errorMessage, load, loading, snapshot };
}
