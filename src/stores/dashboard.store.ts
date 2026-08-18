import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { LocalDate } from '@/models/common';
import type { PeriodUnit } from '@/models/period';
import type { TransactionType } from '@/models/transaction';
import { formatPeriodLabel, navigatePeriod } from '@/utils/date-range';
import { todayLocalDate } from '@/utils/dates';

export const useDashboardStore = defineStore('dashboard', () => {
  const mode = ref<'balance' | 'savings'>('balance');
  const transactionType = ref<TransactionType>('expense');
  const period = ref<PeriodUnit>('month');
  const referenceDate = ref<LocalDate>(todayLocalDate());
  const savingsReferenceDate = ref<LocalDate>(todayLocalDate());
  const periodLabel = computed(() => formatPeriodLabel(period.value, referenceDate.value));

  function setTransactionType(value: TransactionType): void {
    transactionType.value = value;
  }

  function setMode(value: 'balance' | 'savings'): void {
    mode.value = value;
  }

  function moveSavingsYear(direction: -1 | 1): void {
    savingsReferenceDate.value = navigatePeriod(savingsReferenceDate.value, 'year', direction);
  }

  function setPeriod(value: PeriodUnit): void {
    period.value = value;
  }

  function movePeriod(direction: -1 | 1): void {
    referenceDate.value = navigatePeriod(referenceDate.value, period.value, direction);
  }

  function goToCurrentPeriod(today: LocalDate = todayLocalDate()): void {
    referenceDate.value = today;
  }

  function goToCurrentSavingsYear(today: LocalDate = todayLocalDate()): void {
    savingsReferenceDate.value = today;
  }

  return {
    mode,
    goToCurrentPeriod,
    goToCurrentSavingsYear,
    movePeriod,
    moveSavingsYear,
    period,
    periodLabel,
    referenceDate,
    savingsReferenceDate,
    setMode,
    setPeriod,
    setTransactionType,
    transactionType,
  };
});
