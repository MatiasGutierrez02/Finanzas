import type { IsoTimestamp, LocalDate } from '@/models/common';

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDate(value: string): LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value);

  if (match === null) {
    throw new RangeError(`Fecha local inválida: ${value}`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(year, month - 1, day);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    throw new RangeError(`Fecha local inválida: ${value}`);
  }

  return value as LocalDate;
}

export function todayLocalDate(now = new Date()): LocalDate {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return toLocalDate(`${year}-${month}-${day}`);
}

export function nowIsoTimestamp(now = new Date()): IsoTimestamp {
  return now.toISOString() as IsoTimestamp;
}

export function formatLocalDate(value: LocalDate): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12);

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatLocalDayMonth(value: LocalDate): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12);

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}
