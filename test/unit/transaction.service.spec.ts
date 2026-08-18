import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FinancesDatabase } from '@/db/finances-database';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import {
  TransactionService,
  TransactionValidationError,
} from '@/features/transactions/services/transaction.service';
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
});
