import type { FinancesDatabase } from '@/db/finances-database';
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
          for (const occurrence of occurrences) {
            const exists = await this.database.transactions
              .where('occurrenceKey')
              .equals(occurrence.occurrenceKey ?? '')
              .first();

            if (exists === undefined) {
              await this.database.transactions.add(occurrence);
              created += 1;
            }
          }

          await this.database.recurringRules.put(rule);
        }

        return created;
      },
    );
  }
}
