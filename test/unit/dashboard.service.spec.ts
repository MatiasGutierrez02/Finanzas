import { describe, expect, it } from 'vitest';

import {
  buildCategoryBreakdown,
  calculateBalance,
} from '@/features/dashboard/services/dashboard.service';
import type { Category } from '@/models/category';
import type { CategoryId, IsoTimestamp, TransactionId } from '@/models/common';
import type { Transaction } from '@/models/transaction';
import { toLocalDate } from '@/utils/dates';
import { toCategoryId } from '@/utils/ids';
import { toMoneyCents } from '@/utils/money';

const timestamp = '2026-08-18T12:00:00.000Z' as IsoTimestamp;
const foodId = toCategoryId('category:comida');
const carId = toCategoryId('category:auto');

function category(id: CategoryId, name: string, color: `#${string}`): Category {
  return {
    id,
    name,
    color,
    icon: null,
    isSystem: true,
    isActive: true,
    sortOrder: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function transaction(
  id: string,
  type: Transaction['type'],
  amountCents: number,
  categoryId: CategoryId,
): Transaction {
  return {
    id: id as TransactionId,
    type,
    amountCents: toMoneyCents(amountCents),
    categoryId,
    comment: null,
    date: toLocalDate('2026-08-18'),
    createdAt: timestamp,
    updatedAt: timestamp,
    recurringRuleId: null,
    occurrenceKey: null,
    installmentGroupId: null,
    installmentNumber: null,
    installmentCount: null,
  };
}

describe('dashboard calculations', () => {
  it('calculates income minus expenses for the balance', () => {
    expect(
      calculateBalance([
        transaction('income', 'income', 100_000, foodId),
        transaction('expense-one', 'expense', 25_000, foodId),
        transaction('expense-two', 'expense', 45_000, carId),
      ]),
    ).toBe(30_000);
  });

  it('groups categories, sorts descending and calculates percentages', () => {
    const result = buildCategoryBreakdown(
      [
        transaction('food-one', 'expense', 20_000, foodId),
        transaction('food-two', 'expense', 10_000, foodId),
        transaction('car', 'expense', 10_000, carId),
      ],
      [category(foodId, 'Comida', '#F08A4B'), category(carId, 'Auto', '#607D8B')],
    );

    expect(result.totalCents).toBe(40_000);
    expect(
      result.breakdown.map(({ category: item, amountCents, percentage }) => ({
        id: item.id,
        amountCents,
        percentage,
      })),
    ).toEqual([
      { id: foodId, amountCents: 30_000, percentage: 75 },
      { id: carId, amountCents: 10_000, percentage: 25 },
    ]);
  });
});
