import type { FinancesDatabase } from '../finances-database';
import type { LocalDate, YearMonth } from '@/models/common';
import type { RecurringRule } from '@/models/recurring-rule';
import type { Transaction } from '@/models/transaction';
import { nowIsoTimestamp, toLocalDate } from '@/utils/dates';

export interface SubscriptionNormalizationResult {
  normalized: number;
  removed: number;
  repairedRules: number;
  synchronizedCategories: number;
}

function periodOf(transaction: Transaction): YearMonth {
  return transaction.date.slice(0, 7) as YearMonth;
}

function isInitialOccurrence(transaction: Transaction, rule: RecurringRule): boolean {
  return transaction.date === rule.startDate;
}

export async function normalizeSubscriptions(
  database: FinancesDatabase,
  today: LocalDate,
): Promise<SubscriptionNormalizationResult> {
  return database.transaction('rw', [database.recurringRules, database.transactions], async () => {
    const timestamp = nowIsoTimestamp();
    const rules = await database.recurringRules.toArray();
    let normalized = 0;
    let removed = 0;
    let repairedRules = 0;
    let synchronizedCategories = 0;

    for (const rule of rules) {
      const occurrences = await database.transactions
        .where('recurringRuleId')
        .equals(rule.id)
        .sortBy('date');
      const latestPastOccurrence = occurrences.filter(({ date }) => date <= today).at(-1);
      if (
        rule.categoryId === 'category:educacion' &&
        latestPastOccurrence?.categoryId === 'category:suscripciones'
      ) {
        rule.categoryId = latestPastOccurrence.categoryId;
        rule.updatedAt = timestamp;
        await database.recurringRules.put(rule);
        await database.transactions
          .where('[recurringRuleId+date]')
          .between([rule.id, today], [rule.id, '9999-12-31'], false, true)
          .modify({ categoryId: latestPastOccurrence.categoryId, updatedAt: timestamp });
        synchronizedCategories += 1;
      }
      const retained: Transaction[] = [];
      const futureByPeriod = new Map<YearMonth, Transaction[]>();

      for (const occurrence of occurrences) {
        if (occurrence.date <= today || isInitialOccurrence(occurrence, rule)) {
          retained.push(occurrence);
          continue;
        }

        if (!rule.isActive || rule.cancelledAt != null) {
          await database.transactions.delete(occurrence.id);
          removed += 1;
          continue;
        }

        const period = periodOf(occurrence);
        const group = futureByPeriod.get(period) ?? [];
        group.push(occurrence);
        futureByPeriod.set(period, group);
      }

      for (const [period, group] of futureByPeriod) {
        const expectedKey = `${rule.id}:${period}`;
        const survivor =
          group.find(({ occurrenceKey }) => occurrenceKey === expectedKey) ?? group[0];
        if (survivor === undefined) continue;

        for (const duplicate of group) {
          if (duplicate.id !== survivor.id) {
            await database.transactions.delete(duplicate.id);
            removed += 1;
          }
        }

        const expectedDate = toLocalDate(`${period}-01`);
        if (survivor.date !== expectedDate || survivor.occurrenceKey !== expectedKey) {
          await database.transactions.update(survivor.id, {
            date: expectedDate,
            occurrenceKey: expectedKey,
            updatedAt: timestamp,
          });
          normalized += 1;
        }
        retained.push({ ...survivor, date: expectedDate, occurrenceKey: expectedKey });
      }

      const lastGeneratedPeriod = retained.map(periodOf).sort().at(-1) ?? null;
      if (rule.dayOfMonth !== 1 || rule.lastGeneratedPeriod !== lastGeneratedPeriod) {
        await database.recurringRules.update(rule.id, {
          dayOfMonth: 1,
          lastGeneratedPeriod,
          updatedAt: timestamp,
        });
        repairedRules += 1;
      }
    }

    return { normalized, removed, repairedRules, synchronizedCategories };
  });
}
