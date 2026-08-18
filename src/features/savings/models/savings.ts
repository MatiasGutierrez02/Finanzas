import type { LocalDate } from '@/models/common';

export interface MonthlySavings {
  monthIndex: number;
  name: string;
  color: `#${string}`;
  balanceCents: number;
  hasActivity: boolean;
}

export interface SavingsSnapshot {
  year: number;
  totalCents: number;
  months: MonthlySavings[];
  positiveMonths: MonthlySavings[];
}

export interface SavingsQuery {
  referenceDate: LocalDate;
}
