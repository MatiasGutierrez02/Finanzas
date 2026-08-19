import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FinancesDatabase } from '@/db/finances-database';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import { MonthlyRecurrenceService } from '@/features/recurring/services/monthly-recurrence.service';
import { BACKUP_SCHEMA_VERSION, type BackupDocument } from '@/features/settings/models/backup';
import { BackupService } from '@/features/settings/services/backup.service';
import { BackupValidationError } from '@/features/settings/services/backup-validation';
import { TransactionService } from '@/features/transactions/services/transaction.service';
import type {
  InstallmentGroupId,
  IsoTimestamp,
  RecurringRuleId,
  TransactionId,
} from '@/models/common';
import { DexieBackupRepository } from '@/repositories/dexie/dexie-backup.repository';
import { DexieCategoryRepository } from '@/repositories/dexie/dexie-category.repository';
import { DexieRecurringRuleRepository } from '@/repositories/dexie/dexie-recurring-rule.repository';
import { DexieScheduleRepository } from '@/repositories/dexie/dexie-schedule.repository';
import { DexieTransactionRepository } from '@/repositories/dexie/dexie-transaction.repository';
import { toLocalDate } from '@/utils/dates';
import { CategoryService } from '@/features/categories/services/category.service';
import type { CategoryId } from '@/models/common';
import type { FixedExpenseEstimateId } from '@/models/common';
import { FixedExpenseEstimateService } from '@/features/fixed-expenses/services/fixed-expense-estimate.service';
import { DexieFixedExpenseEstimateRepository } from '@/repositories/dexie/dexie-fixed-expense-estimate.repository';

const timestamp = '2026-01-31T12:00:00.000Z' as IsoTimestamp;
let database: FinancesDatabase;
let repository: DexieBackupRepository;
let backupService: BackupService;
let databaseSequence = 0;
let idSequence = 0;

function nextId(): TransactionId {
  idSequence += 1;
  return `transaction-${idSequence}` as TransactionId;
}

function transactionService(): TransactionService {
  return new TransactionService({
    transactions: new DexieTransactionRepository(database),
    categories: new DexieCategoryRepository(database),
    schedules: new DexieScheduleRepository(database),
    createId: nextId,
    createRecurringRuleId: () => 'rule-1' as RecurringRuleId,
    createInstallmentGroupId: () => 'group-1' as InstallmentGroupId,
    now: () => timestamp,
  });
}

