import type { FinancesDatabase } from '@/db/finances-database';
import type { FixedExpenseEstimate } from '@/models/fixed-expense-estimate';
import type { FixedExpenseEstimateRepository } from '@/repositories/contracts/fixed-expense-estimate.repository';

export class DexieFixedExpenseEstimateRepository implements FixedExpenseEstimateRepository {
  constructor(private readonly database: FinancesDatabase) {}

  getById(id: FixedExpenseEstimate['id']): Promise<FixedExpenseEstimate | undefined> {
    return this.database.fixedExpenseEstimates.get(id);
  }

  getAll(): Promise<FixedExpenseEstimate[]> {
    return this.database.fixedExpenseEstimates.orderBy('createdAt').toArray();
  }

  async put(estimate: FixedExpenseEstimate): Promise<void> {
    await this.database.fixedExpenseEstimates.put(estimate);
  }

  async remove(id: FixedExpenseEstimate['id']): Promise<void> {
    await this.database.fixedExpenseEstimates.delete(id);
  }
}
