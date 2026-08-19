import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORY_DEFINITIONS } from '@/db/seed/default-categories';
import {
  CATEGORY_ICON_FALLBACK,
  resolveCategoryIcon,
} from '@/features/categories/utils/category-icons';

const expectedIcons = {
  Joda: 'nightlife',
  Celular: 'smartphone',
  Ropa: 'checkroom',
  Recitales: 'music_note',
  Mascota: 'pets',
  Auto: 'directions_car',
  Juegos: 'sports_esports',
  Viajes: 'flight',
  Comida: 'restaurant',
  Gimnasio: 'fitness_center',
  Familia: 'family_restroom',
  Casa: 'home',
  Transporte: 'directions_bus',
  Regalo: 'card_giftcard',
  Educación: 'school',
  Salud: 'medical_services',
  Devolución: 'currency_exchange',
  Venta: 'sell',
  Sueldo: 'payments',
  Suscripciones: 'subscriptions',
  Otros: 'category',
} as const;

describe('category icons', () => {
  it('keeps the agreed Material Icon assigned to every default category', () => {
    expect(
      Object.fromEntries(DEFAULT_CATEGORY_DEFINITIONS.map(({ name, icon }) => [name, icon])),
    ).toEqual(expectedIcons);
  });

  it('uses the stored icon and only falls back for an absent value', () => {
    expect(resolveCategoryIcon('restaurant')).toBe('restaurant');
    expect(resolveCategoryIcon('  payments  ')).toBe('payments');
    expect(resolveCategoryIcon(null)).toBe(CATEGORY_ICON_FALLBACK);
    expect(resolveCategoryIcon('')).toBe(CATEGORY_ICON_FALLBACK);
    expect(resolveCategoryIcon('   ')).toBe(CATEGORY_ICON_FALLBACK);
  });
});
