import type { Category } from '@/models/category';
import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import { repositories } from '@/repositories';

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  getById(id: Category['id']): Promise<Category | undefined> {
    return this.repository.getById(id);
  }

  async listActive(): Promise<Category[]> {
    const categories = await this.repository.getAll();
    return categories.filter(({ isActive }) => isActive);
  }
}

export const categoryService = new CategoryService(repositories.categories);
