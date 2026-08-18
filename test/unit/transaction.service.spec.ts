import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FinancesDatabase } from '@/db/finances-database';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import {
  TransactionService,
  TransactionValidationError,
  transactionService,
} from '@/features/transactions/services/transaction.service';
import { useTransactionEditor } from '@/features/transactions/composables/use-transaction-editor';
import type { IsoTimestamp, TransactionId } from '@/models/common';
import { DexieCategoryRepository } from '@/repositories/dexie/dexie-category.repository';
import { DexieTransactionRepository } from '@/repositories/dexie/dexie-transaction.repository';
import { DexieScheduleRepository } from '@/repositories/dexie/dexie-schedule.repository';

const createdAt = '2026-08-18T12:00:00.000Z' as IsoTimestamp;
const updatedAt = '2026-08-18T13:00:00.000Z' as IsoTimestamp;
const transactionId = '00000000-0000-4000-8000-000000000001' as TransactionId;
let database: FinancesDatabase;
let service: TransactionService;
let currentTimestamp: IsoTimestamp;
let databaseSequence = 0;

beforeEach(async () => {
  databaseSequence += 1;
  database = new FinancesDatabase(`TransactionService-test-${databaseSequence}`);
  await seedDefaultCategories(database);
  currentTimestamp = createdAt;
  service = new TransactionService({
    transactions: new DexieTransactionRepository(database),
    categories: new DexieCategoryRepository(database),
    schedules: new DexieScheduleRepository(database),
    createId: () => transactionId,
    now: () => currentTimestamp,
  });
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('TransactionService', () => {
  it('creates, updates and removes a normalized transaction while preserving its identity', async () => {
    const created = await service.create({
      type: 'expense',
      amount: '$ 25.000,50',
      categoryId: 'category:comida',
      comment: '  Supermercado  ',
      date: '2026-08-18',
      schedule: 'none',
      installmentCount: '2',
    });

    expect(created).toMatchObject({
      id: transactionId,
      amountCents: 2_500_050,
      comment: 'Supermercado',
      createdAt,
      updatedAt: createdAt,
      recurringRuleId: null,
      installmentGroupId: null,
    });

    currentTimestamp = updatedAt;
    const updated = await service.update(transactionId, {
      type: 'income',
      amount: '30000',
      categoryId: 'category:venta',
      comment: '',
      date: '2026-08-19',
      schedule: 'none',
      installmentCount: '2',
    });

    expect(updated).toMatchObject({
      id: transactionId,
      type: 'income',
      amountCents: 3_000_000,
      comment: null,
      createdAt,
      updatedAt,
    });

    await service.remove(transactionId);
    expect(await database.transactions.count()).toBe(0);
  });

  it('rejects invalid money or category before writing', async () => {
    await expect(
      service.create({
        type: 'expense',
        amount: '10,999',
        categoryId: 'category:inexistente',
        comment: '',
        date: '2026-08-18',
        schedule: 'none',
        installmentCount: '2',
      }),
    ).rejects.toBeInstanceOf(TransactionValidationError);

    await expect(
      service.create({
        type: 'expense',
        amount: '1000',
        categoryId: 'category:inexistente',
        comment: '',
        date: '2026-08-18',
        schedule: 'none',
        installmentCount: '2',
      }),
    ).rejects.toBeInstanceOf(TransactionValidationError);

    expect(await database.transactions.count()).toBe(0);
  });

  it('prevents moving a recurring occurrence to another month and preserves its occurrence key', async () => {
    const created = await service.create({
      type: 'expense',
      amount: '30000',
      categoryId: 'category:comida',
      comment: 'Suscripción',
      date: '2026-08-18',
      schedule: 'subscription',
      installmentCount: '2',
    });

    await expect(
      service.update(created.id, {
        type: 'expense',
        amount: '30000',
        categoryId: 'category:comida',
        comment: 'Suscripción',
        date: '2026-09-01',
        schedule: 'subscription',
        installmentCount: '2',
      }),
    ).rejects.toThrow(/no puede moverse a otro mes/i);

    expect(await database.transactions.get(created.id)).toMatchObject({
      date: '2026-08-18',
      occurrenceKey: `${created.recurringRuleId}:2026-08`,
    });
  });

  it('guards the save flow so a rapid double submit creates only one movement', async () => {
    let finishCreate:
      ((transaction: Awaited<ReturnType<TransactionService['create']>>) => void) | undefined;
    const create = vi.spyOn(transactionService, 'create').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve;
        }),
    );
    const editor = useTransactionEditor();
    const value = {
      type: 'expense' as const,
      amount: '1000',
      categoryId: 'category:comida',
      comment: '',
      date: '2026-08-18',
      schedule: 'none' as const,
      installmentCount: '2',
    };

    const firstSave = editor.save(value);
    const secondSave = editor.save(value);

    expect(await secondSave).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
    finishCreate?.({ id: transactionId } as Awaited<ReturnType<TransactionService['create']>>);
    expect((await firstSave)?.id).toBe(transactionId);
    expect(editor.saving.value).toBe(false);
  });
});
