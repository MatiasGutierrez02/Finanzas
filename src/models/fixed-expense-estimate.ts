import type { CategoryId, FixedExpenseEstimateId, IsoTimestamp, MoneyCents } from './common';

export interface FixedExpenseEstimate {
  id: FixedExpenseEstimateId;
  name: string;
  amountCents: MoneyCents;
  categoryId: CategoryId | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
