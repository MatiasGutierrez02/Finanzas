import { onMounted, ref } from 'vue';

import type { Category } from '@/models/category';
import type { Transaction } from '@/models/transaction';
import { categoryService } from '@/features/categories/services/category.service';
import { formatMoneyInput } from '@/utils/money';

import type { TransactionFormValue } from '../models/transaction-form';
import { transactionService } from '../services/transaction.service';
import { transactionErrorMessage } from './transaction-error';

function transactionToFormValue(transaction: Transaction): TransactionFormValue {
  return {
    type: transaction.type,
    amount: formatMoneyInput(transaction.amountCents),
    categoryId: transaction.categoryId,
    comment: transaction.comment ?? '',
    date: transaction.date,
    schedule:
      transaction.recurringRuleId !== null
        ? 'subscription'
        : transaction.installmentGroupId !== null
          ? 'installments'
          : 'none',
    installmentCount: transaction.installmentCount?.toString() ?? '2',
  };
}

export function useTransactionEditor(transactionId?: string) {
  const categories = ref<Category[]>([]);
  const initialValue = ref<TransactionFormValue>();
  const loading = ref(true);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    errorMessage.value = null;

    try {
      if (transactionId === undefined) {
        categories.value = await categoryService.listActive();
      } else {
        const [availableCategories, transaction] = await Promise.all([
          categoryService.listActive(),
          transactionService.getById(transactionId),
        ]);
        categories.value = availableCategories;
        initialValue.value = transactionToFormValue(transaction);
      }
    } catch (error) {
      errorMessage.value = transactionErrorMessage(error, 'No pudimos preparar el formulario.');
    } finally {
      loading.value = false;
    }
  }

  async function save(value: TransactionFormValue): Promise<Transaction | null> {
    if (saving.value) return null;
    saving.value = true;
    errorMessage.value = null;

    try {
      return transactionId === undefined
        ? await transactionService.create(value)
        : await transactionService.update(transactionId, value);
    } catch (error) {
      errorMessage.value = transactionErrorMessage(error, 'No pudimos guardar la transacción.');
      return null;
    } finally {
      saving.value = false;
    }
  }

  onMounted(load);

  return { categories, errorMessage, initialValue, loading, save, saving };
}
