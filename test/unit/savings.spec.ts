import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateMonthlySavings,
  savingsService,
  SavingsService,
} from '@/features/savings/services/savings.service';
import { useSavings } from '@/features/savings/composables/use-savings';
import type { SavingsSnapshot } from '@/features/savings/models/savings';
import type { CategoryId, IsoTimestamp, TransactionId } from '@/models/common';
import type { PeriodUnit } from '@/models/period';
import type { Transaction } from '@/models/transaction';
import type { TransactionRepository } from '@/repositories/contracts/transaction.repository';
import { useDashboardStore } from '@/stores/dashboard.store';
import { toLocalDate } from '@/utils/dates';
import { toCategoryId } from '@/utils/ids';
import { toMoneyCents } from '@/utils/money';
import { isCurrentPeriod } from '@/utils/date-range';

const timestamp = '2026-08-18T12:00:00.000Z' as IsoTimestamp;
const categoryId = toCategoryId('category:comida');

function transaction(
  id: string,
  type: Transaction['type'],
  amountCents: number,
  date: string,
  category: CategoryId = categoryId,
): Transaction {
  return {
    id: id as TransactionId,
    type,
    amountCents: toMoneyCents(amountCents),
    categoryId: category,
    comment: null,
    date: toLocalDate(date),
    createdAt: timestamp,
    updatedAt: timestamp,
    recurringRuleId: null,
    occurrenceKey: null,
    installmentGroupId: null,
    installmentNumber: null,
    installmentCount: null,
  };
}

describe('savings calculations', () => {
  it('derives monthly savings and keeps deficits outside positive months', async () => {
    const transactions = [
      transaction('jan-income', 'income', 100_000, '2026-01-10'),
      transaction('jan-expense', 'expense', 25_000, '2026-01-15'),
      transaction('feb-income', 'income', 10_000, '2026-02-01'),
      transaction('feb-expense', 'expense', 35_000, '2026-02-20'),
      transaction('mar-income', 'income', 80_000, '2026-03-12'),
    ];
    const find = vi.fn<TransactionRepository['find']>().mockResolvedValue(transactions);
    const service = new SavingsService({
      transactions: { find } as unknown as TransactionRepository,
      recurrence: { generateThrough: vi.fn().mockResolvedValue(0) },
      today: () => toLocalDate('2026-08-18'),
    });

    const snapshot = await service.getSnapshot({ referenceDate: toLocalDate('2026-08-18') });

    expect(snapshot.months.slice(0, 3).map(({ balanceCents }) => balanceCents)).toEqual([
      75_000, -25_000, 80_000,
    ]);
    expect(snapshot.totalCents).toBe(130_000);
    expect(snapshot.positiveMonths.map(({ name }) => name)).toEqual(['Enero', 'Marzo']);
    expect(find).toHaveBeenCalledWith({ startDate: '2026-01-01', endDate: '2026-08-18' });
  });

  it('returns twelve neutral months for a year without movements', () => {
    const months = calculateMonthlySavings([], 2026);
    expect(months).toHaveLength(12);
    expect(
      months.every(({ balanceCents, hasActivity }) => balanceCents === 0 && !hasActivity),
    ).toBe(true);
  });

  it('recalculates from changed historical transactions instead of persisted savings', async () => {
    const find = vi
      .fn<TransactionRepository['find']>()
      .mockResolvedValueOnce([transaction('income', 'income', 100_000, '2026-01-10')])
      .mockResolvedValueOnce([transaction('income-edited', 'income', 60_000, '2026-01-10')]);
    const service = new SavingsService({
      transactions: { find } as unknown as TransactionRepository,
      recurrence: { generateThrough: vi.fn().mockResolvedValue(0) },
      today: () => toLocalDate('2026-08-18'),
    });

    expect(
      (await service.getSnapshot({ referenceDate: toLocalDate('2026-01-01') })).totalCents,
    ).toBe(100_000);
    expect(
      (await service.getSnapshot({ referenceDate: toLocalDate('2026-01-01') })).totalCents,
    ).toBe(60_000);
  });

  it('counts only realized movements through today, excluding every kind of future transaction', async () => {
    const transactions = [
      transaction('realized', 'income', 100_000, '2026-08-18'),
      {
        ...transaction('future-installment', 'expense', 30_000, '2026-08-25'),
        installmentGroupId: 'group-1' as Transaction['installmentGroupId'],
        installmentNumber: 2,
        installmentCount: 2,
      },
      {
        ...transaction('future-expense', 'expense', 20_000, '2026-09-01'),
        recurringRuleId: 'expense-rule' as Transaction['recurringRuleId'],
        occurrenceKey: 'expense-rule:2026-09',
      },
      {
        ...transaction('future-income', 'income', 45_000, '2026-09-01'),
        recurringRuleId: 'income-rule' as Transaction['recurringRuleId'],
        occurrenceKey: 'income-rule:2026-09',
      },
    ];
    const find = vi
      .fn<TransactionRepository['find']>()
      .mockImplementation(async ({ endDate }) =>
        transactions.filter(({ date }) => date <= endDate),
      );
    const generateThrough = vi.fn().mockResolvedValue(0);
    const service = new SavingsService({
      transactions: { find } as unknown as TransactionRepository,
      recurrence: { generateThrough },
      today: () => toLocalDate('2026-08-18'),
    });

    const snapshot = await service.getSnapshot({ referenceDate: toLocalDate('2026-08-01') });

    expect(snapshot.totalCents).toBe(100_000);
    expect(find).toHaveBeenCalledWith({ startDate: '2026-01-01', endDate: '2026-08-18' });
    expect(generateThrough).toHaveBeenCalledWith('2026-08-18');
    expect(generateThrough).not.toHaveBeenCalledWith('2026-12-31');
  });

  it('uses the complete calendar year for a previous year', async () => {
    const find = vi
      .fn<TransactionRepository['find']>()
      .mockResolvedValue([transaction('december', 'income', 75_000, '2025-12-31')]);
    const generateThrough = vi.fn().mockResolvedValue(0);
    const service = new SavingsService({
      transactions: { find } as unknown as TransactionRepository,
      recurrence: { generateThrough },
      today: () => toLocalDate('2026-08-18'),
    });

    expect(
      (await service.getSnapshot({ referenceDate: toLocalDate('2025-01-01') })).totalCents,
    ).toBe(75_000);
    expect(find).toHaveBeenCalledWith({ startDate: '2025-01-01', endDate: '2025-12-31' });
  });

  it('returns zero for a future year without reading or materializing future data', async () => {
    const find = vi.fn<TransactionRepository['find']>();
    const generateThrough = vi.fn();
    const service = new SavingsService({
      transactions: { find } as unknown as TransactionRepository,
      recurrence: { generateThrough },
      today: () => toLocalDate('2026-08-18'),
    });

    const snapshot = await service.getSnapshot({ referenceDate: toLocalDate('2027-01-01') });

    expect(snapshot.totalCents).toBe(0);
    expect(snapshot.months.every(({ hasActivity }) => !hasActivity)).toBe(true);
    expect(find).not.toHaveBeenCalled();
    expect(generateThrough).not.toHaveBeenCalled();
  });
});

