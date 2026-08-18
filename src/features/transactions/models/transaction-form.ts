import type { TransactionType } from '@/models/transaction';

export interface TransactionFormValue {
  type: TransactionType;
  amount: string;
  categoryId: string;
  comment: string;
  date: string;
  schedule: 'none' | 'subscription' | 'installments';
  installmentCount: string;
}
