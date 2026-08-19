import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FinancesDatabase } from '@/db/finances-database';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import {
  MonthlyRecurrenceService,
  occurrenceDate,
} from '@/features/recurring/services/monthly-recurrence.service';
import { SubscriptionManagementService } from '@/features/recurring/services/subscription-management.service';
import {
  TransactionService,
  TransactionValidationError,
} from '@/features/transactions/services/transaction.service';
import type {
  InstallmentGroupId,
  IsoTimestamp,
  LocalDate,
  RecurringRuleId,
  TransactionId,
  YearMonth,
} from '@/models/common';
import type { Transaction } from '@/models/transaction';
import { DexieCategoryRepository } from '@/repositories/dexie/dexie-category.repository';
import { DexieRecurringRuleRepository } from '@/repositories/dexie/dexie-recurring-rule.repository';
import { DexieScheduleRepository } from '@/repositories/dexie/dexie-schedule.repository';
import { DexieTransactionRepository } from '@/repositories/dexie/dexie-transaction.repository';
import { toLocalDate } from '@/utils/dates';
import { toCategoryId } from '@/utils/ids';
import { normalizeSubscriptions } from '@/db/normalization/subscriptions';

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

function form(
  schedule: 'none' | 'subscription' | 'installments',
  installmentCount = '2',
  date = '2026-01-31',
) {
  return {
    type: 'expense' as const,
    amount: '20000',
    categoryId: 'category:comida',
    comment: 'Servicio',
    date,
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
  it('places every automatic monthly occurrence on the first day', () => {
    expect(occurrenceDate('2024-02' as YearMonth)).toBe('2024-02-01');
    expect(occurrenceDate('2025-09' as YearMonth)).toBe('2025-09-01');
  });

  it('keeps the initial mid-month subscription movement and generates later months once on day 1', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });

    expect(await recurrence.generateThrough(toLocalDate('2026-10-31'))).toBe(2);
    expect(await recurrence.generateThrough(toLocalDate('2026-10-31'))).toBe(0);

    const transactions = await database.transactions.orderBy('date').toArray();
    expect(transactions.map(({ date, occurrenceKey }) => ({ date, occurrenceKey }))).toEqual([
      { date: '2026-08-18', occurrenceKey: 'rule-1:2026-08' },
      { date: '2026-09-01', occurrenceKey: 'rule-1:2026-09' },
      { date: '2026-10-01', occurrenceKey: 'rule-1:2026-10' },
    ]);
  });

  it('repairs legacy future dates and duplicates without changing history', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2026-12-31'));
    const september = await database.transactions
      .where('occurrenceKey')
      .equals('rule-1:2026-09')
      .first();
    const october = await database.transactions
      .where('occurrenceKey')
      .equals('rule-1:2026-10')
      .first();
    if (september === undefined || october === undefined) throw new Error('Fixture inválido');
    await database.transactions.update(september.id, { date: toLocalDate('2026-09-18') });
    await database.transactions.update(october.id, { date: toLocalDate('2026-10-18') });
    await database.transactions.add({
      ...october,
      id: nextTransactionId(),
      date: toLocalDate('2026-10-24'),
      occurrenceKey: 'legacy-duplicate:2026-10',
    });

    const first = await normalizeSubscriptions(database, toLocalDate('2026-08-18'));
    const second = await normalizeSubscriptions(database, toLocalDate('2026-08-18'));
    const occurrences = await database.transactions
      .where('recurringRuleId')
      .equals(ruleId)
      .sortBy('date');

    expect(first).toMatchObject({ normalized: 2, removed: 1 });
    expect(second).toEqual({
      normalized: 0,
      removed: 0,
      repairedRules: 0,
      synchronizedCategories: 0,
    });
    expect(occurrences.map(({ date }) => date)).toEqual([
      '2026-08-18',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
    ]);
    expect((await database.recurringRules.get(ruleId))?.lastGeneratedPeriod).toBe('2026-12');
  });

  it('shows next month from today even when the persisted marker is ahead', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    await database.recurringRules.update(ruleId, { lastGeneratedPeriod: '2026-12' as YearMonth });

    const [subscription] = await createManagementService(toLocalDate('2026-08-18')).list();

    expect(subscription?.nextOccurrenceDate).toBe('2026-09-01');
  });

  it('synchronizes an edited recurring occurrence with its rule and future occurrences', async () => {
    const service = createService();
    const created = await service.create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2026-10-31'));

    await service.update(created.id, {
      ...form('subscription', '2', '2026-08-18'),
      categoryId: 'category:suscripciones',
    });

    expect(await database.recurringRules.get(ruleId)).toMatchObject({
      categoryId: 'category:suscripciones',
    });
    expect(
      (await database.transactions.where('recurringRuleId').equals(ruleId).toArray()).map(
        ({ categoryId }) => categoryId,
      ),
    ).toEqual(['category:suscripciones', 'category:suscripciones', 'category:suscripciones']);
    expect(
      (await createManagementService(toLocalDate('2026-08-18')).list())[0]?.category.name,
    ).toBe('Suscripciones');
  });

  it('normalizes the legacy Educación to Suscripciones mismatch once without changing history', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    await database.recurringRules.update(ruleId, {
      categoryId: toCategoryId('category:educacion'),
    });
    const occurrence = await database.transactions.where('recurringRuleId').equals(ruleId).first();
    if (occurrence === undefined) throw new Error('Fixture inválido');
    await database.transactions.update(occurrence.id, {
      categoryId: toCategoryId('category:suscripciones'),
    });

    expect(await normalizeSubscriptions(database, toLocalDate('2026-08-18'))).toMatchObject({
      synchronizedCategories: 1,
      removed: 0,
    });
    expect(await normalizeSubscriptions(database, toLocalDate('2026-08-18'))).toMatchObject({
      synchronizedCategories: 0,
      removed: 0,
    });
    expect(await database.recurringRules.get(ruleId)).toMatchObject({
      categoryId: 'category:suscripciones',
    });
    expect(await database.transactions.get(occurrence.id)).toMatchObject({
      id: occurrence.id,
      categoryId: 'category:suscripciones',
    });
  });

  it('removes inherited future rows for a paused rule while preserving its history', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2026-10-31'));
    await database.recurringRules.update(ruleId, { isActive: false });

    await normalizeSubscriptions(database, toLocalDate('2026-08-18'));

    expect((await database.transactions.orderBy('date').toArray()).map(({ date }) => date)).toEqual(
      ['2026-08-18'],
    );
    expect(await database.recurringRules.get(ruleId)).toMatchObject({
      isActive: false,
      lastGeneratedPeriod: '2026-08',
    });
  });

  it('keeps pause, resume and cancellation coherent after legacy normalization', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2026-10-31'));
    const september = await database.transactions
      .where('occurrenceKey')
      .equals('rule-1:2026-09')
      .first();
    if (september === undefined) throw new Error('Fixture inválido');
    await database.transactions.update(september.id, { date: toLocalDate('2026-09-18') });
    await normalizeSubscriptions(database, toLocalDate('2026-08-18'));

    expect(await createManagementService(toLocalDate('2026-08-18')).pause(ruleId)).toBe(2);
    await createManagementService(toLocalDate('2026-10-15')).resume(ruleId);
    expect(await recurrence.generateThrough(toLocalDate('2026-11-30'))).toBe(1);
    expect(await createManagementService(toLocalDate('2026-10-15')).cancel(ruleId)).toBe(1);

    expect((await database.transactions.orderBy('date').toArray()).map(({ date }) => date)).toEqual(
      ['2026-08-18'],
    );
    expect(await database.recurringRules.get(ruleId)).toMatchObject({
      isActive: false,
      cancelledAt: timestamp,
    });
    expect(await recurrence.generateThrough(toLocalDate('2027-01-31'))).toBe(0);
  });

  it('creates all installments atomically with a shared group and 1/N numbering', async () => {
    await createService().create(form('installments', '3', '2026-08-18'));

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
        date: '2026-08-18',
        installmentGroupId: groupId,
        installmentNumber: 1,
        installmentCount: 3,
      },
      {
        date: '2026-09-01',
        installmentGroupId: groupId,
        installmentNumber: 2,
        installmentCount: 3,
      },
      {
        date: '2026-10-01',
        installmentGroupId: groupId,
        installmentNumber: 3,
        installmentCount: 3,
      },
    ]);
  });

  it('creates exactly 1/2 and 2/2, with no installment after the finite plan', async () => {
    await createService().create(form('installments', '2', '2026-08-18'));

    const installments = await database.transactions.orderBy('date').toArray();
    expect(
      installments.map(({ date, installmentNumber, installmentCount }) => ({
        date,
        installmentNumber,
        installmentCount,
      })),
    ).toEqual([
      { date: '2026-08-18', installmentNumber: 1, installmentCount: 2 },
      { date: '2026-09-01', installmentNumber: 2, installmentCount: 2 },
    ]);
  });

  it('ends an N-installment plan at N/N without any N+1 generation', async () => {
    await createService().create(form('installments', '6', '2026-08-18'));

    const installments = await database.transactions.orderBy('date').toArray();
    expect(installments).toHaveLength(6);
    expect(installments.at(-1)).toMatchObject({
      date: '2027-01-01',
      installmentNumber: 6,
      installmentCount: 6,
    });
  });

  it('rolls back the complete installment batch if one record conflicts', async () => {
    const duplicateId = 'duplicate' as TransactionId;

    await expect(
      createService(() => duplicateId).create(form('installments', '3')),
    ).rejects.toThrow();
    expect(await database.transactions.count()).toBe(0);
  });

  it('pauses atomically, removes only future occurrences and stops generation', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2026-10-31'));
    const management = createManagementService(toLocalDate('2026-08-18'));

    expect(await management.pause(ruleId)).toBe(2);
    expect((await database.transactions.orderBy('date').toArray()).map(({ date }) => date)).toEqual(
      ['2026-08-18'],
    );
    expect(await database.recurringRules.get(ruleId)).toMatchObject({ isActive: false });
    expect(await recurrence.generateThrough(toLocalDate('2026-12-31'))).toBe(0);
  });

  it('resumes from the current month without recreating months omitted while paused', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2026-10-31'));
    await createManagementService(toLocalDate('2026-08-18')).pause(ruleId);
    await createManagementService(toLocalDate('2026-10-15')).resume(ruleId);

    expect(await recurrence.generateThrough(toLocalDate('2026-12-31'))).toBe(2);
    expect((await database.transactions.orderBy('date').toArray()).map(({ date }) => date)).toEqual(
      ['2026-08-18', '2026-11-01', '2026-12-01'],
    );
  });

  it('cancels permanently, removes future occurrences and preserves history', async () => {
    await createService().create(form('subscription', '2', '2026-08-18'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextTransactionId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2026-10-31'));
    const management = createManagementService(toLocalDate('2026-08-18'));

    expect(await management.cancel(ruleId)).toBe(2);
    expect((await database.transactions.toArray()).map(({ date }) => date)).toEqual(['2026-08-18']);
    expect(await database.recurringRules.get(ruleId)).toMatchObject({
      isActive: false,
      cancelledAt: timestamp,
    });
    expect(await management.list()).toEqual([]);
    expect(await recurrence.generateThrough(toLocalDate('2027-01-31'))).toBe(0);
  });

  it.each(['pause', 'cancel'] as const)(
    'does not let stale generation overwrite a later %s',
    async (action) => {
      await createService().create(form('subscription', '2', '2026-08-18'));
      const staleRule = await database.recurringRules.get(ruleId);
      const initial = await database.transactions.where('recurringRuleId').equals(ruleId).first();
      if (staleRule === undefined || initial === undefined) throw new Error('Fixture inválido');

      const staleOccurrence: Transaction = {
        ...initial,
        id: nextTransactionId(),
        date: toLocalDate('2026-09-01'),
        occurrenceKey: `${ruleId}:2026-09`,
      };
      await createManagementService(toLocalDate('2026-08-18'))[action](ruleId);

      const created = await new DexieScheduleRepository(database).persistOccurrences([
        {
          rule: { ...staleRule, lastGeneratedPeriod: '2026-09' as YearMonth },
          occurrences: [staleOccurrence],
        },
      ]);

      expect(created).toBe(0);
      expect(await database.transactions.get(staleOccurrence.id)).toBeUndefined();
      expect(await database.recurringRules.get(ruleId)).toMatchObject({ isActive: false });
      if (action === 'cancel') {
        expect((await database.recurringRules.get(ruleId))?.cancelledAt).toBe(timestamp);
      }
    },
  );

  it('rejects an invalid combined scheduling mode before persisting', async () => {
    await expect(
      createService().create({ ...form('none'), schedule: 'subscription+installments' as 'none' }),
    ).rejects.toBeInstanceOf(TransactionValidationError);
    expect(await database.transactions.count()).toBe(0);
  });
});

function createManagementService(today: LocalDate): SubscriptionManagementService {
  return new SubscriptionManagementService({
    recurringRules: new DexieRecurringRuleRepository(database),
    categories: new DexieCategoryRepository(database),
    schedules: new DexieScheduleRepository(database),
    today: () => today,
    now: () => timestamp,
  });
}