function form(schedule: 'subscription' | 'installments', installmentCount = '2') {
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

beforeEach(async () => {
  databaseSequence += 1;
  idSequence = 0;
  database = new FinancesDatabase(`Backup-test-${databaseSequence}`);
  await seedDefaultCategories(database);
  repository = new DexieBackupRepository(database);
  backupService = new BackupService(repository, 'test-version');
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('backup service', () => {
  it('exports and imports fixed expenses with optional category and timestamps', async () => {
    const fixedExpenses = new FixedExpenseEstimateService({
      repository: new DexieFixedExpenseEstimateRepository(database),
      categories: new DexieCategoryRepository(database),
      createId: () => 'fixed-backup' as FixedExpenseEstimateId,
      now: () => timestamp,
    });
    const estimate = await fixedExpenses.create({
      name: 'Gimnasio',
      amount: '67.500',
      categoryId: null,
    });
    const document = backupService.parse((await backupService.exportBackup()).json);
    expect(document.fixedExpenseEstimates).toEqual([estimate]);

    await database.fixedExpenseEstimates.clear();
    await backupService.importBackup(document);
    expect(await database.fixedExpenseEstimates.get(estimate.id)).toEqual(estimate);
  });

  it('imports an older backup without fixed expenses as an empty collection', async () => {
    await database.fixedExpenseEstimates.add({
      id: 'existing-fixed' as FixedExpenseEstimateId,
      name: 'Internet',
      amountCents: 100_000 as never,
      categoryId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const legacy = JSON.parse((await backupService.exportBackup()).json) as Record<string, unknown>;
    legacy.schemaVersion = 2;
    delete legacy.fixedExpenseEstimates;

    const parsed = backupService.parse(JSON.stringify(legacy));
    expect(parsed.fixedExpenseEstimates).toEqual([]);
    await backupService.importBackup(parsed);
    expect(await database.fixedExpenseEstimates.count()).toBe(0);
  });

  it('exports and restores the same complete state, preserving recurrence and installment identity', async () => {
    await transactionService().create(form('subscription'));
    await transactionService().create(form('installments', '3'));
    await database.settings.add({ key: 'theme', value: 'dark', updatedAt: timestamp });
    const exported = await backupService.exportBackup();
    const document = backupService.parse(exported.json);
    const expected = await repository.readAll();

    await database.transaction(
      'rw',
      [database.transactions, database.categories, database.recurringRules, database.settings],
      () =>
        Promise.all([
          database.transactions.clear(),
          database.categories.clear(),
          database.recurringRules.clear(),
          database.settings.clear(),
        ]),
    );
    await backupService.importBackup(document);

    expect(await repository.readAll()).toEqual(expected);
    expect(exported.filename).toMatch(/^finanzas-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(document).toMatchObject({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: 'test-version',
    });

    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextId,
      now: () => timestamp,
    });
    expect(await recurrence.generateThrough(toLocalDate('2026-03-31'))).toBe(2);
    expect(await recurrence.generateThrough(toLocalDate('2026-03-31'))).toBe(0);
    expect(await database.transactions.where('recurringRuleId').equals('rule-1').count()).toBe(3);
    expect(await database.transactions.where('installmentGroupId').equals('group-1').count()).toBe(
      3,
    );
  });

  it('includes the new default categories in a backup and restores them once', async () => {
    const document = backupService.parse((await backupService.exportBackup()).json);
    expect(document.categories.filter(({ id }) => id === 'category:suscripciones')).toHaveLength(1);
    expect(document.categories.filter(({ id }) => id === 'category:otros')).toHaveLength(1);

    await backupService.importBackup(document);

    expect(await database.categories.where('id').equals('category:suscripciones').count()).toBe(1);
    expect(await database.categories.where('id').equals('category:otros').count()).toBe(1);
  });

  it('preserves custom categories and migrates valid version 1 backups safely', async () => {
    const categories = new CategoryService({
      repository: new DexieCategoryRepository(database),
      createId: () => 'category:custom:internet' as CategoryId,
      now: () => timestamp,
    });
    const custom = await categories.create('Internet');
    const current = backupService.parse((await backupService.exportBackup()).json);
    const legacy = structuredClone(current) as BackupDocument;
    legacy.schemaVersion = 1;
    for (const category of legacy.categories)
      delete (category as Partial<typeof category>).isSystem;

    const migrated = backupService.parse(JSON.stringify(legacy));
    await backupService.importBackup(migrated);

    expect(migrated.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(await database.categories.get(custom.id)).toMatchObject({
      id: custom.id,
      name: 'Internet',
      color: custom.color,
      icon: custom.icon,
      isSystem: false,
    });
    expect(await database.categories.get('category:otros' as CategoryId)).toMatchObject({
      isSystem: true,
    });
  });

  it('rejects malformed JSON and incompatible versions', async () => {
    expect(() => backupService.parse('{broken')).toThrow(BackupValidationError);
    const document = backupService.parse((await backupService.exportBackup()).json);
    expect(() => backupService.parse(JSON.stringify({ ...document, schemaVersion: 99 }))).toThrow(
      /incompatible/i,
    );
  });

  it('imports a legacy rule without cancellation metadata and schedules its future on day 1', async () => {
    await transactionService().create(form('subscription'));
    const legacy = structuredClone(
      backupService.parse((await backupService.exportBackup()).json),
    ) as BackupDocument;
    const legacyRule = legacy.recurringRules[0];
    if (legacyRule === undefined) throw new Error('Fixture inválido');
    delete legacyRule.cancelledAt;
    legacyRule.dayOfMonth = 31;

    const parsed = backupService.parse(JSON.stringify(legacy));
    await backupService.importBackup(parsed);
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextId,
      now: () => timestamp,
    });

    expect(await recurrence.generateThrough(toLocalDate('2026-03-31'))).toBe(2);
    expect(
      (await database.transactions.where('recurringRuleId').equals('rule-1').sortBy('date')).map(
        ({ date }) => date,
      ),
    ).toEqual(['2026-01-31', '2026-02-01', '2026-03-01']);
  });

  it('normalizes legacy materialized future occurrences during import', async () => {
    await transactionService().create(form('subscription'));
    const recurrence = new MonthlyRecurrenceService({
      recurringRules: new DexieRecurringRuleRepository(database),
      schedules: new DexieScheduleRepository(database),
      createTransactionId: nextId,
      now: () => timestamp,
    });
    await recurrence.generateThrough(toLocalDate('2099-10-31'));
    const document = structuredClone(
      backupService.parse((await backupService.exportBackup()).json),
    ) as BackupDocument;
    const future = document.transactions.find(
      ({ occurrenceKey }) => occurrenceKey === 'rule-1:2099-10',
    );
    if (future === undefined) throw new Error('Fixture inválido');
    future.date = toLocalDate('2099-10-18');

    await backupService.importBackup(backupService.parse(JSON.stringify(document)));

    expect((await database.transactions.get(future.id))?.date).toBe('2099-10-01');
    expect(
      (await database.recurringRules.get('rule-1' as RecurringRuleId))?.lastGeneratedPeriod,
    ).toBe('2099-10');
  });

  it('preserves a definitively cancelled rule so historical references remain valid', async () => {
    await transactionService().create(form('subscription'));
    const cancelledRuleId = 'rule-1' as RecurringRuleId;
    await database.recurringRules.update(cancelledRuleId, {
      isActive: false,
      cancelledAt: timestamp,
      updatedAt: timestamp,
    });
    const document = backupService.parse((await backupService.exportBackup()).json);

    await backupService.importBackup(document);

    expect(await database.recurringRules.get(cancelledRuleId)).toMatchObject({
      isActive: false,
      cancelledAt: timestamp,
    });
    expect(await database.transactions.where('recurringRuleId').equals('rule-1').count()).toBe(1);
  });

  it('rejects invalid references before modifying persisted data', async () => {
    await transactionService().create(form('installments'));
    const document = backupService.parse((await backupService.exportBackup()).json);
    const invalid = structuredClone(document) as BackupDocument;
    const firstTransaction = invalid.transactions[0];
    if (firstTransaction === undefined) throw new Error('Fixture inválido');
    firstTransaction.categoryId = 'category:missing' as typeof firstTransaction.categoryId;

    await expect(backupService.importBackup(invalid)).rejects.toThrow(/categoría inexistente/i);
    expect(await database.transactions.count()).toBe(2);
  });

  it('rejects a lastGeneratedPeriod before the rule start without replacing data', async () => {
    await transactionService().create(form('subscription'));
    const document = backupService.parse((await backupService.exportBackup()).json);
    const invalid = structuredClone(document) as BackupDocument;
    const rule = invalid.recurringRules[0];
    if (rule === undefined) throw new Error('Fixture inválido');
    rule.lastGeneratedPeriod = '2025-12' as typeof rule.lastGeneratedPeriod;

    await expect(backupService.importBackup(invalid)).rejects.toThrow(/anterior al inicio/i);
    expect((await database.recurringRules.get(rule.id))?.lastGeneratedPeriod).toBe('2026-01');
  });

  it('rejects an active rule whose lastGeneratedPeriod has no matching occurrence', async () => {
    await transactionService().create(form('subscription'));
    const document = backupService.parse((await backupService.exportBackup()).json);
    const invalid = structuredClone(document) as BackupDocument;
    const rule = invalid.recurringRules[0];
    if (rule === undefined) throw new Error('Fixture inválido');
    rule.lastGeneratedPeriod = '2099-12' as typeof rule.lastGeneratedPeriod;

    expect(() => backupService.parse(JSON.stringify(invalid))).toThrow(/ocurrencia asociada/i);
  });

  it('rolls back replacement if persistence fails after clearing tables', async () => {
    const original = await repository.readAll();
    const duplicatedCategory = original.categories[0];
    if (duplicatedCategory === undefined) throw new Error('Fixture inválido');

    await expect(
      repository.replaceAll({
        ...original,
        categories: [...original.categories, structuredClone(duplicatedCategory)],
      }),
    ).rejects.toThrow();

    expect(await repository.readAll()).toEqual(original);
  });
});
