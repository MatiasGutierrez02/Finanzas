import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';

import { FinancesDatabase } from '@/db/finances-database';
import { DATABASE_STORES } from '@/db/schema';
import { seedDefaultCategories } from '@/db/seed/default-categories';
import type { Category } from '@/models/category';
import type { CategoryId, IsoTimestamp, TransactionId } from '@/models/common';
import type { Transaction } from '@/models/transaction';
import { DexieTransactionRepository } from '@/repositories/dexie/dexie-transaction.repository';
import { toLocalDate } from '@/utils/dates';
import { toCategoryId } from '@/utils/ids';
import { toMoneyCents } from '@/utils/money';

const timestamp = '2026-08-18T12:00:00.000Z' as IsoTimestamp;
let database: FinancesDatabase;
let databaseSequence = 0;

function transaction(
  id: string,
  date: string,
  type: Transaction['type'],
  categoryId: CategoryId,
  occurrenceKey: string | null = null,
): Transaction {
  return {
    id: id as TransactionId,
    type,
    amountCents: toMoneyCents(10_000),
    categoryId,
    comment: null,
    date: toLocalDate(date),
    createdAt: timestamp,
    updatedAt: timestamp,
    recurringRuleId: null,
    occurrenceKey,
    installmentGroupId: null,
    installmentNumber: null,
    installmentCount: null,
  };
}

function legacyCategory(id: CategoryId, icon: string | null): Category {
  return {
    id,
    name: id === toCategoryId('category:comida') ? 'Comida' : 'Venta',
    color: '#123456',
    icon,
    isActive: true,
    sortOrder: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

beforeEach(() => {
  databaseSequence += 1;
  database = new FinancesDatabase(`FinanzasDB-test-${databaseSequence}`);
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe('category seed', () => {
  it('adds all defaults once and preserves later customizations', async () => {
    expect(await seedDefaultCategories(database)).toBe(21);

    const foodId = toCategoryId('category:comida');
    await database.categories.update(foodId, {
      color: '#000000',
      icon: 'custom_food',
      name: 'Alimentos',
    });

    expect(await seedDefaultCategories(database)).toBe(0);
    expect(await database.categories.count()).toBe(21);
    expect(await database.categories.get(foodId)).toMatchObject({
      color: '#000000',
      icon: 'custom_food',
      name: 'Alimentos',
    });
  });

  it('adds the new subscription and fallback categories once without overwriting them', async () => {
    await seedDefaultCategories(database);
    const subscriptionsId = toCategoryId('category:suscripciones');
    const othersId = toCategoryId('category:otros');

    expect(await database.categories.get(subscriptionsId)).toMatchObject({
      name: 'Suscripciones',
      color: '#00695C',
      icon: 'subscriptions',
      isActive: true,
      sortOrder: 19,
    });
    expect(await database.categories.get(othersId)).toMatchObject({
      name: 'Otros',
      color: '#6A1B9A',
      icon: 'category',
      isActive: true,
      sortOrder: 20,
    });

    await database.categories.update(othersId, { name: 'Varios', color: '#010203' });
    expect(await seedDefaultCategories(database)).toBe(0);
    expect(await database.categories.get(othersId)).toMatchObject({
      name: 'Varios',
      color: '#010203',
    });
  });

  it('migrates missing default icons without replacing an existing custom icon', async () => {
    const foodId = toCategoryId('category:comida');
    const saleId = toCategoryId('category:venta');
    const legacyDatabase = new Dexie(database.name);
    legacyDatabase.version(1).stores(DATABASE_STORES);
    await legacyDatabase
      .table<Category>('categories')
      .bulkAdd([legacyCategory(foodId, null), legacyCategory(saleId, 'custom_sale')]);
    legacyDatabase.close();

    await database.open();

    expect(await database.categories.get(foodId)).toMatchObject({ icon: 'restaurant' });
    expect(await database.categories.get(saleId)).toMatchObject({ icon: 'custom_sale' });
  });

  it('repairs missing icons in a database that had already reached version 2', async () => {
    const foodId = toCategoryId('category:comida');
    const saleId = toCategoryId('category:venta');
    const legacyDatabase = new Dexie(database.name);
    legacyDatabase.version(2).stores(DATABASE_STORES);
    await legacyDatabase
      .table<Category>('categories')
      .bulkAdd([legacyCategory(foodId, null), legacyCategory(saleId, 'custom_sale')]);
    legacyDatabase.close();

    await database.open();

    expect(await database.categories.get(foodId)).toMatchObject({ icon: 'restaurant' });
    expect(await database.categories.get(saleId)).toMatchObject({ icon: 'custom_sale' });
  });
});

describe('transaction repository', () => {
  it('uses the category, type and inclusive date range together', async () => {
    const repository = new DexieTransactionRepository(database);
    const foodId = toCategoryId('category:comida');
    const carId = toCategoryId('category:auto');

    await database.transactions.bulkAdd([
      transaction('one', '2026-08-01', 'expense', foodId),
      transaction('two', '2026-08-31', 'expense', foodId),
      transaction('three', '2026-08-15', 'income', foodId),
      transaction('four', '2026-08-15', 'expense', carId),
      transaction('five', '2026-09-01', 'expense', foodId),
    ]);

    const result = await repository.find({
      categoryId: foodId,
      type: 'expense',
      startDate: toLocalDate('2026-08-01'),
      endDate: toLocalDate('2026-08-31'),
    });

    expect(result.map(({ id }) => id)).toEqual(['one', 'two']);
  });

  it('enforces a unique occurrence key at the database boundary', async () => {
    const foodId = toCategoryId('category:comida');
    const occurrenceKey = 'rule-1:2026-08';

    await database.transactions.add(
      transaction('first-occurrence', '2026-08-10', 'expense', foodId, occurrenceKey),
    );

    await expect(
      database.transactions.add(
        transaction('duplicate-occurrence', '2026-08-10', 'expense', foodId, occurrenceKey),
      ),
    ).rejects.toThrow();
  });
});
