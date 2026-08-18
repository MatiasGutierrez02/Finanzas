import type { FinancesDatabase } from '@/db/finances-database';
import type { AppSettingRecord } from '@/models/settings';
import type { SettingsRepository } from '@/repositories/contracts/settings.repository';

export class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly database: FinancesDatabase) {}

  get(key: AppSettingRecord['key']): Promise<AppSettingRecord | undefined> {
    return this.database.settings.get(key);
  }

  getAll(): Promise<AppSettingRecord[]> {
    return this.database.settings.toArray();
  }

  async put(setting: AppSettingRecord): Promise<void> {
    await this.database.settings.put(setting);
  }
}
