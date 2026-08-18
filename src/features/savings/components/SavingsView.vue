<template>
  <section>
    <q-card flat class="total-card q-mt-md text-white">
      <q-card-section>
        <div class="text-body2 opacity-80">Ahorro total de {{ yearLabel }}</div>
        <div class="total-amount text-weight-bold q-mt-xs">
          {{ formatSignedArs(snapshot?.totalCents ?? 0) }}
        </div>
        <div class="text-caption opacity-80">Suma de los balances mensuales</div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="year-card q-mt-md">
      <q-card-section class="row items-center justify-between q-py-sm">
        <q-btn
          flat
          round
          class="nav-button"
          icon="chevron_left"
          aria-label="Año anterior"
          @click="store.moveSavingsYear(-1)"
        />
        <strong>{{ yearLabel }}</strong>
        <q-btn
          flat
          round
          class="nav-button"
          icon="chevron_right"
          aria-label="Año siguiente"
          @click="store.moveSavingsYear(1)"
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
      <q-card flat bordered class="chart-card q-mt-md">
        <q-card-section v-if="snapshot.positiveMonths.length > 0">
          <SavingsDoughnutChart
            :months="snapshot.positiveMonths"
            :total-cents="snapshot.totalCents"
            :year="snapshot.year"
          />
        </q-card-section>
        <q-card-section v-else class="text-center q-py-xl">
          <q-icon name="savings" size="52px" color="grey-4" />
          <h2 class="text-h6 q-mb-xs">Sin ahorro positivo</h2>
          <p class="text-body2 text-grey-7 q-mt-none">
            {{
              snapshot.months.some(({ hasActivity }) => hasActivity)
                ? 'Los déficits se detallan debajo.'
                : 'No hay movimientos registrados para este año.'
            }}
          </p>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="months-card q-mt-md">
        <q-list separator>
          <q-item v-for="month in snapshot.months" :key="month.monthIndex">
            <q-item-section avatar>
              <span class="month-dot" :style="{ backgroundColor: month.color }" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ month.name }}</q-item-label>
              <q-item-label v-if="month.balanceCents < 0" caption class="text-negative"
                >Déficit</q-item-label
              >
              <q-item-label v-else-if="month.balanceCents > 0" caption class="text-positive"
                >Ahorro</q-item-label
              >
              <q-item-label v-else caption>{{
                month.hasActivity ? 'Sin diferencia' : 'Sin actividad'
              }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <strong :class="amountClass(month.balanceCents)">{{
                formatSigned(month.balanceCents)
              }}</strong>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import SavingsDoughnutChart from './SavingsDoughnutChart.vue';
import { useSavings } from '../composables/use-savings';
import { formatSignedArs } from '@/utils/money';

const { errorMessage, load, loading, snapshot, store } = useSavings();
const yearLabel = computed(() => store.savingsReferenceDate.slice(0, 4));

function formatSigned(value: number): string {
  if (value > 0) return `+${formatSignedArs(value)}`;
  return formatSignedArs(value);
}

function amountClass(value: number): string {
  if (value > 0) return 'text-positive';
  if (value < 0) return 'text-negative';
  return 'text-grey-7';
}
</script>

<style scoped>
.total-card {
  border-radius: 24px;
  background: linear-gradient(135deg, #00897b, #35a796);
  box-shadow: 0 12px 30px rgb(0 137 123 / 22%);
}
.total-amount {
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.opacity-80 {
  opacity: 0.82;
}
.year-card,
.chart-card,
.months-card {
  overflow: hidden;
  border-radius: 20px;
  background: var(--app-surface);
}
.month-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}
.nav-button {
  min-width: 44px;
  min-height: 44px;
}
.months-card :deep(.q-item__section--side) {
  min-width: 0;
  max-width: 52%;
  text-align: right;
}
.months-card :deep(.q-item__section--side strong) {
  overflow-wrap: anywhere;
}
</style>
