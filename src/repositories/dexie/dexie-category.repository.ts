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

  async removeIfUnused(id: Category['id']): Promise<boolean> {
    return this.database.transaction(
      'rw',
      [this.database.categories, this.database.transactions, this.database.recurringRules],
      async () => {
        const category = await this.database.categories.get(id);
        if (category === undefined || category.isSystem) return false;
        const [transactions, rules] = await Promise.all([
          this.database.transactions.where('categoryId').equals(id).count(),
          this.database.recurringRules.where('categoryId').equals(id).count(),
        ]);
        if (transactions + rules > 0) return false;
        await this.database.categories.delete(id);
        return true;
      },
    );
  }
}
