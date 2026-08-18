import type { Category } from '@/models/category';
import type { IsoTimestamp } from '@/models/common';
import type { RecurringRule } from '@/models/recurring-rule';
import type { AppSettingRecord } from '@/models/settings';
import type { Transaction } from '@/models/transaction';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupData {
  transactions: Transaction[];
  categories: Category[];
  recurringRules: RecurringRule[];
  settings: AppSettingRecord[];
}

export interface BackupDocument extends BackupData {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: IsoTimestamp;
  appVersion: string;
}

export interface ExportedBackup {
  filename: string;
  json: string;
}
