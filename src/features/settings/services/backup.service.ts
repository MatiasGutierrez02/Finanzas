import type { BackupRepository } from '@/repositories/contracts/backup.repository';
import { repositories } from '@/repositories';
import { APP_VERSION } from '@/config/app';
import { nowIsoTimestamp, todayLocalDate } from '@/utils/dates';

import { BACKUP_SCHEMA_VERSION, type BackupDocument, type ExportedBackup } from '../models/backup';
import { BackupValidationError, validateBackupDocument } from './backup-validation';

export class BackupService {
  constructor(
    private readonly repository: BackupRepository,
    private readonly appVersion = APP_VERSION,
  ) {}

  async exportBackup(): Promise<ExportedBackup> {
    const data = await this.repository.readAll();
    const document: BackupDocument = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: nowIsoTimestamp(),
      appVersion: this.appVersion,
      ...data,
    };
    return {
      filename: `finanzas-backup-${todayLocalDate()}.json`,
      json: JSON.stringify(document, null, 2),
    };
  }

  parse(json: string): BackupDocument {
    let value: unknown;
    try {
      value = JSON.parse(json) as unknown;
    } catch {
      throw new BackupValidationError('El archivo no contiene un JSON válido.');
    }
    return validateBackupDocument(value);
  }

  async importBackup(document: BackupDocument): Promise<void> {
    const validated = validateBackupDocument(document);
    await this.repository.replaceAll({
      transactions: validated.transactions,
      categories: validated.categories,
      recurringRules: validated.recurringRules,
      settings: validated.settings,
      fixedExpenseEstimates: validated.fixedExpenseEstimates,
    });
  }
}

export const backupService = new BackupService(repositories.backups);
