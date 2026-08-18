import type { FinancesDatabase } from '@/db/finances-database';
import type { RecurringRule } from '@/models/recurring-rule';
import type { RecurringRuleRepository } from '@/repositories/contracts/recurring-rule.repository';

export class DexieRecurringRuleRepository implements RecurringRuleRepository {
  constructor(private readonly database: FinancesDatabase) {}

  getById(id: RecurringRule['id']): Promise<RecurringRule | undefined> {
    return this.database.recurringRules.get(id);
  }

  getActive(): Promise<RecurringRule[]> {
    return this.database.recurringRules
      .filter((rule) => rule.isActive && rule.cancelledAt == null)
      .toArray();
  }

  getManageable(): Promise<RecurringRule[]> {
    return this.database.recurringRules.filter((rule) => rule.cancelledAt == null).toArray();
  }

  async put(rule: RecurringRule): Promise<void> {
    await this.database.recurringRules.put(rule);
  }

  async remove(id: RecurringRule['id']): Promise<void> {
    await this.database.recurringRules.delete(id);
  }
}
