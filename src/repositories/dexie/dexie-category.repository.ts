import type { FinancesDatabase } from '@/db/finances-database';
import type { Category } from '@/models/category';
import type { CategoryRepository } from '@/repositories/contracts/category.repository';

export class DexieCategoryRepository implements CategoryRepository {
  constructor(private readonly database: FinancesDatabase) {}

  getById(id: Category['id']): Promise<Category | undefined> {
    return this.database.categories.get(id);
  }

  getAll(): Promise<Category[]> {
    return this.database.categories.orderBy('sortOrder').toArray();
  }

  async put(category: Category): Promise<void> {
    await this.database.categories.put(category);
  }
}
