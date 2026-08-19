import type { FixedExpenseEstimate } from '@/models/fixed-expense-estimate';

export interface FixedExpenseEstimateRepository {
  getById(id: FixedExpenseEstimate['id']): Promise<FixedExpenseEstimate | undefined>;
  getAll(): Promise<FixedExpenseEstimate[]>;
  put(estimate: FixedExpenseEstimate): Promise<void>;
  remove(id: FixedExpenseEstimate['id']): Promise<void>;
}
