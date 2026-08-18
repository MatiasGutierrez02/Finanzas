import type { Transaction } from '@/models/transaction';
import type { TransactionRepository } from '@/repositories/contracts/transaction.repository';
import { repositories } from '@/repositories';
import { getPeriodRange } from '@/utils/date-range';
import { monthlyRecurrenceService } from '@/features/recurring/services/monthly-recurrence.service';

import type { MonthlySavings, SavingsQuery, SavingsSnapshot } from '../models/savings';

export const MONTH_COLORS = [
  '#315BDB',
  '#E85D75',
  '#00A6A6',
  '#F08A4B',
  '#9B6BDF',
  '#43A047',
  '#EC407A',
  '#607D8B',
  '#D05CE3',
  '#7CB342',
  '#C58B45',
  '#3949AB',
] as const;

const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'long' });

interface Dependencies {
  transactions: TransactionRepository;
  recurrence: Pick<typeof monthlyRecurrenceService, 'generateThrough'>;
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-AR') + value.slice(1);
}

export function calculateMonthlySavings(
  transactions: readonly Transaction[],
  year: number,
): MonthlySavings[] {
  const balances = Array.from({ length: 12 }, () => 0);
  const activity = Array.from({ length: 12 }, () => false);

  for (const transaction of transactions) {
    const monthIndex = Number(transaction.date.slice(5, 7)) - 1;
    const amount = Number(transaction.amountCents);
    const signedAmount = transaction.type === 'income' ? amount : -amount;
    const next = (balances[monthIndex] ?? 0) + signedAmount;
    if (!Number.isSafeInteger(next))
      throw new RangeError('El ahorro mensual supera el rango seguro.');
    balances[monthIndex] = next;
    activity[monthIndex] = true;
  }

  return balances.map((balanceCents, monthIndex) => ({
    monthIndex,
    name: capitalize(monthFormatter.format(new Date(year, monthIndex, 1, 12))),
    color: MONTH_COLORS[monthIndex] ?? '#607D8B',
    balanceCents,
    hasActivity: activity[monthIndex] ?? false,
  }));
}

export class SavingsService {
  constructor(private readonly dependencies: Dependencies) {}

  async getSnapshot(query: SavingsQuery): Promise<SavingsSnapshot> {
    const range = getPeriodRange('year', query.referenceDate);
    await this.dependencies.recurrence.generateThrough(range.end);
    const transactions = await this.dependencies.transactions.find({
      startDate: range.start,
      endDate: range.end,
    });
    const year = Number(query.referenceDate.slice(0, 4));
    const months = calculateMonthlySavings(transactions, year);
    let totalCents = 0;
    for (const month of months) {
      totalCents += month.balanceCents;
      if (!Number.isSafeInteger(totalCents))
        throw new RangeError('El ahorro anual supera el rango seguro.');
    }

    return {
      year,
      totalCents,
      months,
      positiveMonths: months.filter(({ balanceCents }) => balanceCents > 0),
    };
  }
}

export const savingsService = new SavingsService({
  transactions: repositories.transactions,
  recurrence: monthlyRecurrenceService,
});
