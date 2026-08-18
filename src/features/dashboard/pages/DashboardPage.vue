<template>
  <q-page class="dashboard-page q-pa-md">
    <main class="dashboard-content">
      <q-btn-toggle
        :model-value="store.mode"
        class="mode-toggle full-width"
        spread
        no-caps
        unelevated
        :color="$q.dark.isActive ? 'grey-9' : 'white'"
        :text-color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
        toggle-color="primary"
        :options="modeOptions"
        aria-label="Sección financiera"
        @update:model-value="store.setMode"
      />

      <template v-if="store.mode === 'balance'">
        <q-card flat class="balance-card q-mt-md text-white">
          <q-card-section>
            <div class="text-body2 opacity-80">Balance de {{ monthLabel }}</div>
            <div class="balance-amount text-weight-bold q-mt-xs">
              {{ formatSignedArs(snapshot?.balanceCents ?? 0) }}
            </div>
            <div class="text-caption opacity-80">Ingresos menos gastos del mes</div>
          </q-card-section>
        </q-card>

        <q-btn-toggle
          :model-value="store.transactionType"
          class="type-toggle full-width q-mt-md"
          spread
          no-caps
          unelevated
          :color="$q.dark.isActive ? 'grey-9' : 'white'"
          :text-color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
          toggle-color="primary"
          :options="typeOptions"
          aria-label="Tipo de movimiento"
          @update:model-value="setTransactionType"
        />

        <q-card flat bordered class="period-card q-mt-md">
          <q-card-section class="q-pb-sm">
            <div class="period-options" role="group" aria-label="Período">
              <q-btn
                v-for="option in periodOptions"
                :key="option.value"
                dense
                rounded
                unelevated
                no-caps
                :color="
                  store.period === option.value ? 'primary' : $q.dark.isActive ? 'grey-9' : 'grey-2'
                "
                :text-color="
                  store.period === option.value ? 'white' : $q.dark.isActive ? 'grey-3' : 'grey-8'
                "
                :label="option.label"
                @click="store.setPeriod(option.value)"
              />
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="row items-center justify-between no-wrap q-py-sm">
            <q-btn
              flat
              round
              class="nav-button"
              icon="chevron_left"
              aria-label="Período anterior"
              @click="store.movePeriod(-1)"
            />
            <strong class="period-label text-center">{{ store.periodLabel }}</strong>
            <q-btn
              flat
              round
              class="nav-button"
              icon="chevron_right"
              aria-label="Período siguiente"
              @click="store.movePeriod(1)"
            />
          </q-card-section>

          <q-card-section v-if="!isViewingCurrentPeriod" class="row justify-center q-pt-none">
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="today"
              label="Actual"
              @click="store.goToCurrentPeriod()"
            />
          </q-card-section>
        </q-card>

        <div v-if="loading" class="row justify-center q-py-xl">
          <q-spinner color="primary" size="42px" />
        </div>

        <q-banner v-else-if="errorMessage" class="error-banner q-mt-md" rounded>
          {{ errorMessage }}
          <template #action><q-btn flat no-caps label="Reintentar" @click="load" /></template>
        </q-banner>

        <template v-else-if="snapshot">
          <q-card flat bordered class="summary-card q-mt-md">
            <q-card-section class="row items-start justify-between">
              <div>
                <div class="text-caption text-grey-7">
                  Total de {{ store.transactionType === 'expense' ? 'gastos' : 'ingresos' }}
                </div>
                <div class="text-h5 text-weight-bold">{{ formatArs(snapshot.totalCents) }}</div>
              </div>
            </q-card-section>

            <q-card-section v-if="snapshot.breakdown.length > 0" class="q-pt-none">
              <CategoryDoughnutChart
                :breakdown="snapshot.breakdown"
                :total-cents="snapshot.totalCents"
              />
            </q-card-section>

            <q-card-section v-else class="empty-state text-center q-py-xl">
              <q-icon name="donut_large" size="52px" color="grey-4" />
              <h2 class="text-h6 q-mb-xs">No hay movimientos en este período</h2>
              <p class="text-body2 text-grey-7 q-mt-none">
                Cargá un {{ store.transactionType === 'expense' ? 'gasto' : 'ingreso' }} para verlo
                reflejado acá.
              </p>
            </q-card-section>
          </q-card>

          <q-card
            v-if="snapshot.breakdown.length > 0"
            flat
            bordered
            class="categories-card q-mt-md"
          >
            <q-list separator>
              <q-item
                v-for="entry in snapshot.breakdown"
                :key="entry.category.id"
                clickable
                v-ripple
                :to="{
                  name: 'category-detail',
                  params: { categoryId: entry.category.id },
                  query: {
                    type: store.transactionType,
                    period: store.period,
                    reference: store.referenceDate,
                  },
                }"
              >
                <q-item-section avatar>
                  <span class="category-dot" :style="{ backgroundColor: entry.category.color }" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ entry.category.name }}</q-item-label>
                </q-item-section>
                <q-item-section side class="category-values">
                  <strong class="category-amount">{{ formatArs(entry.amountCents) }}</strong>
                  <span class="category-percentage">{{ formatPercentage(entry.percentage) }}</span>
                </q-item-section>
                <q-item-section side><q-icon name="chevron_right" /></q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </template>

        <q-page-sticky position="bottom-right" :offset="[20, 20]">
          <q-btn
            fab
            color="primary"
            icon="add"
            aria-label="Nueva transacción"
            :to="{
              name: 'transaction-create',
              query: { type: store.transactionType },
            }"
          />
        </q-page-sticky>
      </template>
      <SavingsView v-else />
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';

