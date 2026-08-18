import type { Transaction as DexieTransaction } from 'dexie';

import type { Category } from '@/models/category';

import { DEFAULT_CATEGORY_DEFINITIONS } from '../seed/default-categories';

const defaultIconsById = new Map(
  DEFAULT_CATEGORY_DEFINITIONS.map(({ id, icon }) => [id, icon] as const),
);

export async function repairDefaultCategoryIcons(transaction: DexieTransaction): Promise<void> {
  await transaction
    .table<Category>('categories')
    .toCollection()
    .modify((category) => {
      const defaultIcon = defaultIconsById.get(category.id);

      if (!category.icon?.trim() && defaultIcon !== undefined) {
        category.icon = defaultIcon;
      }
    });
}
