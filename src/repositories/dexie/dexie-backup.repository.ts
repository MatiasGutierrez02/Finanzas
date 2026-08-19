import type { FinancesDatabase } from '@/db/finances-database';
import type { BackupData } from '@/features/settings/models/backup';
import type { BackupRepository } from '@/repositories/contracts/backup.repository';
import { normalizeSubscriptions } from '@/db/normalization/subscriptions';
import { todayLocalDate } from '@/utils/dates';

export class DexieBackupRepository implements BackupRepository {
  constructor(private readonly database: FinancesDatabase) {}

  async readAll(): Promise<BackupData> {
    const [transactions, categories, recurringRules, settings] = await this.database.transaction(
      'r',
      [
        this.database.transactions,
        this.database.categories,
        this.database.recurringRules,
        this.database.settings,
      ],
      () =>
        Promise.all([
          this.database.transactions.toArray(),
          this.database.categories.toArray(),
          this.database.recurringRules.toArray(),
          this.database.settings.toArray(),
        ]),
    );
    return { transactions, categories, recurringRules, settings };
  }

  async replaceAll(data: BackupData): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.transactions,
        this.database.categories,
        this.database.recurringRules,
        this.database.settings,
      ],
      async () => {
        await Promise.all([
          this.database.transactions.clear(),
          this.database.categories.clear(),
          this.database.recurringRules.clear(),
          this.database.settings.clear(),
        ]);
        await this.database.categories.bulkAdd(data.categories);
        await this.database.recurringRules.bulkAdd(data.recurringRules);
        await this.database.transactions.bulkAdd(data.transactions);
        await this.database.settings.bulkAdd(data.settings);
        await normalizeSubscriptions(this.database, todayLocalDate());
      },
    );
  }
}
