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
  let requestSequence = 0;

  async function load(): Promise<void> {
    const requestId = ++requestSequence;
    loading.value = true;
    errorMessage.value = null;
    try {
      const result = await savingsService.getSnapshot({
        referenceDate: savingsReferenceDate.value,
      });
      if (requestId === requestSequence) snapshot.value = result;
    } catch (error) {
      if (requestId === requestSequence) {
        errorMessage.value =
          error instanceof Error ? error.message : 'No pudimos calcular el ahorro.';
      }
    } finally {
      if (requestId === requestSequence) loading.value = false;
    }
  }

  watch(savingsReferenceDate, load, { immediate: true });
  return { errorMessage, load, loading, snapshot, store };
}
