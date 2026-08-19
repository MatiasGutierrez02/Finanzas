import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinancesDatabase } from '@/db/finances-database';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import {
  CategoryInUseError,
  CategoryService,
  CUSTOM_CATEGORY_ICON,
} from '@/features/categories/services/category.service';
import type { CategoryId, IsoTimestamp } from '@/models/common';
import { DexieCategoryRepository } from '@/repositories/dexie/dexie-category.repository';
import { DexieScheduleRepository } from '@/repositories/dexie/dexie-schedule.repository';
import { DexieTransactionRepository } from '@/repositories/dexie/dexie-transaction.repository';
import { TransactionService } from '@/features/transactions/services/transaction.service';

const timestamp = '2026-08-18T12:00:00.000Z' as IsoTimestamp;
const customId = 'category:custom:test' as CategoryId;
let sequence = 0;
let database: FinancesDatabase;
let service: CategoryService;

beforeEach(async () => {
  database = new FinancesDatabase(`CategoryManagement-${++sequence}`);
  await seedDefaultCategories(database);
  service = new CategoryService({
    repository: new DexieCategoryRepository(database),
    createId: () => customId,
    now: () => timestamp,
  });
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('custom category management', () => {
  it('creates and persists a custom category with the Otros icon and an unused color', async () => {
    const usedColors = new Set((await database.categories.toArray()).map(({ color }) => color));
    const created = await service.create('  Internet  ');

    expect(created).toMatchObject({
      id: customId,
      name: 'Internet',
      icon: CUSTOM_CATEGORY_ICON,
      isSystem: false,
    });
    expect(usedColors.has(created.color)).toBe(false);
    expect(await new DexieCategoryRepository(database).getById(customId)).toEqual(created);
  });

  it('renames only mutable fields and deletes an unused custom category', async () => {
    const created = await service.create('Internet');
    const renamed = await service.rename(customId, 'Servicios online');
    expect(renamed).toMatchObject({
      id: created.id,
      name: 'Servicios online',
      color: created.color,
      icon: created.icon,
      createdAt: created.createdAt,
    });
    await service.remove(customId);
    expect(await database.categories.get(customId)).toBeUndefined();
  });

  it('never deletes system categories', async () => {
    await expect(service.remove('category:otros' as CategoryId)).rejects.toThrow(/sistema/i);
    expect(await database.categories.get('category:otros' as CategoryId)).toBeDefined();
  });

  it('prevents deletion while a transaction references the custom category', async () => {
    await service.create('Internet');
    const transactions = new TransactionService({
      transactions: new DexieTransactionRepository(database),
      categories: new DexieCategoryRepository(database),
      schedules: new DexieScheduleRepository(database),
      now: () => timestamp,
    });
    await transactions.create({
      type: 'expense',
      amount: '100',
      categoryId: customId,
      comment: '',
      date: '2026-08-18',
      schedule: 'none',
      installmentCount: '2',
    });
    await expect(service.remove(customId)).rejects.toBeInstanceOf(CategoryInUseError);
    expect(await database.categories.get(customId)).toBeDefined();
  });

  it('keeps custom categories when the system seed runs repeatedly', async () => {
    const created = await service.create('Internet');
    expect(await seedDefaultCategories(database)).toBe(0);
    expect(await seedDefaultCategories(database)).toBe(0);
    expect(await database.categories.get(customId)).toEqual(created);
  });
});
