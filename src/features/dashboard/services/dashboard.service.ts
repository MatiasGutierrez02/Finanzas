import type { Category } from '@/models/category';
import type { MoneyCents } from '@/models/common';
import type { Transaction } from '@/models/transaction';
import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import type { TransactionRepository } from '@/repositories/contracts/transaction.repository';
import { repositories } from '@/repositories';
import { getPeriodRange } from '@/utils/date-range';
import { toMoneyCents } from '@/utils/money';
import { monthlyRecurrenceService } from '@/features/recurring/services/monthly-recurrence.service';

import type { CategoryBreakdown, DashboardQuery, DashboardSnapshot } from '../models/dashboard';

interface DashboardServiceDependencies {
  transactions: TransactionRepository;
  categories: CategoryRepository;
  recurrence: Pick<typeof monthlyRecurrenceService, 'generateThrough'>;
}

function safeSum(values: Iterable<number>): number {
  let result = 0;

  for (const value of values) {
    result += value;

    if (!Number.isSafeInteger(result)) {
      throw new RangeError('El total supera el rango seguro para montos en centavos.');
    }
  }

  return result;
}

export function calculateBalance(transactions: readonly Transaction[]): number {
  return safeSum(
    transactions.map(({ amountCents, type }) =>
      type === 'income' ? Number(amountCents) : -Number(amountCents),
    ),
  );
}

export function buildCategoryBreakdown(
  transactions: readonly Transaction[],
  categories: readonly Category[],
): { totalCents: MoneyCents; breakdown: CategoryBreakdown[] } {
  const amountsByCategory = new Map<Category['id'], number>();

  for (const transaction of transactions) {
    const current = amountsByCategory.get(transaction.categoryId) ?? 0;
    const next = current + transaction.amountCents;

    if (!Number.isSafeInteger(next)) {
      throw new RangeError('El total de la categoría supera el rango seguro.');
    }

    amountsByCategory.set(transaction.categoryId, next);
  }

  const totalCents = toMoneyCents(safeSum(amountsByCategory.values()));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const breakdown = Array.from(amountsByCategory, ([categoryId, amount]) => {
    const category = categoriesById.get(categoryId);

    if (category === undefined) {
      return null;
    }

    return {
      category,
      amountCents: toMoneyCents(amount),
      percentage: totalCents === 0 ? 0 : Math.round((amount / totalCents) * 1000) / 10,
    };
  })
    .filter((entry): entry is CategoryBreakdown => entry !== null)
    .sort((left, right) => right.amountCents - left.amountCents);

  return { totalCents, breakdown };
}

export class DashboardService {
  constructor(private readonly dependencies: DashboardServiceDependencies) {}

  async getSnapshot(query: DashboardQuery): Promise<DashboardSnapshot> {
    const range = getPeriodRange(query.period, query.referenceDate);
    const monthRange = getPeriodRange('month', query.referenceDate);
    await this.dependencies.recurrence.generateThrough(
      range.end > monthRange.end ? range.end : monthRange.end,
    );
    const [selectedTransactions, monthlyTransactions, categories] = await Promise.all([
      this.dependencies.transactions.find({
        startDate: range.start,
        endDate: range.end,
        type: query.type,
      }),
      this.dependencies.transactions.find({
        startDate: monthRange.start,
        endDate: monthRange.end,
      }),
      this.dependencies.categories.getAll(),
    ]);
    const { totalCents, breakdown } = buildCategoryBreakdown(selectedTransactions, categories);

    return {
      balanceCents: calculateBalance(monthlyTransactions),
      totalCents,
      range,
      breakdown,
    };
  }
}

export const dashboardService = new DashboardService({
  transactions: repositories.transactions,
  categories: repositories.categories,
  recurrence: monthlyRecurrenceService,
});
