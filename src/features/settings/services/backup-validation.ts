import { BACKUP_SCHEMA_VERSION, type BackupDocument } from '../models/backup';
import { SETTING_KEYS } from '@/models/settings';
import { TRANSACTION_TYPES } from '@/models/transaction';
import { toLocalDate } from '@/utils/dates';

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BackupValidationError(`${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new BackupValidationError(`${label} debe ser un arreglo.`);
  return value;
}

function text(value: unknown, label: string, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new BackupValidationError(`${label} no es válido.`);
  return value;
}

function iso(value: unknown, label: string): string {
  const result = text(value, label);
  if (result === null || !/^\d{4}-\d{2}-\d{2}T/.test(result) || Number.isNaN(Date.parse(result)))
    throw new BackupValidationError(`${label} no es una fecha ISO válida.`);
  return result;
}

function localDate(value: unknown, label: string): string {
  const result = text(value, label);
  try {
    return toLocalDate(result ?? '');
  } catch {
    throw new BackupValidationError(`${label} no es una fecha local válida.`);
  }
}

function positiveMoney(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0)
    throw new BackupValidationError(`${label} debe ser un entero positivo en centavos.`);
  return value as number;
}

function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length)
    throw new BackupValidationError(`${label} contiene identificadores duplicados.`);
}

export function validateBackupDocument(input: unknown): BackupDocument {
  const root = record(input, 'El backup');
  if (root.schemaVersion !== BACKUP_SCHEMA_VERSION)
    throw new BackupValidationError(
      `Versión de backup incompatible: ${String(root.schemaVersion)}.`,
    );
  iso(root.exportedAt, 'exportedAt');
  text(root.appVersion, 'appVersion');
  const categories = array(root.categories, 'categories');
  const recurringRules = array(root.recurringRules, 'recurringRules');
  const transactions = array(root.transactions, 'transactions');
  const settings = array(root.settings, 'settings');

  const categoryIds = categories.map((item, index) => {
    const value = record(item, `categories[${index}]`);
    const id = text(value.id, `categories[${index}].id`) as string;
    text(value.name, `categories[${index}].name`);
    if (typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color))
      throw new BackupValidationError(`categories[${index}].color no es válido.`);
    if (value.icon !== null && typeof value.icon !== 'string')
      throw new BackupValidationError(`categories[${index}].icon no es válido.`);
    if (typeof value.isActive !== 'boolean' || !Number.isInteger(value.sortOrder))
      throw new BackupValidationError(`categories[${index}] tiene campos inválidos.`);
    iso(value.createdAt, `categories[${index}].createdAt`);
    iso(value.updatedAt, `categories[${index}].updatedAt`);
    return id;
  });
  unique(categoryIds, 'categories');
  const categorySet = new Set(categoryIds);

  const ruleIds = recurringRules.map((item, index) => {
    const value = record(item, `recurringRules[${index}]`);
    const id = text(value.id, `recurringRules[${index}].id`) as string;
    if (!TRANSACTION_TYPES.includes(value.type as never))
      throw new BackupValidationError(`recurringRules[${index}].type no es válido.`);
    positiveMoney(value.amountCents, `recurringRules[${index}].amountCents`);
    if (value.comment !== null && typeof value.comment !== 'string')
      throw new BackupValidationError(`recurringRules[${index}].comment no es válido.`);
    if (!categorySet.has(value.categoryId as string))
      throw new BackupValidationError(
        `recurringRules[${index}] referencia una categoría inexistente.`,
      );
    const startDate = localDate(value.startDate, `recurringRules[${index}].startDate`);
    if (
      !Number.isInteger(value.dayOfMonth) ||
      (value.dayOfMonth as number) < 1 ||
      (value.dayOfMonth as number) > 31
    )
      throw new BackupValidationError(`recurringRules[${index}].dayOfMonth no es válido.`);
    if (typeof value.isActive !== 'boolean')
      throw new BackupValidationError(`recurringRules[${index}].isActive no es válido.`);
    if (value.cancelledAt !== undefined && value.cancelledAt !== null) {
      iso(value.cancelledAt, `recurringRules[${index}].cancelledAt`);
      if (value.isActive)
        throw new BackupValidationError(
          `recurringRules[${index}] no puede estar activa y cancelada.`,
        );
    }
    if (
      value.lastGeneratedPeriod !== null &&
      (typeof value.lastGeneratedPeriod !== 'string' ||
        !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value.lastGeneratedPeriod))
    )
      throw new BackupValidationError(`recurringRules[${index}].lastGeneratedPeriod no es válido.`);
    if (
      typeof value.lastGeneratedPeriod === 'string' &&
      value.lastGeneratedPeriod < startDate.slice(0, 7)
    )
      throw new BackupValidationError(
        `recurringRules[${index}].lastGeneratedPeriod es anterior al inicio de la regla.`,
      );
    iso(value.createdAt, `recurringRules[${index}].createdAt`);
    iso(value.updatedAt, `recurringRules[${index}].updatedAt`);
    return id;
  });
  unique(ruleIds, 'recurringRules');
  const ruleSet = new Set(ruleIds);

  const transactionIds: string[] = [];
  const occurrenceKeys: string[] = [];
  const installmentKeys: string[] = [];
  for (const [index, item] of transactions.entries()) {
    const value = record(item, `transactions[${index}]`);
    transactionIds.push(text(value.id, `transactions[${index}].id`) as string);
    if (!TRANSACTION_TYPES.includes(value.type as never))
      throw new BackupValidationError(`transactions[${index}].type no es válido.`);
    positiveMoney(value.amountCents, `transactions[${index}].amountCents`);
    if (value.comment !== null && typeof value.comment !== 'string')
      throw new BackupValidationError(`transactions[${index}].comment no es válido.`);
    if (!categorySet.has(value.categoryId as string))
      throw new BackupValidationError(
        `transactions[${index}] referencia una categoría inexistente.`,
      );
    localDate(value.date, `transactions[${index}].date`);
    iso(value.createdAt, `transactions[${index}].createdAt`);
    iso(value.updatedAt, `transactions[${index}].updatedAt`);
    if (value.recurringRuleId !== null) {
      const recurringRuleId = text(
        value.recurringRuleId,
        `transactions[${index}].recurringRuleId`,
      ) as string;
      if (!ruleSet.has(recurringRuleId))
        throw new BackupValidationError(
          `transactions[${index}] referencia una recurrencia inexistente.`,
        );
      occurrenceKeys.push(
        text(value.occurrenceKey, `transactions[${index}].occurrenceKey`) as string,
      );
      const expectedOccurrenceKey = `${recurringRuleId}:${String(value.date).slice(0, 7)}`;
      if (value.occurrenceKey !== expectedOccurrenceKey)
        throw new BackupValidationError(
          `transactions[${index}].occurrenceKey no coincide con su regla y mes.`,
        );
    } else if (value.occurrenceKey !== null)
      throw new BackupValidationError(`transactions[${index}].occurrenceKey no corresponde.`);
    if (value.installmentGroupId !== null) {
      const group = text(
        value.installmentGroupId,
        `transactions[${index}].installmentGroupId`,
      ) as string;
      if (
        !Number.isInteger(value.installmentNumber) ||
        !Number.isInteger(value.installmentCount) ||
        (value.installmentNumber as number) < 1 ||
        (value.installmentNumber as number) > (value.installmentCount as number)
      )
        throw new BackupValidationError(`transactions[${index}] tiene una cuota inválida.`);
      installmentKeys.push(`${group}:${String(value.installmentNumber)}`);
    } else if (value.installmentNumber !== null || value.installmentCount !== null)
      throw new BackupValidationError(
        `transactions[${index}] tiene campos de cuota inconsistentes.`,
      );
  }
  unique(transactionIds, 'transactions');
  unique(occurrenceKeys, 'occurrenceKey');
  unique(installmentKeys, 'cuotas');

  for (const [index, item] of recurringRules.entries()) {
    const value = record(item, `recurringRules[${index}]`);
    if (
      value.isActive === true &&
      typeof value.lastGeneratedPeriod === 'string' &&
      !occurrenceKeys.includes(`${String(value.id)}:${value.lastGeneratedPeriod}`)
    )
      throw new BackupValidationError(
        `recurringRules[${index}].lastGeneratedPeriod no tiene una ocurrencia asociada.`,
      );
  }

  const settingKeys = settings.map((item, index) => {
    const value = record(item, `settings[${index}]`);
    const key = text(value.key, `settings[${index}].key`) as string;
    if (!Object.values(SETTING_KEYS).includes(key as never))
      throw new BackupValidationError(`settings[${index}].key no es válido.`);
    if (!Object.hasOwn(value, 'value'))
      throw new BackupValidationError(`settings[${index}].value es obligatorio.`);
    iso(value.updatedAt, `settings[${index}].updatedAt`);
    return key;
  });
  unique(settingKeys, 'settings');
  return input as BackupDocument;
}