describe('savings year navigation', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('moves exactly one calendar year in either direction', () => {
    const store = useDashboardStore();
    store.savingsReferenceDate = toLocalDate('2026-08-18');
    store.moveSavingsYear(-1);
    expect(store.savingsReferenceDate).toBe('2025-01-01');
    store.moveSavingsYear(1);
    expect(store.savingsReferenceDate).toBe('2026-01-01');
  });

  it.each(['day', 'week', 'month', 'quarter', 'year'] as PeriodUnit[])(
    'returns the dashboard to the current %s',
    (period) => {
      const store = useDashboardStore();
      const today = toLocalDate('2026-08-18');
      store.period = period;
      store.referenceDate = toLocalDate('2024-02-29');

      store.goToCurrentPeriod(today);

      expect(store.referenceDate).toBe(today);
      expect(isCurrentPeriod(period, store.referenceDate, today)).toBe(true);
    },
  );

  it('returns savings to the current year', () => {
    const store = useDashboardStore();
    const today = toLocalDate('2026-08-18');
    store.savingsReferenceDate = toLocalDate('2023-01-01');

    store.goToCurrentSavingsYear(today);

    expect(store.savingsReferenceDate).toBe(today);
    expect(isCurrentPeriod('year', store.savingsReferenceDate, today)).toBe(true);
  });

  it('discards stale savings responses when navigating quickly between years', async () => {
    const pending = new Map<number, (snapshot: SavingsSnapshot) => void>();
    const getSnapshot = vi
      .spyOn(savingsService, 'getSnapshot')
      .mockImplementation(
        ({ referenceDate }) =>
          new Promise((resolve) => pending.set(Number(referenceDate.slice(0, 4)), resolve)),
      );
    const scope = effectScope();
    const composable = scope.run(() => useSavings());
    if (composable === undefined) throw new Error('No se pudo iniciar Ahorro');
    const store = useDashboardStore();

    await nextTick();
    store.savingsReferenceDate = toLocalDate('2025-01-01');
    await nextTick();
    store.savingsReferenceDate = toLocalDate('2026-01-01');
    await nextTick();
    store.savingsReferenceDate = toLocalDate('2027-01-01');
    await nextTick();

    const snapshot = (year: number): SavingsSnapshot => ({
      year,
      totalCents: year,
      months: [],
      positiveMonths: [],
    });
    pending.get(2027)?.(snapshot(2027));
    await nextTick();
    pending.get(2025)?.(snapshot(2025));
    pending.get(2026)?.(snapshot(2026));
    await nextTick();

    expect(composable.snapshot.value?.year).toBe(2027);
    expect(composable.loading.value).toBe(false);
    expect(getSnapshot).toHaveBeenCalled();
    scope.stop();
  });
});