import type { PeriodUnit } from '@/models/period';
import type { TransactionType } from '@/models/transaction';
import { formatPeriodLabel, isCurrentPeriod } from '@/utils/date-range';
import { formatArs, formatSignedArs } from '@/utils/money';

import CategoryDoughnutChart from '../components/CategoryDoughnutChart.vue';
import SavingsView from '@/features/savings/components/SavingsView.vue';
import { useDashboard } from '../composables/use-dashboard';

const { errorMessage, load, loading, snapshot, store } = useDashboard();
const $q = useQuasar();
const modeOptions = [
  { label: 'Balance', value: 'balance' },
  { label: 'Ahorro', value: 'savings' },
];
const typeOptions = [
  { label: 'Gastos', value: 'expense' },
  { label: 'Ingresos', value: 'income' },
];
const periodOptions: { label: string; value: PeriodUnit }[] = [
  { label: 'Día', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
  { label: 'Trimestre', value: 'quarter' },
  { label: 'Año', value: 'year' },
];
const monthLabel = computed(() => formatPeriodLabel('month', store.referenceDate));
const isViewingCurrentPeriod = computed(() => isCurrentPeriod(store.period, store.referenceDate));

function setTransactionType(value: TransactionType): void {
  store.setTransactionType(value);
}

function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)}%`;
}
</script>

<style scoped>
.dashboard-page {
  background: var(--app-background);
}

.dashboard-content {
  width: min(100%, 760px);
  margin: 0 auto;
  padding-bottom: 88px;
}

.mode-toggle,
.type-toggle,
.period-card,
.summary-card,
.categories-card {
  overflow: hidden;
  border-radius: 20px;
}

.balance-card {
  border-radius: 24px;
  background: linear-gradient(135deg, #315bdb, #5578e7);
  box-shadow: 0 12px 30px rgb(49 91 219 / 22%);
}

.balance-amount {
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.opacity-80 {
  opacity: 0.82;
}

.period-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(max-content, 1fr));
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.period-label {
  min-width: 0;
  padding: 0 8px;
}

.summary-card,
.categories-card,
.period-card {
  background: var(--app-surface);
}

.category-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.nav-button {
  min-width: 44px;
  min-height: 44px;
}

.category-values {
  min-width: 0;
  max-width: 46%;
  align-items: flex-end;
}

.category-amount {
  max-width: 100%;
  overflow: hidden;
  color: var(--app-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-percentage {
  color: var(--app-muted);
  font-size: 0.75rem;
}

.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}

@media (max-width: 420px) {
  .period-options :deep(.q-btn) {
    padding-inline: 10px;
    font-size: 0.78rem;
  }

  .categories-card :deep(.q-item) {
    padding-inline: 12px;
  }

  .categories-card :deep(.q-item__section--avatar) {
    min-width: 34px;
  }
}
</style>
