import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FinancesDatabase } from '@/db/finances-database';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import {
  MonthlyRecurrenceService,
  occurrenceDate,
} from '@/features/recurring/services/monthly-recurrence.service';
import {
  TransactionService,
  TransactionValidationError,
} from '@/features/transactions/services/transaction.service';
import type {
  InstallmentGroupId,
  IsoTimestamp,
  RecurringRuleId,
  TransactionId,
  YearMonth,
} from '@/models/common';
import { DexieCategoryRepository } from '@/repositories/dexie/dexie-category.repository';
import { DexieRecurringRuleRepository } from '@/repositories/dexie/dexie-recurring-rule.repository';
import { DexieScheduleRepository } from '@/repositories/dexie/dexie-schedule.repository';
import { DexieTransactionRepository } from '@/repositories/dexie/dexie-transaction.repository';
import { toLocalDate } from '@/utils/dates';

const timestamp = '2026-01-31T12:00:00.000Z' as IsoTimestamp;
const ruleId = 'rule-1' as RecurringRuleId;
const groupId = 'group-1' as InstallmentGroupId;
let database: FinancesDatabase;
let sequence = 0;
let idSequence = 0;

function nextTransactionId(): TransactionId {
  idSequence += 1;
  return `transaction-${idSequence}` as TransactionId;
}

function form(schedule: 'none' | 'subscription' | 'installments', installmentCount = '2') {
  return {
    type: 'expense' as const,
    amount: '20000',
    categoryId: 'category:comida',
    comment: 'Servicio',
    date: '2026-01-31',
    schedule,
    installmentCount,
  };
}

function createService(createId = nextTransactionId): TransactionService {
  return new TransactionService({
    transactions: new DexieTransactionRepository(database),
    categories: new DexieCategoryRepository(database),
    schedules: new DexieScheduleRepository(database),
    createId,
    createRecurringRuleId: () => ruleId,
    createInstallmentGroupId: () => groupId,
    now: () => timestamp,
  });
}

beforeEach(async () => {
  sequence += 1;
  idSequence = 0;
  database = new FinancesDatabase(`Schedules-test-${sequence}`);
  await seedDefaultCategories(database);
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('monthly schedules', () => {
  it('clamps day 31 to February and respects leap years', () => {
    expect(occurrenceDate('2024-02' as YearMonth, 31)).toBe('2024-02-29');
    expect(occurrenceDate('2025-02' as YearMonth, 31)).toBe('2025-02-28');
    expect(occurrenceDate('2026-04' as YearMonth, 31)).toBe('2026-04-30');
  });

  it('generates monthly subscription occurrences once across repeated reopen-style runs', async () => {
    await createService().create(form('subscription'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });

    expect(await recurrence.generateThrough(toLocalDate('2026-03-31'))).toBe(2);
    expect(await recurrence.generateThrough(toLocalDate('2026-03-31'))).toBe(0);

    const transactions = await database.transactions.orderBy('date').toArray();
    expect(transactions.map(({ date, occurrenceKey }) => ({ date, occurrenceKey }))).toEqual([
      { date: '2026-01-31', occurrenceKey: 'rule-1:2026-01' },
      { date: '2026-02-28', occurrenceKey: 'rule-1:2026-02' },
      { date: '2026-03-31', occurrenceKey: 'rule-1:2026-03' },
    ]);
  });

  it('creates all installments atomically with a shared group and 1/N numbering', async () => {
    await createService().create(form('installments', '3'));

    const installments = await database.transactions.orderBy('date').toArray();
    expect(
      installments.map(({ date, installmentGroupId, installmentNumber, installmentCount }) => ({
        date,
        installmentGroupId,
        installmentNumber,
        installmentCount,
      })),
    ).toEqual([
      {
        date: '2026-01-31',
        installmentGroupId: groupId,
        installmentNumber: 1,
        installmentCount: 3,
      },
      {
        date: '2026-02-28',
        installmentGroupId: groupId,
        installmentNumber: 2,
        installmentCount: 3,
      },
      {
        date: '2026-03-31',
        installmentGroupId: groupId,
        installmentNumber: 3,
        installmentCount: 3,
      },
    ]);
  });

  it('rolls back the complete installment batch if one record conflicts', async () => {
    const duplicateId = 'duplicate' as TransactionId;

    await expect(
      createService(() => duplicateId).create(form('installments', '3')),
    ).rejects.toThrow();
    expect(await database.transactions.count()).toBe(0);
  });

  it('rejects an invalid combined scheduling mode before persisting', async () => {
    await expect(
      createService().create({ ...form('none'), schedule: 'subscription+installments' as 'none' }),
    ).rejects.toBeInstanceOf(TransactionValidationError);
    expect(await database.transactions.count()).toBe(0);
  });
});
