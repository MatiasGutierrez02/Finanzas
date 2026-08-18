import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import type { SavingsSnapshot } from '../models/savings';
import { savingsService } from '../services/savings.service';
import { useDashboardStore } from '@/stores/dashboard.store';

export function useSavings() {
  const store = useDashboardStore();
  const { savingsReferenceDate } = storeToRefs(store);
  const snapshot = ref<SavingsSnapshot>();
  const loading = ref(true);
  const errorMessage = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    errorMessage.value = null;
    try {
      snapshot.value = await savingsService.getSnapshot({
        referenceDate: savingsReferenceDate.value,
      });
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'No pudimos calcular el ahorro.';
    } finally {
      loading.value = false;
    }
  }

  watch(savingsReferenceDate, load, { immediate: true });
  return { errorMessage, load, loading, snapshot, store };
}
