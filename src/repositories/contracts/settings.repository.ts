import type { AppSettingRecord } from '@/models/settings';

export interface SettingsRepository {
  get(key: AppSettingRecord['key']): Promise<AppSettingRecord | undefined>;
  getAll(): Promise<AppSettingRecord[]>;
  put(setting: AppSettingRecord): Promise<void>;
}
