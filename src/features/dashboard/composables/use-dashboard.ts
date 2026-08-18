import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import type { DashboardSnapshot } from '../models/dashboard';
import { dashboardService } from '../services/dashboard.service';
import { useDashboardStore } from '@/stores/dashboard.store';

export function useDashboard() {
  const store = useDashboardStore();
  const { mode, period, referenceDate, transactionType } = storeToRefs(store);
  const snapshot = ref<DashboardSnapshot>();
  const loading = ref(true);
  const errorMessage = ref<string | null>(null);
  let requestSequence = 0;

  async function load(): Promise<void> {
    const requestId = ++requestSequence;

    if (mode.value !== 'balance') {
      loading.value = false;
      return;
    }

    loading.value = true;
    errorMessage.value = null;

    try {
      const result = await dashboardService.getSnapshot({
        type: transactionType.value,
        period: period.value,
        referenceDate: referenceDate.value,
      });

      if (requestId === requestSequence) {
        snapshot.value = result;
      }
    } catch (error) {
      if (requestId === requestSequence) {
        errorMessage.value =
          error instanceof Error ? error.message : 'No pudimos cargar el dashboard.';
      }
    } finally {
      if (requestId === requestSequence) {
        loading.value = false;
      }
    }
  }

  watch([mode, period, referenceDate, transactionType], load, { immediate: true });

  return { errorMessage, load, loading, snapshot, store };
}
