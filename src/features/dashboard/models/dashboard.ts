import type { Category } from '@/models/category';
import type { LocalDate, MoneyCents } from '@/models/common';
import type { DateRange, PeriodUnit } from '@/models/period';
import type { TransactionType } from '@/models/transaction';

export interface DashboardQuery {
  type: TransactionType;
  period: PeriodUnit;
  referenceDate: LocalDate;
}

export interface CategoryBreakdown {
  category: Category;
  amountCents: MoneyCents;
  percentage: number;
}

export interface DashboardSnapshot {
  balanceCents: number;
  totalCents: MoneyCents;
  range: DateRange;
  breakdown: CategoryBreakdown[];
}
