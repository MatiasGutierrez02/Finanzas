import type { LocalDate, YearMonth } from '@/models/common';
import type { RecurringRule } from '@/models/recurring-rule';
import type { Transaction } from '@/models/transaction';
import type { RecurringRuleRepository } from '@/repositories/contracts/recurring-rule.repository';
import type { ScheduleRepository } from '@/repositories/contracts/schedule.repository';
import { repositories } from '@/repositories';
import { nowIsoTimestamp, toLocalDate } from '@/utils/dates';
import { newTransactionId } from '@/utils/ids';

export function toYearMonth(date: LocalDate): YearMonth {
  return date.slice(0, 7) as YearMonth;
}

export function occurrenceDate(period: YearMonth, dayOfMonth: number): LocalDate {
  const [year = 0, month = 1] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0, 12).getDate();
  return toLocalDate(`${period}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, '0')}`);
}

export function monthsBetween(start: YearMonth, end: YearMonth): YearMonth[] {
  const [startYear = 0, startMonth = 1] = start.split('-').map(Number);
  const [endYear = 0, endMonth = 1] = end.split('-').map(Number);
  const result: YearMonth[] = [];

  for (
    let cursor = new Date(startYear, startMonth - 1, 1, 12);
    cursor <= new Date(endYear, endMonth - 1, 1, 12);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12)
  ) {
    result.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}` as YearMonth,
    );
  }

  return result;
}

interface Dependencies {
  recurringRules: RecurringRuleRepository;
  schedules: ScheduleRepository;
  createTransactionId?: typeof newTransactionId;
  now?: typeof nowIsoTimestamp;
}

export class MonthlyRecurrenceService {
  constructor(private readonly dependencies: Dependencies) {}

  async generateThrough(endDate: LocalDate): Promise<number> {
    const rules = await this.dependencies.recurringRules.getActive();
    const timestamp = (this.dependencies.now ?? nowIsoTimestamp)();
    const createId = this.dependencies.createTransactionId ?? newTransactionId;
    const endPeriod = toYearMonth(endDate);
    const batches = rules.flatMap((rule) => {
      const firstPending = rule.lastGeneratedPeriod ?? toYearMonth(rule.startDate);
      const periods = monthsBetween(firstPending, endPeriod).filter(
        (period) => period !== rule.lastGeneratedPeriod,
      );

      if (periods.length === 0) return [];

      const occurrences: Transaction[] = periods.map((period) => ({
        id: createId(),
        type: rule.type,
        amountCents: rule.amountCents,
        categoryId: rule.categoryId,
        comment: rule.comment,
        date: occurrenceDate(period, rule.dayOfMonth),
        createdAt: timestamp,
        updatedAt: timestamp,
        recurringRuleId: rule.id,
        occurrenceKey: `${rule.id}:${period}`,
        installmentGroupId: null,
        installmentNumber: null,
        installmentCount: null,
      }));
      const updatedRule: RecurringRule = {
        ...rule,
        lastGeneratedPeriod: periods.at(-1) ?? rule.lastGeneratedPeriod,
        updatedAt: timestamp,
      };
      return [{ rule: updatedRule, occurrences }];
    });

    return this.dependencies.schedules.persistOccurrences(batches);
  }
}

export const monthlyRecurrenceService = new MonthlyRecurrenceService({
  recurringRules: repositories.recurringRules,
  schedules: repositories.schedules,
});
