import Dexie, { type Table } from 'dexie';

import type { Category } from '@/models/category';
import type { RecurringRule } from '@/models/recurring-rule';
import type { AppSettingRecord } from '@/models/settings';
import type { Transaction } from '@/models/transaction';

import { DATABASE_NAME, DATABASE_STORES, DATABASE_VERSION } from './schema';
import { addDefaultCategoryIcons } from './migrations/version-2';
import { repairDefaultCategoryIcons } from './migrations/version-3';

export class FinancesDatabase extends Dexie {
  transactions!: Table<Transaction, Transaction['id']>;
  categories!: Table<Category, Category['id']>;
  recurringRules!: Table<RecurringRule, RecurringRule['id']>;
  settings!: Table<AppSettingRecord, AppSettingRecord['key']>;

  constructor(name = DATABASE_NAME) {
    super(name);

    this.version(1).stores(DATABASE_STORES);
    this.version(2).stores(DATABASE_STORES).upgrade(addDefaultCategoryIcons);
    this.version(DATABASE_VERSION).stores(DATABASE_STORES).upgrade(repairDefaultCategoryIcons);
  }
}

export const financesDatabase = new FinancesDatabase();
