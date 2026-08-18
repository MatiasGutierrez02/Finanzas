<template>
  <q-page class="app-page q-pa-md">
    <section class="page-content" aria-labelledby="transaction-title">
      <div v-if="loading" class="row justify-center q-py-xl">
        <q-spinner color="primary" size="40px" />
      </div>

      <q-banner v-else-if="errorMessage && !transaction" class="error-banner" rounded>
        {{ errorMessage }}
      </q-banner>

      <template v-else-if="transaction">
        <p class="text-overline text-primary q-mb-xs">DETALLE</p>
        <h1 id="transaction-title" class="text-h5 text-weight-bold q-mt-none q-mb-lg">
          {{ transaction.type === 'expense' ? 'Gasto' : 'Ingreso' }}
        </h1>

        <q-card flat bordered class="detail-card">
          <q-card-section class="text-center q-py-xl">
            <div
              class="detail-amount text-weight-bold"
              :class="transaction.type === 'expense' ? 'text-negative' : 'text-positive'"
            >
              {{ formatArs(transaction.amountCents) }}
            </div>
          </q-card-section>

          <q-separator />

          <q-list separator>
            <q-item>
              <q-item-section avatar>
                <span
                  class="category-icon"
                  :style="{ backgroundColor: category?.color ?? '#757575' }"
                >
                  <q-icon :name="resolveCategoryIcon(category?.icon ?? null)" size="22px" />
                </span>
              </q-item-section>
              <q-item-section>
                <q-item-label caption>Categoría</q-item-label>
                <q-item-label class="row items-center q-gutter-sm">
                  <span>{{ category?.name ?? 'Sin categoría' }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="transaction.installmentNumber !== null">
              <q-item-section avatar><q-icon name="credit_card" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Cuota</q-item-label>
                <q-item-label>
                  {{ transaction.installmentNumber }}/{{ transaction.installmentCount }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-else-if="transaction.recurringRuleId !== null">
              <q-item-section avatar><q-icon name="autorenew" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Modalidad</q-item-label>
                <q-item-label>Suscripción mensual</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar
                ><q-icon name="calendar_today" color="grey-7"
              /></q-item-section>
              <q-item-section>
                <q-item-label caption>Fecha</q-item-label>
                <q-item-label>{{ formatLocalDate(transaction.date) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="notes" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Comentario</q-item-label>
                <q-item-label>{{ transaction.comment || 'Sin comentario' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>

        <q-banner v-if="errorMessage" class="error-banner q-mt-md" rounded>
          {{ errorMessage }}
        </q-banner>

        <div class="row q-col-gutter-sm q-mt-md">
          <div class="col-12 col-sm-6">
            <q-btn
              class="full-width action-button"
              outline
              color="primary"
              icon="edit"
              no-caps
              label="Editar"
              :to="{ name: 'transaction-edit', params: { id: transaction.id }, query: route.query }"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-btn
              class="full-width action-button"
              flat
              color="negative"
              icon="delete"
              no-caps
              label="Eliminar"
              :loading="deleting"
              @click="confirmDelete"
            />
          </div>
        </div>
      </template>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';

import { formatLocalDate } from '@/utils/dates';
import { formatArs } from '@/utils/money';
import { resolveCategoryIcon } from '@/features/categories/utils/category-icons';

import { useTransactionDetail } from '../composables/use-transaction-detail';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const transactionId = typeof route.params.id === 'string' ? route.params.id : '';
const { category, deleting, errorMessage, loading, remove, transaction } =
  useTransactionDetail(transactionId);

function confirmDelete(): void {
  $q.dialog({
    title: 'Eliminar transacción',
    message: 'Esta acción no se puede deshacer. ¿Querés continuar?',
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true },
    persistent: true,
  }).onOk(() => {
    void deleteTransaction();
  });
}

async function deleteTransaction(): Promise<void> {
  if (await remove()) {
    $q.notify({ type: 'positive', message: 'Transacción eliminada.' });
    const categoryId = typeof route.query.category === 'string' ? route.query.category : undefined;
    await router.replace(
      categoryId === undefined
        ? { name: 'dashboard' }
        : {
            name: 'category-detail',
            params: { categoryId },
            query: {
              type: route.query.type,
              period: route.query.period,
              reference: route.query.reference,
            },
          },
    );
  } else {
    $q.notify({ type: 'negative', message: errorMessage.value ?? 'No se pudo eliminar.' });
  }
}
</script>

<style scoped>
.app-page {
  background: var(--app-background);
}

.page-content {
  width: min(100%, 640px);
  margin: 0 auto;
  padding-top: clamp(0.5rem, 3vw, 2rem);
}

.detail-card {
  overflow: hidden;
  border-radius: 20px;
  background: var(--app-surface);
}

.detail-amount {
  font-size: clamp(1.8rem, 10vw, 3rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.category-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: white;
  border-radius: 50%;
}

.action-button {
  min-height: 48px;
  border-radius: 14px;
}

.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}
</style>
