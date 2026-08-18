import type {
  CategoryId,
  InstallmentGroupId,
  IsoTimestamp,
  LocalDate,
  MoneyCents,
  RecurringRuleId,
  TransactionId,
} from './common';

export const TRANSACTION_TYPES = ['expense', 'income'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: TransactionId;
  type: TransactionType;
  amountCents: MoneyCents;
  categoryId: CategoryId;
  comment: string | null;
  date: LocalDate;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  recurringRuleId: RecurringRuleId | null;
  occurrenceKey: string | null;
  installmentGroupId: InstallmentGroupId | null;
  installmentNumber: number | null;
  installmentCount: number | null;
}

export interface TransactionQuery {
  startDate: LocalDate;
  endDate: LocalDate;
  type?: TransactionType;
  categoryId?: CategoryId;
}
