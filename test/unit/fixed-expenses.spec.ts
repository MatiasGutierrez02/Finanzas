import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';

import { FinancesDatabase } from '@/db/finances-database';
import { DATABASE_STORES_V4 } from '@/db/schema';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import { FixedExpenseEstimateService } from '@/features/fixed-expenses/services/fixed-expense-estimate.service';
import type { FixedExpenseEstimateId, IsoTimestamp } from '@/models/common';
import { DexieCategoryRepository } from '@/repositories/dexie/dexie-category.repository';
import { DexieFixedExpenseEstimateRepository } from '@/repositories/dexie/dexie-fixed-expense-estimate.repository';

const firstTimestamp = '2026-08-19T12:00:00.000Z' as IsoTimestamp;
const secondTimestamp = '2026-08-19T13:00:00.000Z' as IsoTimestamp;
let database: FinancesDatabase;
let sequence = 0;

beforeEach(async () => {
  database = new FinancesDatabase(`Fixed-expenses-test-${++sequence}`);
  await seedDefaultCategories(database);
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('fixed expense estimates', () => {
  it('creates, persists, totals, edits without changing identity, and deletes independently', async () => {
    let now = firstTimestamp;
    const service = new FixedExpenseEstimateService({
      repository: new DexieFixedExpenseEstimateRepository(database),
      categories: new DexieCategoryRepository(database),
      createId: () => 'fixed-1' as FixedExpenseEstimateId,
      now: () => now,
    });

    const created = await service.create({
      name: 'Luz',
      amount: '50.000',
      categoryId: 'category:casa',
    });
    expect(await database.fixedExpenseEstimates.get(created.id)).toEqual(created);
    expect(service.total([created])).toBe(5_000_000);
    expect((await service.list())[0]?.category?.id).toBe('category:casa');

    now = secondTimestamp;
    const updated = await service.update(created.id, {
      name: 'Electricidad',
      amount: '67.500',
      categoryId: null,
    });
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Electricidad',
      amountCents: 6_750_000,
      categoryId: null,
      createdAt: firstTimestamp,
      updatedAt: secondTimestamp,
    });
    expect((await service.list())[0]?.category).toBeNull();
    expect(await database.transactions.count()).toBe(0);

    await service.remove(created.id);
    expect(await database.fixedExpenseEstimates.count()).toBe(0);
    expect(await database.categories.count()).toBeGreaterThan(0);
  });

  it('migrates an existing version 4 database without changing its data', async () => {
    const name = `Fixed-expenses-migration-${sequence}`;
    const legacy = new Dexie(name);
    legacy.version(4).stores(DATABASE_STORES_V4);
    await legacy.table('settings').add({ key: 'theme', value: 'dark', updatedAt: firstTimestamp });
    legacy.close();

    const migrated = new FinancesDatabase(name);
    await migrated.open();
    expect(await migrated.settings.get('theme')).toMatchObject({ value: 'dark' });
    expect(await migrated.fixedExpenseEstimates.count()).toBe(0);
    migrated.close();
    await Dexie.delete(name);
  });
});
