import type { Category } from '@/models/category';
import type { LocalDate } from '@/models/common';
import type { DateRange, PeriodUnit } from '@/models/period';
import type { Transaction, TransactionType } from '@/models/transaction';

export interface CategoryDetailQuery {
  categoryId: Category['id'];
  type: TransactionType;
  period: PeriodUnit;
  referenceDate: LocalDate;
}

export interface TransactionDateGroup {
  date: LocalDate;
  transactions: Transaction[];
}

export interface CategoryDetailSnapshot {
  category: Category;
  range: DateRange;
  groups: TransactionDateGroup[];
}
