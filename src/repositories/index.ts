import { financesDatabase, type FinancesDatabase } from '@/db/finances-database';

import { DexieCategoryRepository } from './dexie/dexie-category.repository';
import { DexieBackupRepository } from './dexie/dexie-backup.repository';
import { DexieRecurringRuleRepository } from './dexie/dexie-recurring-rule.repository';
import { DexieScheduleRepository } from './dexie/dexie-schedule.repository';
import { DexieSettingsRepository } from './dexie/dexie-settings.repository';
import { DexieTransactionRepository } from './dexie/dexie-transaction.repository';

export function createRepositories(database: FinancesDatabase = financesDatabase) {
  return {
    backups: new DexieBackupRepository(database),
    categories: new DexieCategoryRepository(database),
    recurringRules: new DexieRecurringRuleRepository(database),
    schedules: new DexieScheduleRepository(database),
    settings: new DexieSettingsRepository(database),
    transactions: new DexieTransactionRepository(database),
  } as const;
}

export const repositories = createRepositories();
