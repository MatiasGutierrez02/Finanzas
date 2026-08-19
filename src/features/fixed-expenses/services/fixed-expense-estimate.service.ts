import type { Category } from '@/models/category';
import type { FixedExpenseEstimateId, IsoTimestamp, MoneyCents } from '@/models/common';
import type { FixedExpenseEstimate } from '@/models/fixed-expense-estimate';
import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import type { FixedExpenseEstimateRepository } from '@/repositories/contracts/fixed-expense-estimate.repository';
import { repositories } from '@/repositories';
import { nowIsoTimestamp } from '@/utils/dates';
import { newFixedExpenseEstimateId, toCategoryId } from '@/utils/ids';
import { parseArsInput, toMoneyCents } from '@/utils/money';

export interface FixedExpenseEstimateInput {
  name: string;
  amount: string;
  categoryId: string | null;
}

export interface FixedExpenseEstimateListItem {
  estimate: FixedExpenseEstimate;
  category: Category | null;
}

interface Dependencies {
  repository: FixedExpenseEstimateRepository;
  categories: CategoryRepository;
  createId?: () => FixedExpenseEstimateId;
  now?: () => IsoTimestamp;
}

export class FixedExpenseEstimateService {
  constructor(private readonly dependencies: Dependencies) {}

  async list(): Promise<FixedExpenseEstimateListItem[]> {
    const [estimates, categories] = await Promise.all([
      this.dependencies.repository.getAll(),
      this.dependencies.categories.getAll(),
    ]);
    const byId = new Map(categories.map((category) => [category.id, category]));
    return estimates.map((estimate) => ({
      estimate,
      category: estimate.categoryId === null ? null : (byId.get(estimate.categoryId) ?? null),
    }));
  }

  async create(input: FixedExpenseEstimateInput): Promise<FixedExpenseEstimate> {
    const timestamp = (this.dependencies.now ?? nowIsoTimestamp)();
    const estimate: FixedExpenseEstimate = {
      id: (this.dependencies.createId ?? newFixedExpenseEstimateId)(),
      ...(await this.validate(input)),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.dependencies.repository.put(estimate);
    return estimate;
  }

  async update(
    id: FixedExpenseEstimate['id'],
    input: FixedExpenseEstimateInput,
  ): Promise<FixedExpenseEstimate> {
    const current = await this.dependencies.repository.getById(id);
    if (current === undefined) throw new Error('El gasto fijo no existe.');
    const estimate = {
      ...current,
      ...(await this.validate(input)),
      updatedAt: (this.dependencies.now ?? nowIsoTimestamp)(),
    };
    await this.dependencies.repository.put(estimate);
    return estimate;
  }

  async remove(id: FixedExpenseEstimate['id']): Promise<void> {
    if ((await this.dependencies.repository.getById(id)) === undefined)
      throw new Error('El gasto fijo no existe.');
    await this.dependencies.repository.remove(id);
  }

  total(items: readonly FixedExpenseEstimate[]): MoneyCents {
    const total = items.reduce((sum, item) => sum + item.amountCents, 0);
    return toMoneyCents(total);
  }

  private async validate(input: FixedExpenseEstimateInput) {
    const name = input.name.trim();
    if (name.length === 0) throw new Error('Ingresá un nombre.');
    if (name.length > 80) throw new Error('El nombre no puede superar los 80 caracteres.');
    const categoryId = input.categoryId ? toCategoryId(input.categoryId) : null;
    if (
      categoryId !== null &&
      (await this.dependencies.categories.getById(categoryId)) === undefined
    )
      throw new Error('La categoría seleccionada no existe.');
    return {
      name,
      amountCents: parseArsInput(input.amount),
      categoryId,
    };
  }
}

export const fixedExpenseEstimateService = new FixedExpenseEstimateService({
  repository: repositories.fixedExpenseEstimates,
  categories: repositories.categories,
});
