import type { Category } from '@/models/category';
import type { IsoTimestamp } from '@/models/common';
import type { RecurringRule } from '@/models/recurring-rule';
import type { AppSettingRecord } from '@/models/settings';
import type { Transaction } from '@/models/transaction';
import type { FixedExpenseEstimate } from '@/models/fixed-expense-estimate';

export const BACKUP_SCHEMA_VERSION = 3;

export interface BackupData {
  transactions: Transaction[];
  categories: Category[];
  recurringRules: RecurringRule[];
  settings: AppSettingRecord[];
  fixedExpenseEstimates: FixedExpenseEstimate[];
}

export interface BackupDocument extends BackupData {
  schemaVersion: number;
  exportedAt: IsoTimestamp;
  appVersion: string;
}

export interface ExportedBackup {
  filename: string;
  json: string;
}
