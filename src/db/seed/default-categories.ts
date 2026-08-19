import type { Category } from '@/models/category';
import type { IsoTimestamp } from '@/models/common';
import { nowIsoTimestamp } from '@/utils/dates';
import { toCategoryId } from '@/utils/ids';

import type { FinancesDatabase } from '../finances-database';

interface DefaultCategoryDefinition {
  id: string;
  name: string;
  color: `#${string}`;
  icon: string;
}

export const DEFAULT_CATEGORY_DEFINITIONS: readonly DefaultCategoryDefinition[] = [
  { id: 'category:joda', name: 'Joda', color: '#E85D75', icon: 'nightlife' },
  { id: 'category:celular', name: 'Celular', color: '#5B8DEF', icon: 'smartphone' },
  { id: 'category:ropa', name: 'Ropa', color: '#9B6BDF', icon: 'checkroom' },
  { id: 'category:recitales', name: 'Recitales', color: '#D05CE3', icon: 'music_note' },
  { id: 'category:mascota', name: 'Mascota', color: '#C58B45', icon: 'pets' },
  { id: 'category:auto', name: 'Auto', color: '#607D8B', icon: 'directions_car' },
  { id: 'category:juegos', name: 'Juegos', color: '#3F51B5', icon: 'sports_esports' },
  { id: 'category:viajes', name: 'Viajes', color: '#00A6A6', icon: 'flight' },
  { id: 'category:comida', name: 'Comida', color: '#F08A4B', icon: 'restaurant' },
  { id: 'category:gimnasio', name: 'Gimnasio', color: '#43A047', icon: 'fitness_center' },
  { id: 'category:familia', name: 'Familia', color: '#EC407A', icon: 'family_restroom' },
  { id: 'category:casa', name: 'Casa', color: '#8D6E63', icon: 'home' },
  { id: 'category:transporte', name: 'Transporte', color: '#26A69A', icon: 'directions_bus' },
  { id: 'category:regalo', name: 'Regalo', color: '#AB47BC', icon: 'card_giftcard' },
  { id: 'category:educacion', name: 'Educación', color: '#3949AB', icon: 'school' },
  { id: 'category:salud', name: 'Salud', color: '#EF5350', icon: 'medical_services' },
  {
    id: 'category:devolucion',
    name: 'Devolución',
    color: '#7CB342',
    icon: 'currency_exchange',
  },
  { id: 'category:venta', name: 'Venta', color: '#00897B', icon: 'sell' },
  { id: 'category:sueldo', name: 'Sueldo', color: '#2E7D32', icon: 'payments' },
  {
    id: 'category:suscripciones',
    name: 'Suscripciones',
    color: '#00695C',
    icon: 'subscriptions',
  },
  { id: 'category:otros', name: 'Otros', color: '#6A1B9A', icon: 'category' },
] as const;

function createDefaultCategory(
  definition: DefaultCategoryDefinition,
  sortOrder: number,
  timestamp: IsoTimestamp,
): Category {
  return {
    id: toCategoryId(definition.id),
    name: definition.name,
    color: definition.color,
    icon: definition.icon,
    isSystem: true,
    isActive: true,
    sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function seedDefaultCategories(database: FinancesDatabase): Promise<number> {
  return database.transaction('rw', database.categories, async () => {
    const existingIds = new Set(await database.categories.toCollection().primaryKeys());
    const timestamp = nowIsoTimestamp();
    const missingCategories = DEFAULT_CATEGORY_DEFINITIONS.flatMap((definition, index) =>
      existingIds.has(toCategoryId(definition.id))
        ? []
        : [createDefaultCategory(definition, index, timestamp)],
    );

    if (missingCategories.length > 0) {
      await database.categories.bulkAdd(missingCategories);
    }

    return missingCategories.length;
  });
}
