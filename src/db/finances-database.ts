import Dexie, { type Table } from 'dexie';

import type { Category } from '@/models/category';
import type { RecurringRule } from '@/models/recurring-rule';
import type { AppSettingRecord } from '@/models/settings';
import type { Transaction } from '@/models/transaction';
import type { FixedExpenseEstimate } from '@/models/fixed-expense-estimate';

import { DATABASE_NAME, DATABASE_STORES, DATABASE_STORES_V4, DATABASE_VERSION } from './schema';
import { addDefaultCategoryIcons } from './migrations/version-2';
import { repairDefaultCategoryIcons } from './migrations/version-3';
import { markSystemCategories } from './migrations/version-4';

export class FinancesDatabase extends Dexie {
  transactions!: Table<Transaction, Transaction['id']>;
  categories!: Table<Category, Category['id']>;
  recurringRules!: Table<RecurringRule, RecurringRule['id']>;
  settings!: Table<AppSettingRecord, AppSettingRecord['key']>;
  fixedExpenseEstimates!: Table<FixedExpenseEstimate, FixedExpenseEstimate['id']>;

  constructor(name = DATABASE_NAME) {
    super(name);

    this.version(1).stores(DATABASE_STORES_V4);
    this.version(2).stores(DATABASE_STORES_V4).upgrade(addDefaultCategoryIcons);
    this.version(3).stores(DATABASE_STORES_V4).upgrade(repairDefaultCategoryIcons);
    this.version(4).stores(DATABASE_STORES_V4).upgrade(markSystemCategories);
    this.version(DATABASE_VERSION).stores(DATABASE_STORES);
  }
}

export const financesDatabase = new FinancesDatabase();
