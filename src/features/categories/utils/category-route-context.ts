import type { CategoryId, LocalDate } from '@/models/common';
import { PERIOD_UNITS, type PeriodUnit } from '@/models/period';
import { TRANSACTION_TYPES, type TransactionType } from '@/models/transaction';
import { toLocalDate } from '@/utils/dates';
import { toCategoryId } from '@/utils/ids';

import type { CategoryDetailQuery } from '../models/category-detail';

export interface CategoryRouteContext {
  type: TransactionType;
  period: PeriodUnit;
  reference: LocalDate;
}

function firstValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseCategoryRouteQuery(
  categoryId: unknown,
  routeQuery: Record<string, unknown>,
  fallbackDate: LocalDate,
): CategoryDetailQuery {
  const typeCandidate = firstValue(routeQuery.type);
  const periodCandidate = firstValue(routeQuery.period);
  let referenceDate = fallbackDate;

  try {
    referenceDate = toLocalDate(firstValue(routeQuery.reference) ?? '');
  } catch {
    // A malformed URL falls back to today while keeping the page usable.
  }

  return {
    categoryId: toCategoryId(typeof categoryId === 'string' ? categoryId : ''),
    type: TRANSACTION_TYPES.find((type) => type === typeCandidate) ?? 'expense',
    period: PERIOD_UNITS.find((period) => period === periodCandidate) ?? 'month',
    referenceDate,
  };
}

export function buildCategoryRouteContext(query: CategoryDetailQuery): CategoryRouteContext {
  return { type: query.type, period: query.period, reference: query.referenceDate };
}

export function buildCategoryCreateQuery(
  categoryId: CategoryId,
  context: CategoryRouteContext,
): CategoryRouteContext & { category: CategoryId } {
  return { ...context, category: categoryId };
}
