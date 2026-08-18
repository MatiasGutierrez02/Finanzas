import type { Transaction, TransactionQuery } from '@/models/transaction';

export interface TransactionRepository {
  getById(id: Transaction['id']): Promise<Transaction | undefined>;
  find(query: TransactionQuery): Promise<Transaction[]>;
  add(transaction: Transaction): Promise<void>;
  put(transaction: Transaction): Promise<void>;
  remove(id: Transaction['id']): Promise<void>;
}
