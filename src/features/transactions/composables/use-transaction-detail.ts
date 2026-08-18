import { onMounted, ref } from 'vue';

import type { Category } from '@/models/category';
import type { Transaction } from '@/models/transaction';
import { categoryService } from '@/features/categories/services/category.service';

import { transactionService } from '../services/transaction.service';
import { transactionErrorMessage } from './transaction-error';

export function useTransactionDetail(transactionId: string) {
  const category = ref<Category>();
  const transaction = ref<Transaction>();
  const loading = ref(true);
  const deleting = ref(false);
  const errorMessage = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    errorMessage.value = null;

    try {
      const [loadedTransaction, categories] = await Promise.all([
        transactionService.getById(transactionId),
        categoryService.listActive(),
      ]);
      transaction.value = loadedTransaction;
      category.value = categories.find(({ id }) => id === loadedTransaction.categoryId);
    } catch (error) {
      errorMessage.value = transactionErrorMessage(error, 'No pudimos cargar la transacción.');
    } finally {
      loading.value = false;
    }
  }

  async function remove(): Promise<boolean> {
    deleting.value = true;
    errorMessage.value = null;

    try {
      await transactionService.remove(transactionId);
      return true;
    } catch (error) {
      errorMessage.value = transactionErrorMessage(error, 'No pudimos eliminar la transacción.');
      return false;
    } finally {
      deleting.value = false;
    }
  }

  onMounted(load);

  return { category, deleting, errorMessage, loading, remove, transaction };
}
