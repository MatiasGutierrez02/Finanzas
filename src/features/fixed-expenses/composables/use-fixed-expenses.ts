import { computed, onMounted, ref } from 'vue';
import type { Category } from '@/models/category';
import type { FixedExpenseEstimate } from '@/models/fixed-expense-estimate';
import { categoryService } from '@/features/categories/services/category.service';
import {
  fixedExpenseEstimateService,
  type FixedExpenseEstimateInput,
  type FixedExpenseEstimateListItem,
} from '../services/fixed-expense-estimate.service';

export function useFixedExpenses() {
  const items = ref<FixedExpenseEstimateListItem[]>([]);
  const categories = ref<Category[]>([]);
  const loading = ref(true);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);
  const totalCents = computed(() =>
    fixedExpenseEstimateService.total(items.value.map(({ estimate }) => estimate)),
  );
  async function load(): Promise<void> {
    loading.value = true;
    errorMessage.value = null;
    try {
      [items.value, categories.value] = await Promise.all([
        fixedExpenseEstimateService.list(),
        categoryService.listActive(),
      ]);
    } catch (error) {
      errorMessage.value = message(error, 'No pudimos cargar los gastos fijos.');
    } finally {
      loading.value = false;
    }
  }
  async function save(
    input: FixedExpenseEstimateInput,
    current: FixedExpenseEstimate | null,
  ): Promise<boolean> {
    saving.value = true;
    errorMessage.value = null;
    try {
      if (current === null) await fixedExpenseEstimateService.create(input);
      else await fixedExpenseEstimateService.update(current.id, input);
      await load();
      return true;
    } catch (error) {
      errorMessage.value = message(error, 'No pudimos guardar el gasto fijo.');
      return false;
    } finally {
      saving.value = false;
    }
  }
  async function remove(estimate: FixedExpenseEstimate): Promise<boolean> {
    try {
      await fixedExpenseEstimateService.remove(estimate.id);
      await load();
      return true;
    } catch (error) {
      errorMessage.value = message(error, 'No pudimos eliminar el gasto fijo.');
      return false;
    }
  }
  function clearError(): void {
    errorMessage.value = null;
  }
  onMounted(load);
  return {
    categories,
    clearError,
    errorMessage,
    items,
    load,
    loading,
    remove,
    save,
    saving,
    totalCents,
  };
}
function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
