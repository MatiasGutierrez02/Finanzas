import type { LocalDate } from './common';

export const PERIOD_UNITS = ['day', 'week', 'month', 'quarter', 'year'] as const;

export type PeriodUnit = (typeof PERIOD_UNITS)[number];

export interface DateRange {
  start: LocalDate;
  end: LocalDate;
}
