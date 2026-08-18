import type { IsoTimestamp } from './common';

export const SETTING_KEYS = {
  currency: 'currency',
  locale: 'locale',
  theme: 'theme',
  weekStartsOn: 'weekStartsOn',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export interface AppSettingRecord {
  key: SettingKey;
  value: unknown;
  updatedAt: IsoTimestamp;
}
