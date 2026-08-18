<template>
  <q-page class="app-page q-pa-md">
    <section class="page-content" :aria-labelledby="pageTitleId">
      <h1 :id="pageTitleId" class="text-h5 text-weight-bold q-mt-sm q-mb-lg">
        {{ isEditing ? 'Editar transacción' : 'Nueva transacción' }}
      </h1>

      <div v-if="loading" class="row justify-center q-py-xl">
        <q-spinner color="primary" size="40px" />
      </div>

      <TransactionForm
        v-else-if="errorMessage === null || categories.length > 0"
        :categories="categories"
        :default-category-id="defaultCategoryId"
        :default-type="defaultType"
        :error-message="errorMessage"
        :initial-value="initialValue"
        :mode="isEditing ? 'edit' : 'create'"
        :saving="saving"
        @submit="submit"
      />

      <q-banner v-else class="error-banner" rounded>{{ errorMessage }}</q-banner>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';

import TransactionForm from '../components/TransactionForm.vue';
import { useTransactionEditor } from '../composables/use-transaction-editor';
import type { TransactionFormValue } from '../models/transaction-form';
import type { TransactionType } from '@/models/transaction';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const transactionId = typeof route.params.id === 'string' ? route.params.id : undefined;
const defaultType: TransactionType = route.query.type === 'income' ? 'income' : 'expense';
const defaultCategoryId =
  typeof route.query.category === 'string' ? route.query.category : undefined;
const isEditing = computed(() => transactionId !== undefined);
const pageTitleId = 'transaction-editor-title';
const { categories, errorMessage, initialValue, loading, save, saving } =
  useTransactionEditor(transactionId);

async function submit(value: TransactionFormValue): Promise<void> {
  if (saving.value) return;
  const transaction = await save(value);

  if (transaction === null) {
    $q.notify({ type: 'negative', message: errorMessage.value ?? 'No se pudo guardar.' });
    return;
  }

  $q.notify({
    type: 'positive',
    message: isEditing.value ? 'Transacción actualizada.' : 'Transacción creada.',
  });
  await router.replace(
    isEditing.value
      ? { name: 'transaction-detail', params: { id: transaction.id }, query: route.query }
      : { name: 'dashboard' },
  );
}
</script>

<style scoped>
.app-page {
  background: var(--app-background);
}

.page-content {
  width: min(100%, 640px);
  margin: 0 auto;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}
</style>
