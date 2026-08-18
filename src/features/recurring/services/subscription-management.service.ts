import type { Category } from '@/models/category';
import type { LocalDate, RecurringRuleId, YearMonth } from '@/models/common';
import type { RecurringRule } from '@/models/recurring-rule';
import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import type { RecurringRuleRepository } from '@/repositories/contracts/recurring-rule.repository';
import type { ScheduleRepository } from '@/repositories/contracts/schedule.repository';
import { repositories } from '@/repositories';
import { nowIsoTimestamp, todayLocalDate, toLocalDate } from '@/utils/dates';

import { toYearMonth } from './monthly-recurrence.service';

export interface ManagedSubscription {
  rule: RecurringRule;
  category: Category;
  nextOccurrenceDate: LocalDate | null;
}

export class SubscriptionNotFoundError extends Error {
  constructor() {
    super('La suscripciÃ³n no existe o fue cancelada.');
    this.name = 'SubscriptionNotFoundError';
  }
}

interface Dependencies {
  recurringRules: RecurringRuleRepository;
  categories: CategoryRepository;
  schedules: ScheduleRepository;
  today?: typeof todayLocalDate;
  now?: typeof nowIsoTimestamp;
}

function nextPeriod(period: YearMonth): YearMonth {
  const [year = 0, month = 1] = period.split('-').map(Number);
  const date = new Date(year, month, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` as YearMonth;
}

export class SubscriptionManagementService {
  constructor(private readonly dependencies: Dependencies) {}

  async list(): Promise<ManagedSubscription[]> {
    const [rules, categories] = await Promise.all([
      this.dependencies.recurringRules.getManageable(),
      this.dependencies.categories.getAll(),
    ]);
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const today = (this.dependencies.today ?? todayLocalDate)();

    return rules
      .map((rule) => {
        const category = categoriesById.get(rule.categoryId);
        if (category === undefined) return null;
        const baseline = rule.lastGeneratedPeriod ?? toYearMonth(today);
        return {
          rule,
          category,
          nextOccurrenceDate: rule.isActive ? toLocalDate(`${nextPeriod(baseline)}-01`) : null,
        };
      })
      .filter((item): item is ManagedSubscription => item !== null)
      .sort((left, right) => left.category.name.localeCompare(right.category.name, 'es'));
  }

  async pause(id: RecurringRuleId): Promise<number> {
    const rule = await this.getManageableRule(id);
    const timestamp = (this.dependencies.now ?? nowIsoTimestamp)();
    const today = (this.dependencies.today ?? todayLocalDate)();
    return this.dependencies.schedules.updateRuleAndRemoveFutureOccurrences(
      { ...rule, isActive: false, updatedAt: timestamp },
      today,
    );
  }

  async resume(id: RecurringRuleId): Promise<void> {
    const rule = await this.getManageableRule(id);
    const today = (this.dependencies.today ?? todayLocalDate)();
    await this.dependencies.recurringRules.put({
      ...rule,
      isActive: true,
      lastGeneratedPeriod: toYearMonth(today),
      updatedAt: (this.dependencies.now ?? nowIsoTimestamp)(),
    });
  }

  async cancel(id: RecurringRuleId): Promise<number> {
    const rule = await this.getManageableRule(id);
    const timestamp = (this.dependencies.now ?? nowIsoTimestamp)();
    const today = (this.dependencies.today ?? todayLocalDate)();
    return this.dependencies.schedules.updateRuleAndRemoveFutureOccurrences(
      { ...rule, isActive: false, cancelledAt: timestamp, updatedAt: timestamp },
      today,
    );
  }

  private async getManageableRule(id: RecurringRuleId): Promise<RecurringRule> {
    const rule = await this.dependencies.recurringRules.getById(id);
    if (rule === undefined || rule.cancelledAt != null) throw new SubscriptionNotFoundError();
    return rule;
  }
}

export const subscriptionManagementService = new SubscriptionManagementService({
  recurringRules: repositories.recurringRules,
  categories: repositories.categories,
  schedules: repositories.schedules,
});
