import type { FinancesDatabase } from '@/db/finances-database';
import type { LocalDate } from '@/models/common';
import type { RecurringRule } from '@/models/recurring-rule';
import type { Transaction } from '@/models/transaction';
import type {
  RecurringOccurrenceBatch,
  ScheduleRepository,
} from '@/repositories/contracts/schedule.repository';

export class DexieScheduleRepository implements ScheduleRepository {
  constructor(private readonly database: FinancesDatabase) {}

  async createRecurring(rule: RecurringRule, firstOccurrence: Transaction): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.recurringRules, this.database.transactions],
      async () => {
        await this.database.recurringRules.add(rule);
        await this.database.transactions.add(firstOccurrence);
      },
    );
  }

  async createInstallments(installments: Transaction[]): Promise<void> {
    await this.database.transaction('rw', this.database.transactions, async () => {
      await this.database.transactions.bulkAdd(installments);
    });
  }

  async persistOccurrences(batches: RecurringOccurrenceBatch[]): Promise<number> {
    return this.database.transaction(
      'rw',
      [this.database.recurringRules, this.database.transactions],
      async () => {
        let created = 0;

        for (const { rule, occurrences } of batches) {
          const currentRule = await this.database.recurringRules.get(rule.id);

          if (
            currentRule === undefined ||
            !currentRule.isActive ||
            currentRule.cancelledAt != null
          ) {
            continue;
          }

          const pendingOccurrences = occurrences.filter((occurrence) => {
            const period = occurrence.date.slice(0, 7);
            return (
              currentRule.lastGeneratedPeriod === null || period > currentRule.lastGeneratedPeriod
            );
          });

          for (const occurrence of pendingOccurrences) {
            const exists = await this.database.transactions
              .where('occurrenceKey')
              .equals(occurrence.occurrenceKey ?? '')
              .first();

            if (exists === undefined) {
              await this.database.transactions.add(occurrence);
              created += 1;
            }
          }

          const lastGeneratedPeriod = pendingOccurrences.at(-1)?.date.slice(0, 7);
          if (lastGeneratedPeriod !== undefined) {
            await this.database.recurringRules.put({
              ...currentRule,
              lastGeneratedPeriod: lastGeneratedPeriod as RecurringRule['lastGeneratedPeriod'],
              updatedAt: rule.updatedAt,
            });
          }
        }

        return created;
      },
    );
  }

  async updateRuleAndRemoveFutureOccurrences(
    rule: RecurringRule,
    today: LocalDate,
  ): Promise<number> {
    return this.database.transaction(
      'rw',
      [this.database.recurringRules, this.database.transactions],
      async () => {
        const removed = await this.database.transactions
          .where('[recurringRuleId+date]')
          .between([rule.id, today], [rule.id, '9999-12-31'], false, true)
          .delete();
        await this.database.recurringRules.put(rule);
        return removed;
      },
    );
  }
}
