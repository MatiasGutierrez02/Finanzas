import type { RecurringRule } from '@/models/recurring-rule';
import type { Transaction } from '@/models/transaction';
import type { IsoTimestamp, LocalDate, RecurringRuleId } from '@/models/common';

export interface RecurringOccurrenceBatch {
  rule: RecurringRule;
  occurrences: Transaction[];
}

export interface ScheduleRepository {
  createRecurring(rule: RecurringRule, firstOccurrence: Transaction): Promise<void>;
  createInstallments(installments: Transaction[]): Promise<void>;
  updateRecurringOccurrence(transaction: Transaction): Promise<void>;
  persistOccurrences(batches: RecurringOccurrenceBatch[]): Promise<number>;
  updateRuleAndRemoveFutureOccurrences(rule: RecurringRule, today: LocalDate): Promise<number>;
  resumeRule(id: RecurringRuleId, today: LocalDate, timestamp: IsoTimestamp): Promise<boolean>;
}
