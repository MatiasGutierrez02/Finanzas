import { describe, expect, it } from 'vitest';

import { formatPeriodLabel, getPeriodRange, navigatePeriod } from '@/utils/date-range';
import { toLocalDate } from '@/utils/dates';

const reference = toLocalDate('2026-08-18');

describe('period ranges', () => {
  it.each([
    ['day', '2026-08-18', '2026-08-18'],
    ['week', '2026-08-17', '2026-08-23'],
    ['month', '2026-08-01', '2026-08-31'],
    ['quarter', '2026-07-01', '2026-09-30'],
    ['year', '2026-01-01', '2026-12-31'],
  ] as const)('calculates the inclusive %s range', (unit, start, end) => {
    expect(getPeriodRange(unit, reference)).toEqual({ start, end });
  });

  it('uses Monday as the first day across month and year boundaries', () => {
    expect(getPeriodRange('week', toLocalDate('2027-01-01'))).toEqual({
      start: '2026-12-28',
      end: '2027-01-03',
    });
  });
});

describe('period navigation', () => {
  it.each([
    ['day', -1, '2026-08-17'],
    ['week', 1, '2026-08-24'],
    ['month', -1, '2026-07-01'],
    ['quarter', -1, '2026-04-01'],
    ['year', -1, '2025-01-01'],
  ] as const)('moves exactly one %s', (unit, direction, expected) => {
    expect(navigatePeriod(reference, unit, direction)).toBe(expected);
  });
});

describe('period labels', () => {
  it('formats every period naturally in Spanish', () => {
    expect(formatPeriodLabel('day', reference, reference)).toBe('Hoy, 18 de agosto');
    expect(formatPeriodLabel('week', reference)).toBe('17 - 23 de agosto');
    expect(formatPeriodLabel('month', reference)).toBe('Agosto 2026');
    expect(formatPeriodLabel('quarter', reference)).toBe('Julio - Septiembre 2026');
    expect(formatPeriodLabel('year', reference)).toBe('2026');
  });
});
