import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import type { TransactionRepository } from '@/repositories/contracts/transaction.repository';
import { repositories } from '@/repositories';
import { getPeriodRange } from '@/utils/date-range';
import type { Transaction } from '@/models/transaction';
import { monthlyRecurrenceService } from '@/features/recurring/services/monthly-recurrence.service';

import type {
  CategoryDetailQuery,
  CategoryDetailSnapshot,
  TransactionDateGroup,
} from '../models/category-detail';

interface CategoryDetailServiceDependencies {
  categories: CategoryRepository;
  transactions: TransactionRepository;
  recurrence: Pick<typeof monthlyRecurrenceService, 'generateThrough'>;
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super('La categoría no existe.');
    this.name = 'CategoryNotFoundError';
  }
}

export function groupTransactionsByDate(
  transactions: readonly Transaction[],
): TransactionDateGroup[] {
  const transactionsByDate = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const group = transactionsByDate.get(transaction.date) ?? [];
    group.push(transaction);
    transactionsByDate.set(transaction.date, group);
  }

  return Array.from(transactionsByDate, ([date, groupedTransactions]) => ({
    date: groupedTransactions[0]?.date ?? (date as Transaction['date']),
    transactions: groupedTransactions.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ),
  })).sort((left, right) => right.date.localeCompare(left.date));
}

export class CategoryDetailService {
  constructor(private readonly dependencies: CategoryDetailServiceDependencies) {}

  async getSnapshot(query: CategoryDetailQuery): Promise<CategoryDetailSnapshot> {
    const range = getPeriodRange(query.period, query.referenceDate);
    await this.dependencies.recurrence.generateThrough(range.end);
    const [category, transactions] = await Promise.all([
      this.dependencies.categories.getById(query.categoryId),
      this.dependencies.transactions.find({
        categoryId: query.categoryId,
        type: query.type,
        startDate: range.start,
        endDate: range.end,
      }),
    ]);

    if (category === undefined) {
      throw new CategoryNotFoundError();
    }

    return { category, range, groups: groupTransactionsByDate(transactions) };
  }
}

export const categoryDetailService = new CategoryDetailService({
  categories: repositories.categories,
  transactions: repositories.transactions,
  recurrence: monthlyRecurrenceService,
});
