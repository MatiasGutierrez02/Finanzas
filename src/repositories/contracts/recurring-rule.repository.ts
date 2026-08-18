import type { RecurringRule } from '@/models/recurring-rule';

export interface RecurringRuleRepository {
  getById(id: RecurringRule['id']): Promise<RecurringRule | undefined>;
  getActive(): Promise<RecurringRule[]>;
  put(rule: RecurringRule): Promise<void>;
  remove(id: RecurringRule['id']): Promise<void>;
}
