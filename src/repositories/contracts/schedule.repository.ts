import type { RecurringRule } from '@/models/recurring-rule';
import type { Transaction } from '@/models/transaction';
import type { LocalDate } from '@/models/common';

export interface RecurringOccurrenceBatch {
  rule: RecurringRule;
  occurrences: Transaction[];
}

export interface ScheduleRepository {
  createRecurring(rule: RecurringRule, firstOccurrence: Transaction): Promise<void>;
  createInstallments(installments: Transaction[]): Promise<void>;
  persistOccurrences(batches: RecurringOccurrenceBatch[]): Promise<number>;
  updateRuleAndRemoveFutureOccurrences(rule: RecurringRule, today: LocalDate): Promise<number>;
}
