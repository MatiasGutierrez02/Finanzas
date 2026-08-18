import type { LocalDate } from '@/models/common';
import type { DateRange, PeriodUnit } from '@/models/period';

import { toLocalDate, todayLocalDate } from './dates';

const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'long' });
const dayMonthFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
});
const fullDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function parseLocalDate(value: LocalDate): Date {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function localDateFromDate(value: Date): LocalDate {
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return toLocalDate(`${year}-${month}-${day}`);
}

function addDays(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount, 12);
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-AR') + value.slice(1);
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0, 12).getDate();
}

export function getPeriodRange(unit: PeriodUnit, reference: LocalDate): DateRange {
  const date = parseLocalDate(reference);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (unit === 'day') {
    return { start: reference, end: reference };
  }

  if (unit === 'week') {
    const daysSinceMonday = (date.getDay() + 6) % 7;
    const start = addDays(date, -daysSinceMonday);
    return { start: localDateFromDate(start), end: localDateFromDate(addDays(start, 6)) };
  }

  if (unit === 'month') {
    return {
      start: localDateFromDate(new Date(year, month, 1, 12)),
      end: localDateFromDate(new Date(year, month, lastDayOfMonth(year, month), 12)),
    };
  }

  if (unit === 'quarter') {
    const quarterStart = Math.floor(month / 3) * 3;
    const quarterEnd = quarterStart + 2;
    return {
      start: localDateFromDate(new Date(year, quarterStart, 1, 12)),
      end: localDateFromDate(new Date(year, quarterEnd, lastDayOfMonth(year, quarterEnd), 12)),
    };
  }

  return {
    start: localDateFromDate(new Date(year, 0, 1, 12)),
    end: localDateFromDate(new Date(year, 11, 31, 12)),
  };
}

export function isCurrentPeriod(
  unit: PeriodUnit,
  reference: LocalDate,
  today: LocalDate = todayLocalDate(),
): boolean {
  const referenceRange = getPeriodRange(unit, reference);
  const currentRange = getPeriodRange(unit, today);
  return referenceRange.start === currentRange.start && referenceRange.end === currentRange.end;
}

export function navigatePeriod(
  reference: LocalDate,
  unit: PeriodUnit,
  direction: -1 | 1,
): LocalDate {
  const date = parseLocalDate(reference);
  const range = getPeriodRange(unit, reference);

  if (unit === 'day') {
    return localDateFromDate(addDays(date, direction));
  }

  if (unit === 'week') {
    return localDateFromDate(addDays(parseLocalDate(range.start), direction * 7));
  }

  if (unit === 'month') {
    return localDateFromDate(new Date(date.getFullYear(), date.getMonth() + direction, 1, 12));
  }

  if (unit === 'quarter') {
    const start = parseLocalDate(range.start);
    return localDateFromDate(
      new Date(start.getFullYear(), start.getMonth() + direction * 3, 1, 12),
    );
  }

  return localDateFromDate(new Date(date.getFullYear() + direction, 0, 1, 12));
}

export function formatPeriodLabel(
  unit: PeriodUnit,
  reference: LocalDate,
  today: LocalDate = todayLocalDate(),
): string {
  const range = getPeriodRange(unit, reference);
  const start = parseLocalDate(range.start);
  const end = parseLocalDate(range.end);

  if (unit === 'day') {
    const label = fullDateFormatter.format(start);
    return reference === today ? `Hoy, ${dayMonthFormatter.format(start)}` : capitalize(label);
  }

  if (unit === 'week') {
    if (start.getFullYear() !== end.getFullYear()) {
      return `${fullDateFormatter.format(start)} - ${fullDateFormatter.format(end)}`;
    }

    if (start.getMonth() !== end.getMonth()) {
      return `${dayMonthFormatter.format(start)} - ${dayMonthFormatter.format(end)}`;
    }

    return `${start.getDate()} - ${dayMonthFormatter.format(end)}`;
  }

  if (unit === 'month') {
    return `${capitalize(monthFormatter.format(start))} ${start.getFullYear()}`;
  }

  if (unit === 'quarter') {
    return `${capitalize(monthFormatter.format(start))} - ${capitalize(
      monthFormatter.format(end),
    )} ${start.getFullYear()}`;
  }

  return String(start.getFullYear());
}
