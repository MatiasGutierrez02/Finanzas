import { describe, expect, it, vi } from 'vitest';

import {
  CategoryDetailService,
  groupTransactionsByDate,
} from '@/features/categories/services/category-detail.service';
import {
  buildCategoryCreateQuery,
  buildCategoryRouteContext,
  parseCategoryRouteQuery,
} from '@/features/categories/utils/category-route-context';
import type { Category } from '@/models/category';
import type { CategoryId, IsoTimestamp, TransactionId } from '@/models/common';
import type { Transaction } from '@/models/transaction';
import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import type { TransactionRepository } from '@/repositories/contracts/transaction.repository';
import { toLocalDate } from '@/utils/dates';
import { toCategoryId } from '@/utils/ids';
import { toMoneyCents } from '@/utils/money';

const categoryId = toCategoryId('category:comida');
const timestamp = '2026-08-18T12:00:00.000Z' as IsoTimestamp;
const category: Category = {
  id: categoryId,
  name: 'Comida',
  color: '#F08A4B',
  icon: 'restaurant',
  isActive: true,
  sortOrder: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};

function movement(id: string, date: string, createdAt = timestamp): Transaction {
  return {
    id: id as TransactionId,
    type: 'expense',
    amountCents: toMoneyCents(10_000),
    categoryId,
    comment: id,
    date: toLocalDate(date),
    createdAt,
    updatedAt: createdAt,
    recurringRuleId: null,
    occurrenceKey: null,
    installmentGroupId: null,
    installmentNumber: null,
    installmentCount: null,
  };
}

describe('category detail', () => {
  it('groups newest dates first and orders same-day movements by creation time', () => {
    const groups = groupTransactionsByDate([
      movement('old', '2026-08-15'),
      movement('newer-same-day', '2026-08-18', '2026-08-18T14:00:00.000Z' as IsoTimestamp),
      movement('older-same-day', '2026-08-18', '2026-08-18T10:00:00.000Z' as IsoTimestamp),
    ]);

    expect(groups.map(({ date }) => date)).toEqual(['2026-08-18', '2026-08-15']);
    expect(groups[0]?.transactions.map(({ id }) => id)).toEqual([
      'newer-same-day',
      'older-same-day',
    ]);
  });

  it('queries exactly the category, type and reused dashboard period range', async () => {
    const find = vi.fn<TransactionRepository['find']>().mockResolvedValue([]);
    const categories = {
      getById: vi.fn().mockResolvedValue(category),
    } as unknown as CategoryRepository;
    const transactions = { find } as unknown as TransactionRepository;
    const service = new CategoryDetailService({
      categories,
      transactions,
      recurrence: { generateThrough: vi.fn().mockResolvedValue(0) },
    });

    await service.getSnapshot({
      categoryId,
      type: 'income',
      period: 'quarter',
      referenceDate: toLocalDate('2026-08-18'),
    });

    expect(find).toHaveBeenCalledWith({
      categoryId,
      type: 'income',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
    });
  });

  it('round-trips dashboard context into category and create routes', () => {
    const query = parseCategoryRouteQuery(
      categoryId,
      { type: 'income', period: 'week', reference: '2026-08-18' },
      toLocalDate('2026-01-01'),
    );
    const context = buildCategoryRouteContext(query);

    expect(query).toMatchObject({ categoryId, type: 'income', period: 'week' });
    expect(buildCategoryCreateQuery(categoryId, context)).toEqual({
      category: categoryId,
      type: 'income',
      period: 'week',
      reference: '2026-08-18',
    });
  });
});
