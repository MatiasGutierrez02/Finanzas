import type { Category } from '@/models/category';

export interface CategoryRepository {
  getById(id: Category['id']): Promise<Category | undefined>;
  getAll(): Promise<Category[]>;
  put(category: Category): Promise<void>;
}
