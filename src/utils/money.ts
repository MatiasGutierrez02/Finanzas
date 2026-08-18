import type { MoneyCents } from '@/models/common';

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function toMoneyCents(value: number): MoneyCents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('El monto en centavos debe ser un entero seguro no negativo.');
  }

  return value as MoneyCents;
}

export function formatArs(value: MoneyCents): string {
  return arsFormatter.format(value / 100).replace(/\u00a0/g, ' ');
}

export function formatSignedArs(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('El monto debe ser un entero seguro en centavos.');
  }

  return arsFormatter.format(value / 100).replace(/\u00a0/g, ' ');
}

export function parseArsInput(input: string): MoneyCents {
  const sanitized = input.trim().replace(/\s|\$/g, '').replace(/^ARS/i, '');

  if (sanitized.length === 0 || sanitized.startsWith('-')) {
    throw new RangeError('Ingresá un monto mayor a cero.');
  }

  let normalized: string;

  if (sanitized.includes(',')) {
    if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(sanitized)) {
      throw new RangeError('El formato del monto no es válido.');
    }

    normalized = sanitized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(sanitized)) {
    normalized = sanitized.replace(/\./g, '');
  } else {
    if (!/^\d+(?:\.\d{1,2})?$/.test(sanitized)) {
      throw new RangeError('El formato del monto no es válido.');
    }

    normalized = sanitized;
  }

  const [pesos = '0', decimals = ''] = normalized.split('.');
  const cents = Number(pesos) * 100 + Number(decimals.padEnd(2, '0'));

  if (cents <= 0) {
    throw new RangeError('Ingresá un monto mayor a cero.');
  }

  return toMoneyCents(cents);
}

export function formatMoneyInput(value: MoneyCents): string {
  const pesos = Math.trunc(value / 100);
  const cents = value % 100;

  return cents === 0 ? String(pesos) : `${pesos},${String(cents).padStart(2, '0')}`;
}
