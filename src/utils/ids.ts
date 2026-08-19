import type {
  CategoryId,
  InstallmentGroupId,
  RecurringRuleId,
  TransactionId,
} from '@/models/common';

export interface WebCryptoSource {
  randomUUID?: () => string;
  getRandomValues(array: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>;
}

export function generateUuid(
  cryptoSource: WebCryptoSource | undefined = globalThis.crypto,
): string {
  if (typeof cryptoSource?.randomUUID === 'function') {
    return cryptoSource.randomUUID();
  }

  if (typeof cryptoSource?.getRandomValues !== 'function') {
    throw new Error('Web Crypto no está disponible para generar un identificador seguro.');
  }

  const bytes = cryptoSource.getRandomValues(new Uint8Array(16));

  // RFC 4122: fija la versión 4 y la variante sin reducir la entropía del resto del UUID.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export function newTransactionId(cryptoSource?: WebCryptoSource): TransactionId {
  return generateUuid(cryptoSource) as TransactionId;
}

export function newRecurringRuleId(cryptoSource?: WebCryptoSource): RecurringRuleId {
  return generateUuid(cryptoSource) as RecurringRuleId;
}

export function newInstallmentGroupId(cryptoSource?: WebCryptoSource): InstallmentGroupId {
  return generateUuid(cryptoSource) as InstallmentGroupId;
}

export function newCategoryId(cryptoSource?: WebCryptoSource): CategoryId {
  return `category:custom:${generateUuid(cryptoSource)}` as CategoryId;
}

export function toCategoryId(value: string): CategoryId {
  if (value.trim().length === 0) {
    throw new RangeError('El identificador de categoría no puede estar vacío.');
  }

  return value as CategoryId;
}
