import type { BackupData } from '@/features/settings/models/backup';

export interface BackupRepository {
  readAll(): Promise<BackupData>;
  replaceAll(data: BackupData): Promise<void>;
}
