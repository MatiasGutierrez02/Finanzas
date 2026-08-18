import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import type { ScheduleRepository } from '@/repositories/contracts/schedule.repository';
import type { TransactionRepository } from '@/repositories/contracts/transaction.repository';
import { repositories } from '@/repositories';
import { nowIsoTimestamp, toLocalDate } from '@/utils/dates';
import {
  newInstallmentGroupId,
  newRecurringRuleId,
  newTransactionId,
  toCategoryId,
} from '@/utils/ids';
import { parseArsInput } from '@/utils/money';
import type { IsoTimestamp, TransactionId } from '@/models/common';
import { TRANSACTION_TYPES, type Transaction } from '@/models/transaction';
import type { InstallmentGroupId, RecurringRuleId } from '@/models/common';
import type { RecurringRule } from '@/models/recurring-rule';
import {
  occurrenceDate,
  toYearMonth,
} from '@/features/recurring/services/monthly-recurrence.service';

import type { TransactionFormValue } from '../models/transaction-form';

export class TransactionNotFoundError extends Error {
  constructor() {
    super('La transacción no existe o fue eliminada.');
    this.name = 'TransactionNotFoundError';
  }
}

export class TransactionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionValidationError';
  }
}

interface TransactionServiceDependencies {
  transactions: TransactionRepository;
  categories: CategoryRepository;
  schedules: ScheduleRepository;
  createId?: () => TransactionId;
  createRecurringRuleId?: () => RecurringRuleId;
  createInstallmentGroupId?: () => InstallmentGroupId;
  now?: () => IsoTimestamp;
}

export class TransactionService {
  private readonly createId: () => TransactionId;
  private readonly now: () => IsoTimestamp;

  constructor(private readonly dependencies: TransactionServiceDependencies) {
    this.createId = dependencies.createId ?? newTransactionId;
    this.now = dependencies.now ?? nowIsoTimestamp;
  }

  async getById(id: string): Promise<Transaction> {
    const transaction = await this.dependencies.transactions.getById(id as TransactionId);

    if (transaction === undefined) {
      throw new TransactionNotFoundError();
    }

    return transaction;
  }

  async create(input: TransactionFormValue): Promise<Transaction> {
    const normalized = await this.normalizeInput(input);
    const timestamp = this.now();
    const base = { ...normalized, createdAt: timestamp, updatedAt: timestamp };

    if (input.schedule === 'subscription') {
      const ruleId = (this.dependencies.createRecurringRuleId ?? newRecurringRuleId)();
      const period = toYearMonth(normalized.date);
      const rule: RecurringRule = {
        id: ruleId,
        type: normalized.type,
        amountCents: normalized.amountCents,
        categoryId: normalized.categoryId,
        comment: normalized.comment,
        startDate: normalized.date,
        dayOfMonth: 1,
        isActive: true,
        cancelledAt: null,
        lastGeneratedPeriod: period,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const transaction: Transaction = {
        id: this.createId(),
        ...base,
        recurringRuleId: ruleId,
        occurrenceKey: `${ruleId}:${period}`,
        installmentGroupId: null,
        installmentNumber: null,
        installmentCount: null,
      };
      await this.dependencies.schedules.createRecurring(rule, transaction);
      return transaction;
    }

    if (input.schedule === 'installments') {
      const count = this.parseInstallmentCount(input.installmentCount);
      const groupId = (this.dependencies.createInstallmentGroupId ?? newInstallmentGroupId)();
      const [year = 0, month = 1] = normalized.date.slice(0, 7).split('-').map(Number);
      const installments = Array.from({ length: count }, (_, index): Transaction => {
        const target = new Date(year, month - 1 + index, 1, 12);
        const period = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(
          2,
          '0',
        )}` as ReturnType<typeof toYearMonth>;
        return {
          id: this.createId(),
          ...base,
          date: index === 0 ? normalized.date : occurrenceDate(period),
          recurringRuleId: null,
          occurrenceKey: null,
          installmentGroupId: groupId,
          installmentNumber: index + 1,
          installmentCount: count,
        };
      });
      await this.dependencies.schedules.createInstallments(installments);
      return installments[0] as Transaction;
    }

    const transaction: Transaction = {
      id: this.createId(),
      ...base,
      recurringRuleId: null,
      occurrenceKey: null,
      installmentGroupId: null,
      installmentNumber: null,
      installmentCount: null,
    };
    await this.dependencies.transactions.add(transaction);
    return transaction;
  }

  async update(id: string, input: TransactionFormValue): Promise<Transaction> {
    const current = await this.getById(id);
    const normalized = await this.normalizeInput(input);
    const transaction: Transaction = {
      ...current,
      ...normalized,
      updatedAt: this.now(),
    };

    await this.dependencies.transactions.put(transaction);
    return transaction;
  }

  async remove(id: string): Promise<void> {
    await this.getById(id);
    await this.dependencies.transactions.remove(id as TransactionId);
  }

  private async normalizeInput(input: TransactionFormValue) {
    if (!['none', 'subscription', 'installments'].includes(input.schedule)) {
      throw new TransactionValidationError('Seleccioná una modalidad válida.');
    }
    if (!TRANSACTION_TYPES.includes(input.type)) {
      throw new TransactionValidationError('Seleccioná un tipo de transacción válido.');
    }

    let amountCents;
    let date;

    try {
      amountCents = parseArsInput(input.amount);
    } catch (error) {
      throw new TransactionValidationError(
        error instanceof Error ? error.message : 'El monto no es válido.',
      );
    }

    try {
      date = toLocalDate(input.date);
    } catch {
      throw new TransactionValidationError('Seleccioná una fecha válida.');
    }

    const categoryId = toCategoryId(input.categoryId);
    const category = await this.dependencies.categories.getById(categoryId);

    if (category === undefined) {
      throw new TransactionValidationError('Seleccioná una categoría válida.');
    }

    const comment = input.comment.trim();

    if (comment.length > 240) {
      throw new TransactionValidationError('El comentario no puede superar los 240 caracteres.');
    }

    return {
      type: input.type,
      amountCents,
      categoryId,
      comment: comment.length === 0 ? null : comment,
      date,
    };
  }

  private parseInstallmentCount(value: string): number {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 2 || count > 120) {
      throw new TransactionValidationError('La cantidad de cuotas debe estar entre 2 y 120.');
    }
    return count;
  }
}

export const transactionService = new TransactionService({
  transactions: repositories.transactions,
  categories: repositories.categories,
  schedules: repositories.schedules,
});
