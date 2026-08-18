<template>
  <div
    class="chart-wrapper"
    role="img"
    :aria-label="`Distribución por categoría. Total ${formattedTotal}`"
  >
    <Doughnut :data="chartData" :options="chartOptions" />
    <div class="chart-center" aria-hidden="true">
      <span class="text-caption text-grey-7">Total</span>
      <strong class="text-subtitle1">{{ formattedTotal }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArcElement, Chart as ChartJS, Tooltip, type ChartData, type ChartOptions } from 'chart.js';
import { Doughnut } from 'vue-chartjs';

import type { CategoryBreakdown } from '../models/dashboard';
import type { MoneyCents } from '@/models/common';
import { formatArs } from '@/utils/money';

ChartJS.register(ArcElement, Tooltip);

const props = defineProps<{
  breakdown: CategoryBreakdown[];
  totalCents: MoneyCents;
}>();

const formattedTotal = computed(() => formatArs(props.totalCents));
const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: props.breakdown.map(({ category }) => category.name),
  datasets: [
    {
      data: props.breakdown.map(({ amountCents }) => amountCents),
      backgroundColor: props.breakdown.map(({ category }) => category.color),
      borderColor: 'transparent',
      borderWidth: 2,
      hoverOffset: 4,
    },
  ],
}));
const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  animation: { duration: 300 },
  plugins: {
    tooltip: { enabled: true },
  },
};
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  width: min(100%, 320px);
  height: 280px;
  margin: 0 auto;
}

.chart-center {
  position: absolute;
  inset: 50% auto auto 50%;
  display: flex;
  flex-direction: column;
  width: 55%;
  text-align: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.chart-center strong {
  overflow: hidden;
  font-size: clamp(0.8rem, 4vw, 1rem);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
