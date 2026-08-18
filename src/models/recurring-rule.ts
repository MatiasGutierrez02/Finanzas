import type {
  CategoryId,
  IsoTimestamp,
  LocalDate,
  MoneyCents,
  RecurringRuleId,
  YearMonth,
} from './common';
import type { TransactionType } from './transaction';

export interface RecurringRule {
  id: RecurringRuleId;
  type: TransactionType;
  amountCents: MoneyCents;
  categoryId: CategoryId;
  comment: string | null;
  startDate: LocalDate;
  dayOfMonth: number;
  isActive: boolean;
  cancelledAt?: IsoTimestamp | null;
  lastGeneratedPeriod: YearMonth | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
