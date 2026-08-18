import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateMonthlySavings,
  SavingsService,
} from '@/features/savings/services/savings.service';
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
    });

    const snapshot = await service.getSnapshot({ referenceDate: toLocalDate('2026-08-18') });

    expect(snapshot.months.slice(0, 3).map(({ balanceCents }) => balanceCents)).toEqual([
      75_000, -25_000, 80_000,
    ]);
    expect(snapshot.totalCents).toBe(130_000);
    expect(snapshot.positiveMonths.map(({ name }) => name)).toEqual(['Enero', 'Marzo']);
    expect(find).toHaveBeenCalledWith({ startDate: '2026-01-01', endDate: '2026-12-31' });
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
    });

    expect(
      (await service.getSnapshot({ referenceDate: toLocalDate('2026-01-01') })).totalCents,
    ).toBe(100_000);
    expect(
      (await service.getSnapshot({ referenceDate: toLocalDate('2026-01-01') })).totalCents,
    ).toBe(60_000);
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
});
