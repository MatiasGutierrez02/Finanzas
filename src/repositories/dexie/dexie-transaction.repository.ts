import type { FinancesDatabase } from '@/db/finances-database';
import type { Transaction, TransactionQuery } from '@/models/transaction';
import type { TransactionRepository } from '@/repositories/contracts/transaction.repository';

export class DexieTransactionRepository implements TransactionRepository {
  constructor(private readonly database: FinancesDatabase) {}

  getById(id: Transaction['id']): Promise<Transaction | undefined> {
    return this.database.transactions.get(id);
  }

  async find(query: TransactionQuery): Promise<Transaction[]> {
    if (query.categoryId !== undefined && query.type !== undefined) {
      return this.database.transactions
        .where('[categoryId+type+date]')
        .between(
          [query.categoryId, query.type, query.startDate],
          [query.categoryId, query.type, query.endDate],
          true,
          true,
        )
        .sortBy('date');
    }

    if (query.categoryId !== undefined) {
      return this.database.transactions
        .where('[categoryId+date]')
        .between([query.categoryId, query.startDate], [query.categoryId, query.endDate], true, true)
        .sortBy('date');
    }

    if (query.type !== undefined) {
      return this.database.transactions
        .where('[type+date]')
        .between([query.type, query.startDate], [query.type, query.endDate], true, true)
        .sortBy('date');
    }

    return this.database.transactions
      .where('date')
      .between(query.startDate, query.endDate, true, true)
      .sortBy('date');
  }

  async add(transaction: Transaction): Promise<void> {
    await this.database.transactions.add(transaction);
  }

  async put(transaction: Transaction): Promise<void> {
    await this.database.transactions.put(transaction);
  }

  async remove(id: Transaction['id']): Promise<void> {
    await this.database.transactions.delete(id);
  }
}
