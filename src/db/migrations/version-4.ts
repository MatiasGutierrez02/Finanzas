import type { Transaction as DexieTransaction } from 'dexie';

import type { Category } from '@/models/category';
import { DEFAULT_CATEGORY_DEFINITIONS } from '../seed/default-categories';

const systemIds = new Set(DEFAULT_CATEGORY_DEFINITIONS.map(({ id }) => id));

export async function markSystemCategories(transaction: DexieTransaction): Promise<void> {
  await transaction
    .table<Category>('categories')
    .toCollection()
    .modify((category) => {
      category.isSystem = systemIds.has(category.id);
    });
}
